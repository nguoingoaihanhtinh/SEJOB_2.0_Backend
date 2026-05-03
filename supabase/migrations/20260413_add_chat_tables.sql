CREATE TABLE chat_conversations (
  id BIGSERIAL PRIMARY KEY,
  employer_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  student_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  job_id BIGINT REFERENCES jobs(id) ON DELETE SET NULL, -- Optional link to job context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employer_id, student_id, job_id)
);

CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
