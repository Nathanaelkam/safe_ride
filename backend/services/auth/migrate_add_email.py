#!/usr/bin/env python3
"""
Migration script to add email column to users table
Run this script to fix the database schema mismatch
"""

import asyncio
from sqlalchemy import text
from database import engine

async def add_email_column():
    """Add email column to users table if it doesn't exist"""
    async with engine.begin() as conn:
        # Check if email column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'email'
        """))
        
        if not result.fetchone():
            print("Adding email column to users table...")
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN email VARCHAR(255) UNIQUE
            """))
            print("Email column added successfully!")
        else:
            print("Email column already exists")

if __name__ == "__main__":
    asyncio.run(add_email_column())