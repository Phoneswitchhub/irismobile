const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// Split into lines (handling both CRLF and LF)
const lines = content.split(/\r?\n/);

let bulkReplaced = false;
let receiptReplaced = false;

for (let i = 0; i < lines.length; i++) {
  // 1. Bulk Sale Address
  if (lines[i].includes('📍 ที่อยู่ / 주소') && lines[i+2].includes('value={bulkBuyerAddress}')) {
    // Replace lines from i-1 to i+32 (34 lines total)
    const newBulkBlock = `                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
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
                      <option value="นครราชสีมา">นครราชสีมา (나คงราชสีมา)</option>
                      <option value="อุดรธานี">อุดรธานี (우돈타니)</option>
                      <option value="ภูเก็ต">ภูเก็ต (ภูเก็ต)</option>
                      <option value="สงขลา">สงขลา (สงขลา)</option>
                      <option value="ชลบุรี">ชลบุรี (ชลบุรี)</option>
                      <option value="นนทบุรี">นนทบุรี (นนทบุรี)</option>
                      <option value="ปทุมธานี">ปทุมธานี (ปทุมธานี)</option>
                      <option value="สมุทรปราการ">สมุทรปราการ (สมุทรปราการ)</option>
                      <option value="ระยอง">ระยอง (ระยอง)</option>
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
    lines.splice(i - 1, 34, newBulkBlock);
    bulkReplaced = true;
    console.log('✅ Bulk address block replaced successfully');
    // Break or adjust index because array size changed
    break;
  }
}

// Reload lines for second search since index shifted
const content2 = lines.join('\n');
const lines2 = content2.split('\n');

for (let i = 0; i < lines2.length; i++) {
  // 2. Receipt Address
  if (lines2[i].includes('📍 ที่อยู่ / 주소') && lines2[i+2].includes('value={receiptBuyerAddress}')) {
    const newReceiptBlock = `                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
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
                      <option value="นครราชสีมา">นครราชสีมา (นครราชสีมา)</option>
                      <option value="อุดรธานี">อุดรธานี (อุดรธานี)</option>
                      <option value="ภูเก็ต">ภูเก็ต (ภูเก็ต)</option>
                      <option value="สงขลา">สงขลา (สงขลา)</option>
                      <option value="ชลบุรี">ชลบุรี (ชลบุรี)</option>
                      <option value="นนทบุรี">นนทบุรี (นนทบุรี)</option>
                      <option value="ปทุมธานี">ปทุมธานี (ปทุมธานี)</option>
                      <option value="สมุทรปราการ">สมุทรปราการ (สมุทรปราการ)</option>
                      <option value="ระยอง">ระยอง (ระยอง)</option>
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
    lines2.splice(i - 1, 34, newReceiptBlock);
    receiptReplaced = true;
    console.log('✅ Receipt address block replaced successfully');
    break;
  }
}

if (bulkReplaced && receiptReplaced) {
  // Convert back to CRLF format
  const finalContent = lines2.join('\r\n');
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', finalContent, 'utf8');
  console.log('🎉 Address patch successfully completed!');
} else {
  console.log('⚠️ Address patch failed. Bulk:', bulkReplaced, 'Receipt:', receiptReplaced);
}
