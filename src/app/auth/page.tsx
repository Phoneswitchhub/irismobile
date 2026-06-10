'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { THAILAND_PROVINCES, Province, District } from '@/lib/addresses';
import { phoneToEmail, makePassword, resizeAndCompressImage, ADMIN_PHONE } from '@/lib/utils';
import MobileLayout from '@/components/MobileLayout';
import Navbar from '@/components/Navbar';

export default function AuthPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  
  // Navigation Tabs: 'login' | 'reg'
  const [authTab, setAuthTab] = useState<'login' | 'reg'>('login');
  
  // Login fields
  const [lPhone, setLPhone] = useState('');
  const [lPin, setLPin] = useState<string[]>(['', '', '', '']);
  const [lErr, setLErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Registration fields
  const [rName, setRName] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rPin, setRPin] = useState<string[]>(['', '', '', '']);
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [rErr, setRErr] = useState('');
  const [rOk, setROk] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Seller specific fields
  const [rStore, setRStore] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rCoords, setRCoords] = useState('');
  const [rPayout, setRPayout] = useState('parent_payment');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Cascading Address data
  const [districts, setDistricts] = useState<District[]>([]);

  // Refs for auto-focus PIN boxes
  const lRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const rRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    // If already logged in, redirect
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        redirectByRole(user.id);
      }
    };
    checkUser();
  }, []);

  // Update districts list when province changes
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

  const redirectByRole = async (userId: string) => {
    try {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (!p) {
        setRErr(t('profile_incomplete'));
        setAuthTab('reg');
        return;
      }
      if (p.role === 'admin') router.push('/admin/dashboard');
      else if (p.role === 'seller') router.push('/seller/dashboard');
      else if (p.role === 'staff' || p.role === 'manager') router.push('/staff/dashboard');
      else router.push('/');
    } catch (err) {
      console.error('Redirect failed:', err);
      router.push('/');
    }
  };

  // PIN box input handler
  const handlePinInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    pinType: 'login' | 'reg',
    refs: React.RefObject<HTMLInputElement | null>[]
  ) => {
    const val = e.target.value.replace(/\D/g, '');
    const pinCopy = pinType === 'login' ? [...lPin] : [...rPin];
    
    if (val.length >= 1) {
      const singleDigit = val.substring(0, 1);
      pinCopy[index] = singleDigit;
      if (pinType === 'login') setLPin(pinCopy); else setRPin(pinCopy);

      // Shift focus
      if (index < 3) {
        refs[index + 1].current?.focus();
      }
    }
  };

  // PIN box backspace handler
  const handlePinKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    pinType: 'login' | 'reg',
    refs: React.RefObject<HTMLInputElement | null>[]
  ) => {
    if (e.key === 'Backspace') {
      const pinCopy = pinType === 'login' ? [...lPin] : [...rPin];
      if (!pinCopy[index] && index > 0) {
        refs[index - 1].current?.focus();
        pinCopy[index - 1] = '';
      } else {
        pinCopy[index] = '';
      }
      if (pinType === 'login') setLPin(pinCopy); else setRPin(pinCopy);
    }
  };

  // Auto-focus PIN boxes when phone number length reaches 10 digits
  const handlePhoneInput = (val: string, type: 'login' | 'reg') => {
    const clean = val.replace(/\D/g, '');
    if (type === 'login') {
      setLPhone(clean);
      if (clean.length >= 10) lRefs[0].current?.focus();
    } else {
      setRPhone(clean);
      if (clean.length >= 10) rRefs[0].current?.focus();
    }
  };

  // Login handler
  const doLogin = async () => {
    const phone = lPhone.replace(/\D/g, '');
    const pin = lPin.join('');

    if (phone.length < 8) {
      setLErr(t('err_phone_length'));
      return;
    }
    if (pin.length !== 4) {
      setLErr(t('err_pin_length'));
      return;
    }
    setLErr('');
    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(phone),
        password: makePassword(pin, phone),
      });

      if (error) {
        setLErr(t('err_login_failed'));
        setLoginLoading(false);
        return;
      }

      if (data.user) {
        await redirectByRole(data.user.id);
      }
    } catch (err: any) {
      setLErr(t('error_occurred') + (err.message || err.toString()));
      setLoginLoading(false);
    }
  };

  // Auto-submit login on 4th PIN digit
  useEffect(() => {
    if (authTab === 'login' && lPin.every(digit => digit !== '')) {
      doLogin();
    }
  }, [lPin]);

  // Registration handler
  const doRegister = async () => {
    const name = rName.trim();
    const phone = rPhone.replace(/\D/g, '');
    const pin = rPin.join('');

    setRErr('');
    setROk('');

    if (!name) {
      setRErr(t('toast_name_required'));
      return;
    }
    if (phone.length < 8) {
      setRErr(t('err_phone_length'));
      return;
    }
    if (pin.length !== 4) {
      setRErr(t('err_pin_setup'));
      return;
    }

    if (role === 'seller') {
      if (!rStore.trim()) {
        setRErr(t('toast_store_required'));
        return;
      }
      if (!selectedProvince) {
        setRErr(t('toast_province_required'));
        return;
      }
      if (!selectedDistrict) {
        setRErr(t('toast_district_required'));
        return;
      }
      if (!rAddress.trim()) {
        setRErr(t('toast_address_required'));
        return;
      }
    }

    setRegLoading(true);
    try {
      const isAdmin = !!(ADMIN_PHONE && phone === ADMIN_PHONE);
      let userId: string | null = null;

      // Check current session or register a new user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && phoneToEmail(phone) === currentUser.email) {
        userId = currentUser.id;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: phoneToEmail(phone),
          password: makePassword(pin, phone),
        });

        if (error) {
          if (error.message.includes('already')) {
            const { data: existingProfile } = await supabase.from('profiles').select('id').eq('phone', phone).maybeSingle();
            if (existingProfile) {
              setRegLoading(false);
              setRErr(t('err_phone_exists'));
              return;
            } else {
              // Sign in to continue configuration
              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: phoneToEmail(phone),
                password: makePassword(pin, phone),
              });
              if (signInError) {
                setRegLoading(false);
                setRErr(t('err_registering'));
                return;
              }
              userId = signInData.user.id;
            }
          } else {
            setRegLoading(false);
            setRErr(error.message);
            return;
          }
        } else {
          userId = data.user?.id || null;
        }
      }

      if (!userId) {
        setRegLoading(false);
        setRErr('Could not create account');
        return;
      }

      // Logo upload if seller
      let logoUrl: string | null = null;
      if (role === 'seller' && logoFile) {
        const compressedFile = await resizeAndCompressImage(logoFile, 400, 0.8);
        const filePath = `avatars/${userId}_logo.jpg`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, compressedFile, { upsert: true });
        
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          logoUrl = urlData.publicUrl;
        }
      }

      // Profile details
      const profileData: any = {
        id: userId,
        phone,
        name,
        role: isAdmin ? 'admin' : role,
        store_name: rStore.trim() || null,
        profile_image: logoUrl,
        is_approved: role === 'buyer' || isAdmin,
      };

      if (role === 'seller') {
        profileData.partner_type = 'partner';
        profileData.location_province = selectedProvince;
        profileData.location_district = selectedDistrict;
        profileData.location_address = rAddress.trim();
        profileData.location_coords = rCoords.trim() || null;
        profileData.payout_method = rPayout;
        profileData.commission_rate = 10.00;
        profileData.description = t('verified_partner_desc');
      }

      const { error: pe } = await supabase.from('profiles').insert(profileData);
      setRegLoading(false);

      if (pe) {
        setRErr(t('error_occurred') + pe.message);
        return;
      }

      // Log seller registration
      if (role === 'seller' && !isAdmin) {
        try {
          await supabase.from('inventory_audit_log').insert({
            operator_name: name || '신규 가맹점(New Seller)',
            operator_role: 'seller',
            action_type: 'CREATE_SELLER',
            model_name: null,
            imei: null,
            details: `가맹점 신규 등록 신청 완료 (상호명: ${rStore.trim() || '미기입'})`
          });
        } catch (logErr) {
          console.error('Failed to log seller registration:', logErr);
        }
      }

      if (role === 'seller' && !isAdmin) {
        setROk(t('register_completed'));
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        await redirectByRole(userId);
      }
    } catch (err: any) {
      setRegLoading(false);
      setRErr(t('error_occurred') + (err.message || err.toString()));
    }
  };

  return (
    <MobileLayout paddingBottom="20px">
      <Navbar onLogoClick={() => router.push('/')} />

      <div className="auth-wrap" style={{ minHeight: 'calc(100vh - 88px)' }}>
        <div className="auth-card" style={{ margin: 0, width: '100%', border: 'none', background: 'transparent', boxShadow: 'none' }}>
          
          {/* Logo Title */}
          <div className="auth-logo">
            <div className="icon">💎</div>
            <h1>{t('app_title')}</h1>
            <p>{t('login_subtitle')}</p>
          </div>

          {/* Form tab selector */}
          <div className="auth-tabs">
            <button 
              className={`tab-btn ${authTab === 'login' ? 'active' : ''}`}
              onClick={() => setAuthTab('login')}
            >
              {t('login')}
            </button>
            <button 
              className={`tab-btn ${authTab === 'reg' ? 'active' : ''}`}
              onClick={() => setAuthTab('reg')}
            >
              {t('register')}
            </button>
          </div>

          {/* ===== LOGIN FORM ===== */}
          {authTab === 'login' && (
            <div>
              <div className="form-group">
                <label className="form-label">{t('phone_number')}</label>
                <div className="phone-row">
                  <div className="cc">🇹🇭 +66</div>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={lPhone}
                    onChange={(e) => handlePhoneInput(e.target.value, 'login')}
                    placeholder="812345678" 
                    maxLength={10} 
                    inputMode="numeric" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('login_pin_label')}</label>
                <div className="pin-row">
                  {lPin.map((val, idx) => (
                    <input 
                      key={idx}
                      ref={lRefs[idx]}
                      type="password" 
                      className="pin-box" 
                      value={val}
                      onChange={(e) => handlePinInput(e, idx, 'login', lRefs)}
                      onKeyDown={(e) => handlePinKeyDown(e, idx, 'login', lRefs)}
                      maxLength={1} 
                      inputMode="numeric" 
                    />
                  ))}
                </div>
              </div>

              {lErr && <div className="err" style={{ marginBottom: '12px' }}>{lErr}</div>}
              
              <button 
                className="btn-submit" 
                onClick={doLogin} 
                disabled={loginLoading}
              >
                {loginLoading ? t('loading') : t('login')}
              </button>

              <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--t2)' }}>
                {t('no_account')}{' '}
                <span 
                  style={{ color: 'var(--purple-l)', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => setAuthTab('reg')}
                >
                  {t('register')}
                </span>
              </p>
            </div>
          )}

          {/* ===== REGISTER FORM ===== */}
          {authTab === 'reg' && (
            <div>
              <div className="form-group">
                <label className="form-label">{t('register_name_label')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  placeholder="Hong Gil Dong" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('phone_number')}</label>
                <div className="phone-row">
                  <div className="cc">🇹🇭 +66</div>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={rPhone}
                    onChange={(e) => handlePhoneInput(e.target.value, 'reg')}
                    placeholder="812345678" 
                    maxLength={10} 
                    inputMode="numeric" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('register_role_label')}</label>
                <div className="role-grid">
                  <div 
                    className={`role-opt ${role === 'buyer' ? 'sel' : ''}`}
                    onClick={() => setRole('buyer')}
                  >
                    <div className="role-icon">🛍️</div>
                    <div className="role-name">{t('role_buyer')}</div>
                    <div className="role-hint">{t('role_buyer_desc')}</div>
                  </div>
                  <div 
                    className={`role-opt ${role === 'seller' ? 'sel' : ''}`}
                    onClick={() => setRole('seller')}
                  >
                    <div className="role-icon">💼</div>
                    <div className="role-name">{t('role_seller')}</div>
                    <div className="role-hint">{t('role_seller_desc')}</div>
                  </div>
                </div>
              </div>

              {/* SELLER ONLY EXTRA FIELDS */}
              {role === 'seller' && (
                <div className="animate-slide-up">
                  <div className="form-group">
                    <label className="form-label">{t('store_name_label')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={rStore}
                      onChange={(e) => setRStore(e.target.value)}
                      placeholder="e.g. Kim Mobile Shop" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('store_province')}</label>
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
                    <label className="form-label">{t('store_district')}</label>
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
                    <label className="form-label">{t('store_detailed_address')}</label>
                    <textarea 
                      className="form-textarea"
                      value={rAddress}
                      onChange={(e) => setRAddress(e.target.value)}
                      placeholder={t('store_address_placeholder')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('store_coords')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={rCoords}
                      onChange={(e) => setRCoords(e.target.value)}
                      placeholder="e.g. 13.7563, 100.5018" 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('store_logo_label')}</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-input" 
                      style={{ padding: '10px' }} 
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('payout_and_payment_type')}</label>
                    <select 
                      className="form-select"
                      value={rPayout}
                      onChange={(e) => setRPayout(e.target.value)}
                    >
                      <option value="parent_payment">{t('parent_payment_desc')}</option>
                      <option value="cod_commission">{t('cod_commission_desc')}</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">{t('register_pin_label')}</label>
                <div className="pin-row">
                  {rPin.map((val, idx) => (
                    <input 
                      key={idx}
                      ref={rRefs[idx]}
                      type="password" 
                      className="pin-box" 
                      value={val}
                      onChange={(e) => handlePinInput(e, idx, 'reg', rRefs)}
                      onKeyDown={(e) => handlePinKeyDown(e, idx, 'reg', rRefs)}
                      maxLength={1} 
                      inputMode="numeric" 
                    />
                  ))}
                </div>
              </div>

              {rErr && <div className="err" style={{ marginBottom: '12px' }}>{rErr}</div>}
              {rOk && <div className="ok" style={{ marginBottom: '12px' }}>{rOk}</div>}

              <button 
                className="btn-submit" 
                onClick={doRegister} 
                disabled={regLoading}
              >
                {regLoading ? t('loading') : t('register')}
              </button>

              <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--t2)' }}>
                {t('already_have_account')}{' '}
                <span 
                  style={{ color: 'var(--purple-l)', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => setAuthTab('login')}
                >
                  {t('login')}
                </span>
              </p>
            </div>
          )}

        </div>
      </div>
    </MobileLayout>
  );
}
