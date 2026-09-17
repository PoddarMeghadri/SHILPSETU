-- ShilpSetu ("Bridge of Craft") Database Schema
-- Compatible with PostgreSQL 14+ / Supabase

-- Artisans Table
CREATE TABLE IF NOT EXISTS artisans (
    id VARCHAR(64) PRIMARY KEY,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    craft VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    gender VARCHAR(20) DEFAULT 'other',
    email VARCHAR(255),
    language VARCHAR(10) DEFAULT 'hi',
    trust_score INTEGER DEFAULT 98,
    is_verified BOOLEAN DEFAULT TRUE,
    udyam_number VARCHAR(64),
    gi_tag VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    artisan_id VARCHAR(64) REFERENCES artisans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    craft VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    story TEXT,
    raw_materials_cost NUMERIC(10, 2) DEFAULT 0,
    labor_hours NUMERIC(6, 1) DEFAULT 0,
    hourly_rate NUMERIC(10, 2) DEFAULT 180,
    margin_percentage NUMERIC(5, 2) DEFAULT 25,
    gi_certified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(64) PRIMARY KEY,
    artisan_id VARCHAR(64) REFERENCES artisans(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL DEFAULT 0,
    threshold INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    artisan_id VARCHAR(64) REFERENCES artisans(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    product_title VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_type VARCHAR(64) NOT NULL, -- 'government', 'corporate', 'retail'
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'in_production', 'shipped', 'delivered'
    escrow_status VARCHAR(32) NOT NULL DEFAULT 'held_in_sbi_escrow', -- 'held_in_sbi_escrow', 'released_to_artisan', 'refunded'
    delivery_by DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tenders Table (GeM & Institutional B2B)
CREATE TABLE IF NOT EXISTS tenders (
    id VARCHAR(64) PRIMARY KEY,
    tender_number VARCHAR(128) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    buyer_type VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL,
    max_budget NUMERIC(14, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open', -- 'open', 'bid_submitted', 'awarded', 'closed'
    deadline DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
    id VARCHAR(64) PRIMARY KEY,
    artisan_id VARCHAR(64) REFERENCES artisans(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'hi',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_products_artisan ON products(artisan_id);
CREATE INDEX IF NOT EXISTS idx_orders_artisan ON orders(artisan_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_chat_artisan ON chat_history(artisan_id);
