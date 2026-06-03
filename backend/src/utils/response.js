function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message, error: null });
}

function fail(res, status, message, error = null) {
  return res.status(status).json({ success: false, data: null, message, error });
}

module.exports = { ok, fail };
