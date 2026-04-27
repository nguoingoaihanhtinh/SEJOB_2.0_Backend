CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES applications(id) ON DELETE CASCADE,
    reviewer_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'COMPANY_TO_APPLICANT' or 'APPLICANT_TO_COMPANY'
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_reviews_application_id ON reviews(application_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Add comment to table
COMMENT ON TABLE reviews IS 'Table to store reviews between companies and interns/applicants';
COMMENT ON COLUMN reviews.type IS 'COMPANY_TO_APPLICANT for employer reviews, APPLICANT_TO_COMPANY for intern reviews';
COMMENT ON COLUMN reviews.is_approved IS 'Controls visibility for applicant-to-company reviews (after admin approval)';
