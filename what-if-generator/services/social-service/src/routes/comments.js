const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const UserProfile = require('../models/UserProfile');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateCreateComment, 
  validateUpdateComment, 
  validateObjectId, 
  validatePagination 
} = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

// Create a new comment
router.post('/', authMiddleware, validateCreateComment, async (req, res) => {
  try {
    const { postId, content, parentCommentId, images } = req.body;
    
    // Verify post exists
    const post = await Post.findOne({ postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // If replying to a comment, verify parent comment exists
    if (parentCommentId) {
      const parentComment = await Comment.findOne({ 
        commentId: parentCommentId, 
        isDeleted: false 
      });
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
    }

    const comment = new Comment({
      commentId: uuidv4(),
      postId,
      userId: req.user.id,
      parentCommentId: parentCommentId || null,
      content,
      images: images || []
    });

    await comment.save();
    
    // Update post comment count
    await Post.findOneAndUpdate(
      { postId },
      { $inc: { 'comments.count': 1 } }
    );

    // If replying to a comment, update parent comment reply count
    if (parentCommentId) {
      await Comment.findOneAndUpdate(
        { commentId: parentCommentId },
        { $inc: { 'replies.count': 1 } }
      );
    }

    // Update user stats
    await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { 'stats.totalComments': 1, 'stats.experience': 3 } },
      { upsert: true }
    );

    logger.info('Comment created', { 
      commentId: comment.commentId, 
      postId,
      userId: req.user.id,
      parentCommentId
    });

    res.status(201).json({
      success: true,
      data: { comment: comment.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to create comment', { 
      error: error.message, 
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create comment'
    });
  }
});

// Get comments for a post
router.get('/post/:postId', validateObjectId('postId'), validatePagination, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 50, parentCommentId } = req.query;
    const skip = (page - 1) * limit;
    
    const options = { limit: parseInt(limit), skip };
    if (parentCommentId) options.parentCommentId = parentCommentId;
    
    const comments = await Comment.findByPostId(postId, options);

    res.json({
      success: true,
      data: { comments: comments.map(comment => comment.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get comments', { 
      error: error.message, 
      postId: req.params.postId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get comments'
    });
  }
});

// Get user's comments
router.get('/user/:userId', validateObjectId('userId'), validatePagination, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    
    const comments = await Comment.findByUserId(userId, { 
      limit: parseInt(limit), 
      skip 
    });

    res.json({
      success: true,
      data: { comments: comments.map(comment => comment.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get user comments', { 
      error: error.message, 
      userId: req.params.userId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get user comments'
    });
  }
});

// Get comment replies
router.get('/:commentId/replies', validateObjectId('commentId'), validatePagination, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const replies = await Comment.findReplies(commentId, { 
      limit: parseInt(limit), 
      skip 
    });

    res.json({
      success: true,
      data: { replies: replies.map(reply => reply.toPublicJSON()) }
    });
  } catch (error) {
    logger.error('Failed to get comment replies', { 
      error: error.message, 
      commentId: req.params.commentId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get comment replies'
    });
  }
});

// Get single comment
router.get('/:commentId', validateObjectId('commentId'), async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findOne({ commentId, isDeleted: false });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    res.json({
      success: true,
      data: { comment: comment.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to get comment', { 
      error: error.message, 
      commentId: req.params.commentId 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get comment'
    });
  }
});

// Update comment
router.put('/:commentId', authMiddleware, validateObjectId('commentId'), validateUpdateComment, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    const comment = await Comment.findOne({ 
      commentId, 
      userId: req.user.id, 
      isDeleted: false 
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found or access denied'
      });
    }

    await comment.updateContent(content);

    logger.info('Comment updated', { 
      commentId, 
      userId: req.user.id 
    });

    res.json({
      success: true,
      data: { comment: comment.toPublicJSON() }
    });
  } catch (error) {
    logger.error('Failed to update comment', { 
      error: error.message, 
      commentId: req.params.commentId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update comment'
    });
  }
});

// Delete comment
router.delete('/:commentId', authMiddleware, validateObjectId('commentId'), async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findOne({ 
      commentId, 
      userId: req.user.id, 
      isDeleted: false 
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found or access denied'
      });
    }

    comment.isDeleted = true;
    await comment.save();
    
    // Update post comment count
    await Post.findOneAndUpdate(
      { postId: comment.postId },
      { $inc: { 'comments.count': -1 } }
    );

    // If it's a reply, update parent comment reply count
    if (comment.parentCommentId) {
      await Comment.findOneAndUpdate(
        { commentId: comment.parentCommentId },
        { $inc: { 'replies.count': -1 } }
      );
    }

    // Update user stats
    await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { 'stats.totalComments': -1 } }
    );

    logger.info('Comment deleted', { 
      commentId, 
      userId: req.user.id 
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete comment', { 
      error: error.message, 
      commentId: req.params.commentId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment'
    });
  }
});

// Like/Unlike comment
router.post('/:commentId/like', authMiddleware, validateObjectId('commentId'), async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findOne({ commentId, isDeleted: false });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const wasLiked = comment.isLikedBy(req.user.id);
    await comment.like(req.user.id);

    logger.info('Comment like toggled', { 
      commentId, 
      userId: req.user.id,
      action: wasLiked ? 'unliked' : 'liked'
    });

    res.json({
      success: true,
      data: { 
        likes: comment.likes.count,
        isLiked: !wasLiked
      }
    });
  } catch (error) {
    logger.error('Failed to toggle comment like', { 
      error: error.message, 
      commentId: req.params.commentId,
      userId: req.user.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to toggle comment like'
    });
  }
});

module.exports = router;