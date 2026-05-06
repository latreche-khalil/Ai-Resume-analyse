import sqlite3
import os
from app.core.config import settings

def reset_cv_documents_table():
    db_path = "app.db" # Default path
    if not os.path.exists(db_path):
        # Check if it's in the backend folder
        if os.path.exists("backend/app.db"):
            db_path = "backend/app.db"
        else:
            print("Could not find app.db. Database might be created on next start.")
            return

    print(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # SQLite doesn't support dropping constraints directly.
        # The standard way is to recreate the table.
        
        print("Backing up data from cv_documents...")
        cursor.execute("CREATE TABLE cv_documents_backup AS SELECT * FROM cv_documents")
        
        print("Dropping old table...")
        cursor.execute("DROP TABLE cv_documents")
        
        # This will allow the application to recreate the table using SQLAlchemy on next start
        # but to be safe and immediate, we can just commit the drop.
        # Actually, let's just drop it and let SQLAlchemy's create_all handle it.
        # But we want to keep the data.
        
        print("Table dropped. Application will recreate it without the 50-word constraint on restart.")
        print("Note: Previous CV data was backed up to 'cv_documents_backup' table.")
        
        conn.commit()
        print("Successfully reset the schema.")
        
    except Exception as e:
        print(f"Error during reset: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    reset_cv_documents_table()
