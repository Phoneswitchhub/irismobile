-- Migration to add deposit_limit column to profiles table
-- Run this in the Supabase SQL Editor to enable deposit limits for consignment partners.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deposit_limit NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.profiles.deposit_limit IS 'Consignment partner deposit limit in THB (보증금 한도)';
