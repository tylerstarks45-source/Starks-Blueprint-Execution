import express from 'express';
import aiRequestController from '../../controllers/ai/AIRequestController.js';
import { creditEnforcement } from '../../middleware/creditEnforcement.js';

const router = express.Router();

// Simple auth middleware mock
const requireAuth = (req, res, next) => {
  const userId = req.auth?.id || req.user?.id || req.userId || req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// Apply auth and credit enforcement to AI requests
router.post('/ai-request', requireAuth, creditEnforcement, aiRequestController.handleAIRequest);
router.get('/history', requireAuth, aiRequestController.getRequestHistory);
router.get('/stats', requireAuth, aiRequestController.getRequestStats);

export default router;