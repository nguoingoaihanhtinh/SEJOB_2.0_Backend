-- Drop function cũ nếu tồn tại
DROP FUNCTION IF EXISTS get_company_statistics(BIGINT, INT);

-- Tạo function mới với parameter năm
CREATE OR REPLACE FUNCTION get_company_statistics(company_id_param BIGINT, year_param INT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  target_year INT := COALESCE(year_param, current_year);
BEGIN
  WITH all_months AS (
    -- Tạo đủ 12 tháng cho năm được chọn
    SELECT 
      target_year::TEXT AS year,
      TO_CHAR(gs, 'YYYY-MM') AS month
    FROM generate_series(
      make_date(target_year, 1, 1),
      make_date(target_year, 12, 31),
      '1 month'::interval
    ) gs
  ),
  job_stats AS (
    SELECT
      am.month,
      COUNT(j.id) AS total_jobs,
      COUNT(j.id) FILTER (WHERE j.status = 'Approved') AS active_jobs,
      COUNT(j.id) FILTER (WHERE j.status = 'Closed') AS closed_jobs
    FROM all_months am
    LEFT JOIN jobs j ON 
      TO_CHAR(j.created_at, 'YYYY-MM') = am.month
      AND j.company_id = company_id_param
      AND EXTRACT(YEAR FROM j.created_at) = target_year
    GROUP BY am.month
  ),
  application_stats AS (
    SELECT
      am.month,
      COUNT(a.id) AS total_applications,
      COUNT(a.id) FILTER (WHERE a.status IN ('Hired', 'Offered')) AS successful_applications
    FROM all_months am
    LEFT JOIN applications a ON 
      TO_CHAR(a.created_at, 'YYYY-MM') = am.month
      AND a.job_id IN (SELECT id FROM jobs WHERE company_id = company_id_param)
      AND EXTRACT(YEAR FROM a.created_at) = target_year
    GROUP BY am.month
  ),
  yearly_stats AS (
    SELECT
      EXTRACT(YEAR FROM created_at)::INT AS year,
      COUNT(*) AS total_jobs
    FROM jobs
    WHERE company_id = company_id_param
    GROUP BY year
  ),
  job_categories AS (
    SELECT
      et.name AS employment_type,
      COUNT(*) AS count
    FROM jobs j
    JOIN job_employment_types jet ON j.id = jet.job_id
    JOIN employment_types et ON jet.employment_type_id = et.id
    WHERE j.company_id = company_id_param
      AND EXTRACT(YEAR FROM j.created_at) = target_year
    GROUP BY et.name
  ),
  top_skills AS (
    SELECT
      s.name AS skill_name,
      COUNT(*) AS count
    FROM jobs j
    JOIN job_skills js ON j.id = js.job_id
    JOIN skills s ON js.skill_id = s.id
    WHERE j.company_id = company_id_param
      AND EXTRACT(YEAR FROM j.created_at) = target_year
    GROUP BY s.name
    ORDER BY count DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'selected_year', target_year,
    'available_years', (SELECT COALESCE(json_agg(year), '[]') FROM (SELECT year FROM yearly_stats ORDER BY year DESC LIMIT 5) y),
    'total_jobs', COALESCE((SELECT SUM(total_jobs) FROM job_stats), 0),
    'active_jobs', COALESCE((SELECT SUM(active_jobs) FROM job_stats), 0),
    'closed_jobs', COALESCE((SELECT SUM(closed_jobs) FROM job_stats), 0),
    'total_applications', COALESCE((SELECT SUM(total_applications) FROM application_stats), 0),
    'successful_applications', COALESCE((SELECT SUM(successful_applications) FROM application_stats), 0),
    'success_rate', CASE 
      WHEN COALESCE((SELECT SUM(total_applications) FROM application_stats), 0) > 0 
      THEN ROUND(COALESCE((SELECT SUM(successful_applications) FROM application_stats), 0)::NUMERIC / COALESCE((SELECT SUM(total_applications) FROM application_stats), 1) * 100)
      ELSE 0 
    END,
    'jobs_by_month', (
      SELECT json_object_agg(month, total_jobs)
      FROM job_stats
      ORDER BY month
    ),
    'applications_by_month', (
      SELECT json_object_agg(month, total_applications)
      FROM application_stats
      ORDER BY month
    ),
    'employment_types', (
      SELECT COALESCE(json_object_agg(employment_type, count), '{}')
      FROM job_categories
    ),
    'top_skills', (
      SELECT COALESCE(json_object_agg(skill_name, count), '{}')
      FROM top_skills
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_jobs_company_year ON jobs(company_id, EXTRACT(YEAR FROM created_at));
CREATE INDEX IF NOT EXISTS idx_applications_job_year ON applications(job_id, EXTRACT(YEAR FROM created_at));
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);