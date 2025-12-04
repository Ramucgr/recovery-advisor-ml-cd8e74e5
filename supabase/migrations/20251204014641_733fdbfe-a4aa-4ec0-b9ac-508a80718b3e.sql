-- Drop the unique constraint on user_id to allow multiple athletes per user
ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS athletes_user_id_key;

-- Add a name field to athletes table so each athlete can have their own name
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS name TEXT;

-- Update RLS policies to allow users to manage their own athletes (no changes needed, they already work correctly)