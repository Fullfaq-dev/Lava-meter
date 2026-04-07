CREATE TABLE IF NOT EXISTS LAVA_USERS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    can_read BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    access_vedomost BOOLEAN DEFAULT false,
    access_input BOOLEAN DEFAULT false,
    access_analytics BOOLEAN DEFAULT false,
    access_production BOOLEAN DEFAULT false,
    access_energy_report BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default admin user
INSERT INTO LAVA_USERS (username, password, can_read, can_edit, access_vedomost, access_input, access_analytics, access_production, access_energy_report)
VALUES ('admin', 'admin', true, true, true, true, true, true, true)
ON CONFLICT (username) DO NOTHING;
