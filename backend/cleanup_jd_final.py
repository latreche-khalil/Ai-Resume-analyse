"""
Final aggressive cleanup of job_descriptions table:
  1. Hard-delete all soft-deleted rows (deleted_at IS NOT NULL)
  2. Delete test/junk JDs (like 'htrdyuf')
  3. Delete old NULL-recruiter JDs that are duplicates or test data
     (even if they have analysis records - cascade will clean those too)

Only keeps JDs that are:
  - Active (deleted_at IS NULL)
  - Owned by a real recruiter (recruiter_id IS NOT NULL)
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_resume.db")


def show_all(cur):
    cur.execute("""
        SELECT id, recruiter_id, title, deleted_at, created_at
        FROM job_descriptions
        ORDER BY created_at
    """)
    rows = cur.fetchall()
    print(f"\n  Total rows: {len(rows)}")
    for r in rows:
        status = "SOFT-DELETED" if r[3] else "ACTIVE"
        owner = r[1][:8] if r[1] else "NULL"
        title = (r[2] or "")[:40]
        print(f"    [{r[0][:8]}..] recruiter={owner} title='{title}' {status} created={r[4]}")
    return rows


def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("=== BEFORE ===")
    show_all(cur)

    # Step 1: Hard-delete soft-deleted rows
    cur.execute("SELECT id, title FROM job_descriptions WHERE deleted_at IS NOT NULL")
    soft_deleted = cur.fetchall()
    if soft_deleted:
        print(f"\n[STEP 1] Permanently removing {len(soft_deleted)} soft-deleted JD(s):")
        for r in soft_deleted:
            print(f"    - {r[1]}")
        # First delete child records
        for r in soft_deleted:
            jd_id = r[0]
            # Delete analysis_records and their children
            cur.execute("SELECT id FROM analysis_records WHERE job_description_id = ?", (jd_id,))
            analysis_ids = [a[0] for a in cur.fetchall()]
            for aid in analysis_ids:
                cur.execute("DELETE FROM gap_reports WHERE analysis_record_id = ?", (aid,))
                cur.execute("DELETE FROM xai_reports WHERE analysis_record_id = ?", (aid,))
            cur.execute("DELETE FROM analysis_records WHERE job_description_id = ?", (jd_id,))
            # Delete interview sessions
            cur.execute("DELETE FROM interview_sessions WHERE job_description_id = ?", (jd_id,))
            # Delete the JD itself
            cur.execute("DELETE FROM job_descriptions WHERE id = ?", (jd_id,))
        conn.commit()
        print(f"    Done.")
    else:
        print("\n[STEP 1] No soft-deleted rows.")

    # Step 2: Delete NULL-recruiter JDs (candidate test data)
    cur.execute("""
        SELECT id, title FROM job_descriptions
        WHERE recruiter_id IS NULL AND deleted_at IS NULL
    """)
    null_recruiter = cur.fetchall()
    if null_recruiter:
        print(f"\n[STEP 2] Removing {len(null_recruiter)} JD(s) with NULL recruiter_id:")
        for r in null_recruiter:
            print(f"    - '{r[1]}'")
            jd_id = r[0]
            # Delete children first
            cur.execute("SELECT id FROM analysis_records WHERE job_description_id = ?", (jd_id,))
            analysis_ids = [a[0] for a in cur.fetchall()]
            for aid in analysis_ids:
                cur.execute("DELETE FROM gap_reports WHERE analysis_record_id = ?", (aid,))
                cur.execute("DELETE FROM xai_reports WHERE analysis_record_id = ?", (aid,))
            cur.execute("DELETE FROM analysis_records WHERE job_description_id = ?", (jd_id,))
            cur.execute("DELETE FROM interview_sessions WHERE job_description_id = ?", (jd_id,))
            cur.execute("DELETE FROM job_descriptions WHERE id = ?", (jd_id,))
        conn.commit()
        print(f"    Done.")
    else:
        print("\n[STEP 2] No NULL-recruiter JDs.")

    # Step 3: Delete duplicate recruiter JDs (keep newest per recruiter+title)
    cur.execute("""
        SELECT recruiter_id, title, COUNT(*) as cnt
        FROM job_descriptions
        WHERE deleted_at IS NULL
        GROUP BY recruiter_id, title
        HAVING cnt > 1
    """)
    dupes = cur.fetchall()
    if dupes:
        print(f"\n[STEP 3] Deduplicating {len(dupes)} group(s):")
        for recruiter_id, title, cnt in dupes:
            cur.execute("""
                SELECT id FROM job_descriptions
                WHERE recruiter_id = ? AND title = ? AND deleted_at IS NULL
                ORDER BY created_at DESC
            """, (recruiter_id, title))
            all_ids = [r[0] for r in cur.fetchall()]
            keep = all_ids[0]
            remove = all_ids[1:]
            for del_id in remove:
                cur.execute("SELECT id FROM analysis_records WHERE job_description_id = ?", (del_id,))
                analysis_ids = [a[0] for a in cur.fetchall()]
                for aid in analysis_ids:
                    cur.execute("DELETE FROM gap_reports WHERE analysis_record_id = ?", (aid,))
                    cur.execute("DELETE FROM xai_reports WHERE analysis_record_id = ?", (aid,))
                cur.execute("DELETE FROM analysis_records WHERE job_description_id = ?", (del_id,))
                cur.execute("DELETE FROM interview_sessions WHERE job_description_id = ?", (del_id,))
                cur.execute("DELETE FROM job_descriptions WHERE id = ?", (del_id,))
            print(f"    '{title}': kept newest, removed {len(remove)} duplicate(s)")
        conn.commit()
    else:
        print("\n[STEP 3] No duplicates.")

    # Step 4: Rebuild table without required_skills, preferred_skills, experience_level
    print("\n[STEP 4] Rebuilding job_descriptions table to drop required_skills, preferred_skills, experience_level...")
    cur.execute("PRAGMA table_info(job_descriptions)")
    cols = [c[1] for c in cur.fetchall()]
    print(f"    Current columns: {cols}")
    
    # Check if they still exist
    to_remove = {"required_skills", "preferred_skills", "experience_level"}
    existing_to_remove = to_remove & set(cols)
    if existing_to_remove:
        print(f"    Dropping columns: {existing_to_remove}")
        
        # Turn off foreign keys temporarily for restructure
        cur.execute("PRAGMA foreign_keys = OFF")
        conn.commit()
        
        # Create new table
        cur.execute("""
            CREATE TABLE job_descriptions_new (
                id VARCHAR(36) PRIMARY KEY,
                recruiter_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                work_arrangement VARCHAR(20),
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
        
        # Copy data
        cur.execute("""
            INSERT INTO job_descriptions_new (
                id, recruiter_id, title, description, work_arrangement, 
                is_active, is_archived, created_at, updated_at, deleted_at,
                is_long, word_count, detected_language, lang_confidence, company
            )
            SELECT 
                id, recruiter_id, title, description, work_arrangement, 
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
        print("    Rebuild complete.")
    else:
        print("    Columns already removed. Skipping.")

    # Integrity check
    cur.execute("PRAGMA integrity_check")
    integrity = cur.fetchone()[0]
    print(f"\nIntegrity: {integrity}")

    print("\n=== AFTER ===")
    show_all(cur)

    conn.close()
    print("\nCleanup complete.")


if __name__ == "__main__":
    main()
