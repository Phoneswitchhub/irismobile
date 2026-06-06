-- ============================================================
-- IRIS MOBILE - Supabase Database Chat/Order Admin Setup (Complete)
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 0. orders 테이블에 입금 확인 컬럼 추가 및 기존 데이터 업데이트
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS deposit_confirmed BOOLEAN NOT NULL DEFAULT false;

UPDATE public.orders 
SET deposit_confirmed = true 
WHERE deposit_confirmed IS NULL OR deposit_confirmed = false;

-- RLS 활성화 여부 재확인 (혹시 비활성화되어 있다면 활성화)
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 1. chat_rooms 테이블에 관리자(Admin) RLS 정책 추가
DROP POLICY IF EXISTS "rooms_select_admin" ON public.chat_rooms;
CREATE POLICY "rooms_select_admin" ON public.chat_rooms
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "rooms_delete_admin" ON public.chat_rooms;
CREATE POLICY "rooms_delete_admin" ON public.chat_rooms
  FOR DELETE USING (public.is_admin());


-- 2. chat_messages 테이블에 관리자(Admin) RLS 정책 추가
-- (관리자가 미디어 관리 및 대화 기록 조회를 하기 위해 SELECT 권한이 필수적입니다)
DROP POLICY IF EXISTS "messages_select_admin" ON public.chat_messages;
CREATE POLICY "messages_select_admin" ON public.chat_messages
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "messages_delete_admin" ON public.chat_messages;
CREATE POLICY "messages_delete_admin" ON public.chat_messages
  FOR DELETE USING (public.is_admin());


-- 3. products 테이블에 관리자(Admin) 상품 숨김/수정 RLS 정책 추가
-- (주문 내역이 있어 삭제가 안 되는 상품을 관리자가 '숨김(hidden)' 처리할 수 있도록 UPDATE 권한을 허용합니다)
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE USING (public.is_admin());


-- 4. orders 테이블에 관리자(Admin) 주문 삭제 RLS 정책 추가
-- (관리자가 테스트 주문 등을 정리할 수 있도록 DELETE 권한을 허용합니다)
DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;
CREATE POLICY "orders_delete_admin" ON public.orders
  FOR DELETE USING (public.is_admin());
