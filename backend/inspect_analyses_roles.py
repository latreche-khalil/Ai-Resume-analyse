import sqlite3

def inspect():
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    
    # Query details
    query = """
    SELECT ar.id, ar.match_score, ar.created_at, cv.original_filename, u.email, u.role
    FROM analysis_records ar
    JOIN cv_documents cv ON ar.cv_document_id = cv.id
    JOIN users u ON cv.user_id = u.id
    ORDER BY ar.created_at DESC
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()
    
    candidates_count = 0
    recruiters_count = 0
    
    print("--- Detailed Analysis Records ---")
    for row in rows:
        print(row)
        if row[5] == 'candidate':
            candidates_count += 1
        elif row[5] == 'recruiter':
            recruiters_count += 1
            
    print(f"\nTotal Candidate analyses: {candidates_count}")
    print(f"Total Recruiter analyses: {recruiters_count}")
    print(f"Total analyses: {len(rows)}")
    
    conn.close()

if __name__ == '__main__':
    inspect()
