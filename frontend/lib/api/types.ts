// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
}

// ── Scraping ──────────────────────────────────────────────────────────────────
export interface ScrapingSource {
  id: string
  name: string
  source_type: 'job_board' | 'podcast' | 'rss'
  base_url: string
  config: Record<string, unknown>
  is_active: boolean
  last_successful_scrape_at: string | null
  created_at: string
}

export interface ScrapingJob {
  id: string
  source_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rate_limited'
  triggered_by: 'cron' | 'manual'
  started_at: string | null
  completed_at: string | null
  items_scraped: number
  error_message: string | null
  created_at: string
}

export interface RawJobPost {
  id: string
  scraping_job_id: string
  source_id: string
  external_id: string | null
  url: string | null
  title: string | null
  company: string | null
  location: string | null
  contract_type: string | null
  salary_raw: string | null
  description: string | null
  posted_at: string | null
  scraped_at: string
  is_processed: boolean
}

// ── Skills ────────────────────────────────────────────────────────────────────
export interface SkillTaxonomy {
  id: string
  name: string
  category: 'technical' | 'soft' | 'domain'
  parent_id: string | null
  aliases: string[]
  is_active: boolean
}

export interface SkillAggregate {
  skill_id: string
  skill_name: string
  category: string
  mention_count: number
  job_count: number
  period_year: number
  period_month: number
}

export interface ExtractionBatch {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  source_type: 'job_post' | 'podcast'
  total_items: number
  processed_items: number
  tokens_used: number
  cost_usd: number
  started_at: string | null
  completed_at: string | null
}

// ── Salary ────────────────────────────────────────────────────────────────────
export interface SkillCluster {
  id: string
  name: string
  description: string | null
  skill_ids: string[]
  is_active: boolean
}

export interface SalarySimulation {
  id: string
  cluster_id: string
  period_year: number
  period_month: number
  contract_type: string | null
  experience_band: string | null
  p25_salary: number | null
  p50_salary: number | null
  p75_salary: number | null
  sample_size: number
  confidence_score: number
  ai_narrative: string | null
  computed_at: string
}

// ── Programs ──────────────────────────────────────────────────────────────────
export interface Program {
  id: string
  name: string
  level: 'bachelor' | 'master'
  duration_years: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Semester {
  id: string
  program_id: string
  number: number
  created_at: string
}

export interface Module {
  id: string
  semester_id: string
  name: string
  code: string | null
  credits_ects: number | null
  hours_total: number | null
  description: string | null
}

// ── Events ────────────────────────────────────────────────────────────────────
export interface Event {
  id: string
  title: string
  description: string | null
  event_type: 'hackathon' | 'conference' | 'workshop' | 'webinar' | 'guest_lecture' | 'other'
  status: 'suggested' | 'planned' | 'confirmed' | 'completed' | 'cancelled'
  scheduled_date: string | null
  target_skills: string[]
  report_id: string | null
  created_by: string | null
  created_at: string
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface MonthlyReport {
  id: string
  period_year: number
  period_month: number
  report_type: 'monthly' | 'quarterly' | 'annual'
  status: 'generating' | 'ready' | 'failed'
  summary_json: Record<string, unknown>
  pdf_storage_path: string | null
  generated_at: string | null
  created_at: string
}

// ── API error ────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string
}
