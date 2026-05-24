// ===== IRIS MOBILE - Supabase Config =====
const SUPABASE_URL = 'https://mkruzdmtfyibtpfdutty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WoOZ0hIKP7EV8_l5FKUuyw_awLAvP0Q';

// 관리자 전화번호 (본인 전화번호 입력 - 숫자만, 국가코드 제외)
// 예: 태국 번호 0812345678 -> '0812345678'
const ADMIN_PHONE = ''; // ← 여기에 본인 전화번호 입력!

// Supabase 클라이언트 생성
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 전화번호 → 이메일 변환 (내부 인증용)
function phoneToEmail(phone) {
  return `${phone.replace(/\D/g, '')}@phoneswitchhub.app`;
}

// PIN + 전화번호 → 비밀번호 생성
function makePassword(pin, phone) {
  return `iris_${pin}_${phone.replace(/\D/g, '')}`;
}

// 숫자 포맷 (฿ 단위)
function formatPrice(n) {
  return '฿' + Number(n).toLocaleString();
}

// 날짜 포맷
function formatDate(str) {
  const d = new Date(str);
  const langMap = { ko: 'ko-KR', th: 'th-TH', mm: 'my-MM' };
  const targetLang = langMap[window.currentLang || 'th'] || 'th-TH';
  return d.toLocaleDateString(targetLang, { year: 'numeric', month: 'short', day: 'numeric' });
}

// 토스트 메시지
function showToast(msg, type = 'success') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// 로딩 상태 버튼
function setLoading(btnId, loading, text = '처리 중...') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn._originalText = btn.innerHTML;
    btn.innerHTML = `<span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:8px;"></span>${text}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn._originalText || text;
    btn.disabled = false;
  }
}

// 현재 유저 + 프로필 가져오기
async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

// 역할별 리다이렉트
async function redirectByRole() {
  const profile = await getCurrentProfile();
  if (!profile) { window.location.href = '/irismobile/login.html'; return; }
  if (profile.role === 'admin') window.location.href = '/irismobile/admin/dashboard.html';
  else if (profile.role === 'seller') window.location.href = '/irismobile/seller/dashboard.html';
  else window.location.href = '/irismobile/index.html';
}
