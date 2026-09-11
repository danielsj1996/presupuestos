-- ============================================================
-- TABLA DE USUARIOS Y ROLES (ADMINISTRADOR / USUARIO COMÚN)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(60) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254),
  role VARCHAR(40) NOT NULL DEFAULT 'USUARIO COMÚN',
  password_hash VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuarios iniciales
INSERT INTO users (username, full_name, email, role, password_hash)
VALUES 
  ('admin', 'Administrador Principal', 'admin@obraclara.com', 'ADMINISTRADOR', 'admin'),
  ('usuario', 'Operador de Obra', 'usuario@obraclara.com', 'USUARIO COMÚN', '123')
ON CONFLICT (username) DO NOTHING;
