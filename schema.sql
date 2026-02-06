-- Esquema Multi-Tienda para KeClick Platform (SaaS)

-- 1. Tabla Maestra de Tiendas (Tenants)
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY, -- Ej: 'KC-772A'
    name TEXT NOT NULL,
    owner_phone TEXT,
    owner_email TEXT,
    status TEXT DEFAULT 'trial', -- 'trial', 'active', 'suspended', 'expired'
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '5 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    subscription_plan TEXT DEFAULT 'trial',
    settings JSONB DEFAULT '{}'::jsonb
);

-- 2. Ventas / Comandas (con store_id)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    customer_name TEXT,
    table_number INTEGER,
    waiter TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    order_data JSONB NOT NULL,
    notes TEXT,
    order_code TEXT,
    closed BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'sale',
    audit_notes JSONB DEFAULT '[]'::jsonb,
    closure_id UUID
);

-- 3. Configuración de la App (por tienda)
CREATE TABLE IF NOT EXISTS settings (
    store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
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

-- 4. Perfil de la Tienda / Menú (por tienda)
CREATE TABLE IF NOT EXISTS store_profile (
    store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT,
    whatsapp_number TEXT,
    theme TEXT DEFAULT 'keclick',
    menu JSONB DEFAULT '[]'::jsonb,
    modifier_groups JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Cierres de Día (por tienda)
CREATE TABLE IF NOT EXISTS day_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    closed_by TEXT NOT NULL,
    is_admin_closure BOOLEAN DEFAULT FALSE,
    total_paid DECIMAL(10,2) NOT NULL,
    total_pending DECIMAL(10,2) NOT NULL,
    total_voided DECIMAL(10,2) NOT NULL,
    sales_count INTEGER NOT NULL,
    report_ids TEXT[]
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE store_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE stores;

-- REGLAS DE SEGURIDAD (RLS) - Opcional pero recomendado para Multi-tienda real
-- NOTA: Por ahora, el cliente manejará el filtrado por store_id en las consultas.
-- Para producción completa, habilitaríamos RLS aquí.
