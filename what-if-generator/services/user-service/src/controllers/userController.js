const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * Lấy thông tin profile người dùng hiện tại
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * UC-013: Cập nhật thông tin profile
 */
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const { firstName, lastName, preferences } = req.body;

    const updateData = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferences !== undefined) {
      // Merge with existing preferences
      updateData.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * UC-013: Đổi mật khẩu
 */
const changePassword = async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại'
      });
    }

    // Update password
    await user.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * UC-014: Đổi email
 */
const changeEmail = async (req, res) => {
  try {
    const user = req.user;
    const { newEmail, password } = req.body;

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu không chính xác'
      });
    }

    // Check if new email is different
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Email mới phải khác email hiện tại'
      });
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ 
      where: { 
        email: newEmail,
        id: { [Op.ne]: user.id }
      } 
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được sử dụng'
      });
    }

    // Update email and reset email verification
    await user.update({
      email: newEmail,
      emailVerified: false,
      emailVerificationToken: require('crypto').randomBytes(32).toString('hex')
    });

    // TODO: Send new email verification
    // await sendEmailVerification(newEmail, user.emailVerificationToken);

    res.json({
      success: true,
      message: 'Đổi email thành công. Vui lòng xác thực email mới.'
    });

  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * UC-015: Xóa tài khoản
 */
const deleteAccount = async (req, res) => {
  try {
    const user = req.user;
    const { password } = req.body;

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu không chính xác'
      });
    }

    // Soft delete - deactivate account instead of hard delete
    await user.update({ 
      isActive: false,
      email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
    });

    // TODO: Notify other services about account deletion
    // This could include deleting user's scenarios, etc.

    res.json({
      success: true,
      message: 'Tài khoản đã được xóa thành công'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * Lấy danh sách tất cả người dùng (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] }
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * Lấy thông tin một người dùng theo ID (Admin only)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * Cập nhật trạng thái người dùng (Admin only)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    await user.update({ isActive });

    res.json({
      success: true,
      message: `Tài khoản đã được ${isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
      data: { user: user.toJSON() }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

/**
 * Thống kê người dùng (Admin only)
 */
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const verifiedUsers = await User.count({ where: { emailVerified: true } });
    const newUsersToday = await User.count({
      where: {
        createdAt: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsersToday,
        inactiveUsers: totalUsers - activeUsers,
        unverifiedUsers: totalUsers - verifiedUsers
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  changeEmail,
  deleteAccount,
  getAllUsers,
  getUserById,
  updateUserStatus,
  getUserStats
};