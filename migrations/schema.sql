-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'Submitter',
  profile_picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- project members
CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'Reviewer',
  PRIMARY KEY (project_id, user_id)
);

-- submissions
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- comments
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  line_number INTEGER,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- reviews
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(30) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- Performance indexes for frequently queried columns
-- ============================================

-- Speed up project lookups by owner
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- Speed up submission queries by project (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON submissions(project_id);

-- Speed up submission lookups by user
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);

-- Speed up submission filtering by status
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Speed up comment lookups by submission
CREATE INDEX IF NOT EXISTS idx_comments_submission_id ON comments(submission_id);

-- Speed up comment lookups by user (for ownership checks)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Speed up review lookups by submission
CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON reviews(submission_id);

-- Speed up notification lookups by user + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
