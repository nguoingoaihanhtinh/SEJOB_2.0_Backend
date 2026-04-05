drop function if exists public.search_job(
  text, integer, integer[], integer[], integer[], integer[],
  integer[], numeric, numeric, text, text, integer, integer, public.jobstatus[],
  bigint[]
);

create function public.search_job(
  q_keyword text default null,
  q_company_id integer default null,
  q_province_ids integer[] default null,
  q_level_ids integer[] default null,
  q_category_ids integer[] default null,
  q_skill_ids integer[] default null,
  q_employment_type_ids integer[] default null,
  q_salary_from numeric default null,
  q_salary_to numeric default null,
  q_sort_by text default 'created_at',
  q_sort_dir text default 'desc',
  q_page integer default 1,
  q_limit integer default 10,
  q_statuses public.jobstatus[] default null,
  q_job_ids bigint[] default null
)
returns table (
  id bigint,
  external_id bigint,
  website_url text,
  company_id bigint,
  title text,

  responsibilities text[],
  requirement text[],
  nice_to_haves text[],
  benefit jsonb,
  working_time text,
  description text,
  apply_guide text,

  is_diamond boolean,
  is_job_flash_active boolean,
  is_hot boolean,

  salary_from numeric,
  salary_to numeric,
  salary_text text,
  salary_currency text,

  job_posted_at date,
  job_deadline date,

  apply_reasons text[],
  status public.jobstatus,

  created_at timestamptz,
  updated_at timestamptz,
  quantity bigint,

  total bigint,
  company jsonb,
  company_branches jsonb,
  levels jsonb,
  categories jsonb,
  skills jsonb,
  employment_types jsonb
)
language sql
security definer
as $$
  select
    j.id,
    j.external_id,
    j.website_url,
    j.company_id,
    j.title,

    j.responsibilities,
    j.requirement,
    j.nice_to_haves,
    j.benefit,
    j.working_time,
    j.description,
    j.apply_guide,

    j.is_diamond,
    j.is_job_flash_active,
    j.is_hot,

    j.salary_from,
    j.salary_to,
    j.salary_text,
    j.salary_currency,

    j.job_posted_at,
    j.job_deadline,

    j.apply_reasons,
    j.status,

    j.created_at,
    j.updated_at,
    j.quantity,

    count(*) over() as total,

    jsonb_build_object(
      'id', cp.id,
      'external_id', cp.external_id,
      'name', cp.name,
      'tech_stack', cp.tech_stack,
      'logo', cp.logo,
      'background', cp.background,
      'description', cp.description,
      'phone', cp.phone,
      'email', cp.email,
      'is_verified', cp.is_verified,
      'website_url', cp.website_url,
      'socials', cp.socials,
      'images', cp.images,
      'employee_count', cp.employee_count,
      'created_at', cp.created_at,
      'updated_at', cp.updated_at,
      'user_id', cp.user_id
    ) as company,

    (
      select jsonb_agg(
        jsonb_build_object(
          'id', cb.id,
          'name', cb.name,
          'company_id', cb.company_id,
          'address', cb.address,

          'ward', case
            when w.id is null then null
            else jsonb_build_object(
              'id', w.id,
              'name', w.name
            )
          end,

          'province', case
            when p.id is null then null
            else jsonb_build_object(
              'id', p.id,
              'name', p.name
            )
          end,

          'country', case
            when c.id is null then null
            else jsonb_build_object(
              'id', c.id,
              'name', c.name
            )
          end
        )
      )
      from job_company_branches jcb
      join company_branches cb on cb.id = jcb.company_branch_id
      left join wards w on w.id = cb.ward_id
      left join provinces p on p.id = cb.province_id
      left join countries c on c.id = cb.country_id
      where jcb.job_id = j.id
    ) as company_branches,

    (
      select jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'name', l.name
        )
      )
      from job_levels jl
      join levels l on l.id = jl.level_id
      where jl.job_id = j.id
    ) as levels,

    (
      select jsonb_agg(
        jsonb_build_object(
          'id', category.id,
          'name', category.name
        )
      )
      from job_categories jc
      join categories category on category.id = jc.category_id
      where jc.job_id = j.id
    ) as categories,

    (
      select jsonb_agg(
        jsonb_build_object(
          'id', skill.id,
          'name', skill.name
        )
      )
      from job_skills js
      join skills skill on skill.id = js.skill_id
      where js.job_id = j.id
    ) as skills,

    (
      select jsonb_agg(
        jsonb_build_object(
          'id', employment_type.id,
          'name', employment_type.name
        )
      )
      from job_employment_types je
      join employment_types employment_type
        on employment_type.id = je.employment_type_id
      where je.job_id = j.id
    ) as employment_types
  from jobs j
  left join companies cp on cp.id = j.company_id
  where
    (q_company_id is null or j.company_id = q_company_id)
    and (
      q_keyword is null
      OR LOWER(j.title) LIKE CONCAT('%', LOWER(TRIM(q_keyword)), '%')
      OR LOWER(cp.name) LIKE CONCAT('%', LOWER(TRIM(q_keyword)), '%')
    )
    and (
      q_province_ids is null
      or exists (
        select 1
        from job_company_branches jcb
        join company_branches cb on cb.id = jcb.company_branch_id
        where jcb.job_id = j.id
          and cb.province_id = any(q_province_ids)
      )
    )
    and (
      q_level_ids is null
      or exists (
        select 1
        from job_levels jl
        where jl.job_id = j.id
          and jl.level_id = any(q_level_ids)
      )
    )
    and (
      q_category_ids is null
      or exists (
        select 1
        from job_categories jc
        where jc.job_id = j.id
          and jc.category_id = any(q_category_ids)
      )
    )
    and (
      q_skill_ids is null
      or exists (
        select 1
        from job_skills js
        where js.job_id = j.id
          and js.skill_id = any(q_skill_ids)
      )
    )
    and (
      q_employment_type_ids is null
      or exists (
        select 1
        from job_employment_types je
        where je.job_id = j.id
          and je.employment_type_id = any(q_employment_type_ids)
      )
    )
    and (
      q_salary_from is null
      or j.salary_to >= q_salary_from
    )
    and (
      q_salary_to is null
      or j.salary_from <= q_salary_to
    )
    and (
      q_statuses is null
      or j.status = any(q_statuses)
    )
    and (
      q_job_ids is null
      or j.id = any(q_job_ids)
    )
  order by
    case when q_sort_by = 'id'            and q_sort_dir = 'asc'  then j.id end asc,
    case when q_sort_by = 'id'            and q_sort_dir = 'desc' then j.id end desc,

    case when q_sort_by = 'title'         and q_sort_dir = 'asc'  then j.title end asc,
    case when q_sort_by = 'title'         and q_sort_dir = 'desc' then j.title end desc,

    case when q_sort_by = 'job_posted_at' and q_sort_dir = 'asc'  then j.job_posted_at end asc,
    case when q_sort_by = 'job_posted_at' and q_sort_dir = 'desc' then j.job_posted_at end desc,

    case when q_sort_by = 'created_at'    and q_sort_dir = 'asc'  then j.created_at end asc,
    case when q_sort_by = 'created_at'    and q_sort_dir = 'desc' then j.created_at end desc,

    case when q_sort_by = 'updated_at'    and q_sort_dir = 'asc'  then j.updated_at end asc,
    case when q_sort_by = 'updated_at'    and q_sort_dir = 'desc' then j.updated_at end desc,

    case when q_sort_by = 'salary_from'   and q_sort_dir = 'asc'  then j.salary_from end asc,
    case when q_sort_by = 'salary_from'   and q_sort_dir = 'desc' then j.salary_from end desc,

    case when q_sort_by = 'company_id'    and q_sort_dir = 'asc'  then j.company_id end asc,
    case when q_sort_by = 'company_id'    and q_sort_dir = 'desc' then j.company_id end desc,

    j.id desc
  limit q_limit
  offset (q_page - 1) * q_limit;
$$;