import express from 'express';
import creditController from '../../controllers/credits/CreditController.js';
import { requireSuperAdmin, validateSuperAdminSession } from '../../middleware/superAdminProtection.js';
import roleAwareEndpointProtectionService from '../../services/security/RoleAwareEndpointProtectionService.js';

const router = express.Router();

// Apply Super Admin protection to all routes
router.use(requireSuperAdmin());
router.use(validateSuperAdminSession());

router.get('/balance', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    roleAwareEndpointProtectionService.validateSuperAdminRole(userId);
    await creditController.getBalance(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    roleAwareEndpointProtectionService.validateSuperAdminRole(userId);
    await creditController.getHistory(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    roleAwareEndpointProtectionService.validateSuperAdminRole(userId);
    await creditController.getStats(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.post('/estimate', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    roleAwareEndpointProtectionService.validateSuperAdminRole(userId);
    await creditController.estimateCost(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.get('/models', async (req, res, next) => {
  try {
    const userId = req.user?.id || req.auth?.id;
    roleAwareEndpointProtectionService.validateSuperAdminRole(userId);
    await creditController.getModels(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;