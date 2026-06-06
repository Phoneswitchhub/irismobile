'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';

export type TabName = 'shop' | 'search' | 'cart' | 'mypage';

interface BottomNavProps {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  cartCount: number;
}

export default function BottomNav({ activeTab, setActiveTab, cartCount }: BottomNavProps) {
  const { t } = useTranslation();

  return (
    <div className="tab-bar">
      <div 
        className={`tab-item ${activeTab === 'shop' ? 'active' : ''}`} 
        onClick={() => setActiveTab('shop')}
      >
        <span className="tab-item-icon">🛍️</span>
        <span>{t('tab_shop')}</span>
      </div>

      <div 
        className={`tab-item ${activeTab === 'search' ? 'active' : ''}`} 
        onClick={() => setActiveTab('search')}
      >
        <span className="tab-item-icon">🔍</span>
        <span>{t('tab_search')}</span>
      </div>

      <div 
        className={`tab-item ${activeTab === 'cart' ? 'active' : ''}`} 
        onClick={() => setActiveTab('cart')}
        style={{ position: 'relative' }}
      >
        <span className="tab-item-icon">🛒</span>
        <span>{t('tab_cart')}</span>
        {cartCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '25%',
            background: 'var(--red)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 800,
            borderRadius: '50%',
            width: '15px',
            height: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #fff'
          }}>
            {cartCount}
          </span>
        )}
      </div>

      <div 
        className={`tab-item ${activeTab === 'mypage' ? 'active' : ''}`} 
        onClick={() => setActiveTab('mypage')}
      >
        <span className="tab-item-icon">👤</span>
        <span>{t('tab_mypage')}</span>
      </div>
    </div>
  );
}
