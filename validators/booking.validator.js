const { body, param, query, validationResult } = require('express-validator');

// Validation for creating a booking
exports.bookingValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .trim(),
  
  body('slotId')
    .notEmpty()
    .withMessage('slotId is required')
    .isString()
    .withMessage('slotId must be a string')
];

// Validation for getting user bookings by ID
exports.getUserBookingsByIdValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string'),
  
  query('status')
    .optional()
    .isIn(['CONFIRMED', 'CANCELLED', 'WAITLISTED'])
    .withMessage('Status must be CONFIRMED, CANCELLED, or WAITLISTED'),
  
  query('future')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Future must be "true" or "false"'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
    .toInt()
];

// Validation for getting bookings by user email
exports.getUserBookingsByEmailValidation = [
  param('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  query('status')
    .optional()
    .isIn(['CONFIRMED', 'CANCELLED', 'WAITLISTED'])
    .withMessage('Status must be CONFIRMED, CANCELLED, or WAITLISTED'),
  
  query('future')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Future must be "true" or "false"'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
    .toInt()
];

// Validation for getting user booking statistics
exports.getUserBookingStatsValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
];

// Validation for getting upcoming bookings
exports.getUserUpcomingBookingsValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isString()
    .withMessage('User ID must be a string')
];

// Handle validation errors middleware
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