const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Post = require('../models/Post');
const UserProfile = require('../models/UserProfile');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { 
  validateCreatePost, 
  validateUpdatePost, 
  validateObjectId, 
  validatePagination,
  validateSearch 
} = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

// Create a new post
router.post('/', authMiddleware, validateCreatePost, async (req, res) => {
  try {
    const { title, content, type, visibility, tags, scenarioId, images } = req.body;
    
    const post = new Post({
      postId: uuidv4(),
      userId: req.user.id,
      title,
      content,
      type: type || 'custom',
      visibility: visibility || 'public',
      tags: tags || [],
      scenarioId: scenarioId || null,
      images: images || []
    });

    await post.save();
    
    // Update user stats
    await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { 'stats.posts': 1, 'stats.experience': 10 } },
      { upsert: true }
    );

    logger.info('Post created', { 
      postId: post.postId, 
      userId: req.user.id 
    });

    res.status(201).json({
      success: true,
      data: { post: post.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to create post', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create post'
    });
  }
});

// Get posts feed
router.get('/feed', optionalAuthMiddleware, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, tags } = req.query;
    const skip = (page - 1) * limit;
    
    let posts;
    
    if (type === 'trending') {
      posts = await Post.findTrending({ limit: parseInt(limit), skip });
    } else if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      posts = await Post.findPublicFeed({ 
        limit: parseInt(limit), 
        skip, 
        tags: tagArray 
      });
    } else {
      posts = await Post.findPublicFeed({ limit: parseInt(limit), skip });
    }

    // Add user interaction status if authenticated
    if (req.user) {
      posts = posts.map(post => {
        const postObj = post.toPublicJSON();
        postObj.userInteractions = {
          isLiked: post.isLikedBy(req.user.id),
          isShared: post.isSharedBy(req.user.id)
        };
        return postObj;
      });
    }

    res.json({
      success: true,
      data: { posts }
    });
  } catch (error) {
    logger.error('Failed to get feed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get feed'
    });
  }
});

// Search posts
router.get('/search', validateSearch, validatePagination, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const posts = await Post.searchPosts(q, { limit: parseInt(limit), skip });

    res.json({
      success: true,
      data: { posts: posts.map(post => post.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to search posts', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to search posts'
    });
  }
});

// Get user's posts
router.get('/user/:userId', validateObjectId('userId'), validatePagination, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, visibility } = req.query;
    const skip = (page - 1) * limit;
    
    const options = { limit: parseInt(limit), skip };
    if (visibility) options.visibility = visibility;
    
    const posts = await Post.findByUserId(userId, options);

    // Add user interaction status if authenticated
    if (req.user) {
      posts.forEach(post => {
        const postObj = post.toPublicJSON();
        postObj.userInteractions = {
          isLiked: post.isLikedBy(req.user.id),
          isShared: post.isSharedBy(req.user.id)
        };
      });
    }

    res.json({
      success: true,
      data: { posts: posts.map(post => post.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get user posts', { 
      error: error.message, 
      userId: req.params.userId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get user posts'
    });
  }
});

// Get single post
router.get('/:postId', optionalAuthMiddleware, validateObjectId('postId'), async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findOne({ postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const postData = post.toPublicJSON();
    
    // Add user interaction status if authenticated
    if (req.user) {
      postData.userInteractions = {
        isLiked: post.isLikedBy(req.user.id),
        isShared: post.isSharedBy(req.user.id)
      };
    }

    res.json({
      success: true,
      data: { post: postData }
    });
  } catch (error) {
    logger.error('Failed to get post', { 
      error: error.message, 
      postId: req.params.postId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get post'
    });
  }
});

// Update post
router.put('/:postId', authMiddleware, validateObjectId('postId'), validateUpdatePost, async (req, res) => {
  try {
    const { postId } = req.params;
    const updateData = req.body;
    
    const post = await Post.findOne({ postId, userId: req.user.id, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or access denied'
      });
    }

    Object.assign(post, updateData);
    await post.save();

    logger.info('Post updated', { 
      postId, 
      userId: req.user.id 
    });

    res.json({
      success: true,
      data: { post: post.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to update post', { 
      error: error.message, 
      postId: req.params.postId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update post'
    });
  }
});

// Delete post
router.delete('/:postId', authMiddleware, validateObjectId('postId'), async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findOne({ postId, userId: req.user.id, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or access denied'
      });
    }

    post.isDeleted = true;
    await post.save();
    
    // Update user stats
    await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { 'stats.posts': -1 } }
    );

    logger.info('Post deleted', { 
      postId, 
      userId: req.user.id 
    });

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete post', { 
      error: error.message, 
      postId: req.params.postId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

// Like/Unlike post
router.post('/:postId/like', authMiddleware, validateObjectId('postId'), async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findOne({ postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const wasLiked = post.isLikedBy(req.user.id);
    await post.like(req.user.id);
    
    // Update user stats
    const statChange = wasLiked ? -1 : 1;
    await UserProfile.findOneAndUpdate(
      { userId: post.userId },
      { $inc: { 'stats.totalLikes': statChange, 'stats.experience': statChange * 2 } }
    );

    logger.info('Post like toggled', { 
      postId, 
      userId: req.user.id,
      action: wasLiked ? 'unliked' : 'liked'
    });

    res.json({
      success: true,
      data: { 
        likes: post.likes.count,
        isLiked: !wasLiked
      }
    });
  } catch (error) {
    logger.error('Failed to toggle like', { 
      error: error.message, 
      postId: req.params.postId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
});

// Share post
router.post('/:postId/share', authMiddleware, validateObjectId('postId'), async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findOne({ postId, isDeleted: false });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.share(req.user.id);
    
    // Update user stats
    await UserProfile.findOneAndUpdate(
      { userId: post.userId },
      { $inc: { 'stats.totalShares': 1, 'stats.experience': 5 } }
    );

    logger.info('Post shared', { 
      postId, 
      userId: req.user.id 
    });

    res.json({
      success: true,
      data: { 
        shares: post.shares.count,
        isShared: true
      }
    });
  } catch (error) {
    logger.error('Failed to share post', { 
      error: error.message, 
      postId: req.params.postId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to share post'
    });
  }
});

module.exports = router;