import { Router, Request, Response } from 'express'
import { ScenarioModel } from '../models/Scenario'
import { AuthRequest, authenticateToken } from '../middleware/auth'
import { createScenarioSchema } from '../utils/validation'

const router = Router()

// Create scenario (called by generation service)
router.post('/scenarios', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Validate input
    const { error, value } = createScenarioSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ 
        message: error.details[0].message 
      })
    }

    const { topic, content } = value
    const userId = req.user!.userId

    // Create scenario
    const scenario = await ScenarioModel.create({
      user_id: userId,
      topic,
      content
    })

    res.status(201).json({
      message: 'Scenario saved successfully',
      scenario
    })
  } catch (error) {
    console.error('Create scenario error:', error)
    res.status(500).json({ 
      message: 'Lỗi server, vui lòng thử lại sau' 
    })
  }
})

// Get user's scenario history
router.get('/scenarios/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    // Get scenarios with pagination
    const scenarios = await ScenarioModel.findByUserId(userId, limit, offset)
    const total = await ScenarioModel.countByUserId(userId)

    res.json({
      scenarios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({ 
      message: 'Lỗi server, vui lòng thử lại sau' 
    })
  }
})

// Get specific scenario
router.get('/scenarios/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const scenarioId = parseInt(req.params.id)
    const userId = req.user!.userId

    if (isNaN(scenarioId)) {
      return res.status(400).json({ 
        message: 'ID viễn cảnh không hợp lệ' 
      })
    }

    const scenario = await ScenarioModel.findById(scenarioId, userId)
    if (!scenario) {
      return res.status(404).json({ 
        message: 'Không tìm thấy viễn cảnh' 
      })
    }

    res.json({ scenario })
  } catch (error) {
    console.error('Get scenario error:', error)
    res.status(500).json({ 
      message: 'Lỗi server, vui lòng thử lại sau' 
    })
  }
})

// Delete scenario
router.delete('/scenarios/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const scenarioId = parseInt(req.params.id)
    const userId = req.user!.userId

    if (isNaN(scenarioId)) {
      return res.status(400).json({ 
        message: 'ID viễn cảnh không hợp lệ' 
      })
    }

    const deleted = await ScenarioModel.deleteById(scenarioId, userId)
    if (!deleted) {
      return res.status(404).json({ 
        message: 'Không tìm thấy viễn cảnh để xóa' 
      })
    }

    res.json({ 
      message: 'Xóa viễn cảnh thành công' 
    })
  } catch (error) {
    console.error('Delete scenario error:', error)
    res.status(500).json({ 
      message: 'Lỗi server, vui lòng thử lại sau' 
    })
  }
})

export default router