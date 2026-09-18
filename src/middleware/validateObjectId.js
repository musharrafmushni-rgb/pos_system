const { Types } = require('mongoose');

function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`
      });
    }
    return next();
  };
}

module.exports = validateObjectId;
