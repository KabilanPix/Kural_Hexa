import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("UPDATE complaints SET channel = 'telegram' WHERE channel = 'whatsapp';"))
        print(f"Updated {res.rowcount} records to telegram.")

if __name__ == "__main__":
    asyncio.run(main())
