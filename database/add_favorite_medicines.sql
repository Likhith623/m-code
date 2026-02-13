-- =====================================================
-- ADD FAVORITE MEDICINES TABLE
-- =====================================================
-- Run this script in Supabase SQL Editor to add
-- favorite medicines functionality
-- =====================================================

-- Create the favorite_medicines table
CREATE TABLE IF NOT EXISTS favorite_medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL, -- Store name for quick access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, medicine_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_favorite_medicines_user ON favorite_medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_medicines_medicine ON favorite_medicines(medicine_id);

-- Enable Row Level Security
ALTER TABLE favorite_medicines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorite_medicines

-- Users can view their own favorite medicines
CREATE POLICY "Users can view own favorite medicines"
ON favorite_medicines
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own favorite medicines
CREATE POLICY "Users can add own favorite medicines"
ON favorite_medicines
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorite medicines
CREATE POLICY "Users can delete own favorite medicines"
ON favorite_medicines
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- Grant permissions to authenticated users
-- =====================================================
GRANT SELECT, INSERT, DELETE ON favorite_medicines TO authenticated;

-- =====================================================
-- VERIFICATION: Check if table was created
-- =====================================================
-- Run this to verify:
-- SELECT * FROM favorite_medicines LIMIT 5;
