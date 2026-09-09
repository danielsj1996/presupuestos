CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE budget_type AS ENUM ('materials', 'weekly');
CREATE TYPE budget_status AS ENUM ('draft', 'saved', 'cancelled');

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(160) NOT NULL,
  tax_id VARCHAR(13),
  phone VARCHAR(40),
  email VARCHAR(254),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clients_full_name_not_blank CHECK (length(trim(full_name)) > 0),
  CONSTRAINT clients_email_valid CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE UNIQUE INDEX clients_tax_id_unique ON clients (tax_id) WHERE tax_id IS NOT NULL;
CREATE INDEX clients_full_name_search ON clients (lower(full_name));

CREATE TABLE architects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(160) NOT NULL,
  tax_id VARCHAR(13),
  phone VARCHAR(40),
  email VARCHAR(254),
  professional_license VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT architects_full_name_not_blank CHECK (length(trim(full_name)) > 0),
  CONSTRAINT architects_license_not_blank CHECK (length(trim(professional_license)) > 0),
  CONSTRAINT architects_email_valid CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE UNIQUE INDEX architects_tax_id_unique ON architects (tax_id) WHERE tax_id IS NOT NULL;
CREATE UNIQUE INDEX architects_license_unique ON architects (professional_license);
CREATE INDEX architects_full_name_search ON architects (lower(full_name));

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  architect_id UUID NOT NULL REFERENCES architects(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_name_not_blank CHECK (length(trim(name)) > 0),
  UNIQUE (client_id, name)
);

CREATE INDEX projects_client_id_idx ON projects (client_id);
CREATE INDEX projects_architect_id_idx ON projects (architect_id);

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  type budget_type NOT NULL,
  status budget_status NOT NULL DEFAULT 'saved',
  period_label VARCHAR(120) NOT NULL,
  printed_at DATE,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'ARS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budgets_period_not_blank CHECK (length(trim(period_label)) > 0),
  CONSTRAINT budgets_total_non_negative CHECK (total_amount >= 0),
  CONSTRAINT budgets_currency_ars CHECK (currency = 'ARS')
);

CREATE INDEX budgets_project_id_created_at_idx ON budgets (project_id, created_at DESC);
CREATE INDEX budgets_type_idx ON budgets (type);

CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  description VARCHAR(240) NOT NULL,
  category VARCHAR(80) NOT NULL,
  quantity NUMERIC(14, 3) NOT NULL,
  unit VARCHAR(40) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  status VARCHAR(40) NOT NULL,
  line_total NUMERIC(14, 2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budget_items_description_not_blank CHECK (length(trim(description)) > 0),
  CONSTRAINT budget_items_category_not_blank CHECK (length(trim(category)) > 0),
  CONSTRAINT budget_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT budget_items_unit_not_blank CHECK (length(trim(unit)) > 0),
  CONSTRAINT budget_items_unit_price_non_negative CHECK (unit_price >= 0)
);

CREATE INDEX budget_items_budget_id_position_idx ON budget_items (budget_id, position);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER architects_set_updated_at
  BEFORE UPDATE ON architects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER budgets_set_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
