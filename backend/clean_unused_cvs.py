import sqlite3

def clean():
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # 1. Get CV IDs referenced in active analysis_records
    cursor.execute("SELECT DISTINCT cv_document_id FROM analysis_records")
    used_cv_ids = {row[0] for row in cursor.fetchall()}
    print(f"Used CV IDs in active analyses: {used_cv_ids}")
    
    # 2. Get all CV IDs from cv_documents
    cursor.execute("SELECT id, original_filename, file_path FROM cv_documents")
    all_cvs = cursor.fetchall()
    
    to_keep = []
    to_delete = []
    
    for cv_id, filename, file_path in all_cvs:
        if cv_id in used_cv_ids:
            to_keep.append((cv_id, filename, file_path))
        else:
            to_delete.append((cv_id, filename, file_path))
            
    print(f"\nTotal CVs in DB: {len(all_cvs)}")
    print(f"CVs to KEEP in DB: {len(to_keep)}")
    print(f"CVs to DELETE from DB: {len(to_delete)}")
    
    # 3. Clean up database records only (does not touch files on disk)
    if to_delete:
        print("\nDeleting unused CV records from database (keeping files on disk):")
        for cv_id, filename, file_path in to_delete:
            print(f"Deleting DB record: {filename} (ID: {cv_id})")
            
            # Delete related data in database tables
            # Delete from skill_reports
            cursor.execute("DELETE FROM skill_reports WHERE document_id = ?", (cv_id,))
            # Delete from pii_mappings
            cursor.execute("DELETE FROM pii_mappings WHERE document_id = ?", (cv_id,))
            # Delete from cv_documents
            cursor.execute("DELETE FROM cv_documents WHERE id = ?", (cv_id,))
            
        conn.commit()
        print("\nDatabase cleanup committed successfully.")
    else:
        print("\nNo unused CV records to delete from database.")
        
    conn.close()

if __name__ == '__main__':
    clean()
