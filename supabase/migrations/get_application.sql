DROP FUNCTION IF EXISTS public.get_application(integer, integer, integer, integer);
DROP FUNCTION IF EXISTS public.get_application(bigint, bigint, bigint, bigint);

CREATE OR REPLACE FUNCTION public.get_application(
    q_id bigint DEFAULT NULL,
    q_user_id bigint DEFAULT NULL,
    q_company_id bigint DEFAULT NULL,
    q_job_id bigint DEFAULT NULL
)
RETURNS TABLE(
    id bigint,
    user_id bigint,
    job_id bigint,
    company_id bigint,
    full_name text,
    email text,
    phone text,
    resume_url text,
    linkedin_url text,
    portfolio_url text,
    previous_job text,
    additional_information text,
    status public.applicationstatus,
    submitted_at timestamptz,
    reviewed_at timestamptz,
    feedback text,
    cv_score float8,
    cv_matched_skills text[],
    cv_missing_requirements text[],
    cv_analysis text,
    cv_score_breakdown jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    job jsonb,
    company jsonb,
    student jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id, a.user_id, a.job_id, a.company_id, a.full_name, a.email, a.phone,
        a.resume_url, a.linkedin_url, a.portfolio_url, a.previous_job, a.additional_information,
        a.status, a.submitted_at, a.reviewed_at, a.feedback,
        a.cv_score, a.cv_matched_skills, a.cv_missing_requirements, a.cv_analysis, a.cv_score_breakdown,
        a.created_at, a.updated_at,

        jsonb_build_object(
            'id', j.id,
            'external_id', j.external_id,
            'website_url', j.website_url,
            'company_id', j.company_id,
            'title', j.title,
            'working_time', j.working_time,
            'salary_from', j.salary_from,
            'salary_to', j.salary_to,
            'salary_text', j.salary_text,
            'salary_currency', j.salary_currency,
            'job_posted_at', j.job_posted_at,
            'job_deadline', j.job_deadline,
            'apply_reasons', j.apply_reasons,
            'status', j.status,
            'quantity', j.quantity,
            'created_at', j.created_at,
            'updated_at', j.updated_at,
            'company_branches', (
                select jsonb_agg(jsonb_build_object(
                    'id', cb.id, 'name', cb.name, 'company_id', cb.company_id, 'address', cb.address,
                    'ward', case when w.id is null then null else jsonb_build_object('id', w.id, 'name', w.name) end,
                    'province', case when p.id is null then null else jsonb_build_object('id', p.id, 'name', p.name) end,
                    'country', case when ct.id is null then null else jsonb_build_object('id', ct.id, 'name', ct.name) end
                ))
                from job_company_branches jcb
                join company_branches cb on cb.id = jcb.company_branch_id
                left join wards w on w.id = cb.ward_id
                left join provinces p on p.id = cb.province_id
                left join countries ct on ct.id = cb.country_id
                where jcb.job_id = j.id
            ),
            'levels', (
                select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name))
                from job_levels jl join levels l on l.id = jl.level_id
                where jl.job_id = j.id
            ),
            'categories', (
                select jsonb_agg(jsonb_build_object('id', cat.id, 'name', cat.name))
                from job_categories jc join categories cat on cat.id = jc.category_id
                where jc.job_id = j.id
            ),
            'skills', (
                select jsonb_agg(jsonb_build_object('id', skill.id, 'name', skill.name))
                from job_skills js join skills skill on skill.id = js.skill_id
                where js.job_id = j.id
            )
        ) as job,
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'logo', c.logo
        ) as company,
        jsonb_build_object(
            'id', s.id,
            'user_id', s.user_id,
            'full_name', TRIM(u.first_name || ' ' || u.last_name),
            'avatar', u.avatar
        ) as student

    FROM applications a
    LEFT JOIN jobs j ON a.job_id = j.id
    LEFT JOIN companies c ON c.id = a.company_id  
    LEFT JOIN student s ON a.user_id = s.user_id
    LEFT JOIN users u ON a.user_id = u.user_id
    WHERE (q_id IS NULL OR a.id = q_id)
      AND (q_user_id IS NULL OR a.user_id = q_user_id)
      AND (q_company_id IS NULL OR a.company_id = q_company_id)
      AND (q_job_id IS NULL OR a.job_id = q_job_id)
    ORDER BY a.submitted_at DESC
    LIMIT 1;
END;
$$;