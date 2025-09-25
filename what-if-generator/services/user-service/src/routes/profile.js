const express = require('express');
const ProfileController = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateUpdateProfile, 
  validateObjectId, 
  validatePagination,
  validateSearch 
} = require('../middleware/validation');

const router = express.Router();

// Get current user's profile
router.get('/', authMiddleware, ProfileController.getProfile);

// Update current user's profile
router.put('/', authMiddleware, validateUpdateProfile, ProfileController.updateProfile);

// Get user profile by username
router.get('/username/:username', ProfileController.getUserByUsername);

// Get current user's stats
router.get('/stats', authMiddleware, ProfileController.getUserStats);

// Update user stats (called by other services)
router.put('/:userId/stats', validateObjectId('userId'), ProfileController.updateStats);

// Get leaderboard
router.get('/leaderboard', validatePagination, ProfileController.getLeaderboard);

// Search users
router.get('/search', validateSearch, validatePagination, ProfileController.searchUsers);

// Follow/Unfollow user
router.post('/:userId/follow', authMiddleware, validateObjectId('userId'), ProfileController.toggleFollow);

// Get user's followers/following
router.get('/:userId/follows', validateObjectId('userId'), validatePagination, ProfileController.getFollows);

module.exports = router;