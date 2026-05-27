
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.cv_document import CVDocument
from app.models.analysis_record import AnalysisRecord
from app.models.job_description import JobDescription

async def diagnose():
    print("--- STARTING DIAGNOSIS ---")
    async with AsyncSessionLocal() as db:
        # 1. Check CVs
        cv_result = await db.execute(select(CVDocument))
        cvs = cv_result.scalars().all()
        print(f"Found {len(cvs)} CVs")
        for cv in cvs:
            text_len = len(cv.extracted_text) if cv.extracted_text else 0
            print(f"CV ID: {cv.id}, Name: {cv.original_filename}, Text Length: {text_len}")
            if text_len < 100:
                print(f"  WARNING: CV text is very short ({text_len} chars)!")

        # 2. Check Analyses
        from app.models.xai_report import XAIReport
        analysis_result = await db.execute(select(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()))
        analyses = analysis_result.scalars().all()
        print(f"\nFound {len(analyses)} Analyses")
        for a in analyses:
            print(f"ID: {a.id}, Status: {a.processing_status}, Score: {a.match_score}, Created: {a.created_at}")
            if a.error_message:
                print(f"  Error: {a.error_message}")

        # 3. Check Latest Analysis for empty fields
        if analyses:
            latest = analyses[0]
            if not latest.overall_explanation or latest.overall_explanation == "":
                print("\nCRITICAL: Latest analysis has EMPTY overall_explanation!")
            
    print("--- DIAGNOSIS COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(diagnose())
