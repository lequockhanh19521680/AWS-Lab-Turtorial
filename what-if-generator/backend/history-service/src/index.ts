import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import scenarioRoutes from './routes/scenarios'
import { pool } from './utils/database'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3004

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/', scenarioRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'History Service',
    timestamp: new Date().toISOString() 
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('History service error:', err)
  res.status(500).json({ message: 'Internal server error' })
})

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT 1')
    console.log('Database connection established')

    app.listen(PORT, () => {
      console.log(`History Service running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start History Service:', error)
    process.exit(1)
  }
}

startServer()