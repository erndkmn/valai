"""
Database migration script to add new columns for token tracking feature.
Run this once to update existing database schema.
"""
import sqlite3
import os

DB_PATH = "valai.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found. It will be created on server start.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    
    # Add subscription_tier column if missing
    if "subscription_tier" not in columns:
        print("Adding subscription_tier column to users table...")
        cursor.execute('ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT "free"')
        print("Done.")
    else:
        print("subscription_tier column already exists.")
    
    # Create token_usage table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS token_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            tokens_used INTEGER DEFAULT 0 NOT NULL,
            request_count INTEGER DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE (user_id, year, month)
        )
    """)
    print("token_usage table ready.")
    
    # Create index
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS ix_token_usage_user_period 
        ON token_usage (user_id, year, month)
    """)
    print("Index created.")
    
    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
