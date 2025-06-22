const { body } = require('express-validator');
const { validationResult } = require('express-validator');

exports.eventWithSlotsValidation = [
  // Event validation
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3-100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10-500 characters'),

  // Slots validation
  body('slots')
    .isArray({ min: 1 })
    .withMessage('At least one slot is required'),

  body('slots.*.dateTime')
    .isISO8601()
    .withMessage('Valid datetime is required for each slot')
    .custom((value) => {
      const slotDate = new Date(value);
      const now = new Date();
      if (slotDate <= now) {
        throw new Error('Slot datetime must be in the future');
      }
      return true;
    }),

  body('slots.*.maxBookings')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max bookings must be between 1 and 1000'),

  // Custom validation for duplicate slot times
  body('slots').custom((slots) => {
    const dateTimes = slots.map(slot => slot.dateTime);
    const uniqueDateTimes = [...new Set(dateTimes)];
    
    if (dateTimes.length !== uniqueDateTimes.length) {
      throw new Error('Duplicate slot times are not allowed');
    }
    return true;
  })
];

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  
  next();
};