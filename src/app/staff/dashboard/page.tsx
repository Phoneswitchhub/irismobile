'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';
import { INTEREST_TABLE, getClosestPrice } from '@/lib/interestTable';

interface DeviceItem {
  id: string;
  sale_date?: string;
  site_date?: string;
  sticker?: string;
  model_name: string;
  imei: string;
  color?: string;
  is_sold: boolean;
  stock_location?: string;
  battery_pct?: string;
  seller_name?: string;
  notes?: string;
  selling_price: number;
  market_price: number;
  purchase_cost_krw: number;
  created_at: string;
  deleted_at?: string;
  is_reserved?: boolean;
  reserved_by?: string;
  reserved_date?: string;
  sale_type?: string;
  deposit_amount?: number;
  cod_amount?: number;
  installment_months?: number;
  installment_amount?: number;
  payment_status?: string;
  customer_name?: string;
  customer_phone?: string;
  installment_number?: string;
  is_approved?: boolean;
  installment_history?: any[];
}

export default function StaffDashboard() {
  const router = useRouter();
  const { t, lang, changeLanguage } = useTranslation();

  // Authentication & Profile States
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Active Tab: 'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin' | 'installment' | 'pending_intake'
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin' | 'installment' | 'pending_intake'>('overview');

  // Sorting States
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Checkbox Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Category Quick Filter Tag
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Reservation Form Modal States
  const [reservingDevice, setReservingDevice] = useState<DeviceItem | null>(null);
  const [reserverName, setReserverName] = useState<string>('');
  const [reservationNotes, setReservationNotes] = useState<string>('');
  const [processingReservation, setProcessingReservation] = useState<boolean>(false);

  // Ledger Data States
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [soldSearchQuery, setSoldSearchQuery] = useState('');
  const [installmentSearchQuery, setInstallmentSearchQuery] = useState('');
  const [trashSearchQuery, setTrashSearchQuery] = useState('');
  const [selectedCustomerMonth, setSelectedCustomerMonth] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedStatsLocation, setSelectedStatsLocation] = useState('all');
  const [soldSelectedDays, setSoldSelectedDays] = useState<number[]>([]);
  const [isDayFilterOpen, setIsDayFilterOpen] = useState(false);

  // Intake Modals (Manual & CSV Upload)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  // IMEI auditor states
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditText, setAuditText] = useState('');
  const [auditActiveTab, setAuditActiveTab] = useState<'not_in_db' | 'not_in_paste' | 'matched'>('not_in_db');
  const [csvFileText, setCsvFileText] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const [intakeMethod, setIntakeMethod] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');

  // Settings/Master Data States
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [staffMembers, setStaffMembers] = useState<{ id: string; name: string }[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // States for on-the-fly custom additions in Intake Modal
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');

  // Settings tab inputs
  const [newLocInput, setNewLocInput] = useState('');
  const [newModInput, setNewModInput] = useState('');

  // Manual Input Form State
  const [sticker, setSticker] = useState('');
  const [modelName, setModelName] = useState('');
  const [imei, setImei] = useState('');
  const [color, setColor] = useState('');
  const [batteryPct, setBatteryPct] = useState('100');
  const [location, setLocation] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [siteDate, setSiteDate] = useState('');
  const [notes, setNotes] = useState('');
  const [savingDevice, setSavingDevice] = useState(false);

  // Selling Action Modal States
  const [sellingDevice, setSellingDevice] = useState<DeviceItem | null>(null);
  const [saleDate, setSaleDate] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [processingSale, setProcessingSale] = useState(false);
  const [saleType, setSaleType] = useState<'transfer' | 'cod' | 'installment' | 'cash' | 'exchange'>('transfer');
  const [depositAmount, setDepositAmount] = useState<number | string>(0);
  const [transferAmount, setTransferAmount] = useState<number | string>(0);
  const [codAmountInput, setCodAmountInput] = useState<number | string>(0);
  const [instMonths, setInstMonths] = useState<number>(4);
  const [instMonthlyPayment, setInstMonthlyPayment] = useState<number | string>(0);
  const [tradeInDeviceName, setTradeInDeviceName] = useState('');
  const [tradeInValue, setTradeInValue] = useState<number | string>(0);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [instNumber, setInstNumber] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(40.0);

  const calculatedFinalPrice = useMemo(() => {
    const dep = Number(depositAmount) || 0;
    if (saleType === 'transfer' || saleType === 'cash') {
      return dep + (Number(transferAmount) || 0);
    } else if (saleType === 'cod') {
      return dep + (Number(codAmountInput) || 0);
    } else if (saleType === 'installment') {
      return dep + (Number(instMonths) || 0) * (Number(instMonthlyPayment) || 0);
    } else if (saleType === 'exchange') {
      return dep + (Number(tradeInValue) || 0);
    }
    return 0;
  }, [saleType, depositAmount, transferAmount, codAmountInput, instMonths, instMonthlyPayment, tradeInValue]);

  useEffect(() => {
    if (!sellingDevice || saleType !== 'installment') return;
    const price = sellingDevice.selling_price || 0;
    if (price >= 5000 && price <= 40000) {
      const closest = getClosestPrice(price);
      const row = INTEREST_TABLE[closest];
      if (row) {
        const m = instMonths;
        if (m === 3 || m === 4 || m === 6 || m === 8 || m === 10) {
          setInstMonthlyPayment(row[m]);
          if (Number(depositAmount) === 0) {
            setDepositAmount(row.down);
          }
        }
      }
    }
  }, [instMonths, saleType, sellingDevice]);

  const getSaleDetailsLabel = useCallback((item: DeviceItem) => {
    const dep = item.deposit_amount || 0;
    const type = item.sale_type || 'transfer';
    if (type === 'transfer') {
      return `송금 완납${dep > 0 ? ` (보증금 ฿${formatPrice(dep)})` : ''}`;
    } else if (type === 'cash') {
      return `현금 완납${dep > 0 ? ` (보증금 ฿${formatPrice(dep)})` : ''}`;
    } else if (type === 'cod') {
      return `COD (보증금 ฿${formatPrice(dep)} / COD ฿${formatPrice(item.cod_amount || 0)})`;
    } else if (type === 'installment') {
      return `할부 (보증금 ฿${formatPrice(dep)} / ${item.installment_months}개월 x ฿${formatPrice(item.installment_amount || 0)})`;
    } else if (type === 'exchange') {
      return `기기 맞교환 (추가 수금 ฿${formatPrice(dep)})`;
    }
    return '-';
  }, []);

  const getPaymentStatusBadge = useCallback((status?: string) => {
    if (status === 'paid') {
      return <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--green)', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>완납</span>;
    } else if (status === 'unpaid') {
      return <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--red)', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>미수</span>;
    } else if (status === 'collecting') {
      return <span style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>할부중</span>;
    }
    return <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--green)', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>완납</span>;
  }, []);

  const getYearMonth = useCallback((dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    const parts = dateStr.split('.').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const year = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
      const month = parts[1].padStart(2, '0');
      return `${year}-${month}`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    } catch (e) {}
    return 'Unknown';
  }, []);

  const marginStats = useMemo(() => {
    // Only approved sold items are counted in margins!
    const soldList = devices.filter(d => !d.deleted_at && d.is_sold && d.is_approved);
    const totalPaidTHB = soldList.filter(d => d.payment_status === 'paid' || !d.payment_status).reduce((sum, d) => sum + Number(d.selling_price || 0), 0);
    const totalPaidCostKRW = soldList.filter(d => d.payment_status === 'paid' || !d.payment_status).reduce((sum, d) => sum + Number(d.purchase_cost_krw || 0), 0);
    const totalUnpaidCODTHB = soldList.filter(d => d.payment_status === 'unpaid').reduce((sum, d) => sum + Number(d.cod_amount || 0), 0);
    const activeInstallmentCount = soldList.filter(d => d.payment_status === 'collecting').length;
    const unpaidList = soldList.filter(d => d.payment_status === 'unpaid' || d.payment_status === 'collecting');
    
    return {
      totalPaidTHB,
      totalPaidCostKRW,
      totalUnpaidCODTHB,
      activeInstallmentCount,
      unpaidList,
      soldList
    };
  }, [devices]);

  const customerMonths = useMemo(() => {
    const months = new Set<string>();
    marginStats.soldList.forEach(item => {
      const ym = getYearMonth(item.sale_date);
      if (ym && ym !== 'Unknown') {
        months.add(ym);
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [marginStats.soldList, getYearMonth]);

  useEffect(() => {
    if (customerMonths.length > 0 && !selectedCustomerMonth) {
      setSelectedCustomerMonth(customerMonths[0]);
    }
  }, [customerMonths, selectedCustomerMonth]);

  const filteredCustomersForMonth = useMemo(() => {
    if (!selectedCustomerMonth) return [];
    return marginStats.soldList.filter(item => getYearMonth(item.sale_date) === selectedCustomerMonth);
  }, [marginStats.soldList, selectedCustomerMonth, getYearMonth]);

  const handleCopyCustomerList = () => {
    if (filteredCustomersForMonth.length === 0) {
      showToast('복사할 고객 내역이 없습니다. (No customer records to copy.)', 'info');
      return;
    }
    const textLines = [
      `[${selectedCustomerMonth || '전체'}] 고객 연락처 및 수납 대장`,
      `==========================================`
    ];
    filteredCustomersForMonth.forEach((item, idx) => {
      const name = item.customer_name || '미기입';
      const phone = item.customer_phone || '미기입';
      const model = item.model_name || '미기입';
      const status = item.payment_status === 'paid' ? '완납' : item.payment_status === 'collecting' ? '할부중' : '미수';
      const balance = item.payment_status === 'unpaid' ? `฿${formatPrice(item.cod_amount || 0)}` : item.payment_status === 'collecting' ? `฿${formatPrice((item.installment_months || 0) * (item.installment_amount || 0))}` : '฿0';
      textLines.push(`${idx + 1}. ${name} (${phone}) - ${model} - 상태: ${status} - 미수: ${balance} - 담당: ${item.seller_name || '미지정'}`);
    });
    navigator.clipboard.writeText(textLines.join('\n'));
    showToast('고객 연락처 리스트가 클립보드에 복사되었습니다. (Customer directory copied to clipboard.)', 'success');
  };

  const handleConfirmPayment = async (deviceId: string) => {
    if (!confirm('해당 건의 입금을 확인하셨습니까?\n(Has the deposit/payment for this item been confirmed?)')) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          payment_status: 'paid'
        })
        .eq('id', deviceId);

      if (error) throw error;
      showToast('입금 확인이 완료되었습니다. (Payment confirmed successfully.)', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('입금 확인 실패: ' + err.message, 'error');
    }
  };

  const handleCancelPayment = async (deviceId: string, saleType?: string) => {
    if (!confirm('해당 건의 완납 처리를 취소하고 미수/할부 상태로 되돌리시겠습니까?\n(Do you want to cancel the payment completion for this item?)')) return;
    try {
      const targetStatus = saleType === 'installment' ? 'collecting' : 'unpaid';
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          payment_status: targetStatus
        })
        .eq('id', deviceId);

      if (error) throw error;
      showToast('완납 취소가 완료되었습니다. (Payment cancelled successfully.)', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('완납 취소 실패: ' + err.message, 'error');
    }
  };

  // Edit Modal States
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);

  // Inline Edit States
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'sticker' | 'site_date' | 'model_name' | 'imei' | 'color' | 'battery_pct' | 'purchase_cost_krw' | 'selling_price' | 'stock_location' | 'notes' | 'customer_name' | 'customer_phone' | 'installment_number' } | null>(null);
  const [editCellValue, setEditCellValue] = useState<string>('');

  // Toast Alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch Naver Exchange Rate on mount (THB to KRW)
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/THB');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates && data.rates.KRW) {
            setExchangeRate(Number(data.rates.KRW.toFixed(2)));
          }
        }
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
      }
    };
    fetchExchangeRate();
  }, []);

  // 1. Auth Guard Checklist
  useEffect(() => {
    const checkStaffAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAuthorized(false);
          setLoadingAuth(false);
          return;
        }

        const { data: p, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !p) {
          setIsAuthorized(false);
          setLoadingAuth(false);
          return;
        }

        // Allow Admin, Manager, or Staff (Direct Store Sellers are blocked from this dashboard)
        const hasAccess = 
          p.role === 'admin' || 
          p.role === 'manager' || 
          p.role === 'staff';

        if (!hasAccess) {
          setIsAuthorized(false);
        } else {
          setStaffProfile(p);
          setIsAuthorized(true);
        }
      } catch (e) {
        console.error(e);
        setIsAuthorized(false);
      } finally {
        setLoadingAuth(false);
      }
    };
    checkStaffAuth();
  }, []);

  // Redirect unauthorized users
  useEffect(() => {
    if (isAuthorized === false) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            router.push('/');
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isAuthorized, router]);

  // 2. Fetch Ledger Data
  const loadLedgerData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('sheets_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (err: any) {
      console.error(err);
      showToast(t('error_occurred') + err.message, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [isAuthorized, showToast, t]);

  const fetchNextInstallmentNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('sheets_inventory')
        .select('installment_number')
        .not('installment_number', 'is', null)
        .order('installment_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].installment_number) {
        const lastNumStr = data[0].installment_number;
        const match = lastNumStr.match(/IRIS(\d+)/i);
        if (match) {
          const nextNum = parseInt(match[1]) + 1;
          const padded = String(nextNum).padStart(6, '0');
          return `IRIS${padded}`;
        }
      }
      return 'IRIS000001';
    } catch (err) {
      console.error('Error fetching next installment number:', err);
      return 'IRIS000001';
    }
  };

  useEffect(() => {
    if (saleType === 'installment' && sellingDevice && !instNumber) {
      const initNextInstNo = async () => {
        const nextNo = await fetchNextInstallmentNumber();
        const numPart = nextNo.replace(/IRIS/i, '');
        setInstNumber(numPart);
      };
      initNextInstNo();
    }
  }, [saleType, sellingDevice, instNumber]);

  const loadSettingsData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingSettings(true);
    try {
      const [locsRes, modsRes, staffRes] = await Promise.all([
        supabase.from('settings_locations').select('*').order('name', { ascending: true }),
        supabase.from('settings_models').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('id, name, store_name').in('role', ['admin', 'staff', 'seller']).order('name', { ascending: true })
      ]);
      if (locsRes.error) throw locsRes.error;
      if (modsRes.error) throw modsRes.error;
      if (staffRes.error) throw staffRes.error;
      setLocations(locsRes.data || []);
      setModels(modsRes.data || []);

      const members = (staffRes.data || []).map(p => ({
        id: p.id,
        name: p.name || p.store_name || 'Unnamed Staff'
      })).filter(m => m.name);
      setStaffMembers(members);
    } catch (err) {
      console.error('Error loading settings lookup:', err);
    } finally {
      setLoadingSettings(false);
    }
  }, [isAuthorized]);

  const purgeOldTrash = useCallback(async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { error } = await supabase
        .from('sheets_inventory')
        .delete()
        .not('deleted_at', 'is', null)
        .lt('deleted_at', oneWeekAgo.toISOString());
        
      if (error) console.error('Purging trash error:', error);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      purgeOldTrash().then(() => {
        loadLedgerData();
        loadSettingsData();
      });
    }
  }, [isAuthorized, loadLedgerData, loadSettingsData, purgeOldTrash]);

  // Model & Location options helper with dynamic temp additions for selected device edits
  const modelOptions = useMemo(() => {
    const opts = [...models];
    if (editingDevice && editingDevice.model_name) {
      const exists = models.some(m => m.name === editingDevice.model_name);
      if (!exists) {
        opts.push({ id: 'temp-mod', name: editingDevice.model_name });
      }
    }
    return opts;
  }, [models, editingDevice]);

  const locationOptions = useMemo(() => {
    const opts = [...locations];
    if (editingDevice && editingDevice.stock_location) {
      const exists = locations.some(l => l.name === editingDevice.stock_location);
      if (!exists) {
        opts.push({ id: 'temp-loc', name: editingDevice.stock_location });
      }
    }
    return opts;
  }, [locations, editingDevice]);

  // Dropdown helper functions
  const handleModelSelectChange = (val: string) => {
    if (val === '___new___') {
      setIsCustomModel(true);
      setModelName('');
    } else {
      setIsCustomModel(false);
      setModelName(val);
    }
  };

  const handleLocationSelectChange = (val: string) => {
    if (val === '___new___') {
      setIsCustomLocation(true);
      setLocation('');
    } else {
      setIsCustomLocation(false);
      setLocation(val);
    }
  };

  // Rename & Delete Settings Handlers
  const handleRenameLocation = async (oldName: string) => {
    const newName = prompt(t('staff_prompt_rename_location', { oldName }), oldName);
    if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
    
    setLoadingSettings(true);
    try {
      const { error: updateErr } = await supabase
        .from('settings_locations')
        .update({ name: newName.trim() })
        .eq('name', oldName);
      if (updateErr) throw updateErr;

      const { error: cascadeErr } = await supabase
        .from('sheets_inventory')
        .update({ stock_location: newName.trim() })
        .eq('stock_location', oldName);
      if (cascadeErr) throw cascadeErr;

      showToast(t('toast_rename_location_success', { oldName, newName: newName.trim() }), 'success');
      await Promise.all([loadSettingsData(), loadLedgerData()]);
    } catch (err: any) {
      showToast(t('toast_rename_location_failed') + err.message, 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleDeleteLocation = async (name: string) => {
    if (!confirm(t('toast_confirm_delete_location', { name }))) return;
    
    setLoadingSettings(true);
    try {
      const { error } = await supabase
        .from('settings_locations')
        .delete()
        .eq('name', name);
      if (error) throw error;
      showToast(t('toast_location_deleted', { name }), 'success');
      await loadSettingsData();
    } catch (err: any) {
      showToast(t('toast_delete_location_failed') + err.message, 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleRenameModel = async (oldName: string) => {
    const newName = prompt(t('staff_prompt_rename_model', { oldName }), oldName);
    if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
    
    setLoadingSettings(true);
    try {
      const { error: updateErr } = await supabase
        .from('settings_models')
        .update({ name: newName.trim() })
        .eq('name', oldName);
      if (updateErr) throw updateErr;

      const { error: cascadeErr } = await supabase
        .from('sheets_inventory')
        .update({ model_name: newName.trim() })
        .eq('model_name', oldName);
      if (cascadeErr) throw cascadeErr;

      showToast(t('toast_rename_model_success', { oldName, newName: newName.trim() }), 'success');
      await Promise.all([loadSettingsData(), loadLedgerData()]);
    } catch (err: any) {
      showToast(t('toast_rename_model_failed') + err.message, 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleDeleteModel = async (name: string) => {
    if (!confirm(t('toast_confirm_delete_model', { name }))) return;
    
    setLoadingSettings(true);
    try {
      const { error } = await supabase
        .from('settings_models')
        .delete()
        .eq('name', name);
      if (error) throw error;
      showToast(t('toast_model_deleted', { name }), 'success');
      await loadSettingsData();
    } catch (err: any) {
      showToast(t('toast_delete_model_failed') + err.message, 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleAddLocationFromSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocInput.trim()) return;
    try {
      const { error } = await supabase
        .from('settings_locations')
        .insert({ name: newLocInput.trim() });
      if (error) throw error;
      showToast(t('toast_add_location_success'), 'success');
      setNewLocInput('');
      await loadSettingsData();
    } catch (err: any) {
      showToast(t('toast_add_location_failed') + err.message, 'error');
    }
  };

  const handleAddModelFromSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModInput.trim()) return;
    try {
      const { error } = await supabase
        .from('settings_models')
        .insert({ name: newModInput.trim() });
      if (error) throw error;
      showToast(t('toast_add_model_success'), 'success');
      setNewModInput('');
      await loadSettingsData();
    } catch (err: any) {
      showToast(t('toast_add_model_failed') + err.message, 'error');
    }
  };

  // Sorting Helper
  const sortDevices = useCallback((list: DeviceItem[]) => {
    return [...list].sort((a, b) => {
      let valA: any = a[sortField as keyof DeviceItem];
      let valB: any = b[sortField as keyof DeviceItem];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      const isNumA = typeof valA === 'number';
      const isNumB = typeof valB === 'number';

      if (isNumA && isNumB) {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      return sortDirection === 'asc'
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [sortField, sortDirection]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 3. Stats Calculations
  const stats = useMemo(() => {
    const activeStock = devices.filter(d => !d.deleted_at && !d.is_sold && d.stock_location !== 'DHL');
    const pendingIntake = devices.filter(d => !d.deleted_at && !d.is_sold && d.stock_location === 'DHL');
    const soldList = devices.filter(d => !d.deleted_at && d.is_sold);

    const totalStockCount = activeStock.length;
    const pendingIntakeCount = pendingIntake.length;
    const pendingIntakeCostKRW = pendingIntake.reduce((sum, d) => sum + Number(d.purchase_cost_krw || 0), 0);
    const reservedCount = activeStock.filter(d => d.is_reserved).length;
    const totalPurchaseCostKRW = activeStock.reduce((sum, d) => sum + Number(d.purchase_cost_krw || 0), 0);
    const totalSellingValueTHB = activeStock.reduce((sum, d) => sum + Number(d.selling_price || 0), 0);

    const totalSoldCount = soldList.length;
    const totalSoldRevenueTHB = soldList.reduce((sum, d) => sum + Number(d.selling_price || 0), 0);

    // Location distribution
    const locationCounts: Record<string, number> = {};
    activeStock.forEach(d => {
      const loc = d.stock_location || 'Shop';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    // Subset for models filtered by location
    const activeStockForModels = selectedStatsLocation === 'all'
      ? activeStock
      : activeStock.filter(d => (d.stock_location || 'Shop') === selectedStatsLocation);

    const totalStockCountForModels = activeStockForModels.length;

    // Model group distribution (iPhone vs Galaxy vs Other)
    let iphoneCount = 0;
    let galaxyCount = 0;
    let otherCount = 0;

    // Detailed model series counts
    const seriesCounts: Record<string, number> = {
      'iPhone 16': 0,
      'iPhone 15': 0,
      'iPhone 14': 0,
      'iPhone 13': 0,
      'iPhone 12': 0,
      'iPhone 11': 0,
      'iPhone 기타': 0,
      'Galaxy S24': 0,
      'Galaxy S23': 0,
      'Galaxy S22': 0,
      'Galaxy Fold': 0,
      'Galaxy Flip': 0,
      'Galaxy 기타': 0,
      'Vivo': 0,
      'Oppo': 0,
      'Huawei': 0,
      '기타 브랜드': 0,
    };

    // Top individual models
    const individualModelCounts: Record<string, number> = {};

    activeStockForModels.forEach(d => {
      const name = d.model_name.toLowerCase();
      individualModelCounts[d.model_name] = (individualModelCounts[d.model_name] || 0) + 1;

      if ((name.includes('iphone') || name.includes('aip') || name.includes('ip') || name.includes('아이폰')) && !name.includes('ipad')) {
        iphoneCount++;
        if (name.includes('16')) seriesCounts['iPhone 16']++;
        else if (name.includes('15')) seriesCounts['iPhone 15']++;
        else if (name.includes('14')) seriesCounts['iPhone 14']++;
        else if (name.includes('13')) seriesCounts['iPhone 13']++;
        else if (name.includes('12')) seriesCounts['iPhone 12']++;
        else if (name.includes('11')) seriesCounts['iPhone 11']++;
        else seriesCounts['iPhone 기타']++;
      } else if (name.includes('galaxy') || name.includes('sec') || name.includes('갤') || name.includes('s2') || name.includes('s3') || name.includes('s4') || name.includes('flip') || name.includes('fold')) {
        galaxyCount++;
        if (name.includes('24')) seriesCounts['Galaxy S24']++;
        else if (name.includes('23')) seriesCounts['Galaxy S23']++;
        else if (name.includes('22')) seriesCounts['Galaxy S22']++;
        else if (name.includes('fold')) seriesCounts['Galaxy Fold']++;
        else if (name.includes('flip')) seriesCounts['Galaxy Flip']++;
        else seriesCounts['Galaxy 기타']++;
      } else if (name.includes('vivo')) {
        seriesCounts['Vivo']++;
        otherCount++;
      } else if (name.includes('oppo')) {
        seriesCounts['Oppo']++;
        otherCount++;
      } else if (name.includes('huawei')) {
        seriesCounts['Huawei']++;
        otherCount++;
      } else {
        seriesCounts['기타 브랜드']++;
        otherCount++;
      }
    });

    const topIndividualModels = Object.entries(individualModelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Get top 15 exact models

    return {
      totalStockCount,
      totalStockCountForModels,
      pendingIntakeCount,
      pendingIntakeCostKRW,
      reservedCount,
      totalPurchaseCostKRW,
      totalSellingValueTHB,
      totalSoldCount,
      totalSoldRevenueTHB,
      locationCounts,
      iphoneCount,
      galaxyCount,
      otherCount,
      seriesCounts,
      topIndividualModels
    };
  }, [devices, selectedStatsLocation]);

  // Model Name Normalization helper to support searching 'AIP' models with 'iPhone' queries.
  const normalizeModelName = useCallback((str: string) => {
    if (!str) return '';
    let res = str.toLowerCase().trim();
    if (res.includes('ipad')) {
      return res.replace(/\s+/g, '');
    }
    res = res.replace(/iphone|aip|(?<!fl)ip|아이폰/g, 'iphone');
    res = res.replace(/galaxy|sec|갤럭시|갤/g, 'galaxy');
    res = res.replace(/other|기타|기타브랜드/g, 'other');
    res = res.replace(/\s+/g, '');

    if (res.includes('iphone')) {
      if (!res.startsWith('iphone')) {
        res = 'iphone' + res;
      }
    } else if (res.includes('galaxy') || res.includes('s2') || res.includes('s3') || res.includes('s4') || res.includes('flip') || res.includes('fold')) {
      if (!res.startsWith('galaxy')) {
        res = 'galaxy' + res.replace('galaxy', '');
      }
    } else {
      if (!res.startsWith('other')) {
        res = 'other' + res;
      }
    }
    return res;
  }, []);

  // categoryFilter를 제외한 검색/위치 필터만 적용된 기기 목록의 길이 (Ledger & Sales)
  const baseActiveDevicesCount = useMemo(() => {
    return devices.filter(d => {
      if (d.deleted_at || d.is_sold || d.stock_location === 'DHL') return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
      return matchSearch && matchLoc;
    }).length;
  }, [devices, searchQuery, locationFilter, normalizeModelName]);

  const basePendingDevicesCount = useMemo(() => {
    return devices.filter(d => {
      if (d.deleted_at || d.is_sold || d.stock_location !== 'DHL') return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    }).length;
  }, [devices, searchQuery, normalizeModelName]);

  const baseSoldDevicesCount = useMemo(() => {
    const getSaleDay = (saleDateStr?: string): number | null => {
      if (!saleDateStr) return null;
      const parts = saleDateStr.split('.').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        return parseInt(parts[2], 10) || null;
      }
      return null;
    };

    return devices.filter(d => {
      if (d.deleted_at || !d.is_sold) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(soldSearchQuery)) || 
                          (d.imei && d.imei.includes(soldSearchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(soldSearchQuery.toLowerCase()));
      
      let matchDay = true;
      if (soldSelectedDays.length > 0) {
        const day = getSaleDay(d.sale_date);
        matchDay = day !== null && soldSelectedDays.includes(day);
      }

      return matchSearch && matchDay;
    }).length;
  }, [devices, soldSearchQuery, soldSelectedDays, normalizeModelName]);

  // Extract unique models present in current tab's scope (active vs sold vs pending) based on active search/location filters
  const uniqueModels = useMemo(() => {
    const activeStock = devices.filter(d => {
      if (d.deleted_at || d.is_sold || d.stock_location === 'DHL') return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
      return matchSearch && matchLoc;
    });

    const pendingStock = devices.filter(d => {
      if (d.deleted_at || d.is_sold || d.stock_location !== 'DHL') return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });

    const soldList = devices.filter(d => {
      if (d.deleted_at || !d.is_sold) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(soldSearchQuery)) || 
                          (d.imei && d.imei.includes(soldSearchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(soldSearchQuery.toLowerCase()));
      
      let matchDay = true;
      if (soldSelectedDays.length > 0) {
        const getSaleDay = (saleDateStr?: string): number | null => {
          if (!saleDateStr) return null;
          const parts = saleDateStr.split('.').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 3) {
            return parseInt(parts[2], 10) || null;
          }
          return null;
        };
        const day = getSaleDay(d.sale_date);
        matchDay = day !== null && soldSelectedDays.includes(day);
      }
      return matchSearch && matchDay;
    });

    const activeModelMap: Record<string, number> = {};
    activeStock.forEach(d => {
      if (d.model_name) {
        activeModelMap[d.model_name] = (activeModelMap[d.model_name] || 0) + 1;
      }
    });

    const pendingModelMap: Record<string, number> = {};
    pendingStock.forEach(d => {
      if (d.model_name) {
        pendingModelMap[d.model_name] = (pendingModelMap[d.model_name] || 0) + 1;
      }
    });

    const soldModelMap: Record<string, number> = {};
    soldList.forEach(d => {
      if (d.model_name) {
        soldModelMap[d.model_name] = (soldModelMap[d.model_name] || 0) + 1;
      }
    });

    const sortFn = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });

    return {
      active: Object.entries(activeModelMap).sort(sortFn),
      pending: Object.entries(pendingModelMap).sort(sortFn),
      sold: Object.entries(soldModelMap).sort(sortFn)
    };
  }, [devices, searchQuery, soldSearchQuery, locationFilter, normalizeModelName, soldSelectedDays]);

  // Helper to check category
  const matchesCategory = useCallback((modelName: string, filter: string) => {
    if (filter === 'all') return true;
    return modelName === filter;
  }, []);

  // Filtered lists
  const filteredActiveDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (d.deleted_at || d.is_sold || d.stock_location === 'DHL') return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
      const matchCat = matchesCategory(d.model_name, categoryFilter);
      return matchSearch && matchLoc && matchCat;
    });

    // Pin reserved items to the very top, sorted.
    const reserved = list.filter(d => d.is_reserved);
    const normal = list.filter(d => !d.is_reserved);

    return [...sortDevices(reserved), ...sortDevices(normal)];
  }, [devices, searchQuery, locationFilter, categoryFilter, matchesCategory, sortDevices, normalizeModelName]);

  const filteredActiveDevicesPurchaseCost = useMemo(() => {
    return filteredActiveDevices.reduce((sum, d) => sum + Number(d.purchase_cost_krw || 0), 0);
  }, [filteredActiveDevices]);

  // Filtered list for Pending Intake
  const filteredPendingDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (d.deleted_at || d.is_sold || d.stock_location !== 'DHL') return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = matchesCategory(d.model_name, categoryFilter);
      return matchSearch && matchCat;
    });
    return sortDevices(list);
  }, [devices, searchQuery, categoryFilter, matchesCategory, sortDevices, normalizeModelName]);

  const filteredPendingDevicesPurchaseCost = useMemo(() => {
    return filteredPendingDevices.reduce((sum, d) => sum + Number(d.purchase_cost_krw || 0), 0);
  }, [filteredPendingDevices]);

  const filteredSoldDevices = useMemo(() => {
    const getSaleDay = (saleDateStr?: string): number | null => {
      if (!saleDateStr) return null;
      const parts = saleDateStr.split('.').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        return parseInt(parts[2], 10) || null;
      }
      return null;
    };

    const list = devices.filter(d => {
      if (d.deleted_at || !d.is_sold) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(soldSearchQuery)) || 
                          (d.imei && d.imei.includes(soldSearchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(soldSearchQuery.toLowerCase()));
      const matchCat = matchesCategory(d.model_name, categoryFilter);

      let matchDay = true;
      if (soldSelectedDays.length > 0) {
        const day = getSaleDay(d.sale_date);
        matchDay = day !== null && soldSelectedDays.includes(day);
      }

      return matchSearch && matchCat && matchDay;
    });
    return sortDevices(list);
  }, [devices, soldSearchQuery, categoryFilter, soldSelectedDays, matchesCategory, sortDevices, normalizeModelName]);

  const filteredTrashDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (!d.deleted_at) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(trashSearchQuery)) || 
                          (d.imei && d.imei.includes(trashSearchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(trashSearchQuery.toLowerCase()));
      return matchSearch;
    });
    return sortDevices(list);
  }, [devices, trashSearchQuery, sortDevices, normalizeModelName]);

  // IMEI Auditor Results calculation
  const auditResults = useMemo(() => {
    if (!auditText.trim()) {
      return {
        notInInventory: [],
        missingFromPasted: [],
        matchedDevices: []
      };
    }

    // Active stock only: !deleted_at && !is_sold && stock_location !== 'DHL'
    const activeDevices = devices.filter(d => !d.deleted_at && !d.is_sold && d.stock_location !== 'DHL');
    const activeImeiMap = new Map<string, typeof activeDevices[0]>();
    activeDevices.forEach(d => {
      if (d.imei) {
        activeImeiMap.set(d.imei.trim(), d);
      }
    });

    // Parse pasted IMEIs (split by whitespace/newline/comma/semicolon)
    const parsedIMEIs = auditText
      .split(/[\s,;\n\r]+/)
      .map(v => v.trim())
      .filter(Boolean);

    // Get unique list of pasted IMEIs
    const uniquePastedIMEIs = Array.from(new Set(parsedIMEIs));

    // 1. Pasted IMEIs not in active inventory
    const notInInventory = uniquePastedIMEIs
      .map(imei => {
        const matchingActive = activeImeiMap.get(imei);
        if (matchingActive) return null; // it is in active stock

        // Find if this IMEI exists anywhere else in our DB (sold, pending/DHL, deleted)
        const found = devices.find(d => d.imei?.trim() === imei);
        let status = '미등록 (신규 기기)';
        let badgeColor = '#64748b'; // slate/gray
        let deviceDetail = '';

        if (found) {
          if (found.deleted_at) {
            status = '휴지통에 있음';
            badgeColor = '#ef4444'; // red
            deviceDetail = ` [${found.model_name || ''}]`;
          } else if (found.is_sold) {
            status = `판매 완료됨 (${found.sale_date || ''})`;
            badgeColor = '#10b981'; // green
            deviceDetail = ` [${found.model_name || ''}]`;
          } else if (found.stock_location === 'DHL') {
            status = '입고 대기 중 (DHL)';
            badgeColor = '#d97706'; // yellow/orange
            deviceDetail = ` [${found.model_name || ''}]`;
          } else {
            status = '매칭 불가/기타 상태';
            deviceDetail = ` [${found.model_name || ''}]`;
          }
        }

        return {
          imei,
          status,
          badgeColor,
          deviceDetail
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 2. Active inventory devices not in pasted list
    const pastedImeiSet = new Set(uniquePastedIMEIs);
    const missingFromPasted = activeDevices.filter(d => !d.imei || !pastedImeiSet.has(d.imei.trim()));

    // 3. Matched devices
    const matchedDevices = activeDevices.filter(d => d.imei && pastedImeiSet.has(d.imei.trim()));

    return {
      notInInventory,
      missingFromPasted,
      matchedDevices
    };
  }, [devices, auditText]);

  // 4. CSV File Parsing Helper
  function parseCSV(text: string): string[][] {
    const results: string[][] = [];
    let currentRecord: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRecord.push(currentField);
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRecord.push(currentField);
        results.push(currentRecord);
        currentRecord = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    if (currentField || currentRecord.length > 0) {
      currentRecord.push(currentField);
      results.push(currentRecord);
    }
    return results;
  }

  // 5. Bulk CSV Upload Handler
  const handleCSVImport = async () => {
    if (!csvFileText.trim()) {
      showToast('❌ Please load or paste CSV content first.', 'error');
      return;
    }

    setImportingCSV(true);
    try {
      const rows = parseCSV(csvFileText.trim());
      if (rows.length < 2) {
        showToast('❌ The CSV file contains no data rows.', 'error');
        setImportingCSV(false);
        return;
      }

      // Detect header row by scanning the first few rows for IMEI column
      let headerRowIdx = 0;
      for (let r = 0; r < Math.min(rows.length, 6); r++) {
        const row = rows[r];
        const hasImei = row.some(cell => cell && cell.toLowerCase().replace(/\s+/g, '').includes('imei'));
        if (hasImei) {
          headerRowIdx = r;
          break;
        }
      }

      const headerRow = rows[headerRowIdx];

      // Default indices mapping (fallbacks)
      let siteDateIdx = -1;
      let saleDateIdx = -1;
      let stickerIdx = -1;
      let modelIdx = -1;
      let imeiIdx = -1;
      let colorIdx = -1;
      let isSoldIdx = -1;
      let locationIdx = -1;
      let batteryIdx = -1;
      let sellerIdx = -1;
      let notesIdx = -1;
      let sellingPriceIdx = -1;
      let marketPriceIdx = -1;
      let purchaseCostIdx = -1;

      // First pass for exact or strong matches
      headerRow.forEach((cell, idx) => {
        const clean = cell.toLowerCase().replace(/\s+/g, '');
        if (clean.includes('입고날짜') || clean.includes('sitedate') || (clean.includes('date') && clean.includes('site'))) {
          siteDateIdx = idx;
        } else if (clean.includes('판매날짜') || clean.includes('saledate') || (clean.includes('date') && clean.includes('sale'))) {
          saleDateIdx = idx;
        } else if (clean.includes('스티커') || clean.includes('sticker') || clean.includes('serial')) {
          stickerIdx = idx;
        } else if (clean.includes('modelname') || clean.includes('모델명') || (clean.includes('model') && !clean.includes('price'))) {
          modelIdx = idx;
        } else if (clean === 'imei' || clean.includes('imei')) {
          imeiIdx = idx;
        } else if (clean.includes('color') || clean.includes('색상')) {
          colorIdx = idx;
        } else if (clean.includes('ขายแล้ว') || clean.includes('issold') || clean.includes('판매여부')) {
          isSoldIdx = idx;
        } else if (clean.includes('location') || clean.includes('stocklocation') || clean.includes('위치')) {
          locationIdx = idx;
        } else if (clean.includes('battery') || clean.includes('배터리')) {
          batteryIdx = idx;
        } else if (clean.includes('คนขาย') || clean.includes('seller') || clean.includes('판매자') || clean.includes('판매사원')) {
          sellerIdx = idx;
        } else if (clean.includes('notes') || clean.includes('note') || clean.includes('비고')) {
          notesIdx = idx;
        } else if (clean.includes('매입원가') || clean.includes('매입') || clean.includes('입고금액') || clean.includes('입고가') || clean.includes('purchasecost') || (clean.includes('cost') && clean.includes('krw'))) {
          purchaseCostIdx = idx;
        } else if (clean.includes('selligprice(b+') || (clean.includes('sellingprice') && !clean.includes('도매') && !clean.includes('마진'))) {
          sellingPriceIdx = idx;
        } else if (clean.includes('marketprice') || clean === 'market' || (clean.includes('market') && !clean.includes('cost'))) {
          marketPriceIdx = idx;
        }
      });

      // Second pass for looser matches
      headerRow.forEach((cell, idx) => {
        const clean = cell.toLowerCase().replace(/\s+/g, '');
        if (sellingPriceIdx === -1 && (clean === 'price' || clean.includes('sellingprice') || clean.includes('판매가') || clean.includes('소매가'))) {
          sellingPriceIdx = idx;
        }
        if (marketPriceIdx === -1 && (clean.includes('도매가격') || (clean.includes('도매') && !clean.includes('마진') && !clean.includes('수수료')))) {
          marketPriceIdx = idx;
        }
      });

      // Fallbacks
      if (siteDateIdx === -1) siteDateIdx = 0;
      if (saleDateIdx === -1) saleDateIdx = 1;
      if (stickerIdx === -1) stickerIdx = 3;
      if (modelIdx === -1) modelIdx = 4;
      if (imeiIdx === -1) imeiIdx = 5;
      if (colorIdx === -1) colorIdx = 6;
      if (isSoldIdx === -1) isSoldIdx = 7;
      if (locationIdx === -1) locationIdx = 8;
      if (batteryIdx === -1) batteryIdx = 9;
      if (sellerIdx === -1) sellerIdx = 10;
      if (notesIdx === -1) notesIdx = 11;
      if (sellingPriceIdx === -1) sellingPriceIdx = 15;
      if (marketPriceIdx === -1) marketPriceIdx = 16;
      if (purchaseCostIdx === -1) purchaseCostIdx = 18;

      // Fetch existing DB records to prevent overwriting sold status or reviving deleted items
      const { data: existingDB } = await supabase
        .from('sheets_inventory')
        .select('*');
      
      const dbMap = new Map<string, any>();
      if (existingDB) {
        existingDB.forEach(d => {
          if (d.imei) dbMap.set(d.imei.trim(), d);
        });
      }

      const recordsToInsert = [];
      const nowString = new Date().toISOString();

      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length <= imeiIdx) continue;

        // Filter: only load rows that have sticker data
        const stickerNo = row[stickerIdx] ? row[stickerIdx].trim() : '';
        if (!stickerNo) {
          continue;
        }

        // Skip rows with no valid IMEI
        let rawImei = row[imeiIdx] ? row[imeiIdx].trim().replace(/\s+/g, '') : '';
        if (!rawImei && stickerNo) {
          rawImei = stickerNo.replace(/\s+/g, '');
        }

        if (!rawImei || rawImei.toLowerCase() === 'imei' || rawImei.toLowerCase() === 'imei/serial' || rawImei.length < 4) {
          continue;
        }

        const model = row[modelIdx] ? row[modelIdx].trim() : '';
        const colorVal = row[colorIdx] ? row[colorIdx].trim() : '';
        const isSoldStr = row[isSoldIdx] ? row[isSoldIdx].trim().toUpperCase() : 'FALSE';
        const soldFlag = isSoldStr === 'TRUE' || isSoldStr === 'YES' || isSoldStr === '예' || isSoldStr === '1';
        const loc = row[locationIdx] ? row[locationIdx].trim() : 'Shop';
        const battery = row[batteryIdx] ? row[batteryIdx].trim() : '100';
        const seller = row[sellerIdx] ? row[sellerIdx].trim() : '';
        const note = row[notesIdx] ? row[notesIdx].trim() : '';

        const sellingPriceStr = row[sellingPriceIdx] ? row[sellingPriceIdx].trim() : '0';
        const sellingPriceVal = parseInt(sellingPriceStr.replace(/[^\d]/g, '')) || 0;

        const marketPriceStr = row[marketPriceIdx] ? row[marketPriceIdx].trim() : '0';
        const marketPriceVal = parseInt(marketPriceStr.replace(/[^\d]/g, '')) || 0;

        const purchaseCostStr = row[purchaseCostIdx] ? row[purchaseCostIdx].trim() : '0';
        const purchaseCostVal = parseInt(purchaseCostStr.replace(/[^\d]/g, '')) || 0;

        const saleD = row[saleDateIdx] ? row[saleDateIdx].trim() : '';
        const siteD = row[siteDateIdx] ? row[siteDateIdx].trim() : '';

        const rawImeiTrimmed = rawImei.trim();
        const existing = dbMap.get(rawImeiTrimmed);

        const newRecord: any = {
          site_date: siteD,
          sale_date: saleD,
          sticker: stickerNo,
          model_name: model,
          imei: rawImei,
          color: colorVal,
          is_sold: soldFlag,
          stock_location: loc,
          battery_pct: battery,
          seller_name: seller,
          notes: note,
          selling_price: sellingPriceVal,
          market_price: marketPriceVal,
          purchase_cost_krw: purchaseCostVal,
          deleted_at: null, // Restored on manual CSV import
          created_at: nowString
        };

        if (existing) {
          if (existing.is_sold) {
            newRecord.is_sold = true;
            newRecord.sale_date = existing.sale_date;
            newRecord.seller_name = existing.seller_name;
            newRecord.notes = existing.notes;
            newRecord.selling_price = existing.selling_price;
            newRecord.sale_type = existing.sale_type;
            newRecord.deposit_amount = existing.deposit_amount;
            newRecord.cod_amount = existing.cod_amount;
            newRecord.installment_months = existing.installment_months;
            newRecord.installment_amount = existing.installment_amount;
            newRecord.payment_status = existing.payment_status;
            newRecord.customer_name = existing.customer_name;
            newRecord.customer_phone = existing.customer_phone;
            newRecord.installment_number = existing.installment_number;
            newRecord.installment_history = existing.installment_history;
          }
        }

        recordsToInsert.push(newRecord);
      }

      if (recordsToInsert.length === 0) {
        showToast('❌ No valid device rows found to import.', 'error');
        setImportingCSV(false);
        return;
      }

      // Upsert batch to database
      const { error } = await supabase
        .from('sheets_inventory')
        .upsert(recordsToInsert, { onConflict: 'imei' });

      if (error) throw error;

      showToast(`✅ Successfully imported ${recordsToInsert.length} devices!`, 'success');
      setIsCSVModalOpen(false);
      setCsvFileText('');
      loadLedgerData();
    } catch (err: any) {
      console.error(err);
      showToast('❌ Import error: ' + err.message, 'error');
    } finally {
      setImportingCSV(false);
    }
  };

  // Live Sync from Google Sheets API
  const handleLiveSync = async () => {
    setImportingCSV(true);
    try {
      const res = await fetch(`/api/inventory?all=true&t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to fetch live sheet data');
      const items = await res.json();
      if (items.error) throw new Error(items.error);

      // Fetch existing DB records to prevent overwriting sold status or reviving deleted items
      const { data: existingDB } = await supabase
        .from('sheets_inventory')
        .select('*');
      
      const dbMap = new Map<string, any>();
      if (existingDB) {
        existingDB.forEach(d => {
          if (d.imei) dbMap.set(d.imei.trim(), d);
        });
      }

      // Map incoming keys to DB columns
      const records = items.map((x: any) => {
        const rawImei = x.imei ? String(x.imei).trim() : '';
        const existing = dbMap.get(rawImei);

        const baseRecord: any = {
          sticker: x.serialNo || null,
          model_name: x.model,
          imei: rawImei,
          color: x.color || null,
          is_sold: x.isSold,
          stock_location: x.location || 'Shop',
          battery_pct: x.battery || '100',
          seller_name: x.seller || null,
          notes: x.notes || null,
          selling_price: x.price || 0,
          market_price: x.marketPrice || 0,
          purchase_cost_krw: x.purchaseCost || 0,
          site_date: x.siteDate || null,
          sale_date: x.saleDate || null,
          deleted_at: null
        };

        if (existing) {
          // If already sold in DB, preserve all sale related details to prevent rollback
          if (existing.is_sold) {
            baseRecord.is_sold = true;
            baseRecord.sale_date = existing.sale_date;
            baseRecord.seller_name = existing.seller_name;
            baseRecord.notes = existing.notes;
            baseRecord.selling_price = existing.selling_price;
            baseRecord.sale_type = existing.sale_type;
            baseRecord.deposit_amount = existing.deposit_amount;
            baseRecord.cod_amount = existing.cod_amount;
            baseRecord.installment_months = existing.installment_months;
            baseRecord.installment_amount = existing.installment_amount;
            baseRecord.payment_status = existing.payment_status;
            baseRecord.customer_name = existing.customer_name;
            baseRecord.customer_phone = existing.customer_phone;
            baseRecord.installment_number = existing.installment_number;
            baseRecord.installment_history = existing.installment_history;
          }

          // If soft-deleted, preserve the deleted status on Sheet Sync (prevent reviving deleted rows)
          if (existing.deleted_at) {
            baseRecord.deleted_at = existing.deleted_at;
          }
        }

        return baseRecord;
      });

      if (records.length === 0) {
        showToast('❌ No records retrieved from spreadsheet.', 'error');
        setImportingCSV(false);
        return;
      }

      // Bulk upsert to Supabase
      const { error } = await supabase
        .from('sheets_inventory')
        .upsert(records, { onConflict: 'imei' });

      if (error) throw error;

      showToast(t('toast_sync_success', { count: records.length }), 'success');
      setIsCSVModalOpen(false);
      loadLedgerData();
    } catch (err: any) {
      console.error(err);
      showToast(t('toast_sync_failed') + err.message, 'error');
    } finally {
      setImportingCSV(false);
    }
  };

  // Clipboard Paste Ingestion Handler
  const handlePasteImport = async () => {
    if (!pasteText.trim()) {
      showToast(t('toast_no_paste_text'), 'error');
      return;
    }
    setImportingCSV(true);
    try {
      const rows = pasteText.trim().split(/\r?\n/).map(row => row.split('\t'));
      if (rows.length === 0) {
        showToast(t('toast_no_valid_text_data'), 'error');
        setImportingCSV(false);
        return;
      }

      // Detect header row by scanning first 6 rows for IMEI keyword
      let headerRowIdx = 0;
      let headerDetected = false;
      for (let r = 0; r < Math.min(rows.length, 6); r++) {
        const row = rows[r];
        const hasImei = row.some(cell => cell && cell.toLowerCase().replace(/\s+/g, '').includes('imei'));
        if (hasImei) {
          headerRowIdx = r;
          headerDetected = true;
          break;
        }
      }

      // Default indices mapping (fallbacks)
      let siteDateIdx = -1;
      let saleDateIdx = -1;
      let stickerIdx = -1;
      let modelIdx = -1;
      let imeiIdx = -1;
      let colorIdx = -1;
      let isSoldIdx = -1;
      let locationIdx = -1;
      let batteryIdx = -1;
      let sellerIdx = -1;
      let notesIdx = -1;
      let sellingPriceIdx = -1;
      let marketPriceIdx = -1;
      let purchaseCostIdx = -1;

      if (headerDetected) {
        const headerRow = rows[headerRowIdx];
        
        // First pass for exact or strong matches
        headerRow.forEach((cell, idx) => {
          const clean = cell.toLowerCase().replace(/\s+/g, '');
          if (clean.includes('입고날짜') || clean.includes('sitedate') || (clean.includes('date') && clean.includes('site'))) {
            siteDateIdx = idx;
          } else if (clean.includes('판매날짜') || clean.includes('saledate') || (clean.includes('date') && clean.includes('sale'))) {
            saleDateIdx = idx;
          } else if (clean.includes('스티커') || clean.includes('sticker') || clean.includes('serial')) {
            stickerIdx = idx;
          } else if (clean.includes('modelname') || clean.includes('모델명') || (clean.includes('model') && !clean.includes('price'))) {
            modelIdx = idx;
          } else if (clean === 'imei' || clean.includes('imei')) {
            imeiIdx = idx;
          } else if (clean.includes('color') || clean.includes('색상')) {
            colorIdx = idx;
          } else if (clean.includes('ขายแล้ว') || clean.includes('issold') || clean.includes('판매여부')) {
            isSoldIdx = idx;
          } else if (clean.includes('location') || clean.includes('stocklocation') || clean.includes('위치')) {
            locationIdx = idx;
          } else if (clean.includes('battery') || clean.includes('배터리')) {
            batteryIdx = idx;
          } else if (clean.includes('คนขาย') || clean.includes('seller') || clean.includes('판매자') || clean.includes('판매사원')) {
            sellerIdx = idx;
          } else if (clean.includes('notes') || clean.includes('note') || clean.includes('비고')) {
            notesIdx = idx;
          } else if (clean.includes('매입원가') || clean.includes('매입') || clean.includes('입고금액') || clean.includes('입고가') || clean.includes('purchasecost') || (clean.includes('cost') && clean.includes('krw'))) {
            purchaseCostIdx = idx;
          } else if (clean.includes('selligprice(b+') || (clean.includes('sellingprice') && !clean.includes('도매') && !clean.includes('마진'))) {
            sellingPriceIdx = idx;
          } else if (clean.includes('marketprice') || clean === 'market' || (clean.includes('market') && !clean.includes('cost'))) {
            marketPriceIdx = idx;
          }
        });

        // Second pass for looser matches
        headerRow.forEach((cell, idx) => {
          const clean = cell.toLowerCase().replace(/\s+/g, '');
          if (sellingPriceIdx === -1 && (clean === 'price' || clean.includes('sellingprice') || clean.includes('판매가') || clean.includes('소매가'))) {
            sellingPriceIdx = idx;
          }
          if (marketPriceIdx === -1 && (clean.includes('도매가격') || (clean.includes('도매') && !clean.includes('마진') && !clean.includes('수수료')))) {
            marketPriceIdx = idx;
          }
        });
      }

      // Fallbacks
      if (siteDateIdx === -1) siteDateIdx = 0;
      if (saleDateIdx === -1) saleDateIdx = 1;
      if (stickerIdx === -1) stickerIdx = 3;
      if (modelIdx === -1) modelIdx = 4;
      if (imeiIdx === -1) imeiIdx = 5;
      if (colorIdx === -1) colorIdx = 6;
      if (isSoldIdx === -1) isSoldIdx = 7;
      if (locationIdx === -1) locationIdx = 8;
      if (batteryIdx === -1) batteryIdx = 9;
      if (sellerIdx === -1) sellerIdx = 10;
      if (notesIdx === -1) notesIdx = 11;
      if (sellingPriceIdx === -1) sellingPriceIdx = 15;
      if (marketPriceIdx === -1) marketPriceIdx = 16;
      if (purchaseCostIdx === -1) purchaseCostIdx = 18;

      // Fetch existing DB records to prevent overwriting sold status or reviving deleted items
      const { data: existingDB } = await supabase
        .from('sheets_inventory')
        .select('*');
      
      const dbMap = new Map<string, any>();
      if (existingDB) {
        existingDB.forEach(d => {
          if (d.imei) dbMap.set(d.imei.trim(), d);
        });
      }

      const records = [];
      const nowString = new Date().toISOString();
      const startIdx = headerDetected ? headerRowIdx + 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (row.length <= imeiIdx) continue;

        // Filter: only load rows that have sticker data
        const stickerNo = row[stickerIdx] ? row[stickerIdx].trim() : '';
        if (!stickerNo) {
          continue;
        }

        // Skip rows with no valid IMEI
        let rawImei = row[imeiIdx] ? row[imeiIdx].trim().replace(/\s+/g, '') : '';
        if (!rawImei && stickerNo) {
          rawImei = stickerNo.replace(/\s+/g, '');
        }

        if (!rawImei || rawImei.toLowerCase() === 'imei' || rawImei.toLowerCase() === 'imei/serial' || rawImei.length < 4) {
          continue;
        }

        const siteD = row[siteDateIdx] ? row[siteDateIdx].trim() : '';
        const saleD = row[saleDateIdx] ? row[saleDateIdx].trim() : '';
        const model = row[modelIdx] ? row[modelIdx].trim() : '';
        const colorVal = row[colorIdx] ? row[colorIdx].trim() : '';
        const isSoldStr = row[isSoldIdx] ? row[isSoldIdx].trim().toUpperCase() : 'FALSE';
        const isSoldVal = isSoldStr === 'TRUE' || isSoldStr === 'YES' || isSoldStr === '예' || isSoldStr === '1';
        const loc = row[locationIdx] ? row[locationIdx].trim() : 'Shop';
        const battery = row[batteryIdx] ? row[batteryIdx].trim() : '100';
        const seller = row[sellerIdx] ? row[sellerIdx].trim() : '';
        const note = row[notesIdx] ? row[notesIdx].trim() : '';

        const sellingPriceVal = parseInt(row[sellingPriceIdx]?.replace(/[^\d]/g, '')) || 0;
        const marketPriceVal = parseInt(row[marketPriceIdx]?.replace(/[^\d]/g, '')) || 0;
        const purchaseCostVal = parseInt(row[purchaseCostIdx]?.replace(/[^\d]/g, '')) || 0;

        const rawImeiTrimmed = rawImei.trim();
        const existing = dbMap.get(rawImeiTrimmed);

        const newRecord: any = {
          site_date: siteD,
          sale_date: saleD,
          sticker: stickerNo,
          model_name: model,
          imei: rawImei,
          color: colorVal,
          is_sold: isSoldVal,
          stock_location: loc,
          battery_pct: battery,
          seller_name: seller,
          notes: note,
          selling_price: sellingPriceVal,
          market_price: marketPriceVal,
          purchase_cost_krw: purchaseCostVal,
          deleted_at: null, // Restored on manual clipboard paste
          created_at: nowString
        };

        if (existing) {
          if (existing.is_sold) {
            newRecord.is_sold = true;
            newRecord.sale_date = existing.sale_date;
            newRecord.seller_name = existing.seller_name;
            newRecord.notes = existing.notes;
            newRecord.selling_price = existing.selling_price;
            newRecord.sale_type = existing.sale_type;
            newRecord.deposit_amount = existing.deposit_amount;
            newRecord.cod_amount = existing.cod_amount;
            newRecord.installment_months = existing.installment_months;
            newRecord.installment_amount = existing.installment_amount;
            newRecord.payment_status = existing.payment_status;
            newRecord.customer_name = existing.customer_name;
            newRecord.customer_phone = existing.customer_phone;
            newRecord.installment_number = existing.installment_number;
            newRecord.installment_history = existing.installment_history;
          }
        }

        records.push(newRecord);
      }

      if (records.length === 0) {
        showToast(t('toast_no_valid_paste_data'), 'error');
        setImportingCSV(false);
        return;
      }

      const { error } = await supabase
        .from('sheets_inventory')
        .upsert(records, { onConflict: 'imei' });

      if (error) throw error;

      showToast(t('toast_paste_import_success', { count: records.length }), 'success');
      setIsCSVModalOpen(false);
      setPasteText('');
      loadLedgerData();
    } catch (err: any) {
      console.error(err);
      showToast(t('toast_paste_import_failed') + err.message, 'error');
    } finally {
      setImportingCSV(false);
    }
  };

  // Open Manual Add Modal
  const handleOpenAddModal = () => {
    setEditingDevice(null);
    setSticker('');
    setModelName('');
    setIsCustomModel(false);
    setCustomModelName('');
    setImei('');
    setColor('');
    setBatteryPct('100');
    setLocation('');
    setIsCustomLocation(false);
    setCustomLocationName('');
    setPurchaseCost('');
    setSellingPrice('');
    setSiteDate(new Date().toLocaleDateString('ko-KR').slice(2));
    setNotes('');
    setIsManualModalOpen(true);
  };

  // 6. Manual Intake Single Addition Handler
  const handleSaveManualIntake = async () => {
    const activeModel = isCustomModel ? customModelName.trim() : modelName.trim();
    const activeLocation = isCustomLocation ? customLocationName.trim() : location.trim();

    if (!activeModel || !imei.trim()) {
      showToast('❌ Model Name and IMEI are required.', 'error');
      return;
    }
    
    setSavingDevice(true);
    try {
      let finalModelName = activeModel;
      if (isCustomModel && customModelName.trim()) {
        const { error: modErr } = await supabase
          .from('settings_models')
          .insert({ name: customModelName.trim() });
        if (modErr && modErr.code !== '23505') {
          throw modErr;
        }
        finalModelName = customModelName.trim();
      }

      let finalLocation = activeLocation;
      if (isCustomLocation && customLocationName.trim()) {
        const { error: locErr } = await supabase
          .from('settings_locations')
          .insert({ name: customLocationName.trim() });
        if (locErr && locErr.code !== '23505') {
          throw locErr;
        }
        finalLocation = customLocationName.trim();
      }

      const payload = {
        sticker: sticker.trim() || null,
        model_name: finalModelName,
        imei: imei.trim().replace(/\s+/g, ''),
        color: color.trim() || null,
        battery_pct: batteryPct.trim() || '100',
        stock_location: finalLocation,
        purchase_cost_krw: Number(purchaseCost) || 0,
        selling_price: Number(sellingPrice) || 0,
        site_date: siteDate || new Date().toLocaleDateString('ko-KR').slice(2),
        notes: notes.trim() || null,
        is_sold: false
      };

      let error;
      if (editingDevice) {
        ({ error } = await supabase
          .from('sheets_inventory')
          .update(payload)
          .eq('id', editingDevice.id));
      } else {
        const newPayload = {
          ...payload,
          id: typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : undefined
        };
        ({ error } = await supabase
          .from('sheets_inventory')
          .insert(newPayload));
      }

      if (error) throw error;

      showToast(editingDevice ? '✅ Device updated.' : '✅ Device added to stock.', 'success');
      setIsManualModalOpen(false);
      setEditingDevice(null);
      
      // Reset Form fields
      setSticker('');
      setModelName('');
      setIsCustomModel(false);
      setCustomModelName('');
      setImei('');
      setColor('');
      setBatteryPct('100');
      setLocation('');
      setIsCustomLocation(false);
      setCustomLocationName('');
      setPurchaseCost('');
      setSellingPrice('');
      setSiteDate('');
      setNotes('');

      await Promise.all([
        loadSettingsData(),
        loadLedgerData()
      ]);
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    } finally {
      setSavingDevice(false);
    }
  };

  // Inline Cell Save Handler
  const handleInlineSave = async (
    id: string, 
    field: 'sticker' | 'site_date' | 'model_name' | 'imei' | 'color' | 'battery_pct' | 'purchase_cost_krw' | 'selling_price' | 'stock_location' | 'notes' | 'customer_name' | 'customer_phone' | 'installment_number', 
    value: string
  ) => {
    try {
      let finalValue: any = value.trim();
      if (field === 'purchase_cost_krw' || field === 'selling_price') {
        finalValue = Number(value.replace(/[^\d]/g, '')) || 0;
      }

      const { error } = await supabase
        .from('sheets_inventory')
        .update({ [field]: finalValue })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setDevices(prev => prev.map(d => d.id === id ? { ...d, [field]: finalValue } : d));
      showToast(t('toast_inline_save_success'), 'success');
    } catch (err: any) {
      showToast(t('toast_inline_save_failed') + err.message, 'error');
    } finally {
      setEditingCell(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (device: DeviceItem) => {
    setEditingDevice(device);
    setSticker(device.sticker || '');
    setIsCustomModel(false);
    setCustomModelName('');
    setModelName(device.model_name || '');
    setImei(device.imei);
    setColor(device.color || '');
    setBatteryPct(device.battery_pct || '100');
    setIsCustomLocation(false);
    setCustomLocationName('');
    setLocation(device.stock_location || '');
    setPurchaseCost(device.purchase_cost_krw ? device.purchase_cost_krw.toString() : '');
    setSellingPrice(device.selling_price ? device.selling_price.toString() : '');
    setSiteDate(device.site_date || '');
    setNotes(device.notes || '');
    setIsManualModalOpen(true);
  };

  // Helper to calculate monthly installment due dates
  const calculateDueDate = (startDateStr: string, monthsToAdd: number): string => {
    let year = 26;
    let month = 6;
    let day = 8;
    
    const parts = startDateStr.split('.').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      year = Number(parts[0]) || 26;
      month = Number(parts[1]) || 6;
      day = Number(parts[2]) || 8;
    }
    
    let targetMonth = month + monthsToAdd;
    let targetYear = year;
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }
    
    return `${targetYear}. ${targetMonth}. ${day}.`;
  };

  // 7. Selling Single Device Process Handler
  const handleOpenSellModal = (device: DeviceItem) => {
    setSellingDevice(device);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSaleDate(`${yyyy}-${mm}-${dd}`);
    setSellerName('');
    setSaleNotes('');
    setSaleType('transfer');
    setDepositAmount(0);
    setTransferAmount(device.selling_price || 0);
    setCodAmountInput(0);
    setInstMonths(4);
    setInstMonthlyPayment(0);
    setCustName('');
    setCustPhone('');
    setInstNumber('');
    setTradeInDeviceName('');
    setTradeInValue(0);
  };

  const formatDateToDot = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0].slice(-2);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${year}. ${month}. ${day}.`;
      }
    }
    return dateStr;
  };

  const handleProcessSale = async () => {
    if (!sellingDevice) return;
    if (!sellerName.trim()) {
      showToast(t('toast_name_required'), 'error');
      return;
    }

    if (saleType === 'installment') {
      if (!custName.trim()) {
        showToast('고객 성함을 입력해 주세요. (Customer Name is required.)', 'error');
        return;
      }
      if (!custPhone.trim()) {
        showToast('고객 연락처를 입력해 주세요. (Customer Phone is required.)', 'error');
        return;
      }
      if (!instNumber.trim()) {
        showToast('할부 번호를 입력해 주세요. (Installment Number is required.)', 'error');
        return;
      }
    }

    setProcessingSale(true);
    try {
      let paymentStatus = 'paid';
      if (saleType === 'cod') {
        paymentStatus = 'unpaid';
      } else if (saleType === 'installment') {
        paymentStatus = 'collecting';
      }
 
      let finalNotes = saleNotes.trim();
      if (saleType === 'exchange') {
        const tradeInPart = `[기기 보상: ${tradeInDeviceName.trim() || '미기입'} (฿${(Number(tradeInValue) || 0).toLocaleString()})]`;
        finalNotes = finalNotes ? `${finalNotes} ${tradeInPart}` : tradeInPart;
      }
 
      const formattedSaleDate = formatDateToDot(saleDate);
      let instHistory: any[] = [];
      if (saleType === 'installment') {
        const months = Number(instMonths) || 0;
        const monthlyAmount = Number(instMonthlyPayment) || 0;
        for (let i = 1; i <= months; i++) {
          instHistory.push({
            sequence: i,
            due_date: calculateDueDate(formattedSaleDate, i),
            amount: monthlyAmount,
            status: 'unpaid',
            paid_date: null
          });
        }
      }

      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_sold: true,
          is_reserved: false,
          reserved_by: null,
          reserved_date: null,
          sale_date: formattedSaleDate,
          seller_name: sellerName.trim(),
          notes: finalNotes || null,
          selling_price: calculatedFinalPrice,
          sale_type: saleType,
          deposit_amount: Number(depositAmount) || 0,
          cod_amount: saleType === 'cod' ? (Number(codAmountInput) || 0) : 0,
          installment_months: saleType === 'installment' ? (Number(instMonths) || 0) : 0,
          installment_amount: saleType === 'installment' ? (Number(instMonthlyPayment) || 0) : 0,
          payment_status: paymentStatus,
          customer_name: custName.trim() || null,
          customer_phone: custPhone.trim() || null,
          installment_number: saleType === 'installment' && instNumber.trim() ? `IRIS${instNumber.trim()}` : null,
          is_approved: false, // New sale requires admin approval to hit margin log
          installment_history: saleType === 'installment' ? instHistory : []
        })
        .eq('id', sellingDevice.id);

      if (error) throw error;

      showToast(t('toast_sale_recorded_success'), 'success');
      setSellingDevice(null);
      setSearchQuery('');
      loadLedgerData();
    } catch (err: any) {
      showToast(t('toast_sale_recorded_failed') + err.message, 'error');
    } finally {
      setProcessingSale(false);
    }
  };

  const handleApproveSale = async (deviceId: string) => {
    if (!confirm('해당 판매 건을 승인하시겠습니까?\n승인 시 최종 마진 장부에 반영됩니다.\n(Do you want to approve this sale? It will be entered into the margin ledger.)')) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_approved: true
        })
        .eq('id', deviceId);

      if (error) throw error;
      showToast('판매 승인이 완료되었습니다. (Sale approved successfully.)', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('판매 승인 실패: ' + err.message, 'error');
    }
  };

  const handleToggleInstallmentStatus = async (deviceId: string, sequence: number) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    const history = [...(device.installment_history || [])];
    const itemIndex = history.findIndex((h: any) => h.sequence === sequence);
    if (itemIndex === -1) return;
    
    const inst = history[itemIndex];
    const newStatus = inst.status === 'paid' ? 'unpaid' : 'paid';
    const todayStr = new Date().toLocaleDateString('ko-KR').slice(2);
    
    history[itemIndex] = {
      ...inst,
      status: newStatus,
      paid_date: newStatus === 'paid' ? todayStr : null
    };
    
    // Recalculate if all installments are now paid
    const allPaid = history.every((h: any) => h.status === 'paid');
    const paymentStatus = allPaid ? 'paid' : 'collecting';
    
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          installment_history: history,
          payment_status: paymentStatus
        })
        .eq('id', deviceId);
        
      if (error) throw error;
      showToast(`${sequence}회차 수금 상태를 변경했습니다.`, 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('상태 변경 실패: ' + err.message, 'error');
    }
  };

  const handleFinalizeInstallment = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    if (!confirm('해당 할부 계약을 최종 완납 처리하시겠습니까?\n모든 회차가 납부 완료로 변경됩니다.')) return;
    
    const history = (device.installment_history || []).map((h: any) => ({
      ...h,
      status: 'paid',
      paid_date: h.paid_date || new Date().toLocaleDateString('ko-KR').slice(2)
    }));
    
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          installment_history: history,
          payment_status: 'paid'
        })
        .eq('id', deviceId);
        
      if (error) throw error;
      showToast('할부 완납 처리가 완료되었습니다.', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('완납 처리 실패: ' + err.message, 'error');
    }
  };

  // Reservation Handlers
  const handleOpenReserveModal = (device: DeviceItem) => {
    setReservingDevice(device);
    setReserverName('');
    setReservationNotes('');
  };

  const handleProcessReservation = async () => {
    if (!reservingDevice) return;
    if (!reserverName.trim()) {
      showToast(t('toast_input_reserver'), 'error');
      return;
    }

    setProcessingReservation(true);
    try {
      const todayStr = new Date().toLocaleDateString('ko-KR').slice(2);
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_reserved: true,
          reserved_by: reserverName.trim(),
          reserved_date: todayStr,
          notes: reservationNotes.trim() ? `[예약] ${reservationNotes.trim()}` : reservingDevice.notes
        })
        .eq('id', reservingDevice.id);

      if (error) throw error;

      showToast(t('toast_reserve_success'), 'success');
      setReservingDevice(null);
      loadLedgerData();
    } catch (err: any) {
      showToast(t('toast_reserve_failed') + err.message, 'error');
    } finally {
      setProcessingReservation(false);
    }
  };

  const handleCancelReservation = async (deviceId: string) => {
    if (!confirm(t('toast_confirm_cancel_reserve'))) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_reserved: false,
          reserved_by: null,
          reserved_date: null
        })
        .eq('id', deviceId);

      if (error) throw error;

      showToast(t('toast_cancel_reserve_success'), 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast(t('toast_cancel_reserve_failed') + err.message, 'error');
    }
  };

  // Re-verify back to inventory stock
  const handleRestoreToStock = async (deviceId: string) => {
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
  };

  // Bulk Approve Sales
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개의 판매 건을 일괄 승인하시겠습니까?\n승인 시 최종 마진 장부에 반영됩니다.\n(Do you want to approve the selected ${selectedIds.length} sales?)`)) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_approved: true
        })
        .in('id', selectedIds);

      if (error) throw error;

      showToast(`선택한 ${selectedIds.length}개의 판매 승인이 완료되었습니다. (Sales approved successfully.)`, 'success');
      setSelectedIds([]);
      loadLedgerData();
    } catch (err: any) {
      showToast('일괄 승인 실패: ' + err.message, 'error');
    }
  };

  const handleApproveIntake = async (id: string) => {
    if (!confirm('해당 기기의 입고를 승인하고 실재고(Shop)로 등록하시겠습니까?')) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({ stock_location: 'Shop' })
        .eq('id', id);

      if (error) throw error;

      setDevices(prev => prev.map(d => d.id === id ? { ...d, stock_location: 'Shop' } : d));
      showToast('입고 승인 완료! 실재고로 등록되었습니다.', 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  const handleBulkApproveIntake = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}대 기기의 입고를 일괄 승인하고 실재고(Shop)로 등록하시겠습니까?`)) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({ stock_location: 'Shop' })
        .in('id', selectedIds);

      if (error) throw error;

      setDevices(prev => prev.map(d => selectedIds.includes(d.id) ? { ...d, stock_location: 'Shop' } : d));
      const approvedCount = selectedIds.length;
      setSelectedIds([]);
      showToast(`일괄 입고 승인 완료! ${approvedCount}대가 실재고로 등록되었습니다.`, 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // Delete Device Handler (Soft Delete to Trash Bin)
  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm(t('toast_confirm_delete_selected_trash'))) return;
    try {
      const nowStr = new Date().toISOString();
      const { error } = await supabase
        .from('sheets_inventory')
        .update({ deleted_at: nowStr })
        .eq('id', deviceId);

      if (error) throw error;

      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, deleted_at: nowStr } : d));
      showToast(t('toast_delete_selected_trash_success'), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // Bulk Soft Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t('toast_confirm_bulk_delete_trash', { count: selectedIds.length }))) return;
    try {
      const nowStr = new Date().toISOString();
      const { error } = await supabase
        .from('sheets_inventory')
        .update({ deleted_at: nowStr })
        .in('id', selectedIds);

      if (error) throw error;

      setDevices(prev => prev.map(d => selectedIds.includes(d.id) ? { ...d, deleted_at: nowStr } : d));
      const deletedCount = selectedIds.length;
      setSelectedIds([]);
      showToast(t('toast_bulk_delete_trash_success', { count: deletedCount }), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // Bulk Restore from Trash
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({ deleted_at: null })
        .in('id', selectedIds);

      if (error) throw error;

      setDevices(prev => prev.map(d => selectedIds.includes(d.id) ? { ...d, deleted_at: undefined } : d));
      setSelectedIds([]);
      showToast(t('toast_restore_success'), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // Bulk Permanent Delete from Trash
  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t('toast_confirm_permanent_delete', { count: selectedIds.length }))) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setDevices(prev => prev.filter(d => !selectedIds.includes(d.id)));
      setSelectedIds([]);
      showToast(t('toast_permanent_delete_success'), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // Tab Change Handler
  const handleTabChange = (tab: 'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin' | 'installment' | 'pending_intake') => {
    setActiveTab(tab);
    setSelectedIds([]);
    setCategoryFilter('all');
    setSearchQuery('');
    setSoldSearchQuery('');
    setInstallmentSearchQuery('');
    setTrashSearchQuery('');
  };

  // CSV Reader trigger for file upload selector
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvFileText(event.target?.result as string || '');
    };
    reader.readAsText(file, 'utf-8');
  };

  // Loading & Access denied panels
  if (loadingAuth) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#eaedf2' }}>
        <div style={{ color: 'var(--purple-l)', fontWeight: 700 }}>Checking authorization...</div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#eaedf2', padding: '20px' }}>
        <div className="glass-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--red)', marginBottom: '10px' }}>{t('access_denied_title')}</h1>
          <p style={{ color: 'var(--t2)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
            {t('staff_no_access')}
          </p>
          <div style={{ padding: '8px 16px', background: '#f1f5f9', borderRadius: '8px', display: 'inline-block', fontSize: '11px', color: '#64748b' }}>
            Redirecting to home in <span style={{ color: 'var(--purple-l)', fontWeight: 700 }}>{redirectCountdown}</span> seconds...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-wrap">
      
      {/* SIDEBAR (Unified look matching Admin Dashboard) */}
      <aside className="sidebar">
        <div className="sb-head">
          <div className="nav-logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <div className="nav-logo-icon">💎</div>
            <span className="nav-logo-text">PHONE SWITCH HUB</span>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-sec-lbl">{t('staff_portal') || 'STAFF PORTAL'}</div>
          
          <button 
            className={`sb-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <span className="ico">📊</span> {t('staff_menu_overview') || '경영 개요'}
          </button>
          
          <button 
            className={`sb-link ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => handleTabChange('ledger')}
          >
            <span className="ico">📱</span> {t('staff_menu_inventory') || '사내 재고 관리'}
          </button>

          <button 
            className={`sb-link ${activeTab === 'pending_intake' ? 'active' : ''}`}
            onClick={() => handleTabChange('pending_intake')}
          >
            <span className="ico">📥</span> 입고 대기 목록 {stats.pendingIntakeCount > 0 && <span style={{ background: '#f59e0b', color: '#fff', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>{stats.pendingIntakeCount}</span>}
          </button>

          <button 
            className={`sb-link ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => handleTabChange('sales')}
          >
            <span className="ico">💸</span> {t('staff_menu_sales') || '판매 완료 처리'}
          </button>

          {(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (
            <button 
              className={`sb-link ${activeTab === 'installment' ? 'active' : ''}`}
              onClick={() => handleTabChange('installment')}
            >
              <span className="ico">💳</span> 할부 수금 및 고객 관리
            </button>
          )}

          <button 
            className={`sb-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <span className="ico">⚙️</span> {t('staff_menu_settings') || '기준 정보 관리'}
          </button>

          {staffProfile?.role === 'admin' && (
            <button 
              className={`sb-link ${activeTab === 'margin' ? 'active' : ''}`}
              onClick={() => handleTabChange('margin')}
            >
              <span className="ico">📈</span> 마진 및 정산관리
            </button>
          )}

          <button 
            className={`sb-link ${activeTab === 'trash' ? 'active' : ''}`}
            onClick={() => handleTabChange('trash')}
          >
            <span className="ico">🗑️</span> 휴지통
          </button>

          <div className="sb-sec-lbl">Shortcuts</div>
          <button className="sb-link" onClick={() => router.push('/')}>
            <span className="ico">🏠</span> {t('admin_menu_home')}
          </button>
        </nav>

        <div className="sb-foot">
          <div className="sb-user">
            <div className="sb-avatar">💼</div>
            <div style={{ textAlign: 'left' }}>
              <div className="sb-uname">{staffProfile?.store_name || staffProfile?.name || 'Staff'}</div>
              <div className="sb-urole">Internal Team</div>
            </div>
          </div>
          <button 
            className="btn-nav btn-nav-outline" 
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }} 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/auth');
            }}
          >
            {t('logout_btn')}
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="main">

        {/* Header Toolbar */}
        <header className="main-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800 }}>
              {activeTab === 'overview' && `📊 ${t('staff_menu_overview') || '경영 개요'}`}
              {activeTab === 'ledger' && `📱 ${t('staff_menu_inventory') || '사내 재고 관리'}`}
              {activeTab === 'sales' && `💸 ${t('staff_menu_sales') || '판매 완료 처리'}`}
              {activeTab === 'installment' && `💳 할부 수금 및 고객 관리`}
              {activeTab === 'settings' && `⚙️ ${t('staff_menu_settings') || '기준 정보 관리'}`}
              {activeTab === 'margin' && `📈 마진 및 정산관리`}
              {activeTab === 'trash' && `🗑️ 휴지통`}
            </h1>
            <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>
              Company Ledger & Stock Intake Management System.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}>
                <span>💱 네이버 환율 (THB➔KRW):</span>
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                  style={{
                    width: '55px',
                    border: 'none',
                    background: 'transparent',
                    fontWeight: 800,
                    color: 'var(--purple-l)',
                    textAlign: 'center',
                    padding: 0,
                    margin: 0,
                    outline: 'none'
                  }}
                  step="0.1"
                />
              </div>
            )}
            <div style={{ display: 'inline-flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px' }}>
              <button
                onClick={() => changeLanguage('ko')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  background: lang === 'ko' ? 'var(--purple-l)' : 'transparent',
                  color: lang === 'ko' ? '#fff' : 'var(--t2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                KO
              </button>
              <button
                onClick={() => changeLanguage('th')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  background: lang === 'th' ? 'var(--purple-l)' : 'transparent',
                  color: lang === 'th' ? '#fff' : 'var(--t2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                TH
              </button>
            </div>
            <div style={{ color: 'var(--t2)', fontSize: '13px', fontWeight: 600 }}>
              {new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* ==================== VIEW 1: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Stats Cards Panel */}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              
              <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="sc-icon" style={{ background: 'rgba(139,92,246,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
                <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--purple-l)', margin: '8px 0 2px' }}>
                  ₩{formatPrice(stats.totalPurchaseCostKRW)}
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>{t('staff_total_purchase_value') || '총 매입 가치 (KRW)'}</div>
              </div>

              <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="sc-icon" style={{ background: 'rgba(59,130,246,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏷️</div>
                <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--blue)', margin: '8px 0 2px' }}>
                  ฿{formatPrice(stats.totalSellingValueTHB)}
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>{t('staff_current_stock_value') || '현재 재고 판매가 (THB)'}</div>
              </div>

              <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="sc-icon" style={{ background: 'rgba(16,185,129,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--green)', margin: '8px 0 2px' }}>
                    {stats.totalStockCount} {t('staff_qty_unit') || '대'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', flexWrap: 'wrap', gap: '6px', fontWeight: 700, alignItems: 'center' }}>
                    <span>🍎 {stats.iphoneCount}</span>
                    <span>🪐 {stats.galaxyCount}</span>
                    <span>{lang === 'ko' ? '기타' : (lang === 'th' ? 'อื่นๆ' : 'Other')} {stats.otherCount}</span>
                    {stats.reservedCount > 0 && (
                      <span style={{ color: '#d97706', background: '#fef3c7', padding: '1px 5px', borderRadius: '999px', fontSize: '9px', fontWeight: 800 }}>📌 {t('staff_status_reserved') || '예약중'} {stats.reservedCount}{t('staff_qty_unit') || '대'}</span>
                    )}
                  </div>
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>{t('staff_current_stock_qty') || '현재고 수량'} (iPhone / Galaxy / Other)</div>
              </div>

              <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="sc-icon" style={{ background: 'rgba(236,72,153,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📈</div>
                <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--pink)', margin: '8px 0 2px' }}>
                  ฿{formatPrice(stats.totalSoldRevenueTHB)}
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>{t('staff_total_sold_value') || '총 판매 완료액'} ({stats.totalSoldCount}{t('staff_qty_unit') || '대'})</div>
              </div>

            </div>

            {/* Layout Panels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '20px' }}>
              
              {/* Location distribution */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>📍 {t('staff_stock_by_location') || '보관 장소별 재고 현황'}</h3>
                  {selectedStatsLocation !== 'all' && (
                    <button 
                      onClick={() => setSelectedStatsLocation('all')}
                      style={{ background: 'none', border: 'none', color: 'var(--purple-l)', fontSize: '11px', fontWeight: 800, cursor: 'pointer', padding: 0 }}
                    >
                      🔄 {lang === 'ko' ? '전체 보기' : (lang === 'th' ? 'ดูทั้งหมด' : 'Show All')}
                    </button>
                  )}
                </div>
                {Object.keys(stats.locationCounts).length === 0 ? (
                  <div style={{ color: 'var(--t2)', fontSize: '12px', textAlign: 'center', padding: '24px' }}>No active inventory found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(stats.locationCounts).map(([loc, count]) => {
                      const pct = stats.totalStockCount > 0 ? (count / stats.totalStockCount) * 100 : 0;
                      const isSelected = selectedStatsLocation === loc;
                      return (
                         <div 
                           key={loc} 
                           style={{ 
                             display: 'flex', 
                             flexDirection: 'column', 
                             gap: '4px', 
                             cursor: 'pointer',
                             padding: '6px 10px',
                             borderRadius: '10px',
                             background: isSelected ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                             border: isSelected ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid transparent',
                             transition: 'all 0.2s'
                           }}
                           onClick={() => setSelectedStatsLocation(prev => prev === loc ? 'all' : loc)}
                         >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                              <span style={{ color: isSelected ? 'var(--purple-l)' : 'inherit' }}>{loc} {isSelected ? '✓' : ''}</span>
                              <span style={{ color: isSelected ? 'var(--purple-l)' : 'var(--t2)' }}>{count}{t('staff_qty_unit') || '대'} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: isSelected ? 'var(--purple)' : 'var(--purple-l)', borderRadius: '999px' }}></div>
                            </div>
                          </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Model distribution */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800 }}>
                  📱 {t('staff_stock_by_model') || '기종별 재고 현황'}
                  {selectedStatsLocation !== 'all' && (
                    <span style={{ color: 'var(--purple-l)', marginLeft: '6px', fontSize: '12px' }}>({selectedStatsLocation})</span>
                  )}
                </h3>
                
                {/* High level category bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* iPhone */}
                  <div 
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                    onClick={() => {
                      handleTabChange('ledger');
                      setLocationFilter(selectedStatsLocation);
                      setCategoryFilter('all');
                      setSearchQuery('iPhone');
                    }}
                    title={t('staff_iphone_only') || "재고 관리에서 아이폰만 보기"}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span>{lang === 'ko' ? '아이폰 (iPhone) ➔' : (lang === 'th' ? 'ไอโฟน (iPhone) ➔' : 'iPhone ➔')}</span>
                      <span style={{ color: 'var(--t2)' }}>{stats.iphoneCount}{t('staff_qty_unit') || '대'} ({stats.totalStockCountForModels > 0 ? ((stats.iphoneCount / stats.totalStockCountForModels) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalStockCountForModels > 0 ? (stats.iphoneCount / stats.totalStockCountForModels) * 100 : 0}%`, height: '100%', background: 'var(--purple)', borderRadius: '999px' }}></div>
                    </div>
                  </div>

                  {/* Galaxy */}
                  <div 
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                    onClick={() => {
                      handleTabChange('ledger');
                      setLocationFilter(selectedStatsLocation);
                      setCategoryFilter('all');
                      setSearchQuery('Galaxy');
                    }}
                    title={t('staff_galaxy_only') || "재고 관리에서 갤럭시만 보기"}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span>{lang === 'ko' ? '갤럭시 (Galaxy) ➔' : (lang === 'th' ? 'กาแลคซี่ (Galaxy) ➔' : 'Galaxy ➔')}</span>
                      <span style={{ color: 'var(--t2)' }}>{stats.galaxyCount}{t('staff_qty_unit') || '대'} ({stats.totalStockCountForModels > 0 ? ((stats.galaxyCount / stats.totalStockCountForModels) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalStockCountForModels > 0 ? (stats.galaxyCount / stats.totalStockCountForModels) * 100 : 0}%`, height: '100%', background: 'var(--cyan)', borderRadius: '999px' }}></div>
                    </div>
                  </div>

                  {/* Other */}
                  <div 
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                    onClick={() => {
                      handleTabChange('ledger');
                      setLocationFilter(selectedStatsLocation);
                      setCategoryFilter('all');
                      setSearchQuery('Other');
                    }}
                    title={t('staff_other_only') || "재고 관리에서 기타 브랜드만 보기"}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span>{lang === 'ko' ? '기타 (Other) ➔' : (lang === 'th' ? 'อื่นๆ (Other) ➔' : 'Other ➔')}</span>
                      <span style={{ color: 'var(--t2)' }}>{stats.otherCount}{t('staff_qty_unit') || '대'} ({stats.totalStockCountForModels > 0 ? ((stats.otherCount / stats.totalStockCountForModels) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalStockCountForModels > 0 ? (stats.otherCount / stats.totalStockCountForModels) * 100 : 0}%`, height: '100%', background: 'var(--t3)', borderRadius: '999px' }}></div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                
                {/* Detailed Series Counts */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, marginBottom: '10px', color: 'var(--t1)' }}>📋 {t('staff_detail_series') || '상세 기종 시리즈 현황 (클릭 시 이동)'}</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                    {Object.entries(stats.seriesCounts)
                      .filter(([_, count]) => count > 0)
                      .map(([series, count]) => {
                        const pct = stats.totalStockCountForModels > 0 ? (count / stats.totalStockCountForModels) * 100 : 0;
                        return (
                          <div 
                            key={series} 
                            style={{ display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer' }}
                            onClick={() => {
                              handleTabChange('ledger');
                              setLocationFilter(selectedStatsLocation);
                              setCategoryFilter('all');
                              setSearchQuery(series.replace(' 기타', '').replace(' 브랜드', '').replace('기타 ', ''));
                            }}
                            title={t('search_placeholder')}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                              <span>{series} ➔</span>
                              <span style={{ color: 'var(--purple-l)' }}>{count}{t('staff_qty_unit') || '대'} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--purple-l)', borderRadius: '999px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    {Object.values(stats.seriesCounts).every(count => count === 0) && (
                      <div style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '12px' }}>{t('search_no_results') || '재고 없음'}</div>
                    )}
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                {/* Top 10 Exact Model Names */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, marginBottom: '10px', color: 'var(--t1)' }}>💎 {t('staff_top10_models') || '실재고 단일 모델 TOP 10 (클릭 시 이동)'}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {stats.topIndividualModels.slice(0, 10).map(([model, count]) => (
                      <div 
                        key={model} 
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '6px 10px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => {
                          handleTabChange('ledger');
                          setLocationFilter(selectedStatsLocation);
                          setSearchQuery('');
                          setCategoryFilter(model);
                        }}
                        title={t('search_placeholder')}
                      >
                        <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{model} ➔</span>
                        <span style={{ fontWeight: 800, color: 'var(--green)', fontSize: '12px' }}>{count}{t('staff_qty_unit') || '대'}</span>
                      </div>
                    ))}
                    {stats.topIndividualModels.length === 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '8px' }}>{t('search_no_results') || '데이터 없음'}</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Quick info panel */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800 }}>{t('staff_system_info_title') || '📌 사내 장부 시스템 안내'}</h3>
                <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p>• {t('staff_system_info_1') || '입고된 물건들은 엑셀(CSV) 일괄 등록을 통해 IMEI 중복 없이 대량 업로드할 수 있습니다.'}</p>
                  <p>• {t('staff_system_info_2') || '폰 판매 시 리스트 우측의 \"판매 처리\" 버튼을 눌러 판매일과 수금 내용을 적어주세요. 장부에 즉시 반영됩니다.'}</p>
                  <p>• {t('staff_system_info_3') || '할부 계약이 완료된 폰은 고객 ID나 계약 내용을 비고에 함께 메모해 두시면 추적하기 수월합니다.'}</p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== VIEW 2-B: PENDING INTAKE (DHL) ==================== */}
        {activeTab === 'pending_intake' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Search & Toolbars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
              <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="모델명, IMEI 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '220px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="all">전체 기종 ({basePendingDevicesCount}대)</option>
                  {uniqueModels.pending.map(([model, count]) => (
                    <option key={model} value={model}>{model} ({count}대)</option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: '#d97706', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                  입고 대기: {filteredPendingDevices.length}대 (총 매입가: ₩{formatPrice(filteredPendingDevicesPurchaseCost)})
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedIds.length > 0 && (
                  <>
                    <button 
                      style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--green)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkApproveIntake}
                    >
                      ✅ 일괄 입고 승인 ({selectedIds.length})
                    </button>
                    <button 
                      style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkDelete}
                    >
                      🗑️ {t('staff_btn_delete_selected')} ({selectedIds.length})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Devices Stock Grid Table */}
            <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredPendingDevices.length > 0 && filteredPendingDevices.every(d => selectedIds.includes(d.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => Array.from(new Set([...prev, ...filteredPendingDevices.map(d => d.id)])));
                          } else {
                            setSelectedIds(prev => prev.filter(id => !filteredPendingDevices.some(d => d.id === id)));
                          }
                        }}
                      />
                    </th>
                    <th style={{ width: '12%', cursor: 'pointer' }} onClick={() => toggleSort('sticker')}>
                      {t('staff_th_sticker')} {sortField === 'sticker' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('site_date')}>
                      {t('staff_th_intake_date')} {sortField === 'site_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                      {t('staff_th_model')} {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '13%' }}>IMEI</th>
                    <th style={{ width: '8%' }}>Color</th>
                    <th style={{ width: '6%', textAlign: 'center' }}>배터리</th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                      {t('staff_th_purchase_cost')} {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                      {t('staff_th_selling_price')} {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%' }}>위치</th>
                    <th style={{ width: '12%' }}>비고 (NOTES)</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>조작</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        데이터 로딩 중...
                      </td>
                    </tr>
                  ) : filteredPendingDevices.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        입고 대기 중인 기기가 없습니다. (DHL 보관 기기 없음)
                      </td>
                    </tr>
                  ) : (
                    filteredPendingDevices.map(item => (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, item.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--purple-l)' }}>{item.sticker || '-'}</td>
                        <td style={{ color: 'var(--t2)' }}>{item.site_date || '-'}</td>
                        <td style={{ fontWeight: 700 }}>{item.model_name}</td>
                        <td className="font-mono" style={{ fontSize: '11px' }}>{item.imei}</td>
                        <td>{item.color || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontWeight: 600 }}>
                            {item.battery_pct || '100'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#e11d48' }}>₩{formatPrice(item.purchase_cost_krw)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{formatPrice(item.selling_price)}</td>
                        <td>
                          <span className="badge bg-yellow" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>{item.stock_location}</span>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes || ''}>
                          {item.notes || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className="btn-green"
                              style={{ height: '28px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', gap: '2px' }}
                              onClick={() => handleApproveIntake(item.id)}
                              title="실재고로 승인 등록"
                            >
                              ✅ 승인
                            </button>
                            <button
                              className="btn-blue"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleOpenEdit(item)}
                              title={t('staff_tooltip_edit') || "수정"}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-red"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleDeleteDevice(item.id)}
                              title={t('staff_tooltip_delete') || "삭제"}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ==================== VIEW 2: LEDGER (INVENTORY) ==================== */}
        {activeTab === 'ledger' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Search & Toolbars */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
              <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={t('staff_search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '220px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                />
                
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '130px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="all">{t('staff_all_locations')}</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="all">{t('staff_all_models') || '전체 기종'} ({baseActiveDevicesCount}{t('staff_qty_unit') || '대'})</option>
                  {uniqueModels.active.map(([model, count]) => (
                    <option key={model} value={model}>{model} ({count}{t('staff_qty_unit') || '대'})</option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--purple-l)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                  {t('staff_viewed_stock', { count: filteredActiveDevices.length, cost: formatPrice(filteredActiveDevicesPurchaseCost) })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedIds.length > 0 && (
                  <button 
                    style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={handleBulkDelete}
                  >
                    🗑️ {t('staff_btn_delete_selected')} ({selectedIds.length})
                  </button>
                )}
                <button 
                  style={{ margin: 0, background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', color: 'var(--purple-l)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setAuditText('');
                    setAuditActiveTab('not_in_db');
                    setIsAuditModalOpen(true);
                  }}
                >
                  🔍 IMEI 비교/실사 (Audit)
                </button>
                <button 
                  style={{ margin: 0, background: '#f1f5f9', border: '1px solid var(--border)', color: '#334155', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => setIsCSVModalOpen(true)}
                >
                  📥 {t('staff_btn_bulk_import')}
                </button>
                <button 
                  style={{ margin: 0, background: 'var(--purple-l)', border: 'none', color: '#fff', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={handleOpenAddModal}
                >
                  ➕ {t('staff_btn_manual_import')}
                </button>
              </div>
            </div>

            {/* Devices Stock Grid Table */}
            <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredActiveDevices.length > 0 && filteredActiveDevices.every(d => selectedIds.includes(d.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => Array.from(new Set([...prev, ...filteredActiveDevices.map(d => d.id)])));
                          } else {
                            setSelectedIds(prev => prev.filter(id => !filteredActiveDevices.some(d => d.id === id)));
                          }
                        }}
                      />
                    </th>
                    <th style={{ width: '12%', cursor: 'pointer' }} onClick={() => toggleSort('sticker')}>
                      {t('staff_th_sticker')} {sortField === 'sticker' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('site_date')}>
                      {t('staff_th_intake_date')} {sortField === 'site_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                      {t('staff_th_model')} {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '13%' }}>IMEI</th>
                    <th style={{ width: '8%' }}>Color</th>
                    <th style={{ width: '6%', textAlign: 'center' }}>{t('staff_th_battery')}</th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                      {t('staff_th_purchase_cost')} {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                      {t('staff_th_selling_price')} {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    {(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (
                      <th style={{ width: '10%', textAlign: 'right' }}>
                        임시 마진
                      </th>
                    )}
                    <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('stock_location')}>
                      {t('staff_th_location')} {sortField === 'stock_location' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '12%' }}>{t('staff_th_notes')}</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>{t('staff_th_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') ? 13 : 12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        {t('loading_data') || 'Database fetching active records...'}
                      </td>
                    </tr>
                  ) : filteredActiveDevices.length === 0 ? (
                    <tr>
                      <td colSpan={(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') ? 13 : 12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        {t('staff_empty_stock') || '재고 목록이 비어 있습니다. 입고를 진행해 주세요.'}
                      </td>
                    </tr>
                  ) : (
                    filteredActiveDevices.map(item => (
                      <tr key={item.id} style={item.is_reserved ? { background: '#fff9eb', borderLeft: '4px solid #f59e0b' } : undefined}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, item.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </td>
                        <td 
                          style={{ fontWeight: 700, color: 'var(--purple-l)', cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'sticker') {
                              setEditingCell({ id: item.id, field: 'sticker' });
                              setEditCellValue(item.sticker || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'sticker' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.id, 'sticker', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'sticker', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '90%' }}
                            />
                          ) : (
                            item.sticker || '-'
                          )}
                        </td>
                        <td 
                          style={{ color: 'var(--t2)', cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'site_date') {
                              setEditingCell({ id: item.id, field: 'site_date' });
                              setEditCellValue(item.site_date || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'site_date' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.id, 'site_date', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'site_date', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '90%' }}
                            />
                          ) : (
                            item.site_date || '-'
                          )}
                        </td>
                        <td 
                          style={{ fontWeight: 700, wordBreak: 'break-all', cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'model_name') {
                              setEditingCell({ id: item.id, field: 'model_name' });
                              setEditCellValue(item.model_name || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'model_name' ? (
                            <select
                              value={editCellValue}
                              onChange={(e) => {
                                setEditCellValue(e.target.value);
                                handleInlineSave(item.id, 'model_name', e.target.value);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '90%' }}
                            >
                              <option value="">{t('staff_select_model_placeholder') || '-- 모델명 선택 --'}</option>
                              {models.map(mod => (
                                <option key={mod.id} value={mod.name}>{mod.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {item.is_reserved && (
                                <span style={{ fontSize: '10px', fontWeight: 800, background: '#f59e0b', color: '#fff', padding: '1px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{t('staff_status_reserved') || '예약중'}</span>
                              )}
                              <span>{item.model_name}</span>
                            </div>
                          )}
                        </td>
                        <td 
                          className="font-mono" 
                          style={{ fontSize: '11px', wordBreak: 'break-all', cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'imei') {
                              setEditingCell({ id: item.id, field: 'imei' });
                              setEditCellValue(item.imei || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'imei' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.id, 'imei', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'imei', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input font-mono"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '11px', width: '95%' }}
                            />
                          ) : (
                            item.imei
                          )}
                        </td>
                        <td 
                          style={{ cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'color') {
                              setEditingCell({ id: item.id, field: 'color' });
                              setEditCellValue(item.color || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'color' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.id, 'color', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'color', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '95%' }}
                            />
                          ) : (
                            item.color || '-'
                          )}
                        </td>
                        <td 
                          style={{ textAlign: 'center', cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'battery_pct') {
                              setEditingCell({ id: item.id, field: 'battery_pct' });
                              setEditCellValue(item.battery_pct || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'battery_pct' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.id, 'battery_pct', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'battery_pct', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '11px', width: '90%', textAlign: 'center' }}
                            />
                          ) : (
                            <span style={{ fontSize: '11px', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontWeight: 600 }}>
                              {item.battery_pct || '100'}
                            </span>
                          )}
                        </td>
                        <td 
                          style={{ textAlign: 'right', fontWeight: 700, color: '#e11d48', cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'purchase_cost_krw') {
                              setEditingCell({ id: item.id, field: 'purchase_cost_krw' });
                              setEditCellValue(item.purchase_cost_krw ? item.purchase_cost_krw.toString() : '0');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'purchase_cost_krw' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value.replace(/[^\d]/g, ''))}
                              onBlur={() => handleInlineSave(item.id, 'purchase_cost_krw', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'purchase_cost_krw', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '90%', textAlign: 'right' }}
                            />
                          ) : (
                            <>₩{formatPrice(item.purchase_cost_krw)}</>
                          )}
                        </td>
                        <td 
                          style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'selling_price') {
                              setEditingCell({ id: item.id, field: 'selling_price' });
                              setEditCellValue(item.selling_price ? item.selling_price.toString() : '0');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'selling_price' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value.replace(/[^\d]/g, ''))}
                              onBlur={() => handleInlineSave(item.id, 'selling_price', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'selling_price', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '90%', textAlign: 'right' }}
                            />
                          ) : (
                            <>฿{formatPrice(item.selling_price)}</>
                          )}
                        </td>
                        {(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (
                          <td style={{ textAlign: 'right', fontWeight: 700, color: (Math.round((item.selling_price || 0) * exchangeRate) - (item.purchase_cost_krw || 0)) >= 0 ? 'var(--green)' : '#e11d48' }}>
                            ₩{formatPrice(Math.round((item.selling_price || 0) * exchangeRate) - (item.purchase_cost_krw || 0))}
                          </td>
                        )}
                        <td
                          style={{ cursor: staffProfile?.role === 'admin' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (staffProfile?.role !== 'admin') return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'stock_location') {
                              setEditingCell({ id: item.id, field: 'stock_location' });
                              setEditCellValue(item.stock_location || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'stock_location' ? (
                            <select
                              value={editCellValue}
                              onChange={(e) => {
                                setEditCellValue(e.target.value);
                                handleInlineSave(item.id, 'stock_location', e.target.value);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '95%' }}
                            >
                              <option value="">{t('staff_select_location_placeholder') || '-- 위치 선택 --'}</option>
                              {locations.map(loc => (
                                <option key={loc.id} value={loc.name}>{loc.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="badge bg-gray">{item.stock_location || 'Shop'}</span>
                          )}
                        </td>
                        <td 
                          style={{ fontSize: '11px', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} 
                          title={item.is_reserved ? `${lang === 'ko' ? '예약자' : 'Reserver'}: ${item.reserved_by} | ${item.notes || ''}` : item.notes || ''}
                          onClick={() => {
                            if (item.is_reserved) return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'notes') {
                              setEditingCell({ id: item.id, field: 'notes' });
                              setEditCellValue(item.notes || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'notes' ? (
                            <input
                              type="text"
                              value={editCellValue}
                              onChange={(e) => setEditCellValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.id, 'notes', editCellValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.id, 'notes', editCellValue);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '95%' }}
                            />
                          ) : item.is_reserved ? (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>👤 {item.reserved_by} ({item.reserved_date})</span>
                          ) : (
                            item.notes || '-'
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className="btn-green"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleOpenSellModal(item)}
                              title={t('staff_tooltip_sell') || "판매완료"}
                            >
                              💸
                            </button>
                            {item.is_reserved ? (
                              <button
                                style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid var(--border)', cursor: 'pointer' }}
                                onClick={() => handleCancelReservation(item.id)}
                                title={t('staff_tooltip_cancel_reserve') || "예약취소"}
                              >
                                🔓
                              </button>
                            ) : (
                              <button
                                style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', cursor: 'pointer' }}
                                onClick={() => handleOpenReserveModal(item)}
                                title={t('staff_tooltip_reserve') || "예약"}
                              >
                                📌
                              </button>
                            )}
                            <button
                              className="btn-blue"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleOpenEdit(item)}
                              title={t('staff_tooltip_edit') || "수정"}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-red"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleDeleteDevice(item.id)}
                              title={t('staff_tooltip_delete') || "삭제"}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ==================== VIEW 3: SALES LEDGER ==================== */}
        {activeTab === 'sales' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Sales Search Box */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  placeholder={t('staff_search_sold_placeholder')}
                  value={soldSearchQuery}
                  onChange={(e) => setSoldSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '220px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="all">{t('staff_all_models') || '전체 기종'} ({baseSoldDevicesCount}{t('staff_qty_unit') || '대'})</option>
                  {uniqueModels.sold.map(([model, count]) => (
                    <option key={model} value={model}>{model} ({count}{t('staff_qty_unit') || '대'})</option>
                  ))}
                </select>

                {/* Day Filter */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {isDayFilterOpen && (
                    <div 
                      onClick={() => setIsDayFilterOpen(false)} 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: 'transparent' }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDayFilterOpen(!isDayFilterOpen)}
                    className="form-input"
                    style={{
                      margin: 0,
                      padding: '8px 12px',
                      fontSize: '13px',
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minWidth: '150px',
                      justifyContent: 'space-between',
                      position: 'relative',
                      zIndex: 1000
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      📅 {soldSelectedDays.length === 0 
                        ? (lang === 'ko' ? '모든 일자' : (lang === 'th' ? 'ทุกวันที่' : 'All Days'))
                        : `${soldSelectedDays.sort((a,b)=>a-b).map(d => `${d}일`).join(', ')}`}
                    </span>
                    <span>▼</span>
                  </button>

                  {isDayFilterOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 1000,
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        marginTop: '4px',
                        padding: '12px',
                        width: '280px',
                        maxHeight: '350px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSoldSelectedDays([])}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#f1f5f9',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--t2)'
                          }}
                        >
                          {lang === 'ko' ? '초기화' : (lang === 'th' ? 'ล้างค่า' : 'Reset')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDayFilterOpen(false)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: 'var(--purple-l)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#fff'
                          }}
                        >
                          {lang === 'ko' ? '확인' : (lang === 'th' ? 'ตกลง' : 'OK')}
                        </button>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '6px',
                          overflowY: 'auto',
                          maxHeight: '220px',
                          padding: '2px'
                        }}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                          const isChecked = soldSelectedDays.includes(day);
                          return (
                            <label
                              key={day}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '6px 4px',
                                border: isChecked ? '1px solid var(--purple-l)' : '1px solid var(--border)',
                                borderRadius: '6px',
                                background: isChecked ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: isChecked ? 800 : 'normal',
                                color: isChecked ? 'var(--purple-l)' : 'var(--t1)',
                                userSelect: 'none',
                                transition: 'all 0.15s'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSoldSelectedDays(prev => 
                                    prev.includes(day) 
                                      ? prev.filter(d => d !== day) 
                                      : [...prev, day]
                                  );
                                }}
                                style={{ display: 'none' }}
                              />
                              {day}{lang === 'ko' ? '일' : (lang === 'th' ? '일' : 'd')}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--green)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkRestoreToStock}
                    >
                      🔄 {t('staff_btn_restore_selected')} ({selectedIds.length})
                    </button>
                    <button 
                      style={{ margin: 0, background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', color: 'var(--blue)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkApprove}
                    >
                      ✅ 일괄 승인 ({selectedIds.length})
                    </button>
                    <button 
                      style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkDelete}
                    >
                      🗑️ {t('staff_btn_delete_selected')} ({selectedIds.length})
                    </button>
                  </div>
                )}
              </div>
              
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple-l)', whiteSpace: 'nowrap' }}>
                {t('staff_total_sold_count', { count: filteredSoldDevices.length })}
              </div>
            </div>

            {/* Sales Grid Table */}
            <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredSoldDevices.length > 0 && filteredSoldDevices.every(d => selectedIds.includes(d.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => Array.from(new Set([...prev, ...filteredSoldDevices.map(d => d.id)])));
                          } else {
                            setSelectedIds(prev => prev.filter(id => !filteredSoldDevices.some(d => d.id === id)));
                          }
                        }}
                      />
                    </th>
                    <th style={{ width: '9%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                      {t('staff_th_sale_date')} {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '9%', cursor: 'pointer' }} onClick={() => toggleSort('sticker')}>
                      {t('staff_th_sticker')} {sortField === 'sticker' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '12%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                      {t('staff_th_model')} {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '11%' }}>IMEI</th>
                    <th style={{ width: '7%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                      {t('staff_th_purchase_cost')} {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '7%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                      {t('staff_th_selling_price')} {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%' }}>판매 상세 (Payment Details)</th>
                    <th style={{ width: '8%', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('payment_status')}>
                      수납 상태 {sortField === 'payment_status' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '7%', cursor: 'pointer' }} onClick={() => toggleSort('seller_name')}>
                      {t('staff_th_seller_name')} {sortField === 'seller_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '7%' }}>{t('staff_th_sale_memo')}</th>
                    <th style={{ width: '9%', textAlign: 'center' }}>조작</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        Loading sold device list...
                      </td>
                    </tr>
                  ) : filteredSoldDevices.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        {t('staff_empty_sold') || '판매 완료된 기기 내역이 없습니다.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSoldDevices.map(item => (
                      <tr key={item.id} style={{ background: '#fafaf9' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, item.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--green)' }}>{item.sale_date || '-'}</td>
                        <td style={{ color: 'var(--t2)' }}>{item.sticker || '-'}</td>
                        <td style={{ fontWeight: 700, wordBreak: 'break-all' }}>{item.model_name}</td>
                        <td className="font-mono" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{item.imei}</td>
                        <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{formatPrice(item.purchase_cost_krw)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{formatPrice(item.selling_price)}</td>
                        <td style={{ fontSize: '11.5px', color: 'var(--t1)' }}>
                          {getSaleDetailsLabel(item)}
                          {item.installment_number && (
                            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--purple-l)', fontWeight: 800 }}>
                              📄 {item.installment_number}
                            </div>
                          )}
                          {(item.customer_name || item.customer_phone) && (
                            <div style={{ marginTop: '2px', fontSize: '10.5px', color: 'var(--t2)', fontWeight: 'normal' }}>
                              👤 {item.customer_name || '미기입'} {item.customer_phone ? `(${item.customer_phone})` : ''}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            {getPaymentStatusBadge(item.payment_status)}
                            {item.is_approved ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--green)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>승인 완료</span>
                            ) : (
                              <span style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>승인 대기</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{item.seller_name || '-'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--t2)' }}>{item.notes || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {!item.is_approved && staffProfile?.role === 'admin' && (
                              <button
                                className="btn-green"
                                style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', background: '#ecfdf5', color: '#10b981', borderColor: '#d1fae5', cursor: 'pointer' }}
                                onClick={() => handleApproveSale(item.id)}
                                title="판매 승인 (Approve Sale)"
                              >
                                ✔️
                              </button>
                            )}
                            <button
                              className="btn-red"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', background: '#fef2f2', color: 'var(--red)', borderColor: '#fee2e2', cursor: 'pointer' }}
                              onClick={() => handleRestoreToStock(item.id)}
                              title={t('staff_th_restore') || "재고복원"}
                            >
                              🔄
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ==================== VIEW: INSTALLMENT MANAGEMENT ==================== */}
        {activeTab === 'installment' && (staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (() => {
          const installmentDevices = devices.filter(d => !d.deleted_at && d.is_sold && d.sale_type === 'installment');
          
          const now = new Date();
          const currYear = now.getFullYear() % 100;
          const currMonth = now.getMonth() + 1;
          
          const isDueThisMonth = (dueDate: string) => {
            if (!dueDate) return false;
            const pts = dueDate.split('.').map(x => x.trim()).filter(Boolean);
            if (pts.length >= 2) {
              return Number(pts[0]) === currYear && Number(pts[1]) === currMonth;
            }
            return false;
          };

          let expectedThisMonth = 0;
          let collectedThisMonth = 0;
          let totalUnpaidBalance = 0;
          
          installmentDevices.forEach(d => {
            const history = d.installment_history || [];
            history.forEach((h: any) => {
              if (isDueThisMonth(h.due_date)) {
                expectedThisMonth += Number(h.amount) || 0;
                if (h.status === 'paid') {
                  collectedThisMonth += Number(h.amount) || 0;
                }
              }
              if (h.status === 'unpaid') {
                totalUnpaidBalance += Number(h.amount) || 0;
              }
            });
          });
          
          const remainingThisMonth = expectedThisMonth - collectedThisMonth;

          // Filter installments based on search query
          const filteredInstallments = installmentDevices.filter(d => {
            const custNameMatch = d.customer_name?.toLowerCase().includes(installmentSearchQuery.toLowerCase());
            const custPhoneMatch = d.customer_phone?.includes(installmentSearchQuery);
            const stickerMatch = d.sticker?.toLowerCase().includes(installmentSearchQuery.toLowerCase());
            const imeiMatch = d.imei?.includes(installmentSearchQuery);
            const modelMatch = normalizeModelName(d.model_name).includes(normalizeModelName(installmentSearchQuery));
            return !installmentSearchQuery || custNameMatch || custPhoneMatch || stickerMatch || imeiMatch || modelMatch;
          });

          return (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Summary Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📅</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>이번 달 청구 예정액 ({currMonth}월)</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--purple-l)', marginTop: '4px' }}>฿{expectedThisMonth.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>총 청구 회차 합산</div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🟢</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>이번 달 수납 완료액</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)', marginTop: '4px' }}>฿{collectedThisMonth.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>수금 완료액</div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔴</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>총 미수금 잔액</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red)', marginTop: '4px' }}>฿{totalUnpaidBalance.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>미납 회차 전체 잔액</div>
                  </div>
                </div>
              </div>

              {/* Installment Search & Count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
                <input
                  type="text"
                  placeholder="고객명, 연락처, 기기 검색..."
                  value={installmentSearchQuery}
                  onChange={(e) => setInstallmentSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '240px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                />
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple-l)' }}>
                  총 할부 거래 수: {installmentDevices.length}건 (검색됨: {filteredInstallments.length}건)
                </div>
              </div>

              {/* Installment Table */}
              <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
                <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '8%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                        구매일 {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '13%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                        기기 정보 {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('customer_name')}>
                        할부번호 / 고객정보 {sortField === 'customer_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '14%', cursor: 'pointer' }} onClick={() => toggleSort('installment_amount')}>
                        할부 조건 (계약 금액) {sortField === 'installment_amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                        수납액 / 할부총액 {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '34%' }}>회차별 수금 관리 (클릭 시 수납 처리)</th>
                      <th style={{ width: '6%', textAlign: 'center' }}>조작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstallments.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                          할부 거래 내역이 없습니다. (No installments found.)
                        </td>
                      </tr>
                    ) : (
                      sortDevices(filteredInstallments).map(item => {
                        const history = item.installment_history || [];
                        const paidTotal = history.filter((h: any) => h.status === 'paid').reduce((s: number, h: any) => s + (Number(h.amount) || 0), 0);
                        const totalInstPrice = (item.installment_months || 0) * (item.installment_amount || 0);
                        const isFinished = item.payment_status === 'paid';
                        
                        return (
                          <tr key={item.id} style={{ background: isFinished ? '#f4f4f5' : '#fff', opacity: isFinished ? 0.65 : 1 }}>
                            <td style={{ fontWeight: 700 }}>{item.sale_date}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{item.model_name}</div>
                              <div style={{ fontSize: '10.5px', color: 'var(--t3)', fontFamily: 'monospace' }}>Sticker: {item.sticker}</div>
                              <div style={{ fontSize: '10.5px', color: 'var(--t3)', fontFamily: 'monospace' }}>IMEI: {item.imei}</div>
                            </td>
                            <td>
                              {/* Installment Number Inline Edit */}
                              {editingCell?.id === item.id && editingCell?.field === 'installment_number' ? (
                                <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0' }}>
                                  <span style={{ 
                                    background: 'var(--bg2)', 
                                    padding: '4px 6px', 
                                    border: '1px solid var(--border)', 
                                    borderRight: 'none',
                                    borderRadius: '4px 0 0 4px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: 'var(--t2)',
                                    height: '26px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    boxSizing: 'border-box'
                                  }}>
                                    IRIS
                                  </span>
                                  <input
                                    type="text"
                                    value={editCellValue.replace(/IRIS/i, '')}
                                    onChange={(e) => setEditCellValue('IRIS' + e.target.value.replace(/[^\d]/g, ''))}
                                    onBlur={() => handleInlineSave(item.id, 'installment_number', editCellValue)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineSave(item.id, 'installment_number', editCellValue);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    autoFocus
                                    className="form-input"
                                    style={{ 
                                      margin: 0, 
                                      padding: '2px 6px', 
                                      fontSize: '11px', 
                                      width: '65px',
                                      height: '26px',
                                      borderRadius: '0 4px 4px 0',
                                      borderLeft: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div 
                                  style={{ fontWeight: 800, color: 'var(--purple-l)', cursor: 'pointer', marginBottom: '6px', fontSize: '12.5px' }}
                                  onClick={() => {
                                    setEditingCell({ id: item.id, field: 'installment_number' });
                                    setEditCellValue(item.installment_number || 'IRIS000000');
                                  }}
                                  title="클릭하여 수정"
                                >
                                  📄 {item.installment_number || 'IRIS000000'}
                                </div>
                              )}

                              {/* Customer Name Inline Edit */}
                              {editingCell?.id === item.id && editingCell?.field === 'customer_name' ? (
                                <input
                                  type="text"
                                  value={editCellValue}
                                  onChange={(e) => setEditCellValue(e.target.value)}
                                  onBlur={() => handleInlineSave(item.id, 'customer_name', editCellValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(item.id, 'customer_name', editCellValue);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="form-input"
                                  style={{ margin: '2px 0', padding: '4px 8px', fontSize: '12px', width: '95%' }}
                                />
                              ) : (
                                <div 
                                  style={{ fontWeight: 700, color: 'var(--t1)', cursor: 'pointer', fontSize: '11.5px' }}
                                  onClick={() => {
                                    setEditingCell({ id: item.id, field: 'customer_name' });
                                    setEditCellValue(item.customer_name || '');
                                  }}
                                  title="클릭하여 수정"
                                >
                                  👤 {item.customer_name || '미기입'}
                                </div>
                              )}

                              {/* Customer Phone Inline Edit */}
                              {editingCell?.id === item.id && editingCell?.field === 'customer_phone' ? (
                                <input
                                  type="text"
                                  value={editCellValue}
                                  onChange={(e) => setEditCellValue(e.target.value)}
                                  onBlur={() => handleInlineSave(item.id, 'customer_phone', editCellValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(item.id, 'customer_phone', editCellValue);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="form-input"
                                  style={{ margin: '2px 0', padding: '4px 8px', fontSize: '12px', width: '95%' }}
                                />
                              ) : (
                                <div 
                                  style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px', cursor: 'pointer' }}
                                  onClick={() => {
                                    setEditingCell({ id: item.id, field: 'customer_phone' });
                                    setEditCellValue(item.customer_phone || '');
                                  }}
                                  title="클릭하여 수정"
                                >
                                  📞 {item.customer_phone || '미기입'}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '11px', color: 'var(--t2)' }}>인도금: ฿{formatPrice(item.deposit_amount || 0)}</div>
                              <div style={{ fontSize: '11px', fontWeight: 700 }}>분납: ฿{formatPrice(item.installment_amount || 0)} x {item.installment_months}개월</div>
                              <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>최종 판매가: ฿{formatPrice((item.deposit_amount || 0) + totalInstPrice)}</div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800 }}>
                              <span style={{ color: isFinished ? 'var(--green)' : '#d97706' }}>฿{formatPrice(paidTotal)}</span>
                              <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 'normal' }}> / ฿{formatPrice(totalInstPrice)}</span>
                            </td>
                            <td>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {history.map((inst: any, idx: number) => {
                                  const isPaid = inst.status === 'paid';
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => handleToggleInstallmentStatus(item.id, inst.sequence)}
                                      style={{
                                        width: '100%',
                                        padding: '4px 2px',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        background: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: isPaid ? 'var(--green)' : 'var(--red)',
                                        border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        boxSizing: 'border-box'
                                      }}
                                      title={`예정일: ${inst.due_date}${inst.paid_date ? ` (수금일: ${inst.paid_date})` : ''}`}
                                    >
                                      {inst.sequence}회차 ({inst.due_date.split('.').slice(1,2).join('.') + '월'}): ฿{formatPrice(inst.amount)} {isPaid ? '🟢' : '🔴'}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {!isFinished && (
                                <button
                                  className="btn-sm btn-green"
                                  onClick={() => handleFinalizeInstallment(item.id)}
                                  style={{ padding: '4px 8px', fontSize: '10.5px', fontWeight: 800, margin: 0, whiteSpace: 'nowrap' }}
                                >
                                  완납 처리
                                </button>
                              )}
                              {isFinished && (
                                <span style={{ color: 'var(--green)', fontSize: '11px', fontWeight: 800 }}>✓ 완납완료</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ==================== VIEW 4: SETTINGS (MASTER DATA) ==================== */}
        {activeTab === 'settings' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Location Management Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span> {t('staff_location_mgmt') || '보관 위치 기준 정보 관리'}
                </h3>
                
                {/* Add Location Form */}
                <form onSubmit={handleAddLocationFromSettings} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder={t('staff_input_new_location')}
                    value={newLocInput}
                    onChange={(e) => setNewLocInput(e.target.value)}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                  <button type="submit" className="btn-submit" style={{ margin: 0, width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}>
                    {t('staff_btn_add') || '추가'}
                  </button>
                </form>

                {/* Locations list */}
                <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>{t('staff_th_location_name') || '위치명'}</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>{t('staff_th_actions') || '조작'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>{t('staff_empty_locations') || '등록된 위치가 없습니다.'}</td>
                        </tr>
                      ) : (
                        locations.map((loc) => (
                          <tr key={loc.id}>
                            <td style={{ fontWeight: 700 }}>{loc.name}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button type="button" className="btn-sm btn-blue" onClick={() => handleRenameLocation(loc.name)}>{t('staff_btn_edit') || '수정'}</button>
                                <button type="button" className="btn-sm btn-red" onClick={() => handleDeleteLocation(loc.name)}>{t('staff_btn_delete') || '삭제'}</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Model Management Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📱</span> {t('staff_model_mgmt') || '모델명 기준 정보 관리'}
                </h3>
                
                {/* Add Model Form */}
                <form onSubmit={handleAddModelFromSettings} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder={t('staff_input_new_model')}
                    value={newModInput}
                    onChange={(e) => setNewModInput(e.target.value)}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                  <button type="submit" className="btn-submit" style={{ margin: 0, width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}>
                    {t('staff_btn_add') || '추가'}
                  </button>
                </form>

                {/* Models list */}
                <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>{t('staff_th_model') || '모델명'}</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>{t('staff_th_actions') || '조작'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>{t('staff_empty_models') || '등록된 모델명이 없습니다.'}</td>
                        </tr>
                      ) : (
                        models.map((mod) => (
                          <tr key={mod.id}>
                            <td style={{ fontWeight: 700 }}>{mod.name}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button type="button" className="btn-sm btn-blue" onClick={() => handleRenameModel(mod.name)}>{t('staff_btn_edit') || '수정'}</button>
                                <button type="button" className="btn-sm btn-red" onClick={() => handleDeleteModel(mod.name)}>{t('staff_btn_delete') || '삭제'}</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== VIEW 5: MARGIN & SETTLEMENT (ADMIN ONLY) ==================== */}
        {activeTab === 'margin' && staffProfile?.role === 'admin' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Margins Summary Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Paid Margin Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💰</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>수납 완료 마진 (Paid Margin)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)', marginTop: '4px' }}>฿{marginStats.totalPaidTHB.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>원가: ₩{marginStats.totalPaidCostKRW.toLocaleString()}</div>
                </div>
              </div>

              {/* Receivables Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⏳</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>COD 미수금 잔액 (COD Receivables)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red)', marginTop: '4px' }}>฿{marginStats.totalUnpaidCODTHB.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>배송 완료 후 정산 대기</div>
                </div>
              </div>

              {/* Installments Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📅</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>할부 판매 진행 건 (Installments)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{marginStats.activeInstallmentCount}건 (Sales)</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>매월 계약서 기준 분납 수납</div>
                </div>
              </div>
            </div>

            {/* Seller Monthly Performance Aggregation */}
            {(() => {
              const sellerStatsMap: Record<string, {
                yearMonth: string;
                sellerName: string;
                qty: number;
                totalSalesTHB: number;
                totalCostKRW: number;
                estimatedMarginKRW: number;
              }> = {};

              marginStats.soldList.forEach(item => {
                const ym = getYearMonth(item.sale_date);
                const seller = item.seller_name || '미지정 (Unassigned)';
                const key = `${ym}_${seller}`;
                
                const sales = Number(item.selling_price) || 0;
                const cost = Number(item.purchase_cost_krw) || 0;
                const marginKRW = Math.round(sales * exchangeRate) - cost;
                
                if (!sellerStatsMap[key]) {
                  sellerStatsMap[key] = {
                    yearMonth: ym,
                    sellerName: seller,
                    qty: 1,
                    totalSalesTHB: sales,
                    totalCostKRW: cost,
                    estimatedMarginKRW: marginKRW
                  };
                } else {
                  sellerStatsMap[key].qty += 1;
                  sellerStatsMap[key].totalSalesTHB += sales;
                  sellerStatsMap[key].totalCostKRW += cost;
                  sellerStatsMap[key].estimatedMarginKRW += marginKRW;
                }
              });

              const sellerStatsList = Object.values(sellerStatsMap).sort((a, b) => {
                if (a.yearMonth !== b.yearMonth) {
                  return b.yearMonth.localeCompare(a.yearMonth);
                }
                return b.estimatedMarginKRW - a.estimatedMarginKRW;
              });

              return (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👥</span> 담당자별 월간 판매 실적 및 마진 요약 (Seller Monthly Performance Summary)
                  </h4>
                  <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="tbl" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '15%' }}>정산 월</th>
                          <th style={{ width: '25%' }}>담당자 (판매원)</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>판매 대수</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>총 소매 판매가</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>총 매입 원가</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>총 정산 마진 (예상)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellerStatsList.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>정산 요약 데이터가 없습니다. (No summary data available.)</td>
                          </tr>
                        ) : (
                          sellerStatsList.map(row => (
                            <tr key={`${row.yearMonth}_${row.sellerName}`}>
                              <td style={{ fontWeight: 700, color: 'var(--purple-l)' }}>{row.yearMonth}</td>
                              <td style={{ fontWeight: 700 }}>{row.sellerName}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>{row.qty}대</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{row.totalSalesTHB.toLocaleString()}</td>
                              <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{row.totalCostKRW.toLocaleString()}</td>
                              <td style={{ textAlign: 'right', fontWeight: 900, color: row.estimatedMarginKRW >= 0 ? 'var(--green)' : '#e11d48' }}>
                                ₩{row.estimatedMarginKRW.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Part 1: Receivables & Unpaid Table */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--red)' }}>🔴</span> 미수금 및 할부 수납 관리 (Receivables & Collections)
              </h4>
              <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="tbl" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                        판매일 {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                        기기 정보 {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '11%', cursor: 'pointer' }} onClick={() => toggleSort('imei')}>
                        IMEI {sortField === 'imei' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '14%', cursor: 'pointer' }} onClick={() => toggleSort('customer_name')}>
                        고객 정보 (Customer Info) {sortField === 'customer_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '22%' }}>판매 상세 (Payment Details)</th>
                      <th style={{ width: '13%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('cod_amount')}>
                        미수 금액 (Balance) {sortField === 'cod_amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '7%', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('payment_status')}>
                        상태 {sortField === 'payment_status' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '8%', textAlign: 'center' }}>입금 확인</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginStats.unpaidList.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>정산 대기 중인 미수금 내역이 없습니다. (No pending receivables.)</td>
                      </tr>
                    ) : (
                      sortDevices(marginStats.unpaidList).map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700 }}>{item.sale_date || '-'}</td>
                          <td style={{ fontWeight: 700 }}>{item.model_name}</td>
                          <td className="font-mono" style={{ fontSize: '11px' }}>{item.imei}</td>
                          <td>
                            {/* Customer Name */}
                            <div style={{ marginBottom: '6px' }}>
                              {editingCell?.id === item.id && editingCell?.field === 'customer_name' ? (
                                <input
                                  type="text"
                                  value={editCellValue}
                                  onChange={(e) => setEditCellValue(e.target.value)}
                                  onBlur={() => handleInlineSave(item.id, 'customer_name', editCellValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(item.id, 'customer_name', editCellValue);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="form-input"
                                  style={{ margin: 0, padding: '4px 6px', fontSize: '11px', height: '26px', width: '100%', boxSizing: 'border-box' }}
                                />
                              ) : (
                                <div
                                  style={{ cursor: 'pointer', fontWeight: 700, color: item.customer_name ? 'var(--t1)' : 'var(--t3)', fontSize: '12.5px', textDecoration: 'underline dotted var(--border)' }}
                                  onClick={() => {
                                    setEditingCell({ id: item.id, field: 'customer_name' });
                                    setEditCellValue(item.customer_name || '');
                                  }}
                                  title="클릭하여 성함 수정"
                                >
                                  👤 {item.customer_name || '미기입'}
                                </div>
                              )}
                            </div>

                            {/* Customer Phone */}
                            <div>
                              {editingCell?.id === item.id && editingCell?.field === 'customer_phone' ? (
                                <input
                                  type="text"
                                  value={editCellValue}
                                  onChange={(e) => setEditCellValue(e.target.value)}
                                  onBlur={() => handleInlineSave(item.id, 'customer_phone', editCellValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(item.id, 'customer_phone', editCellValue);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="form-input"
                                  style={{ margin: 0, padding: '4px 6px', fontSize: '11px', height: '26px', width: '100%', boxSizing: 'border-box' }}
                                />
                              ) : (
                                <div
                                  style={{ cursor: 'pointer', fontWeight: 500, color: item.customer_phone ? 'var(--t2)' : 'var(--t3)', fontSize: '11px', textDecoration: 'underline dotted var(--border)' }}
                                  onClick={() => {
                                    setEditingCell({ id: item.id, field: 'customer_phone' });
                                    setEditCellValue(item.customer_phone || '');
                                  }}
                                  title="클릭하여 연락처 수정"
                                >
                                  📞 {item.customer_phone || '미기입'}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>{getSaleDetailsLabel(item)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: item.payment_status === 'unpaid' ? 'var(--red)' : '#d97706' }}>
                            ฿{item.payment_status === 'unpaid' ? formatPrice(item.cod_amount || 0) : formatPrice((item.installment_months || 0) * (item.installment_amount || 0))}
                          </td>
                          <td style={{ textAlign: 'center' }}>{getPaymentStatusBadge(item.payment_status)}</td>
                          <td style={{ textAlign: 'center' }}>
                            {item.payment_status === 'unpaid' && (
                              <button
                                type="button"
                                className="btn-sm btn-green"
                                onClick={() => handleConfirmPayment(item.id)}
                                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800, margin: 0 }}
                              >
                                입금 완료
                              </button>
                            )}
                            {item.payment_status === 'collecting' && (
                              <button
                                type="button"
                                className="btn-sm btn-blue"
                                onClick={() => handleConfirmPayment(item.id)}
                                style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800, margin: 0 }}
                              >
                                완납 처리
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part 2: Complete Margin Ledger */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📊</span> 전체 판매 마진 대장 (Completed Margin Log)
              </h4>
              <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="tbl" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                        판매일 {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                        기기 정보 {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '12%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                        매입원가 {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '12%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                        소매판매가 {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '25%' }}>판매 상세 (Payment Details)</th>
                      <th style={{ width: '10%', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('payment_status')}>
                        수납 상태 {sortField === 'payment_status' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '8%', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('seller_name')}>
                        담당자 {sortField === 'seller_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '8%', textAlign: 'right' }}>마진(예상)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginStats.soldList.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>판매 완료된 기기 내역이 없습니다. (No sales completed.)</td>
                      </tr>
                    ) : (
                      sortDevices(marginStats.soldList).map(item => {
                        const cost = item.purchase_cost_krw || 0;
                        const price = item.selling_price || 0;
                        return (
                          <tr key={item.id}>
                            <td>{item.sale_date || '-'}</td>
                            <td style={{ fontWeight: 700 }}>{item.model_name}</td>
                            <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{formatPrice(cost)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{formatPrice(price)}</td>
                            <td style={{ fontSize: '11.5px' }}>
                              {getSaleDetailsLabel(item)}
                              {item.installment_number && (
                                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--purple-l)', fontWeight: 800 }}>
                                  📄 {item.installment_number}
                                </div>
                              )}
                              <div style={{ marginTop: '2px', fontSize: '10.5px', color: 'var(--t2)', fontWeight: 'normal' }}>
                                👤{' '}
                                {editingCell?.id === item.id && editingCell?.field === 'customer_name' ? (
                                  <input
                                    type="text"
                                    value={editCellValue}
                                    onChange={(e) => setEditCellValue(e.target.value)}
                                    onBlur={() => handleInlineSave(item.id, 'customer_name', editCellValue)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineSave(item.id, 'customer_name', editCellValue);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    autoFocus
                                    className="form-input"
                                    style={{ margin: 0, padding: '2px 4px', fontSize: '10.5px', height: '22px', width: '80px', display: 'inline-block' }}
                                  />
                                ) : (
                                  <span
                                    style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--t1)', textDecoration: 'underline dotted var(--border)' }}
                                    onClick={() => {
                                      setEditingCell({ id: item.id, field: 'customer_name' });
                                      setEditCellValue(item.customer_name || '');
                                    }}
                                    title="클릭하여 수정"
                                  >
                                    {item.customer_name || '미기입'}
                                  </span>
                                )}
                                {item.customer_phone ? ` (${item.customer_phone})` : ''}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div>{getPaymentStatusBadge(item.payment_status)}</div>
                              {item.payment_status === 'paid' && (item.sale_type === 'cod' || item.sale_type === 'installment') && (
                                <button
                                  type="button"
                                  className="btn-sm btn-red"
                                  onClick={() => handleCancelPayment(item.id, item.sale_type)}
                                  style={{ padding: '2px 6px', fontSize: '9.5px', fontWeight: 800, marginTop: '4px', display: 'inline-block', cursor: 'pointer', margin: 0 }}
                                >
                                  완납 취소
                                </button>
                              )}
                            </td>
                            <td>{item.seller_name || '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>
                              ฿{formatPrice(price)}<br/>
                              <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 'normal' }}>(-₩{formatPrice(cost)})</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part 3: Monthly Customer Directory */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📞</span> Part 3: 월별 고객 연락처 및 수납 대장 (Monthly Customer & Accounts Directory)
                </h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={selectedCustomerMonth}
                    onChange={(e) => setSelectedCustomerMonth(e.target.value)}
                    className="form-input"
                    style={{ width: '150px', margin: 0, padding: '6px 12px', fontSize: '13px', height: '34px' }}
                  >
                    <option value="">전체 월 (All Months)</option>
                    {customerMonths.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCopyCustomerList}
                    className="btn-purple"
                    style={{ margin: 0, padding: '8px 12px', fontSize: '12px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none', color: '#fff' }}
                  >
                    📋 전체 고객 텍스트 복사
                  </button>
                </div>
              </div>

              <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="tbl" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '12%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                        판매일 {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '18%', cursor: 'pointer' }} onClick={() => toggleSort('customer_name')}>
                        고객명 (Customer) {sortField === 'customer_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '18%', cursor: 'pointer' }} onClick={() => toggleSort('customer_phone')}>
                        연락처 (Phone) {sortField === 'customer_phone' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '20%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                        기기 모델 (Device) {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '12%', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('payment_status')}>
                        수납 상태 {sortField === 'payment_status' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '12%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('cod_amount')}>
                        미수 금액 {sortField === 'cod_amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '8%', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('seller_name')}>
                        담당자 {sortField === 'seller_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomersForMonth.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>선택한 월에 해당하는 고객 내역이 없습니다. (No customer records for this month.)</td>
                      </tr>
                    ) : (
                      sortDevices(filteredCustomersForMonth).map(item => {
                        const balance = item.payment_status === 'unpaid' ? (item.cod_amount || 0) : item.payment_status === 'collecting' ? (item.installment_months || 0) * (item.installment_amount || 0) : 0;
                        return (
                          <tr key={item.id}>
                            <td>{item.sale_date || '-'}</td>
                            <td style={{ fontWeight: 700 }}>
                              {editingCell?.id === item.id && editingCell?.field === 'customer_name' ? (
                                <input
                                  type="text"
                                  value={editCellValue}
                                  onChange={(e) => setEditCellValue(e.target.value)}
                                  onBlur={() => handleInlineSave(item.id, 'customer_name', editCellValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(item.id, 'customer_name', editCellValue);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="form-input"
                                  style={{ margin: 0, padding: '4px 6px', fontSize: '11px', height: '26px', width: '100%', boxSizing: 'border-box' }}
                                />
                              ) : (
                                <div
                                  style={{ cursor: 'pointer', color: item.customer_name ? 'var(--t1)' : 'var(--t3)', textDecoration: 'underline dotted var(--border)' }}
                                  onClick={() => {
                                    setEditingCell({ id: item.id, field: 'customer_name' });
                                    setEditCellValue(item.customer_name || '');
                                  }}
                                  title="클릭하여 성함 수정"
                                >
                                  👤 {item.customer_name || '미기입'}
                                </div>
                              )}
                            </td>
                            <td>
                              {editingCell?.id === item.id && editingCell?.field === 'customer_phone' ? (
                                <input
                                  type="text"
                                  value={editCellValue}
                                  onChange={(e) => setEditCellValue(e.target.value)}
                                  onBlur={() => handleInlineSave(item.id, 'customer_phone', editCellValue)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(item.id, 'customer_phone', editCellValue);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="form-input"
                                  style={{ margin: 0, padding: '4px 6px', fontSize: '11px', height: '26px', width: '100%', boxSizing: 'border-box' }}
                                />
                              ) : (
                                <div
                                  style={{ cursor: 'pointer', color: item.customer_phone ? 'var(--t2)' : 'var(--t3)', textDecoration: 'underline dotted var(--border)' }}
                                  onClick={() => {
                                    setEditingCell({ id: item.id, field: 'customer_phone' });
                                    setEditCellValue(item.customer_phone || '');
                                  }}
                                  title="클릭하여 연락처 수정"
                                >
                                  📞 {item.customer_phone || '미기입'}
                                </div>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{item.model_name}</td>
                            <td style={{ textAlign: 'center' }}>{getPaymentStatusBadge(item.payment_status)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: balance > 0 ? 'var(--red)' : 'var(--t3)' }}>
                              {balance > 0 ? `฿${formatPrice(balance)}` : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>{item.seller_name || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>


          </div>
        )}

        {/* ==================== VIEW 6: TRASH BIN ==================== */}
        {activeTab === 'trash' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Trash Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                <input
                  type="text"
                  placeholder={t('staff_trash_search_placeholder') || t('staff_search_placeholder')}
                  value={trashSearchQuery}
                  onChange={(e) => setTrashSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '220px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                />
                {selectedIds.length > 0 && (
                  <>
                    <button 
                      style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--green)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkRestore}
                    >
                      🔄 {t('staff_btn_restore')} ({selectedIds.length})
                    </button>
                    <button 
                      style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkPermanentDelete}
                    >
                      🔥 {t('staff_btn_permanent_delete')} ({selectedIds.length})
                    </button>
                  </>
                )}
              </div>
              
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap' }}>
                {t('staff_trash_count_info', { count: filteredTrashDevices.length })}
              </div>
            </div>

            {/* Trash Grid Table */}
            <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredTrashDevices.length > 0 && filteredTrashDevices.every(d => selectedIds.includes(d.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => Array.from(new Set([...prev, ...filteredTrashDevices.map(d => d.id)])));
                          } else {
                            setSelectedIds(prev => prev.filter(id => !filteredTrashDevices.some(d => d.id === id)));
                          }
                        }}
                      />
                    </th>
                    <th style={{ width: '12%', cursor: 'pointer' }} onClick={() => toggleSort('sticker')}>
                      {t('staff_th_sticker')} {sortField === 'sticker' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                      {t('staff_th_model')} {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%' }}>IMEI</th>
                    <th style={{ width: '8%' }}>Color</th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                      {t('staff_th_purchase_cost')} {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('deleted_at')}>
                      {t('staff_th_deleted_at')} {sortField === 'deleted_at' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', textAlign: 'center' }}>{t('staff_th_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        {t('loading') || 'Loading trash bin...'}
                      </td>
                    </tr>
                  ) : filteredTrashDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        {t('staff_empty_trash') || '휴지통이 비어 있습니다.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTrashDevices.map(item => (
                      <tr key={item.id} style={{ background: '#fcfcfc' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, item.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--purple-l)' }}>{item.sticker || '-'}</td>
                        <td style={{ fontWeight: 700, wordBreak: 'break-all' }}>{item.model_name}</td>
                        <td className="font-mono" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{item.imei}</td>
                        <td>{item.color || '-'}</td>
                        <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{formatPrice(item.purchase_cost_krw)}</td>
                        <td style={{ fontSize: '11px', color: 'var(--red)' }}>
                          {item.deleted_at ? new Date(item.deleted_at).toLocaleString('ko-KR') : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className="btn-green"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedIds([item.id]);
                                setTimeout(() => handleBulkRestore(), 50);
                              }}
                              title={t('staff_tooltip_restore') || "복원"}
                            >
                              🔄
                            </button>
                            <button
                              className="btn-red"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedIds([item.id]);
                                setTimeout(() => handleBulkPermanentDelete(), 50);
                              }}
                              title={t('staff_tooltip_permanent_delete') || "영구삭제"}
                            >
                              🔥
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>

      {/* BULK INTAKE MODAL */}
      {isCSVModalOpen && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }} onClick={() => setIsCSVModalOpen(false)}>
          <div className="modal animate-slide-up" style={{ maxWidth: '650px', width: '90%', background: '#fff', borderRadius: '16px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="modal-title" style={{ fontSize: '16px', fontWeight: 800 }}>{t('staff_bulk_import_title') || '📥 대량 기기 입고 (Bulk Device Ingestion)'}</span>
              <button className="modal-x" onClick={() => setIsCSVModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              {/* Method Switcher Tabs */}
              <div className="auth-tabs" style={{ display: 'flex', background: 'rgba(0, 0, 0, .03)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                <button 
                  type="button"
                  className={`tab-btn ${intakeMethod === 'file' ? 'active' : ''}`}
                  onClick={() => setIntakeMethod('file')}
                  style={{ flex: 1, padding: '10px', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}
                >
                  {t('staff_tab_csv') || '📁 CSV 파일 업로드'}
                </button>
                <button 
                  type="button"
                  className={`tab-btn ${intakeMethod === 'paste' ? 'active' : ''}`}
                  onClick={() => setIntakeMethod('paste')}
                  style={{ flex: 1, padding: '10px', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}
                >
                  {t('staff_tab_paste') || '📋 복사 붙여넣기 (Ctrl+C/V)'}
                </button>
              </div>

              {/* METHOD 2: CSV File Upload */}
              {intakeMethod === 'file' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--t2)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>{t('staff_csv_info_title') || '📁 CSV 파일 내보내기 안내'}</h4>
                    <p>{t('staff_csv_info_1') || '구글 스프레드시트 또는 엑셀에서 [파일] ➔ [다운로드] ➔ [쉼표로 구분된 값(.csv)]으로 저장한 뒤 아래에 업로드해 주세요.'}</p>
                  </div>

                  <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', background: '#f8fafc', position: 'relative' }}>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      style={{ display: 'block', margin: '0 auto 12px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{t('staff_csv_info_2') || 'UTF-8 인코딩 형식의 파일만 지원됩니다.'}</span>
                  </div>

                  {csvFileText && (
                    <div className="animate-fade-in" style={{ marginTop: '8px' }}>
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', marginBottom: '6px', display: 'block' }}>
                        {t('staff_csv_preview') || '📄 로드된 CSV 파일 데이터 일부 미리보기'}
                      </label>
                      <textarea
                        rows={4}
                        readOnly
                        value={csvFileText.slice(0, 1000) + (csvFileText.length > 1000 ? '\n...[생략]...' : '')}
                        className="form-textarea"
                        style={{ fontSize: '11px', fontFamily: 'monospace', background: '#f1f5f9', color: '#334155', resize: 'none' }}
                      />
                    </div>
                  )}

                  <button 
                    type="button"
                    className="btn-submit" 
                    onClick={handleCSVImport} 
                    disabled={importingCSV || !csvFileText}
                    style={{ margin: '8px 0 0' }}
                  >
                    {importingCSV ? (t('staff_btn_csv_upload_loading') || '🔄 기기 업로드 처리 중...') : (t('staff_btn_csv_upload') || '🚀 업로드된 CSV 데이터 일괄 등록')}
                  </button>
                </div>
              )}

              {/* METHOD 3: Clipboard Copy Paste */}
              {intakeMethod === 'paste' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--t2)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>{t('staff_paste_info_title') || '📋 복사 붙여넣기(Ctrl+C / Ctrl+V) 안내'}</h4>
                    <p>{t('staff_paste_info_1') || '엑셀 이나 구글 시트의 데이터 영역(행들과 열들)을 마우스 드래그로 복사(Ctrl+C)한 후, 아래 입력창에 바로 붙여넣기(Ctrl+V) 하시면 자동으로 탭 구분 기호를 분석하여 즉시 입고합니다.'}</p>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', marginBottom: '6px', display: 'block' }}>
                      {t('staff_paste_input_label') || '✍️ 여기에 복사한 데이터 붙여넣기'}
                    </label>
                    <textarea
                      rows={6}
                      placeholder={t('staff_paste_placeholder') || "구글 시트의 행 영역을 복사해서 붙여넣으세요..."}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      className="form-textarea"
                      style={{ fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.4' }}
                    />
                  </div>

                  <button 
                    type="button"
                    className="btn-submit" 
                    onClick={handlePasteImport} 
                    disabled={importingCSV || !pasteText.trim()}
                    style={{ margin: '8px 0 0' }}
                  >
                    {importingCSV ? (t('staff_btn_paste_upload_loading') || '🔄 붙여넣은 데이터 구문 분석 및 등록 중...') : (t('staff_btn_paste_upload') || '🚀 붙여넣은 데이터 일괄 등록')}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
              <button 
                type="button"
                className="btn-sm btn-red" 
                onClick={() => {
                  setIsCSVModalOpen(false);
                  setCsvFileText('');
                  setPasteText('');
                }} 
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}
              >
                {t('staff_btn_close_dialog') || '닫기 (Close)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMEI AUDITOR MODAL */}
      {isAuditModalOpen && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }} onClick={() => setIsAuditModalOpen(false)}>
          <div className="modal animate-slide-up" style={{ maxWidth: '850px', width: '95%', background: '#fff', borderRadius: '16px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="modal-title" style={{ fontSize: '16px', fontWeight: 800 }}>🔍 IMEI 재고 실사 비교기 (IMEI Inventory Auditor)</span>
              <button className="modal-x" onClick={() => setIsAuditModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--t2)' }}>
                <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '4px' }}>💡 사용 방법</h4>
                <p style={{ margin: 0 }}>
                  실사 및 확인하려는 IMEI 리스트를 아래 입력창에 줄바꿈 또는 공백으로 구분하여 붙여넣으세요.
                  현재 사내 재고 목록(입고 대기 DHL 제외)과 실시간으로 비교하여 미등록 및 누락 기기를 분류합니다.
                </p>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', marginBottom: '6px', display: 'block' }}>
                  ✍️ 비교할 IMEI 리스트 붙여넣기
                </label>
                <textarea
                  rows={5}
                  placeholder="예:&#10;356630558151225&#10;353854130184776&#10;864809043231439"
                  value={auditText}
                  onChange={(e) => setAuditText(e.target.value)}
                  className="form-textarea"
                  style={{ fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.4', width: '100%', resize: 'vertical' }}
                />
              </div>

              {auditText.trim() ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setAuditActiveTab('not_in_db')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        borderBottom: auditActiveTab === 'not_in_db' ? '2px solid var(--purple-l)' : '2px solid transparent',
                        background: 'none',
                        color: auditActiveTab === 'not_in_db' ? 'var(--purple-l)' : 'var(--t2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ❌ 미등록 기기 ({auditResults.notInInventory.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditActiveTab('not_in_paste')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        borderBottom: auditActiveTab === 'not_in_paste' ? '2px solid var(--purple-l)' : '2px solid transparent',
                        background: 'none',
                        color: auditActiveTab === 'not_in_paste' ? 'var(--purple-l)' : 'var(--t2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ⚠️ 재고 누락 의심 ({auditResults.missingFromPasted.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditActiveTab('matched')}
                      style={{
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        borderBottom: auditActiveTab === 'matched' ? '2px solid var(--purple-l)' : '2px solid transparent',
                        background: 'none',
                        color: auditActiveTab === 'matched' ? 'var(--purple-l)' : 'var(--t2)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      ✅ 일치 재고 ({auditResults.matchedDevices.length})
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                    
                    {/* TAB 1: NOT IN DB */}
                    {auditActiveTab === 'not_in_db' && (
                      <div>
                        {auditResults.notInInventory.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)', fontSize: '13px' }}>
                            입력하신 모든 IMEI가 현재 사내 재고에 등록되어 있습니다.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                              <button
                                type="button"
                                className="btn-sm btn-blue"
                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                                onClick={() => {
                                  const textToCopy = auditResults.notInInventory.map(item => item.imei).join('\n');
                                  navigator.clipboard.writeText(textToCopy);
                                  alert('미등록 기기 IMEI 리스트가 클립보드에 복사되었습니다.');
                                }}
                              >
                                📋 IMEI 목록 복사
                              </button>
                            </div>
                            <table className="tbl" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '40%' }}>IMEI</th>
                                  <th style={{ width: '25%', textAlign: 'center' }}>상태</th>
                                  <th style={{ width: '35%' }}>DB 정보</th>
                                </tr>
                              </thead>
                              <tbody>
                                {auditResults.notInInventory.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="font-mono" style={{ fontSize: '12px', fontWeight: 700 }}>{item.imei}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span style={{
                                        background: item.badgeColor + '1a',
                                        color: item.badgeColor,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 800
                                      }}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td style={{ fontSize: '11.5px', color: 'var(--t2)' }}>
                                      {item.deviceDetail || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: NOT IN PASTE (MISSING FROM SCAN) */}
                    {auditActiveTab === 'not_in_paste' && (
                      <div>
                        {auditResults.missingFromPasted.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)', fontSize: '13px' }}>
                            현재 사내 재고에 등록된 모든 기기가 입력하신 리스트에 포함되어 있습니다.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                              <button
                                type="button"
                                className="btn-sm btn-blue"
                                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                                onClick={() => {
                                  const textToCopy = auditResults.missingFromPasted.map(item => item.imei).filter(Boolean).join('\n');
                                  navigator.clipboard.writeText(textToCopy);
                                  alert('누락 의심 기기 IMEI 리스트가 클립보드에 복사되었습니다.');
                                }}
                              >
                                📋 IMEI 목록 복사
                              </button>
                            </div>
                            <table className="tbl" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '25%' }}>스티커 번호</th>
                                  <th style={{ width: '35%' }}>모델명</th>
                                  <th style={{ width: '40%' }}>IMEI</th>
                                </tr>
                              </thead>
                              <tbody>
                                {auditResults.missingFromPasted.map((item, idx) => (
                                  <tr key={idx}>
                                    <td style={{ color: 'var(--t2)', fontSize: '11.5px' }}>{item.sticker || '-'}</td>
                                    <td style={{ fontWeight: 700, fontSize: '11.5px' }}>{item.model_name}</td>
                                    <td className="font-mono" style={{ fontSize: '12px' }}>{item.imei}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: MATCHED */}
                    {auditActiveTab === 'matched' && (
                      <div>
                        {auditResults.matchedDevices.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)', fontSize: '13px' }}>
                            입력하신 리스트와 일치하는 사내 재고 기기가 없습니다.
                          </div>
                        ) : (
                          <table className="tbl" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '25%' }}>스티커 번호</th>
                                <th style={{ width: '35%' }}>모델명</th>
                                <th style={{ width: '40%' }}>IMEI</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditResults.matchedDevices.map((item, idx) => (
                                  <tr key={idx}>
                                    <td style={{ color: 'var(--t2)', fontSize: '11.5px' }}>{item.sticker || '-'}</td>
                                    <td style={{ fontWeight: 700, fontSize: '11.5px' }}>{item.model_name}</td>
                                    <td className="font-mono" style={{ fontSize: '12px' }}>{item.imei}</td>
                                  </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--t2)', fontSize: '13px', background: '#fafafa', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  📝 위에 IMEI 리스트를 붙여넣으시면 실시간으로 비교 분석 결과가 여기에 표시됩니다.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
              <button 
                type="button"
                className="btn-sm btn-red" 
                onClick={() => setIsAuditModalOpen(false)} 
                style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}
              >
                닫기 (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL INTAKE & EDIT MODAL */}
      {isManualModalOpen && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '500px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <span className="modal-title">
                {editingDevice ? t('staff_modal_edit_device') : t('staff_modal_add_device')}
              </span>
              <button className="modal-x" onClick={() => {
                setIsManualModalOpen(false);
                setEditingDevice(null);
              }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px', maxHeight: '65vh', overflowY: 'auto' }}>
              
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_sticker')}</label>
                <input
                  type="text"
                  placeholder="M080174753"
                  value={sticker}
                  onChange={(e) => setSticker(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                  disabled={!!editingDevice && staffProfile?.role !== 'admin'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_model')}</label>
                <select
                  value={isCustomModel ? '___new___' : modelName}
                  onChange={(e) => handleModelSelectChange(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                  disabled={!!editingDevice && staffProfile?.role !== 'admin'}
                >
                  <option value="">{t('staff_select_model_placeholder')}</option>
                  {modelOptions.map((mod) => (
                    <option key={mod.id} value={mod.name}>{mod.name}</option>
                  ))}
                  <option value="___new___" style={{ color: 'var(--purple)', fontWeight: 700 }}>{t('staff_select_model_new')}</option>
                </select>
                
                {isCustomModel && (
                  <div className="animate-slide-up" style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder={t('staff_placeholder_model_example') || '예: iPhone 15 Pro 128GB'}
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, borderColor: 'var(--purple)' }}
                      disabled={!!editingDevice && staffProfile?.role !== 'admin'}
                    />
                    <small style={{ color: 'var(--purple)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {t('staff_model_auto_add_notice')}
                    </small>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_imei')}</label>
                <input
                  type="text"
                  placeholder="353884196315840"
                  disabled={!!editingDevice}
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_color')}</label>
                <input
                  type="text"
                  placeholder="BLACK"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_battery_screen')}</label>
                <input
                  type="text"
                  placeholder={t('staff_placeholder_battery_example') || '85 또는 จอปลอม'}
                  value={batteryPct}
                  onChange={(e) => setBatteryPct(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_location')}</label>
                <select
                  value={isCustomLocation ? '___new___' : location}
                  onChange={(e) => handleLocationSelectChange(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">{t('staff_select_location_placeholder')}</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                  <option value="___new___" style={{ color: 'var(--purple)', fontWeight: 700 }}>{t('staff_select_location_new')}</option>
                </select>

                {isCustomLocation && (
                  <div className="animate-slide-up" style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder={t('staff_placeholder_location_example') || '예: Mr.han 2층'}
                      value={customLocationName}
                      onChange={(e) => setCustomLocationName(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, borderColor: 'var(--purple)' }}
                    />
                    <small style={{ color: 'var(--purple)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {t('staff_location_auto_add_notice')}
                    </small>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_purchase_cost')}</label>
                <input
                  type="number"
                  placeholder="550000"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_selling_price')}</label>
                <input
                  type="number"
                  placeholder="14900"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_intake_date')}</label>
                <input
                  type="text"
                  placeholder="26. 6. 8."
                  value={siteDate}
                  onChange={(e) => setSiteDate(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                  disabled={!!editingDevice && staffProfile?.role !== 'admin'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_notes')}</label>
                <textarea
                  placeholder={t('staff_label_notes_placeholder') || '스크래치, 부품 교체 기록 등...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                  style={{ margin: 0 }}
                />
              </div>

            </div>

            <div style={{ display: 'flex', gap: '8px', padding: '0 20px 20px' }}>
              <button 
                className="btn-submit" 
                onClick={handleSaveManualIntake} 
                disabled={savingDevice}
                style={{ flex: 1, margin: 0 }}
              >
                {savingDevice ? t('loading') : t('staff_btn_save')}
              </button>
              <button 
                className="btn-sm btn-red" 
                onClick={() => {
                  setIsManualModalOpen(false);
                  setEditingDevice(null);
                }} 
                style={{ padding: '14px 20px', borderRadius: 'var(--r)' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELL DEVICE ACTION MODAL */}
      {sellingDevice && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '450px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <span className="modal-title">{t('staff_modal_sale_title')}</span>
              <button className="modal-x" onClick={() => setSellingDevice(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                {t('staff_label_device_name')}: <b style={{ color: 'var(--purple-l)' }}>{sellingDevice.model_name}</b><br />
                IMEI: <span className="font-mono">{sellingDevice.imei}</span>
              </p>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_sale_date')} *</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_seller')} *</label>
                <select
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">{t('staff_select_seller_placeholder')}</option>
                  {staffMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">판매 방식 (Sale Type) *</label>
                <select
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value as any)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="transfer">송금 완납 (Full Transfer)</option>
                  <option value="cash">현금 완납 (Cash Payment)</option>
                  <option value="cod">보증금 + COD 발송 (Deposit + COD)</option>
                  <option value="installment">보증금 + 할부 판매 (Deposit + Installments)</option>
                  <option value="exchange">기기 보상/맞교환 (Trade-in / Swap)</option>
                </select>
              </div>

              {/* Customer Info (Required for Installments, Optional for others) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">고객 성함 (Customer Name) {saleType === 'installment' ? '*' : ''}</label>
                  <input
                    type="text"
                    placeholder="예: 홍길동"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">고객 연락처 (Customer Phone) {saleType === 'installment' ? '*' : ''}</label>
                  <input
                    type="text"
                    placeholder="예: 010-1234-5678"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                </div>
              </div>

              {/* Installment Number Input Group (Only for Installments) */}
              {saleType === 'installment' && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">할부 번호 (Installment No.) *</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      background: 'var(--bg2)', 
                      padding: '10px 14px', 
                      border: '1px solid var(--border)', 
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: 'var(--t2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '42px',
                      boxSizing: 'border-box'
                    }}>
                      IRIS
                    </span>
                    <input
                      type="text"
                      placeholder="000125"
                      value={instNumber}
                      onChange={(e) => setInstNumber(e.target.value.replace(/[^\d]/g, ''))}
                      className="form-input"
                      style={{ 
                        margin: 0, 
                        borderRadius: '0 8px 8px 0',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Conditional rows */}
              {(saleType === 'transfer' || saleType === 'cash') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">보증금 (Deposit)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="form-input"
                      style={{ margin: 0 }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{saleType === 'transfer' ? '송금액 (Transfer Amount)' : '현금액 (Cash Amount)'}</label>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="form-input"
                      style={{ margin: 0 }}
                    />
                  </div>
                </div>
              )}

              {saleType === 'cod' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">보증금 (Deposit)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="form-input"
                      style={{ margin: 0 }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">COD 금액 (COD Amount)</label>
                    <input
                      type="number"
                      value={codAmountInput}
                      onChange={(e) => setCodAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                      className="form-input"
                      style={{ margin: 0 }}
                    />
                  </div>
                </div>
              )}

              {saleType === 'installment' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">보증금 (Deposit)</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="form-input"
                        style={{ margin: 0 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">할부 개월 수 (Months)</label>
                      <select
                        value={instMonths}
                        onChange={(e) => setInstMonths(Number(e.target.value))}
                        className="form-input"
                        style={{ margin: 0 }}
                      >
                        <option value="3">3개월 (3 Months)</option>
                        <option value="4">4개월 (4 Months)</option>
                        <option value="6">6개월 (6 Months)</option>
                        <option value="8">8개월 (8 Months)</option>
                        <option value="10">10개월 (10 Months)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">월 할부금 (Monthly Payment)</label>
                      <input
                        type="number"
                        value={instMonthlyPayment}
                        onChange={(e) => setInstMonthlyPayment(e.target.value === '' ? '' : Number(e.target.value))}
                        className="form-input"
                        style={{ margin: 0 }}
                      />
                    </div>
                  </div>
                </>
              )}

              {saleType === 'exchange' && (
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
              )}

              {/* Total final price block */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>최종 판매 금액 (Total Selling Price)</span>
                <b style={{ fontSize: '20px', color: 'var(--green)' }}>฿{calculatedFinalPrice.toLocaleString()}</b>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_sale_memo')}</label>
                <input
                  type="text"
                  placeholder={t('staff_label_sale_memo_placeholder')}
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', padding: '0 20px 20px' }}>
              <button 
                className="btn-submit" 
                onClick={handleProcessSale} 
                disabled={processingSale}
                style={{ flex: 1, margin: 0, background: 'var(--green)' }}
              >
                {processingSale ? t('loading') : t('staff_btn_approve_sale')}
              </button>
              <button 
                className="btn-sm btn-red" 
                onClick={() => setSellingDevice(null)} 
                style={{ padding: '14px 20px', borderRadius: 'var(--r)' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESERVATION ACTION MODAL */}
      {reservingDevice && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '450px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <span className="modal-title">{t('staff_modal_reserve_title')}</span>
              <button className="modal-x" onClick={() => setReservingDevice(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                {t('staff_label_device_name')}: <b style={{ color: 'var(--purple-l)' }}>{reservingDevice.model_name}</b><br />
                IMEI: <span className="font-mono">{reservingDevice.imei}</span>
              </p>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_reserver')}</label>
                <select
                  value={reserverName}
                  onChange={(e) => setReserverName(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">{t('staff_select_reserver_placeholder')}</option>
                  {staffMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_reserve_memo')}</label>
                <input
                  type="text"
                  placeholder={t('staff_label_reserve_memo_placeholder')}
                  value={reservationNotes}
                  onChange={(e) => setReservationNotes(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', padding: '0 20px 20px' }}>
              <button 
                className="btn-submit" 
                onClick={handleProcessReservation} 
                disabled={processingReservation}
                style={{ flex: 1, margin: 0, background: '#f59e0b', color: '#fff' }}
              >
                {processingReservation ? t('loading') : t('staff_btn_confirm_reserve')}
              </button>
              <button 
                className="btn-sm btn-red" 
                onClick={() => setReservingDevice(null)} 
                style={{ padding: '14px 20px', borderRadius: 'var(--r)' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST ALERT */}
      {toast && (
        <div className="toast show" style={{ zIndex: 9999 }}>
          <div className={`toast-content ${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}

    </div>
  );
}
