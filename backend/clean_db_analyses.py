import sqlite3

def clean():
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    
    # Enable foreign keys just in case
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # 1. Get Candidate User ID
    cursor.execute("SELECT id FROM users WHERE role = 'candidate'")
    candidate_users = [row[0] for row in cursor.fetchall()]
    
    # 2. Get Recruiter User ID
    cursor.execute("SELECT id FROM users WHERE role = 'recruiter'")
    recruiter_users = [row[0] for row in cursor.fetchall()]
    
    print(f"Candidate users: {candidate_users}")
    print(f"Recruiter users: {recruiter_users}")
    
    # Find all analyses for candidate
    candidate_analyses = []
    if candidate_users:
        placeholders = ','.join('?' for _ in candidate_users)
        query = f"""
        SELECT ar.id, ar.created_at, cv.original_filename
        FROM analysis_records ar
        JOIN cv_documents cv ON ar.cv_document_id = cv.id
        WHERE cv.user_id IN ({placeholders})
        ORDER BY ar.created_at DESC
        """
        cursor.execute(query, candidate_users)
        candidate_analyses = cursor.fetchall()
        
    # Find all analyses for recruiter
    recruiter_analyses = []
    if recruiter_users:
        placeholders = ','.join('?' for _ in recruiter_users)
        query = f"""
        SELECT ar.id, ar.created_at, cv.original_filename
        FROM analysis_records ar
        JOIN cv_documents cv ON ar.cv_document_id = cv.id
        WHERE cv.user_id IN ({placeholders})
        ORDER BY ar.created_at DESC
        """
        cursor.execute(query, recruiter_users)
        recruiter_analyses = cursor.fetchall()

    print(f"\nFound {len(candidate_analyses)} candidate analyses.")
    print(f"Found {len(recruiter_analyses)} recruiter analyses.")
    
    # Determine which ones to keep and which to delete
    to_keep = []
    to_delete = []
    
    # Candidate analyses: keep top 3
    print("\nCandidate analyses (top 3 kept):")
    for idx, analysis in enumerate(candidate_analyses):
        if idx < 3:
            print(f"KEEP: {analysis}")
            to_keep.append(analysis[0])
        else:
            to_delete.append(analysis[0])
            
    # Recruiter analyses: keep top 3
    print("\nRecruiter analyses (top 3 kept):")
    for idx, analysis in enumerate(recruiter_analyses):
        if idx < 3:
            print(f"KEEP: {analysis}")
            to_keep.append(analysis[0])
        else:
            to_delete.append(analysis[0])
            
    print(f"\nTotal analyses to delete: {len(to_delete)}")
    
    if to_delete:
        # Delete related tables first (XAI and GAP reports)
        placeholders = ','.join('?' for _ in to_delete)
        
        cursor.execute(f"DELETE FROM gap_reports WHERE analysis_record_id IN ({placeholders})", to_delete)
        print(f"Deleted {cursor.rowcount} gap reports.")
        
        cursor.execute(f"DELETE FROM xai_reports WHERE analysis_record_id IN ({placeholders})", to_delete)
        print(f"Deleted {cursor.rowcount} XAI reports.")
        
        cursor.execute(f"DELETE FROM analysis_records WHERE id IN ({placeholders})", to_delete)
        print(f"Deleted {cursor.rowcount} analysis records.")
        
        conn.commit()
        print("Database cleanup committed successfully.")
    else:
        print("No analyses to delete.")
        
    conn.close()

if __name__ == '__main__':
    clean()
