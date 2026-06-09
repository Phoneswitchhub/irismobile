const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// ── 1. Add filteredExchangeSoldDevices useMemo after filteredSoldDevices ──
const oldSoldDevicesMemoEnd = `  }, [devices, soldSearchQuery, categoryFilter, soldSelectedDays, soldSelectedMonth, matchesCategory, sortDevices, normalizeModelName, getYearMonth]);`;
const newSoldDevicesMemoEnd = `  }, [devices, soldSearchQuery, categoryFilter, soldSelectedDays, soldSelectedMonth, matchesCategory, sortDevices, normalizeModelName, getYearMonth]);

  const filteredExchangeSoldDevices = useMemo(() => {
    const query = exchangeSearchQuery.trim().toLowerCase();
    const list = devices.filter(d => !d.deleted_at && d.is_sold);
    if (!query) return list.slice(0, 10);
    return list.filter(d => 
      (d.model_name && d.model_name.toLowerCase().includes(query)) ||
      (d.imei && d.imei.includes(query)) ||
      (d.sticker && d.sticker.toLowerCase().includes(query))
    );
  }, [devices, exchangeSearchQuery]);`;

// ── 2. Add exchange state resets to handleOpenSellModal ──
const oldOpenSellModal = `    setTradeInDeviceName('');
    setTradeInValue(0);
  };`;
const newOpenSellModal = `    setTradeInDeviceName('');
    setTradeInValue(0);
    setExchangeReturnedDeviceId('');
    setExchangeSearchQuery('');
    setExchangeMode('even');
    setExchangeCashDiff(0);
    setExchangeMemo('');
  };`;

// ── 3. Modify handleProcessSale exchange flow ──
const oldProcessSaleBody = `      let finalNotes = saleNotes.trim();
      if (saleType === 'exchange') {
        const tradeInPart = \`[기기 보상: \${tradeInDeviceName.trim() || '미기입'} (฿\${(Number(tradeInValue) || 0).toLocaleString()})]\`;
        finalNotes = finalNotes ? \`\${finalNotes} \${tradeInPart}\` : tradeInPart;
      }
 
      const formattedSaleDate = formatDateToDot(saleDate);`;

const newProcessSaleBody = `      let finalNotes = saleNotes.trim();
      let cashDiffValue = Number(depositAmount) || 0;

      if (saleType === 'exchange') {
        if (!exchangeReturnedDeviceId) {
          showToast('반납 기기를 선택해 주세요. (Please select a returned device.)', 'error');
          return;
        }
        if (!exchangeMemo.trim()) {
          showToast('교환 사유를 입력해 주세요. (Exchange reason is required.)', 'error');
          return;
        }

        const returnedDev = devices.find(d => d.id === exchangeReturnedDeviceId);
        if (!returnedDev) throw new Error('Return device not found');

        const diff = Number(exchangeCashDiff) || 0;
        if (exchangeMode === 'upgrade') {
          cashDiffValue = diff;
        } else if (exchangeMode === 'downgrade') {
          cashDiffValue = -diff;
        } else {
          cashDiffValue = 0;
        }

        // 1. Update the returned device (cancel sale, restore to stock, add note)
        const returnedDevNotes = returnedDev.notes || '';
        const returnNote = \`[교환반품] (사유: \${exchangeMemo.trim()}, 대체기기 IMEI: \${sellingDevice.imei})\`;
        const finalReturnedNotes = returnedDevNotes ? \`\${returnedDevNotes} | \${returnNote}\` : returnNote;

        const { error: returnError } = await supabase
          .from('sheets_inventory')
          .update({
            is_sold: false,
            sale_date: null,
            seller_name: null,
            is_reserved: false,
            reserved_by: null,
            reserved_date: null,
            notes: finalReturnedNotes
          })
          .eq('id', exchangeReturnedDeviceId);

        if (returnError) throw returnError;

        // 2. Prep notes for the new device
        const newDevNote = \`[기기교환 반납IMEI: \${returnedDev.imei}] \${exchangeMemo.trim()}\`;
        finalNotes = finalNotes ? \`\${finalNotes} | \${newDevNote}\` : newDevNote;
      }
 
      const formattedSaleDate = formatDateToDot(saleDate);`;

// ── 4. Modify deposit_amount assignment in the update block ──
const oldUpdateBlock = `          selling_price: calculatedFinalPrice,
          sale_type: saleType,
          deposit_amount: Number(depositAmount) || 0,
          cod_amount: saleType === 'cod' ? (Number(codAmountInput) || 0) : 0,`;

const newUpdateBlock = `          selling_price: calculatedFinalPrice,
          sale_type: saleType,
          deposit_amount: saleType === 'exchange' ? cashDiffValue : (Number(depositAmount) || 0),
          cod_amount: saleType === 'cod' ? (Number(codAmountInput) || 0) : 0,`;

// ── 5. Replace legacy exchange inputs in Sell Modal JSX ──
const oldExchangeJSX = `              {saleType === 'exchange' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">보상 기기명 (Trade-in Device)</label>
                      <input
                        type="text"
                        placeholder="예: iPhone 11 64G"
                        value={tradeInDeviceName}
                        onChange={(e) => setTradeInDeviceName(e.target.value)}
                        className="form-input"
                        style={{ margin: 0 }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">보상 기기 평가 금액 (Trade-in Value)</label>
                      <input
                        type="number"
                        placeholder="5000"
                        value={tradeInValue}
                        onChange={(e) => setTradeInValue(e.target.value === '' ? '' : Number(e.target.value))}
                        className="form-input"
                        style={{ margin: 0 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">추가 수금액 (Additional Cash/Transfer)</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="form-input"
                        style={{ margin: 0 }}
                      />
                    </div>
                  </div>
                </>
              )}`;

const newExchangeJSX = `              {saleType === 'exchange' && (
                <>
                  {/* Search and Select Returned Device */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">🔄 반납 기기 선택 (Select Returned Device) *</label>
                    <input
                      type="text"
                      placeholder="기기명, IMEI, 스티커 번호로 검색..."
                      value={exchangeSearchQuery}
                      onChange={(e) => setExchangeSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, marginBottom: '6px' }}
                    />
                    
                    {/* List of matching sold devices */}
                    {!exchangeReturnedDeviceId ? (
                      <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg2)' }}>
                        {filteredExchangeSoldDevices.length === 0 ? (
                          <div style={{ padding: '10px', fontSize: '12px', color: 'var(--t3)', textAlign: 'center' }}>검색 결과가 없습니다.</div>
                        ) : (
                          filteredExchangeSoldDevices.map(d => (
                            <div
                              key={d.id}
                              onClick={() => {
                                setExchangeReturnedDeviceId(d.id);
                                setExchangeSearchQuery('');
                              }}
                              style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ fontWeight: 700 }}>{d.model_name}</span>
                              <span style={{ color: 'var(--t2)', fontSize: '11px', marginLeft: '6px' }}>({d.sticker || '스티커 없음'})</span>
                              <br />
                              <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--t3)' }}>IMEI: {d.imei}</span>
                              <span style={{ float: 'right', fontWeight: 800, color: 'var(--green)' }}>฿{(d.selling_price || 0).toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (() => {
                      const selectedReturnDev = devices.find(d => d.id === exchangeReturnedDeviceId);
                      return (
                        <div style={{ padding: '12px', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12.5px' }}>
                            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--purple-l)', fontWeight: 700, display: 'block' }}>선택된 반납 기기</span>
                            <span style={{ fontWeight: 700 }}>{selectedReturnDev?.model_name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--t2)', marginLeft: '6px' }}>({selectedReturnDev?.sticker || '스티커 없음'})</span>
                            <span style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', color: 'var(--t3)', marginTop: '2px' }}>IMEI: {selectedReturnDev?.imei}</span>
                            <span style={{ display: 'block', fontSize: '12px', color: 'var(--green)', fontWeight: 700, marginTop: '2px' }}>기존 판매가: ฿{(selectedReturnDev?.selling_price || 0).toLocaleString()}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExchangeReturnedDeviceId('')}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
                          >
                            변경
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {exchangeReturnedDeviceId && (
                    <>
                      {/* Settlement Mode Selection */}
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="form-label">💰 교환 정산 방식 (Settlement Mode)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => { setExchangeMode('even'); setExchangeCashDiff(0); }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: exchangeMode === 'even' ? '2px solid var(--purple-l)' : '1px solid var(--border)',
                              background: exchangeMode === 'even' ? 'rgba(124, 58, 237, 0.08)' : '#fff',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              color: exchangeMode === 'even' ? 'var(--purple-l)' : 'var(--t2)'
                            }}
                          >
                            단순 맞교환
                          </button>
                          <button
                            type="button"
                            onClick={() => { setExchangeMode('upgrade'); setExchangeCashDiff(0); }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: exchangeMode === 'upgrade' ? '2px solid var(--green)' : '1px solid var(--border)',
                              background: exchangeMode === 'upgrade' ? 'rgba(16, 185, 129, 0.08)' : '#fff',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              color: exchangeMode === 'upgrade' ? 'var(--green)' : 'var(--t2)'
                            }}
                          >
                            추가 수금 (+)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setExchangeMode('downgrade'); setExchangeCashDiff(0); }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: exchangeMode === 'downgrade' ? '2px solid var(--red)' : '1px solid var(--border)',
                              background: exchangeMode === 'downgrade' ? 'rgba(239, 68, 68, 0.08)' : '#fff',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              color: exchangeMode === 'downgrade' ? 'var(--red)' : 'var(--t2)'
                            }}
                          >
                            차액 환불 (-)
                          </button>
                        </div>
                      </div>

                      {/* Cash Difference Input */}
                      {exchangeMode !== 'even' && (
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label className="form-label">
                            {exchangeMode === 'upgrade' ? '추가 수금액 (Amount Received) *' : '환불 금액 (Amount Refunded) *'}
                          </label>
                          <input
                            type="number"
                            value={exchangeCashDiff}
                            onChange={(e) => setExchangeCashDiff(e.target.value === '' ? '' : Number(e.target.value))}
                            className="form-input"
                            placeholder="금액 입력..."
                            style={{ margin: 0 }}
                          />
                        </div>
                      )}

                      {/* Exchange Reason Memo */}
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="form-label">📝 교환 사유 / 반품 메모 (Exchange Reason) *</label>
                        <input
                          type="text"
                          value={exchangeMemo}
                          onChange={(e) => setExchangeMemo(e.target.value)}
                          className="form-input"
                          placeholder="예: 화면 잔상으로 인한 교환, 단순 변심 교환 등..."
                          style={{ margin: 0 }}
                        />
                      </div>
                    </>
                  )}
                </>
              )}`;

let success = true;

const replaceText = (oldText, newText) => {
  if (content.includes(oldText)) {
    content = content.replace(oldText, newText);
    return true;
  }
  return false;
};

if (replaceText(oldSoldDevicesMemoEnd, newSoldDevicesMemoEnd)) {
  console.log('1. ✅ Added filteredExchangeSoldDevices useMemo');
} else {
  console.log('1. ❌ Failed to add filteredExchangeSoldDevices useMemo');
  success = false;
}

if (replaceText(oldOpenSellModal, newOpenSellModal)) {
  console.log('2. ✅ Updated handleOpenSellModal states reset');
} else {
  console.log('2. ❌ Failed to update handleOpenSellModal');
  success = false;
}

if (replaceText(oldProcessSaleBody, newProcessSaleBody)) {
  console.log('3. ✅ Updated handleProcessSale exchange flow');
} else {
  console.log('3. ❌ Failed to update handleProcessSale exchange flow');
  success = false;
}

if (replaceText(oldUpdateBlock, newUpdateBlock)) {
  console.log('4. ✅ Updated deposit_amount mapping');
} else {
  console.log('4. ❌ Failed to update deposit_amount mapping');
  success = false;
}

if (replaceText(oldExchangeJSX, newExchangeJSX)) {
  console.log('5. ✅ Replaced legacy exchange JSX in Sell Modal');
} else {
  console.log('5. ❌ Failed to replace legacy exchange JSX');
  success = false;
}

if (success) {
  const finalContent = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', finalContent, 'utf8');
  console.log('🎉 Exchange/Swap modal enhancements completed successfully!');
} else {
  console.log('⚠️ Exchange/Swap updates aborted due to code mismatches.');
}
