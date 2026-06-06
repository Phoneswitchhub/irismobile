-- ============================================================
-- IRIS MOBILE - Supabase Database Chat Media Storage & RLS Setup
-- Supabase 대시보드 → SQL Editor에서 이 SQL을 실행하세요
-- ============================================================

-- 1. chat_messages 테이블에 메시지 타입 컬럼 추가 (기존 text 기본값)
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video'));

-- 2. chat_media 스토리지 버킷 생성 (공개 버킷)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_media', 'chat_media', true) 
ON CONFLICT DO NOTHING;

-- 3. chat_media 스토리지 RLS 정책 설정
-- 3-1. 누구나 채팅 미디어 다운로드 가능 (공개 조회)
DROP POLICY IF EXISTS "chat_media_storage_select" ON storage.objects;
CREATE POLICY "chat_media_storage_select" ON storage.objects 
  FOR SELECT USING (bucket_id = 'chat_media');

-- 3-2. 로그인한 유저(구매자/판매자)만 채팅 미디어 업로드 가능
DROP POLICY IF EXISTS "chat_media_storage_insert" ON storage.objects;
CREATE POLICY "chat_media_storage_insert" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'chat_media' AND 
    auth.role() = 'authenticated'
  );

-- 3-3. 본인이 올린 미디어 또는 관리자(Admin)가 미디어 삭제 가능
-- (auth.uid()와 owner의 타입 불일치 에러 해결을 위해 양쪽 모두 ::text 캐스팅 적용)
DROP POLICY IF EXISTS "chat_media_storage_delete" ON storage.objects;
CREATE POLICY "chat_media_storage_delete" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'chat_media' AND 
    (
      (auth.uid()::text = owner::text) OR 
      (public.is_admin())
    )
  );

-- 4. chat_messages 테이블에 관리자 삭제 RLS 정책 추가
-- (기존 select/insert 정책 외에 admin이 메시지 자체를 삭제할 수 있도록 허용)
DROP POLICY IF EXISTS "messages_delete_admin" ON public.chat_messages;
CREATE POLICY "messages_delete_admin" ON public.chat_messages
  FOR DELETE USING (public.is_admin());
