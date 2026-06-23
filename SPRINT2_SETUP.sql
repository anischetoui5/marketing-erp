-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 2 Database Setup — run this in pgAdmin on the marketingER database
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('draft','active','paused','completed','archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_objective AS ENUM ('awareness','engagement','traffic','leads','sales','conversions');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo','in_progress','review','revision','approved','done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low','medium','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('task_assigned','task_status','report_ready');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id),
  name                TEXT NOT NULL,
  objective           project_objective NOT NULL,
  status              project_status NOT NULL DEFAULT 'draft',
  start_date          TIMESTAMP,
  end_date            TIMESTAMP,
  budget_total        DECIMAL(12, 2),
  budget_currency     TEXT NOT NULL DEFAULT 'USD',
  meta_ads_account_id TEXT,
  created_by          UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT project_users_unique UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  department      department NOT NULL,
  status          task_status NOT NULL DEFAULT 'todo',
  priority        task_priority NOT NULL DEFAULT 'medium',
  due_date        TIMESTAMP,
  revision_count  INT NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_assignees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT task_assignees_unique UNIQUE (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  client_user_id  UUID REFERENCES client_users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  message         TEXT NOT NULL,
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Reuse or create a trigger to auto-update updated_at

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
