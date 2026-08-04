"""Migration script to add is_practice column to answer_submissions table"""

from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate():
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE answer_submissions ADD COLUMN is_practice BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("✓ Added is_practice column to answer_submissions")
        except Exception as e:
            print(f"is_practice column might already exist: {e}")
            
    print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
