import { Router, Request, Response } from 'express'
import aiService from '../services/ai'
import { generateSchema } from '../utils/validation'
import axios from 'axios'

const router = Router()

// Generate scenario
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate input
    const { error, value } = generateSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ 
        message: error.details[0].message 
      })
    }

    const { topic } = value

    // Generate scenario using AI
    const result = await aiService.generateScenario(topic)

    // Send to history service if user is authenticated
    const authHeader = req.headers['authorization']
    if (authHeader) {
      try {
        await notifyHistoryService(authHeader, topic, result.content)
      } catch (error) {
        console.warn('Failed to save to history:', error)
        // Don't fail the request if history service is down
      }
    }

    res.json({
      topic,
      content: result.content,
      model: result.model,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Generation error:', error)
    res.status(500).json({ 
      message: 'Đã có lỗi xảy ra, vui lòng thử lại sau' 
    })
  }
})

// Helper function to notify history service
async function notifyHistoryService(authHeader: string, topic: string, content: string) {
  const historyServiceUrl = process.env.HISTORY_SERVICE_URL || 'http://history-service:3004'
  
  await axios.post(
    `${historyServiceUrl}/scenarios`,
    { topic, content },
    {
      headers: { 
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    }
  )
}

export default router