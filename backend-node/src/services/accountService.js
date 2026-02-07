/**
 * Account service for user management operations.
 */
const { User } = require('../models');
const { getPasswordHash, verifyPassword } = require('./authService');

/**
 * Create a new user account.
 * @param {object} userData - User data
 * @returns {Promise<[User|null, string|null]>} Tuple of (User, null) on success or (null, error_message) on failure
 */
async function createUser({ email, username, password, riotId = null, region = null }) {
  // Check if email already exists
  const existingEmail = await User.findOne({ where: { email } });
  if (existingEmail) {
    return [null, 'Email already registered'];
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ where: { username } });
  if (existingUsername) {
    return [null, 'Username already taken'];
  }

  try {
    // Create new user
    const hashedPassword = await getPasswordHash(password);
    const user = await User.create({
      email,
      username,
      hashedPassword,
      riotId,
      region,
    });
    return [user, null];
  } catch (error) {
    console.error('Failed to create user:', error);
    return [null, 'Failed to create account'];
  }
}

/**
 * Authenticate a user by email and password.
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<User|null>} User if authentication successful, null otherwise
 */
async function authenticateUser(email, password) {
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    return null;
  }

  const passwordValid = await verifyPassword(password, user.hashedPassword);
  if (!passwordValid) {
    return null;
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  return user;
}

/**
 * Get a user by their ID.
 * @param {number} userId - User ID
 * @returns {Promise<User|null>}
 */
async function getUserById(userId) {
  return User.findByPk(userId);
}

/**
 * Get a user by their email.
 * @param {string} email - User email
 * @returns {Promise<User|null>}
 */
async function getUserByEmail(email) {
  return User.findOne({ where: { email } });
}

/**
 * Get a user by their username.
 * @param {string} username - Username
 * @returns {Promise<User|null>}
 */
async function getUserByUsername(username) {
  return User.findOne({ where: { username } });
}

/**
 * Update user profile information.
 * @param {number} userId - User ID
 * @param {object} updates - Fields to update
 * @returns {Promise<[User|null, string|null]>} Tuple of (User, null) on success or (null, error_message) on failure
 */
async function updateUser(userId, { username, riotId, region }) {
  const user = await User.findByPk(userId);
  
  if (!user) {
    return [null, 'User not found'];
  }

  // Check username uniqueness if changing
  if (username && username !== user.username) {
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return [null, 'Username already taken'];
    }
    user.username = username;
  }

  if (riotId !== undefined) {
    user.riotId = riotId;
  }

  if (region !== undefined) {
    user.region = region;
  }

  try {
    await user.save();
    return [user, null];
  } catch (error) {
    console.error('Failed to update user:', error);
    return [null, 'Failed to update profile'];
  }
}

/**
 * Change user's password.
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<[boolean, string|null]>} Tuple of (success, error_message)
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findByPk(userId);
  
  if (!user) {
    return [false, 'User not found'];
  }

  const passwordValid = await verifyPassword(currentPassword, user.hashedPassword);
  if (!passwordValid) {
    return [false, 'Current password is incorrect'];
  }

  try {
    user.hashedPassword = await getPasswordHash(newPassword);
    await user.save();
    return [true, null];
  } catch (error) {
    console.error('Failed to change password:', error);
    return [false, 'Failed to change password'];
  }
}

/**
 * Delete a user account.
 * @param {number} userId - User ID
 * @returns {Promise<[boolean, string|null]>} Tuple of (success, error_message)
 */
async function deleteUser(userId) {
  const user = await User.findByPk(userId);
  
  if (!user) {
    return [false, 'User not found'];
  }

  try {
    await user.destroy();
    return [true, null];
  } catch (error) {
    console.error('Failed to delete user:', error);
    return [false, 'Failed to delete account'];
  }
}

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  updateUser,
  changePassword,
  deleteUser,
};
