const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { validationResult } = require("express-validator");
const logger = require("../logger"); // Use Winston logger

exports.createEvent = async (req, res) => {
  const { title, description, createdBy, slots } = req.body;
  console.log("Creating event with data:", req.body);
 

  try {
    const result = await prisma.$transaction(async (tx) => {
      
      // Step 1: Create event
      const event = await tx.event.create({
        data: { title, description, createdBy },
      });

      // Step 2: Create each slot individually (useful for complex slot logic)
      const createdSlots = [];
      
      for (const slotData of slots) {
        const slot = await tx.slot.create({
          data: {
            dateTime: new Date(slotData.dateTime),
            maxBookings: parseInt(slotData.maxBookings),
            currentBookings: 0,
            eventId: event.id
          }
        });
        createdSlots.push(slot);
      }

      return {
        ...event,
        slots: createdSlots.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
      };
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: result
    });

  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create event'
    });
  }
};



exports.getEvents = async (req, res) => {
  const { future } = req.query;
  const nowUTC = new Date().toISOString(); // Ensures UTC format
  try {
    const events = await prisma.event.findMany({
      where:
        future === "true" ? { slots: { some: { dateTime: { gt: nowUTC  } } } } : {},
      orderBy: { createdAt: "desc" },
      include: { slots: true },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getEventById = async (req, res) => {
  try {
    console.log("reaching here gracefully")
    const nowUTC = new Date().toISOString(); // Use UTC string

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { 
        slots: {
          where: {
            dateTime: {
              gt: nowUTC // Only include slots with dateTime greater than current time
            }
          },
          orderBy: {
            dateTime: 'asc' // Optional: order slots by date/time ascending
          }
        }
      },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
