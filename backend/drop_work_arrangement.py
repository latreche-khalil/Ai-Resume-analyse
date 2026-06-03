"""
Migration: Drop work_arrangement column from job_descriptions table.
Rebuilds the table without work_arrangement, preserving all other data.
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_resume.db")


def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Check current columns
    cur.execute("PRAGMA table_info(job_descriptions)")
    cols = [c[1] for c in cur.fetchall()]
    print(f"Current columns: {cols}")

    if "work_arrangement" not in cols:
        print("work_arrangement column already removed. Nothing to do.")
        conn.close()
        return

    print("\nDropping work_arrangement column via table rebuild...")

    cur.execute("PRAGMA foreign_keys = OFF")
    conn.commit()

    # Create new table WITHOUT work_arrangement
    cur.execute("""
        CREATE TABLE job_descriptions_new (
            id VARCHAR(36) PRIMARY KEY,
            recruiter_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            is_archived BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME,
            is_long BOOLEAN NOT NULL DEFAULT 0,
            word_count INTEGER,
            detected_language VARCHAR(2),
            lang_confidence NUMERIC(3, 2),
            company VARCHAR(255)
        )
    """)

    # Copy data (excluding work_arrangement)
    cur.execute("""
        INSERT INTO job_descriptions_new (
            id, recruiter_id, title, description,
            is_active, is_archived, created_at, updated_at, deleted_at,
            is_long, word_count, detected_language, lang_confidence, company
        )
        SELECT
            id, recruiter_id, title, description,
            is_active, is_archived, created_at, updated_at, deleted_at,
            is_long, word_count, detected_language, lang_confidence, company
        FROM job_descriptions
    """)

    # Swap tables
    cur.execute("DROP TABLE job_descriptions")
    cur.execute("ALTER TABLE job_descriptions_new RENAME TO job_descriptions")

    # Recreate indexes
    cur.execute("CREATE INDEX IF NOT EXISTS idx_job_descriptions_recruiter_id ON job_descriptions(recruiter_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_job_descriptions_active ON job_descriptions(is_active)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON job_descriptions(created_at)")

    cur.execute("PRAGMA foreign_keys = ON")
    conn.commit()

    # Verify
    cur.execute("PRAGMA table_info(job_descriptions)")
    new_cols = [c[1] for c in cur.fetchall()]
    print(f"New columns:     {new_cols}")

    cur.execute("PRAGMA integrity_check")
    integrity = cur.fetchone()[0]
    print(f"Integrity check: {integrity}")

    cur.execute("SELECT COUNT(*) FROM job_descriptions")
    row_count = cur.fetchone()[0]
    print(f"Row count:       {row_count}")

    conn.close()
    print("\nMigration complete.")


if __name__ == "__main__":
    main()
