/**
 * API routes for account management (registration, login, profile).
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createUser,
  authenticateUser,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
} = require('../../services/accountService');
const {
  createAccessToken,
  decodeAccessToken,
  ACCESS_TOKEN_EXPIRE_MINUTES,
} = require('../../services/authService');

const router = express.Router();

// ============== Middleware ==============

/**
 * Middleware to get the current authenticated user from JWT token.
 */
async function getCurrentUser(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      detail: 'Missing authorization header',
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = decodeAccessToken(token);

  if (!payload) {
    return res.status(401).json({
      detail: 'Invalid or expired token',
    });
  }

  const userId = payload.sub;
  if (!userId) {
    return res.status(401).json({
      detail: 'Invalid token payload',
    });
  }

  const user = await getUserById(parseInt(userId, 10));
  if (!user) {
    return res.status(401).json({
      detail: 'User not found',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      detail: 'Account is deactivated',
    });
  }

  req.user = user;
  next();
}

/**
 * Format user response for API.
 */
function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    riot_id: user.riotId,
    region: user.region,
    is_active: user.isActive,
    is_verified: user.isVerified,
    created_at: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
  };
}

// ============== Routes ==============

/**
 * POST /api/account/register - Register a new user account.
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('riot_id').optional(),
    body('region').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { email, username, password, riot_id, region } = req.body;

    const [user, error] = await createUser({
      email,
      username,
      password,
      riotId: riot_id,
      region,
    });

    if (error) {
      return res.status(400).json({ detail: error });
    }

    res.status(201).json(formatUserResponse(user));
  }
);

/**
 * POST /api/account/login - Authenticate user and return access token.
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').exists().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await authenticateUser(email, password);

    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const accessToken = createAccessToken({
      sub: user.id.toString(),
      username: user.username,
    });

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    });
  }
);

/**
 * GET /api/account/me - Get current user's profile information.
 */
router.get('/me', getCurrentUser, async (req, res) => {
  res.json(formatUserResponse(req.user));
});

/**
 * PUT /api/account/me - Update current user's profile information.
 */
router.put(
  '/me',
  getCurrentUser,
  [
    body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('riot_id').optional(),
    body('region').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { username, riot_id, region } = req.body;

    const [user, error] = await updateUser(req.user.id, {
      username,
      riotId: riot_id,
      region,
    });

    if (error) {
      return res.status(400).json({ detail: error });
    }

    res.json(formatUserResponse(user));
  }
);

/**
 * POST /api/account/change-password - Change current user's password.
 */
router.post(
  '/change-password',
  getCurrentUser,
  [
    body('current_password').exists().withMessage('Current password required'),
    body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ detail: errors.array()[0].msg });
    }

    const { current_password, new_password } = req.body;

    const [success, error] = await changePassword(req.user.id, current_password, new_password);

    if (!success) {
      return res.status(400).json({ detail: error });
    }

    res.json({ message: 'Password changed successfully' });
  }
);

/**
 * DELETE /api/account/me - Delete current user's account.
 */
router.delete('/me', getCurrentUser, async (req, res) => {
  const [success, error] = await deleteUser(req.user.id);

  if (!success) {
    return res.status(400).json({ detail: error });
  }

  res.json({ message: 'Account deleted successfully' });
});

// Export middleware for use in other routes
router.getCurrentUser = getCurrentUser;

module.exports = router;
