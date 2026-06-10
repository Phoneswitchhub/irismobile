-- Migration to add settings_role_permissions table
-- Run this in the Supabase SQL Editor to manage custom role-based permissions in the database.

CREATE TABLE IF NOT EXISTS public.settings_role_permissions (
    role text PRIMARY KEY,
    can_view_margin boolean DEFAULT false,
    can_view_margin_detail boolean DEFAULT false,
    can_edit_price boolean DEFAULT false,
    can_edit_cost boolean DEFAULT false,
    can_edit_battery boolean DEFAULT false,
    can_edit_core_device_fields boolean DEFAULT false,
    can_approve_sale boolean DEFAULT false,
    can_edit_customer_info boolean DEFAULT false
);

COMMENT ON TABLE public.settings_role_permissions IS '스태프 등급별 권한 정의 테이블';

-- Insert default role permissions
INSERT INTO public.settings_role_permissions (role, can_view_margin, can_view_margin_detail, can_edit_price, can_edit_cost, can_edit_battery, can_edit_core_device_fields, can_approve_sale, can_edit_customer_info)
VALUES 
  ('admin', true, true, true, true, true, true, true, true),
  ('manager', true, false, true, true, true, false, false, false),
  ('staff', false, false, false, false, false, false, false, false)
ON CONFLICT (role) DO NOTHING;
