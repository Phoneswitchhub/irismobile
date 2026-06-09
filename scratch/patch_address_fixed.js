const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// ── 1. Bulk Sale Modal Address Inputs ──
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
                      <option value="นครราชสีมา">นครราชสีมา (나콘랏차시มา)</option>
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
                  </div>`.replace(/\r\n/g, '\n');

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
                  </div>`.replace(/\r\n/g, '\n');

// ── 2. Receipt-Only Modal Address Inputs ──
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
                  </div>`.replace(/\r\n/g, '\n');

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
                  </div>`.replace(/\r\n/g, '\n');

let success = true;

if (content.includes(oldBulkAddressInput)) {
  content = content.replace(oldBulkAddressInput, newBulkAddressInput);
  console.log('✅ Replaced Bulk Address Input');
} else {
  console.log('❌ Failed to find Bulk Address Input');
  success = false;
}

if (content.includes(oldReceiptAddressInput)) {
  content = content.replace(oldReceiptAddressInput, newReceiptAddressInput);
  console.log('✅ Replaced Receipt Address Input');
} else {
  console.log('❌ Failed to find Receipt Address Input');
  success = false;
}

if (success) {
  // Convert back to CRLF
  const finalContent = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', finalContent, 'utf8');
  console.log('🎉 Address patch successfully completed!');
} else {
  console.log('⚠️ Address patch aborted due to mismatch.');
}
