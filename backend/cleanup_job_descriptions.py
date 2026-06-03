"""
Cleanup job_descriptions table:
  1. Remove old/duplicate jobs (recruiter_id IS NULL = candidate-uploaded test data)
  2. Remove unused columns: education_requirements, salary_range_min, salary_range_max

Run from: backend/
  python cleanup_job_descriptions.py
"""
import sqlite3
import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_resume.db")


def get_stats(cur):
    cur.execute("SELECT COUNT(*) FROM job_descriptions WHERE deleted_at IS NULL")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_descriptions WHERE recruiter_id IS NULL AND deleted_at IS NULL")
    no_recruiter = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM job_descriptions WHERE recruiter_id IS NOT NULL AND deleted_at IS NULL")
    with_recruiter = cur.fetchone()[0]
    print("\n[STATS] Current job_descriptions table:")
    print(f"  Total active JDs      : {total}")
    print(f"  JDs with recruiter_id : {with_recruiter}")
    print(f"  JDs without recruiter : {no_recruiter}")


def delete_orphan_jobs(cur):
    """Delete candidate-created JDs (recruiter_id IS NULL) not referenced by any analysis."""
    print("\n[STEP 1] Deleting JDs with NULL recruiter_id not referenced by any analysis...")
    cur.execute("""
        SELECT jd.id, jd.title, jd.created_at
        FROM job_descriptions jd
        WHERE jd.recruiter_id IS NULL
          AND jd.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM analysis_records ar WHERE ar.job_description_id = jd.id
          )
        ORDER BY jd.created_at
    """)
    rows = cur.fetchall()
    if not rows:
        print("  No orphan JDs found.")
        return 0

    print(f"  Found {len(rows)} orphan JD(s) to delete:")
    for r in rows:
        title = r[1][:50] if r[1] else "(no title)"
        print(f"    [{r[0]}] '{title}' - created {r[2]}")

    ids = [r[0] for r in rows]
    placeholders = ",".join("?" * len(ids))
    cur.execute(f"DELETE FROM job_descriptions WHERE id IN ({placeholders})", ids)
    print(f"  Deleted {len(ids)} orphan JD(s).")
    return len(ids)


def delete_duplicate_jobs(cur):
    """Keep only the newest JD for each (recruiter_id, title) duplicate group."""
    print("\n[STEP 2] Cleaning up duplicate JDs (same recruiter + title)...")
    cur.execute("""
        SELECT recruiter_id, title, COUNT(*) as cnt
        FROM job_descriptions
        WHERE recruiter_id IS NOT NULL AND deleted_at IS NULL
        GROUP BY recruiter_id, title
        HAVING cnt > 1
    """)
    groups = cur.fetchall()
    if not groups:
        print("  No duplicate JDs found.")
        return 0

    total_deleted = 0
    for recruiter_id, title, cnt in groups:
        cur.execute("""
            SELECT id FROM job_descriptions
            WHERE recruiter_id = ? AND title = ? AND deleted_at IS NULL
            ORDER BY created_at DESC
        """, (recruiter_id, title))
        all_ids = [r[0] for r in cur.fetchall()]
        keep_id = all_ids[0]
        delete_ids = all_ids[1:]

        # Only delete if no analysis records reference these
        safe_delete = []
        for del_id in delete_ids:
            cur.execute("SELECT COUNT(*) FROM analysis_records WHERE job_description_id = ?", (del_id,))
            if cur.fetchone()[0] > 0:
                print(f"  SKIP: [{del_id}] '{title}' has analysis records - keeping.")
            else:
                safe_delete.append(del_id)

        if safe_delete:
            placeholders = ",".join("?" * len(safe_delete))
            cur.execute(f"DELETE FROM job_descriptions WHERE id IN ({placeholders})", safe_delete)
            print(f"  Kept [{keep_id}] '{title}', deleted {len(safe_delete)} duplicate(s).")
            total_deleted += len(safe_delete)

    return total_deleted


def drop_unused_columns(conn, cur):
    """
    Remove columns that are never populated from the UI:
      - education_requirements
      - salary_range_min
      - salary_range_max
    Uses table rebuild method (compatible with all SQLite versions).
    """
    print("\n[STEP 3] Removing unused columns from job_descriptions...")

    cur.execute("PRAGMA table_info(job_descriptions)")
    cols_info = cur.fetchall()
    col_names = [c[1] for c in cols_info]
    print(f"  Current columns ({len(col_names)}): {col_names}")

    COLUMNS_TO_REMOVE = {"education_requirements", "salary_range_min", "salary_range_max"}
    existing_removals = COLUMNS_TO_REMOVE & set(col_names)
    if not existing_removals:
        print("  Columns already removed or do not exist. Skipping.")
        return

    print(f"  Will remove: {sorted(existing_removals)}")

    keep_cols = [c for c in col_names if c not in COLUMNS_TO_REMOVE]
    keep_cols_sql = ", ".join(keep_cols)

    cur.execute("PRAGMA foreign_keys")
    fk_was_on = cur.fetchone()[0]

    # Rebuild table without the columns
    cur.execute("PRAGMA foreign_keys = OFF")
    conn.commit()

    cur.execute(f"""
        CREATE TABLE job_descriptions_new AS
        SELECT {keep_cols_sql} FROM job_descriptions
    """)

    cur.execute("DROP TABLE job_descriptions")
    cur.execute("ALTER TABLE job_descriptions_new RENAME TO job_descriptions")
    conn.commit()

    # Recreate indexes
    cur.execute("CREATE INDEX IF NOT EXISTS idx_job_descriptions_recruiter_id ON job_descriptions(recruiter_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_job_descriptions_active ON job_descriptions(is_active)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON job_descriptions(created_at)")
    conn.commit()

    if fk_was_on:
        cur.execute("PRAGMA foreign_keys = ON")
        conn.commit()

    remaining_cols = [c for c in col_names if c not in COLUMNS_TO_REMOVE]
    print(f"  Done. Remaining columns ({len(remaining_cols)}): {remaining_cols}")


def verify_integrity(cur):
    print("\n[STEP 4] Database integrity check...")
    cur.execute("PRAGMA integrity_check")
    result = cur.fetchone()[0]
    if result == "ok":
        print("  Integrity: OK")
    else:
        print(f"  WARNING: {result}")


def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found: {DB_PATH}")
        sys.exit(1)

    print(f"Connecting to: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Initial state
    get_stats(cur)

    # Step 1: Remove orphan JDs
    deleted_orphans = delete_orphan_jobs(cur)
    conn.commit()

    # Step 2: Remove duplicates
    deleted_dupes = delete_duplicate_jobs(cur)
    conn.commit()

    # Step 3: Drop unused columns
    drop_unused_columns(conn, cur)

    # Step 4: Verify
    verify_integrity(cur)

    # Final state
    get_stats(cur)

    print(f"\n=== SUMMARY ===")
    print(f"  Orphan JDs deleted    : {deleted_orphans}")
    print(f"  Duplicate JDs deleted : {deleted_dupes}")
    print(f"  Columns removed       : education_requirements, salary_range_min, salary_range_max")
    print("Cleanup complete.")

    conn.close()


if __name__ == "__main__":
    main()
