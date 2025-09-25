import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import generationRoutes from './routes/generation'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3003

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/generate', generationRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Generation Service',
    timestamp: new Date().toISOString(),
    aiProviders: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Generation service error:', err)
  res.status(500).json({ message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Generation Service running on port ${PORT}`)
  console.log('Available AI providers:')
  console.log(`- OpenAI: ${process.env.OPENAI_API_KEY ? 'Available' : 'Not configured'}`)
  console.log(`- Gemini: ${process.env.GEMINI_API_KEY ? 'Available' : 'Not configured'}`)
})