const { PrismaClient } = require('../generated/prisma')
const { validationResult } = require('express-validator');
const { SlotBookingService } = require('../service/slot.booking');
const generateEmail = require('../service/mailing_service'); // Adjust path as needed
const logger = require('../logger'); // Use Winston logger
const prisma = new PrismaClient();

const slotBookingService = new SlotBookingService(prisma, logger);

exports.createBooking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { slotId, email, name } = req.body;

  try {
    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name } });
    } else if (!user.name && name) {
      await prisma.user.update({ where: { id: user.id }, data: { name } });
    }

    // Check slot exists and is in the future
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (new Date(slot.dateTime).toISOString() < new Date().toISOString()) return res.status(400).json({ error: 'Slot must be in the future' });

    // Booking logic (handles overbooking, duplicate, concurrency)
    const result = await slotBookingService.createSlotBooking(slotId, user.id);
    console.log("Booking result:", result);


      

    if (result.success) {
      await generateEmail({
        to : result.booking.user.email,
        subject: 'Booking Confirmation',
        data :{
          username : result.booking.user.name,
          eventName: result.booking.slot.event.title,
          slotTime : new Date(result.booking.slot.dateTime).toLocaleString(),
        }
      })
      return res.status(201).json({ booking: result.booking });
    } else {
      return res.status(400).json({ error: result.error });
    }
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Get bookings by user email
exports.getUserBookingsByEmail = async (req, res) => {
  const { email } = req.params;
  const { 
    status, 
    future, 
    limit = 50, 
    offset = 0 
  } = req.query;
  console.log("Fetching bookings for email:", email);
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: decodeURIComponent(email) },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found with this email'
      });
    }

    // Use the existing getUserBookingsById logic
    req.params.userId = user.id;
    return this.getUserBookingsById(req, res);

  } catch (error) {
    logger.error('Error fetching user bookings by email:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get booking statistics for a user
exports.getUserBookingStats = async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const now = new Date();

    // Get booking statistics
    const [totalBookings,confirmedBookings,cancelledBookings,waitlistedBookings,upcomingBookings,pastBookings] = await Promise.all([
      // Total bookings
      prisma.booking.count({
        where: { userId }
      }),
      
      // Confirmed bookings
      prisma.booking.count({
        where: { userId, status: 'CONFIRMED' }
      }),
      
      // Cancelled bookings
      prisma.booking.count({
        where: { userId, status: 'CANCELLED' }
      }),
      
      // Waitlisted bookings
      prisma.booking.count({
        where: { userId, status: 'WAITLISTED' }
      }),
      
      // Upcoming bookings
      prisma.booking.count({
        where: { 
          userId, 
          status: 'CONFIRMED',
          slot: { dateTime: { gt: now } }
        }
      }),
      
      // Past bookings
      prisma.booking.count({
        where: { 
          userId, 
          status: 'CONFIRMED',
          slot: { dateTime: { lte: now } }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        user,
        statistics: {
          total: totalBookings,
          byStatus: {
            confirmed: confirmedBookings,
            cancelled: cancelledBookings,
            waitlisted: waitlistedBookings
          },
          byTime: {
            upcoming: upcomingBookings,
            past: pastBookings
          },
          memberSince: user.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching user booking statistics:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

