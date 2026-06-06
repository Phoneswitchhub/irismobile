-- ============================================================
-- IRIS MOBILE - Supabase Database Schema Update
-- (Logistics, Buyer Actions & Automatic DB-Level Stock Trigger)
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 1. orders 테이블에 송장 회사 및 송장 번호 컬럼 추가
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_company TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 2. 구매자가 자신의 주문 상태를 업데이트(구매 확정/반송 거절)할 수 있도록 RLS 정책 생성
DROP POLICY IF EXISTS "orders_update_buyer" ON public.orders;
CREATE POLICY "orders_update_buyer" ON public.orders 
  FOR UPDATE 
  USING (auth.uid() = buyer_id);

-- 3. 주문 발생(INSERT) 및 취소(UPDATE to cancelled) 시 
--    재고 차감/복구 및 품절 상태 전환을 자동으로 수행하는 SECURITY DEFINER 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.manage_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock INT;
  v_current_status TEXT;
BEGIN
  -- 1) 신규 주문 신청 시 (INSERT): 재고 차감 및 품절 처리
  IF (TG_OP = 'INSERT') THEN
    -- 최신 상품 재고 및 상태 조회
    SELECT stock, status INTO v_current_stock, v_current_status 
    FROM public.products 
    WHERE id = NEW.product_id;
    
    -- 재고가 부족하거나 이미 판매중이 아니면 오류 발생 (주문 트랜잭션 롤백)
    IF v_current_status != 'active' OR v_current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'This product is out of stock or already sold.';
    END IF;
    
    -- 재고 차감 및 0 이하인 경우 품절(sold) 처리
    UPDATE public.products 
    SET 
      stock = GREATEST(0, v_current_stock - NEW.quantity),
      status = CASE WHEN (v_current_stock - NEW.quantity) <= 0 THEN 'sold' ELSE 'active' END
    WHERE id = NEW.product_id;
  
  -- 2) 주문 상태 변경 시 (UPDATE)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- 주문이 'cancelled'(취소/반송) 상태로 변경되었을 때 재고 복구
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      SELECT stock, status INTO v_current_stock, v_current_status 
      FROM public.products 
      WHERE id = NEW.product_id;
      
      -- 재고를 돌려놓고, 품절(sold)이었던 경우 다시 판매중(active)으로 변경
      UPDATE public.products 
      SET 
        stock = v_current_stock + NEW.quantity,
        status = CASE WHEN v_current_status = 'sold' THEN 'active' ELSE v_current_status END
      WHERE id = NEW.product_id;
      
    -- 취소되었던 주문이 다시 일반 상태로 원복될 때 (혹은 관리자 재처리 등) 재고 재차감
    ELSIF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
      SELECT stock, status INTO v_current_stock, v_current_status 
      FROM public.products 
      WHERE id = NEW.product_id;
      
      IF v_current_status != 'active' OR v_current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'This product is out of stock or already sold.';
      END IF;
      
      UPDATE public.products 
      SET 
        stock = GREATEST(0, v_current_stock - NEW.quantity),
        status = CASE WHEN (v_current_stock - NEW.quantity) <= 0 THEN 'sold' ELSE 'active' END
      WHERE id = NEW.product_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 트리거 생성
DROP TRIGGER IF EXISTS trg_manage_stock_on_order ON public.orders;
CREATE TRIGGER trg_manage_stock_on_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_stock_on_order();
