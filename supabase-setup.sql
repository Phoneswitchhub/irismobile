-- ============================================================
-- IRIS MOBILE - Supabase Database Setup SQL
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 1. PROFILES 테이블 (회원 정보)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'seller', 'buyer')),
  store_name  TEXT,
  profile_image TEXT,
  description TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS 테이블 (상품)
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  price       DECIMAL(12,2) NOT NULL,
  images      TEXT[] DEFAULT '{}',
  category    TEXT DEFAULT 'Other',
  stock       INTEGER DEFAULT 1,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'hidden')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS 테이블 (주문)
CREATE TABLE IF NOT EXISTS public.orders (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id    UUID REFERENCES public.profiles(id) NOT NULL,
  seller_id   UUID REFERENCES public.profiles(id) NOT NULL,
  product_id  UUID REFERENCES public.products(id) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(12,2) NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) 설정
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders    ENABLE ROW LEVEL SECURITY;

-- PROFILES 정책
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- PRODUCTS 정책
CREATE POLICY "products_select_all"   ON public.products FOR SELECT USING (true);
CREATE POLICY "products_insert_seller" ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "products_update_seller" ON public.products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "products_delete_seller" ON public.products FOR DELETE USING (auth.uid() = seller_id);

-- ORDERS 정책
CREATE POLICY "orders_select_own"  ON public.orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "orders_insert_buyer" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "orders_update_seller" ON public.orders FOR UPDATE USING (auth.uid() = seller_id);

-- ============================================================
-- STORAGE BUCKETS (이미지 저장)
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- 스토리지 정책
CREATE POLICY "products_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "products_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "products_storage_update" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "products_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_storage_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ============================================================
-- 완료! Setup complete.
-- ============================================================
