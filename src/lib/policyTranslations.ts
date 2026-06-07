// ===== IRIS MOBILE - Multilingual Policy Translations (TH, MM, KO, EN) =====

export interface PolicyData {
  refund_title: string;
  refund_intro: string;
  refund_sec1_title: string;
  refund_sec1_content: string;
  refund_sec2_title: string;
  refund_sec2_content: string;
  refund_sec3_title: string;
  refund_sec3_content: string;
  
  terms_title: string;
  terms_intro: string;
  terms_sec1_title: string;
  terms_sec1_content: string;
  terms_sec2_title: string;
  terms_sec2_content: string;
  terms_sec3_title: string;
  terms_sec3_content: string;
  
  privacy_title: string;
  privacy_intro: string;
  privacy_sec1_title: string;
  privacy_sec1_content: string;
  privacy_sec2_title: string;
  privacy_sec2_content: string;
  privacy_sec3_title: string;
  privacy_sec3_content: string;
}

export const POLICY_TRANSLATIONS: Record<string, PolicyData> = {
  ko: {
    refund_title: "환불 및 주문 취소 규정",
    refund_intro: "Phone Switch Hub(บริษัท โฟน สวิตช์ ฮับ จำกัด)는 고객님의 안전하고 투명한 중고 스마트폰 거래를 지원하며, 결제 대행 서비스(PG) 기준에 부합하는 취소 및 환불 규정을 준수합니다.",
    refund_sec1_title: "1. 주문 취소 및 변경",
    refund_sec1_content: "배송 처리(택배 발송 또는 출고 상태 변경) 전 상태인 주문은 고객 센터를 통해 언제든지 무료로 취소 및 전액 환불을 요청하실 수 있습니다. 상품이 이미 출고 및 배송 진행 중인 상태에서는 취소가 어려울 수 있으며, 이 경우 반품 절차로 처리됩니다.",
    refund_sec2_title: "2. 반품 및 환불 조건",
    refund_sec2_content: "수령하신 스마트폰 기기에 하자가 있거나 기재된 상태(설명)와 확연히 다른 경우, 또는 배송 중 파손이 발생한 경우 상품 수령 후 7일 이내에 무상 교환 또는 100% 환불을 요구할 수 있습니다. (고객의 과실이나 단순 변심으로 인한 반품의 경우 왕복 배송비가 고객에게 청구될 수 있습니다.)",
    refund_sec3_title: "3. 환불 처리 기간",
    refund_sec3_content: "반품이 접수되고 입고 검수가 완료되면 영업일 기준 3~5일 이내에 승인 및 환불 처리가 시작됩니다. 결제 방식에 따라 카드 환불 건은 카드사의 정책에 의해 영업일 기준 7~14일이 소요될 수 있으며, 계좌 이체 환불의 경우 즉시 정산 처리됩니다.",
    
    terms_title: "이용 약관",
    terms_intro: "본 이용 약관은 Phone Switch Hub 플랫폼이 제공하는 스마트폰 중고 거래 서비스 및 대리점 위탁 판매 서비스의 이용 조건을 규정합니다.",
    terms_sec1_title: "1. 회원 및 서비스 이용",
    terms_sec1_content: "사용자는 올바르고 정확한 정보(성명, 배송지 주소, 연락처 등)를 등록하여 서비스를 이용해야 합니다. 타인의 명의나 연락처를 무단 도용하거나 고의적인 사기 행위를 시도할 경우 서비스 이용이 즉시 정지되며 태국 법률에 따라 처벌받을 수 있습니다.",
    terms_sec2_title: "2. 거래 및 결제 규정",
    terms_sec2_content: "플랫폼을 통한 모든 결제는 안전한 정산 시스템을 통하며, 온라인 결제(카드/은행이체) 및 현금인도(COD) 방식을 제공합니다. 사용자는 승인되지 않은 부정한 수단을 사용하여 결제해서는 안 됩니다.",
    terms_sec3_title: "3. 관할 법률 및 분쟁 해결",
    terms_sec3_content: "본 플랫폼 서비스 및 약관의 해석과 관련하여 발생하는 모든 분쟁은 태국 법률을 준수하며, 방콕 관할 법원을 통해 해결합니다.",
    
    privacy_title: "개인정보 처리방침",
    privacy_intro: "Phone Switch Hub는 사용자의 개인정보를 소중히 보호하며, 개인정보 보호법(PDPA) 등 관련 법령을 엄격히 준수합니다.",
    privacy_sec1_title: "1. 수집하는 개인정보 항목",
    privacy_sec1_content: "고객 주문 처리, 결제 대행 및 상품 배송을 위해 이름, 연락처(전화번호), 이메일 주소, 배송지 주소, 결제 기록 등 필수적인 개인식별 정보를 수집합니다.",
    privacy_sec2_title: "2. 개인정보의 수집 및 이용 목적",
    privacy_sec2_content: "수집된 개인정보는 오직 주문 이행(배송 및 물류 연동), 고객 문의 응대(A/S 및 분쟁 해결), 결제 상태 확인 및 이상 거래/사기 행위 차단 목적으로만 제한적으로 사용됩니다.",
    privacy_sec3_title: "3. 제3자 제공 및 정보 보호",
    privacy_sec3_content: "당사는 법률에서 정한 의무 사항을 이행하거나, 상품 배송을 위해 물류사(Flash, Kerry 등) 및 결제 처리를 위해 PG사(Omise 등)에 위탁하는 경우를 제외하고는 사용자의 개인정보를 무단으로 타사에 제공하거나 상업적 목적으로 판매하지 않습니다."
  },
  th: {
    refund_title: "นโยบายการคืนเงินและการยกเลิก",
    refund_intro: "Phone Switch Hub (บริษัท โฟน สวิตช์ ฮับ จำกัด) มุ่งมั่นให้บริการซื้อขายสมาร์ทโฟนมือสองอย่างปลอดภัยและโปร่งใส โดยปฏิบัติตามนโยบายการยกเลิกและการคืนเงินที่เป็นไปตามมาตรฐานการให้บริการชำระเงิน (PG)",
    refund_sec1_title: "1. การยกเลิกและแก้ไขคำสั่งซื้อ",
    refund_sec1_content: "ลูกค้าสามารถขอยกเลิกคำสั่งซื้อและขอคืนเงินเต็มจำนวนได้ฟรีตลอดเวลาก่อนที่สินค้าจะถูกจัดส่ง (สถานะการจัดส่งเปลี่ยนไป) ในกรณีที่สินค้าถูกจัดส่งออกไปแล้วจะไม่สามารถยกเลิกคำสั่งซื้อได้ทันที และต้องดำเนินการผ่านขั้นตอนการคืนสินค้าหลังได้รับสินค้าแทน",
    refund_sec2_title: "2. เงื่อนไขการคืนสินค้าและการคืนเงิน",
    refund_sec2_content: "หากสมาร์ทโฟนที่ได้รับมีข้อบกพร่อง ชำรุด ไม่ตรงตามรายละเอียดที่ระบุ หรือได้รับความเสียหายระหว่างการจัดส่ง ลูกค้าสามารถขอเปลี่ยนสินค้าหรือขอคืนเงิน 100% ได้ภายใน 7 วันทำการหลังจากได้รับสินค้า (ในกรณีขอคืนเงินเนื่องจากการเปลี่ยนใจ ลูกค้าอาจต้องรับผิดชอบค่าใช้จ่ายในการจัดส่งไป-กลับ)",
    refund_sec3_title: "3. ระยะเวลาการดำเนินการคืนเงิน",
    refund_sec3_content: "หลังจากได้รับการคืนสินค้าและตรวจสอบสภาพสินค้าเรียบร้อยแล้ว การอนุมัติการคืนเงินจะเริ่มขึ้นภายใน 3-5 วันทำการ สำหรับการชำระผ่านบัตรเครดิต เงินจะถูกคืนเข้าบัตรภายใน 7-14 วันทำการขึ้นอยู่กับนโยบายของธนาคารเจ้าของบัตร และการโอนเงินเข้าบัญชีจะได้รับการจัดการทันทีหลังอนุมัติ",
    
    terms_title: "เงื่อนไขการใช้บริการ",
    terms_intro: "เงื่อนไขการใช้บริการนี้ควบคุมการใช้งานแพลตฟอร์ม Phone Switch Hub สำหรับการซื้อขายสมาร์ทโฟนมือสองและการฝากขายผ่านตัวแทนจำหน่ายอย่างเป็นทางการ",
    terms_sec1_title: "1. สมาชิกและการใช้งานบริการ",
    terms_sec1_content: "ผู้ใช้บริการต้องลงทะเบียนข้อมูลที่ถูกต้องและเป็นความจริง เช่น ชื่อ-นามสกุล ที่อยู่จัดส่ง และเบอร์โทรศัพท์ การใช้ข้อมูลปลอม แอบอ้างบุคคลอื่น หรือความพยายามฉ้อโกงใดๆ จะส่งผลให้บัญชีถูกระงับทันทีและอาจถูกดำเนินคดีตามกฎหมายไทย",
    terms_sec2_title: "2. กฎการซื้อขายและการชำระเงิน",
    terms_sec2_content: "การชำระเงินทั้งหมดผ่านแพลตฟอร์มนี้ดำเนินการผ่านระบบชำระเงินที่ปลอดภัย ซึ่งมีทั้งรูปแบบออนไลน์ (บัตรเครดิต/การโอนเงินผ่านธนาคาร) และการเก็บเงินปลายทาง (COD) ผู้ใช้บริการต้องไม่ชำระเงินด้วยวิธีการที่ผิดกฎหมายหรือไม่ได้รับอนุญาต",
    terms_sec3_title: "3. กฎหมายที่บังคับใช้และการระงับข้อพิพาท",
    terms_sec3_content: "ข้อกำหนดและเงื่อนไขการใช้บริการนี้จะถูกตีความและบังคับใช้ตามกฎหมายแห่งราชอาณาจักรไทย และข้อพิพาทใดๆ จะถูกตัดสินโดยศาลที่มีอำนาจในกรุงเทพมหานคร",
    
    privacy_title: "นโยบายความเป็นส่วนตัว",
    privacy_intro: "Phone Switch Hub ให้ความสำคัญสูงสุดกับการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้งาน และปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) อย่างเคร่งครัด",
    privacy_sec1_title: "1. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม",
    privacy_sec1_content: "เราเก็บรวบรวมข้อมูลที่จำเป็นเพื่อการดำเนินการคำสั่งซื้อ การชำระเงิน และการจัดส่งสินค้า เช่น ชื่อ-นามสกุล เบอร์โทรศัพท์ติดต่อ อีเมล ที่อยู่สำหรับจัดส่ง และบันทึกประวัติการทำรายการชำระเงิน",
    privacy_sec2_title: "2. วัตถุประสงค์ในการเก็บรวบรวมและใช้ข้อมูล",
    privacy_sec2_content: "ข้อมูลส่วนบุคคลจะถูกนำไปใช้งานเพื่อความสมบูรณ์ในการสั่งซื้อ (การจัดส่งและประสานงานขนส่ง) การบริการหลังการขายและการแก้ไขข้อสงสัยของลูกค้า การยืนยันสถานะชำระเงิน และการตรวจจับเพื่อป้องกันการฉ้อโกงเท่านั้น",
    privacy_sec3_title: "3. การเปิดเผยข้อมูลแก่บุคคลที่สามและการรักษาความปลอดภัย",
    privacy_sec3_content: "เราจะไม่เปิดเผยหรือขายข้อมูลส่วนบุคคลของคุณให้กับบริษัทอื่นเพื่อวัตถุประสงค์ทางการค้า เว้นแต่เป็นการปฏิบัติตามกฎหมาย หรือการส่งต่อข้อมูลที่จำเป็นแก่ผู้ให้บริการจัดส่งสินค้า (เช่น Flash, Kerry) หรือผู้ให้บริการชำระเงิน (เช่น Omise) เพื่อเสร็จสิ้นธุรกรรม"
  },
  mm: {
    refund_title: "ငွေပြန်အမ်းခြင်းနှင့် ပယ်ဖျက်ခြင်းဆိုင်ရာ မူဝါဒ",
    refund_intro: "Phone Switch Hub (บริษัท โฟน สวิตช์ ฮับ จำกัด) သည် သုံးစွဲသူများ၏ ဘေးကင်းပြီး ပွင့်လင်းမြင်သာသော စမတ်ဖုန်းအရောင်းအဝယ်ကို ပံ့ပိုးပေးပြီး ငွေပေးချေမှုစနစ် (PG) စံနှုန်းများနှင့်အညီ ပယ်ဖျက်ခြင်းနှင့် ငွေပြန်အမ်းခြင်းဆိုင်ရာ မူဝါဒများကို လိုက်နာပါသည်။",
    refund_sec1_title: "၁။ အော်ဒါပယ်ဖျက်ခြင်းနှင့် ပြောင်းလဲခြင်း",
    refund_sec1_content: "ကုန်ပစ္စည်းများ ပို့ဆောင်ခြင်းမပြုမီ (ပို့ဆောင်ရေးအခြေအနေ မပြောင်းလဲမီ) ဖောက်သည်ဝန်ဆောင်မှုဌာနမှတစ်ဆင့် အော်ဒါကို အခမဲ့ပယ်ဖျက်ပြီး ငွေအပြည့်အဝပြန်လည်တောင်းခံနိုင်ပါသည်။ ကုန်ပစ္စည်းကို ပို့ဆောင်ပြီးပါက ချက်ချင်းပယ်ဖျက်၍မရဘဲ၊ ကုန်ပစ္စည်းလက်ခံရရှိပြီးမှ ပြန်လည်ပေးပို့သည့်စနစ်ဖြင့် ဆောင်ရွက်ရပါမည်။",
    refund_sec2_title: "၂။ ကုန်ပစ္စည်းပြန်လည်ပေးပို့ခြင်းနှင့် ငွေပြန်အမ်းခြင်းဆိုင်ရာ သတ်မှတ်ချက်များ",
    refund_sec2_content: "လက်ခံရရှိသောစမတ်ဖုန်းတွင် ချို့ယွင်းချက်ရှိခြင်း၊ ဖော်ပြချက်နှင့် ကွဲလွဲခြင်း သို့မဟုတ် ပို့ဆောင်စဉ် ပျက်စီးသွားခြင်းများရှိပါက ကုန်ပစ္စည်းရရှိပြီး ၇ ရက်အတွင်း အသစ်လဲလှယ်ခြင်း သို့မဟုတ် ၁၀၀% ငွေပြန်အမ်းခြင်းကို တောင်းခံနိုင်ပါသည်။ (စိတ်ပြောင်းလဲမှုကြောင့် ပြန်ပေးခြင်းဖြစ်ပါက ပို့ဆောင်ခနှစ်ဖက်လုံးကို ဝယ်ယူသူမှ ပေးဆောင်ရပါမည်။)",
    refund_sec3_title: "၃။ ငွေပြန်အမ်းရန် ကြာမြင့်ချိန်",
    refund_sec3_content: "ပြန်လည်ပေးပို့သောကုန်ပစ္စည်းကို လက်ခံရရှိပြီး စစ်ဆေးပြီးနောက် ၃ ရက်မှ ၅ ရက်အတွင်း ငွေပြန်အမ်းရန် စတင်ဆောင်ရွက်ပါမည်။ ကတ်ဖြင့်ပေးချေခြင်းများအတွက် ဘဏ်မူဝါဒများပေါ်မူတည်၍ ၇ ရက်မှ ၁၄ ရက်အထိ ကြာမြင့်နိုင်ပြီး၊ ဘဏ်စာအုပ်ဖြင့်လွှဲခြင်းဖြစ်ပါက အတည်ပြုပြီးသည်နှင့် ချက်ချင်းလွှဲပေးပါမည်။",
    
    terms_title: "ဝန်ဆောင်မှုဆိုင်ရာ စည်းကမ်းချက်များ",
    terms_intro: "ဤဝန်ဆောင်မှုဆိုင်ရာ စည်းကမ်းချက်များသည် Phone Switch Hub ပလက်ဖောင်းမှ ပံ့ပိုးပေးသော စမတ်ဖုန်းအရောင်းအဝယ်နှင့် ကိုယ်စားလှယ်ဆိုင် ဝန်ဆောင်မှုများကို ကန့်သတ်ထိန်းချုပ်ပါသည်။",
    terms_sec1_title: "၁။ အဖွဲ့ဝင်ဖြစ်ခြင်းနှင့် ဝန်ဆောင်မှုကို အသုံးပြုခြင်း",
    terms_sec1_content: "အသုံးပြုသူများသည် မှန်ကန်သော အချက်အလက်များ (အမည်၊ ပို့ဆောင်မည့်လိပ်စာ၊ ဖုန်းနံပါတ်) ကို စာရင်းသွင်းရပါမည်။ အခြားသူ၏ အချက်အလက်များကို ခိုးယူအသုံးပြုခြင်း သို့မဟုတ် လိမ်လည်ရန် ကြိုးပမ်းခြင်းများပြုလုပ်ပါက အကောင့်ကို ချက်ချင်းပိတ်သိမ်းမည်ဖြစ်ပြီး ထိုင်းနိုင်ငံဥပဒေအရ အရေးယူခံရမည်ဖြစ်သည်။",
    terms_sec2_title: "၂။ အရောင်းအဝယ်နှင့် ငွေပေးချေမှု စည်းမျဉ်းများ",
    terms_sec2_content: "ပလက်ဖောင်းမှတစ်ဆင့် ငွေပေးချေမှုအားလုံးကို ဘေးကင်းသောစနစ်ဖြင့် ဆောင်ရွက်ပြီး၊ အွန်လိုင်း (ကတ်/ဘဏ်စာအုပ်လွှဲခြင်း) နှင့် အိမ်ရောက်ငွေချေစနစ် (COD) တို့ကို ပံ့ပိုးပေးပါသည်။ အသုံးပြုသူများသည် တရားမဝင်သော နည်းလမ်းများဖြင့် ငွေပေးချေခြင်း မပြုလုပ်ရပါ။",
    terms_sec3_title: "၃။ ကျင့်သုံးသောဥပဒေနှင့် အငြင်းပွားမှုဖြေရှင်းခြင်း",
    terms_sec3_content: "ဤဝန်ဆောင်မှုဆိုင်ရာ စည်းကမ်းချက်များကို ထိုင်းနိုင်ငံဥပဒေနှင့်အညီ အဓိပ္ပာယ်ဖွင့်ဆိုမည်ဖြစ်ပြီး၊ မည်သည့်အငြင်းပွားမှုမဆို ဘန်ကောက်မြို့ရှိ တရားရုံးတွင် ဆောင်ရွက်ရပါမည်။",
    
    privacy_title: "ကိုယ်ရေးအချက်အလက် လုံခြုံမှုဆိုင်ရာ မူဝါဒ",
    privacy_intro: "Phone Switch Hub သည် သုံးစွဲသူများ၏ ကိုယ်ရေးအချက်အလက်များကို အလေးထားစောင့်ရှောက်ပြီး ကိုယ်ရေးအချက်အလက်ကာကွယ်ရေးဥပဒေ (PDPA) ကို တိကျစွာလိုက်နာပါသည်။",
    privacy_sec1_title: "၁။ စုဆောင်းထားသော ကိုယ်ရေးအချက်အလက်များ",
    privacy_sec1_content: "အော်ဒါများလုပ်ဆောင်ခြင်း၊ ငွေပေးချေခြင်းနှင့် ကုန်ပစ္စည်းပို့ဆောင်ခြင်းအတွက် လိုအပ်သော အမည်၊ ဖုန်းနံပါတ်၊ အီးမေးလ်၊ ပို့ဆောင်မည့်လိပ်စာနှင့် ငွေပေးချေမှုမှတ်တမ်းများကို စုဆောင်းပါသည်။",
    privacy_sec2_title: "၂။ အချက်အလက်များကို စုဆောင်းအသုံးပြုရသည့် ရည်ရွယ်ချက်",
    privacy_sec2_content: "စုဆောင်းထားသော ကိုယ်ရေးအချက်အလက်များကို အော်ဒါပို့ဆောင်ခြင်း၊ ဖောက်သည်မေးမြန်းမှုများကို ဖြေကြားပေးခြင်း၊ ငွေပေးချေမှုအတည်ပြုခြင်းနှင့် လိမ်လည်မှုများ ကာကွယ်ခြင်းများအတွက်သာ အသုံးပြုပါသည်။",
    privacy_sec3_title: "၃။ တတိယအဖွဲ့အစည်းသို့ မျှဝေခြင်း ကန့်သတ်ချက်",
    privacy_sec3_content: "ဥပဒေအရ သို့မဟုတ် ကုန်ပစ္စည်းပို့ဆောင်ရန် (ဥပမာ Flash, Kerry) သို့မဟုတ် ငွေပေးချေမှုစနစ် (ဥပမာ Omise) တို့အတွက် လိုအပ်သည်မှလွဲ၍ သင်၏ကိုယ်ရေးအချက်အလက်များကို တတိယအဖွဲ့အစည်းသို့ စီးပွားရေးအရ ရောင်းချခြင်း သို့မဟုတ် မျှဝေခြင်း မပြုလုပ်ပါ။"
  },
  en: {
    refund_title: "Refund & Cancellation Policy",
    refund_intro: "Phone Switch Hub (Phone Switch Hub Co., Ltd. / บริษัท โฟน สวิตช์ ฮับ จำกัด) is committed to providing a safe and transparent marketplace for used smartphones, abiding by refund and cancellation standards for Payment Gateways (PG).",
    refund_sec1_title: "1. Order Cancellation & Modification",
    refund_sec1_content: "Customers can request a free cancellation and full refund for any order before it is dispatched for shipment (shipping status changed). Once the product has been dispatched, cancellation is no longer possible and must be handled via our return policy after receipt.",
    refund_sec2_title: "2. Return & Refund Conditions",
    refund_sec2_content: "If the received smartphone has functional defects, differs significantly from the description, or is damaged during transit, you may request a free replacement or a 100% refund within 7 days of receiving the item. (For returns due to change of mind, customers may be responsible for round-trip shipping costs.)",
    refund_sec3_title: "3. Refund Processing Time",
    refund_sec3_content: "Once the returned product is received and inspected, the refund approval process will begin within 3-5 business days. For credit card transactions, refunds will be credited back within 7-14 business days depending on the card issuer's policies. Bank transfers will be settled immediately upon approval.",
    
    terms_title: "Terms of Service",
    terms_intro: "These Terms of Service govern the usage of the Phone Switch Hub platform for used smartphone trading and dealership consignment sales services.",
    terms_sec1_title: "1. Membership and Service Use",
    terms_sec1_content: "Users must register correct and truthful details (Full Name, Shipping Address, Contact Info) to utilize our services. Registering fraudulent information, identity theft, or intent of scamming will result in immediate account termination and legal action under the laws of Thailand.",
    terms_sec2_title: "2. Trading & Payment Rules",
    terms_sec2_content: "All payments made through the platform are routed via secure gateways, including online payments (credit card/bank transfers) and Cash on Delivery (COD). Users must not attempt transactions using unauthorized or illegal payment sources.",
    terms_sec3_title: "3. Governing Law & Dispute Resolution",
    terms_sec3_content: "These Terms of Service shall be governed by and construed in accordance with the laws of the Kingdom of Thailand, and any disputes shall be resolved in the competent court of Bangkok, Thailand.",
    
    privacy_title: "Privacy Policy",
    privacy_intro: "Phone Switch Hub highly values user privacy and strictly complies with the Personal Data Protection Act (PDPA) of Thailand.",
    privacy_sec1_title: "1. Personal Data We Collect",
    privacy_sec1_content: "We collect essential identifiers required for order fulfillment, payments, and delivery, such as Full Name, Phone Number, Email Address, Shipping Address, and transaction payment history.",
    privacy_sec2_title: "2. Purpose of Collecting & Using Data",
    privacy_sec2_content: "Your data is used solely for order processing (logistics coordination), customer support (after-sales/dispute handling), verifying payment status, and monitoring/preventing fraudulent transactions.",
    privacy_sec3_title: "3. Third-party Sharing & Security",
    privacy_sec3_content: "We do not sell or share your personal data with third parties for commercial use, except as required by law or to delegate essential tasks such as shipment delivery (to Flash Express, Kerry, etc.) or secure payment processing (to Omise PG) to complete the transaction."
  }
};
