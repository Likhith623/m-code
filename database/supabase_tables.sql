-- =====================================================
-- EMERGENCY MEDICINE LOCATOR - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to create all tables
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 1. USER PROFILES TABLE
-- Stores both customers and retailers in one table
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'retailer')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- =====================================================
-- 2. STORES TABLE
-- Stores pharmacy/shop information for retailers
-- =====================================================
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    license_number VARCHAR(100),
    store_image_url TEXT,
    is_open BOOLEAN DEFAULT TRUE,
    opening_time TIME DEFAULT '09:00:00',
    closing_time TIME DEFAULT '21:00:00',
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(2, 1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for location-based queries
CREATE INDEX idx_stores_location ON stores(latitude, longitude);
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_stores_city ON stores(city);
CREATE INDEX idx_stores_is_open ON stores(is_open);

-- =====================================================
-- 3. MEDICINE CATEGORIES TABLE
-- Categories for organizing medicines
-- =====================================================
CREATE TABLE IF NOT EXISTS medicine_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO medicine_categories (name, description) VALUES
    ('Pain Relief', 'Painkillers and analgesics'),
    ('Antibiotics', 'Antibacterial medications'),
    ('Antacids', 'Digestive and stomach medicines'),
    ('Cardiovascular', 'Heart and blood pressure medicines'),
    ('Diabetes', 'Insulin and diabetes management'),
    ('Respiratory', 'Asthma and respiratory medicines'),
    ('Vitamins & Supplements', 'Nutritional supplements'),
    ('First Aid', 'Bandages, antiseptics, etc.'),
    ('Allergy', 'Antihistamines and allergy relief'),
    ('Fever & Cold', 'Cold, cough, and fever medicines'),
    ('Eye & Ear', 'Eye drops and ear medicines'),
    ('Skin Care', 'Dermatological products'),
    ('Emergency', 'Emergency and life-saving drugs'),
    ('Others', 'Miscellaneous medicines')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. MEDICINES INVENTORY TABLE
-- Stores medicine inventory for each store
-- =====================================================
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES medicine_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    manufacturer VARCHAR(255),
    description TEXT,
    dosage VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'strips',
    expiry_date DATE,
    batch_number VARCHAR(100),
    requires_prescription BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    min_stock_alert INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for medicine searches
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_medicines_store ON medicines(store_id);
CREATE INDEX idx_medicines_category ON medicines(category_id);
CREATE INDEX idx_medicines_available ON medicines(is_available);
CREATE INDEX idx_medicines_search ON medicines USING gin(to_tsvector('english', name || ' ' || COALESCE(generic_name, '')));

-- =====================================================
-- 5. SEARCH HISTORY TABLE
-- Track user searches for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    search_query VARCHAR(255) NOT NULL,
    user_latitude DECIMAL(10, 8),
    user_longitude DECIMAL(11, 8),
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_query ON search_history(search_query);

-- =====================================================
-- 6. FAVORITES TABLE
-- Users can save favorite stores
-- =====================================================
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, store_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- =====================================================
-- 7. REVIEWS TABLE
-- Customer reviews for stores
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, store_id)
);

CREATE INDEX idx_reviews_store ON reviews(store_id);

-- =====================================================
-- 8. NOTIFICATIONS TABLE
-- Store notifications for users
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- =====================================================
-- 9. MEDICINE ALERTS TABLE
-- Users can set alerts for medicine availability
-- =====================================================
CREATE TABLE IF NOT EXISTS medicine_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    user_latitude DECIMAL(10, 8),
    user_longitude DECIMAL(11, 8),
    radius_km INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_medicine_alerts_user ON medicine_alerts(user_id);
CREATE INDEX idx_medicine_alerts_active ON medicine_alerts(is_active);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_alerts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Stores policies
CREATE POLICY "Anyone can view stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Retailers can insert own stores" ON stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Retailers can update own stores" ON stores FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Retailers can delete own stores" ON stores FOR DELETE USING (auth.uid() = owner_id);

-- Medicines policies
CREATE POLICY "Anyone can view available medicines" ON medicines FOR SELECT USING (true);
CREATE POLICY "Store owners can insert medicines" ON medicines FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()));
CREATE POLICY "Store owners can update medicines" ON medicines FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()));
CREATE POLICY "Store owners can delete medicines" ON medicines FOR DELETE 
    USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()));

-- Categories policies
CREATE POLICY "Anyone can view categories" ON medicine_categories FOR SELECT USING (true);

-- Search history policies
CREATE POLICY "Users can view own search history" ON search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Medicine alerts policies
CREATE POLICY "Users can view own alerts" ON medicine_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON medicine_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON medicine_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON medicine_alerts FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON medicines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update store rating when review is added
CREATE OR REPLACE FUNCTION update_store_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stores SET
        rating = (SELECT AVG(rating)::DECIMAL(2,1) FROM reviews WHERE store_id = COALESCE(NEW.store_id, OLD.store_id)),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE store_id = COALESCE(NEW.store_id, OLD.store_id))
    WHERE id = COALESCE(NEW.store_id, OLD.store_id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_store_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_store_rating();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for auto-creating profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate distance between two points (in km)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in km
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN R * c;
END;
$$ language 'plpgsql';

-- Function to search medicines near user location
CREATE OR REPLACE FUNCTION search_medicines_nearby(
    search_term VARCHAR,
    user_lat DECIMAL,
    user_lon DECIMAL,
    radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
    medicine_id UUID,
    medicine_name VARCHAR,
    generic_name VARCHAR,
    price DECIMAL,
    quantity INTEGER,
    image_url TEXT,
    store_id UUID,
    store_name VARCHAR,
    store_address TEXT,
    store_lat DECIMAL,
    store_lon DECIMAL,
    store_phone VARCHAR,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as medicine_id,
        m.name as medicine_name,
        m.generic_name,
        m.price,
        m.quantity,
        m.image_url,
        s.id as store_id,
        s.store_name,
        s.address as store_address,
        s.latitude as store_lat,
        s.longitude as store_lon,
        s.phone as store_phone,
        calculate_distance(user_lat, user_lon, s.latitude, s.longitude) as distance_km
    FROM medicines m
    JOIN stores s ON m.store_id = s.id
    WHERE 
        m.is_available = true
        AND m.quantity > 0
        AND s.is_open = true
        AND (
            m.name ILIKE '%' || search_term || '%'
            OR m.generic_name ILIKE '%' || search_term || '%'
        )
        AND calculate_distance(user_lat, user_lon, s.latitude, s.longitude) <= radius_km
    ORDER BY distance_km ASC;
END;
$$ language 'plpgsql';

-- =====================================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- =====================================================
-- Note: Create these buckets in Supabase Storage:
-- 1. 'avatars' - For user profile pictures
-- 2. 'store-images' - For store photos
-- 3. 'medicine-images' - For medicine photos

-- Storage policies (run in SQL editor):
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('store-images', 'store-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('medicine-images', 'medicine-images', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for store images
CREATE POLICY "Store images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'store-images');
CREATE POLICY "Retailers can upload store images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-images');
CREATE POLICY "Retailers can update store images" ON storage.objects FOR UPDATE USING (bucket_id = 'store-images');
CREATE POLICY "Retailers can delete store images" ON storage.objects FOR DELETE USING (bucket_id = 'store-images');

-- Storage policies for medicine images
CREATE POLICY "Medicine images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'medicine-images');
CREATE POLICY "Retailers can upload medicine images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'medicine-images');
CREATE POLICY "Retailers can update medicine images" ON storage.objects FOR UPDATE USING (bucket_id = 'medicine-images');
CREATE POLICY "Retailers can delete medicine images" ON storage.objects FOR DELETE USING (bucket_id = 'medicine-images');
