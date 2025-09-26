const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️  Using default JWT_SECRET in development. Change this in production!');
  return 'dev-jwt-secret-change-in-production';
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'what-if-generator',
    audience: 'what-if-generator-users'
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'what-if-generator',
    audience: 'what-if-generator-users'
  });
};

/**
 * Verify token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'what-if-generator',
      audience: 'what-if-generator-users'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Generate token pair (access + refresh)
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'access'
  };

  const refreshPayload = {
    id: user.id,
    email: user.email,
    type: 'refresh'
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(refreshPayload),
    expiresIn: JWT_EXPIRES_IN
  };
};

/**
 * Decode token without verification (for expired tokens)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateTokenPair,
  decodeToken
};