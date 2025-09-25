const express = require('express');
const router = express.Router();

// Controllers
const {
  getProfile,
  updateProfile,
  changePassword,
  changeEmail,
  deleteAccount,
  getAllUsers,
  getUserById,
  updateUserStatus,
  getUserStats
} = require('../controllers/userController');

// Middleware
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  validateUpdateProfile,
  validateChangePassword,
  validateChangeEmail,
  validateDeleteAccount
} = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Lấy thông tin profile người dùng hiện tại
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Cập nhật thông tin profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               preferences:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark]
 *                   language:
 *                     type: string
 *                     enum: [vi, en]
 *                   notifications:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.put('/profile', authenticateToken, validateUpdateProfile, updateProfile);

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     summary: Đổi mật khẩu
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu không hợp lệ
 */
router.put('/change-password', authenticateToken, validateChangePassword, changePassword);

/**
 * @swagger
 * /users/change-email:
 *   put:
 *     summary: Đổi email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *               - password
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đổi email thành công
 *       400:
 *         description: Email không hợp lệ
 *       409:
 *         description: Email đã tồn tại
 */
router.put('/change-email', authenticateToken, validateChangeEmail, changeEmail);

/**
 * @swagger
 * /users/delete-account:
 *   delete:
 *     summary: Xóa tài khoản
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Xóa tài khoản thành công
 *       400:
 *         description: Mật khẩu không chính xác
 */
router.delete('/delete-account', authenticateToken, validateDeleteAccount, deleteAccount);

// Admin routes
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *       403:
 *         description: Không có quyền admin
 */
router.get('/', authenticateToken, requireAdmin, getAllUsers);

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Thống kê người dùng (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê người dùng
 */
router.get('/stats', authenticateToken, requireAdmin, getUserStats);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Lấy thông tin người dùng theo ID (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Thông tin người dùng
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.get('/:userId', authenticateToken, requireAdmin, getUserById);

/**
 * @swagger
 * /users/{userId}/status:
 *   put:
 *     summary: Cập nhật trạng thái người dùng (Admin only)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.put('/:userId/status', authenticateToken, requireAdmin, updateUserStatus);

module.exports = router;