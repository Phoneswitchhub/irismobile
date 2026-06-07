'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { THAILAND_PROVINCES, Province, District } from '@/lib/addresses';
import { formatPrice } from '@/lib/utils';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutItems: any[];
  onSubmit: (orderData: any, slipFile: File | null) => Promise<void>;
}

export default function OrderModal({
  isOpen,
  onClose,
  checkoutItems,
  onSubmit
}: OrderModalProps) {
  const { t } = useTranslation();

  const isSingleItem = checkoutItems.length === 1;
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [carrier, setCarrier] = useState('Flash Express');
  
  // Address selection
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState<District[]>([]);
  const [addressDetail, setAddressDetail] = useState('');
  const [notes, setNotes] = useState('');

  // Slip upload
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-modal for prompt
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setPaymentMethod('online');
      setCarrier('Flash Express');
      setSelectedProvince('');
      setSelectedDistrict('');
      setAddressDetail('');
      setNotes('');
      setSlipFile(null);
      setSlipPreview(null);
      setIsSubmitting(false);
      setShowPrompt(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrict('');
      return;
    }
    const provData = THAILAND_PROVINCES.find(p => p.name_en === selectedProvince);
    if (provData) {
      setDistricts(provData.districts);
    } else {
      setDistricts([]);
    }
    setSelectedDistrict('');
  }, [selectedProvince]);

  if (!isOpen || checkoutItems.length === 0) return null;

  // Total price calculation
  const totalItemAmount = checkoutItems.reduce((sum, item) => {
    const qty = isSingleItem ? quantity : (item.quantity || 1);
    return sum + (item.price * qty);
  }, 0);

  const deposit3 = Math.round(totalItemAmount * 0.03);
  const balance97 = totalItemAmount - deposit3;

  const copyAccount = () => {
    navigator.clipboard.writeText('220-2-61971-4');
    alert(t('toast_account_copied'));
  };

  const openBankApp = (scheme: string, pkg: string, iosId: string) => {
    const isIOS = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
    if (isIOS) {
      const start = Date.now();
      const timer = setTimeout(() => {
        // Only redirect to App Store if the page remains in the foreground (app didn't open)
        if (document.hasFocus() && Date.now() - start < 3000) {
          window.location.href = `https://apps.apple.com/app/id${iosId}`;
        }
      }, 2500);

      // Clear the timer if the page is hidden (meaning the app was successfully opened)
      const clearTimer = () => {
        clearTimeout(timer);
        window.removeEventListener('pagehide', clearTimer);
        window.removeEventListener('visibilitychange', clearTimer);
      };
      window.addEventListener('pagehide', clearTimer);
      window.addEventListener('visibilitychange', clearTimer);

      window.location.href = `${scheme}://`;
    } else {
      window.location.href = `intent://#Intent;scheme=${scheme};package=${pkg};end`;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerOrderSubmit = () => {
    if (!selectedProvince) {
      alert(t('toast_province_required'));
      return;
    }
    if (!selectedDistrict) {
      alert(t('toast_district_required'));
      return;
    }
    if (!addressDetail.trim()) {
      alert(t('toast_address_required'));
      return;
    }

    if (paymentMethod === 'online' && !slipFile) {
      // Trigger prompt
      setShowPrompt(true);
    } else if (paymentMethod === 'cod' && !slipFile) {
      // Trigger prompt for COD 3% deposit
      setShowPrompt(true);
    } else {
      // Submit immediately with slip
      executeSubmit(slipFile);
    }
  };

  const executeSubmit = async (selectedSlip: File | null) => {
    setIsSubmitting(true);
    try {
      const orderPayload = {
        quantity: isSingleItem ? quantity : null,
        payment_method: paymentMethod,
        carrier: paymentMethod === 'online' ? carrier : 'COD Delivery',
        province: selectedProvince,
        district: selectedDistrict,
        address: addressDetail.trim(),
        notes: notes.trim(),
        total_price: totalItemAmount,
      };
      await onSubmit(orderPayload, selectedSlip);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      setShowPrompt(false);
    }
  };

  return (
    <>
      <div className="modal-bg open" onClick={onClose} style={{ display: 'flex', zIndex: 3000 }}>
        <div 
          className="modal animate-slide-up" 
          style={{ maxWidth: '480px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-hd" style={{ marginBottom: '16px' }}>
            <span className="modal-title">{t('order_title')}</span>
            <button className="modal-x" onClick={onClose}>✕</button>
          </div>

          {/* Product Info Summary */}
          <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
            {checkoutItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: idx < checkoutItems.length - 1 ? '8px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={item.images?.[0] || '/placeholder.png'} alt={item.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px' }}>{item.title}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--t2)' }}>{formatPrice(item.price)}</span>
                  </div>
                </div>
                {!isSingleItem && (
                  <span style={{ fontWeight: 700 }}>x {item.quantity || 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* Quantity selector (Single item only) */}
          {isSingleItem && (
            <div className="form-group">
              <label className="form-label">{t('order_qty')}</label>
              <input 
                type="number" 
                className="form-input" 
                value={quantity} 
                min={1} 
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
              />
            </div>
          )}

          {/* Payment Method selector */}
          <div className="form-group">
            <label className="form-label">{t('order_payment')}</label>
            <div className="payment-methods">
              <div 
                className={`pay-opt ${paymentMethod === 'online' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('online')}
              >
                <div className="pay-opt-radio" />
                <div className="pay-opt-label">{t('order_pay_online')}</div>
              </div>
              <div 
                className={`pay-opt ${paymentMethod === 'cod' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <div className="pay-opt-radio" />
                <div className="pay-opt-label">{t('order_pay_cod')}</div>
              </div>
            </div>
          </div>

          {/* Carrier (Online payment only) */}
          {paymentMethod === 'online' && (
            <div className="form-group">
              <label className="form-label">{t('select_carrier_label')}</label>
              <select 
                className="form-select" 
                value={carrier} 
                onChange={(e) => setCarrier(e.target.value)}
              >
                <option value="Flash Express">⚡ Flash Express</option>
                <option value="KEX (Kerry Express)">📦 KEX (Kerry Express)</option>
                <option value="Thailand Post">📮 Thailand Post</option>
                <option value="J&T Express">🚚 J&T Express</option>
              </select>
            </div>
          )}

          {/* Address Fields */}
          <div className="form-group">
            <label className="form-label">{t('order_province')}</label>
            <select 
              className="form-select"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
            >
              <option value="">{t('select_province')}</option>
              {THAILAND_PROVINCES.map((p) => (
                <option key={p.id} value={p.name_en}>
                  {p.name_en} ({p.name_th})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('order_district')}</label>
            <select 
              className="form-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedProvince}
            >
              <option value="">{t('select_district')}</option>
              {districts.map((d) => (
                <option key={d.id} value={d.name_en}>
                  {d.name_en} ({d.name_th})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('order_detailed_address')}</label>
            <textarea 
              className="form-textarea" 
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder={t('order_address_placeholder')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('order_notes')}</label>
            <textarea 
              className="form-textarea" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Color preference, delivery hours, etc."
            />
          </div>

          {/* Company Bank Box */}
          <div style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: '10px', padding: '12px', fontSize: '11px', lineHeight: '1.5', color: 'var(--t2)', marginBottom: '16px', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--cyan)', marginBottom: '6px' }}>
              {t('bank_title')}
            </div>
            <div>{t('bank_label_bank')}: <b>Kasikornbank (KBank)</b></div>
            <div>{t('bank_label_name')}: <b>Phone Switch Hub</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', background: 'rgba(34,211,238,0.1)', padding: '6px 10px', borderRadius: '4px' }}>
              <div>{t('bank_label_account')}: <b style={{ fontSize: '13px', color: 'var(--cyan)' }}>220-2-61971-4</b></div>
              <button 
                type="button" 
                onClick={copyAccount}
                style={{ background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '10px', fontWeight: 700 }}
              >
                {t('copy_account_btn')}
              </button>
            </div>

            {/* Deep linking buttons */}
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(34,211,238,0.15)', paddingTop: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '10px', color: 'var(--t3)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                태국 송금앱 바로가기 (Open App)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button type="button" className="app-link-btn" style={{ background: '#00A950', color: '#fff', border: 'none' }} onClick={() => openBankApp('kplus', 'com.kasikorn.retail.mbanking.wap', '361117099')}>🟢 K PLUS</button>
                <button type="button" className="app-link-btn" style={{ background: '#4E2A84', color: '#fff', border: 'none' }} onClick={() => openBankApp('scbeasy', 'com.scb.phone', '1081546979')}>🟣 SCB Easy</button>
                <button type="button" className="app-link-btn" style={{ background: '#0056B3', color: '#fff', border: 'none' }} onClick={() => openBankApp('bualuangmbanking', 'com.bbl.mobilebanking', '1454522432')}>🔵 Bangkok</button>
                <button type="button" className="app-link-btn" style={{ background: '#FFC72C', color: '#333', border: 'none' }} onClick={() => openBankApp('krungsri-kma', 'com.krungsri.kma', '1275988185')}>🟡 Krungsri</button>
                <button type="button" className="app-link-btn" style={{ background: '#00A1E4', color: '#fff', border: 'none' }} onClick={() => openBankApp('ktbnext', 'com.ktb.next', '1447190013')}>🔵 Krungthai</button>
                <button type="button" className="app-link-btn" style={{ background: '#FF8200', color: '#fff', border: 'none' }} onClick={() => openBankApp('truemoney', 'th.co.truemoney.wallet', '1150537443')}>🟠 TrueMoney</button>
              </div>
            </div>
          </div>

          {/* Payment Info notice */}
          <div 
            style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '10px', padding: '12px', fontSize: '12px', lineHeight: '1.5', color: 'var(--t2)', marginBottom: '16px' }}
            dangerouslySetInnerHTML={{
              __html: paymentMethod === 'online' 
                ? t('order_online_desc') 
                : t('order_cod_desc', { deposit: deposit3.toLocaleString(), rest: balance97.toLocaleString() })
            }}
          />

          {/* Transfer Slip File Upload */}
          <div className="form-group" style={{ marginTop: '12px', marginBottom: '18px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: 'var(--cyan)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('slip_upload_label')}</span>
              <span style={{ fontSize: '10px', color: 'var(--t3)', fontWeight: 'normal' }}>{t('slip_upload_hint')}</span>
            </label>
            <div 
              style={{ border: '2px dashed rgba(8,145,178,0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(8,145,178,0.03)', position: 'relative' }}
              onClick={() => document.getElementById('orderSlipInput')?.click()}
            >
              {slipPreview ? (
                <img src={slipPreview} alt="Slip Preview" style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
              ) : (
                <>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>📸</div>
                  <div style={{ fontSize: '12px', color: 'var(--t2)', fontWeight: 500 }}>{t('slip_upload_text')}</div>
                </>
              )}
              <input 
                type="file" 
                id="orderSlipInput" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
            </div>
          </div>

          {/* Warning disclaimer text */}
          <div 
            style={{ fontSize: '11px', lineHeight: '1.4', color: 'var(--red)', marginBottom: '18px', background: 'rgba(239,68,68,0.04)', border: '1px dashed rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px' }}
            dangerouslySetInnerHTML={{ __html: t('order_warning_text') }}
          />

          {/* Price Breakdown display */}
          <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{t('order_device_price')}</span>
              <span>{formatPrice(totalItemAmount)}</span>
            </div>
            {paymentMethod === 'cod' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cyan)', fontWeight: 700 }}>
                  <span>{t('order_deposit_3')}</span>
                  <span>{formatPrice(deposit3)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold)', fontWeight: 700 }}>
                  <span>{t('order_cod_balance_97')}</span>
                  <span>{formatPrice(balance97)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cyan)', fontWeight: 700 }}>
                <span>{t('order_total_online')}</span>
                <span>{formatPrice(totalItemAmount)}</span>
              </div>
            )}
          </div>

          <button 
            className="btn-submit" 
            onClick={triggerOrderSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('loading') : (
              paymentMethod === 'online' ? t('btn_submit_order_online') : t('btn_submit_order_cod')
            )}
          </button>

        </div>
      </div>

      {/* SLIP PROMPT DIALOG */}
      {showPrompt && (
        <div className="modal-bg open" style={{ zIndex: 4000, display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '420px', padding: '24px', textAlign: 'center', borderRadius: '22px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💡</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', marginBottom: '10px' }}>
              {t('slip_prompt_title')}
            </div>

            <div style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '10px', padding: '14px', marginBottom: '18px', fontSize: '12.5px', textAlign: 'left', lineHeight: 1.6, color: 'var(--t2)' }}>
              <div>{t('order_total')}: <b>{formatPrice(totalItemAmount)}</b></div>
              {paymentMethod === 'cod' ? (
                <>
                  <div>선입금 예약금 (3%): <b style={{ color: 'var(--cyan)' }}>{formatPrice(deposit3)}</b></div>
                  <div>COD 현장결제 (97%): <b style={{ color: 'var(--gold)' }}>{formatPrice(balance97)}</b></div>
                </>
              ) : (
                <div>선입금 금액 (100%): <b style={{ color: 'var(--cyan)' }}>{formatPrice(totalItemAmount)}</b></div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '22px', lineHeight: '1.5', fontWeight: 500 }}>
              {t('slip_prompt_desc')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="file" 
                id="promptSlipInput" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) executeSubmit(file);
                }} 
              />
              <button 
                className="btn-submit" 
                onClick={() => document.getElementById('promptSlipInput')?.click()}
                style={{ background: 'var(--gp)', margin: 0 }}
              >
                📸 {t('btn_upload_now')}
              </button>
              <button 
                className="btn-submit" 
                onClick={() => executeSubmit(null)}
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border)', color: 'var(--t1)', boxShadow: 'none', margin: 0 }}
              >
                ⏳ {t('btn_upload_later')}
              </button>
              <button 
                onClick={() => setShowPrompt(false)}
                style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '12px', cursor: 'pointer', padding: '6px', fontWeight: 600, textDecoration: 'underline' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
