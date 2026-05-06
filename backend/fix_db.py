import sqlite3
import os

db_path = 'ai_resume.db'
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        # Check if column already exists
        cursor.execute("PRAGMA table_info(cv_documents)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'status_message' not in columns:
            cursor.execute('ALTER TABLE cv_documents ADD COLUMN status_message VARCHAR(255)')
            conn.commit()
            print("Successfully added 'status_message' column to 'cv_documents' table.")
        else:
            print("Column 'status_message' already exists.")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
else:
    print(f"Database file not found at {db_path}")
