#!/usr/bin/env python3
"""
Script to view ValAI database contents
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

def main():
    # Connect to database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./valai.db")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("=== VALAI DATABASE CONTENTS ===\n")

    # Show all tables
    result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
    tables = [row[0] for row in result]
    print("Tables:", tables)
    print()

    # Show users table
    print("=== USERS TABLE ===")
    result = db.execute(text("SELECT id, email, username, riot_id, region, is_active, is_verified, created_at FROM users"))
    users = result.fetchall()

    if users:
        print(f"{'ID':<3} {'Email':<25} {'Username':<15} {'Riot ID':<20} {'Region':<6} {'Active':<6} {'Verified':<8} {'Created':<19}")
        print("-" * 110)
        for user in users:
            created_str = str(user[7])[:19] if user[7] else "N/A"
            print(f"{user[0]:<3} {user[1]:<25} {user[2]:<15} {str(user[3] or 'N/A'):<20} {str(user[4] or 'N/A'):<6} {user[5]!s:<6} {user[6]!s:<8} {created_str:<19}")
    else:
        print("No users found")

    db.close()

if __name__ == "__main__":
    main()