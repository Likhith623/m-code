from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from app.database import supabase, supabase_admin
from app.schemas import (
    MedicineCreate, MedicineUpdate, MedicineResponse,
    MedicineSearchRequest, MedicineSearchResult,
    CategoryResponse
)
from app.routes.auth import get_current_user
from typing import List, Optional
from uuid import UUID
from math import radians, sin, cos, sqrt, atan2

router = APIRouter(prefix="/medicines", tags=["Medicines"])


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad, lon1_rad = radians(lat1), radians(lon1)
    lat2_rad, lon2_rad = radians(lat2), radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


@router.get("/search", response_model=List[MedicineSearchResult])
async def search_medicines(
    query: str = Query(..., min_length=2, description="Medicine name to search"),
    latitude: float = Query(..., ge=-90, le=90, description="User's latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="User's longitude"),
    radius_km: float = Query(default=10, ge=1, le=100, description="Search radius in km"),
    current_user: Optional[dict] = None
):
    """
    Search for medicines near user's location.
    Returns medicines sorted by distance to nearest store.
    """
    try:
        # Search medicines by name (case-insensitive)
        medicines_result = supabase.table("medicines").select(
            "*, stores!inner(*)"
        ).or_(
            f"name.ilike.%{query}%,generic_name.ilike.%{query}%"
        ).eq("is_available", True).gt("quantity", 0).eq("stores.is_open", True).execute()
        
        results = []
        
        for item in medicines_result.data:
            store = item.get("stores", {})
            if not store:
                continue
            
            store_lat = float(store.get("latitude", 0))
            store_lon = float(store.get("longitude", 0))
            
            distance = calculate_distance(latitude, longitude, store_lat, store_lon)
            
            if distance <= radius_km:
                results.append(MedicineSearchResult(
                    medicine_id=item["id"],
                    medicine_name=item["name"],
                    generic_name=item.get("generic_name"),
                    price=item["price"],
                    quantity=item["quantity"],
                    image_url=item.get("image_url"),
                    store_id=store["id"],
                    store_name=store["store_name"],
                    store_address=store["address"],
                    store_lat=store_lat,
                    store_lon=store_lon,
                    store_phone=store["phone"],
                    distance_km=round(distance, 2)
                ))
        
        # Sort by distance
        results.sort(key=lambda x: x.distance_km)
        
        # Log search if user is authenticated
        if current_user:
            try:
                supabase.table("search_history").insert({
                    "user_id": current_user["id"],
                    "search_query": query,
                    "user_latitude": latitude,
                    "user_longitude": longitude,
                    "results_count": len(results)
                }).execute()
            except:
                pass  # Don't fail if logging fails
        
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories():
    """Get all medicine categories"""
    try:
        result = supabase.table("medicine_categories").select("*").execute()
        return [CategoryResponse(**cat) for cat in result.data]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch categories: {str(e)}"
        )


@router.get("/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(medicine_id: UUID):
    """Get a specific medicine by ID"""
    try:
        result = supabase.table("medicines").select("*").eq("id", str(medicine_id)).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found"
            )
        
        return MedicineResponse(**result.data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch medicine: {str(e)}"
        )


@router.put("/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: UUID,
    medicine_data: MedicineUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a medicine (store owner only)"""
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "retailer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only retailers can update medicines"
        )
    
    try:
        # Get the medicine and verify ownership
        medicine = supabase.table("medicines").select("*, stores(owner_id)").eq("id", str(medicine_id)).single().execute()
        
        if not medicine.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found"
            )
        
        store = medicine.data.get("stores", {})
        if store.get("owner_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't own this medicine's store"
            )
        
        update_data = medicine_data.model_dump(exclude_unset=True)
        
        # Convert date to string
        if update_data.get("expiry_date"):
            update_data["expiry_date"] = update_data["expiry_date"].isoformat()
        
        # Convert UUID to string
        if update_data.get("category_id"):
            update_data["category_id"] = str(update_data["category_id"])
        
        result = supabase.table("medicines").update(update_data).eq("id", str(medicine_id)).execute()
        
        return MedicineResponse(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update medicine: {str(e)}"
        )


@router.delete("/{medicine_id}")
async def delete_medicine(
    medicine_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Delete a medicine (store owner only)"""
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "retailer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only retailers can delete medicines"
        )
    
    try:
        # Get the medicine and verify ownership
        medicine = supabase.table("medicines").select("*, stores(owner_id)").eq("id", str(medicine_id)).single().execute()
        
        if not medicine.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found"
            )
        
        store = medicine.data.get("stores", {})
        if store.get("owner_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't own this medicine's store"
            )
        
        supabase.table("medicines").delete().eq("id", str(medicine_id)).execute()
        
        return {"message": "Medicine deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete medicine: {str(e)}"
        )


@router.get("/retailer/inventory", response_model=List[MedicineResponse])
async def get_retailer_inventory(
    current_user: dict = Depends(get_current_user),
    store_id: Optional[UUID] = Query(default=None)
):
    """Get all medicines for a retailer's stores"""
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "retailer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only retailers can access inventory"
        )
    
    try:
        # Get retailer's stores
        stores_query = supabase.table("stores").select("id").eq("owner_id", current_user["id"])
        
        if store_id:
            stores_query = stores_query.eq("id", str(store_id))
        
        stores = stores_query.execute()
        store_ids = [s["id"] for s in stores.data]
        
        if not store_ids:
            return []
        
        # Get all medicines for these stores
        all_medicines = []
        for sid in store_ids:
            result = supabase.table("medicines").select("*").eq("store_id", sid).execute()
            all_medicines.extend(result.data)
        
        return [MedicineResponse(**med) for med in all_medicines]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch inventory: {str(e)}"
        )


@router.get("/retailer/low-stock", response_model=List[MedicineResponse])
async def get_low_stock_medicines(current_user: dict = Depends(get_current_user)):
    """Get medicines that are low on stock"""
    profile = current_user.get("profile")
    if not profile or profile.get("role") != "retailer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only retailers can access this"
        )
    
    try:
        # Get retailer's stores
        stores = supabase.table("stores").select("id").eq("owner_id", current_user["id"]).execute()
        store_ids = [s["id"] for s in stores.data]
        
        if not store_ids:
            return []
        
        # Get low stock medicines
        low_stock = []
        for sid in store_ids:
            result = supabase.table("medicines").select("*").eq("store_id", sid).execute()
            for med in result.data:
                if med["quantity"] <= med["min_stock_alert"]:
                    low_stock.append(med)
        
        return [MedicineResponse(**med) for med in low_stock]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch low stock: {str(e)}"
        )
