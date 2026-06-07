'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface NavbarProps {
  onLogoClick?: () => void;
}

export default function Navbar({ onLogoClick }: NavbarProps) {
  const { lang, changeLanguage, t } = useTranslation();

  return (
    <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          onClick={onLogoClick} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          className="nav-logo"
        >
          <div className="nav-logo-icon">💎</div>
          <span className="nav-logo-text">{t('app_title')}</span>
        </div>

        {/* Inline Flags Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            type="button"
            onClick={() => changeLanguage('ko')}
            style={{ 
              background: 'none', 
              border: lang === 'ko' ? '2px solid var(--cyan)' : '2px solid transparent', 
              borderRadius: '50%', 
              padding: 0,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              transition: 'all 0.2s',
              transform: lang === 'ko' ? 'scale(1.15)' : 'none',
              filter: lang === 'ko' ? 'none' : 'grayscale(30%) opacity(80%)'
            }}
            title="한국어"
          >
            🇰🇷
          </button>
          <button 
            type="button"
            onClick={() => changeLanguage('th')}
            style={{ 
              background: 'none', 
              border: lang === 'th' ? '2px solid var(--cyan)' : '2px solid transparent', 
              borderRadius: '50%', 
              padding: 0,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              transition: 'all 0.2s',
              transform: lang === 'th' ? 'scale(1.15)' : 'none',
              filter: lang === 'th' ? 'none' : 'grayscale(30%) opacity(80%)'
            }}
            title="ภาษาไทย"
          >
            🇹🇭
          </button>
          <button 
            type="button"
            onClick={() => changeLanguage('mm')}
            style={{ 
              background: 'none', 
              border: lang === 'mm' ? '2px solid var(--cyan)' : '2px solid transparent', 
              borderRadius: '50%', 
              padding: 0,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              transition: 'all 0.2s',
              transform: lang === 'mm' ? 'scale(1.15)' : 'none',
              filter: lang === 'mm' ? 'none' : 'grayscale(30%) opacity(80%)'
            }}
            title="မြန်မာဘာသာ"
          >
            🇲🇲
          </button>
          <button 
            type="button"
            onClick={() => changeLanguage('en')}
            style={{ 
              background: 'none', 
              border: lang === 'en' ? '2px solid var(--cyan)' : '2px solid transparent', 
              borderRadius: '50%', 
              padding: 0,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              transition: 'all 0.2s',
              transform: lang === 'en' ? 'scale(1.15)' : 'none',
              filter: lang === 'en' ? 'none' : 'grayscale(30%) opacity(80%)'
            }}
            title="English"
          >
            🇺🇸
          </button>
        </div>
      </div>
    </nav>
  );
}
