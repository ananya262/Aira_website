const { fail } = require('../utils/response');

function mapDatabaseError(error) {
  if (error.code === 'ER_DUP_ENTRY') return { status: 409, message: 'Duplicate record violates a unique constraint' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return { status: 409, message: 'Referenced parent record does not exist' };
  if (error.code === 'ER_ROW_IS_REFERENCED_2') return { status: 409, message: 'Record is still referenced and cannot be deleted' };
  if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED') return { status: 400, message: 'Check constraint validation failed' };
  if (error.sqlState === '45000') return { status: 409, message: error.sqlMessage || error.message };
  return null;
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const mapped = mapDatabaseError(error);
  if (mapped) {
    return fail(res, mapped.status, mapped.message, error.sqlMessage || error.message);
  }

  if (error.status) {
    return fail(res, error.status, error.message, error.details || null);
  }

  console.error(error);
  return fail(res, 500, 'Internal server error', process.env.NODE_ENV === 'production' ? null : error.message);
}

module.exports = errorHandler;
