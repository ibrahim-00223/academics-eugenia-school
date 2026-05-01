-- ============================================================
-- EUGENIA ACADEMICS — Seed Data
-- Skill taxonomy (~80 skills to start) + scraping sources
-- ============================================================

-- ============================================================
-- SCRAPING SOURCES
-- ============================================================

INSERT INTO public.scraping_sources (name, source_type, base_url, config) VALUES
(
  'linkedin',
  'job_board',
  'https://www.linkedin.com/jobs',
  '{
    "apify_actor_id": "curious_coder/linkedin-jobs-scraper",
    "default_search_urls": [
      "https://www.linkedin.com/jobs/search/?keywords=développeur&location=France&f_TPR=r604800",
      "https://www.linkedin.com/jobs/search/?keywords=data+scientist&location=France&f_TPR=r604800",
      "https://www.linkedin.com/jobs/search/?keywords=product+manager&location=France&f_TPR=r604800",
      "https://www.linkedin.com/jobs/search/?keywords=devops&location=France&f_TPR=r604800",
      "https://www.linkedin.com/jobs/search/?keywords=UX+designer&location=France&f_TPR=r604800"
    ],
    "max_items_per_run": 200
  }'::jsonb
),
(
  'indeed',
  'job_board',
  'https://fr.indeed.com',
  '{
    "search_queries": ["développeur", "data scientist", "product manager", "devops", "fullstack"],
    "location": "France",
    "max_pages": 5,
    "delay_ms": 6000
  }'::jsonb
),
(
  'welcome_to_the_jungle',
  'job_board',
  'https://www.welcometothejungle.com',
  '{
    "search_queries": ["développeur", "data", "product", "devops"],
    "max_pages": 5,
    "delay_ms": 4000
  }'::jsonb
),
(
  'podcast_ifttd',
  'podcast',
  'https://www.ifttd.io',
  '{
    "rss_url": "https://feeds.buzzsprout.com/1153415.rss",
    "description": "If This Then Dev — podcast français tech"
  }'::jsonb
),
(
  'podcast_artisan_dev',
  'podcast',
  'https://compagnon.artisandeveloppeur.fr',
  '{
    "rss_url": "https://feeds.soundcloud.com/stream/artisan-developpeur.rss",
    "description": "L art du développement logiciel"
  }'::jsonb
),
(
  'podcast_capture_the_flag',
  'podcast',
  'https://www.nolimitsecu.fr',
  '{
    "rss_url": "https://www.nolimitsecu.fr/feed/podcast/",
    "description": "Podcast cybersécurité francophone"
  }'::jsonb
);

-- ============================================================
-- SKILL TAXONOMY — Languages
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('Python',        'language', ARRAY['python3', 'python 3', 'py']),
('JavaScript',    'language', ARRAY['js', 'javascript es6', 'vanilla js']),
('TypeScript',    'language', ARRAY['ts', 'typescript']),
('Java',          'language', ARRAY['java 17', 'java 11', 'jvm']),
('Go',            'language', ARRAY['golang', 'go lang']),
('Rust',          'language', ARRAY['rust lang']),
('C++',           'language', ARRAY['cpp', 'c plus plus']),
('PHP',           'language', ARRAY['php8', 'php 8']),
('Ruby',          'language', ARRAY['ruby on rails', 'rails']),
('Scala',         'language', ARRAY['scala 3']),
('Kotlin',        'language', ARRAY['kotlin multiplatform']),
('Swift',         'language', ARRAY['swiftui']),
('SQL',           'language', ARRAY['pl/sql', 'tsql', 't-sql']),
('R',             'language', ARRAY['r programming', 'rstudio']),
('Bash',          'language', ARRAY['shell', 'bash scripting', 'zsh']);

-- ============================================================
-- SKILL TAXONOMY — Frontend
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('React',         'technical', ARRAY['react.js', 'reactjs', 'react hooks']),
('Next.js',       'technical', ARRAY['nextjs', 'next js']),
('Vue.js',        'technical', ARRAY['vue', 'vuejs', 'vue 3']),
('Angular',       'technical', ARRAY['angular 17', 'angularjs']),
('Svelte',        'technical', ARRAY['sveltekit']),
('Tailwind CSS',  'technical', ARRAY['tailwind', 'tailwindcss']),
('GraphQL',       'technical', ARRAY['gql', 'apollo graphql']),
('React Native',  'technical', ARRAY['react-native']),
('Flutter',       'technical', ARRAY['flutter dart']);

-- ============================================================
-- SKILL TAXONOMY — Backend & APIs
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('Node.js',       'technical', ARRAY['nodejs', 'node']),
('FastAPI',       'technical', ARRAY['fast api']),
('Django',        'technical', ARRAY['django rest framework', 'drf']),
('Flask',         'technical', ARRAY['flask api']),
('Spring Boot',   'technical', ARRAY['spring', 'spring framework']),
('NestJS',        'technical', ARRAY['nest.js']),
('REST API',      'technical', ARRAY['restful api', 'rest', 'api rest']),
('Microservices', 'technical', ARRAY['micro services', 'micro-services']),
('gRPC',          'technical', ARRAY['grpc']),
('WebSockets',    'technical', ARRAY['websocket', 'ws']);

-- ============================================================
-- SKILL TAXONOMY — Data & IA
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('Machine Learning',    'technical', ARRAY['ml', 'apprentissage automatique']),
('Deep Learning',       'technical', ARRAY['dl', 'réseau de neurones']),
('Data Science',        'technical', ARRAY['data scientist', 'science des données']),
('Data Engineering',    'technical', ARRAY['data engineer', 'ingénierie des données']),
('LLM',                 'technical', ARRAY['large language model', 'gpt', 'llm fine-tuning']),
('RAG',                 'technical', ARRAY['retrieval augmented generation', 'rag pipeline']),
('NLP',                 'technical', ARRAY['natural language processing', 'traitement du langage']),
('Computer Vision',     'technical', ARRAY['cv', 'vision par ordinateur']),
('PyTorch',             'tool',      ARRAY['pytorch']),
('TensorFlow',          'tool',      ARRAY['tensorflow 2', 'tf']),
('Pandas',              'tool',      ARRAY['pandas dataframe']),
('NumPy',               'tool',      ARRAY['numpy']),
('Scikit-learn',        'tool',      ARRAY['sklearn', 'scikit learn']),
('Apache Spark',        'tool',      ARRAY['spark', 'pyspark']),
('dbt',                 'tool',      ARRAY['data build tool']),
('Apache Airflow',      'tool',      ARRAY['airflow']),
('Power BI',            'tool',      ARRAY['powerbi', 'power bi']),
('Tableau',             'tool',      ARRAY['tableau software']),
('Looker',              'tool',      ARRAY['looker studio', 'google looker']);

-- ============================================================
-- SKILL TAXONOMY — Cloud & Infrastructure
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('AWS',           'technical', ARRAY['amazon web services', 'aws cloud']),
('GCP',           'technical', ARRAY['google cloud', 'google cloud platform']),
('Azure',         'technical', ARRAY['microsoft azure', 'azure cloud']),
('Docker',        'tool',      ARRAY['dockerfile', 'docker compose']),
('Kubernetes',    'tool',      ARRAY['k8s', 'kubectl', 'k3s']),
('Terraform',     'tool',      ARRAY['terraform iac', 'infrastructure as code']),
('CI/CD',         'technical', ARRAY['continuous integration', 'devops pipeline', 'github actions', 'gitlab ci']),
('Linux',         'technical', ARRAY['linux server', 'ubuntu', 'debian']),
('Nginx',         'tool',      ARRAY['nginx server']),
('Redis',         'tool',      ARRAY['redis cache']);

-- ============================================================
-- SKILL TAXONOMY — Databases
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('PostgreSQL',    'tool',      ARRAY['postgres', 'pg']),
('MySQL',         'tool',      ARRAY['mysql 8']),
('MongoDB',       'tool',      ARRAY['mongo', 'mongodb atlas']),
('Elasticsearch', 'tool',      ARRAY['elastic search', 'opensearch']),
('Supabase',      'tool',      ARRAY['supabase db']),
('Snowflake',     'tool',      ARRAY['snowflake dw']),
('BigQuery',      'tool',      ARRAY['google bigquery', 'bq']);

-- ============================================================
-- SKILL TAXONOMY — Security
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('Cybersécurité', 'domain',    ARRAY['cybersecurity', 'sécurité informatique', 'infosec']),
('OAuth / OIDC',  'technical', ARRAY['oauth2', 'openid connect', 'jwt']),
('OWASP',         'technical', ARRAY['owasp top 10']),
('Pentest',       'technical', ARRAY['penetration testing', 'test d intrusion']);

-- ============================================================
-- SKILL TAXONOMY — Product & Management
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('Product Management',  'domain', ARRAY['gestion de produit', 'product manager', 'pm']),
('Agile / Scrum',       'domain', ARRAY['scrum', 'agile', 'sprint planning', 'kanban']),
('UX/UI Design',        'domain', ARRAY['ux design', 'ui design', 'user experience']),
('Figma',               'tool',   ARRAY['figma design']),
('Gestion de projet',   'domain', ARRAY['project management', 'pmp', 'chef de projet']);

-- ============================================================
-- SKILL TAXONOMY — Soft Skills
-- ============================================================

INSERT INTO public.skill_taxonomy (name, category, aliases) VALUES
('Communication',       'soft', ARRAY['communication orale', 'prise de parole']),
('Leadership',          'soft', ARRAY['management d équipe', 'team leadership']),
('Résolution de problèmes', 'soft', ARRAY['problem solving', 'pensée analytique']),
('Travail en équipe',   'soft', ARRAY['teamwork', 'collaboration']),
('Autonomie',           'soft', ARRAY['initiative', 'proactivité']),
('Adaptabilité',        'soft', ARRAY['flexibilité', 'résilience']);

-- ============================================================
-- SKILL CLUSTERS — Initial Clusters
-- ============================================================

INSERT INTO public.skill_clusters (name, description, color) VALUES
('Développement Web Fullstack', 'Compétences front + back pour le dev web moderne', '#3b82f6'),
('Data Science & ML',           'Analyse de données, machine learning, modélisation', '#8b5cf6'),
('DevOps & Cloud',              'Infrastructure, CI/CD, conteneurisation, cloud', '#10b981'),
('Cybersécurité',               'Sécurité des systèmes, audit, conformité', '#ef4444'),
('Product & Design',            'Product management, UX/UI, Agile', '#f59e0b'),
('Data Engineering',            'Pipelines de données, ETL, orchestration', '#06b6d4'),
('IA Générative & LLM',         'LLM, RAG, fine-tuning, agents IA', '#a855f7'),
('Développement Mobile',        'Applications iOS, Android, cross-platform', '#ec4899');
