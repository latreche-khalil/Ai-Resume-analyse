"""
Initialize SQLite database with all tables.
Run from backend/ directory: python init_db.py
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load env
from dotenv import load_dotenv
load_dotenv('.env.local')

async def main():
    from app.core.database import engine
    from app.models.base import Base
    
    # Import all models to register them
    import app.models.user
    import app.models.cv_document
    import app.models.job_description
    import app.models.analysis_record
    import app.models.chat
    import app.models.interview
    import app.models.feedback
    import app.models.gap_report
    import app.models.skill_report
    import app.models.xai_report
    import app.models.audit_log
    import app.models.pii_mapping
    import app.models.pii_audit_trail
    import app.models.talent_pool
    import app.models.celery_task
    import app.models.dlq_record
    
    print("Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ All tables created successfully!")
    
    # Verify
    import sqlite3
    conn2 = sqlite3.connect('ai_resume.db')
    cur = conn2.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cur.fetchall()]
    print(f"\nTables ({len(tables)}): {tables}")
    
    # Check analysis_records columns
    cur.execute('PRAGMA table_info(analysis_records)')
    cols = [row[1] for row in cur.fetchall()]
    print(f"\nanalysis_records columns ({len(cols)}): {cols}")
    conn2.close()

asyncio.run(main())
