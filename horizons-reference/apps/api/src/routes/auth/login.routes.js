import express from 'express';
import pb from '../../utils/pocketbaseClient.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// POST /login - Authenticate user and create session
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
      code: 'MISSING_CREDENTIALS',
    });
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Email and password must be strings',
      code: 'INVALID_CREDENTIALS_TYPE',
    });
  }

  // Authenticate with PocketBase
  const authData = await pb.collection('users').authWithPassword(email, password);

  if (!authData || !authData.record) {
    throw new Error('Authentication failed: Invalid credentials or user not found');
  }

  // Extract authenticated user object
  const user = authData.record;
  const token = pb.authStore.token;

  if (!user.id) {
    throw new Error('Authentication failed: User ID not found in authenticated record');
  }

  // Extract role from user record, default to 'USER' if missing
  let userRole = user.role || 'USER';

  // Log warning if role was missing
  if (!user.role) {
    logger.warn(`Warning: role missing for user ${email}, defaulting to USER`);
  }

  // Validate role is a string
  if (typeof userRole !== 'string') {
    logger.warn(`Warning: role is not a string for user ${email}, defaulting to USER`);
    userRole = 'USER';
  }

  // Verify role for known admin accounts
  if (email === 'admin@starksglobalgroup.net' && userRole !== 'SUPER_ADMIN') {
    logger.warn(`Warning: admin@starksglobalgroup.net should have SUPER_ADMIN role, but has ${userRole}`);
  }

  // Log successful login
  logger.info(`Login successful for user: ${email}, role: ${userRole}`);

  const response = {
    status: 'success',
    user: {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: userRole,
    },
    token,
    message: 'Login successful',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;