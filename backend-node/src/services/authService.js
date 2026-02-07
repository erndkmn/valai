/**
 * Authentication service for password hashing and JWT token management.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// JWT Configuration
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-change-in-production';
const ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '30', 10);

/**
 * Hash a password for storing in the database.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function getPasswordHash(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a plain password against a hashed password.
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Create a JWT access token.
 * @param {object} data - Dictionary containing claims to encode in the token
 * @param {number} [expiresInMinutes] - Optional custom expiration time in minutes
 * @returns {string} Encoded JWT token string
 */
function createAccessToken(data, expiresInMinutes = ACCESS_TOKEN_EXPIRE_MINUTES) {
  const payload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + expiresInMinutes * 60,
  };
  return jwt.sign(payload, SECRET_KEY, { algorithm: ALGORITHM });
}

/**
 * Decode and validate a JWT access token.
 * @param {string} token - The JWT token string to decode
 * @returns {object|null} Decoded token payload or null if invalid
 */
function decodeAccessToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY, { algorithms: [ALGORITHM] });
  } catch (error) {
    return null;
  }
}

module.exports = {
  SECRET_KEY,
  ACCESS_TOKEN_EXPIRE_MINUTES,
  getPasswordHash,
  verifyPassword,
  createAccessToken,
  decodeAccessToken,
};
