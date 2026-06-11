-- ============================================================
-- IRIS MOBILE - Expense & Category Management Setup SQL
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 1. 지출 카테고리 테이블 생성
CREATE TABLE IF NOT EXISTS public.sheets_expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('large', 'medium', 'small')),
    parent_id UUID REFERENCES public.sheets_expense_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 지출 내역 테이블 생성
CREATE TABLE IF NOT EXISTS public.sheets_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.sheets_expense_categories(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    expense_date TEXT NOT NULL, -- YYYY-MM-DD
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.sheets_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets_expenses ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (인증된 직원은 모든 작업 허용, 조회는 누구나)
CREATE POLICY "expense_categories_select_all" ON public.sheets_expense_categories FOR SELECT USING (true);
CREATE POLICY "expense_categories_all_auth" ON public.sheets_expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "expenses_select_all" ON public.sheets_expenses FOR SELECT USING (true);
CREATE POLICY "expenses_all_auth" ON public.sheets_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 기본 카테고리 데이터 삽입 (대분류 -> 중분류 -> 소분류 순)
-- 대분류 삽입
INSERT INTO public.sheets_expense_categories (id, name, level, parent_id) VALUES 
('10000000-0000-0000-0000-000000000000', '매장 운영비', 'large', NULL),
('20000000-0000-0000-0000-000000000000', '기기 매입비', 'large', NULL)
ON CONFLICT (id) DO NOTHING;

-- 중분류 삽입
INSERT INTO public.sheets_expense_categories (id, name, level, parent_id) VALUES 
('11000000-0000-0000-0000-000000000000', '임대료', 'medium', '10000000-0000-0000-0000-000000000000'),
('12000000-0000-0000-0000-000000000000', '공과금', 'medium', '10000000-0000-0000-0000-000000000000'),
('13000000-0000-0000-0000-000000000000', '인건비', 'medium', '10000000-0000-0000-0000-000000000000'),
('21000000-0000-0000-0000-000000000000', '본사 송금', 'medium', '20000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- 소분류 삽입
INSERT INTO public.sheets_expense_categories (id, name, level, parent_id) VALUES 
('11100000-0000-0000-0000-000000000000', '월세', 'small', '11000000-0000-0000-0000-000000000000'),
('11200000-0000-0000-0000-000000000000', '보증금', 'small', '11000000-0000-0000-0000-000000000000'),
('12100000-0000-0000-0000-000000000000', '전기세', 'small', '12000000-0000-0000-0000-000000000000'),
('12200000-0000-0000-0000-000000000000', '수도세', 'small', '12000000-0000-0000-0000-000000000000'),
('12300000-0000-0000-0000-000000000000', '인터넷', 'small', '12000000-0000-0000-0000-000000000000'),
('13100000-0000-0000-0000-000000000000', '급여', 'small', '13000000-0000-0000-0000-000000000000'),
('21100000-0000-0000-0000-000000000000', '기기 대금', 'small', '21000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;
