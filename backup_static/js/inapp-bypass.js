(function() {
  var ua = navigator.userAgent.toLowerCase();
  var href = window.location.href;

  var isKakao = ua.indexOf('kakaotalk') > -1;
  var isLine = ua.indexOf('line') > -1;
  var isInstagram = ua.indexOf('instagram') > -1;
  var isFacebook = (ua.indexOf('fban') > -1) || (ua.indexOf('fbav') > -1);
  var isTwitter = ua.indexOf('twitter') > -1;
  
  // 1. KakaoTalk: Auto breakout
  if (isKakao) {
    window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(href);
    return;
  }

  // 2. LINE: Auto breakout attempt
  if (isLine) {
    if (href.indexOf('openExternalBrowser=1') === -1) {
      var sep = href.indexOf('?') > -1 ? '&' : '?';
      window.location.href = href + sep + 'openExternalBrowser=1';
      return;
    }
    // If we have openExternalBrowser=1 but are still in WebView, we'll fall through to show the banner
  }

  var isAndroid = ua.indexOf('android') > -1;
  var isInApp = isInstagram || isFacebook || isTwitter || isLine;

  // 3. Android In-App Browser (Instagram, Facebook, LINE fallback, etc.): Force open default browser
  if (isAndroid && isInApp) {
    var rawUrl = href.replace(/^https?:\/\//i, '');
    window.location.href = 'intent://' + rawUrl + '#Intent;scheme=https;end';
    return;
  }

  // 4. iOS In-App Browser: Cannot force auto-breakout, show guidance banner
  if (!isAndroid && isInApp) {
    document.addEventListener('DOMContentLoaded', function() {
      // Create and inject a premium top banner guiding iOS users to open in Safari
      var banner = document.createElement('div');
      banner.id = 'inapp-ios-banner';
      banner.style.cssText = 'position:fixed; top:0; left:0; right:0; z-index:999999; background:rgba(20,24,45,0.98); border-bottom:1px solid #c084fc; padding:14px 16px; color:#fff; font-family:sans-serif; font-size:13px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.5); display:flex; flex-direction:column; gap:8px; align-items:center;';
      
      // Dynamic translation based on browser language or local storage
      var text = '⚠️ 인앱 브라우저 감지됨: 로그인 및 파일 업로드 기능이 제한될 수 있습니다. 우측 상단 <strong>[점 3개(더보기) 또는 내보내기]</strong> 버튼을 누르고 <strong>[Safari로 열기]</strong>를 선택해 주세요.';
      var copyText = '링크 복사';
      var closeText = '닫기 ✕';
      var copiedAlert = '링크가 복사되었습니다! Safari 브라우저 주소창에 붙여넣어 주세요.';

      var currentLang = localStorage.getItem('selectedLanguage') || 'ko';
      if (currentLang === 'th') {
        text = '⚠️ ตรวจพบเบราว์เซอร์ในแอป: ฟังก์ชันล็อกอินและอัป로드รูปภาพอาจทำงานไม่สมบูรณ์ กรุณากดปุ่ม <strong>[จุด 3 จุด หรือ แชร์]</strong> ที่มุมขวาบน แล้วเลือก <strong>[เปิดใน Safari]</strong>';
        copyText = 'คัดลอกลิงก์';
        closeText = 'ปิด ✕';
        copiedAlert = 'คัดลอกลิงก์เรียบร้อยแล้ว! กรุณานำไปวางในเบราว์เซอร์ Safari';
      } else if (currentLang === 'mm') {
        text = '⚠️ In-App Browser ဖြစ်နေပါသဖြင့် Login နှင့် Upload လုပ်ဆောင်ချက်များ အဆင်မပြေဖြစ်နိုင်ပါသည်။ ညာဘက်အပေါ်ထောင့်ရှိ <strong>[More သို့မဟုတ် Share]</strong> ကိုနှိပ်ပြီး <strong>[Open in Safari]</strong> ကို ရွေးချယ်ပေးပါ။';
        copyText = 'လင့်ခ်ကူးယူရန်';
        closeText = 'ပိတ်ရန် ✕';
        copiedAlert = 'လင့်ခ်ကူးယူပြီးပါပြီ။ Safari တွင် ဖွင့်ပေးပါ။';
      }

      banner.innerHTML = `
        <div style="line-height:1.4; word-break:keep-all;">${text}</div>
        <div style="display:flex; gap:8px; width:100%; justify-content:center;">
          <button id="inapp-copy-btn" style="background:#8b5cf6; border:none; color:#fff; padding:6px 14px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">${copyText}</button>
          <button id="inapp-close-btn" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:6px 14px; border-radius:6px; font-size:11px; cursor:pointer;">${closeText}</button>
        </div>
      `;
      document.body.appendChild(banner);
      
      // Adjust padding top of app shell or body to avoid overlap
      document.body.style.paddingTop = '80px';

      document.getElementById('inapp-copy-btn').addEventListener('click', function() {
        var tempInput = document.createElement('input');
        tempInput.value = href;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert(copiedAlert);
      });

      document.getElementById('inapp-close-btn').addEventListener('click', function() {
        banner.style.display = 'none';
        document.body.style.paddingTop = '0px';
      });
    });
  }
})();
