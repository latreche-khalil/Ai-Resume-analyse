import sqlite3
import os

db_path = r'c:\Users\Administrator\Desktop\final-ai-resume-analyzer\backend\app.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Checking pii_mappings schema...")
    cursor.execute("PRAGMA table_info(pii_mappings)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'blind_index' not in columns:
        print("Adding blind_index column to pii_mappings...")
        cursor.execute("ALTER TABLE pii_mappings ADD COLUMN blind_index VARCHAR(64)")
        cursor.execute("CREATE INDEX idx_pii_mappings_blind_index ON pii_mappings (blind_index)")
        print("Column added successfully.")
    else:
        print("blind_index column already exists.")
        
    conn.commit()
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
