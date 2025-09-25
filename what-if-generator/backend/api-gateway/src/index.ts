import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createProxyMiddleware } from 'http-proxy-middleware'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Logging
app.use(morgan('combined'))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use(limiter)

// Stricter rate limiting for generation endpoint
const generationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 generation requests per minute
  message: 'Too many generation requests, please wait before trying again.'
})

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Proxy configurations
const services = {
  user: process.env.USER_SERVICE_URL || 'http://user-service:3002',
  generation: process.env.GENERATION_SERVICE_URL || 'http://generation-service:3003',
  history: process.env.HISTORY_SERVICE_URL || 'http://history-service:3004'
}

// User service routes
app.use('/auth', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: {
    '^/auth': '/auth'
  },
  onError: (err, req, res) => {
    console.error('User service proxy error:', err)
    res.status(503).json({ message: 'User service unavailable' })
  }
}))

// Generation service routes
app.use('/scenarios/generate', generationLimiter, createProxyMiddleware({
  target: services.generation,
  changeOrigin: true,
  pathRewrite: {
    '^/scenarios/generate': '/generate'
  },
  onError: (err, req, res) => {
    console.error('Generation service proxy error:', err)
    res.status(503).json({ message: 'Generation service unavailable' })
  }
}))

// History service routes
app.use('/scenarios', createProxyMiddleware({
  target: services.history,
  changeOrigin: true,
  pathRewrite: {
    '^/scenarios': '/scenarios'
  },
  onError: (err, req, res) => {
    console.error('History service proxy error:', err)
    res.status(503).json({ message: 'History service unavailable' })
  }
}))

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Gateway error:', err)
  res.status(500).json({ message: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
  console.log('Service endpoints:')
  console.log(`- User Service: ${services.user}`)
  console.log(`- Generation Service: ${services.generation}`)
  console.log(`- History Service: ${services.history}`)
})