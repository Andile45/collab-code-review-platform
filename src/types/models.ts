/**
 * TypeScript interfaces for all database models.
 * These mirror the schema defined in migrations/schema.sql.
 */

export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    role: "Reviewer" | "Submitter";
    profile_picture: string | null;
    created_at: Date;
}

/** User object safe to return in API responses (no password). */
export type SafeUser = Omit<User, "password">;

export interface Project {
    id: number;
    name: string;
    description: string | null;
    owner_id: number | null;
    created_at: Date;
}

export interface ProjectMember {
    project_id: number;
    user_id: number;
    role: "Reviewer" | "Submitter";
}

export type SubmissionStatus = "pending" | "in_review" | "approved" | "changes_requested";

export interface Submission {
    id: number;
    project_id: number;
    user_id: number | null;
    title: string;
    content: string;
    status: SubmissionStatus;
    created_at: Date;
    updated_at: Date;
}

export interface Comment {
    id: number;
    submission_id: number;
    user_id: number | null;
    line_number: number | null;
    comment_text: string;
    created_at: Date;
}

export type ReviewAction = "approved" | "changes_requested";

export interface Review {
    id: number;
    submission_id: number;
    reviewer_id: number | null;
    action: ReviewAction;
    note: string | null;
    created_at: Date;
}

export interface Notification {
    id: number;
    user_id: number;
    message: string;
    is_read: boolean;
    created_at: Date;
}
