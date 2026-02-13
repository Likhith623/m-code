from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from app.database import supabase, supabase_admin
from app.routes.auth import get_current_user
from typing import Optional
from uuid import uuid4
import base64

router = APIRouter(prefix="/upload", tags=["File Upload"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    bucket: str = Form(..., description="Bucket name: avatars, store-images, or medicine-images"),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload an image to Supabase Storage.
    Supported buckets: avatars, store-images, medicine-images
    """
    allowed_buckets = ["avatars", "store-images", "medicine-images"]
    
    if bucket not in allowed_buckets:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bucket. Must be one of: {', '.join(allowed_buckets)}"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Must be one of: {', '.join(allowed_types)}"
        )
    
    # Limit file size (5MB)
    max_size = 5 * 1024 * 1024
    content = await file.read()
    
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 5MB"
        )
    
    try:
        # Generate unique filename
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{current_user['id']}/{uuid4()}.{ext}"
        
        # Upload to Supabase Storage
        result = supabase_admin.storage.from_(bucket).upload(
            filename,
            content,
            {"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase_admin.storage.from_(bucket).get_public_url(filename)
        
        return {
            "message": "Image uploaded successfully",
            "url": public_url,
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.delete("/image")
async def delete_image(
    bucket: str,
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an image from Supabase Storage"""
    allowed_buckets = ["avatars", "store-images", "medicine-images"]
    
    if bucket not in allowed_buckets:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bucket. Must be one of: {', '.join(allowed_buckets)}"
        )
    
    # Verify ownership (filename should start with user's ID)
    if not filename.startswith(current_user["id"]):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this file"
        )
    
    try:
        supabase_admin.storage.from_(bucket).remove([filename])
        return {"message": "Image deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete image: {str(e)}"
        )
