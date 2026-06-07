'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { POLICY_TRANSLATIONS } from '@/lib/policyTranslations';
import MobileLayout from '@/components/MobileLayout';
import Navbar from '@/components/Navbar';

export default function RefundPolicyPage() {
  const router = useRouter();
  const { lang } = useTranslation();
  const policy = POLICY_TRANSLATIONS[lang] || POLICY_TRANSLATIONS['th'];

  const backText = lang === 'ko' 
    ? '돌아가기' 
    : lang === 'th' 
      ? 'ย้อนกลับ' 
      : lang === 'mm' 
        ? 'နောက်သို့' 
        : 'Back';

  return (
    <MobileLayout paddingBottom="40px">
      <Navbar onLogoClick={() => router.push('/')} />
      
      <div style={{ padding: '16px', color: 'var(--t1)' }}>
        <button 
          onClick={() => router.push('/')}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: 'var(--t2)',
            borderRadius: '12px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'inherit'
          }}
        >
          ← {backText}
        </button>

        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 800, 
          marginBottom: '12px', 
          background: 'var(--gp)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          fontFamily: "'Outfit', sans-serif" 
        }}>
          {policy.refund_title}
        </h1>
        
        <p style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          {policy.refund_intro}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--cyan)' }}>
              {policy.refund_sec1_title}
            </h2>
            <p style={{ color: 'var(--t2)', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
              {policy.refund_sec1_content}
            </p>
          </div>
          
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--cyan)' }}>
              {policy.refund_sec2_title}
            </h2>
            <p style={{ color: 'var(--t2)', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
              {policy.refund_sec2_content}
            </p>
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--cyan)' }}>
              {policy.refund_sec3_title}
            </h2>
            <p style={{ color: 'var(--t2)', fontSize: '13.5px', lineHeight: '1.6', margin: 0 }}>
              {policy.refund_sec3_content}
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
