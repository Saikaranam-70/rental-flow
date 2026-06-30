const express = require('express');
const router = express.Router();
const c = require('../controllers/rentalController');
const { protect, tenantGuard, requirePermission } = require('../middleware/auth');

router.use(protect, tenantGuard);

router.get('/dashboard', c.getDashboardStats);
router.get('/check-overdue', c.checkAndUpdateOverdue);
router.get('/', c.getRentals);
router.get('/:id', c.getRental);
router.post('/', requirePermission('canCreateRental'), c.createRental);
router.post('/:id/payment', requirePermission('canManagePayments'), c.addPayment);
router.post('/:id/return', requirePermission('canCreateRental'), c.processReturn);
router.post('/:id/extend', requirePermission('canCreateRental'), c.extendRental);
router.delete('/:id', requirePermission('canDeleteRental'), c.cancelRental);

module.exports = router;
