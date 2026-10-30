// Passes a rejected async route handler to the global error handler; Express 4 would otherwise leave it unhandled.
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
