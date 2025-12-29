from typing import Optional
from minio import Minio
from datetime import timedelta
import uuid
from app.config import settings


class MediaService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL
        )
        self.bucket = settings.MINIO_BUCKET

    def ensure_bucket(self):
        """Ensure the bucket exists."""
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def generate_upload_url(
        self,
        filename: str,
        content_type: str = "application/octet-stream",
        expires: int = 3600
    ) -> dict:
        """Generate a presigned URL for uploading."""
        # Generate a unique object name
        ext = filename.split('.')[-1] if '.' in filename else ''
        object_name = f"uploads/{uuid.uuid4()}.{ext}" if ext else f"uploads/{uuid.uuid4()}"

        try:
            self.ensure_bucket()
            url = self.client.presigned_put_object(
                self.bucket,
                object_name,
                expires=timedelta(seconds=expires)
            )
            return {
                "upload_url": url,
                "object_name": object_name,
                "public_url": f"http://{settings.MINIO_ENDPOINT}/{self.bucket}/{object_name}"
            }
        except Exception as e:
            return {"error": str(e)}

    def generate_download_url(
        self,
        object_name: str,
        expires: int = 3600
    ) -> Optional[str]:
        """Generate a presigned URL for downloading."""
        try:
            return self.client.presigned_get_object(
                self.bucket,
                object_name,
                expires=timedelta(seconds=expires)
            )
        except Exception:
            return None

    def delete_object(self, object_name: str) -> bool:
        """Delete an object from storage."""
        try:
            self.client.remove_object(self.bucket, object_name)
            return True
        except Exception:
            return False


media_service = MediaService()
