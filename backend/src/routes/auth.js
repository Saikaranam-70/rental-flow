// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/staff/login', auth.staffLogin);
router.post('/refresh', auth.refreshToken);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/verify-email', auth.verifyEmail);
router.post('/logout', protect, auth.logout);
router.get('/me', protect, auth.getMe);

module.exports = router;
