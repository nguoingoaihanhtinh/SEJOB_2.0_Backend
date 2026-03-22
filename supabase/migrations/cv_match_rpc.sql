-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION match_cv_score(target_job_id bigint, search_keywords text)
RETURNS float AS $$
DECLARE
  rank float;
  query_str text;
BEGIN
  -- Sanitize keywords and join with OR (|) operator 
  -- e.g., "React Node TypeScript" -> "React | Node | TypeScript"
  SELECT string_agg(word, ' | ')
  FROM unnest(regexp_split_to_array(btrim(regexp_replace(search_keywords, '[^a-zA-Z0-9+#]+', ' ', 'g')), '\s+')) AS word
  WHERE length(word) > 1
  INTO query_str;

  IF query_str IS NULL OR query_str = '' THEN
    RETURN 0.0;
  END IF;

  -- Calculate Cover Density Rank of the matching OR query against the weighted Job Description vectors
  SELECT ts_rank_cd(
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(requirement, ' '), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(responsibilities, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(nice_to_haves, ' '), '')), 'C'),
    to_tsquery('english', query_str)
  ) INTO rank
  FROM jobs
  WHERE id = target_job_id;

  RETURN coalesce(rank, 0.0);
END;
$$ LANGUAGE plpgsql;
