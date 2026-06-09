const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// ── 1. Modify Bulk Sale Modal Address Inputs ──
const oldBulkAddressInput = `                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📍 ที่อยู่ / 주소</label>
                    <select
                      value={bulkBuyerAddress}
                      onChange={e => { setBulkBuyerAddress(e.target.value); if (e.target.value !== '__custom__') setBulkBuyerAddressCustom(''); }}
                      className="form-input"
                      style={{ margin: 0, marginBottom: bulkBuyerAddress === '__custom__' ? '6px' : 0 }}
                    >
                      <option value="">-- เลือกที่อยู่ / 주소 선택 --</option>
                      <option value="กรุงเทพมหานคร">กรุงเทพมหานคร (방콕)</option>
                      <option value="เชียงใหม่">เชียงใหม่ (치앙마이)</option>
                      <option value="ขอนแก่น">ขอนแก่น (콘깬)</option>
                      <option value="นครราชสีมา">นครราชสีมา (나콘랏차시마)</option>
                      <option value="อุดรธานี">อุดรธานี (우돈타니)</option>
                      <option value="ภูเก็ต">ภูเก็ต (푸켓)</option>
                      <option value="สงขลา">สงขลา (송클라)</option>
                      <option value="ชลบุรี">ชลบุรี (촌부리)</option>
                      <option value="นนทบุรี">นนทบุรี (논타부리)</option>
                      <option value="ปทุมธานี">ปทุมธานี (빠툼타니)</option>
                      <option value="สมุทรปราการ">สมุทรปราการ (사뭇쁘라깐)</option>
                      <option value="ระยอง">ระยอง (라용)</option>
                      <option value="__custom__">✏️ กรอกเอง (직접 입력)</option>
                    </select>
                    {bulkBuyerAddress === '__custom__' && (
                      <input
                        type="text"
                        value={bulkBuyerAddressCustom}
                        onChange={e => setBulkBuyerAddressCustom(e.target.value)}
                        className="form-input"
                        placeholder="กรอกที่อยู่เอง..."
                        style={{ margin: 0 }}
                      />
                    )}
                  </div>`;

const newBulkAddressInput = `                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📍 ที่อยู่ / 주소 (จังหวัด / 주 선택)</label>
                    <select
                      value={bulkBuyerAddress}
                      onChange={e => setBulkBuyerAddress(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, marginBottom: '6px' }}
                    >
                      <option value="">-- เลือกจังหวัด / 주 선택 --</option>
                      <option value="กรุงเทพมหานคร">กรุงเทพมหานคร (방콕)</option>
                      <option value="เชียงใหม่">เชียงใหม่ (치앙마이)</option>
                      <option value="ขอนแก่น">ขอนแก่น (콘깬)</option>
                      <option value="นครราชสีมา">นครราชสีมา (나콘랏차시마)</option>
                      <option value="อุดรธานี">อุดรธานี (우돈타니)</option>
                      <option value="ภูเก็ต">ภูเก็ต (푸켓)</option>
                      <option value="สงขลา">สงขลา (송클라)</option>
                      <option value="ชลบุรี">ชลบุรี (촌부리)</option>
                      <option value="นนทบุรี">นนทบุรี (논타부리)</option>
                      <option value="ปทุมธานี">ปทุมธานี (빠툼타니)</option>
                      <option value="สมุทรปราการ">สมุทรปราการ (사뭇쁘라깐)</option>
                      <option value="ระยอง">ระยอง (라용)</option>
                      <option value="__custom__">✏️ กรอกเอง (직접 입력)</option>
                    </select>
                    <input
                      type="text"
                      value={bulkBuyerAddressCustom}
                      onChange={e => setBulkBuyerAddressCustom(e.target.value)}
                      className="form-input"
                      placeholder={
                        (bulkBuyerAddress && bulkBuyerAddress !== '__custom__')
                          ? 'รายละเอียดที่อยู่ (บ้านเลขที่, ถนน, ตำบล, อำเภอ)... / 상세 주소 입력'
                          : 'กรอกที่อยู่ทั้งหมด... / 전체 주소 직접 입력'
                      }
                      style={{ margin: 0 }}
                    />
                  </div>`;

// ── 2. Modify Bulk Receipt Printable Address Output ──
const oldBulkReceiptAddressPrint = `                {(bulkBuyerPhone || bulkBuyerAddress) && (
                  <div className="buyer-row" style={{ fontSize: '12px', marginBottom: '6px' }}>
                    {bulkBuyerPhone && <span>โทร: {bulkBuyerPhone}&nbsp;&nbsp;&nbsp;</span>}
                    {(bulkBuyerAddress || bulkBuyerAddressCustom) && <span>ที่อยู่: {bulkBuyerAddress === '__custom__' ? bulkBuyerAddressCustom : bulkBuyerAddress}</span>}
                  </div>
                )}`;

const newBulkReceiptAddressPrint = `                {(bulkBuyerPhone || bulkBuyerAddress || bulkBuyerAddressCustom) && (
                  <div className="buyer-row" style={{ fontSize: '12px', marginBottom: '6px' }}>
                    {bulkBuyerPhone && <span>โทร: {bulkBuyerPhone}&nbsp;&nbsp;&nbsp;</span>}
                    {(bulkBuyerAddress || bulkBuyerAddressCustom) && (
                      <span>ที่อยู่: {
                        (bulkBuyerAddress && bulkBuyerAddress !== '__custom__')
                          ? \`\${bulkBuyerAddress} \${bulkBuyerAddressCustom}\`.trim()
                          : bulkBuyerAddressCustom
                      }</span>
                    )}
                  </div>
                )}`;

// ── 3. Modify Receipt-Only Modal Address Inputs ──
const oldReceiptAddressInput = `                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📍 ที่อยู่ / 주소</label>
                    <select
                      value={receiptBuyerAddress}
                      onChange={e => { setReceiptBuyerAddress(e.target.value); if (e.target.value !== '__custom__') setReceiptBuyerAddressCustom(''); }}
                      className="form-input"
                      style={{ margin: 0, marginBottom: receiptBuyerAddress === '__custom__' ? '6px' : 0 }}
                    >
                      <option value="">-- เลือกที่อยู่ / 주소 선택 --</option>
                      <option value="กรุงเทพมหานคร">กรุงเทพมหานคร (방콕)</option>
                      <option value="เชียงใหม่">เชียงใหม่ (치앙마이)</option>
                      <option value="ขอนแก่น">ขอนแก่น (콘깬)</option>
                      <option value="นครราชสีมา">นครราชสีมา (나콘랏차시마)</option>
                      <option value="อุดรธานี">อุดรธานี (우돈타니)</option>
                      <option value="ภูเก็ต">ภูเก็ต (푸켓)</option>
                      <option value="สงขลา">สงขลา (송클라)</option>
                      <option value="ชลบุรี">ชลบุรี (촌부리)</option>
                      <option value="นนทบุรี">นนทบุรี (논타부리)</option>
                      <option value="ปทุมธานี">ปทุมธานี (빠툼타니)</option>
                      <option value="สมุทรปราการ">สมุทรปราการ (사뭇쁘라깐)</option>
                      <option value="ระยอง">ระยอง (라용)</option>
                      <option value="__custom__">✏️ กรอกเอง (직접 입력)</option>
                    </select>
                    {receiptBuyerAddress === '__custom__' && (
                      <input
                        type="text"
                        value={receiptBuyerAddressCustom}
                        onChange={e => setReceiptBuyerAddressCustom(e.target.value)}
                        className="form-input"
                        placeholder="กรอกที่อยู่เอง..."
                        style={{ margin: 0 }}
                      />
                    )}
                  </div>`;

const newReceiptAddressInput = `                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📍 ที่อยู่ / 주소 (จังหวัด / 주 선택)</label>
                    <select
                      value={receiptBuyerAddress}
                      onChange={e => setReceiptBuyerAddress(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, marginBottom: '6px' }}
                    >
                      <option value="">-- เลือกจังหวัด / 주 선택 --</option>
                      <option value="กรุงเทพมหานคร">กรุงเทพมหานคร (방콕)</option>
                      <option value="เชียงใหม่">เชียงใหม่ (치앙마이)</option>
                      <option value="ขอนแก่น">ขอนแก่น (콘깬)</option>
                      <option value="นครราชสีมา">นครราชสีมา (나콘랏차시마)</option>
                      <option value="อุดรธานี">อุดรธานี (우돈타니)</option>
                      <option value="ภูเก็ต">ภูเก็ต (푸켓)</option>
                      <option value="สงขลา">สงขลา (송클라)</option>
                      <option value="ชลบุรี">ชลบุรี (촌부리)</option>
                      <option value="นนทบุรี">นนทบุรี (논타부리)</option>
                      <option value="ปทุมธานี">ปทุมธานี (빠툼타니)</option>
                      <option value="สมุทรปราการ">สมุทรปราการ (사뭇쁘라깐)</option>
                      <option value="ระยอง">ระยอง (라용)</option>
                      <option value="__custom__">✏️ กรอกเอง (직접 입력)</option>
                    </select>
                    <input
                      type="text"
                      value={receiptBuyerAddressCustom}
                      onChange={e => setReceiptBuyerAddressCustom(e.target.value)}
                      className="form-input"
                      placeholder={
                        (receiptBuyerAddress && receiptBuyerAddress !== '__custom__')
                          ? 'รายละเอียดที่อยู่ (บ้านเลขที่, ถนน, ตำบล, อำเภอ)... / 상세 주소 입력'
                          : 'กรอกที่อยู่ทั้งหมด... / 전체 주소 직접 입력'
                      }
                      style={{ margin: 0 }}
                    />
                  </div>`;

// ── 4. Modify Receipt-Only Printable Address Output ──
const oldReceiptAddressPrint = `                {(receiptBuyerPhone || receiptBuyerAddress) && (
                  <div className="buyer-row" style={{ fontSize: '12px', marginBottom: '6px' }}>
                    {receiptBuyerPhone && <span>โทร: {receiptBuyerPhone}&nbsp;&nbsp;&nbsp;</span>}
                    {(receiptBuyerAddress || receiptBuyerAddressCustom) && <span>ที่อยู่: {receiptBuyerAddress === '__custom__' ? receiptBuyerAddressCustom : receiptBuyerAddress}</span>}
                  </div>
                )}`;

const newReceiptAddressPrint = `                {(receiptBuyerPhone || receiptBuyerAddress || receiptBuyerAddressCustom) && (
                  <div className="buyer-row" style={{ fontSize: '12px', marginBottom: '6px' }}>
                    {receiptBuyerPhone && <span>โทร: {receiptBuyerPhone}&nbsp;&nbsp;&nbsp;</span>}
                    {(receiptBuyerAddress || receiptBuyerAddressCustom) && (
                      <span>ที่อยู่: {
                        (receiptBuyerAddress && receiptBuyerAddress !== '__custom__')
                          ? \`\${receiptBuyerAddress} \${receiptBuyerAddressCustom}\`.trim()
                          : receiptBuyerAddressCustom
                      }</span>
                    )}
                  </div>
                )}`;

// Match with CRLF vs LF
const replaceText = (oldText, newText) => {
  if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    return true;
  }
  // Try LF
  const oldTextLF = oldText.replace(/\r\n/g, '\n');
  const newTextLF = newText.replace(/\r\n/g, '\n');
  if (content.includes(oldTextLF)) {
    content = content.replace(oldTextLF, newTextLF);
    return true;
  }
  return false;
};

let success = true;

if (!replaceText(oldBulkAddressInput, newBulkAddressInput)) {
  console.log('❌ Failed to patch Bulk Address Input');
  success = false;
} else {
  console.log('✅ Patched Bulk Address Input');
}

if (!replaceText(oldBulkReceiptAddressPrint, newBulkReceiptAddressPrint)) {
  console.log('❌ Failed to patch Bulk Receipt Address Print');
  success = false;
} else {
  console.log('✅ Patched Bulk Receipt Address Print');
}

if (!replaceText(oldReceiptAddressInput, newReceiptAddressInput)) {
  console.log('❌ Failed to patch Receipt Address Input');
  success = false;
} else {
  console.log('✅ Patched Receipt Address Input');
}

if (!replaceText(oldReceiptAddressPrint, newReceiptAddressPrint)) {
  console.log('❌ Failed to patch Receipt Address Print');
  success = false;
} else {
  console.log('✅ Patched Receipt Address Print');
}

if (success) {
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', content, 'utf8');
  console.log('🎉 All address patches applied successfully!');
} else {
  console.log('⚠️ Address patches partially failed. Check code mismatch.');
}
