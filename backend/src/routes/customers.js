// routes/customers.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/customerController');
const { protect, tenantGuard, requirePermission } = require('../middleware/auth');
const { uploadIdProof } = require('../config/cloudinary');

router.use(protect, tenantGuard);

router.get('/stats', c.getCustomerStats);
router.get('/', c.getCustomers);
router.get('/:id', c.getCustomer);
router.post('/', c.createCustomer);
router.put('/:id', c.updateCustomer);
router.delete('/:id', requirePermission('canDeleteRental'), c.deleteCustomer);
router.post('/:id/blacklist', requirePermission('canBlacklistCustomer'), c.toggleBlacklist);
router.post('/:id/upload-id', uploadIdProof.single('file'), c.uploadIdProof);

module.exports = router;
