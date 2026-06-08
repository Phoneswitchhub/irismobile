'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MobileLayout from '@/components/MobileLayout';
import Navbar from '@/components/Navbar';
import { INTEREST_TABLE, getClosestPrice } from '@/lib/interestTable';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { THAILAND_PROVINCES } from '@/lib/addresses';

export default function ContractPage() {
  const router = useRouter();
  const { t } = useTranslation();

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

  // 5b. Seller Authentication & Profile States
  const [user, setUser] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  // 5c. Sidebar Tabs: 'create' | 'history' | 'shipping'
  const [sidebarTab, setSidebarTab] = useState<'create' | 'history' | 'shipping'>('create');
  const [sentContracts, setSentContracts] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 5d. Link Generation Modal States
  const [generatedLink, setGeneratedLink] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // 6. Signature Pad Modal State & Logic
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 6b. Installment Months Modal State
  const [showMonthsModal, setShowMonthsModal] = useState(false);

  // 6c. Shipping Label States
  const [senderName, setSenderName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sender_name') || '';
    return '';
  });
  const [senderPhone, setSenderPhone] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sender_phone') || '';
    return '';
  });
  const [senderProvince, setSenderProvince] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sender_province') || '';
    return '';
  });
  const [senderDistrict, setSenderDistrict] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sender_district') || '';
    return '';
  });
  const [senderAddressDetail, setSenderAddressDetail] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sender_address_detail') || '';
    return '';
  });

  const senderDistricts = useMemo(() => {
    if (!senderProvince) return [];
    const provData = THAILAND_PROVINCES.find(p => p.name_en === senderProvince);
    return provData ? provData.districts : [];
  }, [senderProvince]);

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverProvince, setReceiverProvince] = useState('');
  const [receiverDistrict, setReceiverDistrict] = useState('');
  const [receiverAddressDetail, setReceiverAddressDetail] = useState('');

  const receiverDistricts = useMemo(() => {
    if (!receiverProvince) return [];
    const provData = THAILAND_PROVINCES.find(p => p.name_en === receiverProvince);
    return provData ? provData.districts : [];
  }, [receiverProvince]);

  const [shippingType, setShippingType] = useState<'general' | 'cod'>('general');
  const [codAmount, setCodAmount] = useState<number | string>('');

  // Sync Sender information to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sender_name', senderName);
      localStorage.setItem('sender_phone', senderPhone);
      localStorage.setItem('sender_province', senderProvince);
      localStorage.setItem('sender_district', senderDistrict);
      localStorage.setItem('sender_address_detail', senderAddressDetail);
    }
  }, [senderName, senderPhone, senderProvince, senderDistrict, senderAddressDetail]);

  // Saved shipping label state (for 2-in-1 layout)
  const [savedLabel, setSavedLabel] = useState<{
    receiverName: string;
    receiverPhone: string;
    receiverProvince: string;
    receiverDistrict: string;
    receiverAddressDetail: string;
    shippingType: 'general' | 'cod';
    codAmount: number | string;
  } | null>(null);

  const handleSaveFirstLabel = () => {
    if (!receiverName.trim()) {
      alert('กรุณากรอกชื่อผู้รับ (Please enter receiver name)');
      return;
    }
    setSavedLabel({
      receiverName,
      receiverPhone,
      receiverProvince,
      receiverDistrict,
      receiverAddressDetail,
      shippingType,
      codAmount
    });
    // Clear receiver inputs for the second label
    setReceiverName('');
    setReceiverPhone('');
    setReceiverProvince('');
    setReceiverDistrict('');
    setReceiverAddressDetail('');
    setCodAmount('');
  };

  const handleClearSavedLabel = () => {
    setSavedLabel(null);
  };

  // Check login and fetch profile details
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (p) {
            setSellerProfile(p);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoadingSeller(false);
      }
    };
    checkUser();
  }, []);

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    return (
      sellerProfile?.store_type === 'direct' ||
      sellerProfile?.role === 'admin'
    );
  }, [user, sellerProfile]);

  useEffect(() => {
    if (!loadingSeller && !user) {
      router.push('/auth');
    }
  }, [user, loadingSeller, router]);

  const hasInventoryAccess = useMemo(() => {
    if (!user) return true; // Preview / Dev mode (allows autocomplete when not logged in)
    return isAuthorized;
  }, [user, isAuthorized]);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setSentContracts(data);
      }
    } catch (err) {
      console.error('Failed to load contract history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user && sidebarTab === 'history') {
      loadHistory();
    }
  }, [user, sidebarTab]);

  useEffect(() => {
    if (!user || sidebarTab !== 'history') return;

    // Listen to realtime changes on 'contracts' table for this seller
    const channel = supabase
      .channel('public:contracts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `seller_id=eq.${user.id}`
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.id) {
            setSentContracts((prev) =>
              prev.map((c) => (c.id === newRow.id ? newRow : c))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sidebarTab]);

  const doSaveContractDraft = async () => {
    if (!user) {
      alert('กรุณาเข้าสู่ระบบก่อนสร้างลิงก์ (Please log in to generate links)');
      router.push('/auth');
      return;
    }

    setSavingDraft(true);
    try {
      const contractData = {
        contract_no: contractNo,
        contract_date: contractDate,
        store_name: storeName,
        store_address: storeAddress,
        
        customer_name: customerName,
        nationality: nationality,
        id_card_no: idCardNo,
        passport_no: passportNo,
        customer_address: customerAddress,
        workplace: workplace,
        phone_no: phoneNo,
        facebook: facebook,
        line_id: lineId,
        
        guarantor_name: guarantorName,
        guarantor_id_card: guarantorIdCard,
        guarantor_phone: guarantorPhone,
        relationship: relationship,
        
        product_name: productName,
        model: model,
        color: color,
        capacity: capacity,
        serial_no: serialNo,
        imei: imei,
        selling_price: sellingPrice === '' ? 0 : Number(sellingPrice),
        
        down_payment: downPayment === '' ? 0 : Number(downPayment),
        installments_count: installmentsCount === '' ? 4 : Number(installmentsCount),
        installment_amount: installmentAmount === '' ? 0 : Number(installmentAmount),
        down_payment_date: downPaymentDate,
        first_installment_date: firstInstallmentDate,
        
        status: 'pending_signature',
        seller_id: user.id
      };

      const { data, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select('id')
        .single();

      if (error) {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message + '\n\n💡 Please check if the contracts table is created in Supabase.');
      } else if (data) {
        const link = `${window.location.origin}/contract/sign/${data.id}`;
        setGeneratedLink(link);
        setShowLinkModal(true);
        loadHistory();
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const loadContractIntoEditor = (c: any) => {
    setContractNo(c.contract_no || '');
    setContractDate(c.contract_date || '');
    setStoreName(c.store_name || '');
    setStoreAddress(c.store_address || '');
    
    setCustomerName(c.customer_name || '');
    setNationality(c.nationality || '');
    setIdCardNo(c.id_card_no || '');
    setPassportNo(c.passport_no || '');
    setCustomerAddress(c.customer_address || '');
    setWorkplace(c.workplace || '');
    setPhoneNo(c.phone_no || '');
    setFacebook(c.facebook || '');
    setLineId(c.line_id || '');
    
    setGuarantorName(c.guarantor_name || '');
    setGuarantorIdCard(c.guarantor_id_card || '');
    setGuarantorPhone(c.guarantor_phone || '');
    setRelationship(c.relationship || '');
    
    setProductName(c.product_name || '');
    setModel(c.model || '');
    setColor(c.color || '');
    setCapacity(c.capacity || '');
    setSerialNo(c.serial_no || '');
    setImei(c.imei || '');
    setSellingPrice(c.selling_price || 0);
    
    setDownPayment(c.down_payment || 0);
    setInstallmentsCount(c.installments_count || 4);
    setInstallmentAmount(c.installment_amount || 0);
    setDownPaymentDate(c.down_payment_date || '');
    setFirstInstallmentDate(c.first_installment_date || '');
    
    if (c.signature_data) {
      setSignatureData(c.signature_data);
    } else {
      setSignatureData(null);
    }

    setSidebarTab('create');
  };

  // Auto-load contract from URL parameter (?id=...)
  useEffect(() => {
    if (loadingSeller) return;
    const loadContractFromUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const contractId = urlParams.get('id');
      if (contractId) {
        try {
          const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', contractId)
            .single();
          if (!error && data) {
            loadContractIntoEditor(data);
          }
        } catch (e) {
          console.error('Failed to load contract from URL:', e);
        }
      }
    };
    loadContractFromUrl();
  }, [user, loadingSeller]);

  const resetFormFields = () => {
    setContractNo('IRISBUY' + Math.floor(1000 + Math.random() * 9000));
    setContractDate(new Date().toISOString().split('T')[0]);
    setCustomerName('');
    setNationality('ไทย');
    setIdCardNo('');
    setPassportNo('');
    setCustomerAddress('');
    setWorkplace('');
    setPhoneNo('');
    setFacebook('');
    setLineId('');
    
    setGuarantorName('');
    setGuarantorIdCard('');
    setGuarantorPhone('');
    setRelationship('');
    
    setProductName('โทรศัพท์มือถือ');
    setModel('');
    setColor('');
    setCapacity('');
    setSerialNo('');
    setImei('');
    setSellingPrice(0);
    
    setDownPayment(0);
    setInstallmentsCount(4);
    setInstallmentAmount(0);
    setDownPaymentDate(new Date().toISOString().split('T')[0]);
    
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setFirstInstallmentDate(d.toISOString().split('T')[0]);

    setSignatureData(null);
  };

  // Resize canvas and bind direct DOM events for smooth zero-lag drawing when modal opens
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

      // Performance optimized draw state inside hook closure
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

      // Bind mouse events directly
      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', stop);
      canvas.addEventListener('mouseleave', stop);

      // Bind touch events directly (passive: false to prevent scrolling)
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

  // 7. Database (sheets_inventory) Autocomplete
  const [inventory, setInventory] = useState<any[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchInventoryFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from('sheets_inventory')
          .select('*')
          .is('deleted_at', null)
          .eq('is_sold', false);
        
        if (error) throw error;
        
        if (data) {
          const mapped = data.map((item: any) => ({
            serialNo: item.sticker || '',
            model: item.model_name || '',
            imei: item.imei || '',
            color: item.color || '',
            price: item.selling_price || 0,
            isSold: item.is_sold || false,
            battery: item.battery_pct || '100',
            location: item.stock_location || 'Shop',
            seller: item.seller_name || '',
            notes: item.notes || '',
            saleDate: item.sale_date || '',
            siteDate: item.site_date || '',
            purchaseCost: item.purchase_cost_krw || 0,
            marketPrice: item.market_price || 0,
          }));
          setInventory(mapped);
        }
      } catch (err) {
        console.error('Failed to load inventory from Supabase:', err);
      }
    };

    fetchInventoryFromDb();
  }, []);

  const handleImeiChange = (val: string) => {
    setImei(val);
    const cleanVal = val.trim();
    if (hasInventoryAccess && cleanVal.length >= 2) {
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

  const handleSellingPriceChange = (valStr: string) => {
    setSellingPrice(valStr);
    if (valStr !== '') {
      const price = parseInt(valStr) || 0;
      if (price >= 5000 && price <= 40000) {
        const closest = getClosestPrice(price);
        const row = INTEREST_TABLE[closest];
        if (row) {
          setDownPayment(row.down);
          const m = Number(installmentsCount);
          if (m === 3 || m === 4 || m === 6 || m === 8 || m === 10) {
            setInstallmentAmount(row[m]);
          }
        }
      } else {
        // Exceeds or below table range
        setDownPayment(Math.round(price * 0.3));
        setInstallmentAmount('');
      }
    } else {
      setDownPayment('');
      setInstallmentAmount('');
    }
  };

  const handleInstallmentsCountChange = (valStr: string) => {
    setInstallmentsCount(valStr);
    if (valStr !== '') {
      const m = parseInt(valStr);
      const price = Number(sellingPrice) || 0;
      if (price >= 5000 && price <= 40000) {
        const closest = getClosestPrice(price);
        const row = INTEREST_TABLE[closest];
        if (row && (m === 3 || m === 4 || m === 6 || m === 8 || m === 10)) {
          setInstallmentAmount(row[m]);
        }
      }
    }
  };

  const selectItem = (item: any) => {
    setImei(item.imei);
    setModel(item.model);
    setColor(item.color);
    setSerialNo(item.serialNo);
    setSellingPrice(item.price);
    
    // Auto-fill capacity if present in the model name (e.g. 128G, 256GB, 1TB)
    const capMatch = item.model.match(/(\d+\s*(?:GB|G|TB|T))/i);
    if (capMatch) {
      setCapacity(capMatch[1].toUpperCase());
    } else {
      setCapacity('');
    }
    
    // Auto-lookup interest table for this item's price
    if (item.price >= 5000 && item.price <= 40000) {
      const closest = getClosestPrice(item.price);
      const row = INTEREST_TABLE[closest];
      if (row) {
        setDownPayment(row.down);
        const m = Number(installmentsCount) || 4; // default to current or 4 months
        if (m === 3 || m === 4 || m === 6 || m === 8 || m === 10) {
          setInstallmentsCount(m);
          setInstallmentAmount(row[m]);
        }
      }
    } else {
      // Exceeds or below table range
      setDownPayment(Math.round(item.price * 0.3));
      setInstallmentAmount('');
    }
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

  // Drawing Pad Canvas Actions (Drawing handled by raw DOM listeners in useEffect)
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

  if (loadingSeller) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--t1)' }}>
        <div style={{ color: 'var(--purple-l)', fontWeight: 700 }}>Checking credentials...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <MobileLayout paddingBottom="0" paddingTop="68px">
        <div className="no-print">
          <Navbar onLogoClick={() => router.push('/')} />
        </div>
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center', 
          color: 'var(--t1)', 
          maxWidth: '480px', 
          margin: '40px auto 0',
          background: 'var(--bg3)',
          borderRadius: 'var(--r)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚫</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--red)' }}>{t('access_denied_title')}</h3>
          <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '24px', lineHeight: 1.5 }}>
            {t('access_denied_desc')}
          </p>
          <button 
            className="btn-submit" 
            style={{ margin: 0, width: '100%', justifyContent: 'center' }}
            onClick={() => router.push('/')}
          >
            🏠 {t('go_home_button')}
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout paddingBottom="0" paddingTop="68px">
      <div className="no-print">
        <Navbar onLogoClick={() => router.push('/')} />
      </div>

      {/* Main Split Screen Container */}
      <div className={`contract-container ${sidebarTab === 'shipping' ? 'print-shipping-only' : 'print-contract-only'}`}>
        
        {/* LEFT COLUMN: Input form (Hidden on Print) */}
        <div className="sidebar no-print">
          <div className="sidebar-header">
            <h3>📝 เขียนสัญญาเช่าซื้อ (Contract Tool)</h3>
            <p>กรอกข้อมูลและจัดส่งสัญญาเช่าซื้อให้ลูกค้าลงลายมือชื่อ</p>
          </div>

          {/* Tab Selection */}
          {user && (
            <div className="sidebar-tabs">
              <button 
                className={`tab-btn ${sidebarTab === 'create' ? 'active' : ''}`}
                onClick={() => setSidebarTab('create')}
              >
                ✍️ {t('tab_contracts')} (Create)
              </button>
              <button 
                className={`tab-btn ${sidebarTab === 'history' ? 'active' : ''}`}
                onClick={() => setSidebarTab('history')}
              >
                📋 {t('recent_contracts_sent')} (Sent)
              </button>
              <button 
                className={`tab-btn ${sidebarTab === 'shipping' ? 'active' : ''}`}
                onClick={() => setSidebarTab('shipping')}
              >
                📦 ส่งของ (Shipping)
              </button>
            </div>
          )}

          {!user && !loadingSeller && (
            <div className="login-banner">
              <p>{t('contract_login_required_desc')}</p>
              <button className="btn-login-redirect" onClick={() => router.push('/auth')}>
                🔑 {t('login_or_register')} (Go to Login)
              </button>
            </div>
          )}

          {sidebarTab === 'create' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button className="btn-reset" onClick={resetFormFields}>
                  ✨ {t('btn_new_contract')} (New)
                </button>
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
                  <label className="form-label">IMEI ({t('autocomplete')} / Autocomplete)</label>
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
                  <label className="form-label">{t('total_amount_label')} (Total Price) *</label>
                  <input type="number" className="form-input" value={sellingPrice} onChange={(e) => handleSellingPriceChange(e.target.value)} />
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
                  <div 
                    className="custom-select-card" 
                    onClick={() => setShowMonthsModal(true)}
                  >
                    <span>
                      {installmentsCount 
                        ? `${installmentsCount} ${t('months_unit')} (${installmentsCount} Months)` 
                        : 'เลือกจำนวนงวด (Select Months)'}
                    </span>
                    <span className="dropdown-arrow">▼</span>
                  </div>
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

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {user ? (
                  <button 
                    className="btn-send-link" 
                    onClick={doSaveContractDraft}
                    disabled={savingDraft}
                  >
                    {savingDraft ? 'กำลังบันทึก... (Saving...)' : t('btn_create_sign_link')}
                  </button>
                ) : (
                  <button 
                    className="btn-send-link disabled" 
                    onClick={() => router.push('/auth')}
                  >
                    {t('btn_login_to_create_link')}
                  </button>
                )}
                
                <button className="btn-print" onClick={handlePrint}>
                  🖨️ พิมพ์เอกสารสัญญา (Print Contract)
                </button>
              </div>
            </>
          ) : sidebarTab === 'history' ? (
            /* Tab 2: History List */
            <div className="history-wrapper">
              <h4>{t('recent_contracts_sent')}</h4>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  {t('loading')}
                </div>
              ) : sentContracts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
                  {t('no_contracts')}
                </div>
              ) : (
                <div className="history-list">
                  {sentContracts.map((c) => (
                    <div 
                      key={c.id} 
                      className={`history-item ${c.status === 'signed' ? 'signed' : 'pending'}`}
                      onClick={() => loadContractIntoEditor(c)}
                    >
                      <div className="history-item-top">
                        <span className="cust-name">👤 {c.customer_name || 'ไม่ระบุชื่อ'}</span>
                        <span className={`status-badge ${c.status}`}>
                          {c.status === 'signed' ? `🟢 ${t('status_signed')}` : `⏳ ${t('status_waiting')}`}
                        </span>
                      </div>
                      <div className="history-item-details">
                        <div>รุ่น: {c.model} {c.capacity}</div>
                        <div>IMEI: {c.imei}</div>
                        <div>วันที่: {c.contract_date}</div>
                      </div>
                      
                      {c.status === 'pending_signature' && (
                        <button 
                          className="btn-copy-history"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = `${window.location.origin}/contract/sign/${c.id}`;
                            navigator.clipboard.writeText(link);
                            alert('คัดลอกลิงก์เรียบร้อยแล้ว! (Link copied to clipboard!)');
                          }}
                        >
                          {t('btn_copy_link')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Tab 3: Shipping Label Form */
            <div className="form-sections-wrapper" style={{ textAlign: 'left' }}>
              {/* 1. Sender Info */}
              <div className="form-section-card">
                <h4 style={{ color: '#22d3ee' }}>📦 ข้อมูลผู้ส่ง (Sender Info)</h4>
                <div className="form-group">
                  <label className="form-label">ชื่อ-สกุล ผู้ส่ง (Sender Name) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น ไอริส โมบาย"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์ ผู้ส่ง (Sender Phone) *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="เช่น 0891234567"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">จังหวัด ผู้ส่ง (Province) *</label>
                    <select
                      className="form-select"
                      value={senderProvince}
                      onChange={(e) => {
                        setSenderProvince(e.target.value);
                        setSenderDistrict('');
                      }}
                    >
                      <option value="">เลือกจังหวัด (Select)</option>
                      {THAILAND_PROVINCES.map((p) => (
                        <option key={p.id} value={p.name_en}>
                          {p.name_en} ({p.name_th})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">อำเภอ/เขต ผู้ส่ง (District) *</label>
                    <select
                      className="form-select"
                      value={senderDistrict}
                      onChange={(e) => setSenderDistrict(e.target.value)}
                      disabled={!senderProvince}
                    >
                      <option value="">เลือกอำเภอ (Select)</option>
                      {senderDistricts.map((d) => (
                        <option key={d.id} value={d.name_en}>
                          {d.name_en} ({d.name_th})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ที่อยู่ผู้ส่ง (Sender Detail Address) *</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="เลขที่, ซอย, ถนน, ตำบล/แขวง"
                    value={senderAddressDetail}
                    onChange={(e) => setSenderAddressDetail(e.target.value)}
                  />
                </div>
              </div>

              {/* 2. Receiver Info */}
              <div className="form-section-card">
                <h4 style={{ color: '#10b981' }}>👤 ข้อมูลผู้รับ (Receiver Info)</h4>
                <div className="form-group">
                  <label className="form-label">ชื่อ-สกุล ผู้รับ (Receiver Name) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น สมชาย มีสุข"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์ ผู้รับ (Receiver Phone) *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="เช่น 0812345678"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">จังหวัด ผู้รับ (Province) *</label>
                    <select
                      className="form-select"
                      value={receiverProvince}
                      onChange={(e) => {
                        setReceiverProvince(e.target.value);
                        setReceiverDistrict('');
                      }}
                    >
                      <option value="">เลือกจังหวัด (Select)</option>
                      {THAILAND_PROVINCES.map((p) => (
                        <option key={p.id} value={p.name_en}>
                          {p.name_en} ({p.name_th})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">อำเภอ/เขต ผู้รับ (District) *</label>
                    <select
                      className="form-select"
                      value={receiverDistrict}
                      onChange={(e) => setReceiverDistrict(e.target.value)}
                      disabled={!receiverProvince}
                    >
                      <option value="">เลือกอำเภอ (Select)</option>
                      {receiverDistricts.map((d) => (
                        <option key={d.id} value={d.name_en}>
                          {d.name_en} ({d.name_th})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ที่อยู่ผู้รับ (Receiver Detail Address) *</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="เลขที่, ซอย, ถนน, ตำบล/แขวง"
                    value={receiverAddressDetail}
                    onChange={(e) => setReceiverAddressDetail(e.target.value)}
                  />
                </div>
              </div>

              {/* 3. Shipping Options */}
              <div className="form-section-card">
                <h4>🚚 ประเภทการจัดส่ง (Shipping Options)</h4>
                <div className="form-group">
                  <div style={{ display: 'flex', gap: '20px', margin: '8px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="shippingType"
                        value="general"
                        checked={shippingType === 'general'}
                        onChange={() => setShippingType('general')}
                      />
                      ส่งทั่วไป (General)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="shippingType"
                        value="cod"
                        checked={shippingType === 'cod'}
                        onChange={() => setShippingType('cod')}
                      />
                      เก็บเงินปลายทาง (COD)
                    </label>
                  </div>
                </div>
                {shippingType === 'cod' && (
                  <div className="form-group">
                    <label className="form-label">ยอดเงิน COD (COD Amount - THB) *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="ระบุจำนวนเงิน เช่น 3000"
                      value={codAmount}
                      onChange={(e) => setCodAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-submit" 
                    style={{ margin: 0, flex: 1, backgroundColor: '#8b5cf6', color: '#fff' }}
                    onClick={handleSaveFirstLabel}
                  >
                    {savedLabel ? '💾 변경 저장 (Save 1st Label)' : '💾 1번째 송장 저장 (Save 1st)'}
                  </button>
                  {savedLabel && (
                    <button 
                      className="btn-submit" 
                      style={{ margin: 0, flex: 0.4, backgroundColor: '#ef4444', color: '#fff' }}
                      onClick={handleClearSavedLabel}
                    >
                      ❌ 비우기
                    </button>
                  )}
                </div>

                {savedLabel && (
                  <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 'bold', textAlign: 'center', background: '#ecfdf5', padding: '6px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    📌 1번째 저장됨: {savedLabel.receiverName} ({savedLabel.receiverPhone})
                  </div>
                )}

                <button className="btn-print" onClick={handlePrint}>
                  🖨️ {savedLabel ? '🖨️ 2개 묶어서 인쇄하기 (Print 2 Labels)' : '🖨️ 현재 송장 인쇄하기 (Print Shipping Label)'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Real A4 Document Preview */}
        <div className="preview-container">
          {sidebarTab === 'shipping' ? (
            <div id="printable-shipping-area" className="shipping-print-container">
              {/* 1st Label (Saved) */}
              {savedLabel && (
                <div className="shipping-label-document" style={{ marginBottom: '10mm' }}>
                  <div className="label-top-bar">
                    <h2>PHONE SWITCH HUB CO., LTD.</h2>
                    <span className="label-sub-title">ใบปะหน้าพัสดุ (Shipping Label 1)</span>
                  </div>
                  
                  <div className="label-grid">
                    {/* Left Column (Sender) */}
                    <div className="grid-left">
                      <div className="label-section sender-box">
                        <div className="section-hdr">ผู้ส่ง (SENDER)</div>
                        <div className="section-content">
                          <div className="name-row"><b>ชื่อ:</b> {senderName || '........................................................'}</div>
                          <div className="phone-row"><b>โทร:</b> {senderPhone || '........................................................'}</div>
                          <div className="address-row">
                            <b>ที่อยู่:</b> {senderAddressDetail ? `${senderAddressDetail} ${senderDistrict ? `${senderDistrict}` : ''} ${senderProvince ? `${senderProvince}` : ''}` : '................................................................................................................................................'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (COD + Receiver) */}
                    <div className="grid-right">
                      <div className="label-badge-area">
                        {savedLabel.shippingType === 'cod' ? (
                          <div className="cod-badge-container">
                            <div className="cod-badge">COD</div>
                            <div className="cod-amount-box">
                              <div className="cod-title">ยอดเก็บเงินปลายทาง</div>
                              <div className="cod-val">฿{savedLabel.codAmount ? Number(savedLabel.codAmount).toLocaleString() : '0'}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="general-shipping-badge">
                            การจัดส่งทั่วไป (General Delivery)
                          </div>
                        )}
                      </div>

                      <div className="label-section receiver-box">
                        <div className="section-hdr" style={{ backgroundColor: '#10b981' }}>ผู้รับ (RECEIVER)</div>
                        <div className="section-content">
                          <div className="name-row"><b>ชื่อ:</b> <b>{savedLabel.receiverName || '........................................................'}</b></div>
                          <div className="phone-row"><b>โทร:</b> <b>{savedLabel.receiverPhone || '........................................................'}</b></div>
                          <div className="address-row">
                            <b>ที่อยู่:</b> {savedLabel.receiverAddressDetail ? `${savedLabel.receiverAddressDetail} ${savedLabel.receiverDistrict ? `${savedLabel.receiverDistrict}` : ''} ${savedLabel.receiverProvince ? `${savedLabel.receiverProvince}` : ''}` : '................................................................................................................................................'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2nd Label (Active) */}
              <div className="shipping-label-document">
                <div className="label-top-bar">
                  <h2>PHONE SWITCH HUB CO., LTD.</h2>
                  <span className="label-sub-title">ใบปะหน้าพัสดุ (Shipping Label {savedLabel ? '2' : ''})</span>
                </div>
                
                <div className="label-grid">
                  {/* Left Column (Sender) */}
                  <div className="grid-left">
                    <div className="label-section sender-box">
                      <div className="section-hdr">ผู้ส่ง (SENDER)</div>
                      <div className="section-content">
                        <div className="name-row"><b>ชื่อ:</b> {senderName || '........................................................'}</div>
                        <div className="phone-row"><b>โทร:</b> {senderPhone || '........................................................'}</div>
                        <div className="address-row">
                          <b>ที่อยู่:</b> {senderAddressDetail ? `${senderAddressDetail} ${senderDistrict ? `${senderDistrict}` : ''} ${senderProvince ? `${senderProvince}` : ''}` : '................................................................................................................................................'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (COD + Receiver) */}
                  <div className="grid-right">
                    <div className="label-badge-area">
                      {shippingType === 'cod' ? (
                        <div className="cod-badge-container">
                          <div className="cod-badge">COD</div>
                          <div className="cod-amount-box">
                            <div className="cod-title">ยอดเก็บเงินปลายทาง</div>
                            <div className="cod-val">฿{codAmount ? Number(codAmount).toLocaleString() : '0'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="general-shipping-badge">
                          การจัดส่งทั่วไป (General Delivery)
                        </div>
                      )}
                    </div>

                    <div className="label-section receiver-box">
                      <div className="section-hdr" style={{ backgroundColor: '#10b981' }}>ผู้รับ (RECEIVER)</div>
                      <div className="section-content">
                        <div className="name-row"><b>ชื่อ:</b> <b>{receiverName || '........................................................'}</b></div>
                        <div className="phone-row"><b>โทร:</b> <b>{receiverPhone || '........................................................'}</b></div>
                        <div className="address-row">
                          <b>ที่อยู่:</b> {receiverAddressDetail ? `${receiverAddressDetail} ${receiverDistrict ? `${receiverDistrict}` : ''} ${receiverProvince ? `${receiverProvince}` : ''}` : '................................................................................................................................................'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
                  <div style={{ color: 'var(--red)' }}><b>ราคาขาย:</b> <span className="fill-value" style={{ fontWeight: 'bold' }}>{sellingPrice ? `${Number(sellingPrice).toLocaleString()} บาท` : '.......................... บาท'}</span></div>
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
                    <div style={{ height: '100px', borderBottom: '1px solid #000', width: '200px', margin: '0 auto' }} />
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
          )}
        </div>

      </div>

      {/* DRAWING SIGNATURE MODAL - FULL SCREEN */}
      {showSignModal && (
        <div className="signature-modal-overlay">
          <div className="signature-modal-header">
            <span style={{ color: '#333', fontSize: '18px', fontWeight: 800 }}>🖊️ เซ็นชื่ออิเล็กทรอนิกส์ (E-Signature)</span>
            <button onClick={() => setShowSignModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>✕</button>
          </div>
          
          <p style={{ fontSize: '12.5px', color: '#666', marginBottom: '10px', textAlign: 'left' }}>
            ใช้นิ้วหรือสไตลัสเขียนลงในกรอบด้านล่าง (Draw your signature inside the box below)
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

      {/* CUSTOM MONTHS SELECTION MODAL */}
      {showMonthsModal && (
        <div className="months-modal-overlay" onClick={() => setShowMonthsModal(false)}>
          <div className="months-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="months-modal-header">
              <span>📅 เลือกจำนวนงวด (Select Months)</span>
              <button 
                onClick={() => setShowMonthsModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>
            
            <p className="months-modal-desc">
              เลือกระยะเวลาการผ่อนชำระที่ต้องการ (Select the installment plan)
            </p>

            <div className="months-options-list">
              {[3, 4, 6, 8, 10].map((m) => {
                // Determine interest rate preview for this month count
                const price = Number(sellingPrice) || 0;
                let previewAmount = '';
                if (price >= 5000 && price <= 40000) {
                  const closest = getClosestPrice(price);
                  const row = INTEREST_TABLE[closest];
                  if (row) {
                    previewAmount = `${row[m as 3 | 4 | 6 | 8 | 10].toLocaleString()} ฿/${t('month_short')}`;
                  }
                }

                const isSelected = String(installmentsCount) === String(m);

                return (
                  <button
                    key={m}
                    className={`months-option-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      handleInstallmentsCountChange(String(m));
                      setShowMonthsModal(false);
                    }}
                  >
                    <div className="option-title">
                      <span className="option-check">{isSelected ? '✓ ' : ''}</span>
                      {m} ${t('months_unit')} ({m} Months)
                    </div>
                    {previewAmount && (
                      <div className="option-subtitle">
                        ชำระงวดละ {previewAmount} (Monthly)
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button 
              className="months-modal-close-btn"
              onClick={() => setShowMonthsModal(false)}
            >
              {t('close')} (Close)
            </button>
          </div>
        </div>
      )}

      {/* GENERATED LINK MODAL */}
      {showLinkModal && (
        <div className="months-modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="months-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="months-modal-header">
              <span style={{ color: '#10b981' }}>🔗 ลิงก์สำหรับส่งให้ลูกค้า (Client Sign Link)</span>
              <button 
                onClick={() => setShowLinkModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>
            
            <p className="months-modal-desc">
              คัดลอกลิงก์ด้านล่างแล้วส่งให้ลูกค้าเพื่อทำการลงลายมือชื่อ (Copy and send this link to the customer)
            </p>

            <div className="generated-link-box">
              <input 
                type="text" 
                readOnly 
                value={generatedLink} 
                className="generated-link-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button 
                className="btn-print"
                style={{ flex: 1, background: '#10b981' }}
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  alert('คัดลอกลิงก์เรียบร้อยแล้ว! (Link copied to clipboard!)');
                }}
              >
                📋 คัดลอกลิงก์ (Copy Link)
              </button>
              <button 
                className="months-modal-close-btn"
                style={{ flex: 1 }}
                onClick={() => setShowLinkModal(false)}
              >
                {t('close')} (Close)
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

        /* Sidebar Tab Selection */
        .sidebar-tabs {
          display: flex;
          background: #0b0f19;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 3px;
          margin-bottom: 16px;
        }
        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          color: #94a3b8;
          padding: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #1e293b;
          color: #22d3ee;
        }

        /* Buttons and Banners */
        .btn-reset {
          background: none;
          border: 1px solid #334155;
          color: #94a3b8;
          padding: 6px 10px;
          font-size: 11px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-reset:hover {
          border-color: #22d3ee;
          color: #f1f5f9;
        }
        .btn-send-link {
          width: 100%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
          transition: all 0.2s;
        }
        .btn-send-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }
        .btn-send-link.disabled {
          background: #1e293b;
          color: #64748b;
          cursor: pointer;
          box-shadow: none;
        }
        .login-banner {
          background: rgba(34, 211, 238, 0.05);
          border: 1px dashed rgba(34, 211, 238, 0.2);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
        }
        .btn-login-redirect {
          background: #22d3ee;
          color: #0b0f19;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-weight: 700;
          margin-top: 8px;
          cursor: pointer;
          font-size: 11px;
        }

        /* History Items */
        .history-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }
        .history-wrapper h4 {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0;
          padding-bottom: 6px;
          border-bottom: 1px solid #1e293b;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .history-item {
          background: #131b2e;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .history-item:hover {
          border-color: #22d3ee;
          background: #17223b;
        }
        .history-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .cust-name {
          font-size: 13px;
          font-weight: 700;
          color: #f1f5f9;
        }
        .status-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .status-badge.pending_signature {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .status-badge.signed {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .history-item-details {
          font-size: 11.5px;
          color: #94a3b8;
          line-height: 1.5;
        }
        .btn-copy-history {
          width: 100%;
          background: #1e293b;
          border: 1px solid #334155;
          color: #e2e8f0;
          margin-top: 10px;
          padding: 6px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-copy-history:hover {
          background: #334155;
          border-color: #22d3ee;
        }

        /* Generated Link Box */
        .generated-link-box {
          margin: 12px 0;
        }
        .generated-link-input {
          width: 100%;
          background: #0b0f19;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 10px;
          color: #22d3ee;
          font-size: 12px;
          text-align: center;
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
          min-height: 120px;
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
          max-height: 110px;
          max-width: 280px;
          object-fit: contain;
          border-bottom: 1px solid #000000;
          width: 100%;
        }
        .company-seal-stamp {
          position: absolute;
          width: 450px;
          height: auto;
          bottom: -40px;
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
          
          /* Hide everything except the active printable area */
          body * {
            visibility: hidden !important;
          }
          .print-contract-only #printable-contract-area,
          .print-contract-only #printable-contract-area * {
            visibility: visible !important;
          }
          .print-shipping-only #printable-shipping-area,
          .print-shipping-only #printable-shipping-area * {
            visibility: visible !important;
          }
          
          /* Completely hide non-printable areas to prevent layout space allocation and scale issues on mobile */
          .print-contract-only .no-print,
          .print-contract-only .sidebar,
          .print-shipping-only .no-print,
          .print-shipping-only .sidebar,
          header,
          footer,
          nav {
            display: none !important;
          }
          
          .print-shipping-only #printable-contract-area {
            display: none !important;
          }
          .print-contract-only #printable-shipping-area {
            display: none !important;
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
            padding: 6mm 6mm !important;
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

         /* Full Screen E-Signature Modal Styling */
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
          justify-content: center; /* Center content vertically on tall screens */
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
          height: 250px; /* Enforce landscape aspect ratio to prevent tall squished signatures on mobile */
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

        /* Custom Select Card */
        .custom-select-card {
          width: 100%;
          background: #0b0f19;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 10px 12px;
          color: #f1f5f9;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }
        .custom-select-card:hover {
          border-color: #22d3ee;
          background: #0f172a;
        }
        .dropdown-arrow {
          font-size: 9px;
          color: #94a3b8;
        }

        /* Months Modal Overlay */
        .months-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .months-modal-card {
          width: 100%;
          max-width: 440px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          color: #f1f5f9;
        }
        .months-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .months-modal-header span {
          font-size: 17px;
          font-weight: 800;
          color: #22d3ee;
        }
        .months-modal-desc {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 20px;
          text-align: left;
        }
        .months-options-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        .months-option-btn {
          width: 100%;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 12px 16px;
          color: #f1f5f9;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: all 0.2s;
          text-align: left;
        }
        .months-option-btn:hover {
          background: #334155;
          border-color: #22d3ee;
        }
        .months-option-btn.active {
          background: rgba(34, 211, 238, 0.1);
          border-color: #22d3ee;
          color: #22d3ee;
        }
        .months-option-btn .option-title {
          font-size: 14px;
          font-weight: 700;
        }
        .months-option-btn .option-subtitle {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }
        .months-option-btn.active .option-subtitle {
          color: #22d3ee;
        }
        .months-modal-close-btn {
          width: 100%;
          background: #334155;
          border: none;
          color: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13.5px;
          transition: background 0.2s;
        }
        .months-modal-close-btn:hover {
          background: #475569;
        }

        /* Shipping Label Styles (A4 Half-size scaled down) */
        .shipping-label-document {
          width: 190mm;
          height: 135mm;
          background: #ffffff;
          color: #000000;
          padding: 8mm;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif;
          font-size: 11.5px;
          line-height: 1.4;
          box-sizing: border-box;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          border: 1px solid #ddd;
        }

        .label-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px dashed #000000;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }

        .label-top-bar h2 {
          font-size: 14px;
          font-weight: 850;
          margin: 0;
          color: #000000;
        }

        .label-sub-title {
          font-size: 9px;
          font-weight: bold;
          color: #555555;
        }

        .label-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6mm;
          flex: 1;
        }

        .grid-left {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          height: 100%;
        }

        .grid-right {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          height: 100%;
          gap: 8px;
        }

        .label-section {
          border: 2px solid #000000;
          border-radius: 6px;
          padding: 14px;
        }

        .sender-box {
          height: auto;
        }

        .receiver-box {
          /* bottom right */
        }

        .section-hdr {
          font-size: 14px;
          font-weight: 900;
          background: #000000;
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .section-content {
          text-align: left;
          line-height: 1.5;
        }

        .name-row, .phone-row {
          font-size: 18px;
          margin-bottom: 8px;
        }

        .address-row {
          font-size: 14.5px;
          margin-bottom: 6px;
        }

        .label-badge-area {
          margin-bottom: 6px;
        }

        .cod-badge-container {
          display: flex;
          border: 2px solid #ef4444;
          border-radius: 6px;
          overflow: hidden;
          background: #fef2f2;
        }

        .cod-badge {
          background: #ef4444;
          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cod-amount-box {
          flex: 1;
          padding: 2px 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .cod-title {
          font-size: 8.5px;
          font-weight: bold;
          color: #ef4444;
        }

        .cod-val {
          font-size: 17px;
          font-weight: 900;
          color: #ef4444;
        }

        .general-shipping-badge {
          border: 2px solid #10b981;
          background: #ecfdf5;
          color: #10b981;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
          padding: 6px;
          border-radius: 6px;
        }

        /* Screen Responsive zoom to fit left-column container preview */
        @media screen and (max-width: 1200px) {
          .shipping-label-document {
            zoom: 0.75;
            transform-origin: top center;
            margin: 0 auto;
          }
        }
        @media screen and (max-width: 767px) {
          .shipping-label-document {
            zoom: 0.5;
            transform-origin: top center;
            margin: 0 auto;
          }
        }
        @media screen and (max-width: 479px) {
          .shipping-label-document {
            zoom: 0.4;
            transform-origin: top center;
            margin: 0 auto;
          }
        }

        /* Print Override for Shipping label A5 Landscape sizing */
        @media print {
          html, body {
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
          }

          .print-shipping-only #printable-shipping-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            zoom: 1 !important;
            gap: 10mm !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document {
            width: 190mm !important;
            height: 135mm !important;
            padding: 8mm !important;
            box-shadow: none !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
          }

          /* Webkit grid print bug workaround: use float layout for printing */
          .print-shipping-only #printable-shipping-area .shipping-label-document .label-grid {
            display: block !important;
            width: 100% !important;
            height: calc(100% - 35px) !important;
            box-sizing: border-box !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .label-grid::after {
            content: "" !important;
            display: table !important;
            clear: both !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .grid-left {
            float: left !important;
            width: 48% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            box-sizing: border-box !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .grid-right {
            float: right !important;
            width: 48% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
            gap: 8px !important;
            box-sizing: border-box !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .label-section {
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .sender-box {
            height: auto !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .receiver-box {
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .label-badge-area {
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .print-shipping-only #printable-shipping-area .shipping-label-document .cod-badge-container,
          .print-shipping-only #printable-shipping-area .shipping-label-document .general-shipping-badge {
            width: 100% !important;
            box-sizing: border-box !important;
          }

          @page {
            size: A4 portrait !important;
            margin: 0 !important;
          }
        }

      `}</style>
    </MobileLayout>
  );
}
