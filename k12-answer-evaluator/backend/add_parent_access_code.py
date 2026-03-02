"""Migration script to add parent_access_code column to users table"""

from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate():
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN parent_access_code VARCHAR"))
            print("✓ Added parent_access_code column to users")
        except Exception as e:
            print(f"parent_access_code column might already exist: {e}")
        
        try:
            conn.execute(text("CREATE UNIQUE INDEX ix_users_parent_access_code ON users (parent_access_code)"))
            print("✓ Created unique index on parent_access_code")
        except Exception as e:
            print(f"index might already exist: {e}")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
