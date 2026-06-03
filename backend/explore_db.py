import sqlite3
import json

def explore():
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    
    print("=== DATABASE TABLES AND ROW COUNTS ===")
    for table in tables:
        # Get count
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        count = cursor.fetchone()[0]
        
        # Get schema Info
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        
        print(f"Table: {table} ({count} rows)")
        print(f"  Columns: {', '.join(columns)}")
        print("-" * 40)
        
    conn.close()

if __name__ == "__main__":
    explore()
