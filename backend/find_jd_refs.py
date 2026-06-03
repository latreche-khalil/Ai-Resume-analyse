import sqlite3

def search():
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in cursor.fetchall()]
    
    print("Searching for 'jd-999-jillani' in all tables...")
    for table in tables:
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [c[1] for c in cursor.fetchall()]
            
            for col in columns:
                query = f"SELECT COUNT(*) FROM {table} WHERE CAST({col} AS TEXT) = 'jd-999-jillani'"
                cursor.execute(query)
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"Found in Table: {table}, Column: {col} -> {count} occurrences")
        except Exception as e:
            # Skip if query fails (e.g. invalid columns)
            pass
            
    conn.close()

if __name__ == "__main__":
    search()
