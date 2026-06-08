-- ============================================================
-- IRIS MOBILE - Supabase Database Schema Update (Installment Number)
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

ALTER TABLE public.sheets_inventory 
  ADD COLUMN IF NOT EXISTS installment_number TEXT;
