-- ─── Sprint 4: File Attachments ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_attachments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename     TEXT        NOT NULL,
  file_key     TEXT        NOT NULL,
  file_size    INTEGER     NOT NULL,
  mime_type    TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
