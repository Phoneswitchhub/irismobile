'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';

interface DetailModalProps {
  product: any;
  onClose: () => void;
  onChat: (product: any) => void;
  onAddToCart: (product: any) => void;
  onBuyNow: (product: any) => void;
  currentUserId: string | null;
}

export default function DetailModal({
  product,
  onClose,
  onChat,
  onAddToCart,
  onBuyNow,
  currentUserId
}: DetailModalProps) {
  const { t } = useTranslation();
  const [activeSlide, setActiveSlide] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    setActiveSlide(0);
    setLightboxIndex(0);
  }, [product]);

  if (!product) return null;

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['/placeholder.png']; // Fallback in case of missing images

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleLightboxPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleLightboxNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const conditionMap: Record<string, string> = {
    'New': t('condition_new'),
    'S': t('condition_s'),
    'A': t('condition_a'),
    'B': t('condition_b'),
  };

  const seller = product.profiles || {};
  const sellerName = seller.store_name || seller.name || '—';
  const sellerLoc = seller.location_province 
    ? `${seller.location_province}${seller.location_district ? ' - ' + seller.location_district : ''}`
    : '—';

  const isOwnProduct = currentUserId === product.seller_id;

  return (
    <>
      <div className="modal-bg open" onClick={onClose} style={{ display: 'flex' }}>
        <div className="modal" style={{ maxWidth: '440px', padding: 0, overflow: 'hidden', borderRadius: '22px' }} onClick={(e) => e.stopPropagation()}>
          
          {/* Header Close button overlay */}
          <div style={{ position: 'relative', width: '100%' }}>
            <button 
              className="modal-x" 
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            {/* Image Slideshow (Carousel) */}
            <div className="detail-carousel-container" style={{ width: '100%', height: '240px', background: 'var(--bg3)', position: 'relative', overflow: 'hidden' }}>
              <div 
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '100%',
                  transform: `translateX(-${activeSlide * 100}%)`,
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {images.map((img: string, idx: number) => (
                  <div 
                    key={idx} 
                    style={{ flexShrink: 0, width: '100%', height: '100%', cursor: 'zoom-in' }}
                    onClick={() => { setLightboxIndex(idx); setShowLightbox(true); }}
                  >
                    <img src={img} alt={`Slide ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevSlide}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      color: '#fff',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      zIndex: 6
                    }}
                  >
                    ◀
                  </button>
                  <button 
                    onClick={handleNextSlide}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      color: '#fff',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      zIndex: 6
                    }}
                  >
                    ▶
                  </button>
                </>
              )}

              {/* Dots indicators */}
              {images.length > 1 && (
                <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 5 }}>
                  {images.map((_: any, idx: number) => (
                    <div 
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: activeSlide === idx ? 'var(--purple)' : 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    />
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* Details Body */}
          <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '45vh', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="badge bg-purple">{product.category}</span>
              <span className="badge bg-green">{conditionMap[product.condition] || product.condition}</span>
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.3, marginBottom: '8px', color: 'var(--t1)' }}>
              {product.title}
            </h2>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 900, color: 'var(--gold)', marginBottom: '12px' }}>
              {formatPrice(product.price)}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {t('detail_desc_title')}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {product.description || t('detail_no_desc')}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '4px' }}>
              <h4 style={{ fontSize: '11px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {t('detail_shop_info_title')}
              </h4>
              <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="s-avatar" style={{ width: '22px', height: '22px', fontSize: '11px', margin: 0 }}>
                    {seller.profile_image ? (
                      <img src={seller.profile_image} alt={sellerName} />
                    ) : (
                      '🏪'
                    )}
                  </div>
                  <strong style={{ color: 'var(--t1)' }}>{sellerName}</strong>
                </div>
                <div style={{ color: 'var(--t2)', fontSize: '11px', marginTop: '2px' }}>📍 {sellerLoc}</div>
                <div style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: 1.3 }}>🏡 {seller.location_address || t('no_address_info')}</div>
                {seller.location_coords && (
                  <div style={{ marginTop: '2px' }}>
                    <a 
                      href={`https://maps.google.com/?q=${seller.location_coords}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="badge bg-blue" 
                      style={{ fontWeight: 700, cursor: 'pointer' }}
                    >
                      🗺️ {t('search_view_map')}
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              className="btn-submit" 
              onClick={() => onChat(product)} 
              style={{ margin: 0, flex: 1, minWidth: '80px', background: 'var(--gg)' }}
              disabled={isOwnProduct}
            >
              💬 {t('btn_chat')}
            </button>
            <button 
              className="btn-submit" 
              onClick={() => onAddToCart(product)} 
              style={{ margin: 0, flex: 1.2, minWidth: '100px', background: 'var(--border2)', color: 'var(--t1)' }}
            >
              🛒 {t('add_to_cart_btn')}
            </button>
            <button 
              className="btn-submit" 
              onClick={() => onBuyNow(product)} 
              style={{ margin: 0, flex: 1.2, minWidth: '100px' }}
            >
              {t('btn_buy')}
            </button>
          </div>

        </div>
      </div>

      {/* LIGHTBOX / ZOOM MODAL */}
      {showLightbox && (
        <div 
          className="modal-bg open" 
          onClick={() => setShowLightbox(false)} 
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', display: 'flex' }}
        >
          <button 
            onClick={() => setShowLightbox(false)} 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10000
            }}
          >
            ✕
          </button>

          {images.length > 1 && (
            <>
              <button 
                onClick={handleLightboxPrev}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '18px',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10000,
                  fontWeight: 'bold'
                }}
              >
                ◀
              </button>
              <button 
                onClick={handleLightboxNext}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '18px',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10000,
                  fontWeight: 'bold'
                }}
              >
                ▶
              </button>
            </>
          )}

          <div style={{ width: '100%', maxWidth: '480px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', margin: '0 auto' }} onClick={() => setShowLightbox(false)}>
            <img 
              src={images[lightboxIndex]} 
              alt="Zoomed" 
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                transform: 'scale(1)',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }} 
            />
          </div>
        </div>
      )}
    </>
  );
}
