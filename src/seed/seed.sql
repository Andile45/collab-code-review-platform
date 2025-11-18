-- create two users
INSERT INTO users (name, email, password, role)
VALUES
('Alice Reviewer', 'alice@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8q3gMGF/xi.Y3p9hF8xWzQ1kGqZr1K', 'Reviewer'), -- password: Password123
('Bob Submitter', 'bob@example.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8q3gMGF/xi.Y3p9hF8xWzQ1kGqZr1K', 'Submitter');

-- create a project with owner Alice
INSERT INTO projects (name, description, owner_id)
VALUES ('Demo Project', 'Project seeded for testing', 1);

-- add Alice as member reviewer
INSERT INTO project_members (project_id, user_id, role) VALUES (1,1,'Reviewer');

-- add Bob as member submitter
INSERT INTO project_members (project_id, user_id, role) VALUES (1,2,'Submitter');
