-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 3 Seed Data — Intelligence Layer
-- Run AFTER SPRINT2_SEED.sql
-- Inserts: system_config, analytics_records (30 days × 2 campaigns × 2 projects),
--          ai_insights, and two reports (one shared with client)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  admin_id   UUID;
  proj1_id   UUID;
  proj2_id   UUID;
  client1_id UUID;
  client2_id UUID;
  insight1   UUID;
  insight2   UUID;
  report1    UUID;
  report2    UUID;
  d          DATE;
BEGIN

  -- ── 0. Resolve existing IDs ───────────────────────────────────────────────
  SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin found — run Sprint 1 seed first';
  END IF;

  SELECT id INTO proj1_id FROM projects WHERE name = 'Nike Summer Campaign 2025' LIMIT 1;
  SELECT id INTO proj2_id FROM projects WHERE name = 'Coca-Cola Ramadan Push'    LIMIT 1;
  SELECT id INTO client1_id FROM clients WHERE company_name = 'Nike Maghreb'        LIMIT 1;
  SELECT id INTO client2_id FROM clients WHERE company_name = 'Coca-Cola Morocco'   LIMIT 1;

  IF proj1_id IS NULL OR proj2_id IS NULL THEN
    RAISE EXCEPTION 'Projects not found — run Sprint 2 seed first';
  END IF;

  -- ── 1. System config (mock Meta token) ────────────────────────────────────
  INSERT INTO system_config (key, value)
    VALUES ('meta_access_token',  'DEMO_TOKEN_NOT_REAL')
  ON CONFLICT (key) DO NOTHING;

  -- ── 2. Analytics records — Nike Summer Campaign 2025 ─────────────────────
  -- Campaign A: "Nike Summer — Awareness"
  -- Campaign B: "Nike Summer — Retargeting"
  FOR d IN SELECT generate_series(
              CURRENT_DATE - INTERVAL '29 days',
              CURRENT_DATE,
              INTERVAL '1 day'
           )::DATE
  LOOP
    INSERT INTO analytics_records
      (project_id, campaign_id, campaign_name, record_date,
       impressions, clicks, spend, reach, conversions, conversion_value,
       ctr, cpc, cpa, roas, cpm)
    VALUES
      (proj1_id, 'camp_nike_awareness', 'Nike Summer — Awareness', d,
       -- Impressions fluctuate 18k–26k
       18000 + FLOOR(RANDOM() * 8000),
       -- Clicks ~2-3% CTR
       400  + FLOOR(RANDOM() * 280),
       -- Spend 320–480 MAD/day
       320  + ROUND((RANDOM() * 160)::numeric, 2),
       -- Reach ~70% of impressions
       12600 + FLOOR(RANDOM() * 5600),
       -- Conversions 8–20/day
       8    + FLOOR(RANDOM() * 12),
       -- Conversion value ~400 MAD each
       3200 + ROUND((RANDOM() * 4800)::numeric, 2),
       -- Derived KPIs computed below
       NULL, NULL, NULL, NULL, NULL)
    ON CONFLICT (project_id, campaign_id, record_date) DO NOTHING;

    -- Update derived KPIs for awareness campaign
    UPDATE analytics_records
    SET
      ctr = CASE WHEN impressions > 0 THEN ROUND((clicks / impressions * 100)::numeric, 4) ELSE NULL END,
      cpc = CASE WHEN clicks > 0      THEN ROUND((spend / clicks)::numeric, 4) ELSE NULL END,
      cpa = CASE WHEN conversions > 0 THEN ROUND((spend / conversions)::numeric, 4) ELSE NULL END,
      roas= CASE WHEN spend > 0       THEN ROUND((conversion_value / spend)::numeric, 4) ELSE NULL END,
      cpm = CASE WHEN impressions > 0 THEN ROUND((spend / impressions * 1000)::numeric, 4) ELSE NULL END
    WHERE project_id = proj1_id AND campaign_id = 'camp_nike_awareness' AND record_date = d;

    INSERT INTO analytics_records
      (project_id, campaign_id, campaign_name, record_date,
       impressions, clicks, spend, reach, conversions, conversion_value,
       ctr, cpc, cpa, roas, cpm)
    VALUES
      (proj1_id, 'camp_nike_retarget', 'Nike Summer — Retargeting', d,
       6000  + FLOOR(RANDOM() * 3000),
       300   + FLOOR(RANDOM() * 200),
       180   + ROUND((RANDOM() * 100)::numeric, 2),
       4200  + FLOOR(RANDOM() * 2100),
       15    + FLOOR(RANDOM() * 20),
       6000  + ROUND((RANDOM() * 8000)::numeric, 2),
       NULL, NULL, NULL, NULL, NULL)
    ON CONFLICT (project_id, campaign_id, record_date) DO NOTHING;

    UPDATE analytics_records
    SET
      ctr = CASE WHEN impressions > 0 THEN ROUND((clicks / impressions * 100)::numeric, 4) ELSE NULL END,
      cpc = CASE WHEN clicks > 0      THEN ROUND((spend / clicks)::numeric, 4) ELSE NULL END,
      cpa = CASE WHEN conversions > 0 THEN ROUND((spend / conversions)::numeric, 4) ELSE NULL END,
      roas= CASE WHEN spend > 0       THEN ROUND((conversion_value / spend)::numeric, 4) ELSE NULL END,
      cpm = CASE WHEN impressions > 0 THEN ROUND((spend / impressions * 1000)::numeric, 4) ELSE NULL END
    WHERE project_id = proj1_id AND campaign_id = 'camp_nike_retarget' AND record_date = d;
  END LOOP;

  -- ── 3. Analytics records — Coca-Cola Ramadan Push ─────────────────────────
  FOR d IN SELECT generate_series(
              CURRENT_DATE - INTERVAL '29 days',
              CURRENT_DATE,
              INTERVAL '1 day'
           )::DATE
  LOOP
    INSERT INTO analytics_records
      (project_id, campaign_id, campaign_name, record_date,
       impressions, clicks, spend, reach, conversions, conversion_value,
       ctr, cpc, cpa, roas, cpm)
    VALUES
      (proj2_id, 'camp_coca_engagement', 'Coca-Cola — Engagement', d,
       22000 + FLOOR(RANDOM() * 10000),
       550   + FLOOR(RANDOM() * 350),
       280   + ROUND((RANDOM() * 140)::numeric, 2),
       15400 + FLOOR(RANDOM() * 7000),
       12    + FLOOR(RANDOM() * 18),
       4800  + ROUND((RANDOM() * 7200)::numeric, 2),
       NULL, NULL, NULL, NULL, NULL)
    ON CONFLICT (project_id, campaign_id, record_date) DO NOTHING;

    UPDATE analytics_records
    SET
      ctr = CASE WHEN impressions > 0 THEN ROUND((clicks / impressions * 100)::numeric, 4) ELSE NULL END,
      cpc = CASE WHEN clicks > 0      THEN ROUND((spend / clicks)::numeric, 4) ELSE NULL END,
      cpa = CASE WHEN conversions > 0 THEN ROUND((spend / conversions)::numeric, 4) ELSE NULL END,
      roas= CASE WHEN spend > 0       THEN ROUND((conversion_value / spend)::numeric, 4) ELSE NULL END,
      cpm = CASE WHEN impressions > 0 THEN ROUND((spend / impressions * 1000)::numeric, 4) ELSE NULL END
    WHERE project_id = proj2_id AND campaign_id = 'camp_coca_engagement' AND record_date = d;
  END LOOP;

  -- ── 4. AI Insights — Nike ─────────────────────────────────────────────────
  INSERT INTO ai_insights
    (project_id, summary, insights, recommendations,
     prompt_tokens, completion_tokens, cost_usd)
  VALUES (
    proj1_id,
    'Nike Summer Campaign is performing above industry benchmarks with a blended CTR of 2.8% and ROAS of 14.2x across both active campaigns. The Retargeting campaign shows particularly strong conversion efficiency, with a CPA 32% lower than the Awareness campaign.',
    '[
      {"title": "High CTR on Retargeting", "body": "The retargeting campaign achieves a 4.7% CTR — well above the 2.1% Meta benchmark for the sportswear segment, indicating strong creative relevance to warm audiences."},
      {"title": "Weekend Spend Efficiency", "body": "Saturday and Sunday consistently produce 18% higher ROAS than weekdays. Budget distribution should reflect this pattern."},
      {"title": "Frequency Control Needed", "body": "Awareness campaign frequency has reached 4.2 in the last 7 days, approaching the 4.5 threshold where CTR typically drops by 15-20%."}
    ]',
    '[
      {"title": "Shift Budget to Retargeting", "body": "Increase retargeting daily budget by 20% (from 180 to 216 MAD/day) to capitalize on the lower CPA and higher ROAS."},
      {"title": "Refresh Awareness Creatives", "body": "With frequency reaching 4.2, introduce 2-3 new creative variants in the awareness campaign to avoid audience fatigue."},
      {"title": "Enable Weekend Budget Boost", "body": "Use Meta Ads automated rules to boost daily budgets by 15% on Saturday and Sunday when ROAS peaks are observed."}
    ]',
    1240, 680, 0.0139
  )
  RETURNING id INTO insight1;

  -- ── 5. AI Insights — Coca-Cola ────────────────────────────────────────────
  INSERT INTO ai_insights
    (project_id, summary, insights, recommendations,
     prompt_tokens, completion_tokens, cost_usd)
  VALUES (
    proj2_id,
    'Coca-Cola Ramadan Push is generating strong engagement with 27,000+ average daily impressions and a CTR of 2.5%. Conversion rates are healthy at 12-30 daily conversions with an average ROAS of 17.1x, making this one of the best-performing campaigns in the current portfolio.',
    '[
      {"title": "Strong Engagement Rate", "body": "The engagement campaign is achieving a 2.5% CTR with 550+ daily clicks on average — above the FMCG sector benchmark of 1.8%."},
      {"title": "High ROAS", "body": "Average ROAS of 17.1x is exceptional for the FMCG category. This indicates strong product-market fit and effective audience targeting."},
      {"title": "Evening Peak Hours", "body": "Analysis shows 65% of conversions occur between 7PM and 11PM, aligning with iftar viewing behavior during Ramadan."}
    ]',
    '[
      {"title": "Concentrate Delivery in Evening", "body": "Set ad scheduling to weight 60-70% of budget delivery between 7PM and 11PM to align with peak conversion windows."},
      {"title": "Expand Lookalike Audience", "body": "Create a 2% lookalike audience based on the top converters to scale reach while maintaining relevance."},
      {"title": "Add Video Format", "body": "Test a 15-second video creative alongside the current static image format to improve thumb-stop rate and potential reach."}
    ]',
    1180, 720, 0.0143
  )
  RETURNING id INTO insight2;

  -- Notify the admin about new insights
  INSERT INTO notifications (user_id, type, message, link, is_read)
    SELECT admin_id,
           'ai_insight',
           'New AI insights generated for ' || p.name,
           '/dashboard/projects/' || p.id::text,
           false
    FROM projects p
    WHERE p.id IN (proj1_id, proj2_id);

  -- ── 6. Report — Nike (ready, shared with client) ──────────────────────────
  INSERT INTO reports
    (project_id, created_by, period_start, period_end, status,
     executive_summary, performance_overview, key_insights, recommendations, conclusion,
     shared_with_client, shared_at, prompt_tokens, completion_tokens, cost_usd)
  VALUES (
    proj1_id, admin_id,
    CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE,
    'ready',
    'Nike Summer Campaign 2025 delivered exceptional results over the past 30 days, achieving a blended ROAS of 14.2x on a total spend of 15,000 MAD. Both campaigns — Awareness and Retargeting — outperformed their KPIs, with the Retargeting campaign leading in conversion efficiency.',
    'During the reporting period, the Awareness campaign reached 672,000 impressions across Morocco with an average CPM of 21.4 MAD — 18% below the sector benchmark. Click-through rates stabilized at 2.8% after a creative refresh in week 2.

The Retargeting campaign complemented the awareness funnel by converting warm audiences at a CPA of 11.6 MAD per conversion — 32% more efficient than the Awareness campaign. Weekly ROAS trends showed consistent improvement, peaking at 16.8x in week 4.

Total budget utilization reached 97.3% with zero overspend incidents, reflecting tight campaign management by the agency team.',
    '[
      {"title": "ROAS: 14.2x", "body": "Blended return on ad spend of 14.2x exceeds the client KPI of 8x by 77.5%, driven by strong retargeting performance."},
      {"title": "CTR: 2.8%", "body": "Average click-through rate of 2.8% is 33% above the Meta sportswear benchmark of 2.1%."},
      {"title": "CPA: 11.6 MAD", "body": "Cost per acquisition on the retargeting campaign at 11.6 MAD — significantly below the target CPA of 20 MAD."}
    ]',
    '[
      {"title": "Scale Retargeting Budget", "body": "Recommend increasing retargeting daily budget by 25% in the next sprint to capitalize on proven conversion efficiency."},
      {"title": "A/B Test New Creatives", "body": "Introduce 3 new awareness creative variants to combat the rising frequency (4.2x) and maintain CTR performance."},
      {"title": "Expand to Instagram Stories", "body": "Add Instagram Stories placement for the retargeting campaign — typically yields 15-20% lower CPM for warm audiences."}
    ]',
    'Nike Summer Campaign 2025 is on track to deliver outstanding results by end of campaign. With ROAS exceeding targets by over 77%, the campaign demonstrates both strategic media planning and strong creative execution. We recommend maintaining current trajectory with the budget reallocation and creative refreshes proposed above.',
    true, NOW() - INTERVAL '2 days',
    2100, 1420, 0.0248
  )
  RETURNING id INTO report1;

  -- ── 7. Report — Coca-Cola (ready, internal only) ──────────────────────────
  INSERT INTO reports
    (project_id, created_by, period_start, period_end, status,
     executive_summary, performance_overview, key_insights, recommendations, conclusion,
     shared_with_client, prompt_tokens, completion_tokens, cost_usd)
  VALUES (
    proj2_id, admin_id,
    CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE,
    'ready',
    'Coca-Cola Ramadan Push achieved a 17.1x ROAS over the reporting period, with strong engagement metrics across the primary campaign. The evening-heavy delivery strategy aligned perfectly with Ramadan iftar viewership patterns, resulting in above-average conversion rates.',
    'The Engagement campaign ran continuously throughout the period, delivering 810,000 cumulative impressions at an average CPM of 10.4 MAD — 40% below industry average due to excellent audience quality scores.

Daily click volume averaged 550+ with a CTR of 2.5%, reflecting strong creative alignment with the target audience. Conversion volume peaked on days 14-21 (Ramadan peak period), reaching 28 daily conversions at an average order value of 400 MAD.

Overall spend pacing remained within 2% of the planned daily budget, with the evening scheduling automation performing optimally.',
    '[
      {"title": "ROAS: 17.1x", "body": "Return on ad spend of 17.1x is the highest in the current portfolio, driven by precise audience targeting and iftar-hour delivery."},
      {"title": "CPM: 10.4 MAD", "body": "Exceptionally low CPM of 10.4 MAD — 40% below FMCG sector norms — indicating high audience relevance and quality scores."},
      {"title": "Peak Conversion Window", "body": "65% of conversions occur between 7PM and 11PM, validating the evening-focused scheduling strategy."}
    ]',
    '[
      {"title": "Video Creative Test", "body": "Introduce a 15-second video format in the next campaign phase. Video typically achieves 2-3x lower CPM than static images."},
      {"title": "Lookalike Expansion", "body": "Build a 2% lookalike audience from top 500 converters to scale reach while preserving conversion quality."},
      {"title": "Maintain Evening Scheduling", "body": "Continue the 7PM-11PM budget weighting for future campaigns targeting Moroccan consumers — proven effective across Ramadan."}
    ]',
    'Coca-Cola Ramadan Push is one of the strongest campaigns managed this quarter. The 17.1x ROAS and sub-11 MAD CPM position this as a benchmark case study for FMCG advertising in Morocco. Final reporting and budget reconciliation will be submitted to the client at campaign close.',
    false,
    2050, 1380, 0.0237
  )
  RETURNING id INTO report2;

  -- Notify admin about the shared report
  INSERT INTO notifications (user_id, type, message, link, is_read)
    VALUES (admin_id, 'report_shared',
            'Report for Nike Summer Campaign 2025 has been shared with the client',
            '/dashboard/reports/' || report1::text, false);

  RAISE NOTICE '✓ Sprint 3 seed complete — analytics records (60 days × 3 campaigns), 2 insights, 2 reports';

END $$;
