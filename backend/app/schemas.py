from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date, time
from uuid import UUID
from enum import Enum


class UserRole(str, Enum):
    CUSTOMER = "customer"
    RETAILER = "retailer"


# ============= Auth Schemas =============
class UserSignUp(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER


class UserSignIn(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    created_at: datetime


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ============= Store Schemas =============
class StoreCreate(BaseModel):
    store_name: str = Field(..., min_length=2)
    description: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    phone: str
    email: Optional[EmailStr] = None
    license_number: Optional[str] = None
    store_image_url: Optional[str] = None
    opening_time: Optional[time] = None
    closing_time: Optional[time] = None


class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    license_number: Optional[str] = None
    store_image_url: Optional[str] = None
    is_open: Optional[bool] = None
    opening_time: Optional[time] = None
    closing_time: Optional[time] = None


class StoreResponse(BaseModel):
    id: UUID
    owner_id: UUID
    store_name: str
    description: Optional[str] = None
    address: str
    city: str
    state: str
    pincode: str
    latitude: float
    longitude: float
    phone: str
    email: Optional[str] = None
    license_number: Optional[str] = None
    store_image_url: Optional[str] = None
    is_open: bool
    opening_time: Optional[time] = None
    closing_time: Optional[time] = None
    is_verified: bool
    rating: float
    total_reviews: int
    created_at: datetime
    distance_km: Optional[float] = None


# ============= Medicine Schemas =============
class MedicineCreate(BaseModel):
    store_id: UUID
    category_id: Optional[UUID] = None
    name: str = Field(..., min_length=2)
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    dosage: Optional[str] = None
    price: float = Field(..., gt=0)
    quantity: int = Field(..., ge=0)
    unit: str = "strips"
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None
    requires_prescription: bool = False
    image_url: Optional[str] = None
    min_stock_alert: int = 10


class MedicineUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = None
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    dosage: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None
    requires_prescription: Optional[bool] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    min_stock_alert: Optional[int] = None


class MedicineResponse(BaseModel):
    id: UUID
    store_id: UUID
    category_id: Optional[UUID] = None
    name: str
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    dosage: Optional[str] = None
    price: float
    quantity: int
    unit: str
    expiry_date: Optional[date] = None
    batch_number: Optional[str] = None
    requires_prescription: bool
    image_url: Optional[str] = None
    is_available: bool
    min_stock_alert: int
    created_at: datetime
    updated_at: datetime


class MedicineSearchResult(BaseModel):
    medicine_id: UUID
    medicine_name: str
    generic_name: Optional[str] = None
    price: float
    quantity: int
    image_url: Optional[str] = None
    store_id: UUID
    store_name: str
    store_address: str
    store_lat: float
    store_lon: float
    store_phone: str
    distance_km: float


# ============= Category Schemas =============
class CategoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None


# ============= Search Schemas =============
class MedicineSearchRequest(BaseModel):
    query: str = Field(..., min_length=2)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10, ge=1, le=100)


# ============= Review Schemas =============
class ReviewCreate(BaseModel):
    store_id: UUID
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    user_id: UUID
    store_id: UUID
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None


# ============= Favorite Schemas =============
class FavoriteResponse(BaseModel):
    id: UUID
    user_id: UUID
    store_id: UUID
    store: Optional[StoreResponse] = None
    created_at: datetime


# ============= Notification Schemas =============
class NotificationResponse(BaseModel):
    id: UUID
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime


# ============= Alert Schemas =============
class MedicineAlertCreate(BaseModel):
    medicine_name: str
    latitude: float
    longitude: float
    radius_km: int = 10


class MedicineAlertResponse(BaseModel):
    id: UUID
    user_id: UUID
    medicine_name: str
    user_latitude: float
    user_longitude: float
    radius_km: int
    is_active: bool
    created_at: datetime


# ============= Dashboard Stats =============
class RetailerDashboardStats(BaseModel):
    total_medicines: int
    low_stock_count: int
    total_stores: int
    total_views: int


class CustomerDashboardStats(BaseModel):
    total_searches: int
    favorite_stores: int
    active_alerts: int
