'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';
import { INTEREST_TABLE, getClosestPrice } from '@/lib/interestTable';
import * as XLSX from 'xlsx';

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

const standardColors = ['BLACK', 'BLUE', 'BRONZE', 'PINK', 'WHITE', 'GOLD', 'GRAY', 'GREEN', 'PURPLE', 'YELLOW', 'SILVER', 'RED', 'ORANGE', 'CREAM', 'TITANIUM'];

const normalizeColor = (colorStr: string): string => {
  if (!colorStr) return '';
  const clean = colorStr.toLowerCase().replace(/\s+/g, '');
  if (clean.includes('black') || clean.includes('블랙')) return 'BLACK';
  if (clean.includes('white') || clean.includes('화이트') || clean.includes('스타라이트') || clean.includes('starlight')) return 'WHITE';
  if (clean.includes('silver') || clean.includes('실버')) return 'SILVER';
  if (clean.includes('gray') || clean.includes('grey') || clean.includes('그레이') || clean.includes('그라파이트')) return 'GRAY';
  if (clean.includes('gold') || clean.includes('골드') || clean.includes('골우') || clean.includes('golw')) return 'GOLD';
  if (clean.includes('yellow') || clean.includes('옐로우') || clean.includes('노랑') || clean.includes('옐로')) return 'YELLOW';
  if (clean.includes('blue') || clean.includes('블루') || clean.includes('파랑')) return 'BLUE';
  if (clean.includes('green') || clean.includes('그린') || clean.includes('초록')) return 'GREEN';
  if (clean.includes('red') || clean.includes('레드') || clean.includes('빨강')) return 'RED';
  if (clean.includes('pink') || clean.includes('핑크') || clean.includes('코랄')) return 'PINK';
  if (clean.includes('purple') || clean.includes('퍼플') || clean.includes('보라') || clean.includes('라벤더')) return 'PURPLE';
  if (clean.includes('bronze') || clean.includes('브론즈')) return 'BRONZE';
  if (clean.includes('cream') || clean.includes('크림') || clean.includes('아이보리')) return 'CREAM';
  if (clean.includes('titanium') || clean.includes('티타늄') || clean.includes('내추럴') || clean.includes('내츄럴') || clean.includes('디저트') || clean.includes('네추럴')) return 'TITANIUM';
  if (clean.includes('orange') || clean.includes('오렌지') || clean.includes('orang')) return 'ORANGE';
  
  return colorStr.toUpperCase();
};

const formatMonthDropdownLabel = (ymStr: string, lang: string) => {
  if (!ymStr || ymStr === 'all') return ymStr;
  const parts = ymStr.split('-');
  if (parts.length === 2) {
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    if (lang === 'ko') {
      return `${y}년 ${m}월`;
    } else if (lang === 'th') {
      const thaiMonthsFull = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      return `${thaiMonthsFull[m - 1] || parts[1]} ${y}`;
    } else {
      const engMonthsFull = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${engMonthsFull[m - 1] || parts[1]} ${y}`;
    }
  }
  return ymStr;
};

const isDHL = (loc?: string) => {
  return (loc || '').trim().toUpperCase() === 'DHL';
};

const getMonthLabel = (ymStr: string, lang: string) => {
  if (!ymStr || ymStr === 'all') {
    return lang === 'ko' ? '모든 월' : (lang === 'th' ? 'ทุกเดือน' : 'All Months');
  }
  const parts = ymStr.split('-');
  if (parts.length === 2) {
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const shortYear = y.length === 4 ? y.substring(2) : y;
    if (lang === 'ko') {
      return `${shortYear}년 ${m}월`;
    } else if (lang === 'th') {
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return `${thaiMonths[m - 1] || parts[1]} ${shortYear}`;
    } else {
      const engMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${engMonths[m - 1] || parts[1]} '${shortYear}`;
    }
  }
  return ymStr;
};

const DEFAULT_CATEGORIES = [
  { id: '10000000-0000-0000-0000-000000000000', name: '매장 운영비', level: 'large', parent_id: null },
  { id: '20000000-0000-0000-0000-000000000000', name: '기기 매입비', level: 'large', parent_id: null },
  { id: '11000000-0000-0000-0000-000000000000', name: '임대료', level: 'medium', parent_id: '10000000-0000-0000-0000-000000000000' },
  { id: '12000000-0000-0000-0000-000000000000', name: '공과금', level: 'medium', parent_id: '10000000-0000-0000-0000-000000000000' },
  { id: '13000000-0000-0000-0000-000000000000', name: '인건비', level: 'medium', parent_id: '10000000-0000-0000-0000-000000000000' },
  { id: '21000000-0000-0000-0000-000000000000', name: '본사 송금', level: 'medium', parent_id: '20000000-0000-0000-0000-000000000000' },
  { id: '11100000-0000-0000-0000-000000000000', name: '월세', level: 'small', parent_id: '11000000-0000-0000-0000-000000000000' },
  { id: '11200000-0000-0000-0000-000000000000', name: '보증금', level: 'small', parent_id: '11000000-0000-0000-0000-000000000000' },
  { id: '12100000-0000-0000-0000-000000000000', name: '전기세', level: 'small', parent_id: '12000000-0000-0000-0000-000000000000' },
  { id: '12200000-0000-0000-0000-000000000000', name: '수도세', level: 'small', parent_id: '12000000-0000-0000-0000-000000000000' },
  { id: '12300000-0000-0000-0000-000000000000', name: '인터넷', level: 'small', parent_id: '12000000-0000-0000-0000-000000000000' },
  { id: '13100000-0000-0000-0000-000000000000', name: '급여', level: 'small', parent_id: '13000000-0000-0000-0000-000000000000' },
  { id: '21100000-0000-0000-0000-000000000000', name: '기기 대금', level: 'small', parent_id: '21000000-0000-0000-0000-000000000000' }
];

export default function StaffDashboard() {
  const router = useRouter();
  const { t, lang, changeLanguage } = useTranslation();

  // Authentication & Profile States
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  // Role-based Permissions State
  const [rolePermissions, setRolePermissions] = useState<any>({
    admin: { 
      can_view_margin: true, 
      can_view_margin_detail: true, 
      can_edit_price: true, 
      can_edit_cost: true, 
      can_edit_battery: true,
      can_edit_core_device_fields: true,
      can_approve_sale: true,
      can_edit_customer_info: true,
      can_permanent_delete: true,
      can_view_trash: true
    },
    manager: { 
      can_view_margin: true, 
      can_view_margin_detail: false, 
      can_edit_price: true, 
      can_edit_cost: true, 
      can_edit_battery: true,
      can_edit_core_device_fields: false,
      can_approve_sale: false,
      can_edit_customer_info: false,
      can_permanent_delete: false,
      can_view_trash: false
    },
    staff: { 
      can_view_margin: false, 
      can_view_margin_detail: false, 
      can_edit_price: false, 
      can_edit_cost: false, 
      can_edit_battery: false,
      can_edit_core_device_fields: false,
      can_approve_sale: false,
      can_edit_customer_info: false,
      can_permanent_delete: false,
      can_view_trash: false
    }
  });

  const currentUserRole = staffProfile?.role || 'staff';
  const currentPermissions = rolePermissions[currentUserRole] || {
    can_view_margin: false,
    can_view_margin_detail: false,
    can_edit_price: false,
    can_edit_cost: false,
    can_edit_battery: false,
    can_edit_core_device_fields: false,
    can_approve_sale: false,
    can_edit_customer_info: false,
    can_permanent_delete: false,
    can_view_trash: false
  };

  const hideMargin = currentUserRole !== 'admin' && !currentPermissions.can_view_margin_detail;

  const loadRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('settings_role_permissions')
        .select('*');
      
      if (error) {
        console.warn('settings_role_permissions table not found, using default permissions.', error.message);
        return;
      }
      
      if (data && data.length > 0) {
        setRolePermissions((prev: any) => {
          const newPerms = { ...prev };
          data.forEach((row: any) => {
            if (newPerms[row.role]) {
              newPerms[row.role] = {
                can_view_margin: !!row.can_view_margin,
                can_view_margin_detail: !!row.can_view_margin_detail,
                can_edit_price: !!row.can_edit_price,
                can_edit_cost: !!row.can_edit_cost,
                can_edit_battery: !!row.can_edit_battery,
                can_edit_core_device_fields: !!row.can_edit_core_device_fields,
                can_approve_sale: !!row.can_approve_sale,
                can_edit_customer_info: !!row.can_edit_customer_info,
                can_permanent_delete: !!row.can_permanent_delete,
                can_view_trash: !!row.can_view_trash
              };
            }
          });
          return newPerms;
        });
      }
    } catch (e) {
      console.error('Error loading role permissions:', e);
    }
  };

  const handleTogglePermission = async (role: string, field: string) => {
    if (role === 'admin') return;
    
    const updatedRolePerms = {
      ...rolePermissions[role],
      [field]: !rolePermissions[role][field]
    };
    
    setRolePermissions((prev: any) => ({
      ...prev,
      [role]: updatedRolePerms
    }));
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('role_permissions', JSON.stringify({
        ...rolePermissions,
        [role]: updatedRolePerms
      }));
    }
    
    try {
      const { error } = await supabase
        .from('settings_role_permissions')
        .upsert({
          role,
          ...updatedRolePerms
        }, { onConflict: 'role' });
      
      if (error) {
        console.warn('Upsert settings_role_permissions failed, table may not exist:', error.message);
      } else {
        showToast(t('toast_inline_save_success') || '권한이 변경되었습니다.', 'success');
      }
    } catch (e) {
      console.error('Error saving permission:', e);
    }
  };

  // Active Tab: 'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin' | 'installment' | 'pending_intake' | 'history_log' | 'cod' | 'customers' | 'partner_transfer'
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin' | 'installment' | 'pending_intake' | 'history_log' | 'cod' | 'customers' | 'partner_transfer'>('overview');

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
  const [partnerShareFilter, setPartnerShareFilter] = useState<'all' | 'shared' | 'unshared'>('all');
  const [selectedStatsLocation, setSelectedStatsLocation] = useState('all');
  const [soldSelectedDays, setSoldSelectedDays] = useState<number[]>([]);
  const [soldSelectedMonth, setSoldSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [marginSelectedMonths, setMarginSelectedMonths] = useState<string[]>(() => {
    const today = new Date();
    return [`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`];
  });
  const [isMarginMonthFilterOpen, setIsMarginMonthFilterOpen] = useState(false);
  const [instSelectedMonth, setInstSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showMonthPaidOnly, setShowMonthPaidOnly] = useState(false);
  const [showFullyPaidOnly, setShowFullyPaidOnly] = useState(false);
  const [isInstallmentPrintModalOpen, setIsInstallmentPrintModalOpen] = useState(false);
  const [instPrintStartDay, setInstPrintStartDay] = useState(1);
  const [instPrintEndDay, setInstPrintEndDay] = useState(31);
  const [isGlobalSearchHelperCollapsed, setIsGlobalSearchHelperCollapsed] = useState(false);
  const [codSelectedMonth, setCodSelectedMonth] = useState('all');
  const [codSearchQuery, setCodSearchQuery] = useState('');
  const [codStatusFilter, setCodStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [custSearch, setCustSearch] = useState('');
  const [isDayFilterOpen, setIsDayFilterOpen] = useState(false);

  // Intake Modals (Manual & CSV Upload)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  // Expense & Category Management States
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [isExpenseDbMissing, setIsExpenseDbMissing] = useState(false);

  // Add Expense Form Inputs
  const [addExpenseDate, setAddExpenseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [addExpenseLarge, setAddExpenseLarge] = useState('');
  const [addExpenseMedium, setAddExpenseMedium] = useState('');
  const [addExpenseSmall, setAddExpenseSmall] = useState('');
  const [addExpenseAmount, setAddExpenseAmount] = useState('');
  const [addExpenseDesc, setAddExpenseDesc] = useState('');

  // Filtering Expense States
  const [filterExpenseLarge, setFilterExpenseLarge] = useState('all');
  const [filterExpenseMedium, setFilterExpenseMedium] = useState('all');
  const [filterExpenseSmall, setFilterExpenseSmall] = useState('all');

  // Category Configuration Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLevel, setNewCatLevel] = useState<'large' | 'medium' | 'small'>('large');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [isMarginLogExpanded, setIsMarginLogExpanded] = useState(false);
  const [expenseFilterMonth, setExpenseFilterMonth] = useState<string>('all');

  // Bulk Partner Share States
  const [isBulkPartnerShareModalOpen, setIsBulkPartnerShareModalOpen] = useState(false);
  const [bulkShareDevices, setBulkShareDevices] = useState<{ id: string; model_name: string; sticker?: string; imei?: string; selling_price: number; isShared: boolean; wholesale_price: string }[]>([]);
  const [isSavingBulkShare, setIsSavingBulkShare] = useState(false);
  // IMEI auditor states
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditText, setAuditText] = useState('');
  const [auditActiveTab, setAuditActiveTab] = useState<'not_in_db' | 'not_in_paste' | 'matched'>('not_in_db');
  const [auditLocationFilter, setAuditLocationFilter] = useState('all');
  // Daily History Log states
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('all');
  const [selectedHistoryLogDate, setSelectedHistoryLogDate] = useState<string | null>(null);
  const [historyLogDetailTab, setHistoryLogDetailTab] = useState<'ingested' | 'sold' | 'stock'>('ingested');
  const [csvFileText, setCsvFileText] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const [intakeMethod, setIntakeMethod] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [bulkImportLocation, setBulkImportLocation] = useState('DHL');
  const [historySubTab, setHistorySubTab] = useState<'summary' | 'audit'>('summary');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilterType, setAuditFilterType] = useState('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('all');

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
  const [isLocalPurchaseExpense, setIsLocalPurchaseExpense] = useState(false);

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

  // ── Bulk / Wholesale Sale Modal States ──────────────────────────────
  type BulkSaleItem = { id: string; imei: string; model_name: string; price: number };
  const [isBulkSaleModalOpen, setIsBulkSaleModalOpen] = useState(false);
  const [bulkSaleItems, setBulkSaleItems] = useState<BulkSaleItem[]>([]);
  const [bulkSellerName, setBulkSellerName] = useState('');
  const [bulkBuyerName, setBulkBuyerName] = useState('');
  const [bulkBuyerPhone, setBulkBuyerPhone] = useState('');
  const [bulkBuyerAddress, setBulkBuyerAddress] = useState('');
  const [bulkBuyerAddressCustom, setBulkBuyerAddressCustom] = useState('');
  const [bulkSaleDate, setBulkSaleDate] = useState('');
  const [bulkTaxIncluded, setBulkTaxIncluded] = useState(false);
  const [processingBulkSale, setProcessingBulkSale] = useState(false);

  // ── Receipt-Only Modal States (Sales tab) ─────────────────────────────
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptItems, setReceiptItems] = useState<{ id: string; imei: string; model_name: string; price: number }[]>([]);
  const [receiptBuyerName, setReceiptBuyerName] = useState('');
  const [receiptBuyerPhone, setReceiptBuyerPhone] = useState('');
  const [receiptBuyerAddress, setReceiptBuyerAddress] = useState('');
  const [receiptBuyerAddressCustom, setReceiptBuyerAddressCustom] = useState('');
  const [receiptSaleDate, setReceiptSaleDate] = useState('');
  const [receiptTaxIncluded, setReceiptTaxIncluded] = useState(false);

  // ── Return / Restore Modal States (Sales tab) ──────────────────────────
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnDeviceIds, setReturnDeviceIds] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<'simple' | 'defect'>('simple');
  const [returnNotes, setReturnNotes] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);

  // ── Exchange / Swap States (Sell Modal) ─────────────────────────────
  const [exchangeReturnedDeviceId, setExchangeReturnedDeviceId] = useState('');
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');
  const [exchangeMode, setExchangeMode] = useState<'even' | 'upgrade' | 'downgrade'>('even');
  const [exchangeCashDiff, setExchangeCashDiff] = useState<number | string>(0);
  const [exchangeMemo, setExchangeMemo] = useState('');

  const calculatedFinalPrice = useMemo(() => {
    const dep = Number(depositAmount) || 0;
    if (saleType === 'transfer' || saleType === 'cash') {
      return dep + (Number(transferAmount) || 0);
    } else if (saleType === 'cod') {
      return dep + (Number(codAmountInput) || 0);
    } else if (saleType === 'installment') {
      return dep + (Number(instMonths) || 0) * (Number(instMonthlyPayment) || 0);
    } else if (saleType === 'exchange') {
      if (exchangeReturnedDeviceId) {
        const returnedDev = devices.find(d => d.id === exchangeReturnedDeviceId);
        const basePrice = returnedDev?.selling_price || 0;
        const diff = Number(exchangeCashDiff) || 0;
        if (exchangeMode === 'upgrade') {
          return basePrice + diff;
        } else if (exchangeMode === 'downgrade') {
          return basePrice - diff;
        } else {
          return basePrice;
        }
      }
      return dep + (Number(tradeInValue) || 0);
    }
    return 0;
  }, [saleType, depositAmount, transferAmount, codAmountInput, instMonths, instMonthlyPayment, tradeInValue, exchangeReturnedDeviceId, exchangeMode, exchangeCashDiff, devices]);

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
      if (dep > 0) {
        return `기기 교환 (추가 수금 ฿${formatPrice(dep)})`;
      } else if (dep < 0) {
        return `기기 교환 (차액 환불 ฿${formatPrice(Math.abs(dep))})`;
      } else {
        return `기기 맞교환`;
      }
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
    let soldList = devices.filter(d => !d.deleted_at && d.is_sold && d.is_approved);
    
    if (marginSelectedMonths.length > 0) {
      soldList = soldList.filter(d => marginSelectedMonths.includes(getYearMonth(d.sale_date)));
    }
    
    // totalSalesTHB: Sum of selling_price for all approved sold items
    const totalSalesTHB = soldList.reduce((sum, d) => sum + Number(d.selling_price || 0), 0);
    
    // totalCostKRW: Sum of purchase_cost_krw for all approved sold items (bypassed if selling_price is 0)
    const totalCostKRW = soldList.reduce((sum, d) => {
      const price = Number(d.selling_price || 0);
      const cost = price === 0 ? 0 : Number(d.purchase_cost_krw || 0);
      return sum + cost;
    }, 0);
    
    // totalMarginKRW: Sum of margin (selling_price * exchangeRate - cost) in KRW (0 if selling_price is 0)
    const totalMarginKRW = soldList.reduce((sum, d) => {
      const price = Number(d.selling_price || 0);
      const cost = price === 0 ? 0 : Number(d.purchase_cost_krw || 0);
      const margin = price === 0 ? 0 : (Math.round(price * exchangeRate) - cost);
      return sum + margin;
    }, 0);

    const totalUnpaidCODTHB = soldList.filter(d => d.sale_type === 'cod' && d.payment_status === 'unpaid').reduce((sum, d) => sum + ((Number(d.selling_price) || 0) - (Number(d.deposit_amount) || 0)), 0);

    const totalUnpaidInstallmentTHB = soldList.filter(d => d.sale_type === 'installment').reduce((sum, d) => {
      const history = d.installment_history || [];
      const unpaidSum = history.filter((h: any) => h.status === 'unpaid').reduce((s, h) => s + (Number(h.amount) || 0), 0);
      return sum + unpaidSum;
    }, 0);

    const totalUnpaidOtherTHB = soldList
      .filter(d => d.sale_type !== 'cod' && d.sale_type !== 'installment' && d.payment_status === 'unpaid')
      .reduce((sum, d) => sum + ((Number(d.selling_price) || 0) - (Number(d.deposit_amount) || 0)), 0);

    const actualCollectedTHB = totalSalesTHB - totalUnpaidCODTHB - totalUnpaidInstallmentTHB - totalUnpaidOtherTHB;
    const activeInstallmentCount = soldList.filter(d => d.payment_status === 'collecting').length;
    const unpaidList = soldList.filter(d => d.payment_status === 'unpaid' || d.payment_status === 'collecting');

    // Filter expenses corresponding to the selected margin months
    const filteredExpensesForMargin = expenses.filter(exp => {
      if (!exp.expense_date) return false;
      const ym = exp.expense_date.substring(0, 7);
      if (marginSelectedMonths.length === 0) return true; // all months
      return marginSelectedMonths.includes(ym);
    });

    const isRemittanceOrBuyback = (categoryId: string) => {
      let currentId = categoryId;
      for (let i = 0; i < 5; i++) {
        const cat = expenseCategories.find(c => c.id === currentId);
        if (!cat) break;
        const name = (cat.name || '').trim().toLowerCase();
        if (
          currentId === '21000000-0000-0000-0000-000000000000' || // 본사 송금
          currentId === '21100000-0000-0000-0000-000000000000' || // 기기 대금
          name.includes('본사 송금') || 
          name.includes('본사송금') || 
          name.includes('현지 기기') || 
          name.includes('현지 기계') || 
          name.includes('현지기기') || 
          name.includes('현지기계') ||
          name.includes('기기 대금') ||
          name.includes('기기대금')
        ) {
          return true;
        }
        if (cat.parent_id) {
          currentId = cat.parent_id;
        } else {
          break;
        }
      }
      return false;
    };

    let totalOtherExpensesTHB = 0;
    let totalOtherExpensesKRW = 0;
    let totalRemittanceBuybackTHB = 0;
    let totalRemittanceBuybackKRW = 0;

    filteredExpensesForMargin.forEach(exp => {
      const amount = Number(exp.amount) || 0;
      const amountKRW = Math.round(amount * exchangeRate);
      if (isRemittanceOrBuyback(exp.category_id)) {
        totalRemittanceBuybackTHB += amount;
        totalRemittanceBuybackKRW += amountKRW;
      } else {
        totalOtherExpensesTHB += amount;
        totalOtherExpensesKRW += amountKRW;
      }
    });

    const realMarginKRW = totalMarginKRW - totalOtherExpensesKRW;
    
    return {
      totalSalesTHB,
      totalCostKRW,
      totalMarginKRW,
      totalUnpaidCODTHB,
      totalUnpaidInstallmentTHB,
      actualCollectedTHB,
      activeInstallmentCount,
      unpaidList,
      soldList,
      totalOtherExpensesTHB,
      totalOtherExpensesKRW,
      totalRemittanceBuybackTHB,
      totalRemittanceBuybackKRW,
      realMarginKRW
    };
  }, [devices, expenses, expenseCategories, exchangeRate, marginSelectedMonths, getYearMonth]);

  const realMarginMonthlyList = useMemo(() => {
    const monthsSet = new Set<string>();
    devices.forEach(d => {
      if (d.is_sold && d.is_approved && !d.deleted_at) {
        const ym = getYearMonth(d.sale_date);
        if (ym && ym !== 'Unknown') monthsSet.add(ym);
      }
    });
    expenses.forEach(exp => {
      if (exp.expense_date) {
        const ym = exp.expense_date.substring(0, 7);
        if (ym && ym.length === 7) monthsSet.add(ym);
      }
    });

    const months = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

    return months.map(ym => {
      const soldInMonth = devices.filter(d => !d.deleted_at && d.is_sold && d.is_approved && getYearMonth(d.sale_date) === ym);
      
      const totalMarginKRW = soldInMonth.reduce((sum, d) => {
        const price = Number(d.selling_price || 0);
        const cost = price === 0 ? 0 : Number(d.purchase_cost_krw || 0);
        const margin = price === 0 ? 0 : (Math.round(price * exchangeRate) - cost);
        return sum + margin;
      }, 0);

      const expensesInMonth = expenses.filter(exp => exp.expense_date && exp.expense_date.substring(0, 7) === ym);
      
      let otherExpensesTHB = 0;
      let otherExpensesKRW = 0;
      let remittanceBuybackTHB = 0;
      let remittanceBuybackKRW = 0;

      const isRemittanceOrBuyback = (categoryId: string) => {
        let currentId = categoryId;
        for (let i = 0; i < 5; i++) {
          const cat = expenseCategories.find(c => c.id === currentId);
          if (!cat) break;
          const name = (cat.name || '').trim().toLowerCase();
          if (
            currentId === '21000000-0000-0000-0000-000000000000' || // 본사 송금
            currentId === '21100000-0000-0000-0000-000000000000' || // 기기 대금
            name.includes('본사 송금') || 
            name.includes('본사송금') || 
            name.includes('현지 기기') || 
            name.includes('현지 기계') || 
            name.includes('현지기기') || 
            name.includes('현지기계') ||
            name.includes('기기 대금') ||
            name.includes('기기대금')
          ) {
            return true;
          }
          if (cat.parent_id) {
            currentId = cat.parent_id;
          } else {
            break;
          }
        }
        return false;
      };

      expensesInMonth.forEach(exp => {
        const amount = Number(exp.amount) || 0;
        const amountKRW = Math.round(amount * exchangeRate);
        if (isRemittanceOrBuyback(exp.category_id)) {
          remittanceBuybackTHB += amount;
          remittanceBuybackKRW += amountKRW;
        } else {
          otherExpensesTHB += amount;
          otherExpensesKRW += amountKRW;
        }
      });

      const realMarginKRW = totalMarginKRW - otherExpensesKRW;

      return {
        yearMonth: ym,
        totalMarginKRW,
        otherExpensesTHB,
        otherExpensesKRW,
        remittanceBuybackTHB,
        remittanceBuybackKRW,
        realMarginKRW
      };
    });
  }, [devices, expenses, expenseCategories, exchangeRate, getYearMonth]);

  const filteredRealMarginMonthlyList = useMemo(() => {
    if (marginSelectedMonths.length === 0) return realMarginMonthlyList;
    return realMarginMonthlyList.filter(row => marginSelectedMonths.includes(row.yearMonth));
  }, [realMarginMonthlyList, marginSelectedMonths]);

  const customerMonths = useMemo(() => {
    const months = new Set<string>();
    devices.forEach(d => {
      if (d.is_sold && d.is_approved && !d.deleted_at) {
        const ym = getYearMonth(d.sale_date);
        if (ym && ym !== 'Unknown') {
          months.add(ym);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [devices, getYearMonth]);

  const soldMonths = useMemo(() => {
    const months = new Set<string>();
    devices.forEach(d => {
      if (d.is_sold && !d.deleted_at) {
        const ym = getYearMonth(d.sale_date);
        if (ym && ym !== 'Unknown') {
          months.add(ym);
        }
      }
    });
    const today = new Date();
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentYM);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [devices, getYearMonth]);

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
      const device = devices.find(d => d.id === deviceId);
      let history = device?.installment_history ? [...device.installment_history] : [];
      
      if (saleType === 'installment' && history.length > 0) {
        // Find the latest paid_date in the history to revert
        const paidDates = history.map((h: any) => h.paid_date).filter(Boolean);
        if (paidDates.length > 0) {
          const parseDate = (dStr: string) => {
            const pts = dStr.split('.').map(x => x.trim()).filter(Boolean);
            if (pts.length >= 3) {
              const y = pts[0].length === 2 ? 2000 + Number(pts[0]) : Number(pts[0]);
              const m = Number(pts[1]) - 1;
              const d = Number(pts[2]);
              return new Date(y, m, d).getTime();
            }
            return 0;
          };
          
          const times = paidDates.map(parseDate);
          const maxTime = Math.max(...times);
          
          history = history.map((h: any) => {
            if (h.status === 'paid' && h.paid_date && parseDate(h.paid_date) === maxTime) {
              return { ...h, status: 'unpaid', paid_date: null };
            }
            return h;
          });
        } else {
          // Fallback if no dates: mark all as unpaid
          history = history.map((h: any) => ({ ...h, status: 'unpaid', paid_date: null }));
        }
      }

      const targetStatus = saleType === 'installment' ? 'collecting' : 'unpaid';
      
      const updateData: any = {
        payment_status: targetStatus
      };
      if (saleType === 'installment') {
        updateData.installment_history = history;
      }

      const { error } = await supabase
        .from('sheets_inventory')
        .update(updateData)
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
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'sticker' | 'site_date' | 'model_name' | 'imei' | 'color' | 'battery_pct' | 'purchase_cost_krw' | 'selling_price' | 'stock_location' | 'notes' | 'customer_name' | 'customer_phone' | 'installment_number' | 'seller_name' } | null>(null);
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
    loadRolePermissions();
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

  // Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      const { data, error } = await supabase
        .from('inventory_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        // Graceful fallback if table does not exist
        if (error.code !== 'PGRST116' && error.code !== '42P01') {
          console.error('Error fetching audit logs:', error);
        }
      } else {
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }, [isAuthorized]);

  // Write Audit Log Helper
  const writeAuditLog = useCallback(async (actionType: string, modelName: string | null, imei: string | null, details: string) => {
    try {
      const operatorName = staffProfile?.name || '시스템(System)';
      const operatorRole = staffProfile?.role || 'system';
      const { error } = await supabase
        .from('inventory_audit_log')
        .insert({
          operator_name: operatorName,
          operator_role: operatorRole,
          action_type: actionType,
          model_name: modelName,
          imei: imei,
          details: details
        });
      if (error) {
        console.error('Error inserting audit log:', error);
      } else {
        loadAuditLogs();
      }
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }, [staffProfile, loadAuditLogs]);

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
      
      // Load audit logs in parallel
      loadAuditLogs();
    } catch (err: any) {
      console.error(err);
      showToast(t('error_occurred') + err.message, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [isAuthorized, showToast, t, loadAuditLogs]);

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
        supabase.from('profiles').select('id, name, store_name').in('role', ['admin', 'manager', 'staff', 'seller']).eq('is_approved', true).order('name', { ascending: true })
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

  // Expense & Category DB Handlers
  const loadExpenseData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoadingExpenses(true);
    setIsExpenseDbMissing(false);
    try {
      const categoriesRes = await supabase
        .from('sheets_expense_categories')
        .select('*')
        .order('name', { ascending: true });

      if (categoriesRes.error) {
        if (categoriesRes.error.code === '42P01') {
          setIsExpenseDbMissing(true);
          setExpenseCategories(DEFAULT_CATEGORIES);
          const cached = localStorage.getItem('local_expenses');
          setExpenses(cached ? JSON.parse(cached) : []);
          setLoadingExpenses(false);
          return;
        } else {
          throw categoriesRes.error;
        }
      }

      const expensesRes = await supabase
        .from('sheets_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expensesRes.error) throw expensesRes.error;

      setExpenseCategories(categoriesRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load expense data:', err);
      setIsExpenseDbMissing(true);
      setExpenseCategories(DEFAULT_CATEGORIES);
      const cached = localStorage.getItem('local_expenses');
      setExpenses(cached ? JSON.parse(cached) : []);
    } finally {
      setLoadingExpenses(false);
    }
  }, [isAuthorized]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const level = newCatLevel;
    const parentId = level === 'large' ? null : (newCatParentId || null);

    if (level !== 'large' && !parentId) {
      alert(lang === 'ko' ? '상위 카테고리를 선택해 주세요.' : 'Please select a parent category.');
      return;
    }

    if (isExpenseDbMissing) {
      const newCategory = {
        id: Math.random().toString(36).substring(2, 9),
        name: newCatName.trim(),
        level,
        parent_id: parentId,
        created_at: new Date().toISOString()
      };
      const updated = [...expenseCategories, newCategory];
      setExpenseCategories(updated);
      setNewCatName('');
      showToast(lang === 'ko' ? '카테고리가 임시 추가되었습니다 (데모 모드)' : 'Category temporarily added (Demo)', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('sheets_expense_categories')
        .insert({
          name: newCatName.trim(),
          level,
          parent_id: parentId
        });

      if (error) throw error;

      showToast(lang === 'ko' ? '카테고리가 추가되었습니다.' : 'Category added.', 'success');
      setNewCatName('');
      loadExpenseData();
    } catch (err: any) {
      console.error('Error adding category:', err);
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const getDescendantIds = (catId: string): string[] => {
      const children = expenseCategories.filter(c => c.parent_id === catId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...getDescendantIds(c.id)];
      });
      return ids;
    };
    const descendantIds = getDescendantIds(id);
    const allCategoryIds = [id, ...descendantIds];
    const hasCascadeExpenses = expenses.some(exp => allCategoryIds.includes(exp.category_id));

    if (hasCascadeExpenses) {
      alert(lang === 'ko' ? '이 카테고리 또는 하위 카테고리에 등록된 지출 내역이 있어 삭제할 수 없습니다.' : 'Cannot delete: there are expense records under this category or its subcategories.');
      return;
    }

    const confirmMsg = lang === 'ko' 
      ? '이 카테고리를 삭제하시겠습니까? (하위 카테고리도 모두 함께 삭제됩니다)'
      : 'Are you sure you want to delete this category? (All subcategories will be deleted too)';
    if (!confirm(confirmMsg)) return;

    if (isExpenseDbMissing) {
      const updated = expenseCategories.filter(c => !allCategoryIds.includes(c.id));
      setExpenseCategories(updated);
      showToast(lang === 'ko' ? '카테고리가 삭제되었습니다 (데모 모드)' : 'Category deleted (Demo)', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('sheets_expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(lang === 'ko' ? '카테고리가 삭제되었습니다.' : 'Category deleted.', 'success');
      loadExpenseData();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(addExpenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert(lang === 'ko' ? '올바른 금액을 입력해 주세요.' : 'Please enter a valid amount.');
      return;
    }

    const selectedCategoryId = addExpenseSmall || addExpenseMedium || addExpenseLarge;
    if (!selectedCategoryId) {
      alert(lang === 'ko' ? '지출 카테고리를 선택해 주세요.' : 'Please select an expense category.');
      return;
    }

    if (isExpenseDbMissing) {
      const newExpense = {
        id: Math.random().toString(36).substring(2, 9),
        category_id: selectedCategoryId,
        amount: amountNum,
        description: addExpenseDesc.trim(),
        expense_date: addExpenseDate,
        created_at: new Date().toISOString()
      };
      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      localStorage.setItem('local_expenses', JSON.stringify(updated));
      setAddExpenseAmount('');
      setAddExpenseDesc('');
      showToast(lang === 'ko' ? '지출 내역이 추가되었습니다 (데모 모드)' : 'Expense added (Demo)', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('sheets_expenses')
        .insert({
          category_id: selectedCategoryId,
          amount: amountNum,
          description: addExpenseDesc.trim(),
          expense_date: addExpenseDate
        });

      if (error) throw error;

      showToast(lang === 'ko' ? '지출 내역이 저장되었습니다.' : 'Expense recorded successfully.', 'success');
      setAddExpenseAmount('');
      setAddExpenseDesc('');
      loadExpenseData();
    } catch (err: any) {
      console.error('Error adding expense:', err);
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const confirmMsg = lang === 'ko' ? '이 지출 내역을 삭제하시겠습니까?' : 'Are you sure you want to delete this expense?';
    if (!confirm(confirmMsg)) return;

    if (isExpenseDbMissing) {
      const updated = expenses.filter(exp => exp.id !== id);
      setExpenses(updated);
      localStorage.setItem('local_expenses', JSON.stringify(updated));
      showToast(lang === 'ko' ? '지출 내역이 삭제되었습니다 (데모 모드)' : 'Expense deleted (Demo)', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('sheets_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(lang === 'ko' ? '지출 내역이 삭제되었습니다.' : 'Expense deleted successfully.', 'success');
      loadExpenseData();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  const getCategoryPath = useCallback((categoryId: string) => {
    const cat = expenseCategories.find(c => c.id === categoryId);
    if (!cat) return '-';
    
    if (cat.level === 'small') {
      const parentMed = expenseCategories.find(p => p.id === cat.parent_id);
      const parentLarge = parentMed ? expenseCategories.find(p => p.id === parentMed.parent_id) : null;
      return `${parentLarge ? parentLarge.name : ''} > ${parentMed ? parentMed.name : ''} > ${cat.name}`;
    } else if (cat.level === 'medium') {
      const parentLarge = expenseCategories.find(p => p.id === cat.parent_id);
      return `${parentLarge ? parentLarge.name : ''} > ${cat.name}`;
    } else {
      return cat.name;
    }
  }, [expenseCategories]);

  // Computed list of months available for expense filtering (merging customer months & expense months)
  const expenseAvailableMonths = useMemo(() => {
    const months = new Set<string>();
    customerMonths.forEach(m => months.add(m));
    expenses.forEach(exp => {
      if (exp.expense_date) {
        const ym = exp.expense_date.substring(0, 7);
        if (ym && ym.length === 7) {
          months.add(ym);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [customerMonths, expenses]);

  // Computed Values for Expense Filtering & Metrics
  const filteredExpensesList = useMemo(() => {
    return expenses.filter(exp => {
      // Month selection filter (independent of Margin tab now)
      if (expenseFilterMonth !== 'all') {
        const expYM = exp.expense_date ? exp.expense_date.substring(0, 7) : '';
        if (expYM !== expenseFilterMonth) {
          return false;
        }
      }

      // Category filter cascade
      if (filterExpenseSmall !== 'all') {
        return exp.category_id === filterExpenseSmall;
      }
      if (filterExpenseMedium !== 'all') {
        const smallIds = expenseCategories.filter(c => c.parent_id === filterExpenseMedium).map(c => c.id);
        const matchIds = [filterExpenseMedium, ...smallIds];
        return matchIds.includes(exp.category_id);
      }
      if (filterExpenseLarge !== 'all') {
        const mediumIds = expenseCategories.filter(c => c.parent_id === filterExpenseLarge).map(c => c.id);
        const smallIds = expenseCategories.filter(c => mediumIds.includes(c.parent_id)).map(c => c.id);
        const matchIds = [filterExpenseLarge, ...mediumIds, ...smallIds];
        return matchIds.includes(exp.category_id);
      }

      return true;
    });
  }, [expenses, expenseFilterMonth, filterExpenseLarge, filterExpenseMedium, filterExpenseSmall, expenseCategories]);

  const totalExpensesTHB = useMemo(() => {
    return filteredExpensesList.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [filteredExpensesList]);

  const currentBalanceTHB = useMemo(() => {
    // 1. Calculate all-time (lifetime) actual collected cash
    const allTimeSoldList = devices.filter(d => !d.deleted_at && d.is_sold && d.is_approved);
    const allTimeSalesTHB = allTimeSoldList.reduce((sum, d) => sum + Number(d.selling_price || 0), 0);
    const allTimeUnpaidCODTHB = allTimeSoldList.filter(d => d.sale_type === 'cod' && d.payment_status === 'unpaid').reduce((sum, d) => sum + ((Number(d.selling_price) || 0) - (Number(d.deposit_amount) || 0)), 0);
    const allTimeUnpaidInstallmentTHB = allTimeSoldList.filter(d => d.sale_type === 'installment').reduce((sum, d) => {
      const history = d.installment_history || [];
      const unpaidSum = history.filter((h: any) => h.status === 'unpaid').reduce((s, h) => s + (Number(h.amount) || 0), 0);
      return sum + unpaidSum;
    }, 0);
    const allTimeUnpaidOtherTHB = allTimeSoldList
      .filter(d => d.sale_type !== 'cod' && d.sale_type !== 'installment' && d.payment_status === 'unpaid')
      .reduce((sum, d) => sum + ((Number(d.selling_price) || 0) - (Number(d.deposit_amount) || 0)), 0);
    const lifetimeCollectedTHB = allTimeSalesTHB - allTimeUnpaidCODTHB - allTimeUnpaidInstallmentTHB - allTimeUnpaidOtherTHB;

    // 2. Calculate all-time (lifetime) total expenses
    const lifetimeExpensesTHB = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    // 3. Return lifetime actual balance
    return lifetimeCollectedTHB - lifetimeExpensesTHB;
  }, [devices, expenses]);

  useEffect(() => {
    if (isAuthorized) {
      purgeOldTrash().then(() => {
        loadLedgerData();
        loadSettingsData();
        loadExpenseData();
      });
    }
  }, [isAuthorized, loadLedgerData, loadSettingsData, loadExpenseData, purgeOldTrash]);

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
    const getDayFromSaleDate = (dateStr: string): number => {
      if (!dateStr) return 999;
      const pts = dateStr.split('.').map(x => x.trim()).filter(Boolean);
      if (pts.length >= 3) {
        const d = parseInt(pts[2], 10);
        if (!isNaN(d)) return d;
      }
      const dashPts = dateStr.split('-');
      if (dashPts.length >= 3) {
        const d = parseInt(dashPts[2], 10);
        if (!isNaN(d)) return d;
      }
      return 999;
    };

    return [...list].sort((a, b) => {
      let valA: any = a[sortField as keyof DeviceItem];
      let valB: any = b[sortField as keyof DeviceItem];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (activeTab === 'installment' && sortField === 'sale_date') {
        const dayA = getDayFromSaleDate(String(valA));
        const dayB = getDayFromSaleDate(String(valB));
        if (dayA !== dayB) {
          return sortDirection === 'asc' ? dayA - dayB : dayB - dayA;
        }
      }

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
  }, [sortField, sortDirection, activeTab]);

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
    const activeStock = devices.filter(d => !d.deleted_at && !d.is_sold && !isDHL(d.stock_location));
    const pendingIntake = devices.filter(d => !d.deleted_at && !d.is_sold && isDHL(d.stock_location));
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
      if (d.deleted_at || d.is_sold || isDHL(d.stock_location)) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
      return matchSearch && matchLoc;
    }).length;
  }, [devices, searchQuery, locationFilter, normalizeModelName]);

  const basePendingDevicesCount = useMemo(() => {
    return devices.filter(d => {
      if (d.deleted_at || d.is_sold || !isDHL(d.stock_location)) return false;
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

      if (soldSelectedMonth !== 'all') {
        const ym = getYearMonth(d.sale_date);
        if (ym !== soldSelectedMonth) return false;
      }

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
  }, [devices, soldSearchQuery, soldSelectedDays, soldSelectedMonth, normalizeModelName, getYearMonth]);

  // Extract unique models present in current tab's scope (active vs sold vs pending) based on active search/location filters
  const uniqueModels = useMemo(() => {
    const activeStock = devices.filter(d => {
      if (d.deleted_at || d.is_sold || isDHL(d.stock_location)) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
      return matchSearch && matchLoc;
    });

    const pendingStock = devices.filter(d => {
      if (d.deleted_at || d.is_sold || !isDHL(d.stock_location)) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });

    const soldList = devices.filter(d => {
      if (d.deleted_at || !d.is_sold) return false;

      if (soldSelectedMonth !== 'all') {
        const ym = getYearMonth(d.sale_date);
        if (ym !== soldSelectedMonth) return false;
      }

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
  }, [devices, searchQuery, soldSearchQuery, locationFilter, normalizeModelName, soldSelectedDays, soldSelectedMonth, getYearMonth]);

  // Helper to check category
  const matchesCategory = useCallback((modelName: string, filter: string) => {
    if (filter === 'all') return true;
    return modelName === filter;
  }, []);

  // Filtered lists
  const filteredActiveDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (d.deleted_at || d.is_sold || isDHL(d.stock_location)) return false;
      const matchSearch = normalizeModelName(d.model_name).includes(normalizeModelName(searchQuery)) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
      const matchCat = matchesCategory(d.model_name, categoryFilter);
      
      const isShared = !!(d.notes && d.notes.includes('[협력사공개]'));
      const matchShare = partnerShareFilter === 'all' || 
                         (partnerShareFilter === 'shared' && isShared) || 
                         (partnerShareFilter === 'unshared' && !isShared);
      
      return matchSearch && matchLoc && matchCat && matchShare;
    });

    // Pin reserved items to the very top, sorted.
    const reserved = list.filter(d => d.is_reserved);
    const normal = list.filter(d => !d.is_reserved);

    return [...sortDevices(reserved), ...sortDevices(normal)];
  }, [devices, searchQuery, locationFilter, categoryFilter, partnerShareFilter, matchesCategory, sortDevices, normalizeModelName]);

  const filteredActiveDevicesPurchaseCost = useMemo(() => {
    return filteredActiveDevices.reduce((sum, d) => sum + Number(d.purchase_cost_krw || 0), 0);
  }, [filteredActiveDevices]);

  // Filtered list for Pending Intake
  const filteredPendingDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (d.deleted_at || d.is_sold || !isDHL(d.stock_location)) return false;
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

      if (soldSelectedMonth !== 'all') {
        const ym = getYearMonth(d.sale_date);
        if (ym !== soldSelectedMonth) return false;
      }

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
  }, [devices, soldSearchQuery, categoryFilter, soldSelectedDays, soldSelectedMonth, matchesCategory, sortDevices, normalizeModelName, getYearMonth]);

  const filteredExchangeSoldDevices = useMemo(() => {
    const query = exchangeSearchQuery.trim().toLowerCase();
    const list = devices.filter(d => !d.deleted_at && d.is_sold);
    if (!query) return list.slice(0, 10);
    return list.filter(d => 
      (d.model_name && d.model_name.toLowerCase().includes(query)) ||
      (d.imei && d.imei.includes(query)) ||
      (d.sticker && d.sticker.toLowerCase().includes(query))
    );
  }, [devices, exchangeSearchQuery]);

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

  // ── Global Search Helper calculation ──────────────────────────────
  const currentSearchText = useMemo(() => {
    if (activeTab === 'ledger' || activeTab === 'pending_intake') return searchQuery;
    if (activeTab === 'sales') return soldSearchQuery;
    if (activeTab === 'installment') return installmentSearchQuery;
    if (activeTab === 'cod') return codSearchQuery;
    if (activeTab === 'trash') return trashSearchQuery;
    return '';
  }, [activeTab, searchQuery, soldSearchQuery, installmentSearchQuery, codSearchQuery, trashSearchQuery]);

  const globalSearchHelper = useMemo(() => {
    const q = currentSearchText.trim().toLowerCase();
    if (!q || q.length < 2) return null;

    const allMatching = devices.filter(d => {
      const modelMatch = d.model_name && normalizeModelName(d.model_name).includes(normalizeModelName(q));
      const imeiMatch = d.imei && d.imei.includes(q);
      const stickerMatch = d.sticker && d.sticker.toLowerCase().includes(q);
      return modelMatch || imeiMatch || stickerMatch;
    });

    if (allMatching.length === 0) return null;

    const matchesList: { device: DeviceItem; tab: 'ledger' | 'pending_intake' | 'sales' | 'trash'; isVisible: boolean }[] = [];

    allMatching.forEach(d => {
      let targetTab: 'ledger' | 'pending_intake' | 'sales' | 'trash' = 'ledger';
      if (d.deleted_at) targetTab = 'trash';
      else if (d.is_sold) targetTab = 'sales';
      else if (isDHL(d.stock_location)) targetTab = 'pending_intake';

      let isVisible = false;
      if (activeTab === targetTab) {
        if (activeTab === 'ledger') {
          const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
          const matchCat = matchesCategory(d.model_name, categoryFilter);
          if (matchLoc && matchCat) isVisible = true;
        } else if (activeTab === 'pending_intake') {
          const matchCat = matchesCategory(d.model_name, categoryFilter);
          if (matchCat) isVisible = true;
        } else if (activeTab === 'sales') {
          const matchCat = matchesCategory(d.model_name, categoryFilter);
          isVisible = matchCat;
          if (soldSelectedMonth && soldSelectedMonth !== 'all' && d.sale_date) {
            if (getYearMonth(d.sale_date) !== soldSelectedMonth) isVisible = false;
          }
        } else if (activeTab === 'trash') {
          isVisible = true;
        }
      }

      matchesList.push({ device: d, tab: targetTab, isVisible });
    });

    const otherTabMatches = matchesList.filter(m => m.tab !== activeTab);
    const hiddenInCurrentTab = matchesList.filter(m => m.tab === activeTab && !m.isVisible);

    return {
      otherTabMatches,
      hiddenInCurrentTab,
      query: currentSearchText
    };
  }, [devices, activeTab, currentSearchText, locationFilter, categoryFilter, matchesCategory, getYearMonth, normalizeModelName]);

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
    const activeDevices = devices.filter(d => {
      if (d.deleted_at || d.is_sold || isDHL(d.stock_location)) return false;
      if (auditLocationFilter !== 'all' && d.stock_location !== auditLocationFilter) return false;
      return true;
    });
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
          } else if (isDHL(found.stock_location)) {
            status = '입고 대기 중 (DHL)';
            badgeColor = '#d97706'; // yellow/orange
            deviceDetail = ` [${found.model_name || ''}]`;
          } else if (!found.deleted_at && !found.is_sold && !isDHL(found.stock_location) && auditLocationFilter !== 'all' && found.stock_location !== auditLocationFilter) {
            status = `다른 위치에 있음 (${found.stock_location})`;
            badgeColor = '#3b82f6'; // blue
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
  }, [devices, auditText, auditLocationFilter]);

  // --- Daily Log Memos ---
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    devices.forEach(d => {
      if (d.deleted_at) return;
      if (d.site_date) dates.add(d.site_date.trim());
      if (d.is_sold && d.sale_date) dates.add(d.sale_date.trim());
    });

    const parseYYMD = (dateStr?: string): number => {
      if (!dateStr) return 0;
      const parts = dateStr.split('.').map(p => p.trim()).filter(Boolean);
      if (parts.length < 3) return 0;
      const yy = parseInt(parts[0], 10) || 0;
      const mm = parseInt(parts[1], 10) || 0;
      const dd = parseInt(parts[2], 10) || 0;
      return yy * 10000 + mm * 100 + dd;
    };

    return Array.from(dates).sort((a, b) => parseYYMD(b) - parseYYMD(a));
  }, [devices]);

  const dailyStats = useMemo(() => {
    const parseYYMD = (dateStr?: string): number => {
      if (!dateStr) return 0;
      const parts = dateStr.split('.').map(p => p.trim()).filter(Boolean);
      if (parts.length < 3) return 0;
      const yy = parseInt(parts[0], 10) || 0;
      const mm = parseInt(parts[1], 10) || 0;
      const dd = parseInt(parts[2], 10) || 0;
      return yy * 10000 + mm * 100 + dd;
    };

    return uniqueDates.map(date => {
      const targetVal = parseYYMD(date);

      // Ingested on this date (not deleted, location !== DHL)
      const ingested = devices.filter(d => !d.deleted_at && !isDHL(d.stock_location) && parseYYMD(d.site_date) === targetVal);

      // Sold on this date
      const sold = devices.filter(d => !d.deleted_at && d.is_sold && parseYYMD(d.sale_date) === targetVal);

      // Stock at the end of this date
      const stock = devices.filter(d => {
        if (d.deleted_at || isDHL(d.stock_location)) return false;
        const intakeVal = parseYYMD(d.site_date);
        if (intakeVal > 0 && intakeVal > targetVal) return false;
        
        if (!d.is_sold) return true;
        const saleVal = parseYYMD(d.sale_date);
        return saleVal > targetVal;
      });

      return {
        date,
        ingestedCount: ingested.length,
        soldCount: sold.length,
        stockCount: stock.length,
        ingestedList: ingested,
        soldList: sold,
        stockList: stock
      };
    });
  }, [uniqueDates, devices]);

  const historyMonths = useMemo(() => {
    const months = new Set<string>();
    uniqueDates.forEach(d => {
      const parts = d.split('.').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        months.add(`${parts[0]}.${parts[1]}`); // e.g. "26.6"
      }
    });
    return Array.from(months).sort((a, b) => {
      const [ya, ma] = a.split('.').map(Number);
      const [yb, mb] = b.split('.').map(Number);
      if (ya !== yb) return yb - ya;
      return mb - ma;
    });
  }, [uniqueDates]);

  const filteredDailyStats = useMemo(() => {
    return dailyStats.filter(stat => {
      // 1. Month Filter
      if (historyMonthFilter !== 'all') {
        const parts = stat.date.split('.').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const m = `${parts[0]}.${parts[1]}`;
          if (m !== historyMonthFilter) return false;
        } else {
          return false;
        }
      }

      // 2. Search Query (matches date string, e.g., '6.1' or '26.6.1')
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        return stat.date.toLowerCase().includes(q);
      }

      return true;
    });
  }, [dailyStats, historyMonthFilter, historySearchQuery]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // 1. Action Type Filter
      if (auditFilterType !== 'all') {
        if (log.action_type !== auditFilterType) return false;
      }

      // 2. Role Filter
      if (auditRoleFilter !== 'all') {
        if (log.operator_role !== auditRoleFilter) return false;
      }

      // 3. Keyword Search
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const opName = (log.operator_name || '').toLowerCase();
        const model = (log.model_name || '').toLowerCase();
        const imeiVal = (log.imei || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const action = (log.action_type || '').toLowerCase();
        return (
          opName.includes(q) ||
          model.includes(q) ||
          imeiVal.includes(q) ||
          details.includes(q) ||
          action.includes(q)
        );
      }

      return true;
    });
  }, [auditLogs, auditFilterType, auditRoleFilter, auditSearchQuery]);

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

  // Helper function to parse 2D array of rows into DB payload records
  const processRawRows = (rows: string[][], dbMap: Map<string, any>, nowString: string) => {
    if (rows.length === 0) return [];

    // 1. Detect header row by scanning the first few rows (up to 25) for IMEI or custom columns
    let headerRowIdx = 0;
    let headerDetected = false;
    let isCustomExcelLayout = false;

    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r];
      if (!row) continue;
      
      const hasImei = row.some(cell => cell && String(cell).toLowerCase().replace(/\s+/g, '').includes('imei'));
      
      // Also check custom layout headers in this row
      const hasPG = row.some(cell => {
        const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
        return clean === 'p/gno' || clean === 'pgno' || clean === '피지넘버';
      });
      const hasSelling = row.some(cell => {
        const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
        return clean.includes('실판매가') || clean.includes('실판매');
      });

      if (hasImei || (hasPG && hasSelling)) {
        headerRowIdx = r;
        headerDetected = true;
        if (hasPG && hasSelling) {
          isCustomExcelLayout = true;
        }
        break;
      }
    }

    const headerRow = rows[headerRowIdx] || [];

    // 3. Mapping indices
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

    if (isCustomExcelLayout) {
      stickerIdx = headerRow.findIndex(cell => {
        const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
        return clean === 'p/gno' || clean === 'pgno' || clean === '피지넘버' || clean.includes('sticker') || clean.includes('스티커');
      });
      modelIdx = headerRow.findIndex(cell => {
        const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
        return clean.includes('모델') || clean.includes('model') || clean.includes('기기') || clean.includes('품명');
      });
      imeiIdx = headerRow.findIndex(cell => {
        const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
        return clean === 'imei' || clean.includes('imei');
      });
      if (imeiIdx === -1) {
        imeiIdx = headerRow.findIndex(cell => {
          const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
          return clean.includes('일련번호') || clean.includes('시리얼') || clean.includes('serial');
        });
      }
      colorIdx = headerRow.findIndex(cell => {
        const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
        return clean.includes('색상') || clean.includes('color') || clean.includes('색');
      });
      purchaseCostIdx = headerRow.findIndex(cell => {
        const clean = cell ? String(cell).toLowerCase().replace(/\s+/g, '') : '';
        return clean.includes('실판매가') || clean.includes('실판매');
      });
    } else if (headerDetected) {
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
        if (sellingPriceIdx === -1 && (
          clean === 'price' || 
          clean === 'selling' || 
          clean.includes('sellingprice') || 
          clean.includes('판매가') || 
          clean.includes('판매금액') || 
          clean.includes('판매') || 
          clean.includes('소매가')
        )) {
          sellingPriceIdx = idx;
        }
        if (marketPriceIdx === -1 && (clean.includes('도매가격') || clean.includes('도매가') || (clean.includes('도매') && !clean.includes('마진') && !clean.includes('수수료')))) {
          marketPriceIdx = idx;
        }
      });
    }

    // Fallbacks
    const csvStartIdx = headerDetected ? headerRowIdx + 1 : 0;
    const firstRowLength = rows[csvStartIdx] ? rows[csvStartIdx].length : 0;
    
    if (!isCustomExcelLayout) {
      if (siteDateIdx === -1) siteDateIdx = 0;
      if (stickerIdx === -1) stickerIdx = 1;
      if (modelIdx === -1) modelIdx = 2;
      if (imeiIdx === -1) imeiIdx = 3;
      if (colorIdx === -1) colorIdx = 4;
      if (isSoldIdx === -1) isSoldIdx = 5;
      if (locationIdx === -1) locationIdx = 6;
      if (batteryIdx === -1) batteryIdx = (firstRowLength <= 8) ? 99 : 7;
      if (purchaseCostIdx === -1) purchaseCostIdx = (firstRowLength <= 8) ? 7 : 8;
      if (saleDateIdx === -1) saleDateIdx = 99;
      if (sellerIdx === -1) sellerIdx = 99;
      if (notesIdx === -1) notesIdx = 99;
      if (sellingPriceIdx === -1) sellingPriceIdx = (firstRowLength >= 10) ? 9 : 99;
      if (marketPriceIdx === -1) marketPriceIdx = (firstRowLength >= 11) ? 10 : 99;
    }

    const recordsToInsert = [];
    const startIdx = headerDetected ? headerRowIdx + 1 : 0;

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (row.length <= imeiIdx || imeiIdx === -1) continue;

      // Filter: only load rows that have sticker data
      const stickerNo = stickerIdx !== -1 && row[stickerIdx] ? String(row[stickerIdx]).trim() : '';
      if (!stickerNo) continue;

      // 1. Skip rows that represent summary/totals (e.g. starts with '합계' or sticker contains '합계'/'수량')
      const col0 = row[0] ? String(row[0]).trim() : '';
      if (
        col0 === '합계' || 
        col0.includes('합계') || 
        col0.toLowerCase().includes('total') ||
        stickerNo.includes('합계') ||
        stickerNo.includes('수량') ||
        stickerNo.includes('판매 수량') ||
        stickerNo.includes('판매수량')
      ) {
        continue;
      }

      // Skip rows with no valid IMEI
      let rawImei = imeiIdx !== -1 && row[imeiIdx] ? String(row[imeiIdx]).trim().replace(/\s+/g, '') : '';
      if (!rawImei && stickerNo) {
        rawImei = stickerNo.replace(/\s+/g, '');
      }

      // 2. An IMEI or serial should never contain Korean characters (indicating metadata/footer texts)
      if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawImei)) {
        continue;
      }

      if (!rawImei || rawImei.toLowerCase() === 'imei' || rawImei.toLowerCase() === 'imei/serial' || rawImei.length < 4) {
        continue;
      }

      const rawImeiTrimmed = rawImei.trim();
      const existing = dbMap.get(rawImeiTrimmed);

      let model = modelIdx !== -1 && row[modelIdx] ? String(row[modelIdx]).trim() : '';
      if (!model) {
        model = existing?.model_name || 'Unknown';
      }
      
      let colorVal = colorIdx !== -1 && row[colorIdx] ? normalizeColor(String(row[colorIdx])) : '';
      if (!colorVal) {
        colorVal = existing?.color || '';
      }
      
      let isSoldVal = false;
      let loc = 'Shop';
      let battery = '';
      let seller = '';
      let note = '';
      let sellingPriceVal = 0;
      let marketPriceVal = 0;
      let purchaseCostVal = 0;
      let saleD = '';
      let siteD = '';

      if (isCustomExcelLayout) {
        const actualPriceStr = purchaseCostIdx !== -1 && row[purchaseCostIdx] ? String(row[purchaseCostIdx]).trim() : '0';
        const basePrice = parseInt(actualPriceStr.replace(/[^\d]/g, '')) || 0;
        purchaseCostVal = basePrice > 0 ? (basePrice + 20000) : 0;
        
        loc = 'DHL'; // For custom layout, go straight to pending intake DHL
        isSoldVal = false;
        battery = '';
        
        const d = new Date();
        const yy = String(d.getFullYear()).slice(-2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        siteD = `${yy}.${mm}.${dd}`;
      } else {
        const isSoldStr = isSoldIdx !== 99 && row[isSoldIdx] ? String(row[isSoldIdx]).trim().toUpperCase() : 'FALSE';
        isSoldVal = isSoldStr === 'TRUE' || isSoldStr === 'YES' || isSoldStr === '예' || isSoldStr === '1';
        loc = locationIdx !== 99 && row[locationIdx] ? String(row[locationIdx]).trim() : bulkImportLocation;
        const batteryClean = batteryIdx !== 99 && row[batteryIdx] ? String(row[batteryIdx]).trim().replace(/[^\d]/g, '') : '';
        battery = batteryClean;
        seller = sellerIdx !== 99 && row[sellerIdx] ? String(row[sellerIdx]).trim() : '';
        note = notesIdx !== 99 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

        const sellingPriceStr = sellingPriceIdx !== 99 && row[sellingPriceIdx] ? String(row[sellingPriceIdx]).trim() : '0';
        sellingPriceVal = parseInt(sellingPriceStr.replace(/[^\d]/g, '')) || 0;

        const marketPriceStr = marketPriceIdx !== 99 && row[marketPriceIdx] ? String(row[marketPriceIdx]).trim() : '0';
        marketPriceVal = parseInt(marketPriceStr.replace(/[^\d]/g, '')) || 0;

        const purchaseCostStr = purchaseCostIdx !== 99 && row[purchaseCostIdx] ? String(row[purchaseCostIdx]).trim() : '0';
        purchaseCostVal = parseInt(purchaseCostStr.replace(/[^\d]/g, '')) || 0;

        saleD = saleDateIdx !== 99 && row[saleDateIdx] ? String(row[saleDateIdx]).trim() : '';
        siteD = siteDateIdx !== 99 && row[siteDateIdx] ? String(row[siteDateIdx]).trim() : '';
      }

      const newRecord: any = {
        site_date: siteD || null,
        sale_date: saleD || null,
        sticker: stickerNo || null,
        model_name: model || null,
        imei: rawImei,
        color: colorVal || null,
        is_sold: isSoldVal,
        stock_location: loc || bulkImportLocation,
        battery_pct: battery || '',
        seller_name: seller || null,
        notes: note || null,
        selling_price: sellingPriceVal,
        market_price: marketPriceVal,
        purchase_cost_krw: purchaseCostVal,
        deleted_at: null,
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
        if (existing.deleted_at) {
          newRecord.deleted_at = existing.deleted_at;
        }
      }

      recordsToInsert.push(newRecord);
    }

    return recordsToInsert;
  };

  const csvPreviewRecords = useMemo(() => {
    if (!csvFileText.trim()) return [];
    try {
      const parsed = parseCSV(csvFileText.trim());
      return processRawRows(parsed, new Map(), new Date().toISOString());
    } catch (e) {
      return [];
    }
  }, [csvFileText]);

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

      const nowString = new Date().toISOString();
      const recordsToInsert = processRawRows(rows, dbMap, nowString);

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
      const rows = pasteText.trim().split(/\r?\n/).map(row => {
        return row.includes('\t') ? row.split('\t') : row.split(/ {2,}/);
      });
      if (rows.length === 0) {
        showToast(t('toast_no_valid_text_data'), 'error');
        setImportingCSV(false);
        return;
      }

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

      const nowString = new Date().toISOString();
      const records = processRawRows(rows, dbMap, nowString);

      if (records.length === 0) {
        showToast(t('toast_no_valid_paste_data'), 'error');
        setImportingCSV(false);
        return;
      }

      const { error } = await supabase
        .from('sheets_inventory')
        .upsert(records, { onConflict: 'imei' });

      if (error) throw error;

      // Log bulk import
      const modelSummary = records.map(r => r.model_name).filter(Boolean).slice(0, 3).join(', ') + (records.length > 3 ? ` 외 ${records.length - 3}대` : '');
      const imeiList = records.map(r => r.imei).filter(Boolean).slice(0, 5).join(', ') + (records.length > 5 ? ` 외 ${records.length - 5}개` : '');
      writeAuditLog('BULK_IMPORT', modelSummary, imeiList, `클립보드 복사붙여넣기 일괄 입고 성공: 총 ${records.length}대 입고됨`);

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
    setIsLocalPurchaseExpense(false);
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

    const trimmedSticker = sticker.trim();
    if (trimmedSticker) {
      const duplicateStickerDevice = devices.find(d => 
        !d.deleted_at && 
        !d.is_sold && 
        d.sticker && 
        d.sticker.trim().toLowerCase() === trimmedSticker.toLowerCase() &&
        d.id !== editingDevice?.id
      );
      if (duplicateStickerDevice) {
        alert(`❌ 이미 사용 중인 스티커 번호입니다.\n[${duplicateStickerDevice.model_name}] 기기(IMEI: ${duplicateStickerDevice.imei})에서 사용 중입니다.`);
        return;
      }
    }

    const cleanImei = imei.trim().replace(/\s+/g, '');
    if (cleanImei) {
      const duplicateImeiDevice = devices.find(d =>
        !d.deleted_at &&
        d.imei &&
        d.imei.trim().replace(/\s+/g, '') === cleanImei &&
        d.id !== editingDevice?.id
      );
      if (duplicateImeiDevice) {
        const statusStr = duplicateImeiDevice.is_sold ? '이미 판매됨' : '재고 보유 중';
        alert(`❌ 이미 등록된 IMEI 번호입니다.\n[${duplicateImeiDevice.model_name}] 기기(상태: ${statusStr}, 스티커: ${duplicateImeiDevice.sticker || '없음'})로 이미 등록되어 있습니다.`);
        return;
      }
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

      const costValue = isLocalPurchaseExpense
        ? Math.round((Number(purchaseCost) || 0) * exchangeRate)
        : (Number(purchaseCost) || 0);

      const payload = {
        sticker: sticker.trim() || null,
        model_name: finalModelName,
        imei: imei.trim().replace(/\s+/g, ''),
        color: color.trim() || null,
        battery_pct: batteryPct.trim() || '100',
        stock_location: finalLocation,
        purchase_cost_krw: costValue,
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
        
        if (!error) {
          const changes = [];
          if (Number(editingDevice.purchase_cost_krw) !== payload.purchase_cost_krw) {
            changes.push(`원가: ฿${formatPrice(Number(editingDevice.purchase_cost_krw) || 0)} -> ฿${formatPrice(payload.purchase_cost_krw)}`);
          }
          if (Number(editingDevice.selling_price) !== payload.selling_price) {
            changes.push(`판매가: ฿${formatPrice(Number(editingDevice.selling_price) || 0)} -> ฿${formatPrice(payload.selling_price)}`);
          }
          if (editingDevice.battery_pct !== payload.battery_pct) {
            changes.push(`배터리: ${editingDevice.battery_pct || '100'}% -> ${payload.battery_pct}%`);
          }
          if (editingDevice.stock_location !== payload.stock_location) {
            changes.push(`위치: ${editingDevice.stock_location || 'Shop'} -> ${payload.stock_location}`);
          }
          if (editingDevice.notes !== payload.notes) {
            changes.push(`비고: "${editingDevice.notes || ''}" -> "${payload.notes || ''}"`);
          }
          const details = changes.length > 0 ? `기기 수정 (${changes.join(', ')})` : '기기 수정 (변경사항 없음)';
          writeAuditLog('EDIT_DEVICE', payload.model_name, payload.imei, details);
        }
      } else {
        const newPayload = {
          ...payload,
          id: typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : undefined
        };
        ({ error } = await supabase
          .from('sheets_inventory')
          .insert(newPayload));
        
        if (!error) {
          writeAuditLog('MANUAL_ADD', payload.model_name, payload.imei, `수동 기기 등록: 원가 ฿${formatPrice(payload.purchase_cost_krw)}, 판매가 ฿${formatPrice(payload.selling_price)}`);

          // Automatically record local purchase in the Expense Ledger
          if (isLocalPurchaseExpense && (Number(purchaseCost) || 0) > 0) {
            try {
              let categoryIdToUse = '';
              let foundCategory = expenseCategories.find(c => {
                const name = (c.name || '').trim().replace(/\s+/g, '');
                return name.includes('현지기기매입') || name.includes('현지기계매입');
              });

              if (!foundCategory) {
                const parentCat = expenseCategories.find(c => {
                  const name = (c.name || '').trim().replace(/\s+/g, '');
                  return name.includes('기기매입비');
                });
                if (parentCat) {
                  foundCategory = expenseCategories.find(c => c.parent_id === parentCat.id && (c.name || '').includes('현지'));
                }
              }

              if (foundCategory) {
                categoryIdToUse = foundCategory.id;
              } else {
                categoryIdToUse = '20000000-0000-0000-0000-000000000000'; // Fallback
              }

              const convertDotDateToYYYYMMDD = (dotDate: string): string => {
                if (!dotDate) return new Date().toISOString().split('T')[0];
                const pts = dotDate.split('.').map(p => p.trim()).filter(Boolean);
                if (pts.length >= 3) {
                  const y = pts[0].length === 2 ? `20${pts[0]}` : pts[0];
                  const m = pts[1].padStart(2, '0');
                  const d = pts[2].padStart(2, '0');
                  return `${y}-${m}-${d}`;
                }
                return new Date().toISOString().split('T')[0];
              };

              const expenseDate = convertDotDateToYYYYMMDD(payload.site_date);

              const { error: expError } = await supabase
                .from('sheets_expenses')
                .insert({
                  category_id: categoryIdToUse,
                  amount: Number(purchaseCost) || 0,
                  description: `${payload.model_name} 현지 매입 (${payload.imei})`,
                  expense_date: expenseDate
                });

              if (expError) {
                console.error('Auto expense creation failed:', expError.message);
              } else {
                writeAuditLog('AUTO_EXPENSE', payload.model_name, payload.imei, `현지 매입 지출 자동 등록 완료: ฿${formatPrice(Number(purchaseCost))}`);
                loadExpenseData();
              }
            } catch (e: any) {
              console.error('Auto expense exception:', e);
            }
          }
        }
      }

      if (error) throw error;

      showToast(editingDevice ? '✅ Device updated.' : '✅ Device added to stock.', 'success');
      setIsManualModalOpen(false);
      setEditingDevice(null);
      setIsLocalPurchaseExpense(false);
      
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

  const handleTogglePartnerVisible = async (item: DeviceItem) => {
    try {
      const isShared = item.notes && item.notes.includes('[협력사공개]');
      let newNotes = item.notes || '';

      if (isShared) {
        newNotes = newNotes.replace(/\s*\[협력사공개\]/g, '').trim();
      } else {
        newNotes = newNotes ? `${newNotes} [협력사공개]` : '[협력사공개]';
      }

      const { error } = await supabase
        .from('sheets_inventory')
        .update({ notes: newNotes })
        .eq('id', item.id);

      if (error) throw error;

      showToast(isShared ? '협력사 공유가 취소되었습니다.' : '협력사 공유가 설정되었습니다.', 'success');
      await loadLedgerData();
    } catch (err: any) {
      showToast('공유 상태 변경 실패: ' + err.message, 'error');
    }
  };

  const handleApproveTransfer = async (device: DeviceItem) => {
    try {
      const match = device.notes?.match(/\[이관신청:\s*(.*?),\s*(.*?)\]/);
      if (!match) {
        showToast('이관 요청 정보를 파싱할 수 없습니다.', 'error');
        return;
      }
      const targetStore = match[1];
      
      let newNotes = device.notes || '';
      newNotes = newNotes.replace(/\[이관신청:\s*(.*?),\s*(.*?)\]/g, '').trim();
      newNotes = newNotes.replace(/\s*\[협력사공개\]/g, '').trim();
      const completionTag = `[이관완료: ${targetStore}]`;
      newNotes = newNotes ? `${newNotes} ${completionTag}` : completionTag;

      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          stock_location: targetStore,
          notes: newNotes
        })
        .eq('id', device.id);

      if (error) throw error;

      // Log transfer approval actions
      writeAuditLog('APPROVE_TRANSFER', device.model_name, device.imei, `이관 신청 승인 완료 (대상 매장: ${targetStore})`);
      writeAuditLog('APPROVE_REQUEST', device.model_name, device.imei, `협력사 기기 이관 요청 승인 완료 (대상 매장: ${targetStore})`);

      showToast(`이관 요청이 승인되었습니다. (${targetStore} 매장으로 재고 이관)`, 'success');
      await loadLedgerData();
    } catch (err: any) {
      showToast('이관 승인 실패: ' + err.message, 'error');
    }
  };

  const handleRejectTransfer = async (device: DeviceItem) => {
    try {
      let newNotes = device.notes || '';
      newNotes = newNotes.replace(/\[이관신청:\s*(.*?),\s*(.*?)\]/g, '').trim();

      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          notes: newNotes
        })
        .eq('id', device.id);

      if (error) throw error;

      // Log transfer rejection actions
      writeAuditLog('REJECT_TRANSFER', device.model_name, device.imei, '이관 신청 거절 완료');
      writeAuditLog('REJECT_REQUEST', device.model_name, device.imei, '협력사 기기 이관 요청 거절 완료');

      showToast('이관 요청이 거절되었습니다.', 'info');
      await loadLedgerData();
    } catch (err: any) {
      showToast('이관 거절 실패: ' + err.message, 'error');
    }
  };

  const handleOpenBulkPartnerShareModal = () => {
    const selectedDevices = devices.filter(d => selectedIds.includes(d.id));
    const mapped = selectedDevices.map(d => {
      const isShared = !!(d.notes && d.notes.includes('[협력사공개]'));
      const match = d.notes?.match(/\[도매가:\s*(\d+)\]/);
      const wholesale_price = match ? match[1] : String(d.selling_price);
      return {
        id: d.id,
        model_name: d.model_name,
        sticker: d.sticker,
        imei: d.imei,
        selling_price: d.selling_price,
        isShared,
        wholesale_price
      };
    });
    setBulkShareDevices(mapped);
    setIsBulkPartnerShareModalOpen(true);
  };

  const handleSaveBulkPartnerShare = async () => {
    setIsSavingBulkShare(true);
    try {
      const promises = bulkShareDevices.map(async (d) => {
        const original = devices.find(x => x.id === d.id);
        if (!original) return;

        let newNotes = original.notes || '';
        
        newNotes = newNotes.replace(/\s*\[협력사공개\]/g, '').trim();
        newNotes = newNotes.replace(/\[도매가:\s*(\d+)\]/g, '').trim();

        if (d.isShared) {
          newNotes = newNotes ? `${newNotes} [협력사공개]` : '[협력사공개]';
          const priceVal = d.wholesale_price.trim();
          if (priceVal) {
            newNotes = `${newNotes} [도매가: ${priceVal}]`;
          }
        }

        const { error } = await supabase
          .from('sheets_inventory')
          .update({ notes: newNotes })
          .eq('id', d.id);

        if (error) throw error;
      });

      await Promise.all(promises);

      // Log bulk partner share action
      const sharedCount = bulkShareDevices.filter(d => d.isShared).length;
      const unsharedCount = bulkShareDevices.length - sharedCount;
      const modelSummary = bulkShareDevices.map(d => d.model_name).filter(Boolean).slice(0, 3).join(', ') + (bulkShareDevices.length > 3 ? ` 외 ${bulkShareDevices.length - 3}대` : '');
      const imeiList = bulkShareDevices.map(d => d.imei).filter(Boolean).slice(0, 5).join(', ') + (bulkShareDevices.length > 5 ? ` 외 ${bulkShareDevices.length - 5}개` : '');
      writeAuditLog('BULK_SHARE', modelSummary, imeiList, `협력사 일괄 공유 설정 완료: 공개 ${sharedCount}대, 비공개 ${unsharedCount}대`);

      showToast('협력사 공유 설정이 일괄 업데이트되었습니다.', 'success');
      setIsBulkPartnerShareModalOpen(false);
      setSelectedIds([]);
      await loadLedgerData();
    } catch (err: any) {
      showToast('일괄 공유 설정 실패: ' + err.message, 'error');
    } finally {
      setIsSavingBulkShare(false);
    }
  };

  // Inline Cell Save Handler
  const handleInlineSave = async (
    id: string, 
    field: 'sticker' | 'site_date' | 'model_name' | 'imei' | 'color' | 'battery_pct' | 'purchase_cost_krw' | 'selling_price' | 'stock_location' | 'notes' | 'customer_name' | 'customer_phone' | 'installment_number' | 'seller_name', 
    value: string
  ) => {
    try {
      let finalValue: any = value.trim();
      if (field === 'purchase_cost_krw' || field === 'selling_price') {
        finalValue = Number(value.replace(/[^\d]/g, '')) || 0;
      }

      // Get previous value for audit log
      const oldDevice = devices.find(d => d.id === id);
      const oldValue = oldDevice ? oldDevice[field] : '';

      const { error } = await supabase
        .from('sheets_inventory')
        .update({ [field]: finalValue })
        .eq('id', id);

      if (error) throw error;

      // Log action if value actually changed
      if (oldDevice && String(oldValue) !== String(finalValue)) {
        let actionType = 'EDIT_FIELD';
        let details = `필드 [${field}] 수정: "${oldValue || ''}" -> "${finalValue || ''}"`;

        if (field === 'purchase_cost_krw') {
          actionType = 'EDIT_COST';
          details = `매입원가 수정: ฿${formatPrice(Number(oldValue) || 0)} -> ฿${formatPrice(Number(finalValue) || 0)}`;
        } else if (field === 'selling_price') {
          actionType = 'EDIT_PRICE';
          details = `소매판매가 수정: ฿${formatPrice(Number(oldValue) || 0)} -> ฿${formatPrice(Number(finalValue) || 0)}`;
        } else if (field === 'notes') {
          actionType = 'EDIT_NOTES';
          details = `비고 수정: "${oldValue || ''}" -> "${finalValue || ''}"`;
        } else if (field === 'battery_pct') {
          actionType = 'EDIT_BATTERY';
          details = `배터리 수치 수정: ${oldValue || '100'}% -> ${finalValue || '100'}%`;
        } else if (field === 'stock_location') {
          actionType = 'EDIT_LOCATION';
          details = `기기 위치 수정: "${oldValue || ''}" -> "${finalValue || ''}"`;
        } else if (field === 'model_name') {
          actionType = 'EDIT_MODEL';
          details = `모델명 수정: "${oldValue || ''}" -> "${finalValue || ''}"`;
        } else if (field === 'imei') {
          actionType = 'EDIT_IMEI';
          details = `IMEI 수정: "${oldValue || ''}" -> "${finalValue || ''}"`;
        }
        writeAuditLog(actionType, oldDevice.model_name, oldDevice.imei, details);
      }

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
    setExchangeReturnedDeviceId('');
    setExchangeSearchQuery('');
    setExchangeMode('even');
    setExchangeCashDiff(0);
    setExchangeMemo('');
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
        const returnNote = `[교환반품] (사유: ${exchangeMemo.trim()}, 대체기기 IMEI: ${sellingDevice.imei})`;
        const finalReturnedNotes = returnedDevNotes ? `${returnedDevNotes} | ${returnNote}` : returnNote;

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

        // Log return/exchange action
        writeAuditLog('CANCEL_SALE', returnedDev.model_name, returnedDev.imei, `교환반품 처리 (반납 재고 복구, 대체기기 IMEI: ${sellingDevice.imei})`);

        // 2. Prep notes for the new device
        const newDevNote = `[기기교환 반납IMEI: ${returnedDev.imei}] ${exchangeMemo.trim()}`;
        finalNotes = finalNotes ? `${finalNotes} | ${newDevNote}` : newDevNote;
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
          deposit_amount: saleType === 'exchange' ? cashDiffValue : (Number(depositAmount) || 0),
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

      // Log sale action
      writeAuditLog(
        'SELL_DEVICE', 
        sellingDevice.model_name, 
        sellingDevice.imei, 
        `판매 처리 완료 (유형: ${saleType}, 판매가: ฿${formatPrice(calculatedFinalPrice)}, 판매원: ${sellerName.trim()}${custName.trim() ? `, 구매자: ${custName.trim()}` : ''})`
      );

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
    if (!currentPermissions.can_approve_sale) {
      showToast('권한이 없습니다. (No permission.)', 'error');
      return;
    }
    if (!confirm('해당 판매 건을 승인하시겠습니까?\n승인 시 최종 마진 장부에 반영됩니다.\n(Do you want to approve this sale? It will be entered into the margin ledger.)')) return;
    try {
      const targetDevice = devices.find(d => d.id === deviceId);
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_approved: true
        })
        .eq('id', deviceId);

      if (error) throw error;

      if (targetDevice) {
        writeAuditLog('APPROVE_SALE', targetDevice.model_name, targetDevice.imei, `판매 건 승인 완료 (판매가: ฿${formatPrice(targetDevice.selling_price || 0)})`);
      }

      showToast('판매 승인이 완료되었습니다. (Sale approved successfully.)', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('판매 승인 실패: ' + err.message, 'error');
    }
  };

  // ── Bulk / Wholesale Sale Handlers ──────────────────────────────────
  const handleOpenBulkSaleModal = () => {
    if (selectedIds.length === 0) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setBulkSaleDate(`${yyyy}-${mm}-${dd}`);
    setBulkSellerName('');
    setBulkBuyerName('');
    setBulkBuyerPhone('');
    setBulkBuyerAddress('');
    setBulkBuyerAddressCustom('');
    setBulkTaxIncluded(false);
    // Map selectedIds to BulkSaleItems with auto-loaded prices
    const items = selectedIds.map(id => {
      const dev = devices.find(d => d.id === id);
      return {
        id,
        imei: dev?.imei || '',
        model_name: dev?.model_name || '',
        price: dev?.selling_price || 0,
      };
    });
    setBulkSaleItems(items);
    setIsBulkSaleModalOpen(true);
  };

  const handleProcessBulkSale = async () => {
    if (!bulkSellerName.trim()) {
      showToast('กรุณาเลือกชื่อพนักงานขาย (Seller name required)', 'error');
      return;
    }
    setProcessingBulkSale(true);
    try {
      const formattedDate = formatDateToDot(bulkSaleDate);
      for (const item of bulkSaleItems) {
        const { error } = await supabase
          .from('sheets_inventory')
          .update({
            is_sold: true,
            is_reserved: false,
            reserved_by: null,
            reserved_date: null,
            sale_date: formattedDate,
            seller_name: bulkSellerName.trim(),
            notes: '[대량판매] (Wholesale Sale)',
            selling_price: item.price,
            sale_type: 'transfer',
            deposit_amount: 0,
            cod_amount: 0,
            installment_months: 0,
            installment_amount: 0,
            payment_status: 'paid',
            customer_name: bulkBuyerName.trim() || null,
            customer_phone: null,
            installment_number: null,
            is_approved: false,
            installment_history: []
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // Log bulk sale action
      const modelSummary = bulkSaleItems.map(item => item.model_name).filter(Boolean).slice(0, 3).join(', ') + (bulkSaleItems.length > 3 ? ` 외 ${bulkSaleItems.length - 3}대` : '');
      const imeiList = bulkSaleItems.map(item => item.imei).filter(Boolean).slice(0, 5).join(', ') + (bulkSaleItems.length > 5 ? ` 외 ${bulkSaleItems.length - 5}개` : '');
      writeAuditLog('BULK_SALE', modelSummary, imeiList, `대량 도매 판매 처리 완료: 총 ${bulkSaleItems.length}대 판매 (구매자: ${bulkBuyerName.trim() || '미지정'})`);

      showToast(`✅ ${bulkSaleItems.length}대 대량 판매 완료 (Wholesale sale recorded)`, 'success');
      setIsBulkSaleModalOpen(false);
      setSelectedIds([]);
      loadLedgerData();
    } catch (err: any) {
      showToast('대량 판매 처리 실패: ' + err.message, 'error');
    } finally {
      setProcessingBulkSale(false);
    }
  };

  const handlePrintBulkReceipt = () => {
    const printEl = document.getElementById('bulk-receipt-printable');
    if (!printEl) return;
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>ใบเสร็จรับเงิน</title>
          <style>
            @page { size: A4; margin: 20mm 15mm; }
            body { font-family: 'Sarabun', 'Tahoma', Arial, sans-serif; font-size: 13px; color: #111; margin: 0; padding: 0; }
            .receipt { position: relative; width: 100%; }
            .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
            .company-info { font-size: 13px; line-height: 1.7; }
            .company-info .bolder { font-weight: 800; font-size: 14px; }
            .logo-img { width: 90px; height: 90px; object-fit: contain; border-radius: 8px; }
            .receipt-title { text-align: center; font-size: 22px; font-weight: 900; margin: 12px 0 18px; letter-spacing: 1px; }
            .date-row { text-align: right; font-size: 14px; margin-bottom: 10px; }
            .buyer-row { font-size: 14px; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
            th { background: #f0f0f0; border: 1px solid #bbb; padding: 8px 6px; text-align: center; font-size: 12.5px; font-weight: 700; }
            td { border: 1px solid #bbb; padding: 7px 6px; text-align: center; font-size: 12.5px; }
            td.left { text-align: left; }
            td.right { text-align: right; }
            .total-row td { font-weight: 800; background: #f9f9f9; }
            .vat-section td { font-size: 12px; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 48px; }
            .sig-box { width: 44%; font-size: 13px; line-height: 2; }
            .stamp-wrap { position: relative; display: flex; justify-content: flex-end; margin-top: -60px; pointer-events: none; }
            .stamp-wrap img { width: 180px; opacity: 0.82; }
            .empty-rows td { color: #ccc; }
          </style>
        </head>
        <body>
          ${printEl.innerHTML}
          <script>window.onload=function(){window.print();window.close();}<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAndSellBulk = async () => {
    handlePrintBulkReceipt();
    await handleProcessBulkSale();
  };

  const handleOpenReceiptModal = () => {
    if (selectedIds.length === 0) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setReceiptSaleDate(`${yyyy}-${mm}-${dd}`);
    setReceiptBuyerName('');
    setReceiptBuyerPhone('');
    setReceiptBuyerAddress('');
    setReceiptBuyerAddressCustom('');
    setReceiptTaxIncluded(false);
    const items = selectedIds.map(id => {
      const dev = devices.find(d => d.id === id);
      return {
        id,
        imei: dev?.imei || '',
        model_name: dev?.model_name || '',
        price: dev?.selling_price || 0,
      };
    }).filter(i => i.imei);
    setReceiptItems(items);
    setIsReceiptModalOpen(true);
  };

  const handlePrintReceiptOnly = () => {
    const printEl = document.getElementById('receipt-only-printable');
    if (!printEl) return;
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>ใบเสร็จรับเงิน</title><style>@page{size:A4;margin:20mm 15mm;}body{font-family:'Sarabun','Tahoma',Arial,sans-serif;font-size:13px;color:#111;margin:0;padding:0;}.receipt{position:relative;width:100%;}.header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}.company-info{font-size:13px;line-height:1.7;}.company-info .bolder{font-weight:800;font-size:14px;}.logo-img{width:90px;height:90px;object-fit:contain;border-radius:8px;}.receipt-title{text-align:center;font-size:22px;font-weight:900;margin:12px 0 18px;letter-spacing:1px;}.date-row{text-align:right;font-size:14px;margin-bottom:10px;}.buyer-row{font-size:14px;margin-bottom:6px;}.buyer-detail{font-size:12px;margin-bottom:16px;color:#333;}table{width:100%;border-collapse:collapse;}th{background:#f0f0f0;border:1px solid #bbb;padding:8px 6px;text-align:center;font-size:12.5px;font-weight:700;}td{border:1px solid #bbb;padding:7px 6px;text-align:center;font-size:12.5px;}td.left{text-align:left;}td.right{text-align:right;}.total-row td{font-weight:800;background:#f9f9f9;}.sig-row{display:flex;justify-content:space-between;margin-top:48px;}.sig-box{width:44%;font-size:13px;line-height:2;}.stamp-wrap{display:flex;justify-content:flex-end;margin-top:-60px;pointer-events:none;}.stamp-wrap img{width:180px;opacity:0.82;}</style></head><body>${printEl.innerHTML}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    printWindow.document.close();
  };

  const handlePrintPriceList = () => {
    if (selectedIds.length === 0) return;
    const selectedDevices = devices.filter(d => selectedIds.includes(d.id));
    const sortedDevices = [...selectedDevices].sort((a, b) => (a.model_name || '').localeCompare(b.model_name || ''));
    
    const rowsHtml = sortedDevices.map(item => `
      <tr>
        <td>${item.sticker || '-'}</td>
        <td class="left">${item.model_name || '-'}</td>
        <td class="imei">${item.imei || '-'}</td>
        <td>${item.color || '-'}</td>
        <td>${item.battery_pct || '-'}</td>
        <td class="price">฿${(item.selling_price || 0).toLocaleString()}</td>
      </tr>
    `).join('');
    
    const titleText = lang === 'ko' ? '기기 가격표 (Price List)' : 'ใบราคาสินค้า (Price List)';
    const thSticker = lang === 'ko' ? '스티커 (Sticker)' : 'สติกเกอร์ (Sticker)';
    const thModel = lang === 'ko' ? '모델명 (Model)' : 'รุ่น (Model)';
    const thImei = 'IMEI';
    const thColor = lang === 'ko' ? '색상 (Color)' : 'สี (Color)';
    const thBattery = lang === 'ko' ? '배터리 (Battery)' : 'แบตเตอรี่ (Battery)';
    const thPrice = lang === 'ko' ? '판매가 (Price)' : 'ราคาขาย (Price)';
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${titleText}</title><style>@page{size:A4;margin:3mm 5mm;}body{font-family:'Sarabun','Tahoma',Arial,sans-serif;font-size:9.5px;color:#111;margin:0;padding:0;}.title{text-align:center;font-size:13px;font-weight:900;margin:2px 0 5px;letter-spacing:0.5px;}table{width:100%;border-collapse:collapse;}th{background:#2e7d32;color:#fff;border:1px solid #777;padding:4px 3px;text-align:center;font-size:10px;font-weight:700;}td{border:1px solid #999;padding:3px 3px;text-align:center;font-size:9.5px;line-height:1.15;}td.left{text-align:left;font-weight:700;}td.price{text-align:right;font-weight:900;color:#1b5e20;}.imei{font-family:monospace;font-size:9px;}</style></head><body><div class="title">${titleText} (${sortedDevices.length} pcs)</div><table><thead><tr><th style="width:15%;">${thSticker}</th><th style="width:32%;">${thModel}</th><th style="width:20%;">${thImei}</th><th style="width:12%;">${thColor}</th><th style="width:10%;">${thBattery}</th><th style="width:11%;">${thPrice}</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 150);
  };

  const handlePrintInstallmentList = (startDay: number, endDay: number) => {
    const installmentDevices = devices.filter(d => !d.deleted_at && d.is_sold && d.sale_type === 'installment');
    
    const now = new Date();
    const targetYearNum = instSelectedMonth !== 'all' ? Number(instSelectedMonth.split('-')[0]) : now.getFullYear();
    const targetMonthNum = instSelectedMonth !== 'all' ? Number(instSelectedMonth.split('-')[1]) : (now.getMonth() + 1);
    const filterYear = targetYearNum % 100;
    const filterMonth = targetMonthNum;

    const isDueInSelectedMonth = (dueDate: string) => {
      if (!dueDate) return false;
      const pts = dueDate.split('.').map(x => x.trim()).filter(Boolean);
      if (pts.length >= 2) {
        return Number(pts[0]) === filterYear && Number(pts[1]) === filterMonth;
      }
      return false;
    };

    const getDueDay = (dueDate: string) => {
      if (!dueDate) return 0;
      const pts = dueDate.split('.').map(x => x.trim()).filter(Boolean);
      return pts.length >= 3 ? Number(pts[2]) : 0;
    };

    const checkIsOverdue = (dueDate: string, status: string) => {
      if (status !== 'unpaid') return false;
      const pts = dueDate.split('.').map(x => x.trim()).filter(Boolean);
      if (pts.length >= 3) {
        const y = 2000 + Number(pts[0]);
        const m = Number(pts[1]) - 1; // 0-indexed month
        const d = Number(pts[2]);
        const dueDateObj = new Date(y, m, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDateObj < today;
      }
      return false;
    };

    // Filter installments based on search query, month filter, and overdue filter
    const filteredInstallments = installmentDevices.filter(d => {
      const history = d.installment_history || [];

      // 1. Month filter: show only contracts that have a payment due in the selected month
      if (!installmentSearchQuery && instSelectedMonth !== 'all') {
        const hasDue = history.some((h: any) => isDueInSelectedMonth(h.due_date));
        if (!hasDue) return false;
      }

      // 2. Overdue filter: show only contracts that have an unpaid installment past today's date
      if (!installmentSearchQuery && showOverdueOnly) {
        const hasOverdue = history.some((h: any) => checkIsOverdue(h.due_date, h.status));
        if (!hasOverdue) return false;
      }

      // 3. Paid-in-month filter
      if (!installmentSearchQuery && showMonthPaidOnly) {
        const isFinished = d.payment_status === 'paid';
        const isMonthPaid = history.some((h: any) => isDueInSelectedMonth(h.due_date) && h.status === 'paid');
        const isRowGray = isFinished || (instSelectedMonth !== 'all' && isMonthPaid);
        if (!isRowGray) return false;
      }

      // 4. Fully-paid filter
      if (!installmentSearchQuery && showFullyPaidOnly) {
        const isFinished = d.payment_status === 'paid';
        if (!isFinished) return false;
      }

      const custNameMatch = d.customer_name?.toLowerCase().includes(installmentSearchQuery.toLowerCase());
      const custPhoneMatch = d.customer_phone?.includes(installmentSearchQuery);
      const stickerMatch = d.sticker?.toLowerCase().includes(installmentSearchQuery.toLowerCase());
      const imeiMatch = d.imei?.includes(installmentSearchQuery);
      const modelMatch = normalizeModelName(d.model_name).includes(normalizeModelName(installmentSearchQuery));
      return !installmentSearchQuery || custNameMatch || custPhoneMatch || stickerMatch || imeiMatch || modelMatch;
    });

    if (filteredInstallments.length === 0) return;
    
    const printItems = filteredInstallments.map(d => {
      const history = d.installment_history || [];
      const round = history.find((h: any) => isDueInSelectedMonth(h.due_date));
      if (!round) return null;
      
      const day = getDueDay(round.due_date);
      return {
        device: d,
        round,
        day,
        totalRounds: history.length,
        unpaidRounds: history.filter((h: any) => h.status === 'unpaid').length
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(item => item.day >= startDay && item.day <= endDay)
    .sort((a, b) => a.day - b.day);
    
    if (printItems.length === 0) {
      alert(lang === 'ko' ? '선택한 날짜 범위에 해당하는 내역이 없습니다.' : 'ไม่มีรายการในช่วงวันที่เลือก');
      return;
    }
    
    const rowsHtml = printItems.map(item => {
      const isPaid = item.round.status === 'paid';
      const rowStyle = isPaid 
        ? 'style="text-decoration: line-through; color: #155724; background-color: #d4edda; -webkit-print-color-adjust: exact; print-color-adjust: exact;"' 
        : 'style="color: #721c24; background-color: #f8d7da; -webkit-print-color-adjust: exact; print-color-adjust: exact;"';
      
      const statusText = isPaid 
        ? (lang === 'ko' ? '완납' : 'ชำระแล้ว') 
        : (lang === 'ko' ? '미납' : 'ค้างชำระ');
      
      const dayText = lang === 'ko' ? `${item.day}일` : `วันที่ ${item.day}`;
      const roundText = lang === 'ko' 
        ? `${item.round.sequence} / ${item.totalRounds} 회차 (잔여: ${item.unpaidRounds})` 
        : `งวดที่ ${item.round.sequence} / ${item.totalRounds} (คงเหลือ: ${item.unpaidRounds})`;

      return `
        <tr ${rowStyle}>
          <td>${dayText}</td>
          <td>${item.device.installment_number || '-'}</td>
          <td>${item.device.customer_name || '-'}</td>
          <td>${item.device.customer_phone || '-'}</td>
          <td>${roundText}</td>
          <td class="price">฿${(Number(item.round.amount) || 0).toLocaleString()}</td>
          <td style="font-weight: bold; ${isPaid ? 'color: #155724;' : 'color: #721c24;'}">${statusText}</td>
        </tr>
      `;
    }).join('');
    
    const titleText = lang === 'ko' 
      ? `할부 수금 관리 대장 (${instSelectedMonth})` 
      : `สมุดคุมยอดผ่อนชำระ (${instSelectedMonth})`;
    
    const subtitleText = lang === 'ko'
      ? `${startDay}일부터 ${endDay}일까지 청구 리스트 (총 ${printItems.length}건)`
      : `รายการเรียกเก็บเงินวันที่ ${startDay} ถึง ${endDay} (ทั้งหมด ${printItems.length} รายการ)`;
      
    const thDate = lang === 'ko' ? '청구일' : 'วันที่';
    const thContract = lang === 'ko' ? '계약번호' : 'เลขที่สัญญา';
    const thName = lang === 'ko' ? '고객명' : 'ชื่อลูกค้า';
    const thPhone = lang === 'ko' ? '연락처' : 'เบอร์โทร';
    const thRounds = lang === 'ko' ? '회차 정보' : 'ข้อมูลรอบชำระ';
    const thPrice = lang === 'ko' ? '청구 금액' : 'ยอดเรียกเก็บ';
    const thStatus = lang === 'ko' ? '납부 상태' : 'สถานะ';
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${titleText}</title><style>@page{size:A4;margin:8mm 6mm;}body{font-family:'Sarabun','Tahoma',Arial,sans-serif;font-size:10px;color:#111;margin:0;padding:0;}.title{text-align:center;font-size:15px;font-weight:900;margin:2px 0;}.subtitle{text-align:center;font-size:11px;color:#555;margin-bottom:10px;}table{width:100%;border-collapse:collapse;}th{background:#6366f1;color:#fff;border:1px solid #777;padding:5px 3px;text-align:center;font-size:10.5px;font-weight:700;}td{border:1px solid #aaa;padding:4px 3px;text-align:center;font-size:10px;line-height:1.2;}.price{text-align:right;font-weight:700;}</style></head><body><div class="title">${titleText}</div><div class="subtitle">${subtitleText}</div><table><thead><tr><th style="width:10%;">${thDate}</th><th style="width:15%;">${thContract}</th><th style="width:20%;">${thName}</th><th style="width:15%;">${thPhone}</th><th style="width:20%;">${thRounds}</th><th style="width:12%;">${thPrice}</th><th style="width:8%;">${thStatus}</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 150);
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
  const handleOpenReturnModal = (ids: string[]) => {
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
          const noteText = `[하자반품] ${returnNotes.trim()}`;
          finalNotes = finalNotes ? `${finalNotes} | ${noteText}` : noteText;
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
    if (!currentPermissions.can_permanent_delete) {
      showToast('영구 삭제 권한이 없습니다. (No permission to permanently delete.)', 'error');
      return;
    }
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
  const handleTabChange = (tab: 'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin' | 'installment' | 'pending_intake' | 'history_log' | 'cod' | 'customers' | 'partner_transfer') => {
    setActiveTab(tab);
    setSelectedIds([]);
    setCategoryFilter('all');
    setPartnerShareFilter('all');
    setSearchQuery('');
    setSoldSearchQuery('');
    setInstallmentSearchQuery('');
    setShowOverdueOnly(false);
    setShowMonthPaidOnly(false);
    setShowFullyPaidOnly(false);
    setIsInstallmentPrintModalOpen(false);
    setInstPrintStartDay(1);
    setInstPrintEndDay(31);
    setTrashSearchQuery('');
    setHistorySearchQuery('');
    setHistoryMonthFilter('all');
  };

  const handleGoToTabAndSearch = (tab: typeof activeTab, query: string) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setCategoryFilter('all');
    setLocationFilter('all');
    setPartnerShareFilter('all');
    setSoldSelectedMonth('all');
    if (tab === 'ledger' || tab === 'pending_intake') setSearchQuery(query);
    else if (tab === 'sales') setSoldSearchQuery(query);
    else if (tab === 'installment') setInstallmentSearchQuery(query);
    else if (tab === 'cod') setCodSearchQuery(query);
    else if (tab === 'trash') setTrashSearchQuery(query);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, currentTab: string) => {
    if (e.key === 'Enter') {
      const q = (e.target as HTMLInputElement).value.trim();
      if (!q) return;

      const qNorm = normalizeModelName(q);

      // Find matches in the master devices array
      const allMatching = devices.filter(d => {
        const modelMatch = d.model_name && normalizeModelName(d.model_name).includes(qNorm);
        const imeiMatch = d.imei && d.imei.includes(q);
        const stickerMatch = d.sticker && d.sticker.toLowerCase().includes(q.toLowerCase());
        return modelMatch || imeiMatch || stickerMatch;
      });

      if (allMatching.length === 0) {
        showToast(lang === 'ko' ? `"${q}"에 대한 검색 결과가 없습니다.` : `No results found for "${q}".`, 'info');
        return;
      }

      // Determine where the matching items are
      // Order of priority: active stock (ledger), sales, pending_intake, trash
      const activeMatch = allMatching.find(d => !d.deleted_at && !d.is_sold && !isDHL(d.stock_location));
      const soldMatch = allMatching.find(d => !d.deleted_at && d.is_sold);
      const pendingMatch = allMatching.find(d => !d.deleted_at && !d.is_sold && isDHL(d.stock_location));
      const trashMatch = allMatching.find(d => d.deleted_at);

      if (currentTab === 'ledger') {
        if (activeMatch) {
          setLocationFilter('all');
          setCategoryFilter('all');
          setSearchQuery(q);
          showToast(lang === 'ko' ? '검색 필터를 초기화하여 기기를 표시합니다.' : 'Cleared filters to show device.', 'success');
        } else if (soldMatch) {
          handleGoToTabAndSearch('sales', q);
          showToast(lang === 'ko' ? '판매완료된 기기입니다. 판매완료 탭으로 이동했습니다.' : 'Sold device found. Switched to Sales tab.', 'info');
        } else if (pendingMatch) {
          handleGoToTabAndSearch('pending_intake', q);
          showToast(lang === 'ko' ? '입고 대기 상태의 기기입니다. 입고대기 탭으로 이동했습니다.' : 'Pending device found. Switched to Pending tab.', 'info');
        } else if (trashMatch) {
          handleGoToTabAndSearch('trash', q);
          showToast(lang === 'ko' ? '삭제된 기기입니다. 휴지통 탭으로 이동했습니다.' : 'Deleted device found. Switched to Trash tab.', 'info');
        }
      } else if (currentTab === 'sales') {
        if (soldMatch) {
          setSoldSelectedMonth('all');
          setCategoryFilter('all');
          setSoldSearchQuery(q);
          showToast(lang === 'ko' ? '검색 필터를 초기화하여 기기를 표시합니다.' : 'Cleared filters to show device.', 'success');
        } else if (activeMatch) {
          handleGoToTabAndSearch('ledger', q);
          showToast(lang === 'ko' ? '판매되지 않은 사내재고 기기입니다. 사내재고 탭으로 이동했습니다.' : 'Active stock found. Switched to Inventory tab.', 'info');
        } else if (pendingMatch) {
          handleGoToTabAndSearch('pending_intake', q);
          showToast(lang === 'ko' ? '입고 대기 상태의 기기입니다. 입고대기 탭으로 이동했습니다.' : 'Pending device found. Switched to Pending tab.', 'info');
        } else if (trashMatch) {
          handleGoToTabAndSearch('trash', q);
          showToast(lang === 'ko' ? '삭제된 기기입니다. 휴지통 탭으로 이동했습니다.' : 'Deleted device found. Switched to Trash tab.', 'info');
        }
      } else if (currentTab === 'pending_intake') {
        if (pendingMatch) {
          setCategoryFilter('all');
          setSearchQuery(q);
          showToast(lang === 'ko' ? '검색 필터를 초기화하여 기기를 표시합니다.' : 'Cleared filters to show device.', 'success');
        } else if (activeMatch) {
          handleGoToTabAndSearch('ledger', q);
          showToast(lang === 'ko' ? '입고 완료된 사내재고 기기입니다. 사내재고 탭으로 이동했습니다.' : 'Active stock found. Switched to Inventory tab.', 'info');
        } else if (soldMatch) {
          handleGoToTabAndSearch('sales', q);
          showToast(lang === 'ko' ? '판매완료된 기기입니다. 판매완료 탭으로 이동했습니다.' : 'Sold device found. Switched to Sales tab.', 'info');
        } else if (trashMatch) {
          handleGoToTabAndSearch('trash', q);
          showToast(lang === 'ko' ? '삭제된 기기입니다. 휴지통 탭으로 이동했습니다.' : 'Deleted device found. Switched to Trash tab.', 'info');
        }
      } else if (currentTab === 'trash') {
        if (trashMatch) {
          setTrashSearchQuery(q);
        } else if (activeMatch) {
          handleGoToTabAndSearch('ledger', q);
          showToast(lang === 'ko' ? '사내재고 탭으로 이동했습니다.' : 'Moved to Inventory tab.', 'info');
        } else if (soldMatch) {
          handleGoToTabAndSearch('sales', q);
          showToast(lang === 'ko' ? '판매완료 탭으로 이동했습니다.' : 'Moved to Sales tab.', 'info');
        } else if (pendingMatch) {
          handleGoToTabAndSearch('pending_intake', q);
          showToast(lang === 'ko' ? '입고대기 탭으로 이동했습니다.' : 'Moved to Pending tab.', 'info');
        }
      } else if (currentTab === 'installment') {
        const installmentDevices = devices.filter(d => !d.deleted_at && d.is_sold && d.sale_type === 'installment');
        const matchingInst = installmentDevices.filter(d => {
          const custNameMatch = d.customer_name?.toLowerCase().includes(q.toLowerCase());
          const custPhoneMatch = d.customer_phone?.includes(q);
          const stickerMatch = d.sticker?.toLowerCase().includes(q.toLowerCase());
          const imeiMatch = d.imei?.includes(q);
          const modelMatch = normalizeModelName(d.model_name).includes(qNorm);
          return custNameMatch || custPhoneMatch || stickerMatch || imeiMatch || modelMatch;
        });

        if (matchingInst.length > 0) {
          setInstSelectedMonth('all');
          setShowOverdueOnly(false);
          setInstallmentSearchQuery(q);
          showToast(lang === 'ko' ? '검색 필터를 초기화하여 할부 계약을 표시합니다.' : 'Cleared filters to show installment contract.', 'success');
        } else {
          if (activeMatch) {
            handleGoToTabAndSearch('ledger', q);
            showToast(lang === 'ko' ? '사내재고 기기입니다. 사내재고 탭으로 이동했습니다.' : 'Active stock found. Switched to Inventory tab.', 'info');
          } else if (soldMatch) {
            handleGoToTabAndSearch('sales', q);
            showToast(lang === 'ko' ? '판매완료된 기기입니다. 판매완료 탭으로 이동했습니다.' : 'Sold device found. Switched to Sales tab.', 'info');
          } else if (pendingMatch) {
            handleGoToTabAndSearch('pending_intake', q);
            showToast(lang === 'ko' ? '입고 대기 상태의 기기입니다. 입고대기 탭으로 이동했습니다.' : 'Pending device found. Switched to Pending tab.', 'info');
          } else if (trashMatch) {
            handleGoToTabAndSearch('trash', q);
            showToast(lang === 'ko' ? '삭제된 기기입니다. 휴지통 탭으로 이동했습니다.' : 'Deleted device found. Switched to Trash tab.', 'info');
          }
        }
      } else if (currentTab === 'cod') {
        const codDevices = devices.filter(d => !d.deleted_at && d.is_sold && d.sale_type === 'cod');
        const matchingCOD = codDevices.filter(d => {
          const custNameMatch = d.customer_name?.toLowerCase().includes(q.toLowerCase());
          const custPhoneMatch = d.customer_phone?.includes(q);
          const stickerMatch = d.sticker?.toLowerCase().includes(q.toLowerCase());
          const imeiMatch = d.imei?.includes(q);
          const modelMatch = normalizeModelName(d.model_name).includes(qNorm);
          return custNameMatch || custPhoneMatch || stickerMatch || imeiMatch || modelMatch;
        });

        if (matchingCOD.length > 0) {
          setCodSelectedMonth('all');
          setCodSearchQuery(q);
          showToast(lang === 'ko' ? '검색 필터를 초기화하여 COD 계약을 표시합니다.' : 'Cleared filters to show COD contract.', 'success');
        } else {
          if (activeMatch) {
            handleGoToTabAndSearch('ledger', q);
            showToast(lang === 'ko' ? '사내재고 기기입니다. 사내재고 탭으로 이동했습니다.' : 'Active stock found. Switched to Inventory tab.', 'info');
          } else if (soldMatch) {
            handleGoToTabAndSearch('sales', q);
            showToast(lang === 'ko' ? '판매완료된 기기입니다. 판매완료 탭으로 이동했습니다.' : 'Sold device found. Switched to Sales tab.', 'info');
          } else if (pendingMatch) {
            handleGoToTabAndSearch('pending_intake', q);
            showToast(lang === 'ko' ? '입고 대기 상태의 기기입니다. 입고대기 탭으로 이동했습니다.' : 'Pending device found. Switched to Pending tab.', 'info');
          } else if (trashMatch) {
            handleGoToTabAndSearch('trash', q);
            showToast(lang === 'ko' ? '삭제된 기기입니다. 휴지통 탭으로 이동했습니다.' : 'Deleted device found. Switched to Trash tab.', 'info');
          }
        }
      }
    }
  };

  // CSV Reader trigger for file upload selector
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const ab = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(ab, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          // Convert the 2D array to CSV format so it can be previewed and processed identically
          const csvContent = rows.map(row => 
            row.map(cell => {
              if (cell === null || cell === undefined) return '';
              const str = String(cell);
              if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            }).join(',')
          ).join('\n');
          
          setCsvFileText(csvContent);
        } catch (err: any) {
          showToast('Excel parse error: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvFileText(event.target?.result as string || '');
      };
      reader.readAsText(file, 'utf-8');
    }
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

          <button 
            className={`sb-link ${activeTab === 'history_log' ? 'active' : ''}`}
            onClick={() => handleTabChange('history_log')}
          >
            <span className="ico">📋</span> 재고/판매 로그
          </button>

          {(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (
            <>
              <button 
                className={`sb-link ${activeTab === 'installment' ? 'active' : ''}`}
                onClick={() => handleTabChange('installment')}
              >
                <span className="ico">💳</span> {t('staff_menu_installment')}
              </button>

              <button 
                className={`sb-link ${activeTab === 'cod' ? 'active' : ''}`}
                onClick={() => handleTabChange('cod')}
              >
                <span className="ico">💵</span> {t('staff_menu_cod')}
              </button>
            </>
          )}

          {staffProfile?.role === 'admin' && (
            <button 
              className={`sb-link ${activeTab === 'partner_transfer' ? 'active' : ''}`}
              onClick={() => handleTabChange('partner_transfer')}
            >
              <span className="ico">🔌</span> 협력사 이관 요청 {(() => {
                const reqCount = devices.filter(d => !d.deleted_at && d.notes && d.notes.includes('[이관신청:')).length;
                return reqCount > 0 ? (
                  <span style={{ background: 'var(--red)', color: '#fff', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>{reqCount}</span>
                ) : null;
              })()}
            </button>
          )}

          <button 
            className={`sb-link ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => handleTabChange('customers')}
          >
            <span className="ico">👤</span> {t('staff_menu_customers')}
          </button>

          <button 
            className={`sb-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <span className="ico">⚙️</span> {t('staff_menu_settings') || '기준 정보 관리'}
          </button>

          {currentPermissions.can_view_margin && (
            <button 
              className={`sb-link ${activeTab === 'margin' ? 'active' : ''}`}
              onClick={() => handleTabChange('margin')}
            >
              <span className="ico">📈</span> {t('staff_menu_margin')}
            </button>
          )}

          <button 
            className={`sb-link ${activeTab === 'trash' ? 'active' : ''}`}
            onClick={() => handleTabChange('trash')}
          >
            <span className="ico">🗑️</span> {t('staff_menu_trash')}
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
              {activeTab === 'pending_intake' && `📥 ${t('staff_menu_pending_intake')}`}
              {activeTab === 'history_log' && `📋 ${t('staff_menu_history_log')}`}
              {activeTab === 'installment' && `💳 ${t('staff_menu_installment')}`}
              {activeTab === 'cod' && `💵 ${t('staff_menu_cod')}`}
              {activeTab === 'partner_transfer' && `👥 협력사 이관 요청 관리`}
              {activeTab === 'customers' && `👤 ${t('staff_menu_customers')}`}
              {activeTab === 'settings' && `⚙️ ${t('staff_menu_settings')}`}
              {activeTab === 'margin' && `📈 ${t('staff_menu_margin')}`}
              {activeTab === 'trash' && `🗑️ ${t('staff_menu_trash')}`}
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

        {/* Global Search Results Alert Banner */}
        {globalSearchHelper && (globalSearchHelper.otherTabMatches.length > 0 || globalSearchHelper.hiddenInCurrentTab.length > 0) && (
          <div 
            className="animate-slide-up"
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '10px 16px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: isGlobalSearchHelperCollapsed ? '0px' : '8px',
              fontSize: '13px',
              color: '#92400e',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                <span>🔍</span>
                <span>{lang === 'ko' ? `검색어 "${globalSearchHelper.query}"에 대한 추가 검색 결과` : `Global search results for "${globalSearchHelper.query}"`}</span>
              </div>
              <button
                onClick={() => setIsGlobalSearchHelperCollapsed(prev => !prev)}
                style={{
                  background: 'rgba(180, 83, 9, 0.08)',
                  border: '1px solid rgba(180, 83, 9, 0.2)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#b45309',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  margin: 0,
                  transition: 'all 0.2s'
                }}
              >
                {isGlobalSearchHelperCollapsed 
                  ? (lang === 'ko' ? '펼치기 ▽' : 'ขยาย ▽') 
                  : (lang === 'ko' ? '접기 △' : 'ย่อ △')}
              </button>
            </div>
            {!isGlobalSearchHelperCollapsed && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                {globalSearchHelper.hiddenInCurrentTab.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️</span>
                    <span>
                      {lang === 'ko' 
                        ? `현재 탭에 ${globalSearchHelper.hiddenInCurrentTab.length}건이 있으나 필터(위치/기종)에 의해 가려졌습니다.`
                        : `${globalSearchHelper.hiddenInCurrentTab.length} items match in this tab but are hidden by active filters.`
                      }
                    </span>
                    <button
                      onClick={() => {
                        setLocationFilter('all');
                        setCategoryFilter('all');
                        setSoldSelectedMonth('all');
                      }}
                      style={{
                        background: '#fff',
                        border: '1px solid #fcd34d',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#b45309',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {lang === 'ko' ? '필터 해제' : 'Clear Filters'}
                    </button>
                  </div>
                )}

                {globalSearchHelper.otherTabMatches.map((m, idx) => {
                  const tabNameMap: Record<string, string> = {
                    ledger: lang === 'ko' ? '사내 재고' : 'Inventory',
                    pending_intake: lang === 'ko' ? '입고 대기' : 'Pending',
                    sales: lang === 'ko' ? '판매 완료' : 'Sales',
                    trash: lang === 'ko' ? '휴지통' : 'Trash'
                  };
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.6)', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
                      <span>📍</span>
                      <span style={{ fontWeight: 600 }}>[{tabNameMap[m.tab]}]</span>
                      <span>{m.device.model_name} {m.device.sticker ? `(${m.device.sticker})` : ''}</span>
                      <button
                        onClick={() => handleGoToTabAndSearch(m.tab, globalSearchHelper.query)}
                        style={{
                          background: 'var(--purple)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(124,58,237,0.2)'
                        }}
                      >
                        {lang === 'ko' ? '이동' : 'Go to'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                  onKeyDown={(e) => handleSearchKeyPress(e, 'pending_intake')}
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
                  onKeyDown={(e) => handleSearchKeyPress(e, 'ledger')}
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

                {staffProfile?.role === 'admin' && (
                  <select
                    value={partnerShareFilter}
                    onChange={(e) => setPartnerShareFilter(e.target.value as any)}
                    className="form-input"
                    style={{ maxWidth: '150px', margin: 0, padding: '8px 12px', fontSize: '13px', border: '1px solid var(--purple-l)', color: 'var(--purple-l)', fontWeight: 800 }}
                  >
                    <option value="all">👥 전체 공유 상태</option>
                    <option value="shared">🔮 협력사 공유 중</option>
                    <option value="unshared">⚪ 협력사 미공유</option>
                  </select>
                )}

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
                  <>
                    <button
                      style={{ margin: 0, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: 'none', color: '#fff', padding: '6px 14px', fontSize: '11px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(124,58,237,0.35)' }}
                      onClick={handleOpenBulkSaleModal}
                    >
                      📦 {t('staff_btn_bulk_sale') || '대량 판매'} ({selectedIds.length})
                    </button>
                    {staffProfile?.role === 'admin' && (
                      <button
                        style={{ margin: 0, background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.25)', color: 'var(--purple-l)', padding: '6px 14px', fontSize: '11px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={handleOpenBulkPartnerShareModal}
                      >
                        👥 협력사 일괄 공유 ({selectedIds.length})
                      </button>
                    )}
                    <button
                      style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--green)', padding: '6px 14px', fontSize: '11px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handlePrintPriceList}
                    >
                      🏷️ {lang === 'ko' ? '가격표 인쇄' : 'พิมพ์ใบราคา'} ({selectedIds.length})
                    </button>
                    <button
                      style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkDelete}
                    >
                      🗑️ {t('staff_btn_delete_selected')} ({selectedIds.length})
                    </button>
                  </>
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
                          style={{ fontWeight: 700, color: 'var(--purple-l)', cursor: currentPermissions.can_edit_core_device_fields ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_core_device_fields) return;
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
                          style={{ color: 'var(--t2)', cursor: currentPermissions.can_edit_core_device_fields ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_core_device_fields) return;
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
                          style={{ fontWeight: 700, wordBreak: 'break-all', cursor: currentPermissions.can_edit_core_device_fields ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_core_device_fields) return;
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
                          style={{ fontSize: '11px', wordBreak: 'break-all', cursor: currentPermissions.can_edit_core_device_fields ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_core_device_fields) return;
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
                          style={{ cursor: currentPermissions.can_edit_core_device_fields ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_core_device_fields) return;
                            if (editingCell?.id !== item.id || editingCell?.field !== 'color') {
                              setEditingCell({ id: item.id, field: 'color' });
                              setEditCellValue(item.color || '');
                            }
                          }}
                        >
                          {editingCell?.id === item.id && editingCell?.field === 'color' ? (
                            <select
                              value={editCellValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '___custom___') {
                                  const customVal = prompt('직접 입력할 색상을 영어로 입력하세요 (예: STARLIGHT):');
                                  if (customVal !== null) {
                                    const upper = customVal.trim().toUpperCase();
                                    if (upper) {
                                      setEditCellValue(upper);
                                      handleInlineSave(item.id, 'color', upper);
                                    }
                                  }
                                  setEditingCell(null);
                                } else {
                                  setEditCellValue(val);
                                  handleInlineSave(item.id, 'color', val);
                                  setEditingCell(null);
                                }
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="form-input"
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '95%' }}
                            >
                              {item.color && !standardColors.includes(item.color.toUpperCase()) && (
                                <option value={item.color}>{item.color} (현재값)</option>
                              )}
                              <option value="">선택 안함</option>
                              {standardColors.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                              <option value="___custom___" style={{ color: 'var(--purple)', fontWeight: 700 }}>✍️ 직접 입력...</option>
                            </select>
                          ) : (
                            item.color || '-'
                          )}
                        </td>
                        <td 
                          style={{ textAlign: 'center', cursor: currentPermissions.can_edit_battery ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_battery) return;
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
                          style={{ textAlign: 'right', fontWeight: 700, color: '#e11d48', cursor: currentPermissions.can_edit_cost ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_cost) return;
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
                          style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', cursor: currentPermissions.can_edit_price ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_price) return;
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
                        {(staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (() => {
                          const price = item.selling_price || 0;
                          const cost = price === 0 ? 0 : (item.purchase_cost_krw || 0);
                          const margin = price === 0 ? 0 : (Math.round(price * exchangeRate) - cost);
                          return (
                            <td style={{ textAlign: 'right', fontWeight: 700, color: margin >= 0 ? 'var(--green)' : '#e11d48' }}>
                              ₩{formatPrice(margin)}
                            </td>
                          );
                        })()}
                        <td
                          style={{ cursor: currentPermissions.can_edit_core_device_fields ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_core_device_fields) return;
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
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              {item.is_reserved && (
                                <span style={{ color: '#d97706', fontWeight: 700 }}>
                                  👤 {item.reserved_by} {item.reserved_date ? `(${item.reserved_date})` : ''}
                                </span>
                              )}
                              {item.notes && <span style={{ color: 'var(--t1)' }}>{item.notes}</span>}
                              {!item.is_reserved && !item.notes && '-'}
                            </div>
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
                            {staffProfile?.role === 'admin' && (() => {
                              const isShared = item.notes && item.notes.includes('[협력사공개]');
                              return (
                                <button
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    minWidth: '28px',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    background: isShared ? 'var(--purple-l)' : 'transparent',
                                    color: isShared ? '#ffffff' : '#94a3b8',
                                    border: isShared ? '1px solid var(--purple)' : '1px solid #cbd5e1',
                                    cursor: 'pointer',
                                    boxShadow: isShared ? '0 2px 4px rgba(124,58,237,0.3)' : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                  onClick={() => handleTogglePartnerVisible(item)}
                                  title={isShared ? '협력사 공유 해제 (Currently shared)' : '협력사 공유 설정 (Not shared)'}
                                >
                                  👥
                                </button>
                              );
                            })()}
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
                  onKeyDown={(e) => handleSearchKeyPress(e, 'sales')}
                  className="form-input"
                  style={{ maxWidth: '220px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                />

                <select
                  value={soldSelectedMonth}
                  onChange={(e) => setSoldSelectedMonth(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="all">{t('staff_all_months')}</option>
                  {soldMonths.map(month => (
                    <option key={month} value={month}>{formatMonthDropdownLabel(month, lang)}</option>
                  ))}
                </select>

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
                        : (() => {
                            const sortedDays = [...soldSelectedDays].sort((a, b) => a - b);
                            const monthPrefix = getMonthLabel(soldSelectedMonth, lang);
                            if (lang === 'ko') {
                              return `${monthPrefix} ${sortedDays.map(d => `${d}일`).join(', ')}`;
                            } else if (lang === 'th') {
                              return `${monthPrefix} วันที่ ${sortedDays.join(', ')}`;
                            } else {
                              return `${monthPrefix} ${sortedDays.map(d => `${d}`).join(', ')}`;
                            }
                          })()}
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
                      style={{ margin: 0, background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', border: 'none', color: '#fff', padding: '6px 14px', fontSize: '11px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(14,165,233,0.35)' }}
                      onClick={handleOpenReceiptModal}
                    >
                      🖨️ 영수증 출력 ({selectedIds.length})
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
                        <td 
                          style={{ textAlign: 'right', color: '#94a3b8', cursor: currentPermissions.can_edit_cost ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!currentPermissions.can_edit_cost) return;
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
                              style={{ margin: 0, padding: '2px 4px', fontSize: '12px', width: '90%', textAlign: 'right', display: 'inline-block' }}
                            />
                          ) : (
                            <span style={currentPermissions.can_edit_cost ? { textDecoration: 'underline dotted var(--border)' } : undefined}>
                              ₩{formatPrice(item.purchase_cost_krw)}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{formatPrice(item.selling_price)}</td>
                        <td style={{ fontSize: '11.5px', color: 'var(--t1)' }}>
                          {getSaleDetailsLabel(item)}
                          {item.installment_number && (
                            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--purple-l)', fontWeight: 800 }}>
                              📄 {item.installment_number}
                            </div>
                          )}
                          {(item.customer_name || item.customer_phone || staffProfile?.role === 'admin' || currentPermissions.can_edit_customer_info) && (
                            <div style={{ marginTop: '2px', fontSize: '10.5px', color: 'var(--t2)', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              <span>👤</span>
                              {/* Customer Name */}
                              {staffProfile?.role === 'admin' || currentPermissions.can_edit_customer_info ? (
                                editingCell?.id === item.id && editingCell?.field === 'customer_name' ? (
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
                                    style={{ margin: 0, padding: '2px 4px', fontSize: '11px', height: '22px', width: '80px', display: 'inline-block' }}
                                  />
                                ) : (
                                  <span
                                    style={{ cursor: 'pointer', textDecoration: 'underline dotted var(--border)' }}
                                    onClick={() => {
                                      setEditingCell({ id: item.id, field: 'customer_name' });
                                      setEditCellValue(item.customer_name || '');
                                    }}
                                    title={t('staff_click_to_edit') || '클릭하여 수정'}
                                  >
                                    {item.customer_name || '미기입'}
                                  </span>
                                )
                              ) : (
                                <span>{item.customer_name || '미기입'}</span>
                              )}

                              {/* Customer Phone */}
                              {staffProfile?.role === 'admin' || currentPermissions.can_edit_customer_info ? (
                                editingCell?.id === item.id && editingCell?.field === 'customer_phone' ? (
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
                                    style={{ margin: 0, padding: '2px 4px', fontSize: '11px', height: '22px', width: '90px', display: 'inline-block' }}
                                  />
                                ) : (
                                  <span
                                    style={{ cursor: 'pointer', textDecoration: 'underline dotted var(--border)', marginLeft: '2px' }}
                                    onClick={() => {
                                      setEditingCell({ id: item.id, field: 'customer_phone' });
                                      setEditCellValue(item.customer_phone || '');
                                    }}
                                    title={t('staff_click_to_edit') || '클릭하여 수정'}
                                  >
                                    {item.customer_phone ? `(${item.customer_phone})` : '(전화번호 없음)'}
                                  </span>
                                )
                              ) : (
                                item.customer_phone ? <span style={{ marginLeft: '2px' }}>({item.customer_phone})</span> : null
                              )}
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
                         <td style={{ fontWeight: 700 }}>
                          {staffProfile?.role === 'admin' ? (
                            editingCell?.id === item.id && editingCell?.field === 'seller_name' ? (
                              <input
                                type="text"
                                value={editCellValue}
                                onChange={(e) => setEditCellValue(e.target.value)}
                                onBlur={() => handleInlineSave(item.id, 'seller_name', editCellValue)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(item.id, 'seller_name', editCellValue);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                autoFocus
                                className="form-input"
                                style={{ margin: 0, padding: '2px 4px', fontSize: '12px', height: '26px', width: '100px', display: 'inline-block' }}
                              />
                            ) : (
                              <span
                                style={{ cursor: 'pointer', textDecoration: 'underline dotted var(--border)' }}
                                onClick={() => {
                                  setEditingCell({ id: item.id, field: 'seller_name' });
                                  setEditCellValue(item.seller_name || '');
                                }}
                                title={t('staff_click_to_edit')}
                              >
                                {item.seller_name || t('staff_unassigned')}
                              </span>
                            )
                          ) : (
                            item.seller_name || '-'
                          )}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--t2)' }}>{item.notes || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {!item.is_approved && currentPermissions.can_approve_sale && (
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
          const targetYearNum = instSelectedMonth !== 'all' ? Number(instSelectedMonth.split('-')[0]) : now.getFullYear();
          const targetMonthNum = instSelectedMonth !== 'all' ? Number(instSelectedMonth.split('-')[1]) : (now.getMonth() + 1);
          const filterYear = targetYearNum % 100;
          const filterMonth = targetMonthNum;
          const currMonth = now.getMonth() + 1;
          
          const parseDueDate = (dueDate: string) => {
            if (!dueDate) return null;
            const pts = dueDate.split('.').map(x => x.trim()).filter(Boolean);
            if (pts.length >= 3) {
              const y = 2000 + Number(pts[0]);
              const m = Number(pts[1]) - 1; // 0-indexed month
              const d = Number(pts[2]);
              return new Date(y, m, d);
            }
            return null;
          };

          const checkIsOverdue = (dueDate: string, status: string) => {
            if (status !== 'unpaid') return false;
            const dueDateObj = parseDueDate(dueDate);
            if (!dueDateObj) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDateObj < today;
          };

          const isDueInSelectedMonth = (dueDate: string) => {
            if (!dueDate) return false;
            const pts = dueDate.split('.').map(x => x.trim()).filter(Boolean);
            if (pts.length >= 2) {
              return Number(pts[0]) === filterYear && Number(pts[1]) === filterMonth;
            }
            return false;
          };

          let expectedThisMonth = 0;
          let collectedThisMonth = 0;
          let totalUnpaidBalance = 0;
          
          installmentDevices.forEach(d => {
            const isFullyPaid = d.payment_status === 'paid';
            const history = d.installment_history || [];
            history.forEach((h: any) => {
              if (isDueInSelectedMonth(h.due_date)) {
                expectedThisMonth += Number(h.amount) || 0;
                if (h.status === 'paid') {
                  collectedThisMonth += Number(h.amount) || 0;
                }
              }
              if (h.status === 'unpaid' && !isFullyPaid) {
                totalUnpaidBalance += Number(h.amount) || 0;
              }
            });
          });
          
          const remainingThisMonth = expectedThisMonth - collectedThisMonth;

          // Filter installments based on search query, month filter, and overdue filter
          const filteredInstallments = installmentDevices.filter(d => {
            const history = d.installment_history || [];

            // 1. Month filter: show only contracts that have a payment due in the selected month
            if (!installmentSearchQuery && instSelectedMonth !== 'all') {
              const hasDue = history.some((h: any) => isDueInSelectedMonth(h.due_date));
              if (!hasDue) return false;
            }

            // 2. Overdue filter: show only contracts that have an unpaid installment past today's date
            if (!installmentSearchQuery && showOverdueOnly) {
              const hasOverdue = history.some((h: any) => checkIsOverdue(h.due_date, h.status));
              if (!hasOverdue) return false;
            }

            // 3. Paid-in-month filter
            if (!installmentSearchQuery && showMonthPaidOnly) {
              const isFinished = d.payment_status === 'paid';
              const isMonthPaid = history.some((h: any) => isDueInSelectedMonth(h.due_date) && h.status === 'paid');
              const isRowGray = isFinished || (instSelectedMonth !== 'all' && isMonthPaid);
              if (!isRowGray) return false;
            }

            // 4. Fully-paid filter
            if (!installmentSearchQuery && showFullyPaidOnly) {
              const isFinished = d.payment_status === 'paid';
              if (!isFinished) return false;
            }

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
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>
                      {instSelectedMonth !== 'all' ? `${targetMonthNum}월 청구 예정액` : `이번 달 청구 예정액 (${currMonth}월)`}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--purple-l)', marginTop: '4px' }}>฿{expectedThisMonth.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>총 청구 회차 합산</div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🟢</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>
                      {instSelectedMonth !== 'all' ? `${targetMonthNum}월 수납 완료액` : '이번 달 수납 완료액'}
                    </div>
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={t('staff_search_cod_placeholder')}
                    value={installmentSearchQuery}
                    onChange={(e) => setInstallmentSearchQuery(e.target.value)}
                    onKeyDown={(e) => handleSearchKeyPress(e, 'installment')}
                    className="form-input"
                    style={{ maxWidth: '240px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, marginLeft: '8px' }}>{t('staff_billing_month')}</span>
                  <select
                    value={instSelectedMonth}
                    onChange={(e) => setInstSelectedMonth(e.target.value)}
                    className="form-input"
                    style={{ width: '150px', margin: 0, padding: '6px 12px', fontSize: '13px', height: '34px' }}
                  >
                    <option value="all">{t('staff_all_months')}</option>
                    {soldMonths.map(month => (
                      <option key={month} value={month}>{formatMonthDropdownLabel(month, lang)}</option>
                    ))}
                  </select>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginLeft: '12px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={showOverdueOnly}
                      onChange={(e) => {
                        setShowOverdueOnly(e.target.checked);
                        if (e.target.checked) {
                          setShowMonthPaidOnly(false);
                          setShowFullyPaidOnly(false);
                        }
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ color: 'var(--red)' }}>⚠️ {t('staff_overdue_only')}</span>
                  </label>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginLeft: '12px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={showMonthPaidOnly}
                      onChange={(e) => {
                        setShowMonthPaidOnly(e.target.checked);
                        if (e.target.checked) {
                          setShowOverdueOnly(false);
                          setShowFullyPaidOnly(false);
                        }
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ color: 'var(--green)' }}>🟢 {lang === 'ko' ? '당월 완납 고객만 보기' : 'แสดงเฉพาะผู้ที่ชำระงวดเดือนนี้แล้ว'}</span>
                  </label>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, marginLeft: '12px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={showFullyPaidOnly}
                      onChange={(e) => {
                        setShowFullyPaidOnly(e.target.checked);
                        if (e.target.checked) {
                          setShowOverdueOnly(false);
                          setShowMonthPaidOnly(false);
                        }
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ color: 'var(--purple-l)' }}>🔒 {lang === 'ko' ? '전체 완납 고객만 보기' : 'แสดงเฉพาะผู้ที่ชำระครบทั้งหมดแล้ว'}</span>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple-l)' }}>
                    {t('staff_total_installment_count', { total: installmentDevices.length, searched: filteredInstallments.length })}
                  </span>
                  {instSelectedMonth !== 'all' && (
                    <button
                      type="button"
                      style={{
                        margin: 0,
                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        border: 'none',
                        color: '#fff',
                        padding: '6px 14px',
                        fontSize: '11.5px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(139,92,246,0.35)',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setIsInstallmentPrintModalOpen(true)}
                    >
                      🖨️ {lang === 'ko' ? '할부수금 대장 인쇄' : 'พิมพ์สมุดรับงวด'}
                    </button>
                  )}
                </div>
              </div>

              {/* Installment Table */}
              <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
                <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '8%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                        {t('staff_th_purchase_date')} {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '13%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                        {t('staff_th_device_info')} {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('installment_number')}>
                        {t('staff_th_installment_customer')} {sortField === 'installment_number' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '14%', cursor: 'pointer' }} onClick={() => toggleSort('installment_amount')}>
                        {t('staff_th_installment_terms')} {sortField === 'installment_amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                        {t('staff_th_payment_vs_total')} {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th style={{ width: '30%' }}>{t('staff_th_installment_rounds')}</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>{t('staff_th_actions2')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstallments.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                          {t('staff_no_installments')}
                        </td>
                      </tr>
                    ) : (
                      sortDevices(filteredInstallments).map(item => {
                        const history = item.installment_history || [];
                        const paidTotal = history.filter((h: any) => h.status === 'paid').reduce((s: number, h: any) => s + (Number(h.amount) || 0), 0);
                        const totalInstPrice = (item.installment_months || 0) * (item.installment_amount || 0);
                        const isFinished = item.payment_status === 'paid';
                        const hasOverdue = history.some((h: any) => checkIsOverdue(h.due_date, h.status));
                        
                        const isMonthPaid = history.some((h: any) => isDueInSelectedMonth(h.due_date) && h.status === 'paid');
                        const isRowGray = isFinished || (instSelectedMonth !== 'all' && isMonthPaid);
                        
                        return (
                          <tr key={item.id} style={{ background: isRowGray ? '#f4f4f5' : '#fff', opacity: isRowGray ? 0.65 : 1 }}>
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
                                  style={{ fontWeight: 800, color: 'var(--purple-l)', cursor: currentPermissions.can_edit_customer_info ? 'pointer' : 'default', marginBottom: '6px', fontSize: '12.5px' }}
                                  onClick={() => {
                                    if (!currentPermissions.can_edit_customer_info) return;
                                    setEditingCell({ id: item.id, field: 'installment_number' });
                                    setEditCellValue(item.installment_number || 'IRIS000000');
                                  }}
                                  title={t('staff_click_to_edit')}
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
                                  style={{ fontWeight: 700, color: 'var(--t1)', cursor: currentPermissions.can_edit_customer_info ? 'pointer' : 'default', fontSize: '11.5px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}
                                  onClick={() => {
                                    if (!currentPermissions.can_edit_customer_info) return;
                                    setEditingCell({ id: item.id, field: 'customer_name' });
                                    setEditCellValue(item.customer_name || '');
                                  }}
                                  title={t('staff_click_to_edit')}
                                >
                                  <span>👤 {item.customer_name || t('unfilled')}</span>
                                  {hasOverdue && (
                                    <span style={{ 
                                      background: 'var(--red)', 
                                      color: '#fff', 
                                      padding: '1px 5px', 
                                      borderRadius: '4px', 
                                      fontSize: '9px', 
                                      fontWeight: 'bold', 
                                      display: 'inline-block'
                                    }}>
                                      {t('staff_overdue_badge')}
                                    </span>
                                  )}
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
                                  style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '4px', cursor: currentPermissions.can_edit_customer_info ? 'pointer' : 'default' }}
                                  onClick={() => {
                                    if (!currentPermissions.can_edit_customer_info) return;
                                    setEditingCell({ id: item.id, field: 'customer_phone' });
                                    setEditCellValue(item.customer_phone || '');
                                  }}
                                  title={t('staff_click_to_edit')}
                                >
                                  📞 {item.customer_phone || t('unfilled')}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{t('staff_label_deposit') || '인도금'}: ฿{formatPrice(item.deposit_amount || 0)}</div>
                              <div style={{ fontSize: '11px', fontWeight: 700 }}>{t('staff_label_installment_monthly') || '분납'}: ฿{formatPrice(item.installment_amount || 0)} x {item.installment_months}{t('months_unit')}</div>
                              <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>{t('staff_label_final_price') || '최종 판매가'}: ฿{formatPrice((item.deposit_amount || 0) + totalInstPrice)}</div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800 }}>
                              <div style={{ color: isFinished ? 'var(--green)' : '#d97706' }}>฿{formatPrice(paidTotal)} / ฿{formatPrice(totalInstPrice)}</div>
                              <div style={{ fontSize: '10.5px', color: isFinished ? 'var(--t3)' : 'var(--red)', fontWeight: 'bold', marginTop: '2px' }}>
                                {isFinished ? t('staff_status_paid') || '완납' : `${t('staff_balance_remaining') || '남은금액'}: ฿${formatPrice(totalInstPrice - paidTotal)}`}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {history.map((inst: any, idx: number) => {
                                  const isPaid = inst.status === 'paid';
                                  const isOverdue = checkIsOverdue(inst.due_date, inst.status);
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        if (!currentPermissions.can_edit_customer_info) {
                                          showToast('권한이 없습니다. (No permission.)', 'error');
                                          return;
                                        }
                                        handleToggleInstallmentStatus(item.id, inst.sequence);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '4px 2px',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        background: isPaid ? 'rgba(16, 185, 129, 0.1)' : isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.05)',
                                        color: isPaid ? 'var(--green)' : 'var(--red)',
                                        border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.25)' : isOverdue ? 'var(--red)' : 'rgba(239, 68, 68, 0.15)'}`,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        boxSizing: 'border-box'
                                      }}
                                      title={`${t('staff_due_date') || '예정일'}: ${inst.due_date}${inst.paid_date ? ` (${t('staff_payment_date') || '수금일'}: ${inst.paid_date})` : ''}${isOverdue ? t('staff_overdue_suffix') : ''}`}
                                    >
                                      {inst.sequence}{t('staff_round_unit') || '회차'} ({inst.due_date.split('.').slice(1,2).join('.')}{t('staff_month_unit') || '월'}): ฿{formatPrice(inst.amount)} {isPaid ? '🟢' : isOverdue ? '⚠️' : '🔴'}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {!isFinished ? (
                                <button
                                  className="btn-sm btn-green"
                                  onClick={() => handleFinalizeInstallment(item.id)}
                                  style={{ padding: '4px 8px', fontSize: '10.5px', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', cursor: 'pointer' }}
                                >
                                  {t('staff_btn_finalize') || '완납 처리'}
                                </button>
                              ) : (
                                <button
                                  className="btn-sm btn-red"
                                  onClick={() => handleCancelPayment(item.id, 'installment')}
                                  style={{ padding: '4px 8px', fontSize: '10.5px', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', cursor: 'pointer' }}
                                >
                                  {t('staff_btn_cancel_finalize') || '완납 취소'}
                                </button>
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

            {/* Staff Role Permissions Card */}
            {staffProfile?.role === 'admin' && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️</span> 등급별 권한 관리 (Staff Role Permissions)
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--t2)', lineHeight: 1.4 }}>
                  각 스태프 권한 등급별(Admin, Manager, Staff)로 재고 수정 및 마진 정산 접근 권한을 개별 통제할 수 있습니다.
                  <br />
                  <span style={{ fontSize: '12px', color: 'var(--purple-l)', fontWeight: 700 }}>
                    💡 팁: 브라우저에 즉시 저장되어 적용되며, 다른 PC/환경과 실시간 동기화하려면 아래의 SQL 명령을 Supabase 대시보드 SQL Editor에 실행해 주세요.
                  </span>
                </p>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>권한 등급 (Role)</th>
                        <th style={{ textAlign: 'center' }}>📈 마진 탭 조회</th>
                        <th style={{ textAlign: 'center' }}>💰 마진/원가 상세 조회</th>
                        <th style={{ textAlign: 'center' }}>🏷️ 소매판매가 수정</th>
                        <th style={{ textAlign: 'center' }}>₩ 매입원가 수정</th>
                        <th style={{ textAlign: 'center' }}>🔋 배터리 수치 수정</th>
                        <th style={{ textAlign: 'center' }}>⚙️ 기기 핵심정보 수정</th>
                        <th style={{ textAlign: 'center' }}>✅ 판매 승인 처리</th>
                        <th style={{ textAlign: 'center' }}>👤 고객 정보 수정</th>
                        <th style={{ textAlign: 'center' }}>🗑️ 휴지통 영구삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['admin', 'manager', 'staff'].map((role) => {
                        const isSystemAdmin = role === 'admin';
                        const perms = rolePermissions[role] || {};
                        return (
                          <tr key={role}>
                            <td style={{ fontWeight: 800, textTransform: 'uppercase', color: isSystemAdmin ? 'var(--purple-l)' : 'var(--t1)' }}>
                              {role === 'admin' ? '👑 Admin' : role === 'manager' ? '👤 Manager' : '💼 Staff'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_view_margin || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_view_margin')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_view_margin_detail || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_view_margin_detail')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_edit_price || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_edit_price')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_edit_cost || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_edit_cost')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_edit_battery || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_edit_battery')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_edit_core_device_fields || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_edit_core_device_fields')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_approve_sale || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_approve_sale')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_edit_customer_info || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_edit_customer_info')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={perms.can_permanent_delete || false}
                                disabled={isSystemAdmin}
                                onChange={() => handleTogglePermission(role, 'can_permanent_delete')}
                                style={{ transform: 'scale(1.2)', cursor: isSystemAdmin ? 'default' : 'pointer' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <details style={{ marginTop: '10px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                  <summary style={{ fontWeight: 700, fontSize: '13px', cursor: 'pointer', color: 'var(--t2)' }}>
                    🛠️ 데이터베이스 동기화 SQL 보기 (Supabase SQL Editor 실행용)
                  </summary>
                  <pre style={{ margin: '8px 0 0 0', padding: '10px', background: '#0f172a', color: '#38bdf8', fontSize: '11px', borderRadius: '6px', overflowX: 'auto', fontFamily: 'monospace' }}>
{`CREATE TABLE IF NOT EXISTS public.settings_role_permissions (
    role text PRIMARY KEY,
    can_view_margin boolean DEFAULT false,
    can_view_margin_detail boolean DEFAULT false,
    can_edit_price boolean DEFAULT false,
    can_edit_cost boolean DEFAULT false,
    can_edit_battery boolean DEFAULT false,
    can_edit_core_device_fields boolean DEFAULT false,
    can_approve_sale boolean DEFAULT false,
    can_edit_customer_info boolean DEFAULT false,
    can_view_trash boolean DEFAULT false,
    can_permanent_delete boolean DEFAULT false
);

-- 기존 테이블이 있다면 컬럼 추가
ALTER TABLE public.settings_role_permissions ADD COLUMN IF NOT EXISTS can_view_trash boolean DEFAULT false;
ALTER TABLE public.settings_role_permissions ADD COLUMN IF NOT EXISTS can_permanent_delete boolean DEFAULT false;

INSERT INTO public.settings_role_permissions (role, can_view_margin, can_view_margin_detail, can_edit_price, can_edit_cost, can_edit_battery, can_edit_core_device_fields, can_approve_sale, can_edit_customer_info, can_view_trash, can_permanent_delete)
VALUES 
('admin', true, true, true, true, true, true, true, true, true, true),
('manager', true, false, true, true, true, false, false, false, true, false),
('staff', false, false, false, false, false, false, false, false, false, false)
ON CONFLICT (role) DO UPDATE SET
  can_view_margin = EXCLUDED.can_view_margin,
  can_view_margin_detail = EXCLUDED.can_view_margin_detail,
  can_edit_price = EXCLUDED.can_edit_price,
  can_edit_cost = EXCLUDED.can_edit_cost,
  can_edit_battery = EXCLUDED.can_edit_battery,
  can_edit_core_device_fields = EXCLUDED.can_edit_core_device_fields,
  can_approve_sale = EXCLUDED.can_approve_sale,
  can_edit_customer_info = EXCLUDED.can_edit_customer_info,
  can_view_trash = EXCLUDED.can_view_trash,
  can_permanent_delete = EXCLUDED.can_permanent_delete;`}
                  </pre>
                </details>
              </div>
            )}

          </div>
        )}

        {/* ==================== VIEW 5: MARGIN & SETTLEMENT ==================== */}
        {activeTab === 'margin' && currentPermissions.can_view_margin && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header and Monthly Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{t('margin_title')}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{lang === 'ko' ? '정산 월 (판매 기준):' : (lang === 'th' ? 'เดือนที่ขาย:' : 'Settlement Month (Sale Date):')}</span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {isMarginMonthFilterOpen && (
                    <div 
                      onClick={() => setIsMarginMonthFilterOpen(false)} 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: 'transparent' }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMarginMonthFilterOpen(!isMarginMonthFilterOpen)}
                    className="form-input"
                    style={{
                      margin: 0,
                      padding: '6px 12px',
                      fontSize: '13px',
                      height: '34px',
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minWidth: '160px',
                      justifyContent: 'space-between',
                      position: 'relative',
                      zIndex: 1000
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      📅 {marginSelectedMonths.length === 0 
                        ? (lang === 'ko' ? '전체 월 (All Months)' : (lang === 'th' ? 'ทุกเดือน (All Months)' : 'All Months'))
                        : `${marginSelectedMonths.sort((a,b)=>b.localeCompare(a)).map(m => formatMonthDropdownLabel(m, lang)).join(', ')}`}
                    </span>
                    <span>▼</span>
                  </button>

                  {isMarginMonthFilterOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        zIndex: 1000,
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        marginTop: '4px',
                        padding: '12px',
                        width: '260px',
                        maxHeight: '350px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setMarginSelectedMonths([])}
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
                          {lang === 'ko' ? '전체 월 선택 (All)' : (lang === 'th' ? 'ล้างค่า (ทุกเดือน)' : 'Select All')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMarginMonthFilterOpen(false)}
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
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          overflowY: 'auto',
                          maxHeight: '220px',
                          padding: '2px'
                        }}
                      >
                        {customerMonths.map(month => {
                          const isChecked = marginSelectedMonths.includes(month);
                          return (
                            <label
                              key={month}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                border: isChecked ? '1px solid var(--purple-l)' : '1px solid var(--border)',
                                borderRadius: '6px',
                                background: isChecked ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                                  setMarginSelectedMonths(prev => 
                                    prev.includes(month) 
                                      ? prev.filter(m => m !== month) 
                                      : [...prev, month]
                                  );
                                }}
                              />
                              {formatMonthDropdownLabel(month, lang)}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Margins Summary Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Total Sales Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📈</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>{t('margin_total_sales')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue)', marginTop: '4px' }}>฿{marginStats.totalSalesTHB.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>{t('margin_sales_equivalent').replace('{amount}', Math.round(marginStats.totalSalesTHB * exchangeRate).toLocaleString())}</div>
                </div>
              </div>

              {/* COD Receivables Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🚚</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>{t('margin_cod_receivables')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red)', marginTop: '4px' }}>฿{marginStats.totalUnpaidCODTHB.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>{t('margin_cod_waiting')}</div>
                </div>
              </div>

              {/* Installment Receivables Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💳</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>{t('margin_installment_receivables')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>฿{marginStats.totalUnpaidInstallmentTHB.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>{t('margin_installment_desc')}</div>
                </div>
              </div>

              {/* Actual Collected Cash Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💵</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>{t('margin_collected_cash')}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)', marginTop: '4px' }}>฿{marginStats.actualCollectedTHB.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>{t('margin_collected_desc')}</div>
                </div>
              </div>

              {/* Current Balance Card */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', color: '#fff' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚖️</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{lang === 'ko' ? '현재 잔고 (Current Balance)' : 'Current Balance'}</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>฿{currentBalanceTHB.toLocaleString()}</div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>{lang === 'ko' ? '전체 실입금액 - 전체 지출액' : 'All-time Collected - All-time Expenses'}</div>
                </div>
              </div>

              {/* Total Margin Card */}
              {!hideMargin && (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💰</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>{t('margin_total_margin')}</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--purple-l)', marginTop: '4px' }}>₩{marginStats.totalMarginKRW.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>{t('margin_total_purchase_cost').replace('{amount}', marginStats.totalCostKRW.toLocaleString())}</div>
                  </div>
                </div>
              )}

              {/* Real Margin Card */}
              {!hideMargin && (
                <div style={{ 
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                  border: 'none', 
                  borderRadius: '16px', 
                  padding: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.15)'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💵</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('margin_real_margin')}</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginTop: '4px' }}>₩{marginStats.realMarginKRW.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: '#d1fae5', marginTop: '2px', fontWeight: 500 }}>
                      {t('margin_real_margin_desc_full').replace('{other}', marginStats.totalOtherExpensesTHB.toLocaleString())}
                    </div>
                  </div>
                </div>
              )}
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
                const cost = sales === 0 ? 0 : (Number(item.purchase_cost_krw) || 0);
                const marginKRW = sales === 0 ? 0 : (Math.round(sales * exchangeRate) - cost);
                
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
                    <span>👥</span> {t('margin_seller_summary_title')}
                  </h4>
                  <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="tbl" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: hideMargin ? '25%' : '15%' }}>{t('margin_th_month')}</th>
                          <th style={{ width: hideMargin ? '40%' : '25%' }}>{t('margin_th_seller')}</th>
                          <th style={{ width: hideMargin ? '15%' : '15%', textAlign: 'center' }}>{t('margin_th_qty')}</th>
                          <th style={{ width: hideMargin ? '20%' : '15%', textAlign: 'right' }}>{t('margin_th_total_sales')}</th>
                          {!hideMargin && <th style={{ width: '15%', textAlign: 'right' }}>{t('margin_th_total_cost')}</th>}
                          {!hideMargin && <th style={{ width: '15%', textAlign: 'right' }}>{t('margin_th_total_margin')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {sellerStatsList.length === 0 ? (
                          <tr>
                            <td colSpan={hideMargin ? 4 : 6} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>{t('margin_empty_summary')}</td>
                          </tr>
                        ) : (
                          sellerStatsList.map(row => (
                            <tr key={`${row.yearMonth}_${row.sellerName}`}>
                              <td style={{ fontWeight: 700, color: 'var(--purple-l)' }}>{row.yearMonth}</td>
                              <td style={{ fontWeight: 700 }}>{row.sellerName}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>{t('margin_qty_suffix').replace('{qty}', row.qty.toString())}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{row.totalSalesTHB.toLocaleString()}</td>
                              {!hideMargin && <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{row.totalCostKRW.toLocaleString()}</td>}
                              {!hideMargin && (
                                <td style={{ textAlign: 'right', fontWeight: 900, color: row.estimatedMarginKRW >= 0 ? 'var(--green)' : '#e11d48' }}>
                                  ₩{row.estimatedMarginKRW.toLocaleString()}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                      {sellerStatsList.length > 0 && (() => {
                        const totalQty = sellerStatsList.reduce((sum, r) => sum + r.qty, 0);
                        const totalSales = sellerStatsList.reduce((sum, r) => sum + r.totalSalesTHB, 0);
                        const totalCost = sellerStatsList.reduce((sum, r) => sum + r.totalCostKRW, 0);
                        const totalMargin = sellerStatsList.reduce((sum, r) => sum + r.estimatedMarginKRW, 0);
                        return (
                          <tfoot>
                            <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                              <td style={{ fontWeight: 800 }} colSpan={2}>{t('margin_total')}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>{t('margin_qty_suffix').replace('{qty}', totalQty.toString())}</td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--green)' }}>฿{totalSales.toLocaleString()}</td>
                              {!hideMargin && <td style={{ textAlign: 'right', color: '#64748b' }}>₩{totalCost.toLocaleString()}</td>}
                              {!hideMargin && (
                                <td style={{ textAlign: 'right', fontWeight: 900, color: totalMargin >= 0 ? 'var(--green)' : '#e11d48' }}>
                                  ₩{totalMargin.toLocaleString()}
                                </td>
                              )}
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Real Operating Margin Breakdown Report */}
            {!hideMargin && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📉</span> {t('margin_real_margin_report_title')}
                </h4>
                <div style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: '1.5', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid var(--purple-l)' }}>
                  💡 <strong>{t('margin_real_margin_calc_label')}</strong> {t('margin_real_margin_calc_desc')}
                </div>
                <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>{t('margin_th_month')}</th>
                        <th style={{ width: '20%', textAlign: 'right' }}>{t('margin_th_device_margin')}</th>
                        <th style={{ width: '25%', textAlign: 'right' }}>{t('margin_th_operational_expenses')}</th>
                        <th style={{ width: '20%', textAlign: 'right' }}>{t('margin_th_real_margin')}</th>
                        <th style={{ width: '20%', textAlign: 'right', color: '#94a3b8' }}>{t('margin_th_remittance_buyback')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRealMarginMonthlyList.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>{t('margin_empty_summary')}</td>
                        </tr>
                      ) : (
                        filteredRealMarginMonthlyList.map(row => (
                          <tr key={row.yearMonth}>
                            <td style={{ fontWeight: 700, color: 'var(--purple-l)' }}>{row.yearMonth}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₩{row.totalMarginKRW.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: '#e11d48', fontWeight: 600 }}>
                              -₩{row.otherExpensesKRW.toLocaleString()}
                              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 400 }}>฿{row.otherExpensesTHB.toLocaleString()}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 900, color: row.realMarginKRW >= 0 ? 'var(--green)' : '#e11d48', background: 'rgba(16, 185, 129, 0.03)' }}>
                              ₩{row.realMarginKRW.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', color: '#94a3b8', fontSize: '11.5px' }}>
                              ₩{row.remittanceBuybackKRW.toLocaleString()}
                              <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block' }}>฿{row.remittanceBuybackTHB.toLocaleString()}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredRealMarginMonthlyList.length > 0 && (() => {
                      const sumDeviceMargin = filteredRealMarginMonthlyList.reduce((sum, r) => sum + r.totalMarginKRW, 0);
                      const sumOpsExpensesKRW = filteredRealMarginMonthlyList.reduce((sum, r) => sum + r.otherExpensesKRW, 0);
                      const sumOpsExpensesTHB = filteredRealMarginMonthlyList.reduce((sum, r) => sum + r.otherExpensesTHB, 0);
                      const sumRealMargin = filteredRealMarginMonthlyList.reduce((sum, r) => sum + r.realMarginKRW, 0);
                      const sumRemitBuybackKRW = filteredRealMarginMonthlyList.reduce((sum, r) => sum + r.remittanceBuybackKRW, 0);
                      const sumRemitBuybackTHB = filteredRealMarginMonthlyList.reduce((sum, r) => sum + r.remittanceBuybackTHB, 0);
                      return (
                        <tfoot>
                          <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                            <td style={{ fontWeight: 800 }}>{t('margin_total')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800 }}>₩{sumDeviceMargin.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#e11d48' }}>
                              -₩{sumOpsExpensesKRW.toLocaleString()}
                              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: 400 }}>฿{sumOpsExpensesTHB.toLocaleString()}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 900, color: sumRealMargin >= 0 ? 'var(--green)' : '#e11d48', background: 'rgba(16, 185, 129, 0.05)' }}>
                              ₩{sumRealMargin.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>
                              ₩{sumRemitBuybackKRW.toLocaleString()}
                              <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', fontWeight: 400 }}>฿{sumRemitBuybackTHB.toLocaleString()}</span>
                            </td>
                          </tr>
                        </tfoot>
                      );
                    })()}
                  </table>
                </div>
              </div>
            )}

            {/* Part 2: Complete Margin Ledger */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📊</span> {t('margin_log_title')} ({marginStats.soldList.length}{t('staff_qty_unit') || '대'})
                </h4>
                <button
                  type="button"
                  className="btn-sm btn-purple"
                  onClick={() => setIsMarginLogExpanded(!isMarginLogExpanded)}
                  style={{ height: '28px', padding: '0 12px', fontSize: '11.5px', fontWeight: 800, margin: 0, cursor: 'pointer' }}
                >
                  {isMarginLogExpanded 
                    ? (lang === 'ko' ? '접기 ▲' : 'Collapse ▲') 
                    : (lang === 'ko' ? '펼치기 ▼' : 'Expand ▼')}
                </button>
              </div>

              {isMarginLogExpanded && (
                <div className="tbl-wrap animate-slide-up" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: hideMargin ? '25%' : '15%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                          {t('margin_th_sale_date')} {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: hideMargin ? '35%' : '25%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                          {t('margin_th_model')} {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        {!hideMargin && (
                          <th style={{ width: '15%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                            {t('margin_th_cost')} {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                        )}
                        <th style={{ width: hideMargin ? '20%' : '15%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                          {t('margin_th_price')} {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: hideMargin ? '20%' : '15%', cursor: 'pointer' }} onClick={() => toggleSort('seller_name')}>
                          {t('margin_th_seller_col')} {sortField === 'seller_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        {!hideMargin && <th style={{ width: '15%', textAlign: 'right' }}>{t('margin_th_margin')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {marginStats.soldList.length === 0 ? (
                        <tr>
                          <td colSpan={hideMargin ? 4 : 6} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>{t('staff_no_sales_records')}</td>
                        </tr>
                      ) : (
                        sortDevices(marginStats.soldList).map(item => {
                          const price = item.selling_price || 0;
                          const cost = price === 0 ? 0 : (item.purchase_cost_krw || 0);
                          const marginKRW = price === 0 ? 0 : (Math.round(price * exchangeRate) - cost);
                          return (
                            <tr key={item.id}>
                              <td>{item.sale_date || '-'}</td>
                              <td style={{ fontWeight: 700 }}>
                                {item.model_name}
                                <div style={{ fontSize: '10.5px', color: 'var(--t3)', fontWeight: 'normal', marginTop: '2px', fontFamily: 'monospace' }}>
                                  IMEI: {item.imei}
                                </div>
                              </td>
                              {!hideMargin && <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{formatPrice(cost)}</td>}
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{formatPrice(price)}</td>
                              <td>
                                {staffProfile?.role === 'admin' ? (
                                  editingCell?.id === item.id && editingCell?.field === 'seller_name' ? (
                                    <input
                                      type="text"
                                      value={editCellValue}
                                      onChange={(e) => setEditCellValue(e.target.value)}
                                      onBlur={() => handleInlineSave(item.id, 'seller_name', editCellValue)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineSave(item.id, 'seller_name', editCellValue);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      autoFocus
                                      className="form-input"
                                      style={{ margin: 0, padding: '2px 4px', fontSize: '12px', height: '26px', width: '100px', display: 'inline-block' }}
                                    />
                                  ) : (
                                    <span
                                      style={{ cursor: 'pointer', textDecoration: 'underline dotted var(--border)', fontWeight: 600 }}
                                      onClick={() => {
                                        setEditingCell({ id: item.id, field: 'seller_name' });
                                        setEditCellValue(item.seller_name || '');
                                      }}
                                      title={t('staff_click_to_edit')}
                                    >
                                      {item.seller_name || t('staff_unassigned')}
                                    </span>
                                  )
                                ) : (
                                  item.seller_name || '-'
                                )}
                              </td>
                              {!hideMargin && (
                                <td style={{ textAlign: 'right', fontWeight: 800, color: marginKRW >= 0 ? 'var(--green)' : '#e11d48' }}>
                                  ₩{marginKRW.toLocaleString()}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {marginStats.soldList.length > 0 && (() => {
                      const totalCost = marginStats.soldList.reduce((sum, item) => {
                        const price = Number(item.selling_price || 0);
                        const cost = price === 0 ? 0 : Number(item.purchase_cost_krw || 0);
                        return sum + cost;
                      }, 0);
                      const totalSales = marginStats.soldList.reduce((sum, item) => sum + Number(item.selling_price || 0), 0);
                      const totalMargin = marginStats.soldList.reduce((sum, item) => {
                        const price = Number(item.selling_price || 0);
                        const cost = price === 0 ? 0 : Number(item.purchase_cost_krw || 0);
                        const margin = price === 0 ? 0 : (Math.round(price * exchangeRate) - cost);
                        return sum + margin;
                      }, 0);
                      return (
                        <tfoot>
                          <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                            <td colSpan={2} style={{ fontWeight: 800 }}>{t('margin_total')} ({t('margin_qty_suffix').replace('{qty}', marginStats.soldList.length.toString())})</td>
                            {!hideMargin && <td style={{ textAlign: 'right', color: '#64748b' }}>₩{totalCost.toLocaleString()}</td>}
                            <td style={{ textAlign: 'right', color: 'var(--green)' }}>฿{totalSales.toLocaleString()}</td>
                            <td></td>
                            {!hideMargin && (
                              <td style={{ textAlign: 'right', fontWeight: 900, color: totalMargin >= 0 ? 'var(--green)' : '#e11d48' }}>
                                ₩{totalMargin.toLocaleString()}
                              </td>
                            )}
                          </tr>
                        </tfoot>
                      );
                    })()}
                  </table>
                </div>
              )}
            </div>

            {/* Database Missing SQL Warning Banner */}
            {isExpenseDbMissing && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '16px', color: '#991b1b', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>⚠️ {lang === 'ko' ? '지출 관리 데이터베이스 테이블 미설정 안내' : 'Expense Table Not Initialized'}</div>
                <div>
                  {lang === 'ko' 
                    ? 'Supabase에 지출 및 카테고리 테이블이 생성되지 않았습니다. 현재 임시 브라우저 로컬 저장소(localStorage) 모드로 동작 중입니다. 데이터 저장을 위해 아래 SQL 쿼리를 Supabase SQL Editor에서 실행해 주세요.'
                    : 'Expense tables are not yet setup in your Supabase database. Operating in browser local storage mode. Please execute the following SQL in Supabase Editor to setup permanent tables:'}
                </div>
                <textarea 
                  readOnly 
                  value={`-- 1. 지출 카테고리 테이블 생성
CREATE TABLE IF NOT EXISTS public.sheets_expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('large', 'medium', 'small')),
    parent_id UUID REFERENCES public.sheets_expense_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 지출 내역 테이블 생성
CREATE TABLE IF NOT EXISTS public.sheets_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.sheets_expense_categories(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    expense_date TEXT NOT NULL, -- YYYY-MM-DD
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화 및 정책 생성
ALTER TABLE public.sheets_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_categories_select_all" ON public.sheets_expense_categories FOR SELECT USING (true);
CREATE POLICY "expense_categories_all_auth" ON public.sheets_expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_select_all" ON public.sheets_expenses FOR SELECT USING (true);
CREATE POLICY "expenses_all_auth" ON public.sheets_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);`}
                  style={{ width: '100%', height: '100px', fontFamily: 'monospace', fontSize: '11px', padding: '8px', border: '1px solid #fca5a5', borderRadius: '6px', resize: 'none', background: '#fff' }}
                />
              </div>
            )}

            {/* Expense Management Title and Trigger */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                💸 {lang === 'ko' ? '지출 및 잔고 관리' : 'Expense & Balance Management'}
              </h3>
              <button
                type="button"
                className="btn-sm btn-purple"
                onClick={() => setIsCategoryModalOpen(true)}
                style={{ height: '34px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📁 {lang === 'ko' ? '지출 카테고리 설정' : 'Category Settings'}
              </button>
            </div>

            {/* Grid Layout for Add Form and Log/Reports */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
              
              {/* Left Column: Register Expense */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✏️ {lang === 'ko' ? '지출 등록 (Add Expense)' : 'Add Expense'}
                </h4>
                
                <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{lang === 'ko' ? '지출 일자' : 'Date'}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={addExpenseDate}
                      onChange={(e) => setAddExpenseDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{lang === 'ko' ? '대분류 (Large Category)' : 'Large Category'}</label>
                    <select
                      className="form-input"
                      value={addExpenseLarge}
                      onChange={(e) => {
                        setAddExpenseLarge(e.target.value);
                        setAddExpenseMedium('');
                        setAddExpenseSmall('');
                      }}
                      required
                    >
                      <option value="">{lang === 'ko' ? '-- 대분류 선택 --' : '-- Select Large --'}</option>
                      {expenseCategories.filter(c => c.level === 'large').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {addExpenseLarge && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">{lang === 'ko' ? '중분류 (Medium Category)' : 'Medium Category'}</label>
                      <select
                        className="form-input"
                        value={addExpenseMedium}
                        onChange={(e) => {
                          setAddExpenseMedium(e.target.value);
                          setAddExpenseSmall('');
                        }}
                      >
                        <option value="">{lang === 'ko' ? '-- 중분류 선택 (선택사항) --' : '-- Select Medium (Optional) --'}</option>
                        {expenseCategories.filter(c => c.level === 'medium' && c.parent_id === addExpenseLarge).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {addExpenseMedium && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">{lang === 'ko' ? '소분류 (Small Category)' : 'Small Category'}</label>
                      <select
                        className="form-input"
                        value={addExpenseSmall}
                        onChange={(e) => setAddExpenseSmall(e.target.value)}
                      >
                        <option value="">{lang === 'ko' ? '-- 소분류 선택 (선택사항) --' : '-- Select Small (Optional) --'}</option>
                        {expenseCategories.filter(c => c.level === 'small' && c.parent_id === addExpenseMedium).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{lang === 'ko' ? '금액 (THB)' : 'Amount (THB)'}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={addExpenseAmount}
                      onChange={(e) => setAddExpenseAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">{lang === 'ko' ? '상세 내역 / 메모' : 'Description / Notes'}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={lang === 'ko' ? '예: 6월 사무실 월세, 전기요금 등' : 'e.g., June office rent, electric bill'}
                      value={addExpenseDesc}
                      onChange={(e) => setAddExpenseDesc(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-submit" style={{ marginTop: '8px' }}>
                    💸 {lang === 'ko' ? '지출 내역 등록' : 'Record Expense'}
                  </button>
                </form>
              </div>

              {/* Right Column: Expense Table & Report */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Header & Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📊</span> {lang === 'ko' ? '지출 보고서 및 필터' : 'Expense Reports & Filter'}
                  </h4>
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 12px', textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>
                      {filterExpenseSmall !== 'all' 
                        ? (lang === 'ko' ? '소분류 지출총액' : 'Small Cat Total')
                        : filterExpenseMedium !== 'all'
                        ? (lang === 'ko' ? '중분류 지출총액' : 'Medium Cat Total')
                        : filterExpenseLarge !== 'all'
                        ? (lang === 'ko' ? '대분류 지출총액' : 'Large Cat Total')
                        : (lang === 'ko' ? '전체 지출총액' : 'Total Expenses')}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#b45309' }}>
                      ฿{totalExpensesTHB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {/* Month filter */}
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px', marginBottom: '4px' }}>{lang === 'ko' ? '지출 월 필터' : 'Expense Month'}</label>
                    <select
                      className="form-input"
                      style={{ height: '32px', padding: '4px 8px', fontSize: '11.5px', margin: 0 }}
                      value={expenseFilterMonth}
                      onChange={(e) => setExpenseFilterMonth(e.target.value)}
                    >
                      <option value="all">{lang === 'ko' ? '전체 월 (All)' : 'All Months'}</option>
                      {expenseAvailableMonths.map(month => (
                        <option key={month} value={month}>{formatMonthDropdownLabel(month, lang)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Large category filter */}
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px', marginBottom: '4px' }}>{lang === 'ko' ? '대분류 필터' : 'Large Category'}</label>
                    <select
                      className="form-input"
                      style={{ height: '32px', padding: '4px 8px', fontSize: '11.5px', margin: 0 }}
                      value={filterExpenseLarge}
                      onChange={(e) => {
                        setFilterExpenseLarge(e.target.value);
                        setFilterExpenseMedium('all');
                        setFilterExpenseSmall('all');
                      }}
                    >
                      <option value="all">{lang === 'ko' ? '전체 대분류' : 'All Large'}</option>
                      {expenseCategories.filter(c => c.level === 'large').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Medium category filter */}
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px', marginBottom: '4px' }}>{lang === 'ko' ? '중분류 필터' : 'Medium Category'}</label>
                    <select
                      className="form-input"
                      style={{ height: '32px', padding: '4px 8px', fontSize: '11.5px', margin: 0 }}
                      value={filterExpenseMedium}
                      onChange={(e) => {
                        setFilterExpenseMedium(e.target.value);
                        setFilterExpenseSmall('all');
                      }}
                      disabled={filterExpenseLarge === 'all'}
                    >
                      <option value="all">{lang === 'ko' ? '전체 중분류' : 'All Medium'}</option>
                      {expenseCategories.filter(c => c.level === 'medium' && c.parent_id === filterExpenseLarge).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Small category filter */}
                  <div>
                    <label className="form-label" style={{ fontSize: '10.5px', marginBottom: '4px' }}>{lang === 'ko' ? '소분류 필터' : 'Small Category'}</label>
                    <select
                      className="form-input"
                      style={{ height: '32px', padding: '4px 8px', fontSize: '11.5px', margin: 0 }}
                      value={filterExpenseSmall}
                      onChange={(e) => setFilterExpenseSmall(e.target.value)}
                      disabled={filterExpenseMedium === 'all'}
                    >
                      <option value="all">{lang === 'ko' ? '전체 소분류' : 'All Small'}</option>
                      {expenseCategories.filter(c => c.level === 'small' && c.parent_id === filterExpenseMedium).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expense List Table */}
                <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '20%' }}>{lang === 'ko' ? '날짜' : 'Date'}</th>
                        <th style={{ width: '35%' }}>{lang === 'ko' ? '지출 구분' : 'Category Path'}</th>
                        <th style={{ width: '20%', textAlign: 'right' }}>{lang === 'ko' ? '금액' : 'Amount'}</th>
                        <th style={{ width: '20%' }}>{lang === 'ko' ? '설명' : 'Desc'}</th>
                        <th style={{ width: '5%', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingExpenses ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>
                            {t('loading_data')}
                          </td>
                        </tr>
                      ) : filteredExpensesList.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>
                            {lang === 'ko' ? '선택된 월/카테고리에 지출 내역이 없습니다.' : 'No expense records found for selected filters.'}
                          </td>
                        </tr>
                      ) : (
                        filteredExpensesList.map(exp => (
                          <tr key={exp.id}>
                            <td style={{ fontSize: '12.5px' }}>{exp.expense_date}</td>
                            <td style={{ fontWeight: 600, fontSize: '11.5px', color: 'var(--purple-l)' }}>
                              {getCategoryPath(exp.category_id)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--red)', fontSize: '12.5px' }}>
                              ฿{exp.amount ? Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td style={{ fontSize: '11.5px', color: 'var(--t2)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={exp.description}>
                              {exp.description || '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredExpensesList.length > 0 && (
                      <tfoot>
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                          <td colSpan={2}>{lang === 'ko' ? '합계' : 'Total'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--red)' }}>
                            ฿{totalExpensesTHB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

            </div>

            {/* CATEGORY CONFIGURATION MODAL */}
            {isCategoryModalOpen && (
              <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }} onClick={() => setIsCategoryModalOpen(false)}>
                <div className="modal animate-slide-up" style={{ maxWidth: '600px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-hd">
                    <span className="modal-title">
                      📁 {lang === 'ko' ? '지출 카테고리 관리' : 'Manage Expense Categories'}
                    </span>
                    <button className="modal-x" onClick={() => setIsCategoryModalOpen(false)}>✕</button>
                  </div>

                  <div className="modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Form to add a new category */}
                    <form onSubmit={handleAddCategory} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h5 style={{ fontSize: '13px', fontWeight: 800, margin: 0 }}>
                        ➕ {lang === 'ko' ? '새 카테고리 추가' : 'Add New Category'}
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>{lang === 'ko' ? '분류 수준' : 'Classification Level'}</label>
                          <select
                            className="form-input"
                            style={{ height: '36px', padding: '6px 12px', fontSize: '12px' }}
                            value={newCatLevel}
                            onChange={(e: any) => {
                              setNewCatLevel(e.target.value);
                              setNewCatParentId('');
                            }}
                          >
                            <option value="large">{lang === 'ko' ? '대분류 (Large)' : 'Large Category'}</option>
                            <option value="medium">{lang === 'ko' ? '중분류 (Medium)' : 'Medium Category'}</option>
                            <option value="small">{lang === 'ko' ? '소분류 (Small)' : 'Small Category'}</option>
                          </select>
                        </div>
                        {newCatLevel !== 'large' && (
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '11px' }}>
                              {newCatLevel === 'medium' 
                                ? (lang === 'ko' ? '상위 대분류 선택' : 'Select Large Parent') 
                                : (lang === 'ko' ? '상위 중분류 선택' : 'Select Medium Parent')}
                            </label>
                            <select
                              className="form-input"
                              style={{ height: '36px', padding: '6px 12px', fontSize: '12px' }}
                              value={newCatParentId}
                              onChange={(e) => setNewCatParentId(e.target.value)}
                              required
                            >
                              <option value="">{lang === 'ko' ? '-- 선택 --' : '-- Select --'}</option>
                              {expenseCategories
                                .filter(c => c.level === (newCatLevel === 'medium' ? 'large' : 'medium'))
                                .map(c => {
                                  let prefix = '';
                                  if (newCatLevel === 'small') {
                                    const parentLarge = expenseCategories.find(p => p.id === c.parent_id);
                                    prefix = parentLarge ? `${parentLarge.name} > ` : '';
                                  }
                                  return (
                                    <option key={c.id} value={c.id}>{prefix}{c.name}</option>
                                  );
                                })}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>{lang === 'ko' ? '카테고리명' : 'Category Name'}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: '36px', padding: '6px 12px', fontSize: '13px', margin: 0 }}
                            placeholder={lang === 'ko' ? '예: 전기세, 월세, 기기 대금' : 'e.g., Electricity, Rent, Salary'}
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            required
                          />
                          <button type="submit" className="btn-sm btn-purple" style={{ height: '36px', padding: '0 16px', whiteSpace: 'nowrap', fontWeight: 800 }}>
                            {lang === 'ko' ? '추가' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Category Tree View */}
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>
                        🌳 {lang === 'ko' ? '카테고리 구성 (Category Tree)' : 'Current Category Structure'}
                      </h5>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto' }}>
                        {expenseCategories.filter(c => c.level === 'large').length === 0 ? (
                          <div style={{ color: 'var(--t3)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                            {lang === 'ko' ? '등록된 카테고리가 없습니다.' : 'No categories registered.'}
                          </div>
                        ) : (
                          expenseCategories.filter(c => c.level === 'large').map(largeCat => {
                            const mediumCats = expenseCategories.filter(c => c.level === 'medium' && c.parent_id === largeCat.id);
                            return (
                              <div key={largeCat.id} style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '13px', color: 'var(--purple-l)' }}>
                                  <span>📁 {largeCat.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(largeCat.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div style={{ paddingLeft: '16px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {mediumCats.map(medCat => {
                                    const smallCats = expenseCategories.filter(c => c.level === 'small' && c.parent_id === medCat.id);
                                    return (
                                      <div key={medCat.id}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', fontWeight: 700, color: 'var(--t1)' }}>
                                          <span>📂 {medCat.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteCategory(medCat.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '11px', cursor: 'pointer' }}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                        <div style={{ paddingLeft: '16px', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {smallCats.map(smallCat => (
                                            <span
                                              key={smallCat.id}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: '#f1f5f9',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                                fontSize: '11.5px',
                                                color: 'var(--t2)'
                                              }}
                                            >
                                              📄 {smallCat.name}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteCategory(smallCat.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="modal-ft" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', borderBottomLeftRadius: 'var(--r)', borderBottomRightRadius: 'var(--r)' }}>
                    <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setIsCategoryModalOpen(false)}>
                      {lang === 'ko' ? '닫기' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== VIEW: COD 수금 관리 ==================== */}
        {activeTab === 'cod' && (staffProfile?.role === 'admin' || staffProfile?.role === 'manager') && (() => {
          const codDevices = devices.filter(d => !d.deleted_at && d.is_sold && d.sale_type === 'cod');
          
          let filteredCOD = codDevices;
          if (codStatusFilter !== 'all') {
            filteredCOD = filteredCOD.filter(d => d.payment_status === codStatusFilter);
          }
          if (!codSearchQuery.trim() && codSelectedMonth !== 'all') {
            filteredCOD = filteredCOD.filter(d => getYearMonth(d.sale_date) === codSelectedMonth);
          }
          if (codSearchQuery.trim()) {
            const query = codSearchQuery.toLowerCase().trim();
            filteredCOD = filteredCOD.filter(d => {
              const custNameMatch = d.customer_name?.toLowerCase().includes(query);
              const custPhoneMatch = d.customer_phone?.includes(query);
              const stickerMatch = d.sticker?.toLowerCase().includes(query);
              const imeiMatch = d.imei?.includes(query);
              const modelMatch = normalizeModelName(d.model_name).includes(normalizeModelName(query));
              return custNameMatch || custPhoneMatch || stickerMatch || imeiMatch || modelMatch;
            });
          }

          const totalUnpaidCOD = filteredCOD.filter(d => d.payment_status === 'unpaid').reduce((sum, d) => sum + ((d.selling_price || 0) - (d.deposit_amount || 0)), 0);
          const totalPaidCOD = filteredCOD.filter(d => d.payment_status === 'paid').reduce((sum, d) => sum + ((d.selling_price || 0) - (d.deposit_amount || 0)), 0);
          
          return (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* COD Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⏳</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>미수금 총액 (Total Unpaid COD)</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red)', marginTop: '4px' }}>฿{totalUnpaidCOD.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>배송 후 정산 완료 대기 중인 금액</div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>✅</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase' }}>정산 완료 총액 (Total Paid COD)</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)', marginTop: '4px' }}>฿{totalPaidCOD.toLocaleString()}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>수금 완료된 총 COD 금액</div>
                  </div>
                </div>
              </div>

              {/* Filter controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={t('staff_search_cod_placeholder')}
                    value={codSearchQuery}
                    onChange={(e) => setCodSearchQuery(e.target.value)}
                    onKeyDown={(e) => handleSearchKeyPress(e, 'cod')}
                    className="form-input"
                    style={{ maxWidth: '240px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, marginLeft: '8px' }}>{t('staff_billing_month')}</span>
                  <select
                    value={codSelectedMonth}
                    onChange={(e) => setCodSelectedMonth(e.target.value)}
                    className="form-input"
                    style={{ width: '150px', margin: 0, padding: '6px 12px', fontSize: '13px', height: '34px' }}
                  >
                    <option value="all">{t('staff_all_months')}</option>
                    {customerMonths.map(month => (
                      <option key={month} value={month}>{formatMonthDropdownLabel(month, lang)}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '13px', fontWeight: 700, marginLeft: '16px' }}>{t('staff_cod_status_header') || '상태'}:</span>
                  <select
                    value={codStatusFilter}
                    onChange={(e) => setCodStatusFilter(e.target.value as any)}
                    className="form-input"
                    style={{ width: '130px', margin: 0, padding: '6px 12px', fontSize: '13px', height: '34px' }}
                  >
                    <option value="all">{lang === 'ko' ? '전체 (All)' : lang === 'th' ? 'ทั้งหมด (All)' : 'All'}</option>
                    <option value="unpaid">{lang === 'ko' ? '미수 (Unpaid)' : lang === 'th' ? 'ค้างชำระ (Unpaid)' : 'Unpaid'}</option>
                    <option value="paid">{lang === 'ko' ? '완납 (Paid)' : lang === 'th' ? 'จ่ายหมดแล้ว (Paid)' : 'Paid'}</option>
                  </select>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple-l)' }}>
                  {t('staff_total_cod_count', { total: codDevices.length, searched: filteredCOD.length })}
                </div>
              </div>

              {/* COD Table */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📦</span> {t('staff_cod_ledger_title')}
                </h4>
                <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                          {t('staff_cod_sale_date_header')} {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                          {t('staff_th_device_info')} {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '12%', cursor: 'pointer' }} onClick={() => toggleSort('imei')}>
                          IMEI {sortField === 'imei' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('customer_name')}>
                          {t('staff_cod_customer_info_header')} {sortField === 'customer_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '12%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                          {t('staff_cod_sale_amount_header')} {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '12%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('deposit_amount')}>
                          {t('staff_th_deposit')} {sortField === 'deposit_amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '12%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('cod_amount')}>
                          {t('staff_th_cod_unpaid')} {sortField === 'cod_amount' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '8%', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleSort('payment_status')}>
                          {t('staff_cod_status_header')} {sortField === 'payment_status' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th style={{ width: '12%', textAlign: 'center' }}>{t('staff_cod_actions_header')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCOD.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>{t('staff_no_cod_records')}</td>
                        </tr>
                      ) : (
                        sortDevices(filteredCOD).map(item => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 700 }}>{item.sale_date || '-'}</td>
                            <td style={{ fontWeight: 700 }}>{item.model_name}</td>
                            <td className="font-mono" style={{ fontSize: '11px' }}>{item.imei}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>👤 {item.customer_name || t('unfilled')}</div>
                              <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>📞 {item.customer_phone || t('unfilled')}</div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>฿{formatPrice(item.selling_price || 0)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--t2)', fontSize: '12px' }}>฿{formatPrice(item.deposit_amount || 0)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: item.payment_status === 'unpaid' ? 'var(--red)' : 'var(--green)' }}>
                              ฿{formatPrice((item.selling_price || 0) - (item.deposit_amount || 0))}
                            </td>
                            <td style={{ textAlign: 'center' }}>{getPaymentStatusBadge(item.payment_status)}</td>
                            <td style={{ textAlign: 'center' }}>
                              {item.payment_status === 'unpaid' ? (
                                <button
                                  type="button"
                                  className="btn-sm btn-green"
                                  onClick={() => handleConfirmPayment(item.id)}
                                  style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800, margin: 0, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-block', borderRadius: '6px' }}
                                >
                                  {t('staff_btn_confirm_payment')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-sm btn-red"
                                  onClick={() => handleCancelPayment(item.id, 'cod')}
                                  style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800, margin: 0, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-block', borderRadius: '6px' }}
                                >
                                  {t('staff_btn_cancel_payment')}
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

            </div>
          );
        })()}

        {/* ==================== VIEW: 고객 관리 ==================== */}
        {activeTab === 'customers' && (() => {
          const customerDevices = devices.filter(d => !d.deleted_at && d.is_sold);

          let filteredCustomers = customerDevices;
          if (!custSearch.trim() && selectedCustomerMonth) {
            filteredCustomers = filteredCustomers.filter(d => getYearMonth(d.sale_date) === selectedCustomerMonth);
          }

          const searchedCustomers = filteredCustomers.filter(d => {
            const matchName = d.customer_name?.toLowerCase().includes(custSearch.toLowerCase()) || false;
            const matchPhone = d.customer_phone?.toLowerCase().includes(custSearch.toLowerCase()) || false;
            const matchModel = d.model_name?.toLowerCase().includes(custSearch.toLowerCase()) || false;
            const matchImei = d.imei?.includes(custSearch) || false;
            return matchName || matchPhone || matchModel || matchImei;
          });

          const handleCopyFilteredCustomers = () => {
            if (searchedCustomers.length === 0) {
              showToast('복사할 고객 정보가 없습니다.', 'error');
              return;
            }
            const textLines = searchedCustomers.map((item, idx) => {
              const name = item.customer_name || '미기입';
              const phone = item.customer_phone || '미기입';
              const model = item.model_name;
              const imei = item.imei;
              const date = item.sale_date || '미기입';
              const type = item.sale_type === 'installment' ? '할부' : item.sale_type === 'cod' ? 'COD' : '현금';
              const seller = item.seller_name || '미지정';
              const note = item.notes || '-';
              return `${idx + 1}. [${date}] ${name} (${phone}) - 모델: ${model} (IMEI: ${imei}) - 방식: ${type} - 담당: ${seller} - 메모: ${note}`;
            });
            navigator.clipboard.writeText(textLines.join('\n'))
              .then(() => showToast('고객 정보가 클립보드에 복사되었습니다.', 'success'))
              .catch(() => showToast('복사 실패', 'error'));
          };

          return (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👤</span> 고객 정보 관리 대장 (Customer Directory)
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="고객명, 연락처, 기종, IMEI 검색..."
                      value={custSearch}
                      onChange={(e) => setCustSearch(e.target.value)}
                      className="form-input"
                      style={{ width: '220px', margin: 0, padding: '6px 12px', fontSize: '13px', height: '34px' }}
                    />
                    <select
                      value={selectedCustomerMonth}
                      onChange={(e) => setSelectedCustomerMonth(e.target.value)}
                      className="form-input"
                      style={{ width: '150px', margin: 0, padding: '6px 12px', fontSize: '13px', height: '34px' }}
                    >
                      <option value="">전체 월 (All Months)</option>
                      {customerMonths.map(month => (
                        <option key={month} value={month}>{formatMonthDropdownLabel(month, lang)}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleCopyFilteredCustomers}
                      className="btn-purple"
                      style={{ margin: 0, padding: '8px 12px', fontSize: '12px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none', color: '#fff', height: '34px' }}
                    >
                      📋 고객 텍스트 복사
                    </button>
                  </div>
                </div>

                <div className="tbl-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>구입일</th>
                        <th style={{ width: '15%' }}>고객명</th>
                        <th style={{ width: '15%' }}>전화번호</th>
                        <th style={{ width: '15%' }}>기타메모 (Line ID 등)</th>
                        <th style={{ width: '15%' }}>구매모델</th>
                        <th style={{ width: '12%' }}>구매모델 IMEI</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>구매방식</th>
                        <th style={{ width: '8%' }}>판매사</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>고객 내역이 없습니다. (No customer records.)</td>
                        </tr>
                      ) : (
                        sortDevices(searchedCustomers).map(item => {
                          const paymentTypeLabel = item.sale_type === 'installment' ? '할부' : item.sale_type === 'cod' ? 'COD' : (item.sale_type === 'cash' || item.sale_type === 'transfer') ? '현금' : item.sale_type || '-';
                          return (
                            <tr key={item.id}>
                              <td>{item.sale_date || '-'}</td>
                              <td style={{ fontWeight: 700 }}>
                                {currentPermissions.can_edit_customer_info ? (
                                  editingCell?.id === item.id && editingCell?.field === 'customer_name' ? (
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
                                      title="클릭하여 수정"
                                    >
                                      👤 {item.customer_name || '미기입'}
                                    </div>
                                  )
                                ) : (
                                  item.customer_name || '-'
                                )}
                              </td>
                              <td>
                                {currentPermissions.can_edit_customer_info ? (
                                  editingCell?.id === item.id && editingCell?.field === 'customer_phone' ? (
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
                                      title="클릭하여 수정"
                                    >
                                      📞 {item.customer_phone || '미기입'}
                                    </div>
                                  )
                                ) : (
                                  item.customer_phone || '-'
                                )}
                              </td>
                              <td>
                                {currentPermissions.can_edit_customer_info ? (
                                  editingCell?.id === item.id && editingCell?.field === 'notes' ? (
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
                                      style={{ margin: 0, padding: '4px 6px', fontSize: '11px', height: '26px', width: '100%', boxSizing: 'border-box' }}
                                    />
                                  ) : (
                                    <div
                                      style={{ cursor: 'pointer', color: item.notes ? 'var(--t2)' : 'var(--t3)', textDecoration: 'underline dotted var(--border)' }}
                                      onClick={() => {
                                        setEditingCell({ id: item.id, field: 'notes' });
                                        setEditCellValue(item.notes || '');
                                      }}
                                      title="클릭하여 수정"
                                    >
                                      📝 {item.notes || '미기입'}
                                    </div>
                                  )
                                ) : (
                                  item.notes || '-'
                                )}
                              </td>
                              <td style={{ fontWeight: 700 }}>{item.model_name}</td>
                              <td className="font-mono" style={{ fontSize: '11px' }}>{item.imei}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>{paymentTypeLabel}</td>
                              <td>
                                {currentPermissions.can_edit_customer_info ? (
                                  editingCell?.id === item.id && editingCell?.field === 'seller_name' ? (
                                    <input
                                      type="text"
                                      value={editCellValue}
                                      onChange={(e) => setEditCellValue(e.target.value)}
                                      onBlur={() => handleInlineSave(item.id, 'seller_name', editCellValue)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleInlineSave(item.id, 'seller_name', editCellValue);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      autoFocus
                                      className="form-input"
                                      style={{ margin: 0, padding: '4px 6px', fontSize: '11px', height: '26px', width: '100%', boxSizing: 'border-box' }}
                                    />
                                  ) : (
                                    <span
                                      style={{ cursor: 'pointer', textDecoration: 'underline dotted var(--border)' }}
                                      onClick={() => {
                                        setEditingCell({ id: item.id, field: 'seller_name' });
                                        setEditCellValue(item.seller_name || '');
                                      }}
                                      title="클릭하여 수정"
                                    >
                                      {item.seller_name || '미지정'}
                                    </span>
                                  )
                                ) : (
                                  item.seller_name || '-'
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

            </div>
          );
        })()}

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
                  onKeyDown={(e) => handleSearchKeyPress(e, 'trash')}
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
                    {currentPermissions.can_permanent_delete && (
                      <button 
                        style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={handleBulkPermanentDelete}
                      >
                        🔥 {t('staff_btn_permanent_delete')} ({selectedIds.length})
                      </button>
                    )}
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
                            {currentPermissions.can_permanent_delete && (
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
                            )}
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

        {/* ==================== VIEW 6-B: PARTNER TRANSFER REQUESTS ==================== */}
        {activeTab === 'partner_transfer' && staffProfile?.role === 'admin' && (() => {
          const transferRequests = devices.filter(d => !d.deleted_at && d.notes && d.notes.includes('[이관신청:'));

          return (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="main-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>👥 협력사 이관 요청 관리</h1>
                  <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>
                    협력점(가맹점)에서 본사 재고에 대해 신청한 이관 요청 목록입니다. 승인 시 기기 보관 위치가 자동으로 변경됩니다.
                  </p>
                </div>
                <span className="badge bg-purple" style={{ padding: '6px 12px', fontSize: '12px' }}>대기 중인 요청: {transferRequests.length}건</span>
              </div>

              <div className="main-body" style={{ textAlign: 'left' }}>
                {transferRequests.length === 0 ? (
                  <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--t2)', border: '1px dashed var(--border)', borderRadius: '16px', background: 'var(--card)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px', textAlign: 'center' }}>📥</div>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>대기 중인 이관 요청이 없습니다.</div>
                    <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', marginTop: '6px' }}>협력사에서 본사 공유 기기를 신청하면 이곳에 실시간으로 표시됩니다.</div>
                  </div>
                ) : (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{t('staff_col_model') || '모델명'}</th>
                            <th>Sticker / IMEI</th>
                            <th>{t('staff_col_location') || '현재 보관 위치'}</th>
                            <th>신청 협력사 (Store Name)</th>
                            <th style={{ textAlign: 'center' }}>{t('staff_col_actions') || '조작'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transferRequests.map((item) => {
                            const match = item.notes?.match(/\[이관신청:\s*(.*?),\s*(.*?)\]/);
                            const requestingStore = match ? match[1] : '알 수 없음';
                            return (
                              <tr key={item.id}>
                                <td>
                                  <div style={{ fontWeight: 800 }}>{item.model_name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>Color: {item.color || '미기입'}</div>
                                </td>
                                <td style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>
                                  <div>Sticker: {item.sticker || '없음'}</div>
                                  <div style={{ color: 'var(--t3)', fontSize: '11px' }}>IMEI: {item.imei || '없음'}</div>
                                </td>
                                <td>
                                  <span className="badge bg-grey">{item.stock_location}</span>
                                </td>
                                <td>
                                  <span className="badge bg-purple" style={{ fontWeight: 800 }}>🏪 {requestingStore}</span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button
                                      className="btn-sm btn-green"
                                      style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 12px', fontWeight: 800, borderRadius: '6px', cursor: 'pointer' }}
                                      onClick={() => handleApproveTransfer(item)}
                                    >
                                      ✅ 승인 (Approve)
                                    </button>
                                    <button
                                      className="btn-sm btn-red"
                                      style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 12px', fontWeight: 800, borderRadius: '6px', cursor: 'pointer' }}
                                      onClick={() => handleRejectTransfer(item)}
                                    >
                                      ❌ 거절 (Reject)
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {/* ==================== VIEW 7: DAILY HISTORY LOG ==================== */}
        {activeTab === 'history_log' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Sub-tab navigation */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '4px' }}>
              <button
                type="button"
                onClick={() => setHistorySubTab('summary')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: historySubTab === 'summary' ? 'var(--purple-l)' : '#fff',
                  color: historySubTab === 'summary' ? '#fff' : 'var(--t2)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                📊 일일 통계 (Daily Summary)
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab('audit')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: historySubTab === 'audit' ? 'var(--purple-l)' : '#fff',
                  color: historySubTab === 'audit' ? '#fff' : 'var(--t2)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                📝 작업 감사 로그 (Audit Logs)
              </button>
            </div>

            {historySubTab === 'summary' ? (
              <>
                {/* Search & Filters (Summary) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="날짜 검색 (예: 6.1 또는 26.6.1)"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="form-input"
                      style={{ maxWidth: '220px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                    />

                    <select
                      value={historyMonthFilter}
                      onChange={(e) => setHistoryMonthFilter(e.target.value)}
                      className="form-input"
                      style={{ maxWidth: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="all">전체 월 (All Months)</option>
                      {historyMonths.map(m => {
                        const parts = m.split('.');
                        const yr = 2000 + parseInt(parts[0], 10);
                        const mo = parseInt(parts[1], 10);
                        return (
                          <option key={m} value={m}>{`${yr}년 ${mo}월`}</option>
                        );
                      })}
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--purple-l)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                      총 {filteredDailyStats.length}일의 기록
                    </div>
                  </div>
                </div>

                {/* Daily History Table */}
                <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
                  <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>날짜 (Date)</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>당일 입고 대수</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>당일 판매 대수</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>당일 마감 재고</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>상세</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDailyStats.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                            일치하는 날짜 로그 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredDailyStats.map(stat => (
                          <tr key={stat.date}>
                            <td style={{ fontWeight: 700, color: 'var(--t1)' }}>{stat.date}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: stat.ingestedCount > 0 ? 'var(--blue)' : 'var(--t2)' }}>
                              {stat.ingestedCount > 0 ? `+${stat.ingestedCount}대` : '0대'}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: stat.soldCount > 0 ? 'var(--green)' : 'var(--t2)' }}>
                              {stat.soldCount > 0 ? `-${stat.soldCount}대` : '0대'}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--purple-l)' }}>
                              {stat.stockCount}대
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-sm btn-blue"
                                onClick={() => {
                                  setSelectedHistoryLogDate(stat.date);
                                  setHistoryLogDetailTab('ingested');
                                }}
                                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                상세 보기
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {/* Search & Filters (Audit Logs) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="작업자, 모델, IMEI, 키워드 검색"
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ maxWidth: '240px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                    />

                    <select
                      value={auditFilterType}
                      onChange={(e) => setAuditFilterType(e.target.value)}
                      className="form-input"
                      style={{ maxWidth: '180px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="all">모든 작업 유형 (All Actions)</option>
                      <option value="CREATE_DEVICE">기기 등록 (CREATE_DEVICE)</option>
                      <option value="BULK_INTAKE">대량 기기 입고 (BULK_INTAKE)</option>
                      <option value="CREATE_SALE">판매 등록 (CREATE_SALE)</option>
                      <option value="APPROVE_SALE">판매 승인 (APPROVE_SALE)</option>
                      <option value="CANCEL_SALE">판매 취소 (CANCEL_SALE)</option>
                      <option value="BULK_SALE">대량 판매 (BULK_SALE)</option>
                      <option value="BULK_SHARE">공유 상태 설정 (BULK_SHARE)</option>
                      <option value="APPROVE_TRANSFER">이관 승인 (APPROVE_TRANSFER)</option>
                      <option value="REJECT_TRANSFER">이관 거절 (REJECT_TRANSFER)</option>
                      <option value="APPROVE_REQUEST">신청 승인 (APPROVE_REQUEST)</option>
                      <option value="REJECT_REQUEST">신청 거절 (REJECT_REQUEST)</option>
                      <option value="EDIT_DEVICE">기기 수정 (EDIT_DEVICE)</option>
                      <option value="DELETE_DEVICE">삭제 (DELETE_DEVICE)</option>
                      <option value="RESTORE_DEVICE">삭제 복구 (RESTORE_DEVICE)</option>
                      <option value="PERMANENT_DELETE">영구 삭제 (PERMANENT_DELETE)</option>
                      <option value="CREATE_SELLER">가맹점 등록 신청 (CREATE_SELLER)</option>
                      <option value="APPROVE_SELLER">가맹점 가입 승인 (APPROVE_SELLER)</option>
                      <option value="REJECT_SELLER">가맹점 가입 거절 (REJECT_SELLER)</option>
                      <option value="VIEW_INSTALLMENT_CALC">할부 이자 조회 (VIEW_INSTALLMENT_CALC)</option>
                    </select>

                    <select
                      value={auditRoleFilter}
                      onChange={(e) => setAuditRoleFilter(e.target.value)}
                      className="form-input"
                      style={{ maxWidth: '150px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="all">모든 역할 (All Roles)</option>
                      <option value="admin">Admin (어드민)</option>
                      <option value="manager">Manager (매니저)</option>
                      <option value="staff">Staff (스태프)</option>
                      <option value="seller">Seller (협력사)</option>
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--purple-l)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                      총 {filteredAuditLogs.length}개의 로그
                    </div>
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <table className="tbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>작업 시간 (Date)</th>
                        <th style={{ width: '120px' }}>작업자 (Name)</th>
                        <th style={{ width: '100px' }}>역할 (Role)</th>
                        <th style={{ width: '180px' }}>작업 유형 (Action)</th>
                        <th style={{ width: '150px' }}>모델명 (Model)</th>
                        <th style={{ width: '150px' }}>IMEI</th>
                        <th>상세 정보 (Details)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                            감사 로그 기록이 존재하지 않거나 필터 조건에 맞는 로그가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map(log => {
                          let badgeBg = 'rgba(100,116,139,0.1)';
                          let badgeColor = 'var(--t2)';
                          const act = log.action_type || '';
                          if (act.includes('CREATE') || act.includes('IMPORT') || act.includes('INTAKE')) {
                            badgeBg = 'rgba(59,130,246,0.1)';
                            badgeColor = 'var(--blue)';
                          } else if (act.includes('APPROVE') || act.includes('RESTORE')) {
                            badgeBg = 'rgba(16,185,129,0.1)';
                            badgeColor = 'var(--green)';
                          } else if (act.includes('DELETE') || act.includes('REJECT') || act.includes('CANCEL')) {
                            badgeBg = 'rgba(239,68,68,0.1)';
                            badgeColor = 'var(--red)';
                          } else if (act.includes('EDIT')) {
                            badgeBg = 'rgba(245,158,11,0.1)';
                            badgeColor = 'var(--gold)';
                          } else if (act.includes('CALC')) {
                            badgeBg = 'rgba(139,92,246,0.1)';
                            badgeColor = 'var(--purple-l)';
                          }

                          return (
                            <tr key={log.id}>
                              <td style={{ fontSize: '12px', color: 'var(--t2)' }}>
                                {log.created_at ? new Date(log.created_at).toLocaleString('ko-KR', { hour12: false }) : '-'}
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--t1)' }}>{log.operator_name || 'System'}</td>
                              <td>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: log.operator_role === 'admin' ? 'var(--purple-l)' : log.operator_role === 'manager' ? '#d97706' : 'var(--t2)' }}>
                                  {log.operator_role}
                                </span>
                              </td>
                              <td>
                                <span style={{ background: badgeBg, color: badgeColor, padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, display: 'inline-block' }}>
                                  {act}
                                </span>
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--t1)', fontSize: '12px' }}>{log.model_name || '-'}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.imei || '-'}</td>
                              <td style={{ fontSize: '12.5px', color: 'var(--t1)', wordBreak: 'break-all' }}>{log.details || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

      </main>

      {/* INSTALLMENT PRINT RANGE SELECTION MODAL */}
      {isInstallmentPrintModalOpen && (
        <div 
          className="modal-bg open" 
          style={{ display: 'flex', zIndex: 3000 }} 
          onClick={() => setIsInstallmentPrintModalOpen(false)}
        >
          <div 
            className="modal animate-slide-up" 
            style={{ maxWidth: '400px', width: '90%', background: '#fff', borderRadius: '16px', overflow: 'hidden' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-hd" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="modal-title" style={{ fontSize: '16px', fontWeight: 800 }}>
                🖨️ {lang === 'ko' ? '인쇄 날짜 범위 선택' : 'เลือกช่วงวันที่สำหรับพิมพ์'}
              </span>
              <button 
                type="button" 
                className="modal-x" 
                onClick={() => setIsInstallmentPrintModalOpen(false)} 
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--t2)', lineHeight: 1.4 }}>
                {lang === 'ko' 
                  ? `선택한 달(${instSelectedMonth})의 지정된 날짜 범위 내에 청구일이 포함된 할부 내역만 필터링하여 인쇄합니다.` 
                  : `กรองพิมพ์เฉพาะรายการผ่อนชำระที่มีวันครบกำหนดชำระอยู่ในช่วงวันที่ที่กำหนดของเดือน ${instSelectedMonth}`}
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '6px' }}>
                    {lang === 'ko' ? '시작일 (1~31)' : 'วันเริ่มต้น (1~31)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={instPrintStartDay}
                    onChange={(e) => setInstPrintStartDay(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '6px' }}>
                    {lang === 'ko' ? '종료일 (1~31)' : 'วันสิ้นสุด (1~31)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={instPrintEndDay}
                    onChange={(e) => setInstPrintEndDay(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-ft" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-d)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsInstallmentPrintModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {lang === 'ko' ? '취소' : 'ยกเลิก'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInstallmentPrintModalOpen(false);
                  handlePrintInstallmentList(instPrintStartDay, instPrintEndDay);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--purple)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(139,92,246,0.2)' }}
              >
                {lang === 'ko' ? '인쇄하기' : 'พิมพ์'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {t('staff_tab_csv') || '📁 CSV / Excel 파일 업로드'}
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

              {/* Target Location Selector for Bulk Import */}
              <div className="form-group" style={{ marginBottom: '20px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--t1)', marginBottom: '6px', display: 'block' }}>
                  {lang === 'ko' ? '📍 기본 입고 위치 선택 (Default Location)' : '📍 เลือกตำแหน่งเริ่มต้น'}
                </label>
                <select
                  value={bulkImportLocation}
                  onChange={(e) => setBulkImportLocation(e.target.value)}
                  className="form-input"
                  style={{ margin: 0, padding: '8px 12px', fontSize: '13px', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', width: '100%' }}
                >
                  <option value="DHL">{lang === 'ko' ? '입고 대기 (DHL)' : 'รอเข้าคลัง (DHL)'}</option>
                  <option value="Shop">Shop (매장)</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {lang === 'ko' 
                    ? '※ 업로드/붙여넣기한 데이터에 위치 정보가 없는 행들은 설정하신 이 위치로 자동 지정됩니다.' 
                    : '※ รายการที่ไม่มีข้อมูลตำแหน่งจะถูกตั้งค่าเป็นตำแหน่งนี้'}
                </span>
              </div>

              {/* METHOD 2: CSV / Excel File Upload */}
              {intakeMethod === 'file' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--t2)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>{t('staff_csv_info_title') || '📁 파일 업로드 안내'}</h4>
                    <p>{t('staff_csv_info_1') || '엑셀(.xlsx, .xls) 또는 CSV(.csv) 파일을 업로드해 주세요. 맞춤형 파일 양식(P/G No, 실판매가 포함)도 자동 인식됩니다.'}</p>
                  </div>

                  <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', background: '#f8fafc', position: 'relative' }}>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      style={{ display: 'block', margin: '0 auto 12px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{t('staff_csv_info_2') || '엑셀(.xlsx, .xls) 및 CSV(.csv) 파일을 지원합니다.'}</span>
                  </div>

                  {csvFileText && (
                    <div className="animate-fade-in" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--t1)', marginBottom: '4px', display: 'block' }}>
                        {t('staff_csv_preview_parsed') || '📋 파싱된 기기 정보 미리보기'}
                      </label>
                      {csvPreviewRecords.length > 0 ? (
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', background: '#fff' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#475569' }}>Sticker (P/G)</th>
                                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#475569' }}>Model (모델명)</th>
                                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#475569' }}>IMEI</th>
                                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#475569' }}>Color (색상)</th>
                                <th style={{ padding: '8px 12px', fontWeight: 800, color: '#475569', textAlign: 'right' }}>Cost (매입가)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreviewRecords.slice(0, 5).map((rec: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: idx === csvPreviewRecords.length - 1 && csvPreviewRecords.length <= 5 ? 'none' : '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px 12px', color: '#64748b', fontFamily: 'monospace' }}>{rec.sticker || '-'}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--purple-l)' }}>{rec.model_name || '-'}</td>
                                  <td style={{ padding: '8px 12px', color: '#64748b', fontFamily: 'monospace' }}>{rec.imei || '-'}</td>
                                  <td style={{ padding: '8px 12px', color: '#475569' }}>{rec.color || '-'}</td>
                                  <td style={{ padding: '8px 12px', color: 'var(--green)', fontWeight: 700, textAlign: 'right' }}>
                                    {rec.purchase_cost_krw ? rec.purchase_cost_krw.toLocaleString() : '0'} ₩
                                  </td>
                                </tr>
                              ))}
                              {csvPreviewRecords.length > 5 && (
                                <tr>
                                  <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', background: '#f8fafc', fontWeight: 600 }}>
                                    ... 외 {csvPreviewRecords.length - 5}개의 기기가 파일에 더 들어있습니다. ...
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: '16px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#991b1b', fontSize: '12px', textAlign: 'center', fontWeight: 700 }}>
                          ⚠️ 파일 내용에서 입고 가능한 유효 기기 정보(IMEI 또는 Sticker)를 찾지 못했습니다. 머리글 행 이름과 기기 정보 데이터 칸들을 확인해 주세요.
                        </div>
                      )}
                    </div>
                  )}

                  <button 
                    type="button"
                    className="btn-submit" 
                    onClick={handleCSVImport} 
                    disabled={importingCSV || !csvFileText}
                    style={{ margin: '8px 0 0' }}
                  >
                    {importingCSV ? (t('staff_btn_csv_upload_loading') || '🔄 기기 업로드 처리 중...') : (t('staff_btn_csv_upload') || '🚀 업로드된 데이터 일괄 등록')}
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
                <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '4px' }}>💡 {t('staff_audit_how_to')}</h4>
                <p style={{ margin: 0 }}>
                  {t('staff_audit_how_to_desc')}<br/>
                  {t('staff_audit_desc')}
                </p>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--t2)', margin: 0 }}>
                    {t('staff_audit_imei_label')}
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)' }}>{t('staff_audit_location_label')}</span>
                    <select
                      value={auditLocationFilter}
                      onChange={(e) => setAuditLocationFilter(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, padding: '4px 8px', fontSize: '12.5px', minWidth: '150px', height: '32px' }}
                    >
                      <option value="all">{t('staff_audit_all_locations')}</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.name}>{t('staff_audit_location_only').replace('{name}', loc.name)}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
                      {t('staff_audit_tab_not_in_db')} ({auditResults.notInInventory.length})
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
                      {t('staff_audit_tab_missing')} ({auditResults.missingFromPasted.length})
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
                      {t('staff_audit_tab_matched')} ({auditResults.matchedDevices.length})
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                    
                    {/* TAB 1: NOT IN DB */}
                    {auditActiveTab === 'not_in_db' && (
                      <div>
                        {auditResults.notInInventory.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)', fontSize: '13px' }}>
                            {t('staff_audit_all_found')}
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
                                  alert(t('staff_audit_copied_unregistered'));
                                }}
                              >
                                {t('staff_audit_copy_imei')}
                              </button>
                            </div>
                            <table className="tbl" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '40%' }}>IMEI</th>
                                  <th style={{ width: '25%', textAlign: 'center' }}>{t('staff_th_status')}</th>
                                  <th style={{ width: '35%' }}>{t('staff_th_db_info')}</th>
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
                            {t('staff_audit_all_present')}
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
                                  alert(t('staff_audit_copied_missing'));
                                }}
                              >
                                {t('staff_audit_copy_imei')}
                              </button>
                            </div>
                            <table className="tbl" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '25%' }}>{t('staff_th_sticker')}</th>
                                  <th style={{ width: '35%' }}>{t('staff_th_model')}</th>
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
                            {t('staff_audit_no_match')}
                          </div>
                        ) : (
                          <table className="tbl" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '25%' }}>{t('staff_th_sticker')}</th>
                                <th style={{ width: '35%' }}>{t('staff_th_model')}</th>
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

      {/* DAILY HISTORY LOG DETAILS MODAL */}
      {selectedHistoryLogDate && (() => {
        const stat = dailyStats.find(s => s.date === selectedHistoryLogDate);
        if (!stat) return null;

        return (
          <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }} onClick={() => setSelectedHistoryLogDate(null)}>
            <div className="modal animate-slide-up" style={{ maxWidth: '850px', width: '95%', background: '#fff', borderRadius: '16px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-hd" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="modal-title" style={{ fontSize: '16px', fontWeight: 800 }}>📋 {selectedHistoryLogDate} 일자별 상세 내역</span>
                <button className="modal-x" onClick={() => setSelectedHistoryLogDate(null)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
              </div>

              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Modal Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryLogDetailTab('ingested')}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      borderBottom: historyLogDetailTab === 'ingested' ? '2px solid var(--purple-l)' : '2px solid transparent',
                      background: 'none',
                      color: historyLogDetailTab === 'ingested' ? 'var(--purple-l)' : 'var(--t2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    📥 당일 입고 기기 ({stat.ingestedList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryLogDetailTab('sold')}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      borderBottom: historyLogDetailTab === 'sold' ? '2px solid var(--purple-l)' : '2px solid transparent',
                      background: 'none',
                      color: historyLogDetailTab === 'sold' ? 'var(--purple-l)' : 'var(--t2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    💸 당일 판매 기기 ({stat.soldList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryLogDetailTab('stock')}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      borderBottom: historyLogDetailTab === 'stock' ? '2px solid var(--purple-l)' : '2px solid transparent',
                      background: 'none',
                      color: historyLogDetailTab === 'stock' ? 'var(--purple-l)' : 'var(--t2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    📦 당일 마감 재고 기기 ({stat.stockList.length})
                  </button>
                </div>

                {/* Tab Content Tables */}
                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                  
                  {/* INGESTED LIST */}
                  {historyLogDetailTab === 'ingested' && (
                    <div>
                      {stat.ingestedList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)', fontSize: '13px' }}>
                          당일 입고 등록된 기기가 없습니다.
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
                            {stat.ingestedList.map((item) => (
                              <tr key={item.id}>
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

                  {/* SOLD LIST */}
                  {historyLogDetailTab === 'sold' && (
                    <div>
                      {stat.soldList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)', fontSize: '13px' }}>
                          {t('staff_no_sales_today')}
                        </div>
                      ) : (
                        <table className="tbl" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '25%' }}>{t('staff_th_sticker')}</th>
                              <th style={{ width: '30%' }}>{t('staff_th_model')}</th>
                              <th style={{ width: '20%', textAlign: 'right' }}>{t('staff_th_sale_price')}</th>
                              <th style={{ width: '25%' }}>{t('staff_th_seller')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stat.soldList.map((item) => (
                              <tr key={item.id}>
                                <td style={{ color: 'var(--t2)', fontSize: '11.5px' }}>{item.sticker || '-'}</td>
                                <td style={{ fontWeight: 700, fontSize: '11.5px' }}>{item.model_name}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontSize: '12px' }}>฿{formatPrice(item.selling_price)}</td>
                                <td style={{ fontSize: '11.5px' }}>{item.seller_name || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* STOCK LIST */}
                  {historyLogDetailTab === 'stock' && (
                    <div>
                      {stat.stockList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)', fontSize: '13px' }}>
                          당일 마감 재고가 없습니다.
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
                            {stat.stockList.map((item) => (
                              <tr key={item.id}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
                <button 
                  type="button"
                  className="btn-sm btn-red" 
                  onClick={() => setSelectedHistoryLogDate(null)} 
                  style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}
                >
                  닫기 (Close)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* BULK PARTNER SHARE MODAL */}
      {isBulkPartnerShareModalOpen && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3100 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '680px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <span className="modal-title">👥 협력사 일괄 공유 설정 (Bulk Partner Share)</span>
              <button className="modal-x" onClick={() => setIsBulkPartnerShareModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '12.5px', color: 'var(--t2)', marginBottom: '16px' }}>
                선택한 {bulkShareDevices.length}대의 기기에 대해 협력사 공유(공개) 여부 및 도매가를 일괄 편집합니다. 엑셀처럼 가격을 입력하실 수 있습니다.
              </p>

              <div className="table-responsive">
                <table className="table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '100px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={bulkShareDevices.length > 0 && bulkShareDevices.every(d => d.isShared)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const updated = bulkShareDevices.map(d => ({ ...d, isShared: checked }));
                              setBulkShareDevices(updated);
                            }}
                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                          />
                          <span>공유 상태</span>
                        </div>
                      </th>
                      <th>모델 / Sticker / IMEI</th>
                      <th style={{ width: '120px' }}>소매가 (원가 참조)</th>
                      <th style={{ width: '150px' }}>도매가 (Wholesale)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkShareDevices.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={item.isShared}
                            onChange={(e) => {
                              const updated = [...bulkShareDevices];
                              updated[idx].isShared = e.target.checked;
                              setBulkShareDevices(updated);
                            }}
                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 800 }}>{item.model_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                            Sticker: {item.sticker || '없음'} | IMEI: {item.imei || '없음'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>฿{item.selling_price.toLocaleString()}</div>
                          <div style={{ fontSize: '11px', color: '#b45309' }}>
                            원가: ₩{(devices.find(d => d.id === item.id)?.purchase_cost_krw || 0).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--t2)' }}>฿</span>
                            <input
                              type="number"
                              className="form-input"
                              style={{ margin: 0, padding: '4px 8px', fontSize: '12px', height: '28px' }}
                              value={item.wholesale_price}
                              onChange={(e) => {
                                const updated = [...bulkShareDevices];
                                updated[idx].wholesale_price = e.target.value;
                                setBulkShareDevices(updated);
                              }}
                              disabled={!item.isShared}
                              placeholder="도매가 입력"
                            />
                          </div>
                          {(() => {
                            if (!item.isShared) return null;
                            const wsPriceNum = Number(item.wholesale_price) || 0;
                            if (wsPriceNum <= 0) return null;
                            const cost = devices.find(d => d.id === item.id)?.purchase_cost_krw || 0;
                            const marginVal = Math.round(wsPriceNum * exchangeRate) - cost;
                            return (
                              <div style={{ 
                                fontSize: '11px', 
                                color: marginVal >= 0 ? '#16a34a' : '#dc2626', 
                                marginTop: '4px',
                                paddingLeft: '14px',
                                fontWeight: 700 
                              }}>
                                마진: ₩{marginVal.toLocaleString()}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-ft" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', background: '#f8fafc' }}>
              <button
                className="btn-sm btn-grey"
                onClick={() => setIsBulkPartnerShareModalOpen(false)}
                style={{ height: '36px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                취소 (Cancel)
              </button>
              <button
                className="btn-sm btn-purple"
                onClick={handleSaveBulkPartnerShare}
                disabled={isSavingBulkShare}
                style={{ height: '36px', padding: '0 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
              >
                {isSavingBulkShare ? '저장 중...' : '설정 저장 (Save Settings)'}
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
                  disabled={!!editingDevice && !currentPermissions.can_edit_core_device_fields}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">{t('staff_label_model')}</label>
                <select
                  value={isCustomModel ? '___new___' : modelName}
                  onChange={(e) => handleModelSelectChange(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                  disabled={!!editingDevice && !currentPermissions.can_edit_core_device_fields}
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
                      disabled={!!editingDevice && !currentPermissions.can_edit_core_device_fields}
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
                <select
                  value={standardColors.includes(color.toUpperCase()) ? color.toUpperCase() : (color ? '___custom___' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '___custom___') {
                      const customVal = prompt('직접 입력할 색상을 영어로 입력하세요 (예: STARLIGHT):');
                      if (customVal !== null) {
                        setColor(customVal.trim().toUpperCase());
                      }
                    } else {
                      setColor(val);
                    }
                  }}
                  className="form-input"
                  style={{ margin: 0 }}
                  disabled={!!editingDevice && !currentPermissions.can_edit_core_device_fields}
                >
                  <option value="">선택 안함</option>
                  {color && !standardColors.includes(color.toUpperCase()) && (
                    <option value="___custom___">{color} (현재값/직접입력)</option>
                  )}
                  {standardColors.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                  <option value="___custom___" style={{ color: 'var(--purple)', fontWeight: 700 }}>✍️ 직접 입력...</option>
                </select>
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

              {!editingDevice && (
                <div className="form-group" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="isLocalPurchaseExpense"
                    checked={isLocalPurchaseExpense}
                    onChange={(e) => setIsLocalPurchaseExpense(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                  />
                  <label htmlFor="isLocalPurchaseExpense" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', userSelect: 'none', color: 'var(--purple-l)' }}>
                    현지 기기 매입 (지출장부에 자동 기재)
                  </label>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">
                  {isLocalPurchaseExpense ? '매입원가 (THB ฿) *' : t('staff_label_purchase_cost')}
                </label>
                <input
                  type="number"
                  placeholder={isLocalPurchaseExpense ? '10000' : '550000'}
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
                  disabled={!!editingDevice && !currentPermissions.can_edit_core_device_fields}
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
      {/* ───────────── BULK SALE MODAL ───────────── */}
      {isBulkSaleModalOpen && (() => {
        const subtotal = bulkSaleItems.reduce((s, i) => s + i.price, 0);
        const vatAmt = bulkTaxIncluded ? Math.round(subtotal * 0.07) : 0;
        const grandTotal = subtotal + vatAmt;
        const todayForReceipt = (() => {
          const d = new Date(bulkSaleDate || new Date().toISOString().slice(0,10));
          return { dd: String(d.getDate()).padStart(2,'0'), mm: String(d.getMonth()+1).padStart(2,'0'), yyyy: d.getFullYear() };
        })();

        return (
          <div className="modal-bg open" style={{ zIndex: 3100 }}>
            <div className="modal" style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px' }}>
              {/* Header */}
              <div className="modal-hd" style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '17px', fontWeight: 900 }}>📦 ขายส่ง / 대량 판매 ({bulkSaleItems.length}대)</span>
                <button type="button" className="modal-close" onClick={() => setIsBulkSaleModalOpen(false)}>✕</button>
              </div>

              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Top 2-col info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>👤 พนักงานขาย (판매자) *</label>
                    <select value={bulkSellerName} onChange={e => setBulkSellerName(e.target.value)} className="form-input" style={{ margin: 0 }}>
                      <option value="">-- เลือกพนักงาน --</option>
                      {staffMembers.map(m => (<option key={m.id} value={m.name}>{m.name}</option>))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>🏪 ชื่อผู้ซื้อ / 구매처</label>
                    <input type="text" value={bulkBuyerName} onChange={e => setBulkBuyerName(e.target.value)} className="form-input" placeholder="ชื่อลูกค้าหรือชื่อร้าน..." style={{ margin: 0 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📞 เบอร์โทร / 연락처</label>
                    <input type="text" value={bulkBuyerPhone} onChange={e => setBulkBuyerPhone(e.target.value)} className="form-input" placeholder="0XX-XXX-XXXX" style={{ margin: 0 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
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
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>📅 วันที่ขาย (판매일)</label>
                    <input type="date" value={bulkSaleDate} onChange={e => setBulkSaleDate(e.target.value)} className="form-input" style={{ margin: 0 }} />
                  </div>
                  <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginTop: '22px' }}>
                      <input type="checkbox" checked={bulkTaxIncluded} onChange={e => setBulkTaxIncluded(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
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
                        {bulkSaleItems.map((item, idx) => (
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
                                    setBulkSaleItems(prev => prev.map((p, i) => i === idx ? { ...p, price: v } : p));
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
                  {bulkTaxIncluded && (
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
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setIsBulkSaleModalOpen(false)} style={{ padding: '11px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                    ยกเลิก
                  </button>
                  <button type="button" onClick={handleProcessBulkSale} disabled={processingBulkSale || !bulkSellerName}
                    style={{ padding: '11px 20px', borderRadius: '8px', border: 'none', background: '#f0fdf4', color: '#16a34a', fontWeight: 800, cursor: processingBulkSale ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: !bulkSellerName ? 0.5 : 1 }}>
                    {processingBulkSale ? '처리중...' : '✅ 출력없이 판매완료'}
                  </button>
                  <button type="button" onClick={handlePrintAndSellBulk} disabled={processingBulkSale || !bulkSellerName}
                    style={{ padding: '11px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', fontWeight: 800, cursor: processingBulkSale ? 'not-allowed' : 'pointer', fontSize: '13px', boxShadow: '0 2px 10px rgba(124,58,237,0.4)', opacity: !bulkSellerName ? 0.5 : 1 }}>
                    🖨️ 영수증 출력 후 판매완료
                  </button>
                </div>
              </div>
            </div>

            {/* ── Hidden Receipt printable content ── */}
            <div id="bulk-receipt-printable" style={{ display: 'none' }}>
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
                <div className="buyer-row">ชื่อผู้ซื้อ&nbsp;&nbsp;{bulkBuyerName || '........................................................................'}</div>
                {(bulkBuyerPhone || bulkBuyerAddress) && (
                  <div className="buyer-row" style={{ fontSize: '12px', marginBottom: '6px' }}>
                    {bulkBuyerPhone && <span>โทร: {bulkBuyerPhone}&nbsp;&nbsp;&nbsp;</span>}
                    {(bulkBuyerAddress || bulkBuyerAddressCustom) && <span>ที่อยู่: {bulkBuyerAddress === '__custom__' ? bulkBuyerAddressCustom : bulkBuyerAddress}</span>}
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
                    {bulkSaleItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '10px', fontFamily: 'monospace' }}>{item.imei}</td>
                        <td className="left">{item.model_name}</td>
                        <td>1</td>
                        <td className="right">฿{item.price.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 10 - bulkSaleItems.length) }).map((_, i) => (
                      <tr key={`ep-${i}`} className="empty-rows"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
                    ))}
                    {bulkTaxIncluded && (
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
                      <tr key={`ep-${i}`} className="empty-rows"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
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

      {/* ───────────── RETURN / RESTORE MODAL ───────────── */}
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
}
