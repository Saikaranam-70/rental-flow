// routes/uploads.js
const express = require('express');
const router = express.Router();
const { protect, tenantGuard } = require('../middleware/auth');

router.use(protect, tenantGuard);
// Cloudinary direct upload signature endpoint
router.get('/signature', (req, res) => {
  const cloudinary = require('cloudinary').v2;
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: `rentflow/${req.agencyId}` },
    process.env.CLOUDINARY_API_SECRET
  );
  res.json({ success: true, data: { timestamp, signature, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME } });
});
module.exports = router;
