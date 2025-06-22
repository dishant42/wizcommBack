const { PrismaClient } = require('@prisma/client');

// const { sendBookingConfirmation } = require('../services/email-service'); // Adjust path as needed


/**
 * Custom error class for slot booking operations
 */
class SlotBookingError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'SlotBookingError';
    this.code = code;
  }
}

/**
 * Slot booking service with optimistic concurrency control
 */
class SlotBookingService {
  
  constructor(prisma, logger, config = {}) {
    this.prisma = prisma;
    this.logger = logger;
    this.config = {
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 2000,
      concurrencyThreshold: 10,
      ...config
    };
    this.concurrentRequests = new Map(); // Track concurrent requests per slot
  }

  /**
   * @param {string} slotId - The slot ID to book
   * @param {string} userId - The user ID making the booking
   * @returns {Promise<Object>} Booking result object
   */
  async createSlotBooking(slotId, userId) {
    const startTime = Date.now();
    const requestId = `${slotId}-${userId}-${Date.now()}-${Math.random()}`;
    
    try {
      // Track concurrent requests for this slot
      const currentConcurrency = this.concurrentRequests.get(slotId) || 0;
      this.concurrentRequests.set(slotId, currentConcurrency + 1);
      this.logger.info('Starting slot booking attempt', {
        requestId,
        slotId,
        userId,
        concurrency: currentConcurrency + 1
      });
      

      // Only use optimistic strategy
      const result = await this.createSlotBookingOptimistic(slotId, userId, requestId);
      result.method = 'optimistic';

      // Log metrics
      const duration = Date.now() - startTime;
      this.logger.info('Slot booking attempt completed', {
        slotId,
        userId,
        success: result.success,
        method: result.method,
        retryCount: result.retryCount || 0,
        duration,
        concurrency: currentConcurrency
      });

      return result;

    } finally {
      // Clean up concurrency tracking
      const current = this.concurrentRequests.get(slotId) || 1;
      if (current <= 1) {
        this.concurrentRequests.delete(slotId);
      } else {
        this.concurrentRequests.set(slotId, current - 1);
      }
    }
  }



  async createSlotBookingOptimistic(slotId, userId, requestId) {
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.logger.info(`Booking attempt ${attempt}`, {
          requestId,
          slotId,
          userId,
          attempt
        });
        const booking = await this.prisma.$transaction(async (tx) => {
          // 1. Get slot with current version and booking count
          const slot = await tx.slot.findUnique({
            where: { id: slotId,
            },
            include: {
              event: {
                select: { id: true, title: true, version: true }
              },
              bookings: {
                where: { status: 'CONFIRMED' },
                select: { id: true, userId: true }
              }
            }
          });
          console.log("we are in booking service slot", slot);
          if (!slot) {
            throw new SlotBookingError('Slot not found', 'SLOT_NOT_FOUND');
          }

          // 2. Check capacity
           const currentBookingCount = await tx.booking.count({
            where: {
              slotId: slotId,
              status: 'CONFIRMED'
            }
          });
          this.logger.info('Capacity check', {
            requestId,
            slotId,
            currentBookingCount,
            maxBookings: slot.maxBookings,
            available: slot.maxBookings - currentBookingCount
          });

          if (currentBookingCount >= slot.maxBookings) {
            throw new SlotBookingError('Slot is fully booked', 'SLOT_FULL');
          }

          // 3. Check for duplicate booking
          const existingBooking = await tx.booking.findUnique({
            where: {
              slotId_userId: { slotId, userId }
            }
          });

          if (existingBooking && existingBooking.status === 'CONFIRMED') {
            throw new SlotBookingError('User already has a booking for this slot', 'DUPLICATE_BOOKING');
          }


          // 5. Update slot current bookings and version (optimistic concurrency control)
          const updatedSlot = await tx.slot.update({
            where: { 
              id: slotId,
              version: slot.version // This will fail if version changed
            },
            data: { 
              currentBookings: { increment: 1 },
              version: { increment: 1 }
            }
          });

          // 4. Create booking
          const newBooking = await tx.booking.create({
            data: {
              slotId,
              eventId: slot.eventId,
              userId,
              status: 'CONFIRMED'
            },
            include: {
              slot: {
                include: { event: true }
              },
              user: true
            }
          });

          

          // 6. Update event version
          await tx.event.update({
            where: { 
              id: slot.eventId,
              version: slot.event.version
            },
            data: { 
              version: { increment: 1 }
            }
          });

          return newBooking;
        }, {
            isolationLevel: 'Serializable', // Use string instead of Prisma.TransactionIsolationLevel.Serializable
           /* SERIALIZABLE - Strongest level - transactions appear to run one after another  */
          timeout: 5000
        });

        return { 
          success: true, 
          booking, 
          retryCount: attempt - 1 
        };

      } catch (error) {
        // Handle optimistic lock failure (version conflict)
        if (this.isVersionConflictError(error)) {
          if (attempt < this.config.maxRetries) {
            const delay = this.calculateBackoffDelay(attempt);
            this.logger.warn(`Optimistic lock conflict, retrying attempt ${attempt + 1}`, {
              slotId,
              userId,
              delay,
              error: error.message
            });
            await this.delay(delay);
            continue;
          }
          return { 
            success: false, 
            error: 'Booking conflict due to high demand. Please try again.', 
            retryCount: attempt 
          };
        }

        // Handle business logic errors
        if (error instanceof SlotBookingError) {
          return { 
            success: false, 
            error: error.message, 
            retryCount: attempt - 1 
          };
        }

        // Handle unexpected errors
        this.logger.error('Unexpected slot booking error', {
          slotId,
          userId,
          attempt,
          error: error.message,
          stack: error.stack
        });

        return { 
          success: false, 
          error: 'An unexpected error occurred. Please try again.', 
          retryCount: attempt - 1 
        };
      }
    }

    return { 
      success: false, 
      error: 'Maximum retry attempts exceeded', 
      retryCount: this.config.maxRetries 
    };
  }


  isVersionConflictError(error) {
    return error.code === 'P2025' || // Record not found (version mismatch)
           error.message.includes('Record to update not found') ||
           error.message.includes('version');
  }

  


  calculateBackoffDelay(attempt) {
    const exponentialDelay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
  }

  

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

module.exports = {
  SlotBookingService,
  SlotBookingError
};