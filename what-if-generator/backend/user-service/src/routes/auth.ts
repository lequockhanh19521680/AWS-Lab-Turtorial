import { Router, Request, Response } from 'express'
import { UserModel } from '../models/User'
import { generateToken } from '../utils/jwt'
import { registerSchema, loginSchema } from '../utils/validation'
import { AuthRequest, authenticateToken } from '../middleware/auth'

const router = Router()

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ 
        message: error.details[0].message 
      })
    }

    const { email, password } = value

    // Check if user already exists
    const existingUser = await UserModel.emailExists(email)
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Email này đã được sử dụng' 
      })
    }

    // Create user
    const user = await UserModel.create({ email, password })

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ 
      message: 'Lỗi server, vui lòng thử lại sau' 
    })
  }
})

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ 
        message: error.details[0].message 
      })
    }

    const { email, password } = value

    // Find user
    const user = await UserModel.findByEmail(email)
    if (!user) {
      return res.status(401).json({ 
        message: 'Email hoặc mật khẩu không đúng' 
      })
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Email hoặc mật khẩu không đúng' 
      })
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      message: 'Lỗi server, vui lòng thử lại sau' 
    })
  }
})

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.userId)
    if (!user) {
      return res.status(404).json({ 
        message: 'Người dùng không tồn tại' 
      })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ 
      message: 'Lỗi server, vui lòng thử lại sau' 
    })
  }
})

export default router