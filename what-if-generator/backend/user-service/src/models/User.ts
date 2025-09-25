import { pool } from '../utils/database'
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  email: string
  password_hash: string
  created_at: Date
  updated_at: Date
}

export interface CreateUserData {
  email: string
  password: string
}

export interface UserResponse {
  id: number
  email: string
  created_at: Date
}

export class UserModel {
  static async create(userData: CreateUserData): Promise<UserResponse> {
    const { email, password } = userData
    
    // Hash password
    const saltRounds = 12
    const password_hash = await bcrypt.hash(password, saltRounds)
    
    const query = `
      INSERT INTO users (email, password_hash, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING id, email, created_at
    `
    
    const result = await pool.query(query, [email, password_hash])
    return result.rows[0]
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1'
    const result = await pool.query(query, [email])
    return result.rows[0] || null
  }

  static async findById(id: number): Promise<UserResponse | null> {
    const query = 'SELECT id, email, created_at FROM users WHERE id = $1'
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static async emailExists(email: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE email = $1'
    const result = await pool.query(query, [email])
    return result.rows.length > 0
  }
}