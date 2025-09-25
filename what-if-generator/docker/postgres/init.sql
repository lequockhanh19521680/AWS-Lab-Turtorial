-- Database initialization script for PostgreSQL
-- This script sets up the database schema for User Service

-- Set timezone
SET timezone = 'UTC';

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For improved indexing

-- Create database (if not exists)
-- Note: This is handled by Docker environment variables

-- Create schemas
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS logs;

-- Users table (main table for User Service)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{"theme": "light", "language": "vi", "notifications": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- GIN index for JSONB preferences
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN(preferences);

-- User roles table (for future role-based access control)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_active 
    ON user_roles(user_id, role) WHERE is_active = true;

-- User sessions table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- User audit log table
CREATE TABLE IF NOT EXISTS audit.user_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL DEFAULT 'user',
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit.user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit.user_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON audit.user_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit.user_audit_log(performed_by);

-- User statistics table (for analytics)
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_scenarios INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_reports INTEGER DEFAULT 0,
    total_logins INTEGER DEFAULT 0,
    last_scenario_at TIMESTAMP WITH TIME ZONE,
    last_share_at TIMESTAMP WITH TIME ZONE,
    stats_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stats_date)
);

-- Indexes for user_statistics
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_date ON user_statistics(stats_date);

-- User preferences history (for tracking preference changes)
CREATE TABLE IF NOT EXISTS user_preferences_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_preferences JSONB,
    new_preferences JSONB NOT NULL,
    changed_by UUID REFERENCES users(id),
    change_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for preferences history
CREATE INDEX IF NOT EXISTS idx_prefs_history_user_id ON user_preferences_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prefs_history_created_at ON user_preferences_history(created_at);

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_statistics table
DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER update_user_statistics_updated_at
    BEFORE UPDATE ON user_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log user changes to audit table
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.user_audit_log(user_id, action, entity_type, entity_id, new_values)
        VALUES (NEW.id, 'INSERT', 'user', NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.user_audit_log(user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (NEW.id, 'UPDATE', 'user', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.user_audit_log(user_id, action, entity_type, entity_id, old_values)
        VALUES (OLD.id, 'DELETE', 'user', OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for user audit logging
DROP TRIGGER IF EXISTS user_audit_trigger ON users;
CREATE TRIGGER user_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_changes();

-- Function to log preference changes
CREATE OR REPLACE FUNCTION log_preference_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.preferences IS DISTINCT FROM NEW.preferences THEN
        INSERT INTO user_preferences_history(user_id, old_preferences, new_preferences)
        VALUES (NEW.id, OLD.preferences, NEW.preferences);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for preference change logging
DROP TRIGGER IF EXISTS log_preference_changes_trigger ON users;
CREATE TRIGGER log_preference_changes_trigger
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_preference_changes();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR (last_activity < CURRENT_TIMESTAMP - INTERVAL '30 days' AND is_active = false);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats(
    p_user_id UUID,
    p_stat_type VARCHAR(50),
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_statistics (user_id, stats_date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, stats_date) DO NOTHING;
    
    CASE p_stat_type
        WHEN 'scenario' THEN
            UPDATE user_statistics 
            SET total_scenarios = total_scenarios + p_increment,
                last_scenario_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id AND stats_date = CURRENT_DATE;
        WHEN 'share' THEN
            UPDATE user_statistics 
            SET total_shares = total_shares + p_increment,
                last_share_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id AND stats_date = CURRENT_DATE;
        WHEN 'report' THEN
            UPDATE user_statistics 
            SET total_reports = total_reports + p_increment
            WHERE user_id = p_user_id AND stats_date = CURRENT_DATE;
        WHEN 'login' THEN
            UPDATE user_statistics 
            SET total_logins = total_logins + p_increment
            WHERE user_id = p_user_id AND stats_date = CURRENT_DATE;
    END CASE;
END;
$$ language 'plpgsql';

-- Create default admin user (password: admin123 - change in production!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (id, email, password, first_name, last_name, is_active, email_verified)
VALUES (
    uuid_generate_v4(),
    'admin@whatifgenerator.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/uBGhJ1oYW', -- admin123
    'Admin',
    'User',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Add admin role to admin user
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM users 
WHERE email = 'admin@whatifgenerator.com'
ON CONFLICT DO NOTHING;

-- Views for common queries

-- Active users view
CREATE OR REPLACE VIEW active_users AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.email_verified,
    u.last_login,
    u.created_at,
    COALESCE(array_agg(ur.role) FILTER (WHERE ur.is_active), ARRAY[]::VARCHAR[]) as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
WHERE u.is_active = true
GROUP BY u.id, u.email, u.first_name, u.last_name, u.email_verified, u.last_login, u.created_at;

-- User summary statistics view
CREATE OR REPLACE VIEW user_summary_stats AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    COALESCE(SUM(us.total_scenarios), 0) as total_scenarios,
    COALESCE(SUM(us.total_shares), 0) as total_shares,
    COALESCE(SUM(us.total_logins), 0) as total_logins,
    MAX(us.last_scenario_at) as last_scenario_at,
    MAX(us.last_share_at) as last_share_at
FROM users u
LEFT JOIN user_statistics us ON u.id = us.user_id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.created_at;

-- Set up periodic cleanup job (requires pg_cron extension)
-- This would be set up separately in a production environment
-- SELECT cron.schedule('cleanup-expired-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Add comments for documentation
COMMENT ON TABLE users IS 'Main users table storing user account information';
COMMENT ON TABLE user_roles IS 'User roles for role-based access control';
COMMENT ON TABLE user_sessions IS 'Active user sessions for session management';
COMMENT ON TABLE user_statistics IS 'User activity statistics aggregated by date';
COMMENT ON TABLE audit.user_audit_log IS 'Audit log for tracking user-related changes';

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL database initialization completed successfully!';
    RAISE NOTICE 'Default admin user created: admin@whatifgenerator.com (password: admin123)';
    RAISE NOTICE 'Please change the default admin password in production!';
END $$;