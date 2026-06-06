-- ============================================================
-- IRIS MOBILE - Supabase Database Slip Upload Update
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- orders 테이블에 입금증 이미지 URL(slip_url) 컬럼 추가
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS slip_url TEXT;
