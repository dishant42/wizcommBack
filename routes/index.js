const express = require('express');
const router = express.Router();
const {param,body,query} = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const eventController = require('../controllers/event.controller');
const { bookingValidation, getUserBookingsByIdValidation, getUserBookingsByEmailValidation, handleValidationErrors} = require('../validators/booking.validator');
const { eventWithSlotsValidation } = require('../validators/event.validator');

// Booking routes
router.post('/bookings', bookingValidation, bookingController.createBooking);


// Get bookings by user email
//this is used
router.get('/users/email/:email/bookings', 
  getUserBookingsByEmailValidation,
  handleValidationErrors,
  bookingController.getUserBookingsByEmail
);

//this is being used
// Get user booking statistics
router.get('/users/:userId/bookings/stats',
  param('userId').isUUID().withMessage('Valid user ID is required'),
  handleValidationErrors,
  bookingController.getUserBookingStats
);



// Event routes
router.post('/events', eventWithSlotsValidation,handleValidationErrors, eventController.createEvent);
router.get('/events', eventController.getEvents);
router.get('/events/:id', eventController.getEventById);


module.exports = router;