const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 401, 'Authentication required', 'Missing bearer token');
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    return next();
  } catch (error) {
    return fail(res, 401, 'Authentication failed', error.message);
  }
}

function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, 'Forbidden', 'Insufficient role permissions');
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
