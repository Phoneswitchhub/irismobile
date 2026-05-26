-- ============================================================
-- IRIS MOBILE - Supabase Database Chat Admin RLS Setup
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 1. chat_rooms 테이블에 관리자(Admin) RLS 정책 추가
DROP POLICY IF EXISTS "rooms_select_admin" ON public.chat_rooms;
CREATE POLICY "rooms_select_admin" ON public.chat_rooms
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "rooms_delete_admin" ON public.chat_rooms;
CREATE POLICY "rooms_delete_admin" ON public.chat_rooms
  FOR DELETE USING (public.is_admin());
