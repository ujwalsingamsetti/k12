from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.crud import user as crud_user
from app.api.students import get_my_progress, get_my_submissions, get_submission_details

router = APIRouter(prefix="/parent", tags=["parent"])
security = HTTPBearer()

def get_parent_student(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Validate parent token and return the associated student user."""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    if payload.get("role") != "parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Parent role required."
        )
        
    student_id = payload.get("sub")
    if student_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    student = crud_user.get_user(db, user_id=student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
        
    return student

@router.get("/student-info", response_model=UserResponse)
def get_student_info(student: User = Depends(get_parent_student)):
    """Get basic info about the student for the parent dashboard."""
    return student

@router.get("/progress")
def get_student_progress(db: Session = Depends(get_db), student: User = Depends(get_parent_student)):
    """Get the same progress timeline as the student."""
    return get_my_progress(db=db, student=student)

@router.get("/submissions")
def get_student_submissions(db: Session = Depends(get_db), student: User = Depends(get_parent_student)):
    """Get all submissions for the student."""
    return get_my_submissions(db=db, student=student)

@router.get("/submissions/{submission_id}")
def get_student_submission_details(
    submission_id: str,
    db: Session = Depends(get_db),
    student: User = Depends(get_parent_student)
):
    """Get results of a specific submission for the student."""
    return get_submission_details(submission_id=submission_id, db=db, student=student)

@router.get("/submissions/{submission_id}/image")
def get_parent_submission_image(
    submission_id: str,
    page: int = 0,
    db: Session = Depends(get_db),
    student: User = Depends(get_parent_student)
):
    """Serve original uploaded answer sheet image for the parent."""
    from app.api.students import get_submission_image
    return get_submission_image(submission_id=submission_id, page=page, db=db, student=student)
