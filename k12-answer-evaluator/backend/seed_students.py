"""Seeding sample students script"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def seed():
    db = SessionLocal()
    try:
        students = [
            {
                "email": "aarav.sharma@example.com",
                "name": "Aarav Sharma",
                "grade": "Grade 10",
                "parent_code": "AARAV1"
            },
            {
                "email": "diya.patel@example.com",
                "name": "Diya Patel",
                "grade": "Grade 12",
                "parent_code": "DIYA12"
            },
            {
                "email": "kabir.singh@example.com",
                "name": "Kabir Singh",
                "grade": "Grade 8",
                "parent_code": "KABIR8"
            }
        ]
        
        for s in students:
            # Check if student exists
            existing = db.query(User).filter(User.email == s["email"]).first()
            if existing:
                print(f"Student {s['name']} already exists. Updating details...")
                existing.full_name = s["name"]
                existing.grade = s["grade"]
                existing.parent_access_code = s["parent_code"]
                existing.role = UserRole.STUDENT
            else:
                print(f"Creating student {s['name']}...")
                user = User(
                    email=s["email"],
                    password_hash=get_password_hash("password123"),
                    full_name=s["name"],
                    role=UserRole.STUDENT,
                    grade=s["grade"],
                    parent_access_code=s["parent_code"]
                )
                db.add(user)
        
        db.commit()
        print("\n✅ Seed completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding students: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
