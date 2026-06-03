import os
import shutil
import sqlite3
import chromadb
from chromadb.config import Settings

def reset_data():
    print("Starting backend data reset (preserving users)...")
    
    # 1. Clear SQLite tables except users and alembic_version
    db_path = 'ai_resume.db'
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Disable foreign keys temporarily for truncation
            cursor.execute("PRAGMA foreign_keys = OFF;")
            
            # Get all table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            tables_to_preserve = {'users', 'alembic_version', 'sqlite_sequence'}
            
            for table in tables:
                if table not in tables_to_preserve:
                    print(f"Truncating table: {table}")
                    cursor.execute(f"DELETE FROM {table};")
                    # Vacuum/reset autoincrement sequence if applicable
                    try:
                        cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}';")
                    except sqlite3.OperationalError:
                        pass
            
            cursor.execute("PRAGMA foreign_keys = ON;")
            conn.commit()
            print("SQLite tables successfully cleared.")
            conn.close()
        except Exception as e:
            print(f"Error resetting SQLite database: {e}")
    else:
        print("SQLite database file not found.")

    # 2. Clear uploads directory
    uploads_dir = './uploads'
    if os.path.exists(uploads_dir):
        try:
            for item in os.listdir(uploads_dir):
                item_path = os.path.join(uploads_dir, item)
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path)
                else:
                    os.remove(item_path)
            print("Uploads directory successfully cleared.")
        except Exception as e:
            print(f"Error clearing uploads directory: {e}")
    else:
        print("Uploads directory not found.")

    # 3. Reset ChromaDB collection
    print("Resetting ChromaDB collection...")
    # Try connecting via HttpClient (default config)
    try:
        client = chromadb.HttpClient(
            host="localhost",
            port=8001,
            settings=Settings(anonymized_telemetry=False)
        )
        client.delete_collection("cv_embeddings")
        print("ChromaDB HTTP collection 'cv_embeddings' deleted successfully.")
    except Exception as e:
        print(f"ChromaDB HTTP connection failed or collection not found: {e}")
        
    # Also check local persistent storage fallback just in case
    persist_dir = os.path.join(os.path.dirname(__file__), "chroma_data")
    if os.path.exists(persist_dir):
        try:
            client = chromadb.PersistentClient(
                path=persist_dir,
                settings=Settings(anonymized_telemetry=False)
            )
            client.delete_collection("cv_embeddings")
            print("Local ChromaDB collection 'cv_embeddings' deleted successfully.")
        except Exception as e:
            print(f"Local ChromaDB reset failed: {e}")
            
    print("\nBackend data reset completed successfully! Users table preserved.")

if __name__ == '__main__':
    reset_data()
