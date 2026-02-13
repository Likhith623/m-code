from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.database import supabase, supabase_admin
from app.schemas import (
    StoreCreate, StoreUpdate, StoreResponse,
    MedicineCreate, MedicineUpdate, MedicineResponse,
    RetailerDashboardStats
)
from app.routes.auth import get_current_user
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/stores", tags=["Stores"])


def verify_retailer(current_user: dict):
    """Verify that the current user is a retailer"""
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "retailer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only retailers can perform this action"
        )
    return current_user


@router.post("/", response_model=StoreResponse)
async def create_store(
    store_data: StoreCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new store (retailers only)"""
    verify_retailer(current_user)
    
    try:
        data = store_data.model_dump()
        data["owner_id"] = current_user["id"]
        
        # Convert time objects to strings
        if data.get("opening_time"):
            data["opening_time"] = data["opening_time"].isoformat()
        if data.get("closing_time"):
            data["closing_time"] = data["closing_time"].isoformat()
        
        result = supabase.table("stores").insert(data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create store"
            )
        
        return StoreResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create store: {str(e)}"
        )


@router.get("/my-stores", response_model=List[StoreResponse])
async def get_my_stores(current_user: dict = Depends(get_current_user)):
    """Get all stores owned by the current retailer"""
    verify_retailer(current_user)
    
    try:
        result = supabase.table("stores").select("*").eq("owner_id", current_user["id"]).execute()
        return [StoreResponse(**store) for store in result.data]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch stores: {str(e)}"
        )


@router.get("/nearby")
async def get_nearby_stores(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=10, ge=1, le=100)
):
    """Get stores near a location"""
    try:
        # Fetch all open stores
        result = supabase.table("stores").select("*").eq("is_open", True).execute()
        
        stores = []
        for store in result.data:
            # Calculate distance using Haversine formula
            from math import radians, sin, cos, sqrt, atan2
            
            R = 6371  # Earth's radius in km
            lat1, lon1 = radians(latitude), radians(longitude)
            lat2, lon2 = radians(float(store["latitude"])), radians(float(store["longitude"]))
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            distance = R * c
            
            if distance <= radius_km:
                store["distance_km"] = round(distance, 2)
                stores.append(store)
        
        # Sort by distance
        stores.sort(key=lambda x: x["distance_km"])
        
        return stores
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch nearby stores: {str(e)}"
        )


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(store_id: UUID):
    """Get a specific store by ID"""
    try:
        result = supabase.table("stores").select("*").eq("id", str(store_id)).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found"
            )
        
        return StoreResponse(**result.data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch store: {str(e)}"
        )


@router.put("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: UUID,
    store_data: StoreUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a store (owner only)"""
    verify_retailer(current_user)
    
    try:
        # Verify ownership
        existing = supabase.table("stores").select("owner_id").eq("id", str(store_id)).single().execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found"
            )
        
        if existing.data["owner_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't own this store"
            )
        
        update_data = store_data.model_dump(exclude_unset=True)
        
        # Convert time objects to strings
        if update_data.get("opening_time"):
            update_data["opening_time"] = update_data["opening_time"].isoformat()
        if update_data.get("closing_time"):
            update_data["closing_time"] = update_data["closing_time"].isoformat()
        
        result = supabase.table("stores").update(update_data).eq("id", str(store_id)).execute()
        
        return StoreResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update store: {str(e)}"
        )


@router.delete("/{store_id}")
async def delete_store(
    store_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a store (owner only)"""
    verify_retailer(current_user)
    
    try:
        # Verify ownership
        existing = supabase.table("stores").select("owner_id").eq("id", str(store_id)).single().execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found"
            )
        
        if existing.data["owner_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't own this store"
            )
        
        supabase.table("stores").delete().eq("id", str(store_id)).execute()
        
        return {"message": "Store deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete store: {str(e)}"
        )


# ============= Medicine Routes within Store =============

@router.get("/{store_id}/medicines", response_model=List[MedicineResponse])
async def get_store_medicines(
    store_id: UUID,
    available_only: bool = Query(default=False)
):
    """Get all medicines in a store"""
    try:
        query = supabase.table("medicines").select("*").eq("store_id", str(store_id))
        
        if available_only:
            query = query.eq("is_available", True).gt("quantity", 0)
        
        result = query.execute()
        
        return [MedicineResponse(**med) for med in result.data]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch medicines: {str(e)}"
        )


@router.post("/{store_id}/medicines", response_model=MedicineResponse)
async def add_medicine(
    store_id: UUID,
    medicine_data: MedicineCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a medicine to a store (owner only)"""
    verify_retailer(current_user)
    
    try:
        # Verify store ownership
        store = supabase.table("stores").select("owner_id").eq("id", str(store_id)).single().execute()
        
        if not store.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found"
            )
        
        if store.data["owner_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't own this store"
            )
        
        data = medicine_data.model_dump()
        data["store_id"] = str(store_id)
        
        # Convert date to string
        if data.get("expiry_date"):
            data["expiry_date"] = data["expiry_date"].isoformat()
        
        # Convert UUID to string
        if data.get("category_id"):
            data["category_id"] = str(data["category_id"])
        
        result = supabase.table("medicines").insert(data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to add medicine"
            )
        
        return MedicineResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to add medicine: {str(e)}"
        )


# ============= Dashboard Stats =============

@router.get("/dashboard/stats", response_model=RetailerDashboardStats)
async def get_retailer_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics for retailer"""
    verify_retailer(current_user)
    
    try:
        # Get all stores
        stores = supabase.table("stores").select("id").eq("owner_id", current_user["id"]).execute()
        store_ids = [s["id"] for s in stores.data]
        
        total_medicines = 0
        low_stock_count = 0
        
        if store_ids:
            # Get medicines count
            for store_id in store_ids:
                medicines = supabase.table("medicines").select("quantity, min_stock_alert").eq("store_id", store_id).execute()
                total_medicines += len(medicines.data)
                
                for med in medicines.data:
                    if med["quantity"] <= med["min_stock_alert"]:
                        low_stock_count += 1
        
        return RetailerDashboardStats(
            total_medicines=total_medicines,
            low_stock_count=low_stock_count,
            total_stores=len(store_ids),
            total_views=0  # Would need analytics tracking
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch stats: {str(e)}"
        )
