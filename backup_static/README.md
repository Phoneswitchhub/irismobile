# 💎 Iris Mobile — Thailand Phone Marketplace

**다중 판매자 중고 스마트폰 쇼핑몰 플랫폼** (Thailand)

🌐 Site: https://phoneswitchhub.github.io/irismobile/

---

## 📁 폴더 구조

```
irismobile/
├── index.html              ← 메인 홈 (상품/판매자 목록)
├── login.html              ← 로그인 / 회원가입
├── shop.html               ← 전체 상품 목록
├── seller/
│   └── dashboard.html      ← 판매자 대시보드
├── admin/
│   └── dashboard.html      ← 관리자 대시보드
├── css/
│   └── style.css           ← 전체 스타일
├── js/
│   └── config.js           ← Supabase 설정
└── supabase-setup.sql      ← DB 초기 설정 SQL
```

---

## 🚀 시작 전 설정

### 1. Supabase DB 설정
1. [supabase.com](https://supabase.com) 대시보드 접속
2. 좌측 **SQL Editor** 클릭
3. `supabase-setup.sql` 파일 내용을 전체 복사
4. SQL Editor에 붙여넣고 **RUN** 클릭

### 2. 관리자 전화번호 설정
`js/config.js` 파일에서:
```javascript
const ADMIN_PHONE = ''; // ← 본인 전화번호 입력 (숫자만, 예: '0812345678')
```

### 3. GitHub에 업로드
```bash
git init
git add .
git commit -m "Initial commit - Iris Mobile"
git remote add origin https://github.com/Phoneswitchhub/irismobile.git
git push -u origin main
```

---

## 👥 역할

| 역할 | 설명 | 접근 |
|------|------|------|
| 관리자 | 전체 관리 | `/admin/dashboard.html` |
| 판매자 | 상품 등록/관리, 주문 처리 | `/seller/dashboard.html` |
| 구매자 | 상품 구경 및 구매 | `/index.html`, `/shop.html` |

---

## 📱 로그인 방식

- **전화번호 + PIN 4자리** (SMS 인증 없이 간편 로그인)
- 태국 번호 기준 (+66)
- 관리자는 `config.js`의 `ADMIN_PHONE`에 등록된 번호로 첫 가입 시 자동 관리자 지정

---

## ✅ 기능 목록

### 구매자
- [x] 전화번호 + PIN 로그인/회원가입
- [x] 판매자 목록 보기
- [x] 상품 목록 / 카테고리 필터
- [x] 구매 요청하기

### 판매자
- [x] 상품 등록 (사진 최대 3장)
- [x] 상품 수정 / 삭제 / 숨기기
- [x] 주문 확인 및 처리 (확인→완료)
- [x] 프로필 사진 및 매장 소개 설정

### 관리자
- [x] 판매자 승인 / 거절 / 정지
- [x] 전체 회원 관리
- [x] 전체 상품 관리
- [x] 전체 주문 현황 및 매출 통계

---

Made with 💜 by Phoneswitchhub
