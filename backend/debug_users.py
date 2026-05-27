import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def debug_db():
    async with AsyncSessionLocal() as db:
        print("--- DEBUG DB USERS ---")
        try:
            result = await db.execute(select(User))
            users = result.scalars().all()
            if not users:
                print("No users found in database. The table is EMPTY.")
            for u in users:
                print(f"ID: {u.id} | Email: {u.email} | Active: {u.is_active} | Deleted: {u.deleted_at}")
        except Exception as e:
            print(f"Error reading DB: {e}")
        print("-----------------------")

if __name__ == "__main__":
    asyncio.run(debug_db())
