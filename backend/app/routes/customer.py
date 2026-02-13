from fastapi import APIRouter, HTTPException, Depends, Query
from app.database import supabase
from app.schemas import (
    ReviewCreate, ReviewResponse,
    FavoriteResponse, NotificationResponse,
    MedicineAlertCreate, MedicineAlertResponse,
    CustomerDashboardStats
)
from app.routes.auth import get_current_user
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/customer", tags=["Customer"])


def verify_customer(current_user: dict):
    """Verify that the current user is a customer"""
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customers can perform this action"
        )
    return current_user


# ============= Reviews =============

@router.post("/reviews", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a store"""
    verify_customer(current_user)
    
    try:
        data = {
            "user_id": current_user["id"],
            "store_id": str(review_data.store_id),
            "rating": review_data.rating,
            "comment": review_data.comment
        }
        
        result = supabase.table("reviews").insert(data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create review")
        
        review = result.data[0]
        review["user_name"] = current_user["profile"].get("full_name")
        
        return ReviewResponse(**review)
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="You have already reviewed this store")
        raise HTTPException(status_code=400, detail=f"Failed to create review: {str(e)}")


@router.get("/reviews", response_model=List[ReviewResponse])
async def get_my_reviews(current_user: dict = Depends(get_current_user)):
    """Get all reviews by the current user"""
    verify_customer(current_user)
    
    try:
        result = supabase.table("reviews").select("*").eq("user_id", current_user["id"]).execute()
        return [ReviewResponse(**r, user_name=current_user["profile"].get("full_name")) for r in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch reviews: {str(e)}")


@router.get("/stores/{store_id}/reviews", response_model=List[ReviewResponse])
async def get_store_reviews(store_id: UUID):
    """Get all reviews for a store"""
    try:
        result = supabase.table("reviews").select("*, profiles(full_name)").eq("store_id", str(store_id)).execute()
        
        reviews = []
        for r in result.data:
            profile = r.pop("profiles", {})
            r["user_name"] = profile.get("full_name") if profile else None
            reviews.append(ReviewResponse(**r))
        
        return reviews
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch reviews: {str(e)}")


# ============= Favorites =============

@router.post("/favorites/{store_id}")
async def add_favorite(
    store_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Add a store to favorites"""
    verify_customer(current_user)
    
    try:
        data = {
            "user_id": current_user["id"],
            "store_id": str(store_id)
        }
        
        supabase.table("favorites").insert(data).execute()
        return {"message": "Store added to favorites"}
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="Store already in favorites")
        raise HTTPException(status_code=400, detail=f"Failed to add favorite: {str(e)}")


@router.delete("/favorites/{store_id}")
async def remove_favorite(
    store_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Remove a store from favorites"""
    verify_customer(current_user)
    
    try:
        supabase.table("favorites").delete().eq("user_id", current_user["id"]).eq("store_id", str(store_id)).execute()
        return {"message": "Store removed from favorites"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to remove favorite: {str(e)}")


@router.get("/favorites", response_model=List[FavoriteResponse])
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Get all favorite stores"""
    verify_customer(current_user)
    
    try:
        result = supabase.table("favorites").select("*, stores(*)").eq("user_id", current_user["id"]).execute()
        
        favorites = []
        for f in result.data:
            store_data = f.pop("stores", None)
            fav = FavoriteResponse(**f)
            if store_data:
                from app.schemas import StoreResponse
                fav.store = StoreResponse(**store_data)
            favorites.append(fav)
        
        return favorites
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch favorites: {str(e)}")


# ============= Notifications =============

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(default=False),
    current_user: dict = Depends(get_current_user)
):
    """Get user notifications"""
    try:
        query = supabase.table("notifications").select("*").eq("user_id", current_user["id"])
        
        if unread_only:
            query = query.eq("is_read", False)
        
        result = query.order("created_at", desc=True).execute()
        
        return [NotificationResponse(**n) for n in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch notifications: {str(e)}")


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        supabase.table("notifications").update({"is_read": True}).eq("id", str(notification_id)).eq("user_id", current_user["id"]).execute()
        return {"message": "Notification marked as read"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update notification: {str(e)}")


@router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    try:
        supabase.table("notifications").update({"is_read": True}).eq("user_id", current_user["id"]).execute()
        return {"message": "All notifications marked as read"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update notifications: {str(e)}")


# ============= Medicine Alerts =============

@router.post("/alerts", response_model=MedicineAlertResponse)
async def create_medicine_alert(
    alert_data: MedicineAlertCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create an alert for medicine availability"""
    verify_customer(current_user)
    
    try:
        data = {
            "user_id": current_user["id"],
            "medicine_name": alert_data.medicine_name,
            "user_latitude": alert_data.latitude,
            "user_longitude": alert_data.longitude,
            "radius_km": alert_data.radius_km
        }
        
        result = supabase.table("medicine_alerts").insert(data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create alert")
        
        return MedicineAlertResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create alert: {str(e)}")


@router.get("/alerts", response_model=List[MedicineAlertResponse])
async def get_my_alerts(current_user: dict = Depends(get_current_user)):
    """Get all medicine alerts for current user"""
    verify_customer(current_user)
    
    try:
        result = supabase.table("medicine_alerts").select("*").eq("user_id", current_user["id"]).execute()
        return [MedicineAlertResponse(**a) for a in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch alerts: {str(e)}")


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a medicine alert"""
    verify_customer(current_user)
    
    try:
        supabase.table("medicine_alerts").delete().eq("id", str(alert_id)).eq("user_id", current_user["id"]).execute()
        return {"message": "Alert deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete alert: {str(e)}")


# ============= Search History =============

@router.get("/search-history")
async def get_search_history(
    limit: int = Query(default=10, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get user's search history"""
    try:
        result = supabase.table("search_history").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).limit(limit).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch search history: {str(e)}")


# ============= Dashboard Stats =============

@router.get("/dashboard/stats", response_model=CustomerDashboardStats)
async def get_customer_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics for customer"""
    verify_customer(current_user)
    
    try:
        # Count searches
        searches = supabase.table("search_history").select("id", count="exact").eq("user_id", current_user["id"]).execute()
        
        # Count favorites
        favorites = supabase.table("favorites").select("id", count="exact").eq("user_id", current_user["id"]).execute()
        
        # Count active alerts
        alerts = supabase.table("medicine_alerts").select("id", count="exact").eq("user_id", current_user["id"]).eq("is_active", True).execute()
        
        return CustomerDashboardStats(
            total_searches=searches.count or 0,
            favorite_stores=favorites.count or 0,
            active_alerts=alerts.count or 0
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch stats: {str(e)}")
