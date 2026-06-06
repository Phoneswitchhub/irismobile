'use client';

import React, { useEffect, useState } from 'react';

export default function InAppBrowserEscaper() {
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [copyText, setCopyText] = useState('Copy Link');
  const [closeText, setCloseText] = useState('Close ✕');
  const [copiedAlert, setCopiedAlert] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const href = window.location.href;

    const isKakao = ua.indexOf('kakaotalk') > -1;
    const isLine = ua.indexOf('line') > -1;
    const isInstagram = ua.indexOf('instagram') > -1;
    const isFacebook = ua.indexOf('fban') > -1 || ua.indexOf('fbav') > -1;
    const isTwitter = ua.indexOf('twitter') > -1;

    // 1. KakaoTalk: Auto breakout
    if (isKakao) {
      window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(href);
      return;
    }

    // 2. LINE: Auto breakout attempt
    if (isLine) {
      if (href.indexOf('openExternalBrowser=1') === -1) {
        const sep = href.indexOf('?') > -1 ? '&' : '?';
        window.location.href = href + sep + 'openExternalBrowser=1';
        return;
      }
    }

    const isAndroid = ua.indexOf('android') > -1;
    const isInApp = isInstagram || isFacebook || isTwitter || isLine;

    // 3. Android In-App Browser: Force open default browser
    if (isAndroid && isInApp) {
      const rawUrl = href.replace(/^https?:\/\//i, '');
      window.location.href = 'intent://' + rawUrl + '#Intent;scheme=https;end';
      return;
    }

    // 4. iOS In-App Browser: Show guidance banner
    if (!isAndroid && isInApp) {
      // Determine language
      const savedLang = localStorage.getItem('lang') || 'th';
      
      let text = '⚠️ 인앱 브라우저 감지됨: 로그인 및 파일 업로드 기능이 제한될 수 있습니다. 우측 상단 [점 3개 또는 내보내기] 버튼을 누르고 [Safari로 열기]를 선택해 주세요.';
      let copyBtn = '링크 복사';
      let closeBtn = '닫기 ✕';
      let alertMsg = '링크가 복사되었습니다! Safari 브라우저 주소창에 붙여넣어 주세요.';

      if (savedLang === 'th') {
        text = '⚠️ ตรวจพบเบราว์เซอร์ในแอป: ฟังก์ชันล็อกอินและอัป로드รูปภาพอาจทำงานไม่สมบูรณ์ กรุณากดปุ่ม [จุด 3 จุด หรือ แชร์] ที่มุมขวาบน แล้วเลือก [เปิดใน Safari]';
        copyBtn = 'คัดลอกลิงก์';
        closeBtn = 'ปิด ✕';
        alertMsg = 'คัดลอกลิงก์เรียบร้อยแล้ว! กรุณานำไปวางในเบราว์เซอร์ Safari';
      } else if (savedLang === 'mm') {
        text = '⚠️ In-App Browser ဖြစ်နေပါသဖြင့် Login နှင့် Upload လုပ်ဆောင်ချက်များ အဆင်မပြေဖြစ်နိုင်ပါသည်။ ညာဘက်အပေါ်ထောင့်ရှိ [More သို့မဟုတ် Share] ကိုနှိပ်ပြီး [Open in Safari] ကို ရွေးချယ်ပေးပါ။';
        copyBtn = 'လင့်ခ်ကူးယူရန်';
        closeBtn = 'ပိတ်ရန် ✕';
        alertMsg = 'လင့်ခ်ကူးယူပြီးပါပြီ။ Safari တွင် ဖွင့်ပေးပါ။';
      } else if (savedLang === 'en') {
        text = '⚠️ In-App Browser detected: Sign in and upload features might be limited. Please tap the [three dots or Share] icon in the top right and select [Open in Safari].';
        copyBtn = 'Copy Link';
        closeBtn = 'Close ✕';
        alertMsg = 'Link copied! Please paste it into your Safari address bar.';
      }

      setBannerText(text);
      setCopyText(copyBtn);
      setCloseText(closeBtn);
      setCopiedAlert(alertMsg);
      setShowBanner(true);
    }
  }, []);

  const handleCopy = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert(copiedAlert);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999999,
      background: 'rgba(20, 24, 45, 0.98)',
      borderBottom: '1px solid #c084fc',
      padding: '14px 16px',
      color: '#fff',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'center',
    }}>
      <div style={{ lineHeight: '1.4', wordBreak: 'keep-all' }} dangerouslySetInnerHTML={{ __html: bannerText }} />
      <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
        <button 
          onClick={handleCopy}
          style={{
            background: '#8b5cf6',
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {copyText}
        </button>
        <button 
          onClick={() => setShowBanner(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          {closeText}
        </button>
      </div>
    </div>
  );
}
