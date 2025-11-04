-- Initial database setup for POS System
-- This script runs when PostgreSQL container first starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas for different services (optional, for better organization)
-- CREATE SCHEMA IF NOT EXISTS auth;
-- CREATE SCHEMA IF NOT EXISTS orders;
-- CREATE SCHEMA IF NOT EXISTS payments;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE pos_db TO postgres;

-- Log successful initialization
SELECT 'POS Database initialized successfully!' AS status;
