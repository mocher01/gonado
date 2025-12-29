from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.models.user import User
from app.services.media import media_service

router = APIRouter()


class UploadUrlRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"


class UploadUrlResponse(BaseModel):
    upload_url: str
    object_name: str
    public_url: str


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    request: UploadUrlRequest,
    current_user: User = Depends(get_current_user)
):
    """Get a presigned URL for uploading media."""
    result = media_service.generate_upload_url(
        request.filename,
        request.content_type
    )
    if "error" in result:
        return {"error": result["error"]}
    return result
