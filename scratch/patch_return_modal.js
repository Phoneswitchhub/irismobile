const fs = require('fs');

let content = fs.readFileSync('src/app/staff/dashboard/page.tsx', 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// ── 1. Old restore handler block replacement ──
const oldRestoreHandlers = `  const handleRestoreToStock = async (deviceId: string) => {
    if (!confirm(t('toast_confirm_restore_selected', { count: 1 }))) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_sold: false,
          sale_date: null,
          seller_name: null,
          is_reserved: false,
          reserved_by: null,
          reserved_date: null
        })
        .eq('id', deviceId);

      if (error) throw error;

      showToast(t('toast_active_stock_success'), 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast(t('toast_active_stock_failed') + err.message, 'error');
    }
  };

  // Bulk Re-verify back to inventory stock
  const handleBulkRestoreToStock = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t('toast_confirm_restore_selected', { count: selectedIds.length }))) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_sold: false,
          sale_date: null,
          seller_name: null,
          is_reserved: false,
          reserved_by: null,
          reserved_date: null
        })
        .in('id', selectedIds);

      if (error) throw error;

      showToast(t('toast_restore_selected_success', { count: selectedIds.length }), 'success');
      setSelectedIds([]);
      loadLedgerData();
    } catch (err: any) {
      showToast(t('toast_active_stock_failed') + err.message, 'error');
    }
  };`.replace(/\r\n/g, '\n');

const newRestoreHandlers = `  const handleOpenReturnModal = (ids: string[]) => {
    setReturnDeviceIds(ids);
    setReturnType('simple');
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (returnDeviceIds.length === 0) return;
    setProcessingReturn(true);
    try {
      for (const deviceId of returnDeviceIds) {
        const dev = devices.find(d => d.id === deviceId);
        let finalNotes = dev?.notes || '';
        if (returnType === 'defect') {
          const noteText = \`[하자반품] \${returnNotes.trim()}\`;
          finalNotes = finalNotes ? \`\${finalNotes} | \${noteText}\` : noteText;
        }

        const { error } = await supabase
          .from('sheets_inventory')
          .update({
            is_sold: false,
            sale_date: null,
            seller_name: null,
            is_reserved: false,
            reserved_by: null,
            reserved_date: null,
            notes: finalNotes || null
          })
          .eq('id', deviceId);

        if (error) throw error;
      }

      showToast(t('toast_restore_selected_success', { count: returnDeviceIds.length }) || '재고 복구 완료', 'success');
      setSelectedIds([]);
      setIsReturnModalOpen(false);
      loadLedgerData();
    } catch (err: any) {
      showToast('재고 복구 실패: ' + err.message, 'error');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleRestoreToStock = (deviceId: string) => {
    handleOpenReturnModal([deviceId]);
  };

  const handleBulkRestoreToStock = () => {
    if (selectedIds.length === 0) return;
    handleOpenReturnModal(selectedIds);
  };`.replace(/\r\n/g, '\n');

// ── 2. Modal Insertion block ──
const oldEndingString = `    </div>\n  );\n}`;
const newEndingString = `      {/* ───────────── RETURN / RESTORE MODAL ───────────── */}
      {isReturnModalOpen && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3100 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '450px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd" style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '17px', fontWeight: 900 }}>🔄 재고 복구 및 반품 처리 ({returnDeviceIds.length}대)</span>
              <button type="button" className="modal-close" onClick={() => setIsReturnModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>복구 방식 선택 (Select Restore Type)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', background: 'var(--bg2)', padding: '12px 14px', borderRadius: '10px', border: returnType === 'simple' ? '2px solid var(--green)' : '1px solid var(--border)' }}>
                    <input
                      type="radio"
                      name="returnType"
                      checked={returnType === 'simple'}
                      onChange={() => setReturnType('simple')}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: returnType === 'simple' ? 'var(--green)' : 'var(--t1)' }}>단순 재고 복구 (Simple Restore)</span>
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>판매 내역을 취소하고 정상 재고 상태로 되돌립니다.</p>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', background: 'var(--bg2)', padding: '12px 14px', borderRadius: '10px', border: returnType === 'defect' ? '2px solid var(--red)' : '1px solid var(--border)' }}>
                    <input
                      type="radio"
                      name="returnType"
                      checked={returnType === 'defect'}
                      onChange={() => setReturnType('defect')}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: returnType === 'defect' ? 'var(--red)' : 'var(--t1)' }}>하자 반품 처리 (Return due to Defect)</span>
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>하자로 인한 반품 처리를 하며, 기기 메모에 결함 내용을 남깁니다.</p>
                    </div>
                  </label>
                </div>
              </div>

              {returnType === 'defect' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>🛠️ 하자 사유 / 반품 메모 (Defect Reason) *</label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="form-textarea"
                    placeholder="반품 사유를 입력해 주세요 (예: 액정 터치 불량, 전원 불량)..."
                    style={{ margin: 0, width: '100%', minHeight: '80px', fontSize: '12.5px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={processingReturn || (returnType === 'defect' && !returnNotes.trim())}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: returnType === 'defect' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #10b981, #047857)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: (processingReturn || (returnType === 'defect' && !returnNotes.trim())) ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: (processingReturn || (returnType === 'defect' && !returnNotes.trim())) ? 0.5 : 1
                  }}
                >
                  {processingReturn ? '처리중...' : '확인 (Confirm)'}
                </button>
                <button
                  type="button"
                  className="btn-sm btn-red"
                  onClick={() => setIsReturnModalOpen(false)}
                  style={{ padding: '12px 20px', borderRadius: '10px', margin: 0 }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}`;

let success = true;

if (content.includes(oldRestoreHandlers)) {
  content = content.replace(oldRestoreHandlers, newRestoreHandlers);
  console.log('✅ Replaced restore handlers successfully!');
} else {
  console.log('❌ Failed to find restore handlers');
  success = false;
}

if (content.includes(oldEndingString)) {
  content = content.replace(oldEndingString, newEndingString);
  console.log('✅ Appended Return Modal JSX successfully!');
} else {
  console.log('❌ Failed to find ending tags');
  success = false;
}

if (success) {
  // Convert back to CRLF format
  const finalContent = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('src/app/staff/dashboard/page.tsx', finalContent, 'utf8');
  console.log('🎉 Return modal implementation patched successfully!');
} else {
  console.log('⚠️ Aborted. Please check mismatches.');
}
