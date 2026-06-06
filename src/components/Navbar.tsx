'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface NavbarProps {
  onLogoClick?: () => void;
}

export default function Navbar({ onLogoClick }: NavbarProps) {
  const { lang, changeLanguage, t } = useTranslation();

  return (
    <nav className="navbar">
      <div 
        onClick={onLogoClick} 
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        className="nav-logo"
      >
        <div className="nav-logo-icon">💎</div>
        <span className="nav-logo-text">{t('app_title')}</span>
      </div>
      <div className="nav-links">
        <select 
          value={lang} 
          onChange={(e) => changeLanguage(e.target.value as any)} 
          className="lang-select"
        >
          <option value="th">🇹🇭 TH</option>
          <option value="mm">🇲🇲 MM</option>
          <option value="ko">🇰🇷 KO</option>
          <option value="en">🇺🇸 EN</option>
        </select>
      </div>
    </nav>
  );
}
