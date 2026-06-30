const express = require('express');
const router = express.Router();
const c = require('../controllers/inventoryController');
const { protect, tenantGuard, requirePermission } = require('../middleware/auth');
const { uploadInventoryPhoto } = require('../config/cloudinary');

router.use(protect, tenantGuard);

router.get('/stats', c.getInventoryStats);
router.get('/', c.getInventory);
router.get('/:id', c.getInventoryItem);
router.post('/', requirePermission('canManageInventory'), c.createInventory);
router.put('/:id', requirePermission('canManageInventory'), c.updateInventory);
router.delete('/:id', requirePermission('canManageInventory'), c.deleteInventory);
router.post('/:id/photo', requirePermission('canManageInventory'), uploadInventoryPhoto.single('photo'), c.uploadPhoto);
router.post('/:id/maintenance', requirePermission('canManageInventory'), c.addMaintenanceLog);

module.exports = router;
