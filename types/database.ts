export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'editor' | 'viewer'
export type ScrapingSourceType = 'job_board' | 'podcast' | 'rss'
export type ScrapingJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rate_limited'
export type SkillCategory = 'technical' | 'soft' | 'domain' | 'tool' | 'language'
export type ContractType = 'CDI' | 'CDD' | 'Stage' | 'Alternance' | 'Freelance'
export type ExperienceBand = 'junior' | 'mid' | 'senior'
export type ProgramLevel = 'bachelor' | 'master'
export type CoverageLevel = 'introduced' | 'practiced' | 'mastered'
export type EventType = 'hackathon' | 'conference' | 'workshop' | 'meetup' | 'career_fair' | 'webinar'
export type EventStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled'
export type ReportType = 'monthly_skills' | 'salary_simulation' | 'program_alignment'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          updated_at?: string
        }
        Relationships: []
      }
      scraping_sources: {
        Row: {
          id: string
          name: string
          source_type: ScrapingSourceType
          base_url: string
          config: Json
          is_active: boolean
          last_successful_scrape_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          source_type: ScrapingSourceType
          base_url: string
          config?: Json
          is_active?: boolean
          last_successful_scrape_at?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          source_type?: ScrapingSourceType
          base_url?: string
          config?: Json
          is_active?: boolean
          last_successful_scrape_at?: string | null
        }
        Relationships: []
      }
      scraping_jobs: {
        Row: {
          id: string
          source_id: string
          status: ScrapingJobStatus
          triggered_by: 'cron' | 'manual'
          triggered_by_user: string | null
          started_at: string | null
          completed_at: string | null
          items_scraped: number
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          source_id: string
          status?: ScrapingJobStatus
          triggered_by?: 'cron' | 'manual'
          triggered_by_user?: string | null
          started_at?: string | null
          completed_at?: string | null
          items_scraped?: number
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          status?: ScrapingJobStatus
          started_at?: string | null
          completed_at?: string | null
          items_scraped?: number
          error_message?: string | null
          metadata?: Json
        }
        Relationships: []
      }
      raw_job_posts: {
        Row: {
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
        Insert: {
          id?: string
          scraping_job_id: string
          source_id: string
          external_id?: string | null
          url?: string | null
          title?: string | null
          company?: string | null
          location?: string | null
          contract_type?: string | null
          salary_raw?: string | null
          description?: string | null
          posted_at?: string | null
          scraped_at?: string
          is_processed?: boolean
        }
        Update: {
          is_processed?: boolean
          title?: string | null
          description?: string | null
        }
        Relationships: []
      }
      raw_podcast_episodes: {
        Row: {
          id: string
          scraping_job_id: string
          source_id: string
          external_id: string | null
          title: string | null
          description: string | null
          audio_url: string | null
          transcript: string | null
          published_at: string | null
          scraped_at: string
          is_processed: boolean
        }
        Insert: {
          id?: string
          scraping_job_id: string
          source_id: string
          external_id?: string | null
          title?: string | null
          description?: string | null
          audio_url?: string | null
          transcript?: string | null
          published_at?: string | null
          scraped_at?: string
          is_processed?: boolean
        }
        Update: {
          transcript?: string | null
          is_processed?: boolean
        }
        Relationships: []
      }
      skill_taxonomy: {
        Row: {
          id: string
          name: string
          category: SkillCategory
          parent_id: string | null
          aliases: string[]
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: SkillCategory
          parent_id?: string | null
          aliases?: string[]
          description?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          category?: SkillCategory
          parent_id?: string | null
          aliases?: string[]
          description?: string | null
        }
        Relationships: []
      }
      extraction_batches: {
        Row: {
          id: string
          source_type: 'job_posts' | 'podcast_episodes'
          status: 'pending' | 'running' | 'completed' | 'failed'
          total_items: number
          processed_items: number
          tokens_used: number
          cost_usd: number
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          source_type: 'job_posts' | 'podcast_episodes'
          status?: 'pending' | 'running' | 'completed' | 'failed'
          total_items?: number
          processed_items?: number
          tokens_used?: number
          cost_usd?: number
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: 'pending' | 'running' | 'completed' | 'failed'
          processed_items?: number
          tokens_used?: number
          cost_usd?: number
          error_message?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      extracted_skills: {
        Row: {
          id: string
          batch_id: string
          source_type: 'job_post' | 'podcast_episode'
          source_id: string
          skill_id: string | null
          skill_name_raw: string
          confidence: number | null
          context_snippet: string | null
          extracted_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          source_type: 'job_post' | 'podcast_episode'
          source_id: string
          skill_id?: string | null
          skill_name_raw: string
          confidence?: number | null
          context_snippet?: string | null
          extracted_at?: string
        }
        Update: {
          skill_id?: string | null
        }
        Relationships: []
      }
      skill_aggregates: {
        Row: {
          id: string
          skill_id: string
          period_year: number
          period_month: number
          mention_count: number
          job_count: number
          source_breakdown: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          skill_id: string
          period_year: number
          period_month: number
          mention_count?: number
          job_count?: number
          source_breakdown?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          mention_count?: number
          job_count?: number
          source_breakdown?: Json
          updated_at?: string
        }
        Relationships: []
      }
      salary_data_points: {
        Row: {
          id: string
          source_type: 'job_post' | 'manual' | 'public_api'
          source_id: string | null
          salary_min: number | null
          salary_max: number | null
          salary_currency: string
          salary_period: 'annual' | 'monthly' | 'daily'
          contract_type: ContractType | null
          experience_years_min: number | null
          experience_years_max: number | null
          location: string | null
          skills: string[]
          collected_at: string
        }
        Insert: {
          id?: string
          source_type: 'job_post' | 'manual' | 'public_api'
          source_id?: string | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string
          salary_period?: 'annual' | 'monthly' | 'daily'
          contract_type?: ContractType | null
          experience_years_min?: number | null
          experience_years_max?: number | null
          location?: string | null
          skills?: string[]
          collected_at?: string
        }
        Update: {
          salary_min?: number | null
          salary_max?: number | null
          skills?: string[]
        }
        Relationships: []
      }
      skill_clusters: {
        Row: {
          id: string
          name: string
          description: string | null
          skill_ids: string[]
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          skill_ids?: string[]
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          skill_ids?: string[]
          color?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_simulations: {
        Row: {
          id: string
          cluster_id: string | null
          period_year: number
          period_month: number
          contract_type: ContractType | null
          experience_band: ExperienceBand | null
          p25_salary: number | null
          p50_salary: number | null
          p75_salary: number | null
          sample_size: number
          confidence_score: number | null
          methodology_notes: string | null
          computed_at: string
        }
        Insert: {
          id?: string
          cluster_id?: string | null
          period_year: number
          period_month: number
          contract_type?: ContractType | null
          experience_band?: ExperienceBand | null
          p25_salary?: number | null
          p50_salary?: number | null
          p75_salary?: number | null
          sample_size?: number
          confidence_score?: number | null
          methodology_notes?: string | null
          computed_at?: string
        }
        Update: {
          p25_salary?: number | null
          p50_salary?: number | null
          p75_salary?: number | null
          sample_size?: number
          confidence_score?: number | null
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          id: string
          period_year: number
          period_month: number
          report_type: ReportType
          title: string
          summary_json: Json
          pdf_storage_path: string | null
          generated_by: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          period_year: number
          period_month: number
          report_type?: ReportType
          title: string
          summary_json?: Json
          pdf_storage_path?: string | null
          generated_by?: string | null
          generated_at?: string
        }
        Update: {
          title?: string
          summary_json?: Json
          pdf_storage_path?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          id: string
          name: string
          level: ProgramLevel
          duration_years: number
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          level: ProgramLevel
          duration_years: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          level?: ProgramLevel
          duration_years?: number
          description?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          id: string
          program_id: string
          number: number
          name: string | null
        }
        Insert: {
          id?: string
          program_id: string
          number: number
          name?: string | null
        }
        Update: {
          number?: number
          name?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          id: string
          semester_id: string
          name: string
          code: string | null
          credits_ects: number | null
          hours_total: number | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          semester_id: string
          name: string
          code?: string | null
          credits_ects?: number | null
          hours_total?: number | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          code?: string | null
          credits_ects?: number | null
          hours_total?: number | null
          description?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      module_skill_coverage: {
        Row: {
          id: string
          module_id: string
          skill_id: string
          coverage_level: CoverageLevel
        }
        Insert: {
          id?: string
          module_id: string
          skill_id: string
          coverage_level?: CoverageLevel
        }
        Update: {
          coverage_level?: CoverageLevel
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          event_type: EventType
          description: string | null
          scheduled_date: string | null
          target_programs: string[]
          target_skills: string[]
          status: EventStatus
          report_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          event_type: EventType
          description?: string | null
          scheduled_date?: string | null
          target_programs?: string[]
          target_skills?: string[]
          status?: EventStatus
          report_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          event_type?: EventType
          description?: string | null
          scheduled_date?: string | null
          target_programs?: string[]
          target_skills?: string[]
          status?: EventStatus
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
