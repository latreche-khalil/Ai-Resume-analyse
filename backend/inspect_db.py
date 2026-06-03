import sqlite3

def inspect():
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    print("--- Users ---")
    cursor.execute("SELECT id, email, role FROM users")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- CV Documents ---")
    cursor.execute("SELECT id, user_id, original_filename, processing_status FROM cv_documents LIMIT 10")
    for row in cursor.fetchall():
        print(row)
        
    print("\n--- Job Descriptions ---")
    cursor.execute("SELECT id, recruiter_id, title FROM job_descriptions LIMIT 10")
    for row in cursor.fetchall():
        print(row)
        
    conn.close()

if __name__ == '__main__':
    inspect()
