
import asyncio
import os
import sys
from uuid import UUID

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.database import AsyncSessionLocal
from app.models.analysis_record import AnalysisRecord
from app.models.cv_document import CVDocument
from app.models.job_description import JobDescription
from app.services.agents.matching_agent import matching_agent
from sqlalchemy import select

async def debug_analysis(analysis_id=None):
    print(f"--- DEEP DEBUG OF ANALYSIS {analysis_id or 'LAST'} ---")
    async with AsyncSessionLocal() as db:
        if analysis_id:
            # Match by short ID or full UUID
            from sqlalchemy import String, cast
            if len(analysis_id) <= 8:
                # Use cast to string for partial matches on UUID columns
                stmt = select(AnalysisRecord).where(cast(AnalysisRecord.id, String).like(f"{analysis_id}%"))
            else:
                stmt = select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
        else:
            stmt = select(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).limit(1)
            
        result = await db.execute(stmt)
        analysis = result.scalar_one_or_none()
        
        if not analysis:
            print("No analysis found.")
            return
            
        print(f"Analysis ID: {analysis.id}")
        print(f"Status in DB: {analysis.processing_status}")
        print(f"Score in DB: {analysis.match_score}")
        print(f"Error in DB: {analysis.error_message}")
        
        # Get CV and JD
        stmt = select(CVDocument).where(CVDocument.id == analysis.cv_document_id)
        cv = (await db.execute(stmt)).scalar_one_or_none()
        
        stmt = select(JobDescription).where(JobDescription.id == analysis.job_description_id)
        jd = (await db.execute(stmt)).scalar_one_or_none()
        
        if not cv: print("CV not found."); return
        if not jd: print("JD not found."); return
        
        print(f"\nCV Text Length: {len(cv.masked_text or '')}")
        print(f"JD Text Length: {len(jd.description or '')}")
        
        if not jd.description or len(jd.description.strip()) < 10:
            print("WARNING: Job Description is EMPTY or too short!")
            return

        print("\n--- RUNNING MANUAL MATCH ---")
        try:
            # We bypass the orchestrator and call the agent directly
            match_result = await matching_agent.match(
                masked_cv=cv.masked_text,
                job_description=jd.description,
                cv_document_id=cv.id,
                jd_id=jd.id,
                db=db
            )
            print("\n--- MATCH SUCCESS ---")
            print(f"Score: {match_result.get('match_score')}")
            print(f"Matching Skills: {match_result.get('matching_skills')}")
            print(f"Missing Skills: {match_result.get('missing_skills')}")
        except Exception as e:
            print(f"\n--- MATCH FAILED ---")
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    aid = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(debug_analysis(aid))
