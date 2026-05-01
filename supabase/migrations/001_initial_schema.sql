-- ============================================================
-- EUGENIA ACADEMICS — Initial Schema Migration
-- Version: 001
-- Description: Full schema for market intelligence + program management
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy skill name matching

-- ============================================================
-- AUTH & PROFILES
-- ============================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Extended user profiles linked to Supabase Auth';

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SCRAPING MODULE
-- ============================================================

CREATE TABLE public.scraping_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('job_board', 'podcast', 'rss')),
  base_url    TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_successful_scrape_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.scraping_sources.config IS 'Source-specific config: Apify actor ID, CSS selectors, RSS URL, etc.';

CREATE TABLE public.scraping_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID NOT NULL REFERENCES public.scraping_sources(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rate_limited')),
  triggered_by    TEXT NOT NULL DEFAULT 'cron'
                  CHECK (triggered_by IN ('cron', 'manual')),
  triggered_by_user UUID REFERENCES public.profiles(id),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  items_scraped   INT DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.scraping_jobs.metadata IS 'Apify run ID, pagination cursor, etc.';

CREATE TABLE public.raw_job_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraping_job_id UUID NOT NULL REFERENCES public.scraping_jobs(id) ON DELETE CASCADE,
  source_id       UUID NOT NULL REFERENCES public.scraping_sources(id) ON DELETE CASCADE,
  external_id     TEXT,
  url             TEXT,
  title           TEXT,
  company         TEXT,
  location        TEXT,
  contract_type   TEXT,
  salary_raw      TEXT,
  description     TEXT,
  posted_at       TIMESTAMPTZ,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_processed    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(source_id, external_id)
);

COMMENT ON COLUMN public.raw_job_posts.salary_raw IS 'Raw salary string as found on the source (e.g. "45k-55k€ brut annuel")';

CREATE TABLE public.raw_podcast_episodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraping_job_id UUID NOT NULL REFERENCES public.scraping_jobs(id) ON DELETE CASCADE,
  source_id       UUID NOT NULL REFERENCES public.scraping_sources(id) ON DELETE CASCADE,
  external_id     TEXT,
  title           TEXT,
  description     TEXT,
  audio_url       TEXT,
  transcript      TEXT,
  published_at    TIMESTAMPTZ,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_processed    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(source_id, external_id)
);

-- ============================================================
-- SKILLS ANALYSIS MODULE
-- ============================================================

CREATE TABLE public.skill_taxonomy (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL CHECK (category IN ('technical', 'soft', 'domain', 'tool', 'language')),
  parent_id   UUID REFERENCES public.skill_taxonomy(id),
  aliases     TEXT[] DEFAULT '{}',
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.skill_taxonomy IS 'Normalized skill reference. Parent/child for clustering (e.g. Cloud > AWS, GCP)';
COMMENT ON COLUMN public.skill_taxonomy.aliases IS 'Alternative names for fuzzy matching (e.g. ["py", "python3"] for Python)';

CREATE TABLE public.extraction_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type     TEXT NOT NULL CHECK (source_type IN ('job_posts', 'podcast_episodes')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_items     INT DEFAULT 0,
  processed_items INT DEFAULT 0,
  tokens_used     INT DEFAULT 0,
  cost_usd        NUMERIC(10, 4) DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE public.extracted_skills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES public.extraction_batches(id) ON DELETE CASCADE,
  source_type     TEXT NOT NULL CHECK (source_type IN ('job_post', 'podcast_episode')),
  source_id       UUID NOT NULL,
  skill_id        UUID REFERENCES public.skill_taxonomy(id),
  skill_name_raw  TEXT NOT NULL,
  confidence      NUMERIC(4, 3) CHECK (confidence BETWEEN 0 AND 1),
  context_snippet TEXT,
  extracted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.extracted_skills.skill_id IS 'NULL if skill_name_raw could not be matched to taxonomy';
COMMENT ON COLUMN public.extracted_skills.context_snippet IS 'Surrounding text for audit/review';

CREATE TABLE public.skill_aggregates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id         UUID NOT NULL REFERENCES public.skill_taxonomy(id) ON DELETE CASCADE,
  period_year      INT NOT NULL,
  period_month     INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  mention_count    INT NOT NULL DEFAULT 0,
  job_count        INT NOT NULL DEFAULT 0,
  source_breakdown JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(skill_id, period_year, period_month)
);

COMMENT ON COLUMN public.skill_aggregates.source_breakdown IS '{"linkedin": 10, "indeed": 5, "wttj": 3, "podcast": 2}';

CREATE TRIGGER skill_aggregates_updated_at
  BEFORE UPDATE ON public.skill_aggregates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SALARY SIMULATION MODULE
-- ============================================================

CREATE TABLE public.salary_data_points (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type         TEXT NOT NULL CHECK (source_type IN ('job_post', 'manual', 'public_api')),
  source_id           UUID,
  salary_min          NUMERIC(10, 2),
  salary_max          NUMERIC(10, 2),
  salary_currency     TEXT NOT NULL DEFAULT 'EUR',
  salary_period       TEXT NOT NULL DEFAULT 'annual'
                      CHECK (salary_period IN ('annual', 'monthly', 'daily')),
  contract_type       TEXT CHECK (contract_type IN ('CDI', 'CDD', 'Stage', 'Alternance', 'Freelance')),
  experience_years_min INT,
  experience_years_max INT,
  location            TEXT,
  skills              TEXT[] DEFAULT '{}',
  collected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.skill_clusters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  skill_ids   UUID[] NOT NULL DEFAULT '{}',
  color       TEXT DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.skill_clusters.skill_ids IS 'Array of skill_taxonomy.id that define this cluster';
COMMENT ON COLUMN public.skill_clusters.color IS 'Hex color for UI display';

CREATE TRIGGER skill_clusters_updated_at
  BEFORE UPDATE ON public.skill_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.salary_simulations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id        UUID REFERENCES public.skill_clusters(id) ON DELETE SET NULL,
  period_year       INT NOT NULL,
  period_month      INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  contract_type     TEXT CHECK (contract_type IN ('CDI', 'CDD', 'Stage', 'Alternance', 'Freelance')),
  experience_band   TEXT CHECK (experience_band IN ('junior', 'mid', 'senior')),
  p25_salary        NUMERIC(10, 2),
  p50_salary        NUMERIC(10, 2),
  p75_salary        NUMERIC(10, 2),
  sample_size       INT DEFAULT 0,
  confidence_score  NUMERIC(4, 3) CHECK (confidence_score BETWEEN 0 AND 1),
  methodology_notes TEXT,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cluster_id, period_year, period_month, contract_type, experience_band)
);

COMMENT ON COLUMN public.salary_simulations.confidence_score IS 'MIN(1.0, sample_size / 30). < 0.5 = low confidence, shown with warning';

-- ============================================================
-- REPORTS MODULE
-- ============================================================

CREATE TABLE public.monthly_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year      INT NOT NULL,
  period_month     INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  report_type      TEXT NOT NULL DEFAULT 'monthly_skills'
                   CHECK (report_type IN ('monthly_skills', 'salary_simulation', 'program_alignment')),
  title            TEXT NOT NULL,
  summary_json     JSONB NOT NULL DEFAULT '{}',
  pdf_storage_path TEXT,
  generated_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_year, period_month, report_type)
);

COMMENT ON COLUMN public.monthly_reports.summary_json IS 'Structured data powering the dashboard view (top skills, salary ranges, recommendations)';
COMMENT ON COLUMN public.monthly_reports.pdf_storage_path IS 'Supabase Storage path: reports/{year}/{month}/monthly_report.pdf';

-- ============================================================
-- PROGRAMS MODULE
-- ============================================================

CREATE TABLE public.programs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  level          TEXT NOT NULL CHECK (level IN ('bachelor', 'master')),
  duration_years INT NOT NULL CHECK (duration_years BETWEEN 1 AND 5),
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.semesters (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  number     INT NOT NULL CHECK (number BETWEEN 1 AND 10),
  name       TEXT,
  UNIQUE(program_id, number)
);

CREATE TABLE public.modules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id   UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT,
  credits_ects  INT CHECK (credits_ects BETWEEN 1 AND 30),
  hours_total   INT,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.module_skill_coverage (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id      UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  skill_id       UUID NOT NULL REFERENCES public.skill_taxonomy(id) ON DELETE CASCADE,
  coverage_level TEXT NOT NULL DEFAULT 'introduced'
                 CHECK (coverage_level IN ('introduced', 'practiced', 'mastered')),
  UNIQUE(module_id, skill_id)
);

COMMENT ON COLUMN public.module_skill_coverage.coverage_level IS 'introduced=awareness, practiced=applied in projects, mastered=expert level';

-- ============================================================
-- EVENTS MODULE
-- ============================================================

CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  event_type      TEXT NOT NULL
                  CHECK (event_type IN ('hackathon', 'conference', 'workshop', 'meetup', 'career_fair', 'webinar')),
  description     TEXT,
  scheduled_date  DATE,
  target_programs UUID[] DEFAULT '{}',
  target_skills   UUID[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
  report_id       UUID REFERENCES public.monthly_reports(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.events.target_skills IS 'Skills this event aims to address (from gap analysis)';
COMMENT ON COLUMN public.events.report_id IS 'Report that triggered this event suggestion';

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Scraping
CREATE INDEX idx_scraping_jobs_status       ON public.scraping_jobs(status, created_at DESC);
CREATE INDEX idx_scraping_jobs_source       ON public.scraping_jobs(source_id, created_at DESC);
CREATE INDEX idx_raw_job_posts_unprocessed  ON public.raw_job_posts(is_processed, scraped_at) WHERE is_processed = FALSE;
CREATE INDEX idx_raw_job_posts_source       ON public.raw_job_posts(source_id, scraped_at DESC);
CREATE INDEX idx_raw_episodes_unprocessed   ON public.raw_podcast_episodes(is_processed, scraped_at) WHERE is_processed = FALSE;

-- Skills
CREATE INDEX idx_extracted_skills_source    ON public.extracted_skills(source_type, source_id);
CREATE INDEX idx_extracted_skills_skill     ON public.extracted_skills(skill_id, extracted_at DESC);
CREATE INDEX idx_skill_aggregates_period    ON public.skill_aggregates(period_year, period_month);
CREATE INDEX idx_skill_aggregates_skill     ON public.skill_aggregates(skill_id, period_year DESC, period_month DESC);
CREATE INDEX idx_skill_taxonomy_name        ON public.skill_taxonomy USING gin(name gin_trgm_ops);

-- Salary
CREATE INDEX idx_salary_data_contract       ON public.salary_data_points(contract_type, collected_at DESC);
CREATE INDEX idx_salary_simulations_period  ON public.salary_simulations(period_year, period_month);

-- Programs
CREATE INDEX idx_modules_semester           ON public.modules(semester_id);
CREATE INDEX idx_module_skill_coverage_skill ON public.module_skill_coverage(skill_id);

-- Reports
CREATE INDEX idx_monthly_reports_period     ON public.monthly_reports(period_year, period_month);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_job_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_taxonomy      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_batches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_skills    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_aggregates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_data_points  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_clusters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_simulations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_skill_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── PROFILES ──
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role() = 'admin');

-- ── READ-ONLY FOR ALL AUTHENTICATED USERS (viewer+) ──
CREATE POLICY "Authenticated read scraping_sources"
  ON public.scraping_sources FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read scraping_jobs"
  ON public.scraping_jobs FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read raw_job_posts"
  ON public.raw_job_posts FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read raw_podcast_episodes"
  ON public.raw_podcast_episodes FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read skill_taxonomy"
  ON public.skill_taxonomy FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read extraction_batches"
  ON public.extraction_batches FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read extracted_skills"
  ON public.extracted_skills FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read skill_aggregates"
  ON public.skill_aggregates FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read salary_data_points"
  ON public.salary_data_points FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read skill_clusters"
  ON public.skill_clusters FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read salary_simulations"
  ON public.salary_simulations FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read monthly_reports"
  ON public.monthly_reports FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read programs"
  ON public.programs FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read semesters"
  ON public.semesters FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read modules"
  ON public.modules FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read module_skill_coverage"
  ON public.module_skill_coverage FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read events"
  ON public.events FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── WRITE POLICIES — editors and admins only ──
CREATE POLICY "Editors can manage scraping_sources"
  ON public.scraping_sources FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage scraping_jobs"
  ON public.scraping_jobs FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can insert raw_job_posts"
  ON public.raw_job_posts FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can update raw_job_posts"
  ON public.raw_job_posts FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can insert raw_podcast_episodes"
  ON public.raw_podcast_episodes FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage skill_taxonomy"
  ON public.skill_taxonomy FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can manage extraction_batches"
  ON public.extraction_batches FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can insert extracted_skills"
  ON public.extracted_skills FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can upsert skill_aggregates"
  ON public.skill_aggregates FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage salary_data_points"
  ON public.salary_data_points FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage skill_clusters"
  ON public.skill_clusters FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can manage salary_simulations"
  ON public.salary_simulations FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "System can manage monthly_reports"
  ON public.monthly_reports FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage programs"
  ON public.programs FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage semesters"
  ON public.semesters FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage modules"
  ON public.modules FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage module_skill_coverage"
  ON public.module_skill_coverage FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));

CREATE POLICY "Editors can manage events"
  ON public.events FOR ALL
  USING (public.get_user_role() IN ('admin', 'editor'));
