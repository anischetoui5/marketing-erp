-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 2 Seed Data — run AFTER SPRINT2_SETUP.sql
-- Safe to run once; uses ON CONFLICT DO NOTHING throughout
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  admin_id        UUID;
  mgr_mkt_id      UUID;
  agent_mkt1_id   UUID;
  agent_mkt2_id   UUID;
  mgr_prod_id     UUID;
  agent_prod_id   UUID;

  client1_id      UUID;
  client2_id      UUID;

  proj1_id        UUID;
  proj2_id        UUID;
  proj3_id        UUID;

  t1 UUID; t2 UUID; t3 UUID; t4 UUID;
  t5 UUID; t6 UUID; t7 UUID; t8 UUID;

BEGIN

  -- ── 1. Grab admin ─────────────────────────────────────────────────────────
  SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found — seed Sprint 1 first';
  END IF;

  -- ── 2. Test internal users ────────────────────────────────────────────────
  INSERT INTO users (email, full_name, role, department, is_active)
    VALUES ('sara.benali@agency.test', 'Sara Benali', 'marketing_manager', 'marketing', true)
    ON CONFLICT (email) DO NOTHING;
  SELECT id INTO mgr_mkt_id FROM users WHERE email = 'sara.benali@agency.test';

  INSERT INTO users (email, full_name, role, department, is_active)
    VALUES ('youssef.amir@agency.test', 'Youssef Amir', 'marketing_agent', 'marketing', true)
    ON CONFLICT (email) DO NOTHING;
  SELECT id INTO agent_mkt1_id FROM users WHERE email = 'youssef.amir@agency.test';

  INSERT INTO users (email, full_name, role, department, is_active)
    VALUES ('layla.hassan@agency.test', 'Layla Hassan', 'marketing_agent', 'marketing', true)
    ON CONFLICT (email) DO NOTHING;
  SELECT id INTO agent_mkt2_id FROM users WHERE email = 'layla.hassan@agency.test';

  INSERT INTO users (email, full_name, role, department, is_active)
    VALUES ('karim.idrissi@agency.test', 'Karim Idrissi', 'production_manager', 'production', true)
    ON CONFLICT (email) DO NOTHING;
  SELECT id INTO mgr_prod_id FROM users WHERE email = 'karim.idrissi@agency.test';

  INSERT INTO users (email, full_name, role, department, is_active)
    VALUES ('nadia.chraibi@agency.test', 'Nadia Chraibi', 'production_agent', 'production', true)
    ON CONFLICT (email) DO NOTHING;
  SELECT id INTO agent_prod_id FROM users WHERE email = 'nadia.chraibi@agency.test';

  -- ── 3. Clients ─────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM clients WHERE company_name = 'Nike Maghreb') THEN
    INSERT INTO clients (company_name, contact_name, contact_email, industry)
      VALUES ('Nike Maghreb', 'Ahmed Tazi', 'ahmed.tazi@nikema.com', 'Sportswear')
      RETURNING id INTO client1_id;
  ELSE
    SELECT id INTO client1_id FROM clients WHERE company_name = 'Nike Maghreb' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clients WHERE company_name = 'Coca-Cola Morocco') THEN
    INSERT INTO clients (company_name, contact_name, contact_email, industry)
      VALUES ('Coca-Cola Morocco', 'Fatima Alaoui', 'f.alaoui@coca-cola.ma', 'FMCG')
      RETURNING id INTO client2_id;
  ELSE
    SELECT id INTO client2_id FROM clients WHERE company_name = 'Coca-Cola Morocco' LIMIT 1;
  END IF;

  -- ── 4. Projects ───────────────────────────────────────────────────────────
  INSERT INTO projects (client_id, name, objective, status, start_date, end_date, budget_total, budget_currency, created_by)
    VALUES (client1_id, 'Nike Summer Campaign 2025', 'awareness', 'active',
            '2025-06-01', '2025-08-31', 120000, 'MAD', admin_id)
    RETURNING id INTO proj1_id;

  INSERT INTO projects (client_id, name, objective, status, start_date, end_date, budget_total, budget_currency, created_by)
    VALUES (client2_id, 'Coca-Cola Ramadan Push', 'engagement', 'active',
            '2025-03-01', '2025-04-10', 85000, 'MAD', admin_id)
    RETURNING id INTO proj2_id;

  INSERT INTO projects (client_id, name, objective, status, start_date, budget_total, budget_currency, created_by)
    VALUES (client1_id, 'Nike Brand Refresh Q4', 'traffic', 'draft',
            '2025-09-01', 200000, 'MAD', admin_id)
    RETURNING id INTO proj3_id;

  -- ── 5. Project team ───────────────────────────────────────────────────────
  INSERT INTO project_users (project_id, user_id) VALUES
    (proj1_id, mgr_mkt_id),
    (proj1_id, agent_mkt1_id),
    (proj1_id, agent_mkt2_id),
    (proj1_id, mgr_prod_id),
    (proj1_id, agent_prod_id),
    (proj2_id, mgr_mkt_id),
    (proj2_id, agent_mkt1_id),
    (proj2_id, agent_prod_id)
  ON CONFLICT ON CONSTRAINT project_users_unique DO NOTHING;

  -- ── 6. Tasks — one in every kanban column ─────────────────────────────────

  -- TODO (2)
  INSERT INTO tasks (project_id, title, description, department, status, priority, due_date, created_by)
    VALUES (proj1_id, 'Design Instagram stories pack',
            'Create 9-frame stories series for the summer launch. Format: 1080×1920.',
            'marketing', 'todo', 'high', '2025-06-15', admin_id)
    RETURNING id INTO t1;

  INSERT INTO tasks (project_id, title, description, department, status, priority, due_date, created_by)
    VALUES (proj1_id, 'Produce 30-sec TVC spot',
            'TV commercial for summer campaign. Deliverable: final cut + 15-sec cutdown.',
            'production', 'todo', 'urgent', '2025-06-20', admin_id)
    RETURNING id INTO t2;

  -- IN PROGRESS (2)
  INSERT INTO tasks (project_id, title, description, department, status, priority, due_date, created_by)
    VALUES (proj1_id, 'Write social media copy',
            'Captions for Facebook & Instagram. Max 150 chars per post. Tone: energetic.',
            'marketing', 'in_progress', 'medium', '2025-06-10', admin_id)
    RETURNING id INTO t3;

  INSERT INTO tasks (project_id, title, description, department, status, priority, due_date, created_by)
    VALUES (proj2_id, 'Ramadan key visual design',
            'Main visual asset for all Ramadan campaign touchpoints. Deliver PSD + exports.',
            'production', 'in_progress', 'high', '2025-03-05', admin_id)
    RETURNING id INTO t4;

  -- REVIEW (1)
  INSERT INTO tasks (project_id, title, description, department, status, priority, due_date, created_by)
    VALUES (proj1_id, 'Brand guidelines document',
            'Update Nike Morocco brand guidelines for 2025 palette and new logo variations.',
            'marketing', 'review', 'medium', '2025-06-05', admin_id)
    RETURNING id INTO t5;

  -- REVISION (1)
  INSERT INTO tasks (project_id, title, description, department, status, priority, due_date, created_by)
    VALUES (proj2_id, 'Meta Ads targeting setup',
            'Configure audience targeting for Ramadan ads. Geo: Casa, Rabat, Marrakech.',
            'marketing', 'revision', 'high', '2025-03-08', admin_id)
    RETURNING id INTO t6;
  UPDATE tasks SET revision_count = 1 WHERE id = t6;

  -- APPROVED (1)
  INSERT INTO tasks (project_id, title, description, department, status, priority, created_by)
    VALUES (proj1_id, 'Media plan Q3 2025',
            'Full media plan including TV, digital, OOH for Q3.',
            'marketing', 'approved', 'medium', admin_id)
    RETURNING id INTO t7;

  -- DONE (1)
  INSERT INTO tasks (project_id, title, description, department, status, priority, created_by)
    VALUES (proj2_id, 'Kick-off presentation deck',
            'Agency brief and client kick-off presentation. 20 slides.',
            'marketing', 'done', 'low', admin_id)
    RETURNING id INTO t8;

  -- ── 7. Task assignees ─────────────────────────────────────────────────────
  INSERT INTO task_assignees (task_id, user_id) VALUES
    (t1, agent_mkt1_id), (t1, agent_mkt2_id),
    (t2, agent_prod_id),
    (t3, agent_mkt1_id),
    (t4, agent_prod_id),
    (t5, agent_mkt2_id),
    (t6, agent_mkt1_id),
    (t7, mgr_mkt_id),
    (t8, agent_mkt1_id)
  ON CONFLICT ON CONSTRAINT task_assignees_unique DO NOTHING;

  -- ── 8. Comments ───────────────────────────────────────────────────────────
  INSERT INTO task_comments (task_id, author_id, body) VALUES
    (t3, agent_mkt1_id, 'First draft done. Waiting on the client word-count limit confirmation before we finalize.'),
    (t3, mgr_mkt_id,    'Keep it under 150 chars per post — optimize for mobile preview.'),
    (t3, agent_mkt1_id, 'Updated. All captions are now within limit, added 3 CTA variations.'),
    (t5, mgr_mkt_id,    'Looks solid. Just need to swap color codes to the 2025 palette on pages 12 and 18.'),
    (t6, agent_mkt1_id, 'Revision done — widened age targeting to 18-45 and added Agadir to geo.'),
    (t6, mgr_mkt_id,    'Also bump the retargeting window from 7 to 14 days. Then we can approve.');

  -- ── 9. Notifications for admin ────────────────────────────────────────────
  INSERT INTO notifications (user_id, type, message, link, is_read) VALUES
    (admin_id, 'task_assigned', 'You were assigned to "Media plan Q3 2025"',
     '/dashboard/tasks?taskId=' || t7::text, false),
    (admin_id, 'task_status',   'Task "Kick-off presentation deck" moved to done',
     '/dashboard/tasks?taskId=' || t8::text, false),
    (admin_id, 'task_status',   'Task "Meta Ads targeting setup" moved to revision',
     '/dashboard/tasks?taskId=' || t6::text, false),
    (admin_id, 'task_status',   'Task "Brand guidelines document" is ready for review',
     '/dashboard/tasks?taskId=' || t5::text, true);

  RAISE NOTICE '✓ Seed complete — 5 users, 2 clients, 3 projects, 8 tasks, 6 comments, 4 notifications';

END $$;
