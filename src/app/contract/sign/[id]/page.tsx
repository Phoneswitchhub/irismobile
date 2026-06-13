'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MobileLayout from '@/components/MobileLayout';

export default function CustomerSignPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Signature States
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch contract on load
  useEffect(() => {
    if (!contractId) return;

    const fetchContract = async () => {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();

        if (error || !data) {
          setErrorMsg('ไม่พบข้อมูลสัญญาเช่าซื้อนี้ (Contract not found or database table public.contracts not created yet)');
        } else {
          setContract(data);
          if (data.signature_data) {
            setSignatureData(data.signature_data);
          }
          if (data.status === 'signed') {
            setSuccess(true);
          }
        }
      } catch (err: any) {
        console.error('Failed to load contract:', err);
        setErrorMsg('เกิดข้อผิดพลาดในการโหลดข้อมูลสัญญา');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  // E-Signature Direct DOM Event Binding for Smooth Mobile Drawing
  useEffect(() => {
    if (showSignModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }

      let drawing = false;
      let cachedRect: DOMRect | null = null;
      const ctx = canvas.getContext('2d');

      const start = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        if (!canvas || !ctx) return;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        cachedRect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const x = clientX - cachedRect.left;
        const y = clientY - cachedRect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        drawing = true;
      };

      const move = (e: MouseEvent | TouchEvent) => {
        if (!drawing || !canvas || !ctx || !cachedRect) return;
        e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const x = clientX - cachedRect.left;
        const y = clientY - cachedRect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
      };

      const stop = () => {
        drawing = false;
        cachedRect = null;
      };

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', stop);
      canvas.addEventListener('mouseleave', stop);

      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', stop, { passive: false });
      canvas.addEventListener('touchcancel', stop, { passive: false });

      return () => {
        canvas.removeEventListener('mousedown', start);
        canvas.removeEventListener('mousemove', move);
        canvas.removeEventListener('mouseup', stop);
        canvas.removeEventListener('mouseleave', stop);

        canvas.removeEventListener('touchstart', start);
        canvas.removeEventListener('touchmove', move);
        canvas.removeEventListener('touchend', stop);
        canvas.removeEventListener('touchcancel', stop);
      };
    }
  }, [showSignModal]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      alert('กรุณาเซ็นชื่อก่อนบันทึก (Please sign before saving)');
      return;
    }
    setSignatureData(canvas.toDataURL());
    setShowSignModal(false);
  };

  const submitContractSignature = async () => {
    if (!signatureData) {
      alert('กรุณาลงลายมือชื่อก่อนส่งเอกสาร (Please sign the contract first)');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          signature_data: signatureData,
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCapacity = (cap: string) => {
    const clean = (cap || '').trim();
    if (/^\d+$/.test(clean)) return `${clean}GB`;
    return clean;
  };

  const formatThaiDate = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const thaiYear = year + 543;
    return `${day} ${thaiMonths[month - 1]} ${thaiYear}`;
  };

  if (loading) {
    return (
      <MobileLayout paddingBottom="0" paddingTop="20px">
        <div className="status-container">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูลสัญญา... (Loading contract...)</p>
        </div>
        <style jsx>{`
          .status-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            color: #f1f5f9;
          }
          .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border-left-color: #22d3ee;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </MobileLayout>
    );
  }

  if (errorMsg) {
    return (
      <MobileLayout paddingBottom="0" paddingTop="20px">
        <div className="status-container">
          <div className="error-icon">⚠️</div>
          <p className="error-msg">{errorMsg}</p>
          <button className="btn-back" onClick={() => router.push('/')}>กลับหน้าหลัก (Back to Home)</button>
        </div>
        <style jsx>{`
          .status-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            padding: 24px;
            text-align: center;
            color: #f1f5f9;
          }
          .error-icon { font-size: 48px; margin-bottom: 16px; }
          .error-msg { font-size: 16px; margin-bottom: 24px; color: #f87171; max-width: 400px; line-height: 1.5; }
          .btn-back { background: #1e293b; border: 1px solid #334155; color: #fff; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        `}</style>
      </MobileLayout>
    );
  }

  if (success && !showSignModal) {
    return (
      <MobileLayout paddingBottom="0" paddingTop="20px">
        <div className="status-container">
          <div className="success-icon">✔️</div>
          <h3>ส่งเอกสารสัญญาเรียบร้อยแล้ว!</h3>
          <p className="success-desc">
            ขอบคุณสำหรับการลงลายมือชื่ออิเล็กทรอนิกส์ ทางบริษัทจะดำเนินขั้นตอนต่อไปในทันที
          </p>
          <p className="success-desc-en">
            Thank you! Your signed hire-purchase contract has been submitted successfully.
          </p>
          <button className="btn-back" onClick={() => router.push('/')}>กลับหน้าหลัก (Back to Home)</button>
        </div>
        <style jsx>{`
          .status-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 85vh;
            padding: 24px;
            text-align: center;
            color: #f1f5f9;
            background: #0b0f19;
          }
          .success-icon {
            font-size: 64px;
            color: #10b981;
            background: rgba(16, 185, 129, 0.1);
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
          }
          h3 { font-size: 22px; font-weight: 800; margin-bottom: 12px; color: #22d3ee; }
          .success-desc { font-size: 14px; color: #94a3b8; max-width: 420px; line-height: 1.5; margin-bottom: 6px; }
          .success-desc-en { font-size: 12.5px; color: #64748b; max-width: 420px; line-height: 1.5; margin-bottom: 30px; }
          .btn-back { background: linear-gradient(135deg, #06b6d4, #0891b2); color: #fff; padding: 14px 28px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2); }
        `}</style>
      </MobileLayout>
    );
  }

  // Helper values
  const remainingBalance = (Number(contract.installments_count) || 0) * (Number(contract.installment_amount) || 0);
  const sellingPriceDoc = (Number(contract.down_payment) || 0) + remainingBalance;
  const firstDateObj = contract.first_installment_date ? new Date(contract.first_installment_date) : null;
  const installmentDay = firstDateObj ? firstDateObj.getDate() : 7;

  return (
    <MobileLayout paddingBottom="0" paddingTop="20px">
      <div className="sign-page-container">
        
        {/* Top Sticky Header */}
        <div className="sign-sticky-header">
          <div className="header-info">
            <h2>✍️ ลงนามสัญญาเช่าซื้อ (Sign Contract)</h2>
            <p>กรุณาตรวจสอบรายละเอียดสัญญาและลงชื่อด้านล่างสุด</p>
          </div>
        </div>

        {/* Contract Preview Wrapper */}
        <div className="contract-preview-scroll-wrapper">
          <div className="contract-document">
            {contract.contract_type === 'purchase' ? (
              <>
                {/* Header Brand Area - Second-hand Purchase */}
                <div className="doc-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img 
                      src="/iris_logo_official.png" 
                      alt="IRIS MOBILE" 
                      style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'contain' }} 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  <div className="title-box">
                    <h2>หนังสือรับซื้อของเก่า</h2>
                    <div className="brand-sub">IRIS MOBILE</div>
                    <div className="brand-corp">PHONE SWITCH HUB CO., LTD.</div>
                  </div>

                  <div className="meta-box">
                    <div><b>เลขที่สัญญา:</b> {contract.contract_no || '.........................'}</div>
                    <div><b>วันที่:</b> {formatThaiDate(contract.contract_date) || '.........................'}</div>
                  </div>
                </div>

                <div className="doc-body">
                  {/* Contract made info */}
                  <p className="indented-text">
                    ทำสัญญาที่ <b>{contract.store_name || 'ไอริส โมบาย'}</b> ที่อยู่ <b>{contract.store_address || '101/6 ซ.สุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กรุงเทพ 10260'}</b>
                  </p>
                  <p style={{ margin: '4px 0 12px' }}>
                    ระหว่าง <b>{contract.store_name || 'ไอริส โมบาย'}</b> ซึ่งในใบสัญญานี้ <b>"ผู้รับซื้อ"</b> ฝ่ายหนึ่ง กับ
                  </p>

                  {/* Customer Details */}
                  <div className="parties-grid">
                    <div><b>ชื่อ-สกุล:</b> <span className="fill-value">{contract.customer_name || '........................................................'}</span></div>
                    <div><b>สัญชาติ:</b> <span className="fill-value">{contract.nationality || '............'}</span></div>
                    
                    <div style={{ gridColumn: 'span 2' }}>
                      <b>เลขบัตรประชาชน:</b> <span className="fill-value">{contract.id_card_no || '................................................'}</span>
                      <span style={{ marginLeft: '24px' }}><b>เลขพาสปอร์ต:</b> <span className="fill-value">{contract.passport_no || '................................................'}</span></span>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}><b>ที่อยู่:</b> <span className="fill-value">{contract.customer_address || '................................................................................................................................................'}</span></div>
                  </div>

                  {/* Contact Channels */}
                  <h4 style={{ fontSize: '13px', margin: '14px 0 4px', color: '#111', fontWeight: 800 }}>ช่องทางการติดต่อ (Contact Info)</h4>
                  <div className="parties-grid" style={{ marginTop: '4px' }}>
                    <div><b>เบอร์โทรศัพท์:</b> <span className="fill-value">{contract.phone_no || '....................................'}</span></div>
                    <div><b>Facebook:</b> <span className="fill-value">{contract.facebook || '....................................'}</span></div>
                    <div style={{ gridColumn: 'span 2' }}><b>Line ID:</b> <span className="fill-value">{contract.line_id || '....................................'}</span></div>
                  </div>

                  <p className="indented-text" style={{ marginTop: '14px', marginBottom: '14px', lineHeight: 1.5 }}>
                    ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ขายของเก่า"</b> อีกฝ่ายหนึ่ง ทั้งสองฝ่ายตกลงซื้อ-ขายทรัพย์สินตามบัญชีรายการด้านล่างนี้ (รวมถึงส่วนควบ เครื่องอุปกรณ์ อะไหล่ สิ่งที่นำมาแทนของเดิม หรืออื่นๆ)
                  </p>

                  {/* Asset details */}
                  <h4 style={{ fontSize: '13px', margin: '14px 0 6px', color: '#111', fontWeight: 800 }}>สินทรัพย์ที่นำมาขาย (Asset Details)</h4>
                  <div className="product-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div><b>ชื่อสินทรัพย์:</b> <span className="fill-value">{contract.product_name || 'โทรศัพท์มือถือ'}</span></div>
                    <div><b>รุ่น (Model):</b> <span className="fill-value">{contract.model || '....................................'}</span></div>
                    <div><b>สี (Color):</b> <span className="fill-value">{contract.color || '....................................'}</span></div>
                    <div><b>ความจุ (Capacity):</b> <span className="fill-value">{contract.capacity ? formatCapacity(contract.capacity) : '....................................'}</span></div>
                    <div><b>Serial No.:</b> <span className="fill-value">{contract.serial_no || '....................................'}</span></div>
                    <div><b>IMEI:</b> <span className="fill-value">{contract.imei || '....................................'}</span></div>
                  </div>

                  {/* Accessories checkboxes */}
                  <div style={{ display: 'flex', gap: '20px', margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={contract.accessories_type === 'complete'} readOnly style={{ width: '16px', height: '16px' }} />
                      <span>มีอุปกรณ์ครบ (Complete Accessories)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={contract.accessories_type === 'incomplete'} readOnly style={{ width: '16px', height: '16px' }} />
                      <span>มีอุปกรณ์ไม่ครบ (Incomplete): <u>{contract.accessories_type === 'incomplete' ? contract.accessories_text : '........................'}</u></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={contract.accessories_type === 'none'} readOnly style={{ width: '16px', height: '16px' }} />
                      <span>ไม่มีอุปกรณ์อื่น (No other accessories)</span>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div style={{ margin: '16px 0', padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', color: '#ef4444', fontWeight: 800 }}>
                      รับซื้อในราคา : <span style={{ fontSize: '20px' }}>{contract.selling_price ? Number(contract.selling_price).toLocaleString() : '0'}</span> บาท (Baht)
                    </div>
                    <div style={{ fontSize: '12px', color: '#555' }}>
                      <b>ณ วันที่:</b> {formatThaiDate(contract.contract_date)} | <b>สถานที่รับซื้อ:</b> {contract.store_name || 'ไอริส โมบาย'}
                    </div>
                  </div>

                  {/* Conditions */}
                  <h4 style={{ fontSize: '13px', margin: '16px 0 6px', color: '#111', fontWeight: 800 }}>เงื่อนไข (Conditions)</h4>
                  <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '11px', lineHeight: 1.6, color: '#333' }}>
                    <li>ผู้ขายจะต้องยืนยันสินค้าได้ว่าเป็นของตนเอง (Seller must confirm the product is theirs)</li>
                    <li>หากทางร้านตรวจสอบแล้วพบว่ามีการนำของขโมยมาขาย ผู้ขายจะมีความผิดตามประมวลกฎหมาย โดยทางร้านจะไม่ขอรับผิดชอบใดๆ และส่งเรื่องให้ทางเจ้าหน้าที่ตำรวจดำเนินการทางกฎหมายทันที (If the product is stolen, the shop will not take responsibility and will report to the police immediately)</li>
                    <li>หลังจากรับซื้อและดำเนินการตกลงราคาแล้ว ผู้ซื้อไม่สามารถขอแก้ไขเพิ่มเติมได้ (Price agreement is final)</li>
                    <li>หลังจากลงนามในสัญญาแล้วสินทรัพย์ถือเป็นของผู้ซื้อทันที (Title transfers to purchaser immediately upon signing)</li>
                    <li>ผู้เยาว์ที่อายุน้อยกว่า 20 ปี ต้องได้รับการยินยอมจากผู้ปกครองโดยมีเอกสารยินยอมให้ขายสินทรัพย์ตามที่ทางร้านกำหนด (Minors under 20 must have parental consent)</li>
                  </ol>

                  {/* Signatures Area */}
                  <div className="signatures-container">
                    {/* Lessee (Customer) Signature Box */}
                    <div className="sig-box" onClick={() => setShowSignModal(true)} style={{ cursor: 'pointer' }}>
                      <div className="sig-label">ลงชื่อ (กรุณาแตะที่นี่เพื่อเซ็นชื่อ)</div>
                      <div className="sig-line-wrapper">
                        {signatureData ? (
                          <img src={signatureData} alt="Customer Signature" className="sig-img" />
                        ) : (
                          <div className="sig-placeholder">( แตะที่นี่เพื่อเซ็นชื่อ / Tap to sign )</div>
                        )}
                      </div>
                      <div className="sig-name">
                        ( {contract.customer_name || '........................................................'} )
                      </div>
                      <div className="sig-role">ผู้ขายของเก่า</div>
                    </div>

                    {/* Lessor (Company) Signature Box with Stamp */}
                    <div className="sig-box" style={{ position: 'relative' }}>
                      <div className="sig-label">ลงชื่อ</div>
                      <div className="sig-line-wrapper">
                        <div style={{ height: '100px', borderBottom: '1px solid #000', width: '200px', margin: '0 auto' }} />
                        {/* Official transparent company stamp seal */}
                        <img 
                          src="/company_stamp_transparent.png" 
                          alt="Company Seal Stamp" 
                          className="company-seal-stamp" 
                        />
                      </div>
                      <div className="sig-name">
                        ( {contract.store_name || 'บริษัท โฟน สวิตช์ ฮับ จำกัด'} )
                      </div>
                      <div className="sig-role">ผู้รับซื้อ</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Header Brand Area */}
                <div className="doc-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img 
                      src="/iris_logo_official.png" 
                      alt="IRIS MOBILE" 
                      style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'contain' }} 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  <div className="title-box">
                    <h2>หนังสือสัญญาเช่าซื้อ</h2>
                    <div className="brand-sub">IRIS MOBILE</div>
                    <div className="brand-corp">PHONE SWITCH HUB CO., LTD.</div>
                  </div>

                  <div className="meta-box">
                    <div><b>เลขที่สัญญา:</b> {contract.contract_no || '.........................'}</div>
                    <div><b>วันที่:</b> {formatThaiDate(contract.contract_date) || '.........................'}</div>
                    <div><b>สินค้ามาจาก:</b> {contract.store_name || 'ไอริส โมบาย'}</div>
                  </div>
                </div>

                <div className="doc-body">
                  <p className="indented-text">
                    ทำสัญญาที่ <b>{contract.store_name || 'ไอริส โมบาย'}</b> ที่อยู่ <b>{contract.store_address || '101/6 ซ.สุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กรุงเทพ 10260'}</b>
                  </p>
                  <p style={{ margin: '4px 0 12px' }}>
                    ระหว่าง <b>บริษัท โฟน สวิตช์ ฮับ จำกัด (ผู้ให้เช่าซื้อ)</b> ฝ่ายหนึ่ง กับ
                  </p>

                  {/* Parties Details Grid */}
                  <div className="parties-grid">
                    <div><b>ชื่อ-สกุล (ผู้เช่าซื้อ):</b> <span className="fill-value">{contract.customer_name || '........................................................'}</span></div>
                    <div><b>สัญชาติ:</b> <span className="fill-value">{contract.nationality || '............'}</span></div>
                    
                    <div style={{ gridColumn: 'span 2' }}>
                      <b>เลขบัตรประชาชน:</b> <span className="fill-value">{contract.id_card_no || '................................................'}</span>
                      <span style={{ marginLeft: '24px' }}><b>เลขพาสปอร์ต:</b> <span className="fill-value">{contract.passport_no || '................................................'}</span></span>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}><b>ที่อยู่:</b> <span className="fill-value">{contract.customer_address || '................................................................................................................................................'}</span></div>
                    
                    <div style={{ gridColumn: 'span 2' }}><b>ทำงาน:</b> <span className="fill-value">{contract.workplace || '................................................................................................'}</span></div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <b>เบอร์โทรหลักสำหรับลงทะเบียน:</b> <span className="fill-value">{contract.phone_no || '....................................'}</span>
                      <span style={{ marginLeft: '16px' }}><b>ช่องทางการติดต่ออื่น:</b> <span className="fill-value">{contract.facebook || '....................................'}</span></span>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}><b>Line ID (จำเป็นต้องมี):</b> <span className="fill-value">{contract.line_id || '........................................................'}</span></div>
                    
                    {/* Guarantor Details */}
                    <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed #ddd', paddingTop: '4px' }}>
                      <b>ชื่อ-สกุล (ผู้ค้ำ1):</b> <span className="fill-value">{contract.guarantor_name || '........................................................'}</span>
                      <span style={{ marginLeft: '16px' }}><b>เลขบัตรประชาชน (ผู้ค้ำ1):</b> <span className="fill-value">{contract.guarantor_id_card || '................................................'}</span></span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <b>เบอร์ผู้ค้ำ1:</b> <span className="fill-value">{contract.guarantor_phone || '....................................'}</span>
                      <span style={{ marginLeft: '24px' }}><b>ความสัมพันธ์:</b> <span className="fill-value">{contract.relationship || '....................................'}</span></span>
                    </div>
                  </div>

                  <p className="indented-text" style={{ fontSize: '10.5px', margin: '10px 0 8px', lineHeight: 1.4 }}>
                    ซึ่งต่อไปในสัญญาจะเรียกว่า <b>"ผู้เช่าซื้อ"</b> อีกฝ่ายหนึ่ง ทั้งสองฝ่ายตกลงให้เช่าซื้อและเช่าซื้อทรัพย์สินตามรายการทรัพย์สินเช่าซื้อในบัญชีรายการเช่าซื้อด้านล่างนี้
                  </p>

                  {/* Table of Assets */}
                  <div className="section-title">บัญชีทรัพย์สินที่ให้เช่าซื้อ</div>
                  <div className="asset-details-box">
                    <div className="asset-grid">
                      <div><b>ชื่อสินค้า:</b> {contract.product_name || 'โทรศัพท์มือถือ'}</div>
                      <div><b>รุ่น:</b> <span className="fill-value">{contract.model || '....................................'}</span></div>
                      <div><b>สี:</b> <span className="fill-value">{contract.color || '..........................'}</span></div>
                      <div><b>ความจุ:</b> <span className="fill-value">{contract.capacity || '..........................'}</span></div>
                      
                      <div style={{ gridColumn: 'span 2' }}><b>Serial No:</b> <span className="fill-value">{contract.serial_no || '........................................................'}</span></div>
                      <div style={{ gridColumn: 'span 2' }}><b>IMEI:</b> <span className="fill-value">{contract.imei || '........................................................'}</span></div>
                      
                      <div><b>ประกันสินค้า:</b> โโทรศัพท์มือถือ</div>
                      <div style={{ color: '#ef4444' }}><b>ราคาขาย:</b> <span className="fill-value" style={{ fontWeight: 'bold' }}>{sellingPriceDoc ? `${sellingPriceDoc.toLocaleString()} บาท` : '.......................... บาท'}</span></div>
                    </div>
                  </div>

                  {/* Financial calculations */}
                  <div className="section-title" style={{ marginTop: '8px' }}>วิธีคำนวณเงินค่าเช่าซื้อและจำนวนค่าเช่าซื้อ</div>
                  <div className="calc-details-box">
                    <div className="calc-row">
                      <span>1.) ราคาทีทำสัญญา</span>
                      <b>{sellingPriceDoc ? `${sellingPriceDoc.toLocaleString()} บาท` : '.......................... บาท'}</b>
                    </div>
                    <div className="calc-row">
                      <span>2.) เงินดาวน์ (เงินล่วงหน้า) 30% จำนวน</span>
                      <b>{contract.down_payment ? `${Number(contract.down_payment).toLocaleString()} บาท` : '.......................... บาท'}</b>
                    </div>
                    <div className="calc-row">
                      <span>3.) ราคาส่วนที่เหลือชำระ</span>
                      <b>{remainingBalance ? `${remainingBalance.toLocaleString()} บาท` : '.......................... บาท'}</b>
                    </div>
                    <div className="calc-row">
                      <span>4.) จำนวนงวดที่ผ่อนชำระ</span>
                      <span style={{ display: 'flex', gap: '30px' }}>
                        <b>{contract.installments_count} งวด</b>
                        <span style={{ color: '#ef4444', fontSize: '11px' }}><b>วันที่ชำระเงินดาวน์:</b> {formatThaiDate(contract.down_payment_date)}</span>
                      </span>
                    </div>
                    <div className="calc-row" style={{ borderBottom: 'none' }}>
                      <span>5.) ชำระงวดละ</span>
                      <span style={{ display: 'flex', gap: '20px' }}>
                        <b style={{ fontSize: '13px' }}>{contract.installment_amount ? `${Number(contract.installment_amount).toLocaleString()} บาท` : '.......................... บาท'}</b>
                        <span style={{ fontSize: '11px' }}>
                          <b>งวดแรกวันที่</b> {formatThaiDate(contract.first_installment_date)}
                        </span>
                        <span style={{ fontSize: '11px' }}>
                          <b>ชำระทุกวันที่</b> {installmentDay} ของทุกเดือน
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Terms Section */}
                  <div className="section-title" style={{ marginTop: '8px' }}>เงื่อนไขการผ่อนชำระสินค้า</div>
                  <ol className="terms-list">
                    <li>ผู้เช่าซื้อต้องชำระเงินตามระยะเวลาที่ทางผู้ให้เช่าซื้อกำหนด</li>
                    <li>ทางผู้ให้เช่าซื้อจะดำเนินการแจ้งเตือนยอดค่าเช่าซื้อล่วงหน้าอย่างน้อย 3 วัน ทางผู้เช่าซื้อต้องติดต่อได้ทุกกรณี</li>
                    <li>ค้างชำระยอดได้ไม่เกิน 3 วัน มีค่าปรับวันละ 500 บาท</li>
                    <li>กรณีค้างชำระเกิน 3 วัน ทางร้านจะล็อกเครื่องและลบข้อมูลทันทีโดยที่ไม่สามารถกู้ข้อมูลได้ หากมีการต้องชำระยอดค้างเช่าซื้อและค่าปรับจะมีบริการปลดล็อกเพิ่มเติม 2,000 บาท</li>
                    <li>หากผู้เช่าซื้อไม่ทำการชำระยอดตามที่กำหนดและมียอดค้างชำระเกิน 3 วัน ทางผู้ให้เช่าซื้อมีสิทธิ์ยึดคืนสินทรัพย์ทุกกรณี</li>
                    <li>กรณียังผ่อนจ่ายไม่หมด สินทรัพย์ถือว่าเป็นกรรมสิทธิ์ของผู้ให้เช่าซื้ออย่างถูกต้องตามกฎหมาย ผู้เช่าซื้อไม่มีสิทธิ์ขายต่อหรือส่งต่อให้ผู้อื่น หรือห้ามทำการ ปลดล็อก เปลี่ยนแปลงแก้ไขโปรแกรมล็อกเครื่องจนกว่าจะผ่อนชำระหมด</li>
                    <li>หลังจากผ่อนชำระครบทางผู้ให้เช่าซื้อจะปลดล็อกให้ไม่เกิน 7 วันทำการ</li>
                    <li>เงื่อนไขและบริการหลังการขาย ผู้เช่าซื้อได้ตรวจดูคุณภาพสินทรัพย์ที่เช่าซื้อจนเป็นที่พอใจแล้ว การรับประกันไม่ครอบคลุมกรณีหล่นแตก ตกน้ำ หรือพังจากการใช้งานรุนแรง</li>
                    <li>กรณีผู้เช่าซื้อผิดนัด ทางผู้ให้เช่าซื้อมีสิทธิในการติดตามทวงสินทรัพย์อย่างถูกต้องกฎหมายทุกกรณี</li>
                    <li>กรณีผู้เช่าซื้อต้องการยกเลิกสัญญาก่อนจะผ่อนหมด มีค่ายกเลิกสัญญา 1,500 บาท และค่าปลดล็อกเครื่อง 2,000 บาท</li>
                    <li>กรณีเรียกคืนสินทรัพย์แล้ว ผู้เช่าซื้อไม่ส่งมอบให้ ทางผู้ให้เช่าซื้อจะดำเนินการคดีอาญาโทษยักยอกทรัพย์จนถึงที่สุด</li>
                  </ol>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '2px', textAlign: 'left' }}>
                    *ตามประมวลกฎหมายอาญามาตรา 352 ต้องโทษจำคุกไม่เกิน 3 ปี
                  </div>

                  {/* Signatures Area */}
                  <div className="signatures-container">
                    {/* Lessee (Customer) Signature Box */}
                    <div className="sig-box" onClick={() => setShowSignModal(true)} style={{ cursor: 'pointer' }}>
                      <div className="sig-label">ลงชื่อ (กรุณาแตะที่นี่เพื่อเซ็นชื่อ)</div>
                      <div className="sig-line-wrapper">
                        {signatureData ? (
                          <img src={signatureData} alt="Customer Signature" className="sig-img" />
                        ) : (
                          <div className="sig-placeholder">( แตะที่นี่เพื่อเซ็นชื่อ / Tap to sign )</div>
                        )}
                      </div>
                      <div className="sig-name">
                        ( {contract.customer_name || '........................................................'} )
                      </div>
                      <div className="sig-role">ผู้เช่าซื้อ (Lessee)</div>
                    </div>

                    {/* Lessor (Company) Signature Box with Stamp */}
                    <div className="sig-box" style={{ position: 'relative' }}>
                      <div className="sig-label">ลงชื่อ</div>
                      <div className="sig-line-wrapper">
                        <div style={{ height: '100px', borderBottom: '1px solid #000', width: '200px', margin: '0 auto' }} />
                        <img 
                          src="/company_stamp_transparent.png" 
                          alt="Company Seal Stamp" 
                          className="company-seal-stamp" 
                        />
                      </div>
                      <div className="sig-name">
                        ( บริษัท โฟน สวิตช์ ฮับ จำกัด )
                      </div>
                      <div className="sig-role">ผู้ให้เช่าซื้อ (Lessor)</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Submit Actions Bar */}
        <div className="sign-action-bar">
          <button 
            className="btn-submit-sign" 
            onClick={submitContractSignature} 
            disabled={submitting || !signatureData}
          >
            {submitting ? 'กำลังส่งข้อมูล... (Submitting...)' : '✔️ ยืนยันส่งสัญญาเช่าซื้อ (Submit Signed Contract)'}
          </button>
        </div>

      </div>

      {/* DRAWING SIGNATURE MODAL - OPTIMIZED FOR MOBILE LANDSCAPE */}
      {showSignModal && (
        <div className="signature-modal-overlay">
          <div className="signature-modal-header">
            <span style={{ color: '#333', fontSize: '18px', fontWeight: 800 }}>🖊️ เซ็นชื่ออิเล็กทรอนิกส์ (E-Signature)</span>
            <button onClick={() => setShowSignModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>✕</button>
          </div>
          
          <p style={{ fontSize: '12.5px', color: '#666', marginBottom: '10px', textAlign: 'left' }}>
            ใช้นิ้วหรือสไตลัสเขียนลงในกรอบสีเทาด้านล่าง (Draw your signature inside the landscape box)
          </p>

          <div className="signature-canvas-container">
            <canvas ref={canvasRef} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
            <button 
              onClick={clearCanvas} 
              style={{ flex: 1, background: '#f0f0f0', border: '1px solid #ccc', color: '#333', padding: '12px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
            >
              🧹 ล้างข้อมูล (Clear)
            </button>
            <button 
              onClick={saveSignature} 
              style={{ flex: 1, background: '#00A950', border: 'none', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
            >
              ✔️ บันทึก (Save)
            </button>
          </div>
        </div>
      )}

      {/* CSS Stylesheet embedded */}
      <style jsx global>{`
        .sign-page-container {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 20px);
          background: #0f172a;
          color: #f1f5f9;
        }
        
        .sign-sticky-header {
          background: #0b0f19;
          border-bottom: 1px solid #1e293b;
          padding: 16px 20px;
          text-align: left;
        }
        .sign-sticky-header h2 { font-size: 16px; font-weight: 800; color: #22d3ee; margin: 0; }
        .sign-sticky-header p { font-size: 11px; color: #94a3b8; margin: 4px 0 0; }

        .contract-preview-scroll-wrapper {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          justify-content: center;
          background: #0f172a;
        }

        .contract-document {
          width: 100%;
          max-width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          color: #333333;
          padding: 10mm 8mm;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          font-family: Arial, sans-serif;
          font-size: 10.5px;
          line-height: 1.35;
          position: relative;
          box-sizing: border-box;
          border-radius: 8px;
        }

        @media (max-width: 767px) {
          .contract-preview-scroll-wrapper {
            padding: 8px;
          }
          .contract-document {
            padding: 6mm 4mm;
            border-radius: 4px;
            font-size: 9.5px;
          }
          .doc-header h2 { font-size: 15px !important; }
        }

        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #333;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .title-box { text-align: center; }
        .title-box h2 { font-size: 17px; font-weight: bold; margin: 0; color: #141c30; }
        .brand-sub { font-size: 9px; font-weight: 700; color: #666; }
        .brand-corp { font-size: 8px; font-weight: bold; color: #888; }
        .meta-box { font-size: 9px; text-align: right; line-height: 1.5; }

        .indented-text { text-indent: 24px; margin: 0 0 6px; }
        .parties-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px 12px;
          background: #fcfcfc;
          border: 1px solid #eaeaea;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 8px;
        }
        .fill-value { font-weight: 600; color: #000; border-bottom: 1px dotted #555; }
        .section-title { font-size: 10px; font-weight: bold; border-left: 3px solid #141c30; padding-left: 6px; margin: 8px 0 4px; color: #141c30; text-transform: uppercase; }
        .asset-details-box { border: 1px solid #333; padding: 8px 10px; background: #fbfbfb; border-radius: 4px; }
        .asset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 12px; }
        
        .calc-details-box { border: 1px solid #333; border-radius: 4px; overflow: hidden; }
        .calc-row { display: flex; justify-content: space-between; padding: 4px 10px; border-bottom: 1px solid #e1e1e1; background: #fff; }
        .calc-row:nth-child(even) { background: #fcfcfc; }
        
        .terms-list { padding-left: 14px; margin: 4px 0; font-size: 8.5px; line-height: 1.3; color: #444; text-align: justify; }
        .terms-list li { margin-bottom: 2px; }

        .signatures-container { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; }
        .sig-box { width: 48%; text-align: center; }
        .sig-label { font-size: 9.5px; margin-bottom: 6px; font-weight: bold; }
        .sig-line-wrapper { min-height: 120px; display: flex; align-items: flex-end; justify-content: center; position: relative; }
        .sig-placeholder { font-size: 8.5px; color: #c084fc; font-style: italic; border-bottom: 1px dashed #c084fc; width: 180px; padding-bottom: 2px; font-weight: bold; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .sig-img { max-height: 110px; max-width: 280px; object-fit: contain; border-bottom: 1px solid #000; width: 100%; }
        .company-seal-stamp { position: absolute; width: 450px; height: auto; bottom: -40px; left: 50%; transform: translateX(-50%); opacity: 0.85; pointer-events: none; }
        .sig-name { font-size: 10px; font-weight: bold; margin-top: 4px; }
        .sig-role { font-size: 8.5px; color: #666; }

        .sign-action-bar {
          background: #0b0f19;
          border-top: 1px solid #1e293b;
          padding: 16px 20px;
          display: flex;
        }
        .btn-submit-sign {
          width: 100%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 15px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
          transition: all 0.2s;
        }
        .btn-submit-sign:disabled {
          background: #1e293b;
          color: #64748b;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* E-Signature Modal Layout (Aspect ratio matching copy) */
        .signature-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #ffffff;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .signature-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid #eeeeee;
          padding-bottom: 8px;
        }
        .signature-canvas-container {
          width: 100%;
          height: 250px;
          border: 2px dashed #cccccc;
          border-radius: 12px;
          background: #f9f9f9;
          overflow: hidden;
          position: relative;
          margin: 10px 0;
        }
        .signature-canvas-container canvas {
          display: block;
          width: 100%;
          height: 100%;
          cursor: crosshair;
        }
      `}</style>
    </MobileLayout>
  );
}
