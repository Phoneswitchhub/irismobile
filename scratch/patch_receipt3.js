const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

const targetStr = '      })()}\r\n\r\n    </div>';

const receiptModalJSX = `      })()}

      {/* ───────────── RECEIPT-ONLY MODAL ───────────── */}
      {isReceiptModalOpen && (() => {
        const subtotal = receiptItems.reduce((s, i) => s + i.price, 0);
        const vatAmt = receiptTaxIncluded ? Math.round(subtotal * 0.07) : 0;
        const grandTotal = subtotal + vatAmt;
        const todayForReceipt = (() => {
          const d = new Date(receiptSaleDate || new Date().toISOString().slice(0,10));
          return { dd: String(d.getDate()).padStart(2,'0'), mm: String(d.getMonth()+1).padStart(2,'0'), yyyy: d.getFullYear() };
        })();

        return (
          <div className="modal-bg open" style={{ zIndex: 3100 }}>
            <div className="modal" style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px' }}>
              {/* Header */}
              <div className="modal-hd" style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '17px', fontWeight: 900 }}>🖨️ 영수증 출력 ({receiptItems.length}대)</span>
                <button type="button" className="modal-close" onClick={() => setIsReceiptModalOpen(false)}>✕</button>
              </div>

              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Top 2-col info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>🏪 ชื่อผู้ซื้อ / 구매자 이름</label>
                    <input type="text" value={receiptBuyerName} onChange={e => setReceiptBuyerName(e.target.value)} className="form-input" placeholder="ชื่อลูกค้าหรือชื่อร้าน..." style={{ margin: 0 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📞 เบอร์โทร / 연락처</label>
                    <input type="text" value={receiptBuyerPhone} onChange={e => setReceiptBuyerPhone(e.target.value)} className="form-input" placeholder="0XX-XXX-XXXX" style={{ margin: 0 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
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
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📅 วันที่ออกใบเสร็จ (발행일)</label>
                    <input type="date" value={receiptSaleDate} onChange={e => setReceiptSaleDate(e.target.value)} className="form-input" style={{ margin: 0 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginTop: '22px' }}>
                      <input type="checkbox" checked={receiptTaxIncluded} onChange={e => setReceiptTaxIncluded(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <span>🧾 ใบกำกับภาษี 7% VAT<br/><span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--t2)' }}>세금계산서 발행 (7% 부가세)</span></span>
                    </label>
                  </div>
                </div>

                {/* Device list table */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '8px' }}>รายการสินค้า (기기 목록)</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border)', width: '38%' }}>รุ่น / 모델</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border)', width: '34%' }}>IMEI</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border)', width: '28%' }}>ราคา / 금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptItems.map((item, idx) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 700 }}>{item.model_name}</td>
                            <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--t2)' }}>{item.imei}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>฿</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={e => {
                                    const v = Number(e.target.value) || 0;
                                    setReceiptItems(prev => prev.map((p, i) => i === idx ? { ...p, price: v } : p));
                                  }}
                                  style={{ width: '90px', textAlign: 'right', border: '1px solid var(--border)', borderRadius: '5px', padding: '3px 6px', fontSize: '12px', fontWeight: 700 }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--t2)' }}>
                    <span>ยอดรวม (소계)</span>
                    <span style={{ fontWeight: 700 }}>฿{subtotal.toLocaleString()}</span>
                  </div>
                  {receiptTaxIncluded && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d97706' }}>
                      <span>VAT 7%</span>
                      <span style={{ fontWeight: 700 }}>+฿{vatAmt.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: 'var(--purple-l)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '2px' }}>
                    <span>ยอดรวมทั้งหมด (합계)</span>
                    <span>฿{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsReceiptModalOpen(false)} style={{ padding: '11px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                    ยกเลิก (취소)
                  </button>
                  <button type="button" onClick={handlePrintReceiptOnly}
                    style={{ padding: '11px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 10px rgba(14,165,233,0.4)' }}>
                    🖨️ 영수증 출력 (Receipt Print)
                  </button>
                </div>
              </div>
            </div>

            {/* ── Hidden Receipt printable content ── */}
            <div id="receipt-only-printable" style={{ display: 'none' }}>
              <div className="receipt">
                <div className="header-row">
                  <div className="company-info">
                    <div className="bolder">บริษัท โฟน สวิทช์ฮับ จำกัด (0105568203279)</div>
                    <div>(ร้าน ไอริช โมบาย)</div>
                    <div>IRIS Mobile Thailand</div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="logo-img" src="/iris_logo_official.png" alt="IRIS MOBILE" />
                </div>
                <div className="receipt-title">ใบเสร็จรับเงิน</div>
                <div className="date-row">วันที่&nbsp;&nbsp;{todayForReceipt.dd}&nbsp;/&nbsp;{todayForReceipt.mm}&nbsp;/&nbsp;{todayForReceipt.yyyy}</div>
                <div className="buyer-row">ชื่อผู้ซื้อ&nbsp;&nbsp;{receiptBuyerName || '........................................................................'}</div>
                {(receiptBuyerPhone || receiptBuyerAddress) && (
                  <div className="buyer-row" style={{ fontSize: '12px', marginBottom: '6px' }}>
                    {receiptBuyerPhone && <span>โทร: {receiptBuyerPhone}&nbsp;&nbsp;&nbsp;</span>}
                    {(receiptBuyerAddress || receiptBuyerAddressCustom) && <span>ที่อยู่: {receiptBuyerAddress === '__custom__' ? receiptBuyerAddressCustom : receiptBuyerAddress}</span>}
                  </div>
                )}
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>รหัส (IMEI)</th>
                      <th style={{ width: '35%' }}>รายการสินค้า</th>
                      <th style={{ width: '10%' }}>จำนวนหน่วย</th>
                      <th style={{ width: '20%' }}>ราคาต่อหน่วย</th>
                      <th style={{ width: '15%' }}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '10px', fontFamily: 'monospace' }}>{item.imei}</td>
                        <td className="left">{item.model_name}</td>
                        <td>1</td>
                        <td className="right">฿{item.price.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 10 - receiptItems.length) }).map((_, i) => (
                      <tr key={\`ep-\${i}\`} className="empty-rows"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
                    ))}
                    {receiptTaxIncluded && (
                      <>
                        <tr className="vat-section total-row">
                          <td colSpan={3} style={{ border: 'none', background: 'transparent' }}></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>ราคาก่อน VAT</td>
                          <td className="right">฿{subtotal.toLocaleString()}</td>
                        </tr>
                        <tr className="vat-section total-row">
                          <td colSpan={3} style={{ border: 'none', background: 'transparent' }}></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>ภาษีมูลค่าเพิ่ม 7%</td>
                          <td className="right">฿{vatAmt.toLocaleString()}</td>
                        </tr>
                      </>
                    )}
                    <tr className="total-row">
                      <td colSpan={3} style={{ border: 'none', background: 'transparent' }}></td>
                      <td style={{ textAlign: 'right', fontWeight: 900 }}>จำนวนเงินรวมทั้งเงิน</td>
                      <td className="right" style={{ fontWeight: 900 }}>฿{grandTotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="sig-row">
                  <div className="sig-box">
                    ลงชื่อ&nbsp;.......................................&nbsp;ลูกค้า<br/>
                    (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
                  </div>
                  <div className="sig-box" style={{ textAlign: 'right', position: 'relative' }}>
                    ลงชื่อ&nbsp;.......................................&nbsp;ผู้รับเงิน<br/>
                    (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
                    <div className="stamp-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/company_stamp_transparent.png" alt="Company Seal" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, receiptModalJSX);
  console.log('✅ Receipt Modal JSX successfully patched!');
} else {
  // Let's try with LF just in case
  const targetStrLF = '      })()}\n\n    </div>';
  if (content.includes(targetStrLF)) {
    content = content.replace(targetStrLF, receiptModalJSX.replace(/\r\n/g, '\n'));
    console.log('✅ Receipt Modal JSX successfully patched (LF)!');
  } else {
    console.log('❌ Could not find target insertion point');
  }
}

fs.writeFileSync('src/app/staff/dashboard/page.tsx', content, 'utf8');
console.log('Done.');
