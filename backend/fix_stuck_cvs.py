"""Fix CVs stuck in 'processing' status after server restart."""
import asyncio, sys
sys.path.insert(0, '.')

async def fix():
    from app.core.config import settings
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text

    engine = create_async_engine(settings.DATABASE_URL)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # Find stuck CVs
        result = await db.execute(text(
            "SELECT id, original_filename, processing_status FROM cv_documents "
            "WHERE processing_status IN ('processing', 'pending')"
        ))
        stuck = result.fetchall()
        print(f"Found {len(stuck)} stuck CV(s):")
        for r in stuck:
            print(f"  {r[1]}  [{r[2]}]  id={r[0]}")

        if not stuck:
            print("Nothing to fix.")
            return

        # Reset to failed so user can re-upload
        await db.execute(text(
            "UPDATE cv_documents "
            "SET processing_status = 'failed', "
            "    status_message = 'Processing was interrupted. Please delete and re-upload this file.' "
            "WHERE processing_status IN ('processing', 'pending')"
        ))
        await db.commit()
        print(f"Fixed {len(stuck)} CV(s) — status set to 'failed'.")

asyncio.run(fix())
