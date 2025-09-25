import { pool } from '../utils/database'

export interface Scenario {
  id: number
  user_id: number
  topic: string
  content: string
  created_at: Date
}

export interface CreateScenarioData {
  user_id: number
  topic: string
  content: string
}

export class ScenarioModel {
  static async create(scenarioData: CreateScenarioData): Promise<Scenario> {
    const { user_id, topic, content } = scenarioData
    
    const query = `
      INSERT INTO scenarios (user_id, topic, content, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `
    
    const result = await pool.query(query, [user_id, topic, content])
    return result.rows[0]
  }

  static async findByUserId(userId: number, limit?: number, offset?: number): Promise<Scenario[]> {
    let query = `
      SELECT * FROM scenarios 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `
    
    const params: any[] = [userId]
    
    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }
    
    if (offset) {
      query += ` OFFSET $${params.length + 1}`
      params.push(offset)
    }
    
    const result = await pool.query(query, params)
    return result.rows
  }

  static async findById(id: number, userId: number): Promise<Scenario | null> {
    const query = 'SELECT * FROM scenarios WHERE id = $1 AND user_id = $2'
    const result = await pool.query(query, [id, userId])
    return result.rows[0] || null
  }

  static async deleteById(id: number, userId: number): Promise<boolean> {
    const query = 'DELETE FROM scenarios WHERE id = $1 AND user_id = $2'
    const result = await pool.query(query, [id, userId])
    return result.rowCount > 0
  }

  static async countByUserId(userId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM scenarios WHERE user_id = $1'
    const result = await pool.query(query, [userId])
    return parseInt(result.rows[0].count)
  }
}