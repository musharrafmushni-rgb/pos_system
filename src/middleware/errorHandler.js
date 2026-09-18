const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}`
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate key',
      details: err.keyValue
    });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const payload = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : err.message
  };

  if (err instanceof AppError && err.details) {
    payload.details = err.details;
  }

  if (statusCode === 500) {
    console.error('[error]', err);
  }

  return res.status(statusCode).json(payload);
}

module.exports = errorHandler;
