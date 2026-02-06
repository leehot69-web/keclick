-- Esquema inicial para KeClick / Pagomatic

-- 1. Ventas / Comandas
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    customer_name TEXT,
    table_number INTEGER,
    waiter TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    order_data JSONB NOT NULL, -- Aquí guardamos el array de items (order)
    notes TEXT,
    order_code TEXT,
    closed BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'sale',
    audit_notes JSONB DEFAULT '[]'::jsonb
);

-- 2. Configuración de la App
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'current_settings',
    store_id TEXT,
    business_name TEXT,
    business_logo TEXT,
    total_tables INTEGER DEFAULT 10,
    printer_paper_width TEXT DEFAULT '80mm',
    exchange_rate_bcv DECIMAL(10,2),
    exchange_rate_parallel DECIMAL(10,2),
    active_exchange_rate TEXT DEFAULT 'parallel',
    target_number TEXT,
    is_whatsapp_enabled BOOLEAN DEFAULT TRUE,
    waiters_can_charge BOOLEAN DEFAULT FALSE,
    kitchen_stations JSONB DEFAULT '[]'::jsonb,
    users JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Perfil de la Tienda (Menú, etc.)
CREATE TABLE IF NOT EXISTS store_profile (
    id TEXT PRIMARY KEY DEFAULT 'current_profile',
    name TEXT,
    whatsapp_number TEXT,
    theme TEXT DEFAULT 'keclick',
    menu JSONB DEFAULT '[]'::jsonb,
    modifier_groups JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Cierres de Día
CREATE TABLE IF NOT EXISTS day_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TEXT NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    closed_by TEXT NOT NULL,
    is_admin_closure BOOLEAN DEFAULT FALSE,
    total_paid DECIMAL(10,2) NOT NULL,
    total_pending DECIMAL(10,2) NOT NULL,
    total_voided DECIMAL(10,2) NOT NULL,
    sales_count INTEGER NOT NULL,
    report_ids TEXT[] -- Array de IDs de ventas incluidas
);

-- Habilitar Realtime para las ventas (Crucial para Cocina)
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE store_profile;
