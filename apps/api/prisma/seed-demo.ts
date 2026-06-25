import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const STAFF_PASSWORD = 'Demo123!@#';
const CLIENT_PASSWORD = 'ClientDemo123!@#';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function main() {
  const staffHash = await bcrypt.hash(STAFF_PASSWORD, 12);
  const clientHash = await bcrypt.hash(CLIENT_PASSWORD, 12);

  // ── 1. Staff users ──────────────────────────────────────────────────────────
  const staffSeeds = [
    { email: 'sara.bennani@agency.test', full_name: 'Sara Bennani', role: 'marketing_manager' as const, department: 'marketing' as const },
    { email: 'yassine.elidrissi@agency.test', full_name: 'Yassine El Idrissi', role: 'marketing_agent' as const, department: 'marketing' as const },
    { email: 'hiba.saadi@agency.test', full_name: 'Hiba Saadi', role: 'marketing_agent' as const, department: 'marketing' as const },
    { email: 'karim.touzani@agency.test', full_name: 'Karim Touzani', role: 'production_manager' as const, department: 'production' as const },
    { email: 'nour.amrani@agency.test', full_name: 'Nour Amrani', role: 'production_agent' as const, department: 'production' as const },
  ];

  const staff: Record<string, { id: string }> = {};
  for (const s of staffSeeds) {
    const u = await prisma.users.upsert({
      where: { email: s.email },
      update: { password_hash: staffHash, is_active: true, failed_login_attempts: 0, locked_until: null },
      create: { ...s, password_hash: staffHash },
    });
    staff[s.email] = u;
  }
  const admin = await prisma.users.findUniqueOrThrow({ where: { email: 'admin@marketingERP.com' } });

  console.log('Seeded staff users:', staffSeeds.map((s) => s.email).join(', '));

  // ── 2. Clients + portal logins ───────────────────────────────────────────────
  const clientSeeds = [
    { company_name: 'Atlas Coffee Roasters', contact_name: 'Mehdi Tazi', contact_email: 'mehdi@atlascoffee.test', phone: '+212 661-204578', industry: 'Food & Beverage', notes: 'Specialty coffee roaster, 4 retail locations + e-commerce.', portalEmail: 'mehdi@atlascoffee.test' },
    { company_name: 'Lumen Fitness Studio', contact_name: 'Salma Ouahbi', contact_email: 'salma@lumenfitness.test', phone: '+212 662-905133', industry: 'Health & Fitness', notes: 'Boutique fitness studio launching a membership app.', portalEmail: 'salma@lumenfitness.test' },
    { company_name: 'Voltaire Home Decor', contact_name: 'Adam Cherkaoui', contact_email: 'adam@voltairehome.test', phone: '+212 663-447821', industry: 'Retail', notes: 'Mid-range home decor brand, seasonal catalog drops.', portalEmail: 'adam@voltairehome.test' },
  ];

  const clients: Record<string, { id: string }> = {};
  for (const c of clientSeeds) {
    const { portalEmail, ...clientData } = c;
    const existingClient = await prisma.clients.findFirst({ where: { company_name: c.company_name } });
    const client = existingClient ?? (await prisma.clients.create({ data: clientData }));
    clients[c.company_name] = client;

    await prisma.client_users.upsert({
      where: { email: portalEmail },
      update: { password_hash: clientHash, is_active: true, failed_login_attempts: 0, locked_until: null },
      create: {
        client_id: client.id,
        email: portalEmail,
        full_name: c.contact_name,
        password_hash: clientHash,
      },
    });
  }
  console.log('Seeded clients:', clientSeeds.map((c) => c.company_name).join(', '));

  // ── 3. Projects ──────────────────────────────────────────────────────────────
  const projectSeeds = [
    {
      client: 'Atlas Coffee Roasters', name: 'Atlas Coffee — Spring Launch', objective: 'sales' as const,
      status: 'active' as const, start_date: daysAgo(30), end_date: daysAgo(-30),
      budget_total: 8000, meta_ads_account_id: 'act_10245789312',
      team: ['sara.bennani@agency.test', 'yassine.elidrissi@agency.test', 'karim.touzani@agency.test', 'nour.amrani@agency.test'],
    },
    {
      client: 'Atlas Coffee Roasters', name: 'Atlas Loyalty App Awareness', objective: 'awareness' as const,
      status: 'active' as const, start_date: daysAgo(14), end_date: daysAgo(-45),
      budget_total: 5000, meta_ads_account_id: null,
      team: ['sara.bennani@agency.test', 'hiba.saadi@agency.test'],
    },
    {
      client: 'Lumen Fitness Studio', name: 'Lumen Summer Membership Drive', objective: 'leads' as const,
      status: 'active' as const, start_date: daysAgo(21), end_date: daysAgo(-21),
      budget_total: 6000, meta_ads_account_id: 'act_88231904475',
      team: ['sara.bennani@agency.test', 'yassine.elidrissi@agency.test', 'nour.amrani@agency.test'],
    },
    {
      client: 'Voltaire Home Decor', name: 'Voltaire Autumn Collection', objective: 'conversions' as const,
      status: 'draft' as const, start_date: daysAgo(-7), end_date: daysAgo(-60),
      budget_total: 4000, meta_ads_account_id: null,
      team: ['hiba.saadi@agency.test', 'karim.touzani@agency.test'],
    },
  ];

  const projects: Record<string, { id: string }> = {};
  for (const p of projectSeeds) {
    const existing = await prisma.projects.findFirst({ where: { name: p.name } });
    const project = existing ?? await prisma.projects.create({
      data: {
        client_id: clients[p.client].id,
        name: p.name,
        objective: p.objective,
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
        budget_total: p.budget_total,
        meta_ads_account_id: p.meta_ads_account_id,
        created_by: admin.id,
      },
    });
    projects[p.name] = project;

    for (const email of p.team) {
      await prisma.project_users.upsert({
        where: { project_id_user_id: { project_id: project.id, user_id: staff[email].id } },
        update: {},
        create: { project_id: project.id, user_id: staff[email].id },
      });
    }
  }
  console.log('Seeded projects:', projectSeeds.map((p) => p.name).join(', '));

  // ── 4. Tasks ─────────────────────────────────────────────────────────────────
  const taskSeeds: {
    project: string; title: string; description: string; department: 'marketing' | 'production';
    status: 'todo' | 'in_progress' | 'review' | 'revision' | 'approved' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent'; assignees: string[];
    client_approval?: 'none' | 'pending' | 'client_approved' | 'client_rejected';
    client_rejection_comment?: string;
  }[] = [
    { project: 'Atlas Coffee — Spring Launch', title: 'Design Instagram carousel for spring promo', description: 'Six-slide carousel announcing the new single-origin Ethiopia roast.', department: 'marketing', priority: 'high', status: 'in_progress', assignees: ['yassine.elidrissi@agency.test'] },
    { project: 'Atlas Coffee — Spring Launch', title: 'Write blog post: 5 brewing tips for spring', description: 'SEO-focused blog post targeting "best coffee brewing methods".', department: 'marketing', priority: 'medium', status: 'todo', assignees: ['yassine.elidrissi@agency.test'] },
    { project: 'Atlas Coffee — Spring Launch', title: 'Film product demo: pour-over brewing', description: 'Short vertical video for Reels/TikTok, 30-45s.', department: 'production', priority: 'high', status: 'review', assignees: ['nour.amrani@agency.test'], client_approval: 'pending' },
    { project: 'Atlas Coffee — Spring Launch', title: 'Edit spring promo reel — round 2', description: 'Incorporate client feedback: shorten intro, add logo outro.', department: 'production', priority: 'medium', status: 'revision', assignees: ['nour.amrani@agency.test'], client_approval: 'client_rejected', client_rejection_comment: 'Intro is too long, please trim to under 5 seconds before the product shot.' },
    { project: 'Atlas Coffee — Spring Launch', title: 'Set up Meta ad creative variants', description: '4 creative variants (carousel, single image x2, video) for A/B testing.', department: 'marketing', priority: 'urgent', status: 'approved', assignees: ['sara.bennani@agency.test'], client_approval: 'client_approved' },
    { project: 'Atlas Coffee — Spring Launch', title: 'Publish launch week recap post', description: 'Performance recap + thank-you post for launch week.', department: 'marketing', priority: 'low', status: 'done', assignees: ['yassine.elidrissi@agency.test'] },

    { project: 'Atlas Loyalty App Awareness', title: 'Storyboard loyalty app teaser video', description: '60-second teaser explaining the points system.', department: 'production', priority: 'medium', status: 'todo', assignees: ['karim.touzani@agency.test'] },
    { project: 'Atlas Loyalty App Awareness', title: 'Draft app store screenshots copy', description: 'Headline + subhead copy for 5 App Store screenshots.', department: 'marketing', priority: 'medium', status: 'in_progress', assignees: ['hiba.saadi@agency.test'] },

    { project: 'Lumen Summer Membership Drive', title: 'Design lead-gen landing page mockup', description: 'Figma mockup for "Free 7-Day Trial" landing page.', department: 'marketing', priority: 'high', status: 'review', assignees: ['yassine.elidrissi@agency.test'], client_approval: 'pending' },
    { project: 'Lumen Summer Membership Drive', title: 'Shoot class footage — HIIT session', description: 'On-location shoot, need 3 camera angles.', department: 'production', priority: 'high', status: 'in_progress', assignees: ['nour.amrani@agency.test'] },
    { project: 'Lumen Summer Membership Drive', title: 'Configure Meta lead-ad form', description: 'Native lead form with 4 qualifying questions, synced to CRM webhook.', department: 'marketing', priority: 'urgent', status: 'todo', assignees: ['sara.bennani@agency.test'] },
    { project: 'Lumen Summer Membership Drive', title: 'Write 3 testimonial spotlight posts', description: 'Member success stories — before/after format.', department: 'marketing', priority: 'low', status: 'done', assignees: ['yassine.elidrissi@agency.test'] },

    { project: 'Voltaire Autumn Collection', title: 'Plan autumn lookbook shot list', description: '12-product shot list across 3 room sets.', department: 'production', priority: 'medium', status: 'todo', assignees: ['karim.touzani@agency.test'] },
    { project: 'Voltaire Autumn Collection', title: 'Draft email campaign sequence', description: '3-email sequence: teaser, launch, last-chance.', department: 'marketing', priority: 'medium', status: 'todo', assignees: ['hiba.saadi@agency.test'] },
  ];

  for (const t of taskSeeds) {
    const existing = await prisma.tasks.findFirst({ where: { title: t.title, project_id: projects[t.project].id } });
    const task = existing ?? await prisma.tasks.create({
      data: {
        project_id: projects[t.project].id,
        title: t.title,
        description: t.description,
        department: t.department,
        status: t.status,
        priority: t.priority,
        due_date: daysAgo(-Math.floor(Math.random() * 14 + 2)),
        client_approval: t.client_approval ?? 'none',
        client_rejection_comment: t.client_rejection_comment ?? null,
        created_by: admin.id,
      },
    });

    for (const email of t.assignees) {
      await prisma.task_assignees.upsert({
        where: { task_id_user_id: { task_id: task.id, user_id: staff[email].id } },
        update: {},
        create: { task_id: task.id, user_id: staff[email].id },
      });
    }

    if (!existing && (t.status === 'review' || t.status === 'revision')) {
      await prisma.task_comments.create({
        data: {
          task_id: task.id,
          author_id: staff[t.assignees[0]].id,
          body: t.status === 'revision'
            ? 'Updated per client feedback, ready for re-review.'
            : 'Ready for review — let me know if you need any changes.',
        },
      });
    }
  }
  console.log(`Seeded ${taskSeeds.length} tasks across ${projectSeeds.length} projects`);

  // ── 5. Budget entries ────────────────────────────────────────────────────────
  const budgetSeeds: { project: string; category: string; amount: number; description: string; daysBack: number }[] = [
    { project: 'Atlas Coffee — Spring Launch', category: 'ad_spend', amount: 1250.0, description: 'Meta Ads — week 1 boost', daysBack: 25 },
    { project: 'Atlas Coffee — Spring Launch', category: 'ad_spend', amount: 980.5, description: 'Meta Ads — week 2 boost', daysBack: 18 },
    { project: 'Atlas Coffee — Spring Launch', category: 'production', amount: 600.0, description: 'Videographer day rate — pour-over shoot', daysBack: 20 },
    { project: 'Atlas Coffee — Spring Launch', category: 'design', amount: 250.0, description: 'Freelance illustrator — carousel graphics', daysBack: 15 },
    { project: 'Lumen Summer Membership Drive', category: 'ad_spend', amount: 1500.0, description: 'Meta lead-ad campaign — initial spend', daysBack: 12 },
    { project: 'Lumen Summer Membership Drive', category: 'production', amount: 450.0, description: 'On-location shoot — equipment rental', daysBack: 10 },
    { project: 'Lumen Summer Membership Drive', category: 'tools', amount: 89.0, description: 'CRM webhook integration tool — monthly', daysBack: 8 },
  ];
  for (const b of budgetSeeds) {
    const existing = await prisma.budget_entries.findFirst({ where: { project_id: projects[b.project].id, description: b.description } });
    if (!existing) {
      await prisma.budget_entries.create({
        data: {
          project_id: projects[b.project].id,
          created_by: admin.id,
          amount: b.amount,
          category: b.category,
          description: b.description,
          entry_date: daysAgo(b.daysBack),
        },
      });
    }
  }
  console.log(`Seeded ${budgetSeeds.length} budget entries`);

  // ── 6. Analytics records + sync job + AI insight (Meta Ads-enabled projects) ─
  const analyticsProjects = projectSeeds.filter((p) => p.meta_ads_account_id);
  for (const p of analyticsProjects) {
    const project = projects[p.name];
    const campaigns = [
      { id: `${p.meta_ads_account_id}_c1`, name: `${p.name} — Prospecting` },
      { id: `${p.meta_ads_account_id}_c2`, name: `${p.name} — Retargeting` },
    ];

    for (let day = 13; day >= 0; day--) {
      const date = daysAgo(day);
      for (const c of campaigns) {
        const impressions = Math.round(randomBetween(2000, 9000));
        const clicks = Math.round(impressions * randomBetween(0.015, 0.04));
        const spend = randomBetween(20, 90);
        const conversions = Math.round(clicks * randomBetween(0.03, 0.12));
        const conversionValue = conversions * randomBetween(15, 45);

        await prisma.analytics_records.upsert({
          where: { project_id_campaign_id_record_date: { project_id: project.id, campaign_id: c.id, record_date: date } },
          update: {},
          create: {
            project_id: project.id,
            campaign_id: c.id,
            campaign_name: c.name,
            record_date: date,
            impressions,
            clicks,
            spend,
            reach: Math.round(impressions * randomBetween(0.6, 0.85)),
            conversions,
            conversion_value: conversionValue,
            ctr: clicks / impressions,
            cpc: spend / Math.max(clicks, 1),
            cpa: conversions > 0 ? spend / conversions : null,
            roas: spend > 0 ? conversionValue / spend : null,
            cpm: (spend / impressions) * 1000,
          },
        });
      }
    }

    const existingJob = await prisma.sync_jobs.findFirst({ where: { project_id: project.id } });
    const job = existingJob ?? await prisma.sync_jobs.create({
      data: {
        project_id: project.id,
        status: 'succeeded',
        triggered_by: admin.id,
        started_at: daysAgo(0),
        finished_at: new Date(),
      },
    });

    const existingInsight = await prisma.ai_insights.findFirst({ where: { project_id: project.id } });
    if (!existingInsight) {
      await prisma.ai_insights.create({
        data: {
          project_id: project.id,
          sync_job_id: job.id,
          summary: `Over the last 14 days, ${p.name} delivered steady performance with retargeting outperforming prospecting on conversion rate. Spend pacing is on track against the allocated budget.`,
          insights: [
            { title: 'Retargeting drives most conversions', body: 'The Retargeting campaign converts at roughly 2x the rate of Prospecting, despite a smaller audience.' },
            { title: 'CTR trending upward', body: 'Click-through rate improved over the period, suggesting creative fatigue has not yet set in.' },
          ],
          recommendations: [
            { title: 'Shift budget toward retargeting', body: 'Consider reallocating 10-15% of prospecting spend to retargeting to capture more high-intent conversions.' },
            { title: 'Refresh prospecting creative', body: 'Introduce a new creative variant for the Prospecting campaign within the next week to sustain CTR.' },
          ],
          prompt_tokens: 1840,
          completion_tokens: 320,
          cost_usd: 0.018,
        },
      });
    }
  }
  console.log(`Seeded analytics + AI insights for: ${analyticsProjects.map((p) => p.name).join(', ')}`);

  // ── 7. A finished report ──────────────────────────────────────────────────────
  const reportProject = projects['Atlas Coffee — Spring Launch'];
  const existingReport = await prisma.reports.findFirst({ where: { project_id: reportProject.id } });
  if (!existingReport) {
    await prisma.reports.create({
      data: {
        project_id: reportProject.id,
        created_by: admin.id,
        period_start: daysAgo(14),
        period_end: daysAgo(0),
        status: 'ready',
        executive_summary: 'The Spring Launch campaign for Atlas Coffee Roasters performed above target during its first two weeks, driven primarily by strong retargeting conversion rates and a well-received product demo video.',
        performance_overview: 'Total spend of ~$2,230 generated steady reach growth and an improving CTR trend. Retargeting campaigns consistently outperformed prospecting on cost-per-acquisition.',
        key_insights: [
          { title: 'Strong early momentum', body: 'Launch week saw the highest single-day spend efficiency of the campaign so far.' },
          { title: 'Video content resonates', body: 'The pour-over demo video drove the highest engagement rate of any creative asset.' },
        ],
        recommendations: [
          { title: 'Scale retargeting budget', body: 'Increase retargeting allocation by 15% for the remainder of the campaign.' },
        ],
        conclusion: 'Recommend continuing current strategy with a modest budget shift toward retargeting for the next reporting period.',
        shared_with_client: true,
        shared_at: daysAgo(1),
        prompt_tokens: 2100,
        completion_tokens: 540,
        cost_usd: 0.024,
      },
    });
  }
  console.log('Seeded 1 published report for Atlas Coffee — Spring Launch');

  // ── 8. Notifications ─────────────────────────────────────────────────────────
  const notifSeeds = [
    { email: 'yassine.elidrissi@agency.test', type: 'task_assigned' as const, message: 'You were assigned to "Design Instagram carousel for spring promo"' },
    { email: 'nour.amrani@agency.test', type: 'task_status' as const, message: '"Edit spring promo reel — round 2" was sent back for revision' },
    { email: 'sara.bennani@agency.test', type: 'report_ready' as const, message: 'AI report for "Atlas Coffee — Spring Launch" is ready to review' },
  ];
  for (const n of notifSeeds) {
    const existing = await prisma.notifications.findFirst({ where: { user_id: staff[n.email].id, message: n.message } });
    if (!existing) {
      await prisma.notifications.create({
        data: { user_id: staff[n.email].id, type: n.type, message: n.message },
      });
    }
  }
  console.log(`Seeded ${notifSeeds.length} notifications`);

  console.log('\nDemo data seed complete.');
  console.log(`Staff login password (all seeded staff): ${STAFF_PASSWORD}`);
  console.log(`Client portal login password (all seeded client contacts): ${CLIENT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
