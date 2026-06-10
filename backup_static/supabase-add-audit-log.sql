-- ============================================================
-- IRIS MOBILE - Supabase Database Schema Update (Audit Logging)
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 1. inventory_audit_log 테이블 생성 (작업이력 감사로그)
CREATE TABLE IF NOT EXISTS public.inventory_audit_log (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    operator_name  TEXT NOT NULL,
    operator_role  TEXT NOT NULL,
    action_type    TEXT NOT NULL, -- 'BULK_IMPORT', 'MANUAL_ADD', 'EDIT_DEVICE', 'EDIT_COST', 'EDIT_PRICE', 'EDIT_BATTERY', 'EDIT_FIELD', 'SELL_DEVICE', 'CANCEL_SALE', 'PARTNER_TRANSFER', 'DELETE_DEVICE', 'RESTORE_DEVICE', 'PERMANENT_DELETE'
    model_name     TEXT,
    imei           TEXT,
    details        TEXT
);

COMMENT ON TABLE public.inventory_audit_log IS '재고 및 판매 정보 상세 변경 감사 로그 테이블';

-- 2. 인덱스 생성 (조회 속도 향상용)
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_created_at ON public.inventory_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_imei ON public.inventory_audit_log (imei);

-- 3. ROW LEVEL SECURITY (RLS) 설정
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. 정책(Policies) 생성 - 누구나 감사로그 조회/등록이 가능하도록 설정
DROP POLICY IF EXISTS "inventory_audit_log_select" ON public.inventory_audit_log;
CREATE POLICY "inventory_audit_log_select" ON public.inventory_audit_log 
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "inventory_audit_log_insert" ON public.inventory_audit_log;
CREATE POLICY "inventory_audit_log_insert" ON public.inventory_audit_log 
    FOR INSERT 
    WITH CHECK (true);
