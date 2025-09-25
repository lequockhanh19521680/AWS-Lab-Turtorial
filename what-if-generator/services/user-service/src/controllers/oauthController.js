const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const logger = require('../config/logger');

class OAuthController {
  // Google OAuth callback
  static async googleCallback(req, res) {
    try {
      const { id, displayName, emails, photos } = req.user;
      
      // Check if user already exists with Google ID
      let user = await User.findByGoogleId(id);
      
      if (user) {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        const token = generateToken(user);
        
        logger.info('Google OAuth login successful', { 
          userId: user.id, 
          googleId: id 
        });
        
        return res.json({
          success: true,
          message: 'Login successful',
          data: {
            token,
            user: user.toJSON()
          }
        });
      }
      
      // Check if user exists with same email
      const email = emails[0]?.value;
      if (email) {
        user = await User.findOne({ where: { email } });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = id;
          user.provider = 'google';
          user.lastLogin = new Date();
          if (!user.avatar && photos[0]?.value) {
            user.avatar = photos[0].value;
          }
          await user.save();
          
          const token = generateToken(user);
          
          logger.info('Google account linked to existing user', { 
            userId: user.id, 
            googleId: id 
          });
          
          return res.json({
            success: true,
            message: 'Account linked successfully',
            data: {
              token,
              user: user.toJSON()
            }
          });
        }
      }
      
      // Create new user
      const username = await OAuthController.generateUniqueUsername(displayName);
      
      user = await User.create({
        email: email || `${id}@google.local`,
        googleId: id,
        provider: 'google',
        displayName: displayName || 'Google User',
        username,
        avatar: photos[0]?.value || null,
        emailVerified: true, // Google emails are pre-verified
        isActive: true,
        lastLogin: new Date()
      });
      
      const token = generateToken(user);
      
      logger.info('New user created via Google OAuth', { 
        userId: user.id, 
        googleId: id 
      });
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          token,
          user: user.toJSON()
        }
      });
      
    } catch (error) {
      logger.error('Google OAuth callback error', { 
        error: error.message, 
        googleId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'OAuth authentication failed'
      });
    }
  }
  
  // Facebook OAuth callback
  static async facebookCallback(req, res) {
    try {
      const { id, displayName, emails, photos } = req.user;
      
      // Check if user already exists with Facebook ID
      let user = await User.findByFacebookId(id);
      
      if (user) {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        const token = generateToken(user);
        
        logger.info('Facebook OAuth login successful', { 
          userId: user.id, 
          facebookId: id 
        });
        
        return res.json({
          success: true,
          message: 'Login successful',
          data: {
            token,
            user: user.toJSON()
          }
        });
      }
      
      // Check if user exists with same email
      const email = emails?.[0]?.value;
      if (email) {
        user = await User.findOne({ where: { email } });
        
        if (user) {
          // Link Facebook account to existing user
          user.facebookId = id;
          user.provider = 'facebook';
          user.lastLogin = new Date();
          if (!user.avatar && photos?.[0]?.value) {
            user.avatar = photos[0].value;
          }
          await user.save();
          
          const token = generateToken(user);
          
          logger.info('Facebook account linked to existing user', { 
            userId: user.id, 
            facebookId: id 
          });
          
          return res.json({
            success: true,
            message: 'Account linked successfully',
            data: {
              token,
              user: user.toJSON()
            }
          });
        }
      }
      
      // Create new user
      const username = await OAuthController.generateUniqueUsername(displayName);
      
      user = await User.create({
        email: email || `${id}@facebook.local`,
        facebookId: id,
        provider: 'facebook',
        displayName: displayName || 'Facebook User',
        username,
        avatar: photos?.[0]?.value || null,
        emailVerified: true, // Facebook emails are pre-verified
        isActive: true,
        lastLogin: new Date()
      });
      
      const token = generateToken(user);
      
      logger.info('New user created via Facebook OAuth', { 
        userId: user.id, 
        facebookId: id 
      });
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          token,
          user: user.toJSON()
        }
      });
      
    } catch (error) {
      logger.error('Facebook OAuth callback error', { 
        error: error.message, 
        facebookId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'OAuth authentication failed'
      });
    }
  }
  
  // Generate unique username
  static async generateUniqueUsername(displayName) {
    let baseUsername = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    if (baseUsername.length < 3) {
      baseUsername = 'user' + Math.random().toString(36).substring(2, 8);
    }
    
    let username = baseUsername;
    let counter = 1;
    
    while (await User.findByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    return username;
  }
  
  // Link OAuth account to existing user
  static async linkAccount(req, res) {
    try {
      const { provider, providerId, providerData } = req.body;
      const userId = req.user.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if account already linked
      if (provider === 'google' && user.googleId) {
        return res.status(400).json({
          success: false,
          message: 'Google account already linked'
        });
      }
      
      if (provider === 'facebook' && user.facebookId) {
        return res.status(400).json({
          success: false,
          message: 'Facebook account already linked'
        });
      }
      
      // Link the account
      if (provider === 'google') {
        user.googleId = providerId;
        if (providerData.avatar && !user.avatar) {
          user.avatar = providerData.avatar;
        }
      } else if (provider === 'facebook') {
        user.facebookId = providerId;
        if (providerData.avatar && !user.avatar) {
          user.avatar = providerData.avatar;
        }
      }
      
      await user.save();
      
      logger.info('OAuth account linked', { 
        userId, 
        provider, 
        providerId 
      });
      
      res.json({
        success: true,
        message: `${provider} account linked successfully`,
        data: { user: user.toJSON() }
      });
      
    } catch (error) {
      logger.error('Failed to link OAuth account', { 
        error: error.message, 
        userId: req.user.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to link account'
      });
    }
  }
  
  // Unlink OAuth account
  static async unlinkAccount(req, res) {
    try {
      const { provider } = req.params;
      const userId = req.user.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if user has a password (can't unlink if it's the only auth method)
      if (!user.password && user.provider === provider) {
        return res.status(400).json({
          success: false,
          message: 'Cannot unlink the only authentication method. Please set a password first.'
        });
      }
      
      // Unlink the account
      if (provider === 'google') {
        user.googleId = null;
      } else if (provider === 'facebook') {
        user.facebookId = null;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid provider'
        });
      }
      
      // If this was the primary provider, switch to local
      if (user.provider === provider) {
        user.provider = user.password ? 'local' : (user.googleId ? 'google' : user.facebookId ? 'facebook' : 'local');
      }
      
      await user.save();
      
      logger.info('OAuth account unlinked', { 
        userId, 
        provider 
      });
      
      res.json({
        success: true,
        message: `${provider} account unlinked successfully`,
        data: { user: user.toJSON() }
      });
      
    } catch (error) {
      logger.error('Failed to unlink OAuth account', { 
        error: error.message, 
        userId: req.user.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to unlink account'
      });
    }
  }
}

module.exports = OAuthController;