
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.database import AsyncSessionLocal
from app.models.analysis_record import AnalysisRecord
from sqlalchemy import select

async def list_recent_analyses():
    print("--- RECENT ANALYSES ---")
    async with AsyncSessionLocal() as db:
        stmt = select(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).limit(5)
        result = await db.execute(stmt)
        analyses = result.scalars().all()
        
        for a in analyses:
            print(f"ID: {a.id} | Score: {a.match_score} | Status: {a.processing_status} | Created: {a.created_at}")

if __name__ == "__main__":
    asyncio.run(list_recent_analyses())
