'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MobileLayout from '@/components/MobileLayout';
import Navbar from '@/components/Navbar';

export default function ContractPage() {
  const router = useRouter();

  // 1. Contract Meta States
  const [contractNo, setContractNo] = useState('IRISBUY0072');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [storeName, setStoreName] = useState('ร้าน ไอริส โมบาย');
  const [storeAddress, setStoreAddress] = useState(
    '101/6 ซ.สุขุมวิท 101/1 ถ.สุขุมวิท แขวงบางจาก เขตพระโขนง กรุงเทพ 10260'
  );

  // 2. Lessee (Customer) States
  const [customerName, setCustomerName] = useState('');
  const [nationality, setNationality] = useState('ไทย');
  const [idCardNo, setIdCardNo] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [facebook, setFacebook] = useState('');
  const [lineId, setLineId] = useState('');

  // 3. Guarantor States
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorIdCard, setGuarantorIdCard] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  // 4. Product Details States
  const [productName, setProductName] = useState('โทรศัพท์มือถือ');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [capacity, setCapacity] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [imei, setImei] = useState('');
  const [sellingPrice, setSellingPrice] = useState<number | string>(0);

  // 5. Payment Details States
  const [downPayment, setDownPayment] = useState<number | string>(0);
  const [installmentsCount, setInstallmentsCount] = useState<number | string>(4);
  const [installmentAmount, setInstallmentAmount] = useState<number | string>(0);
  const [downPaymentDate, setDownPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  // Automatically compute calculations based on user input (converting empty string to 0)
  const numDownPayment = downPayment === '' ? 0 : Number(downPayment);
  const numInstallmentsCount = installmentsCount === '' ? 0 : Number(installmentsCount);
  const numInstallmentAmount = installmentAmount === '' ? 0 : Number(installmentAmount);

  // 3번 (ราคาส่วนที่เหลือชำระ) = 4번 * 5번
  const remainingBalance = numInstallmentsCount * numInstallmentAmount;
  // 1번 (ราคาทีทำสัญญา) = 2번 + 3번 (This is what is displayed on the printed document)
  const sellingPriceDoc = numDownPayment + remainingBalance;
  
  // Extract installment day
  const installmentDay = firstInstallmentDate ? parseInt(firstInstallmentDate.split('-')[2]) || 7 : 7;

  // 6. Signature Pad Modal State & Logic
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // 7. Google Sheets Inventory Autocomplete
  const [inventory, setInventory] = useState<any[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch('/api/inventory')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInventory(data);
        }
      })
      .catch((err) => console.error('Failed to load inventory:', err));
  }, []);

  const handleImeiChange = (val: string) => {
    setImei(val);
    const cleanVal = val.trim();
    if (cleanVal.length >= 2) {
      const filtered = inventory.filter((item) =>
        item.imei.includes(cleanVal)
      );
      setFilteredInventory(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredInventory([]);
      setShowSuggestions(false);
    }
  };

  const selectItem = (item: any) => {
    setImei(item.imei);
    setModel(item.model);
    setColor(item.color);
    setSerialNo(item.serialNo);
    setSellingPrice(item.price);
    setDownPayment(Math.round(item.price * 0.3));
    setShowSuggestions(false);
  };

  // Date Formatter helper
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

  // Drawing Pad Canvas Actions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

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
    // Check if canvas is blank
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <MobileLayout paddingBottom="0" paddingTop="68px">
      <div className="no-print">
        <Navbar onLogoClick={() => router.push('/')} />
      </div>

      {/* Main Split Screen Container */}
      <div className="contract-container">
        
        {/* LEFT COLUMN: Input form (Hidden on Print) */}
        <div className="sidebar no-print">
          <div className="sidebar-header">
            <h3>📝 เขียนสัญญาเช่าซื้อ (Fill Contract)</h3>
            <p>กรอกข้อมูลเพื่อเติมลงในเอกสารสัญญาเช่าซื้อโดยอัตโนมัติ</p>
          </div>

          <div className="form-sections-wrapper">
            {/* 1. Contract Info */}
            <div className="form-section-card">
              <h4>📋 ข้อมูลสัญญา (Contract Details)</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">เลขที่สัญญา (Contract No.)</label>
                  <input type="text" className="form-input" value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่สัญญา (Contract Date)</label>
                  <input type="date" className="form-input" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ทำสัญญาที่ (Shop Name)</label>
                <input type="text" className="form-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">ที่อยู่ร้าน (Shop Address)</label>
                <textarea className="form-textarea" rows={2} value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
              </div>
            </div>

            {/* 2. Customer Info */}
            <div className="form-section-card">
              <h4>👤 ข้อมูลผู้เช่าซื้อ (Customer / Lessee Details)</h4>
              <div className="form-group">
                <label className="form-label">ชื่อ-สกุล (Full Name) *</label>
                <input type="text" className="form-input" placeholder="e.g. สมชาย รักดี" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">สัญชาติ (Nationality)</label>
                  <input type="text" className="form-input" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">เลขบัตรประชาชน (Thai ID Card)</label>
                  <input type="text" className="form-input" placeholder="1-xxxx-xxxxx-xx-x" value={idCardNo} onChange={(e) => setIdCardNo(e.target.value)} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">เลขพาสปอร์ต (Passport No.)</label>
                  <input type="text" className="form-input" placeholder="For foreigners" value={passportNo} onChange={(e) => setPassportNo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์หลัก (Phone No.) *</label>
                  <input type="tel" className="form-input" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ที่อยู่ตามบัตร/ทะเบียนบ้าน (Address)</label>
                <textarea className="form-textarea" rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">สถานที่ทำงาน (Workplace)</label>
                <input type="text" className="form-input" value={workplace} onChange={(e) => setWorkplace(e.target.value)} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">ช่องทางการติดต่ออื่น (Facebook)</label>
                  <input type="text" className="form-input" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Line ID (Line ID)</label>
                  <input type="text" className="form-input" value={lineId} onChange={(e) => setLineId(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 3. Guarantor Info */}
            <div className="form-section-card">
              <h4>👥 ข้อมูลผู้ค้ำประกัน (Guarantor Details)</h4>
              <div className="form-group">
                <label className="form-label">ชื่อ-สกุล ผู้ค้ำประกัน (Guarantor Name)</label>
                <input type="text" className="form-input" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">เลขบัตรประชาชน ผู้ค้ำประกัน</label>
                  <input type="text" className="form-input" value={guarantorIdCard} onChange={(e) => setGuarantorIdCard(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์ ผู้ค้ำประกัน</label>
                  <input type="tel" className="form-input" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ความสัมพันธ์กับผู้เช่าซื้อ (Relationship)</label>
                <input type="text" className="form-input" placeholder="e.g. บิดา, มารดา, เพื่อนร่วมงาน" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
              </div>
            </div>

            {/* 4. Product Details */}
            <div className="form-section-card">
              <h4>📱 ข้อมูลสินค้า (Leased Device Details)</h4>
              <div className="form-group">
                <label className="form-label">ชื่อประเภทสินค้า (Device Type)</label>
                <input type="text" className="form-input" value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">รุ่น (Model)</label>
                  <input type="text" className="form-input" placeholder="e.g. iPhone 15 Pro" value={model} onChange={(e) => setModel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">สี (Color)</label>
                  <input type="text" className="form-input" placeholder="e.g. Black" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ความจุ (Capacity)</label>
                  <input type="text" className="form-input" placeholder="e.g. 256GB" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Serial No.</label>
                  <input type="text" className="form-input" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">IMEI (자동완성 / Autocomplete)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Type IMEI..." 
                    value={imei} 
                    onChange={(e) => handleImeiChange(e.target.value)} 
                    onFocus={() => {
                      if (imei.trim().length >= 2 && filteredInventory.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Small delay to allow suggestion click
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                  />
                  {showSuggestions && (
                    <div className="suggestions-dropdown no-print">
                      {filteredInventory.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="suggestion-item" 
                          onMouseDown={() => selectItem(item)}
                        >
                          <div className="sug-imei">🔍 {item.imei}</div>
                          <div className="sug-details">{item.model} • {item.color} • {item.price.toLocaleString()}฿</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">총금액 (Total Price) *</label>
                  <input type="number" className="form-input" value={sellingPrice} onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                    setSellingPrice(val);
                    setDownPayment(val === '' ? '' : Math.round(Number(val) * 0.3));
                  }} />
                </div>
                <div className="form-group">
                  <label className="form-label">เงินดาวน์ (Down Payment) *</label>
                  <input type="number" className="form-input" value={downPayment} onChange={(e) => {
                    setDownPayment(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0));
                  }} />
                </div>
              </div>
            </div>

            {/* 5. Payments & Dates */}
            <div className="form-section-card">
              <h4>💵 รายละเอียดผ่อนชำระ (Installment Parameters)</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">จำนวนงวดที่ผ่อนชำระ (Installments) *</label>
                  <input type="number" className="form-input" value={installmentsCount} onChange={(e) => {
                    setInstallmentsCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0));
                  }} />
                </div>
                <div className="form-group">
                  <label className="form-label">ชำระงวดละ (Monthly Installment) *</label>
                  <input type="number" className="form-input" value={installmentAmount} onChange={(e) => {
                    setInstallmentAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0));
                  }} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">วันที่จ่ายเงินดาวน์</label>
                  <input type="date" className="form-input" value={downPaymentDate} onChange={(e) => setDownPaymentDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่ผ่อนงวดแรก</label>
                  <input type="date" className="form-input" value={firstInstallmentDate} onChange={(e) => setFirstInstallmentDate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button className="btn-print" onClick={handlePrint}>
              🖨️ พิมพ์เอกสารสัญญา (Print Contract)
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Real A4 Document Preview */}
        <div className="preview-container">
          <div className="contract-document" id="printable-contract-area">
            
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
                <div><b>เลขที่สัญญา:</b> {contractNo || '.........................'}</div>
                <div><b>วันที่:</b> {formatThaiDate(contractDate) || '.........................'}</div>
                <div><b>สินค้ามาจาก:</b> {storeName}</div>
              </div>
            </div>

            <div className="doc-body">
              {/* Contract made info */}
              <p className="indented-text">
                ทำสัญญาที่ <b>{storeName}</b> ที่อยู่ <b>{storeAddress}</b>
              </p>
              <p style={{ margin: '4px 0 12px' }}>
                ระหว่าง <b>บริษัท โฟน สวิตช์ ฮับ จำกัด (ผู้ให้เช่าซื้อ)</b> ฝ่ายหนึ่ง กับ
              </p>

              {/* Parties Details Grid */}
              <div className="parties-grid">
                <div><b>ชื่อ-สกุล (ผู้เช่าซื้อ):</b> <span className="fill-value">{customerName || '........................................................'}</span></div>
                <div><b>สัญชาติ:</b> <span className="fill-value">{nationality || '............'}</span></div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <b>เลขบัตรประชาชน:</b> <span className="fill-value">{idCardNo || '................................................'}</span>
                  <span style={{ marginLeft: '24px' }}><b>เลขพาสปอร์ต:</b> <span className="fill-value">{passportNo || '................................................'}</span></span>
                </div>

                <div style={{ gridColumn: 'span 2' }}><b>ที่อยู่:</b> <span className="fill-value">{customerAddress || '................................................................................................................................................'}</span></div>
                
                <div style={{ gridColumn: 'span 2' }}><b>ทำงาน:</b> <span className="fill-value">{workplace || '................................................................................................'}</span></div>

                <div style={{ gridColumn: 'span 2' }}>
                  <b>เบอร์โทรหลักสำหรับลงทะเบียน:</b> <span className="fill-value">{phoneNo || '....................................'}</span>
                  <span style={{ marginLeft: '16px' }}><b>ช่องทางการติดต่ออื่น:</b> <span className="fill-value">{facebook || '....................................'}</span></span>
                </div>

                <div style={{ gridColumn: 'span 2' }}><b>Line ID (จำเป็นต้องมี):</b> <span className="fill-value">{lineId || '........................................................'}</span></div>
                
                {/* Guarantor Details */}
                <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed #ddd', paddingTop: '4px' }}>
                  <b>ชื่อ-สกุล (ผู้ค้ำ1):</b> <span className="fill-value">{guarantorName || '........................................................'}</span>
                  <span style={{ marginLeft: '16px' }}><b>เลขบัตรประชาชน (ผู้ค้ำ1):</b> <span className="fill-value">{guarantorIdCard || '................................................'}</span></span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <b>เบอร์ผู้ค้ำ1:</b> <span className="fill-value">{guarantorPhone || '....................................'}</span>
                  <span style={{ marginLeft: '24px' }}><b>ความสัมพันธ์:</b> <span className="fill-value">{relationship || '....................................'}</span></span>
                </div>
              </div>

              {/* Standard text */}
              <p className="indented-text" style={{ fontSize: '10.5px', margin: '10px 0 8px', lineHeight: 1.4 }}>
                ซึ่งต่อไปในสัญญาจะเรียกว่า <b>"ผู้เช่าซื้อ"</b> อีกฝ่ายหนึ่ง ทั้งสองฝ่ายตกลงให้เช่าซื้อและเช่าซื้อทรัพย์สินตามรายการทรัพย์สินเช่าซื้อในบัญชีรายการเช่าซื้อด้านล่างนี้ (รวมทั้งส่วนควบ เครื่องอุปกรณ์ อะไหล่ สิ่งที่นำมาแทนของเดิม หรืออื่นๆ)
              </p>

              {/* Table of Assets */}
              <div className="section-title">บัญชีทรัพย์สินที่ให้เช่าซื้อ</div>
              <div className="asset-details-box">
                <div className="asset-grid">
                  <div><b>ชื่อสินค้า:</b> {productName}</div>
                  <div><b>รุ่น:</b> <span className="fill-value">{model || '....................................'}</span></div>
                  <div><b>สี:</b> <span className="fill-value">{color || '..........................'}</span></div>
                  <div><b>ความจุ:</b> <span className="fill-value">{capacity || '..........................'}</span></div>
                  
                  <div style={{ gridColumn: 'span 2' }}><b>Serial No:</b> <span className="fill-value">{serialNo || '........................................................'}</span></div>
                  <div style={{ gridColumn: 'span 2' }}><b>IMEI:</b> <span className="fill-value">{imei || '........................................................'}</span></div>
                  
                  <div><b>ประกันสินค้า:</b> โทรศัพท์มือถือ</div>
                  <div style={{ color: 'var(--red)' }}><b>ราคาขาย:</b> <span className="fill-value" style={{ fontWeight: 'bold' }}>{sellingPriceDoc ? `${sellingPriceDoc.toLocaleString()} บาท` : '.......................... บาท'}</span></div>
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
                  <b>{downPayment ? `${downPayment.toLocaleString()} บาท` : '.......................... บาท'}</b>
                </div>
                <div className="calc-row">
                  <span>3.) ราคาส่วนที่เหลือชำระ</span>
                  <b>{remainingBalance ? `${remainingBalance.toLocaleString()} บาท` : '.......................... บาท'}</b>
                </div>
                <div className="calc-row">
                  <span>4.) จำนวนงวดที่ผ่อนชำระ</span>
                  <span style={{ display: 'flex', gap: '30px' }}>
                    <b>{installmentsCount} งวด</b>
                    <span style={{ color: 'var(--red)', fontSize: '11px' }}><b>วันที่ชำระเงินดาวน์:</b> {formatThaiDate(downPaymentDate)}</span>
                  </span>
                </div>
                <div className="calc-row" style={{ borderBottom: 'none' }}>
                  <span>5.) ชำระงวดละ</span>
                  <span style={{ display: 'flex', gap: '20px' }}>
                    <b style={{ fontSize: '13px' }}>{installmentAmount ? `${installmentAmount.toLocaleString()} บาท` : '.......................... บาท'}</b>
                    <span style={{ fontSize: '11px' }}>
                      <b>งวดแรกวันที่</b> {formatThaiDate(firstInstallmentDate)}
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
                <li>กรณียังผ่อนจ่ายไม่หมด สินทรัพย์ถือว่าเป็นกรรมสิทธิ์ของผู้ให้เช่าซื้ออย่างถูกต้องตามกฎหมาย ผู้เช่าซื้อไม่มีสิทธิ์ขายต่อหรือส่งต่อให้ผู้อื่น หรือห้ามทำการ ปลดล็อก เปลี่ยนแปลงแก้ไขโปรแกรมล็อกเครื่องจนกว่าจะผ่อนชำระหมด (ในกรณีนำไปปลดล็อกหรือดัดแปลงแก้ไข ร้านที่ดำเนินการทำให้ถือว่ามีความผิดร่วมกัน ผู้ให้เช่าซื้อจะดำเนินการทางกฎหมายโทษยักยอกทรัพย์เช่นกัน)</li>
                <li>หลังจากผ่อนชำระครบทางผู้ให้เช่าซื้อจะปลดล็อกให้ไม่เกิน 7 วันทำการ</li>
                <li>เงื่อนไขและบริการหลังการขาย ผู้เช่าซื้อได้ตรวจดูคุณภาพสินทรัพย์ที่เช่าซื้อจนเป็นที่พอใจแล้ว การรับประกันไม่ครอบคลุมกรณีหล่นแตก ตกน้ำ เครื่องพังจากการใช้งานรุนแรง หรืออื่นๆ ที่เกิดขึ้นจากผู้เช่าซื้อเอง</li>
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
                  <div className="sig-label">ลงชื่อ</div>
                  <div className="sig-line-wrapper">
                    {signatureData ? (
                      <img src={signatureData} alt="Customer Signature" className="sig-img" />
                    ) : (
                      <div className="sig-placeholder no-print">( แตะที่นี่เพื่อเซ็นชื่อ / Tap to sign )</div>
                    )}
                  </div>
                  <div className="sig-name">
                    ( {customerName || '........................................................'} )
                  </div>
                  <div className="sig-role">ผู้เช่าซื้อ</div>
                </div>

                {/* Lessor (Company) Signature Box with Stamp */}
                <div className="sig-box" style={{ position: 'relative' }}>
                  <div className="sig-label">ลงชื่อ</div>
                  <div className="sig-line-wrapper">
                    <div style={{ height: '40px', borderBottom: '1px solid #000', width: '200px', margin: '0 auto' }} />
                    {/* Official transparent company stamp seal */}
                    <img 
                      src="/company_stamp_transparent.png" 
                      alt="Company Seal Stamp" 
                      className="company-seal-stamp" 
                    />
                  </div>
                  <div className="sig-name">
                    ( บริษัท โฟน สวิตช์ ฮับ จำกัด )
                  </div>
                  <div className="sig-role">ผู้ให้เช่าซื้อ</div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* DRAWING SIGNATURE MODAL */}
      {showSignModal && (
        <div className="modal-bg open" style={{ zIndex: 9999, display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '500px', width: '90%', padding: '24px', borderRadius: '22px', background: '#ffffff', color: '#333333' }}>
            <div className="modal-hd" style={{ marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <span className="modal-title" style={{ color: '#333', fontSize: '18px', fontWeight: 800 }}>🖊️ เซ็นชื่ออิเล็กทรอนิกส์ (E-Signature)</span>
              <button className="modal-x" onClick={() => setShowSignModal(false)} style={{ color: '#666' }}>✕</button>
            </div>
            
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '14px', textAlign: 'left' }}>
              ใช้นิ้วหรือสไตลัสเขียนลงในกรอบสีเทาด้านล่าง (Draw your signature inside the gray box below)
            </p>

            <div style={{ border: '2px dashed #cccccc', borderRadius: '12px', overflow: 'hidden', background: '#f9f9f9', display: 'flex', justifyContent: 'center' }}>
              <canvas
                ref={canvasRef}
                width={440}
                height={200}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ cursor: 'crosshair', maxWidth: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={clearCanvas} 
                style={{ flex: 1, background: '#f0f0f0', border: '1px solid #ccc', color: '#333', padding: '10px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                🧹 ล้างข้อมูล (Clear)
              </button>
              <button 
                onClick={saveSignature} 
                style={{ flex: 1, background: '#00A950', border: 'none', color: '#fff', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                ✔️ บันทึก (Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES EMBEDDED TO RENDER SIDEBAR LAYOUT AND PRINT VIEW */}
      <style jsx global>{`
        .contract-container {
          display: flex;
          min-height: calc(100vh - 68px);
          background: #0f172a;
          color: #f1f5f9;
        }

        .sidebar {
          width: 400px;
          min-width: 400px;
          border-right: 1px solid #1e293b;
          padding: 24px;
          overflow-y: auto;
          max-height: calc(100vh - 68px);
          display: flex;
          flex-direction: column;
          background: #0b0f19;
        }

        .sidebar-header {
          margin-bottom: 20px;
        }
        .sidebar-header h3 {
          font-size: 18px;
          font-weight: 800;
          color: #22d3ee;
        }
        .sidebar-header p {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .form-sections-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .form-section-card {
          background: #131b2e;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 16px;
        }
        .form-section-card h4 {
          font-size: 13.5px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 12px;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 6px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .form-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .form-group {
          margin-bottom: 12px;
        }
        .form-label {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          background: #0b0f19 !important;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 8px 10px;
          color: #f1f5f9 !important;
          font-size: 12.5px;
          font-family: inherit;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #22d3ee;
          outline: none;
        }
        /* Override Chrome/Safari/iOS autofill background with dark theme color and light text */
        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover, 
        .form-input:-webkit-autofill:focus, 
        .form-input:-webkit-autofill:active,
        .form-textarea:-webkit-autofill,
        .form-textarea:-webkit-autofill:hover,
        .form-textarea:-webkit-autofill:focus,
        .form-textarea:-webkit-autofill:active {
          -webkit-text-fill-color: #f1f5f9 !important;
          -webkit-box-shadow: 0 0 0 30px #0b0f19 inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        /* Force number input spin buttons to show on supported browsers (Chrome, Android, etc.) */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: inner-spin-button !important;
          display: block !important;
          opacity: 1 !important;
        }

        .btn-print {
          width: 100%;
          background: linear-gradient(135deg, #06b6d4, #0891b2);
          color: #ffffff;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
          transition: all 0.2s;
        }
        .btn-print:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(6, 182, 212, 0.3);
        }

        /* Preview container */
        .preview-container {
          flex: 1;
          padding: 40px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-y: auto;
          max-height: calc(100vh - 68px);
          background: #0f172a;
        }

        /* Printable Document Styling */
        .contract-document {
          width: 210mm;
          min-height: 297mm;
          background: #ffffff;
          color: #333333;
          padding: 12mm 10mm;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif;
          font-size: 11px;
          line-height: 1.35;
          position: relative;
          box-sizing: border-box;
          border-radius: 4px;
        }

        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #333;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }

        /* Logo box replica */
        .logo-box {
          background: #141c30;
          color: #ffffff;
          padding: 8px 10px;
          border-radius: 6px;
          text-align: center;
          width: 70px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .logo-icon {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .logo-text {
          font-size: 8px;
          font-weight: 500;
          margin-top: -2px;
        }

        .title-box {
          text-align: center;
        }
        .title-box h2 {
          font-size: 19px;
          font-weight: 850;
          margin: 0;
          color: #141c30;
          letter-spacing: 0.5px;
        }
        .brand-sub {
          font-size: 10px;
          font-weight: 700;
          margin-top: 1px;
          color: #666;
        }
        .brand-corp {
          font-size: 8.5px;
          font-weight: bold;
          color: #888;
        }

        .meta-box {
          font-size: 10px;
          text-align: right;
          line-height: 1.5;
        }

        .indented-text {
          text-indent: 35px;
          margin: 0 0 6px;
          font-size: 11px;
        }

        .parties-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px 16px;
          background: #fcfcfc;
          border: 1px solid #eaeaea;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 8px;
        }

        .fill-value {
          font-weight: 600;
          color: #000000;
          border-bottom: 1px dotted #555;
          padding-bottom: 1px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 800;
          border-left: 3px solid #141c30;
          padding-left: 6px;
          margin: 8px 0 4px;
          color: #141c30;
          text-transform: uppercase;
        }

        .asset-details-box {
          border: 1px solid #333333;
          padding: 8px 12px;
          background: #fbfbfb;
          border-radius: 4px;
        }
        .asset-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px 16px;
        }

        .calc-details-box {
          border: 1px solid #333333;
          border-radius: 4px;
          overflow: hidden;
        }
        .calc-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 12px;
          border-bottom: 1px solid #e1e1e1;
          background: #ffffff;
        }
        .calc-row:nth-child(even) {
          background: #fcfcfc;
        }

        .terms-list {
          padding-left: 16px;
          margin: 4px 0;
          font-size: 9px;
          line-height: 1.35;
          color: #444444;
          text-align: justify;
        }
        .terms-list li {
          margin-bottom: 2px;
        }

        .signatures-container {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px dashed #cccccc;
        }

        .sig-box {
          width: 48%;
          text-align: center;
          padding: 4px;
        }
        .sig-label {
          font-size: 10.5px;
          margin-bottom: 8px;
        }
        .sig-line-wrapper {
          min-height: 48px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          position: relative;
        }
        .sig-placeholder {
          font-size: 9.5px;
          color: #999999;
          font-style: italic;
          border-bottom: 1px solid #555555;
          width: 200px;
          padding-bottom: 2px;
        }
        .sig-img {
          max-height: 44px;
          max-width: 180px;
          object-fit: contain;
          border-bottom: 1px solid #000000;
        }
        .company-seal-stamp {
          position: absolute;
          width: 450px;
          height: auto;
          bottom: -90px;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0.85;
          pointer-events: none;
        }
        .sig-name {
          font-size: 11px;
          font-weight: bold;
          margin-top: 4px;
        }
        .sig-role {
          font-size: 9px;
          color: #666666;
        }

        /* CSS Print Styles */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            position: static !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide everything except the contract document */
          body * {
            visibility: hidden !important;
          }
          #printable-contract-area, #printable-contract-area * {
            visibility: visible !important;
          }
          
          /* Reset layout constraints of all ancestors so they don't restrict print width or add margins */
          .app-shell, 
          .contract-container, 
          .preview-container {
            display: block !important;
            position: static !important;
            max-width: none !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            transform: none !important;
          }
          
          #printable-contract-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            display: block !important;
            transform: none !important;
            zoom: 1 !important;
          }
          
          .parties-grid {
            background: none !important;
            border: 1px solid #333333 !important;
          }
          
          .asset-details-box {
            background: none !important;
            border: 1px solid #333333 !important;
          }
          
          .calc-row {
            background: none !important;
            border-bottom: 1px solid #333333 !important;
          }
        }

        /* Responsive Screen Styles (Excludes Print) */
        @media screen and (max-width: 991px) {
          .contract-container {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            min-width: 100%;
            max-height: none;
            border-right: none;
            border-bottom: 1px solid #1e293b;
          }
          .preview-container {
            padding: 16px;
            max-height: none;
            overflow-x: auto;
          }
          .contract-document {
            zoom: 0.9;
            transform-origin: top left;
          }
        }
        @media screen and (max-width: 767px) {
          .contract-document {
            zoom: 0.65;
          }
        }
        @media screen and (max-width: 479px) {
          .contract-document {
            zoom: 0.45;
          }
        }

        /* Suggestions Autocomplete Dropdown Styling */
        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
        }
        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #1e293b;
          transition: background 0.15s;
          text-align: left;
        }
        .suggestion-item:last-child {
          border-bottom: none;
        }
        .suggestion-item:hover {
          background: #1e293b;
        }
        .sug-imei {
          font-weight: bold;
          font-size: 12.5px;
          color: #22d3ee;
        }
        .sug-details {
          font-size: 10.5px;
          color: #94a3b8;
          margin-top: 2px;
        }
      `}</style>
    </MobileLayout>
  );
}
