const express = require('express');
const asyncHandler = require('../utils/async-handler');
const { login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', asyncHandler(login));

module.exports = router;
