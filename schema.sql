
-- Drop table
-- DROP TABLE IF EXISTS job CASCADE; 
-- DROP TABLE IF EXISTS job_media CASCADE;
-- DROP TABLE IF EXISTS jobs CASCADE;

-- DROP TABLE IF EXISTS job_categories CASCADE;
-- DROP TABLE IF EXISTS job_required_skills CASCADE;
-- DROP TABLE IF EXISTS job_employment_types CASCADE;
-- DROP TABLE IF EXISTS job_levels_jobs CASCADE;
CREATE TABLE users (
  user_id bigserial PRIMARY KEY,
  avatar text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL, 
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE countries (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE provinces (
  id bigserial PRIMARY KEY,
  country_id bigint REFERENCES countries(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE districts (
  id bigserial PRIMARY KEY,
  province_id bigint REFERENCES provinces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE company_types (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE companies (
  id bigserial PRIMARY KEY,
  external_id bigint,
  name text NOT NULL,
  tech_stack text[],
  logo text,
  background text,
  description text,
  phone text,
  email text,
  is_verified boolean,
  website_url text,
  socials jsonb,
  images text[],
  company_type_id bigint REFERENCES company_types(id) ON DELETE SET NULL,
  employee_count numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE company_branches (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  company_id bigint REFERENCES companies(id) ON DELETE CASCADE,
  country_id bigint REFERENCES countries(id) ON DELETE SET NULL,
  province_id bigint REFERENCES provinces(id) ON DELETE SET NULL,
  district_id bigint REFERENCES districts(id) ON DELETE SET NULL,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


CREATE TABLE levels (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE skills (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE skill_mappings (
  id bigserial PRIMARY KEY,
  skill_name text NOT NULL UNIQUE,          
  category text,                              
  synonyms text[] DEFAULT '{}',             
  related_skills text[] DEFAULT '{}',       
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


CREATE INDEX idx_skill_mappings_category ON skill_mappings(category);
CREATE INDEX idx_skill_mappings_synonyms ON skill_mappings USING GIN(synonyms);
CREATE INDEX idx_skill_mappings_related ON skill_mappings USING GIN(related_skills);

CREATE TABLE employment_types (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE categories (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);



CREATE TYPE JobStatus AS ENUM ('Pending', 'Approved', 'Rejected', 'Closed');

CREATE TABLE jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id BIGINT UNIQUE, 
  website_url TEXT, 
  company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL, 
  company_branches_id BIGINT REFERENCES company_branches(id) ON DELETE SET NULL, --Location based on Company's branches
  title TEXT NOT NULL,
  responsibilities TEXT[],
  requirement TEXT[],
  nice_to_haves TEXT[],
  benefit JSONB,
  working_time TEXT, 
  description TEXT, -- Only Description, 
  apply_guide TEXT, 
  is_diamond BOOLEAN DEFAULT FALSE, 
  is_job_flash_active BOOLEAN DEFAULT FALSE, 
  is_hot BOOLEAN DEFAULT FALSE, 
  salary_from NUMERIC, 
  salary_to NUMERIC, 
  salary_text TEXT, 
  salary_currency TEXT, 
  job_posted_at DATE, 
  job_deadline DATE, 
  apply_reasons TEXT[],
  -- Category && Required_Skill && Job_Level && Employment_Type sẽ dựa các bảng liên quan
  status TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW(), 
  updated_at TIMESTAMPTZ DEFAULT NOW() 
);


-- ALTER TABLE Application DROP CONSTRAINT IF EXISTS application_jobid_fkey;
-- ALTER TABLE Application ADD CONSTRAINT application_jobid_fkey FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE;


CREATE TABLE job_media (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE, 
  type TEXT,
  link TEXT
);

CREATE TABLE job_categories (
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, category_id)
);

CREATE TABLE job_skills (
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE job_employment_types (
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employment_type_id BIGINT NOT NULL REFERENCES employment_types(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, employment_type_id)
);

CREATE TABLE job_levels (
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  level_id BIGINT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, level_id)
);

-- Project Table
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES student(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_working_on BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  description TEXT,
  website_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certification Table
CREATE TABLE certifications (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES student(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  issue_date DATE,
  certification_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

