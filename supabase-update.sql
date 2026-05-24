-- ============================================================
-- IRIS MOBILE - Supabase Database Schema Update (Migration)
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 1. PROFILES 테이블 컬럼 추가
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS partner_type TEXT DEFAULT 'partner' CHECK (partner_type IN ('subsidiary', 'partner')),
  ADD COLUMN IF NOT EXISTS location_province TEXT DEFAULT 'Bangkok',
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS location_coords TEXT,
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'parent_payment' CHECK (payout_method IN ('parent_payment', 'cod_commission'));

-- 2. PRODUCTS 테이블 컬럼 추가
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Used' CHECK (condition IN ('New', 'Used S', 'Used A', 'Used B'));

-- 3. ORDERS 테이블 컬럼 추가
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'online' CHECK (payment_method IN ('online', 'cod')),
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'completed')),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- 4. 기본 더미 데이터 업데이트 및 협력사 생성 (테스트용)
-- 이 쿼리를 통해 기존 프로필 중 관리자를 제외한 프로필들을 적절히 업데이트할 수 있습니다.
-- 예: 아이리스 모바일 자회사 프로필 예시 업데이트
UPDATE public.profiles
SET 
  partner_type = 'subsidiary',
  location_province = 'Bangkok',
  location_address = 'MBK Center 4th Floor, Bangkok',
  payout_method = 'parent_payment'
WHERE role = 'seller' AND (store_name LIKE '%Iris%' OR store_name IS NULL);

-- ============================================================
-- 5. RLS 관리자 권한 복구 정책 추가
-- 관리자 검사용 SECURITY DEFINER 함수 생성 (RLS 무한 재귀 호출 방지용)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profiles 테이블에 관리자 정책 추가
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (public.is_admin());

-- products 테이블에 관리자 정책 추가
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE
  USING (public.is_admin());

-- orders 테이블에 관리자 정책 추가
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE
  USING (public.is_admin());
