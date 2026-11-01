-- GhostQueue Database Schema
-- Migration 001: Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Visitors, Operators, Admins)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('visitor', 'operator', 'admin')),
    is_guest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Services (e.g. Accounts, Admissions, Exams, Lab)
CREATE TABLE IF NOT EXISTS services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    service_code VARCHAR(10) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'Layers',
    default_service_duration INT NOT NULL DEFAULT 10, -- in minutes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_service_code_per_org UNIQUE (organization_id, service_code)
);

-- 4. Service Counters (e.g. Window 1, Counter A)
CREATE TABLE IF NOT EXISTS counters (
    counter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(service_id) ON DELETE SET NULL,
    counter_name VARCHAR(100) NOT NULL,
    counter_number INT NOT NULL,
    operator_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'closed' CHECK (status IN ('active', 'paused', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_counter_per_org UNIQUE (organization_id, counter_number)
);

-- 5. Queue Tokens
CREATE TABLE IF NOT EXISTS queue_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(service_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    counter_id UUID REFERENCES counters(counter_id) ON DELETE SET NULL,
    token_number VARCHAR(50) NOT NULL,
    daily_sequence INT NOT NULL,
    queue_position INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting' 
        CHECK (status IN ('waiting', 'called', 'in_service', 'completed', 'skipped', 'cancelled')),
    priority INT DEFAULT 0,
    estimated_wait_minutes INT DEFAULT 0,
    called_at TIMESTAMPTZ,
    service_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    actual_wait_seconds INT,
    actual_service_seconds INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Service Events (Audit timeline for state transitions)
CREATE TABLE IF NOT EXISTS service_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES queue_tokens(token_id) ON DELETE CASCADE,
    counter_id UUID REFERENCES counters(counter_id) ON DELETE SET NULL,
    operator_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL 
        CHECK (event_type IN ('joined', 'called', 'started', 'completed', 'skipped', 'cancelled', 'reassigned')),
    event_notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token_id UUID REFERENCES queue_tokens(token_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'info' 
        CHECK (notification_type IN ('token_generated', 'position_update', 'turn_approaching', 'called', 'service_started', 'completed', 'cancelled', 'info')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Organization Settings
CREATE TABLE IF NOT EXISTS organization_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE UNIQUE,
    auto_call_next BOOLEAN DEFAULT FALSE,
    turn_approaching_threshold INT DEFAULT 2,
    operating_hours_start TIME DEFAULT '08:30:00',
    operating_hours_end TIME DEFAULT '17:30:00',
    max_active_tokens_per_user INT DEFAULT 1,
    sms_notifications_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users (organization_id, role);
CREATE INDEX IF NOT EXISTS idx_services_org_active ON services (organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_counters_org_service ON counters (organization_id, service_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_lookup ON queue_tokens (service_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_user ON queue_tokens (user_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_created_date ON queue_tokens (service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_service_events_token ON service_events (token_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at);
