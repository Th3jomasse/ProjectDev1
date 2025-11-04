# Schémas de Base de Données Détaillés

## 🎯 Vue d'Ensemble

Ce document présente les schémas de base de données complets pour toutes les fonctionnalités business-critical du système POS.

**Principes de Design**
- Normalisation appropriée (3NF minimum)
- Indexes optimisés pour performance
- Partitioning pour scalabilité
- Audit trail complet
- Soft deletes (deleted_at)
- UUID pour IDs (meilleure sécurité et distribution)

---

## 📊 Analytics & Customer Intelligence

### 1. Transaction Analytics (TimescaleDB)

```sql
-- Hypertable pour time-series analytics
CREATE TABLE transaction_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_time TIMESTAMPTZ NOT NULL,

    -- Transaction
    order_id UUID NOT NULL REFERENCES orders(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    tip_amount DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2) DEFAULT 0,

    -- Items detail (JSONB for flexibility)
    items JSONB NOT NULL,
    /* Structure:
    [
        {
            "product_id": "uuid",
            "product_name": "string",
            "category": "string",
            "quantity": number,
            "unit_price": number,
            "cost_price": number,
            "modifiers": [...],
            "prep_time_minutes": number
        }
    ]
    */

    -- Temporal context
    day_of_week INTEGER NOT NULL, -- 0-6
    hour_of_day INTEGER NOT NULL, -- 0-23
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN NOT NULL,
    day_part VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'late_night'

    -- Weather (if available)
    weather_temp DECIMAL(4, 1),
    weather_condition VARCHAR(50),

    -- Customer context
    customer_id UUID REFERENCES customers(id),
    is_new_customer BOOLEAN,
    customer_lifetime_value DECIMAL(10, 2),
    days_since_last_visit INTEGER,
    loyalty_tier VARCHAR(20),

    -- Operational context
    table_id UUID REFERENCES tables(id),
    server_id UUID REFERENCES employees(id),
    order_source VARCHAR(20) NOT NULL, -- 'dine_in', 'takeout', 'delivery', 'online', 'qr_code', 'kiosk'
    party_size INTEGER,
    table_capacity INTEGER,

    -- Performance metrics
    order_to_payment_minutes INTEGER,
    kitchen_prep_minutes INTEGER,
    wait_time_minutes INTEGER,
    table_turnover_minutes INTEGER,

    -- Payment
    payment_method VARCHAR(20) NOT NULL,
    payment_processor VARCHAR(50),
    tip_percentage DECIMAL(5, 2),

    -- Promotions
    promotions_applied JSONB,
    /* Structure:
    [
        {
            "promo_id": "uuid",
            "promo_name": "string",
            "discount_amount": number,
            "discount_type": "percentage|fixed"
        }
    ]
    */

    -- Satisfaction
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('transaction_analytics', 'transaction_time');

-- Indexes
CREATE INDEX idx_trans_analytics_time ON transaction_analytics (transaction_time DESC);
CREATE INDEX idx_trans_analytics_location ON transaction_analytics (location_id, transaction_time DESC);
CREATE INDEX idx_trans_analytics_customer ON transaction_analytics (customer_id, transaction_time DESC);
CREATE INDEX idx_trans_analytics_server ON transaction_analytics (server_id, transaction_time DESC);
CREATE INDEX idx_trans_analytics_source ON transaction_analytics (order_source, transaction_time DESC);
CREATE INDEX idx_trans_analytics_items_gin ON transaction_analytics USING GIN (items);

-- Continuous aggregate for daily stats
CREATE MATERIALIZED VIEW daily_sales_summary
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', transaction_time) AS day,
    location_id,
    COUNT(*) AS transaction_count,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS avg_ticket,
    SUM(tip_amount) AS total_tips,
    AVG(tip_percentage) AS avg_tip_percent,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM transaction_analytics
GROUP BY day, location_id;
```

### 2. Product Performance Analytics

```sql
CREATE TABLE product_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Product
    product_id UUID NOT NULL REFERENCES products(id),
    location_id UUID NOT NULL REFERENCES locations(id),

    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'

    -- Sales metrics
    units_sold INTEGER NOT NULL DEFAULT 0,
    gross_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0, -- After discounts

    -- Cost metrics
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    avg_cost_per_unit DECIMAL(10, 2),

    -- Profitability
    gross_margin DECIMAL(10, 2),
    gross_margin_percent DECIMAL(5, 2),

    -- Popularity metrics
    times_ordered INTEGER NOT NULL DEFAULT 0,
    percent_of_orders DECIMAL(5, 2),
    popularity_rank INTEGER,

    -- Menu engineering category
    me_category VARCHAR(20), -- 'Star', 'Plowhorse', 'Puzzle', 'Dog'

    -- Performance trends
    revenue_growth_percent DECIMAL(5, 2), -- vs previous period
    units_growth_percent DECIMAL(5, 2),

    -- Operational
    avg_prep_time_minutes DECIMAL(5, 2),
    total_prep_time_minutes INTEGER,

    -- Item pairing analysis
    commonly_paired_with JSONB,
    /* Structure:
    [
        {
            "product_id": "uuid",
            "product_name": "string",
            "co_occurrence_count": number,
            "co_occurrence_rate": number
        }
    ]
    */

    -- Peak times
    peak_hours JSONB, -- Array of hours [14, 18, 19, 20]
    peak_days JSONB, -- Array of days

    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prod_perf_product ON product_performance (product_id, period_start DESC);
CREATE INDEX idx_prod_perf_location ON product_performance (location_id, period_start DESC);
CREATE INDEX idx_prod_perf_period ON product_performance (period_start, period_end);
CREATE INDEX idx_prod_perf_category ON product_performance (me_category);
CREATE UNIQUE INDEX idx_prod_perf_unique ON product_performance (product_id, location_id, period_start, period_type);
```

### 3. Customer Behavior & Segmentation

```sql
CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    date_of_birth DATE,
    anniversary_date DATE,

    -- Lifetime metrics
    lifetime_value DECIMAL(10, 2) DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    avg_order_value DECIMAL(10, 2),

    -- Visit patterns
    first_visit_date DATE,
    last_visit_date DATE,
    days_since_last_visit INTEGER,
    avg_days_between_visits DECIMAL(5, 1),

    -- Behavioral patterns
    most_common_day_of_week INTEGER, -- 0-6
    most_common_hour INTEGER, -- 0-23
    avg_party_size DECIMAL(3, 1),
    preferred_order_source VARCHAR(20),

    -- Spending patterns
    avg_appetizer_spend DECIMAL(6, 2),
    avg_entree_spend DECIMAL(6, 2),
    avg_dessert_spend DECIMAL(6, 2),
    avg_beverage_spend DECIMAL(6, 2),
    avg_alcohol_spend DECIMAL(6, 2),

    -- RFM Segmentation
    rfm_recency_score INTEGER CHECK (rfm_recency_score BETWEEN 1 AND 5),
    rfm_frequency_score INTEGER CHECK (rfm_frequency_score BETWEEN 1 AND 5),
    rfm_monetary_score INTEGER CHECK (rfm_monetary_score BETWEEN 1 AND 5),
    rfm_segment VARCHAR(50), -- 'Champion', 'Loyal', 'At Risk', etc.
    rfm_calculated_at TIMESTAMPTZ,

    -- Predictive analytics
    churn_risk_score DECIMAL(5, 2), -- 0-100
    predicted_next_visit_date DATE,
    predicted_lifetime_value DECIMAL(10, 2),

    -- Loyalty
    loyalty_points INTEGER DEFAULT 0,
    loyalty_tier VARCHAR(20) DEFAULT 'bronze',
    loyalty_tier_since DATE,

    -- Feedback
    avg_rating DECIMAL(3, 2),
    total_reviews INTEGER DEFAULT 0,
    complaint_count INTEGER DEFAULT 0,
    compliment_count INTEGER DEFAULT 0,

    -- Marketing preferences
    email_marketing_opt_in BOOLEAN DEFAULT FALSE,
    sms_marketing_opt_in BOOLEAN DEFAULT FALSE,
    push_notifications_opt_in BOOLEAN DEFAULT FALSE,
    marketing_frequency VARCHAR(20) DEFAULT 'weekly',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_customers_email ON customer_profiles (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customer_profiles (phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_rfm ON customer_profiles (rfm_segment);
CREATE INDEX idx_customers_ltv ON customer_profiles (lifetime_value DESC);
CREATE INDEX idx_customers_last_visit ON customer_profiles (last_visit_date DESC);
CREATE INDEX idx_customers_churn_risk ON customer_profiles (churn_risk_score DESC);
CREATE INDEX idx_customers_loyalty_tier ON customer_profiles (loyalty_tier);
```

```sql
CREATE TABLE customer_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

    -- Favorite items (top 10)
    favorite_products JSONB,
    /* Structure:
    [
        {
            "product_id": "uuid",
            "product_name": "string",
            "order_count": number,
            "last_ordered": "date"
        }
    ]
    */

    -- Dietary restrictions & allergies
    dietary_restrictions VARCHAR(50)[], -- ['vegetarian', 'gluten_free', ...]
    allergies VARCHAR(100)[],
    spice_preference VARCHAR(20), -- 'mild', 'medium', 'hot'

    -- Seating preferences
    preferred_seating VARCHAR(50)[], -- ['window', 'booth', 'patio']
    avoid_seating VARCHAR(50)[],

    -- Special occasions
    celebrates_birthday BOOLEAN DEFAULT FALSE,
    celebrates_anniversary BOOLEAN DEFAULT FALSE,
    other_occasions JSONB,

    -- Notes
    special_notes TEXT,
    staff_notes TEXT, -- Only visible to staff

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cust_pref_customer ON customer_preferences (customer_id);
```

```sql
CREATE TABLE customer_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Segment criteria (stored as JSONB for flexibility)
    criteria JSONB NOT NULL,
    /* Example:
    {
        "lifetime_value": { "min": 500, "max": null },
        "visits_last_90_days": { "min": 5 },
        "avg_order_value": { "min": 50 },
        "rfm_segment": ["Champion", "Loyal"]
    }
    */

    -- Segment size
    customer_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ,

    -- Segment characteristics
    avg_lifetime_value DECIMAL(10, 2),
    avg_visit_frequency DECIMAL(5, 2),
    avg_order_value DECIMAL(10, 2),

    -- Marketing
    is_marketing_segment BOOLEAN DEFAULT FALSE,
    active_campaigns INTEGER DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_segments_marketing ON customer_segments (is_marketing_segment) WHERE is_marketing_segment = TRUE;
```

### 4. Employee Performance Tracking

```sql
CREATE TABLE employee_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    employee_id UUID NOT NULL REFERENCES employees(id),
    location_id UUID NOT NULL REFERENCES locations(id),

    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'

    -- Sales metrics
    total_sales DECIMAL(10, 2) DEFAULT 0,
    orders_processed INTEGER DEFAULT 0,
    avg_ticket_size DECIMAL(10, 2),
    items_per_order DECIMAL(5, 2),
    upsell_rate DECIMAL(5, 2), -- % of orders with add-ons

    -- Service metrics
    avg_service_time_minutes DECIMAL(5, 2),
    tables_served INTEGER DEFAULT 0,
    avg_customer_rating DECIMAL(3, 2),
    total_ratings_received INTEGER DEFAULT 0,
    complaint_count INTEGER DEFAULT 0,
    compliment_count INTEGER DEFAULT 0,

    -- Productivity
    hours_worked DECIMAL(5, 2),
    sales_per_hour DECIMAL(10, 2),
    orders_per_hour DECIMAL(5, 2),
    efficiency_score DECIMAL(5, 2), -- Composite 0-100

    -- Tips
    total_tips DECIMAL(10, 2) DEFAULT 0,
    avg_tip_percent DECIMAL(5, 2),
    tips_per_hour DECIMAL(10, 2),

    -- Rankings (within location & period)
    sales_rank INTEGER,
    service_rank INTEGER,
    overall_rank INTEGER,
    percentile DECIMAL(5, 2), -- 0-100

    -- Performance vs targets
    sales_target DECIMAL(10, 2),
    sales_vs_target_percent DECIMAL(5, 2),

    -- Trend
    performance_trend VARCHAR(20), -- 'improving', 'stable', 'declining'
    previous_period_comparison DECIMAL(5, 2), -- % change

    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_emp_perf_employee ON employee_performance (employee_id, period_start DESC);
CREATE INDEX idx_emp_perf_location ON employee_performance (location_id, period_start DESC);
CREATE INDEX idx_emp_perf_period ON employee_performance (period_start, period_end);
CREATE INDEX idx_emp_perf_rank ON employee_performance (overall_rank);
CREATE UNIQUE INDEX idx_emp_perf_unique ON employee_performance (employee_id, location_id, period_start, period_type);
```

---

## 🛒 Multi-Channel Ordering

### 5. Orders (Core)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Order identification
    order_number VARCHAR(20) UNIQUE NOT NULL,
    display_number INTEGER, -- Shorter number for KDS/customer display

    -- Location & source
    location_id UUID NOT NULL REFERENCES locations(id),
    order_source VARCHAR(20) NOT NULL, -- 'pos', 'online', 'qr_code', 'kiosk', 'phone', 'mobile_app'
    channel_details JSONB, -- Source-specific metadata

    -- Customer
    customer_id UUID REFERENCES customer_profiles(id),
    guest_name VARCHAR(200),
    guest_phone VARCHAR(20),
    guest_email VARCHAR(255),

    -- Order type
    order_type VARCHAR(20) NOT NULL, -- 'dine_in', 'takeout', 'delivery', 'curbside'

    -- Dine-in specific
    table_id UUID REFERENCES tables(id),
    party_size INTEGER,

    -- Delivery specific
    delivery_address JSONB,
    delivery_instructions TEXT,
    delivery_zone_id UUID REFERENCES delivery_zones(id),
    delivery_fee DECIMAL(6, 2),
    driver_id UUID REFERENCES employees(id),

    -- Timing
    order_time TIMESTAMPTZ DEFAULT NOW(),
    requested_time TIMESTAMPTZ, -- For scheduled orders
    is_asap BOOLEAN DEFAULT TRUE,
    estimated_ready_time TIMESTAMPTZ,
    actual_ready_time TIMESTAMPTZ,
    completed_time TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'
    status_history JSONB, -- Track all status changes with timestamps

    -- Assigned to
    server_id UUID REFERENCES employees(id),
    prepared_by UUID REFERENCES employees(id),

    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    tip DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,

    -- Payment
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid', 'refunded'
    paid_amount DECIMAL(10, 2) DEFAULT 0,

    -- Special instructions
    special_instructions TEXT,
    kitchen_notes TEXT,

    -- Ratings & feedback
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    feedback_received_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT
);

-- Indexes
CREATE INDEX idx_orders_location ON orders (location_id, order_time DESC);
CREATE INDEX idx_orders_status ON orders (status) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_orders_customer ON orders (customer_id, order_time DESC);
CREATE INDEX idx_orders_table ON orders (table_id) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_orders_server ON orders (server_id, order_time DESC);
CREATE INDEX idx_orders_number ON orders (order_number);
CREATE INDEX idx_orders_display_number ON orders (display_number) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_orders_requested_time ON orders (requested_time) WHERE requested_time IS NOT NULL;
```

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    -- Item details (snapshot at time of order)
    product_name VARCHAR(200) NOT NULL,
    product_category VARCHAR(100),

    -- Quantity & pricing
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,

    -- Modifiers
    modifiers JSONB,
    /* Structure:
    [
        {
            "modifier_id": "uuid",
            "modifier_name": "string",
            "option_id": "uuid",
            "option_name": "string",
            "price_adjustment": number
        }
    ]
    */

    -- Customization
    special_instructions TEXT,

    -- Kitchen routing
    kitchen_station VARCHAR(50), -- 'grill', 'fryer', 'salad', 'bar'

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'sent_to_kitchen', 'preparing', 'ready', 'served', 'cancelled'

    -- Timing
    sent_to_kitchen_at TIMESTAMPTZ,
    started_prep_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    prep_time_minutes INTEGER,

    -- Coursing (for multi-course meals)
    course_number INTEGER DEFAULT 1,
    fire_time TIMESTAMPTZ, -- When to start preparing

    -- Voided
    is_voided BOOLEAN DEFAULT FALSE,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES employees(id),
    void_reason TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);
CREATE INDEX idx_order_items_status ON order_items (status) WHERE status NOT IN ('served', 'cancelled');
CREATE INDEX idx_order_items_kitchen ON order_items (kitchen_station, status);
CREATE INDEX idx_order_items_fire_time ON order_items (fire_time) WHERE fire_time IS NOT NULL AND status = 'pending';
```

### 6. Online Ordering Specific

```sql
CREATE TABLE online_orders_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- Customer device
    device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
    browser VARCHAR(50),
    ip_address INET,
    user_agent TEXT,

    -- Ordering platform
    platform VARCHAR(50), -- 'website', 'ios_app', 'android_app'
    app_version VARCHAR(20),

    -- Delivery tracking
    tracking_url VARCHAR(500),
    estimated_delivery_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    delivery_proof JSONB, -- Photo, signature, etc.

    -- Notifications sent
    notifications_sent JSONB,
    /* Structure:
    [
        {
            "type": "order_confirmed",
            "channel": "email",
            "sent_at": "timestamp",
            "delivered": boolean
        }
    ]
    */

    -- Special features used
    scheduled_order BOOLEAN DEFAULT FALSE,
    contactless_delivery BOOLEAN DEFAULT FALSE,
    leave_at_door BOOLEAN DEFAULT FALSE,

    -- Payment
    payment_intent_id VARCHAR(100), -- Stripe payment intent
    save_card BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_online_orders_order ON online_orders_metadata (order_id);
```

### 7. QR Code Orders

```sql
CREATE TABLE qr_code_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- QR Code
    qr_code_id UUID NOT NULL REFERENCES table_qr_codes(id),
    table_id UUID NOT NULL REFERENCES tables(id),

    -- Session
    session_token VARCHAR(100) UNIQUE NOT NULL,
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,

    -- Customer
    customer_id UUID REFERENCES customer_profiles(id),
    guest_name VARCHAR(200),

    -- Orders placed in this session
    order_count INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,

    -- Device
    device_type VARCHAR(20),
    browser VARCHAR(50),

    -- Interactions
    menu_views INTEGER DEFAULT 0,
    items_added INTEGER DEFAULT 0,
    items_removed INTEGER DEFAULT 0,
    service_requests INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_sessions_table ON qr_code_sessions (table_id) WHERE is_active = TRUE;
CREATE INDEX idx_qr_sessions_token ON qr_code_sessions (session_token);
```

```sql
CREATE TABLE qr_service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    qr_session_id UUID NOT NULL REFERENCES qr_code_sessions(id),
    table_id UUID NOT NULL REFERENCES tables(id),

    request_type VARCHAR(50) NOT NULL, -- 'refill', 'check', 'assistance', 'clean_table', 'cutlery'
    message TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'acknowledged', 'completed', 'cancelled'
    acknowledged_by UUID REFERENCES employees(id),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

    -- Response time
    response_time_seconds INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_requests_status ON qr_service_requests (status) WHERE status = 'pending';
CREATE INDEX idx_qr_requests_table ON qr_service_requests (table_id, created_at DESC);
```

---

## 🏢 Multi-Location & Organization

### 8. Organization Structure

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    type VARCHAR(50) NOT NULL, -- 'single', 'chain', 'franchise', 'hotel_group'

    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),

    -- Address
    address JSONB,

    -- Settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    default_currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',

    -- Subscription
    subscription_tier VARCHAR(50), -- 'starter', 'professional', 'enterprise'
    subscription_status VARCHAR(20), -- 'trial', 'active', 'suspended', 'cancelled'
    subscription_start_date DATE,
    subscription_end_date DATE,

    -- Limits
    max_locations INTEGER,
    max_users INTEGER,
    api_rate_limit INTEGER,

    -- Features enabled
    features_enabled JSONB,
    /* Structure:
    {
        "multi_location": true,
        "advanced_analytics": true,
        "ai_features": true,
        "api_access": true,
        "white_label": false
    }
    */

    -- Billing
    billing_email VARCHAR(255),
    billing_address JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Basic info
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE, -- Short code like "DT" for Downtown
    type VARCHAR(50), -- 'restaurant', 'hotel', 'cafe', 'food_truck', 'ghost_kitchen'

    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),

    -- Geo
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50),

    -- Hours
    opening_hours JSONB,
    /* Structure:
    {
        "monday": { "open": "09:00", "close": "22:00" },
        "tuesday": { "open": "09:00", "close": "22:00" },
        ...
        "sunday": { "closed": true }
    }
    */

    -- Capacity
    seating_capacity INTEGER,
    table_count INTEGER,

    -- Features
    features JSONB,
    /* Structure:
    {
        "dine_in": true,
        "takeout": true,
        "delivery": true,
        "curbside": true,
        "reservations": true,
        "online_ordering": true
    }
    */

    -- Configuration
    config JSONB,
    /* Structure:
    {
        "menu": "shared|custom|hybrid",
        "pricing": "centralized|local",
        "inventory": "shared|independent",
        "tax_rate": 0.0875,
        "service_fee": 0.03
    }
    */

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'coming_soon', 'temporarily_closed'
    opening_date DATE,

    -- Manager
    manager_id UUID REFERENCES employees(id),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_locations_org ON locations (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_status ON locations (status);
CREATE INDEX idx_locations_geo ON locations (latitude, longitude);
```

### 9. PMS Integration (Hotel)

```sql
CREATE TABLE pms_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    location_id UUID NOT NULL REFERENCES locations(id),

    -- PMS System
    pms_system VARCHAR(50) NOT NULL, -- 'opera', 'protel', 'mews', 'cloudbeds', 'rms'
    pms_version VARCHAR(20),

    -- Connection
    connection_type VARCHAR(20), -- 'api', 'database', 'file'
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20), -- 'success', 'error', 'pending'
    last_error TEXT,

    -- Configuration
    config JSONB,
    /* Structure:
    {
        "room_charge_enabled": true,
        "posting_categories": {
            "food": "5010",
            "beverage": "5020",
            "room_service": "5030"
        },
        "validate_room": true,
        "validate_guest": true,
        "auto_post": true,
        "daily_limit": 500
    }
    */

    -- Sync settings
    sync_frequency_minutes INTEGER DEFAULT 15,
    batch_posting BOOLEAN DEFAULT TRUE,

    -- Statistics
    total_posts INTEGER DEFAULT 0,
    successful_posts INTEGER DEFAULT 0,
    failed_posts INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pms_location ON pms_integrations (location_id);
```

```sql
CREATE TABLE pms_room_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    pms_integration_id UUID NOT NULL REFERENCES pms_integrations(id),
    order_id UUID NOT NULL REFERENCES orders(id),

    -- Room info
    room_number VARCHAR(20) NOT NULL,
    guest_name VARCHAR(200),
    reservation_id VARCHAR(100), -- PMS reservation ID

    -- Charge details
    charge_amount DECIMAL(10, 2) NOT NULL,
    posting_category VARCHAR(50),
    reference_number VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'posted', 'failed', 'reversed'

    -- PMS Response
    pms_transaction_id VARCHAR(100),
    pms_response JSONB,

    -- Posting
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES employees(id),

    -- Reversal
    reversed_at TIMESTAMPTZ,
    reversal_reason TEXT,

    -- Errors
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pms_charges_order ON pms_room_charges (order_id);
CREATE INDEX idx_pms_charges_status ON pms_room_charges (status);
CREATE INDEX idx_pms_charges_room ON pms_room_charges (room_number, created_at DESC);
```

---

## 📅 Reservations & Table Management

### 10. Reservations

```sql
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    location_id UUID NOT NULL REFERENCES locations(id),

    -- Confirmation
    confirmation_code VARCHAR(20) UNIQUE NOT NULL,

    -- Customer
    customer_id UUID REFERENCES customer_profiles(id),
    guest_name VARCHAR(200) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    guest_email VARCHAR(255),

    -- Reservation details
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    duration_minutes INTEGER DEFAULT 90,

    -- Table assignment
    table_id UUID REFERENCES tables(id),
    section_id UUID REFERENCES sections(id),
    assigned_server_id UUID REFERENCES employees(id),

    -- Status
    status VARCHAR(20) DEFAULT 'confirmed',
    -- 'pending', 'confirmed', 'arrived', 'seated', 'completed', 'no_show', 'cancelled'

    -- Special requests
    special_requests TEXT,
    seating_preference VARCHAR(50), -- 'window', 'booth', 'quiet', 'patio'
    occasion VARCHAR(50), -- 'birthday', 'anniversary', 'business', 'date'

    -- Deposit & Charges
    requires_deposit BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(10, 2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    deposit_payment_id UUID,

    requires_credit_card BOOLEAN DEFAULT FALSE,
    credit_card_token VARCHAR(100),

    no_show_fee DECIMAL(10, 2),
    no_show_charged BOOLEAN DEFAULT FALSE,

    -- Source
    source VARCHAR(50), -- 'phone', 'website', 'google', 'facebook', 'instagram', 'opentable', 'walk_in'
    source_reference VARCHAR(100),

    -- Confirmation & Reminders
    confirmed_at TIMESTAMPTZ,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reconfirm_required BOOLEAN DEFAULT FALSE,
    reconfirmed_at TIMESTAMPTZ,

    -- Arrival
    arrived_at TIMESTAMPTZ,
    seated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by VARCHAR(50), -- 'customer', 'restaurant', 'system'
    cancellation_reason TEXT,

    -- No-show
    marked_no_show_at TIMESTAMPTZ,
    no_show_reason TEXT,

    -- Notes
    internal_notes TEXT,

    -- Metadata
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reservations_location ON reservations (location_id, reservation_date, reservation_time);
CREATE INDEX idx_reservations_customer ON reservations (customer_id);
CREATE INDEX idx_reservations_confirmation ON reservations (confirmation_code);
CREATE INDEX idx_reservations_status ON reservations (status, reservation_date);
CREATE INDEX idx_reservations_table ON reservations (table_id, reservation_date);
CREATE INDEX idx_reservations_upcoming ON reservations (reservation_date, reservation_time)
    WHERE status IN ('confirmed', 'pending');
```

### 11. Tables & Floor Plan

```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id),

    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    capacity INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_location ON sections (location_id) WHERE is_active = TRUE;
```

```sql
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id),
    section_id UUID REFERENCES sections(id),

    -- Identification
    table_number VARCHAR(20) NOT NULL,
    display_name VARCHAR(50),

    -- Capacity
    min_capacity INTEGER NOT NULL DEFAULT 1,
    max_capacity INTEGER NOT NULL,

    -- Position (for floor plan)
    position_x DECIMAL(6, 2),
    position_y DECIMAL(6, 2),
    width DECIMAL(6, 2),
    height DECIMAL(6, 2),
    shape VARCHAR(20) DEFAULT 'rectangle', -- 'rectangle', 'circle', 'square'
    rotation DECIMAL(5, 2) DEFAULT 0, -- degrees

    -- Combining
    can_combine BOOLEAN DEFAULT FALSE,
    combine_with_tables UUID[], -- Array of table IDs

    -- Status
    status VARCHAR(20) DEFAULT 'available',
    -- 'available', 'occupied', 'reserved', 'dirty', 'cleaning', 'out_of_service'

    -- Current assignment
    current_order_id UUID REFERENCES orders(id),
    current_server_id UUID REFERENCES employees(id),
    occupied_since TIMESTAMPTZ,

    -- Properties
    is_active BOOLEAN DEFAULT TRUE,
    is_bookable BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- For auto-assignment

    -- Features
    features VARCHAR(50)[], -- ['window', 'booth', 'high_top', 'outdoor']

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tables_location ON tables (location_id) WHERE is_active = TRUE;
CREATE INDEX idx_tables_section ON tables (section_id);
CREATE INDEX idx_tables_status ON tables (status);
CREATE INDEX idx_tables_current_order ON tables (current_order_id) WHERE current_order_id IS NOT NULL;
CREATE UNIQUE INDEX idx_tables_number_location ON tables (location_id, table_number) WHERE is_active = TRUE;
```

### 12. Waitlist

```sql
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id),

    -- Customer
    customer_id UUID REFERENCES customer_profiles(id),
    guest_name VARCHAR(200) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,

    -- Party details
    party_size INTEGER NOT NULL CHECK (party_size > 0),

    -- Queue
    queue_position INTEGER NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),

    -- Estimated wait
    estimated_wait_minutes INTEGER,
    quoted_wait_minutes INTEGER,
    actual_wait_minutes INTEGER,

    -- Preferences
    seating_preference VARCHAR(50)[],
    special_requests TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'waiting',
    -- 'waiting', 'notified', 'seated', 'no_show', 'cancelled'

    -- Notification
    notified_at TIMESTAMPTZ,
    notification_method VARCHAR(20), -- 'sms', 'app', 'pager'
    notification_expires_at TIMESTAMPTZ,

    -- Seating
    table_id UUID REFERENCES tables(id),
    seated_at TIMESTAMPTZ,

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by VARCHAR(20), -- 'customer', 'restaurant', 'timeout'

    -- No-show
    marked_no_show_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_waitlist_location_status ON waitlist_entries (location_id, status)
    WHERE status = 'waiting';
CREATE INDEX idx_waitlist_position ON waitlist_entries (location_id, queue_position)
    WHERE status = 'waiting';
CREATE INDEX idx_waitlist_notified ON waitlist_entries (notification_expires_at)
    WHERE status = 'notified';
```

---

## 🎁 Loyalty & Marketing

### 13. Loyalty Program

```sql
CREATE TABLE loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    name VARCHAR(50) NOT NULL, -- 'Bronze', 'Silver', 'Gold', 'Platinum'
    level INTEGER NOT NULL, -- 1, 2, 3, 4

    -- Requirements
    min_points INTEGER,
    min_visits INTEGER,
    min_spend DECIMAL(10, 2),

    -- Benefits
    points_multiplier DECIMAL(3, 2) DEFAULT 1.0, -- 1x, 1.5x, 2x
    discount_percent DECIMAL(5, 2) DEFAULT 0,

    perks JSONB,
    /* Structure:
    {
        "birthday_reward": true,
        "free_delivery": true,
        "priority_reservation": true,
        "exclusive_menu_items": true
    }
    */

    -- Display
    color VARCHAR(7), -- Hex color
    icon VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_tiers_org ON loyalty_tiers (organization_id, level);
```

```sql
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customer_profiles(id),

    -- Transaction type
    type VARCHAR(20) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjust', 'bonus'

    -- Points
    points_change INTEGER NOT NULL, -- Positive for earn, negative for redeem
    points_balance INTEGER NOT NULL, -- Balance after this transaction

    -- Related order
    order_id UUID REFERENCES orders(id),
    order_amount DECIMAL(10, 2),

    -- Reward redemption
    reward_id UUID REFERENCES loyalty_rewards(id),

    -- Description
    description TEXT,

    -- Expiry
    points_expire_at DATE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_trans_customer ON loyalty_transactions (customer_id, created_at DESC);
CREATE INDEX idx_loyalty_trans_order ON loyalty_transactions (order_id);
```

```sql
CREATE TABLE loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),

    -- Cost
    points_cost INTEGER NOT NULL,

    -- Type
    reward_type VARCHAR(50) NOT NULL,
    -- 'discount_percent', 'discount_fixed', 'free_item', 'free_delivery', 'upgrade'

    -- Value
    discount_percent DECIMAL(5, 2),
    discount_amount DECIMAL(10, 2),
    free_product_id UUID REFERENCES products(id),

    -- Restrictions
    min_order_amount DECIMAL(10, 2),
    valid_order_types VARCHAR(20)[], -- ['dine_in', 'takeout', 'delivery']
    valid_days INTEGER[], -- [1,2,3,4,5] for weekdays
    valid_hours JSONB,

    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    available_from DATE,
    available_until DATE,
    max_redemptions INTEGER, -- Total across all customers
    max_per_customer INTEGER,
    current_redemptions INTEGER DEFAULT 0,

    -- Tier restrictions
    min_tier_level INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rewards_org ON loyalty_rewards (organization_id) WHERE is_active = TRUE;
```

---

Voulez-vous que je continue avec les schémas pour :
1. Marketing automation campaigns
2. Promotions et discounts
3. Inventory et recipes
4. API partner integrations
5. Autre section spécifique ?