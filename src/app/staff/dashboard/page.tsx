'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';

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
}

export default function StaffDashboard() {
  const router = useRouter();
  const { t, lang } = useTranslation();

  // Authentication & Profile States
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Active Tab: 'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin'
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin'>('overview');

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
  const [locationFilter, setLocationFilter] = useState('all');

  // Intake Modals (Manual & CSV Upload)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [csvFileText, setCsvFileText] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const [intakeMethod, setIntakeMethod] = useState<'sync' | 'file' | 'paste'>('sync');
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

  // Edit Modal States
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);

  // Inline Edit States
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'sticker' | 'site_date' | 'model_name' } | null>(null);
  const [editCellValue, setEditCellValue] = useState<string>('');

  // Toast Alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

        // Allow Admin, Staff, or Direct Store Sellers
        const hasAccess = 
          p.role === 'admin' || 
          p.role === 'staff' || 
          (p.role === 'seller' && p.store_type === 'direct');

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
    const newName = prompt(`위치명 수정: [${oldName}] ➔ 새 이름을 입력하세요:`, oldName);
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

      showToast(`✅ 보관 위치가 [${oldName}] ➔ [${newName.trim()}]으로 변경되었으며 기존 재고 장부도 업데이트되었습니다.`, 'success');
      await Promise.all([loadSettingsData(), loadLedgerData()]);
    } catch (err: any) {
      showToast('❌ 위치 수정 실패: ' + err.message, 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleDeleteLocation = async (name: string) => {
    if (!confirm(`보관 위치 [${name}] 기준 정보를 삭제하시겠습니까? (기존 재고 물건들은 삭제되지 않고 위치 정보만 유지됩니다)`)) return;
    
    setLoadingSettings(true);
    try {
      const { error } = await supabase
        .from('settings_locations')
        .delete()
        .eq('name', name);
      if (error) throw error;
      showToast(`🗑️ 위치 [${name}]가 삭제되었습니다.`, 'success');
      await loadSettingsData();
    } catch (err: any) {
      showToast('❌ 위치 삭제 실패: ' + err.message, 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleRenameModel = async (oldName: string) => {
    const newName = prompt(`모델명 수정: [${oldName}] ➔ 새 이름을 입력하세요:`, oldName);
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

      showToast(`✅ 모델명이 [${oldName}] ➔ [${newName.trim()}]으로 변경되었으며 기존 재고 장부도 업데이트되었습니다.`, 'success');
      await Promise.all([loadSettingsData(), loadLedgerData()]);
    } catch (err: any) {
      showToast('❌ 모델명 수정 실패: ' + err.message, 'error');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleDeleteModel = async (name: string) => {
    if (!confirm(`모델명 [${name}] 기준 정보를 삭제하시겠습니까?`)) return;
    
    setLoadingSettings(true);
    try {
      const { error } = await supabase
        .from('settings_models')
        .delete()
        .eq('name', name);
      if (error) throw error;
      showToast(`🗑️ 모델명 [${name}]이 삭제되었습니다.`, 'success');
      await loadSettingsData();
    } catch (err: any) {
      showToast('❌ 모델명 삭제 실패: ' + err.message, 'error');
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
      showToast('✅ 새 위치가 추가되었습니다.', 'success');
      setNewLocInput('');
      await loadSettingsData();
    } catch (err: any) {
      showToast('❌ 위치 추가 실패: ' + err.message, 'error');
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
      showToast('✅ 새 모델명이 추가되었습니다.', 'success');
      setNewModInput('');
      await loadSettingsData();
    } catch (err: any) {
      showToast('❌ 모델 추가 실패: ' + err.message, 'error');
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
    const activeStock = devices.filter(d => !d.deleted_at && !d.is_sold);
    const soldList = devices.filter(d => !d.deleted_at && d.is_sold);

    const totalStockCount = activeStock.length;
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

    activeStock.forEach(d => {
      const name = d.model_name.toLowerCase();
      individualModelCounts[d.model_name] = (individualModelCounts[d.model_name] || 0) + 1;

      if (name.includes('iphone') || name.includes('aip') || name.includes('ip') || name.includes('아이폰')) {
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
  }, [devices]);

  // Extract unique models present in current tab's scope (active vs sold)
  const uniqueModels = useMemo(() => {
    const activeStock = devices.filter(d => !d.deleted_at && !d.is_sold);
    const soldList = devices.filter(d => !d.deleted_at && d.is_sold);

    const activeModelMap: Record<string, number> = {};
    activeStock.forEach(d => {
      if (d.model_name) {
        activeModelMap[d.model_name] = (activeModelMap[d.model_name] || 0) + 1;
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
      sold: Object.entries(soldModelMap).sort(sortFn)
    };
  }, [devices]);

  // Helper to check category
  const matchesCategory = useCallback((modelName: string, filter: string) => {
    if (filter === 'all') return true;
    return modelName === filter;
  }, []);

  // Filtered lists
  const filteredActiveDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (d.deleted_at || d.is_sold) return false;
      const matchSearch = d.model_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
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
  }, [devices, searchQuery, locationFilter, categoryFilter, matchesCategory, sortDevices]);

  const filteredSoldDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (d.deleted_at || !d.is_sold) return false;
      const matchSearch = d.model_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = matchesCategory(d.model_name, categoryFilter);
      return matchSearch && matchCat;
    });
    return sortDevices(list);
  }, [devices, searchQuery, categoryFilter, matchesCategory, sortDevices]);

  const filteredTrashDevices = useMemo(() => {
    const list = devices.filter(d => {
      if (!d.deleted_at) return false;
      const matchSearch = d.model_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
    return sortDevices(list);
  }, [devices, searchQuery, sortDevices]);

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

        recordsToInsert.push({
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
          created_at: nowString
        });
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

      // Map incoming keys to DB columns
      const records = items.map((x: any) => ({
        sticker: x.serialNo || null,
        model_name: x.model,
        imei: x.imei,
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
        sale_date: x.saleDate || null
      }));

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

      showToast(`🌐 구글 시트로부터 ${records.length}개 기기 실시간 동기화 완료!`, 'success');
      setIsCSVModalOpen(false);
      loadLedgerData();
    } catch (err: any) {
      console.error(err);
      showToast('❌ 동기화 실패: ' + err.message, 'error');
    } finally {
      setImportingCSV(false);
    }
  };

  // Clipboard Paste Ingestion Handler
  const handlePasteImport = async () => {
    if (!pasteText.trim()) {
      showToast('❌ 붙여넣은 텍스트가 없습니다.', 'error');
      return;
    }
    setImportingCSV(true);
    try {
      const rows = pasteText.trim().split(/\r?\n/).map(row => row.split('\t'));
      if (rows.length === 0) {
        showToast('❌ 유효한 텍스트 데이터가 없습니다.', 'error');
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

        records.push({
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
          created_at: nowString
        });
      }

      if (records.length === 0) {
        showToast('❌ 파싱된 유효한 기기 데이터가 없습니다.', 'error');
        setImportingCSV(false);
        return;
      }

      const { error } = await supabase
        .from('sheets_inventory')
        .upsert(records, { onConflict: 'imei' });

      if (error) throw error;

      showToast(`📋 붙여넣기를 통해 ${records.length}개 기기 입고 완료!`, 'success');
      setIsCSVModalOpen(false);
      setPasteText('');
      loadLedgerData();
    } catch (err: any) {
      console.error(err);
      showToast('❌ 붙여넣기 입고 실패: ' + err.message, 'error');
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
  const handleInlineSave = async (id: string, field: 'sticker' | 'site_date' | 'model_name', value: string) => {
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({ [field]: value.trim() })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setDevices(prev => prev.map(d => d.id === id ? { ...d, [field]: value.trim() } : d));
      showToast('✅ 인라인 수정이 반영되었습니다.', 'success');
    } catch (err: any) {
      showToast('❌ 수정 실패: ' + err.message, 'error');
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

  // 7. Selling Single Device Process Handler
  const handleOpenSellModal = (device: DeviceItem) => {
    setSellingDevice(device);
    setSaleDate(new Date().toLocaleDateString('ko-KR').slice(2));
    setSellerName('');
    setSaleNotes('');
  };

  const handleProcessSale = async () => {
    if (!sellingDevice) return;
    if (!sellerName.trim()) {
      showToast('❌ Seller Name is required.', 'error');
      return;
    }

    setProcessingSale(true);
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_sold: true,
          is_reserved: false,
          reserved_by: null,
          reserved_date: null,
          sale_date: saleDate,
          seller_name: sellerName.trim(),
          notes: saleNotes.trim() || null
        })
        .eq('id', sellingDevice.id);

      if (error) throw error;

      showToast('💸 Sale recorded successfully!', 'success');
      setSellingDevice(null);
      loadLedgerData();
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    } finally {
      setProcessingSale(false);
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
      showToast('❌ 예약자명을 입력해 주세요.', 'error');
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

      showToast('📌 기기 예약이 설정되었습니다.', 'success');
      setReservingDevice(null);
      loadLedgerData();
    } catch (err: any) {
      showToast('❌ 예약 처리 실패: ' + err.message, 'error');
    } finally {
      setProcessingReservation(false);
    }
  };

  const handleCancelReservation = async (deviceId: string) => {
    if (!confirm('이 기기의 예약을 취소하시겠습니까?')) return;
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

      showToast('🔓 예약을 취소하고 일반 재고로 변경했습니다.', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('❌ 예약 취소 실패: ' + err.message, 'error');
    }
  };

  // Re-verify back to inventory stock
  const handleRestoreToStock = async (deviceId: string) => {
    if (!confirm('Mark this device back as active stock?')) return;
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

      showToast('🔄 Device returned to active stock list.', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    }
  };

  // Bulk Re-verify back to inventory stock
  const handleBulkRestoreToStock = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개 기기를 재고로 복원하시겠습니까?`)) return;
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

      showToast(`🔄 선택한 ${selectedIds.length}개 기기를 재고로 복원하였습니다.`, 'success');
      setSelectedIds([]);
      loadLedgerData();
    } catch (err: any) {
      showToast('❌ 일괄 복원 실패: ' + err.message, 'error');
    }
  };

  // Delete Device Handler (Soft Delete to Trash Bin)
  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('선택한 기기를 삭제하여 휴지통으로 이동하시겠습니까?')) return;
    try {
      const nowStr = new Date().toISOString();
      const { error } = await supabase
        .from('sheets_inventory')
        .update({ deleted_at: nowStr })
        .eq('id', deviceId);

      if (error) throw error;

      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, deleted_at: nowStr } : d));
      showToast('🗑️ 기기가 삭제되어 휴지통으로 이동했습니다.', 'success');
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    }
  };

  // Bulk Soft Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개의 기기를 삭제하여 휴지통으로 이동하시겠습니까?`)) return;
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
      showToast(`🗑️ 선택한 ${deletedCount}개 기기가 휴지통으로 이동했습니다.`, 'success');
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
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
      showToast(`🔄 선택한 기기가 재고로 정상 복원되었습니다.`, 'success');
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    }
  };

  // Bulk Permanent Delete from Trash
  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개의 기기를 영구 삭제하시겠습니까?\n이 작업은 복구가 불가능합니다.`)) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setDevices(prev => prev.filter(d => !selectedIds.includes(d.id)));
      setSelectedIds([]);
      showToast(`🔥 선택한 기기가 영구 삭제되었습니다.`, 'success');
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    }
  };

  // Tab Change Handler
  const handleTabChange = (tab: 'overview' | 'ledger' | 'sales' | 'settings' | 'trash' | 'margin') => {
    setActiveTab(tab);
    setSelectedIds([]);
    setCategoryFilter('all');
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
            className={`sb-link ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => handleTabChange('sales')}
          >
            <span className="ico">💸</span> {t('staff_menu_sales') || '판매 완료 처리'}
          </button>

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
              {activeTab === 'settings' && `⚙️ ${t('staff_menu_settings') || '기준 정보 관리'}`}
              {activeTab === 'margin' && `📈 마진 및 정산관리`}
              {activeTab === 'trash' && `🗑️ 휴지통`}
            </h1>
            <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>
              Company Ledger & Stock Intake Management System.
            </p>
          </div>
          <div style={{ color: 'var(--t2)', fontSize: '13px' }}>
            {new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>총 매입 가치 (KRW)</div>
              </div>

              <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="sc-icon" style={{ background: 'rgba(59,130,246,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏷️</div>
                <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--blue)', margin: '8px 0 2px' }}>
                  ฿{formatPrice(stats.totalSellingValueTHB)}
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>현재 재고 판매가 (THB)</div>
              </div>

              <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="sc-icon" style={{ background: 'rgba(16,185,129,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--green)', margin: '8px 0 2px' }}>
                    {stats.totalStockCount} 대
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', flexWrap: 'wrap', gap: '6px', fontWeight: 700, alignItems: 'center' }}>
                    <span>🍎 {stats.iphoneCount}</span>
                    <span>🪐 {stats.galaxyCount}</span>
                    <span>기타 {stats.otherCount}</span>
                    {stats.reservedCount > 0 && (
                      <span style={{ color: '#d97706', background: '#fef3c7', padding: '1px 5px', borderRadius: '999px', fontSize: '9px', fontWeight: 800 }}>📌 예약 {stats.reservedCount}대</span>
                    )}
                  </div>
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>현재고 수량 (아이폰 / 갤럭시 / 기타)</div>
              </div>

              <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="sc-icon" style={{ background: 'rgba(236,72,153,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📈</div>
                <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--pink)', margin: '8px 0 2px' }}>
                  ฿{formatPrice(stats.totalSoldRevenueTHB)}
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>총 판매 완료액 ({stats.totalSoldCount}대)</div>
              </div>

            </div>

            {/* Layout Panels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '20px' }}>
              
              {/* Location distribution */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px' }}>📍 보관 장소별 재고 현황</h3>
                {Object.keys(stats.locationCounts).length === 0 ? (
                  <div style={{ color: 'var(--t2)', fontSize: '12px', textAlign: 'center', padding: '24px' }}>No active inventory found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(stats.locationCounts).map(([loc, count]) => {
                      const pct = stats.totalStockCount > 0 ? (count / stats.totalStockCount) * 100 : 0;
                      return (
                         <div key={loc} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                             <span>{loc}</span>
                             <span style={{ color: 'var(--t2)' }}>{count}대 ({pct.toFixed(1)}%)</span>
                           </div>
                           <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                             <div style={{ width: `${pct}%`, height: '100%', background: 'var(--purple-l)', borderRadius: '999px' }}></div>
                           </div>
                         </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Model distribution */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800 }}>📱 기종별 재고 현황</h3>
                
                {/* High level category bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* iPhone */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span>아이폰 (iPhone)</span>
                      <span style={{ color: 'var(--t2)' }}>{stats.iphoneCount}대 ({stats.totalStockCount > 0 ? ((stats.iphoneCount / stats.totalStockCount) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalStockCount > 0 ? (stats.iphoneCount / stats.totalStockCount) * 100 : 0}%`, height: '100%', background: 'var(--purple)', borderRadius: '999px' }}></div>
                    </div>
                  </div>

                  {/* Galaxy */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span>갤럭시 (Galaxy)</span>
                      <span style={{ color: 'var(--t2)' }}>{stats.galaxyCount}대 ({stats.totalStockCount > 0 ? ((stats.galaxyCount / stats.totalStockCount) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalStockCount > 0 ? (stats.galaxyCount / stats.totalStockCount) * 100 : 0}%`, height: '100%', background: 'var(--cyan)', borderRadius: '999px' }}></div>
                    </div>
                  </div>

                  {/* Other */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span>기타 (Other)</span>
                      <span style={{ color: 'var(--t2)' }}>{stats.otherCount}대 ({stats.totalStockCount > 0 ? ((stats.otherCount / stats.totalStockCount) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${stats.totalStockCount > 0 ? (stats.otherCount / stats.totalStockCount) * 100 : 0}%`, height: '100%', background: 'var(--t3)', borderRadius: '999px' }}></div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                
                {/* Detailed Series Counts */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, marginBottom: '10px', color: 'var(--t1)' }}>📋 상세 기종 시리즈 현황</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                    {Object.entries(stats.seriesCounts)
                      .filter(([_, count]) => count > 0)
                      .map(([series, count]) => {
                        const pct = stats.totalStockCount > 0 ? (count / stats.totalStockCount) * 100 : 0;
                        return (
                          <div key={series} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                              <span>{series}</span>
                              <span style={{ color: 'var(--purple-l)' }}>{count}대 ({pct.toFixed(1)}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--purple-l)', borderRadius: '999px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    {Object.values(stats.seriesCounts).every(count => count === 0) && (
                      <div style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '12px' }}>재고 없음</div>
                    )}
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                {/* Top 10 Exact Model Names */}
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, marginBottom: '10px', color: 'var(--t1)' }}>💎 실재고 단일 모델 TOP 10</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {stats.topIndividualModels.slice(0, 10).map(([model, count]) => (
                      <div key={model} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '6px 10px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{model}</span>
                        <span style={{ fontWeight: 800, color: 'var(--green)', fontSize: '12px' }}>{count}대</span>
                      </div>
                    ))}
                    {stats.topIndividualModels.length === 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', padding: '8px' }}>데이터 없음</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Quick info panel */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800 }}>📌 사내 장부 시스템 안내</h3>
                <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p>• 입고된 물건들은 <b>엑셀(CSV) 일괄 등록</b>을 통해 IMEI 중복 없이 대량 업로드할 수 있습니다.</p>
                  <p>• 폰 판매 시 리스트 우측의 <b>"판매 처리"</b> 버튼을 눌러 판매일과 수금 내용을 적어주세요. 장부에 즉시 반영됩니다.</p>
                  <p>• 할부 계약이 완료된 폰은 고객 ID나 계약 내용을 비고에 함께 메모해 두시면 추적하기 수월합니다.</p>
                </div>
              </div>

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
                  placeholder="모델명, IMEI, 또는 스티커 검색..."
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
                  <option value="all">전체 위치</option>
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
                  <option value="all">전체 기종 ({devices.filter(d => !d.deleted_at && !d.is_sold).length}대)</option>
                  {uniqueModels.active.map(([model, count]) => (
                    <option key={model} value={model}>{model} ({count}대)</option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--purple-l)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                  조회된 재고: {filteredActiveDevices.length}대
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedIds.length > 0 && (
                  <button 
                    style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={handleBulkDelete}
                  >
                    🗑️ 선택 삭제 ({selectedIds.length})
                  </button>
                )}
                <button 
                  style={{ margin: 0, background: '#f1f5f9', border: '1px solid var(--border)', color: '#334155', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => setIsCSVModalOpen(true)}
                >
                  📥 대량입고
                </button>
                <button 
                  style={{ margin: 0, background: 'var(--purple-l)', border: 'none', color: '#fff', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={handleOpenAddModal}
                >
                  ➕ 수동입고
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
                      스티커 No {sortField === 'sticker' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('site_date')}>
                      입고일 {sortField === 'site_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                      모델명 (Model) {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '13%' }}>IMEI</th>
                    <th style={{ width: '8%' }}>Color</th>
                    <th style={{ width: '6%', textAlign: 'center' }}>배터리</th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                      매입원가 {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                      소매판매가 {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('stock_location')}>
                      위치 {sortField === 'stock_location' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '12%' }}>비고 (Notes)</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>조작</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        Database fetching active records...
                      </td>
                    </tr>
                  ) : filteredActiveDevices.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        재고 목록이 비어 있습니다. 입고를 진행해 주세요.
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
                              <option value="">-- 모델명 선택 --</option>
                              {models.map(mod => (
                                <option key={mod.id} value={mod.name}>{mod.name}</option>
                              ))}
                            </select>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {item.is_reserved && (
                                <span style={{ fontSize: '10px', fontWeight: 800, background: '#f59e0b', color: '#fff', padding: '1px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>예약중</span>
                              )}
                              <span>{item.model_name}</span>
                            </div>
                          )}
                        </td>
                        <td className="font-mono" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{item.imei}</td>
                        <td>{item.color || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontWeight: 600 }}>
                            {item.battery_pct || '100'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#e11d48' }}>
                          ₩{formatPrice(item.purchase_cost_krw)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                          ฿{formatPrice(item.selling_price)}
                        </td>
                        <td>
                          <span className="badge bg-gray">{item.stock_location || 'Shop'}</span>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.is_reserved ? `예약자: ${item.reserved_by} | ${item.notes || ''}` : item.notes || ''}>
                          {item.is_reserved ? (
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
                              title="판매완료"
                            >
                              💸
                            </button>
                            {item.is_reserved ? (
                              <button
                                style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid var(--border)', cursor: 'pointer' }}
                                onClick={() => handleCancelReservation(item.id)}
                                title="예약취소"
                              >
                                🔓
                              </button>
                            ) : (
                              <button
                                style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', cursor: 'pointer' }}
                                onClick={() => handleOpenReserveModal(item)}
                                title="예약"
                              >
                                📌
                              </button>
                            )}
                            <button
                              className="btn-blue"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleOpenEdit(item)}
                              title="수정"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-red"
                              style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleDeleteDevice(item.id)}
                              title="삭제"
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
                  placeholder="모델명, IMEI, 또는 판매 직원 검색..."
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
                  <option value="all">전체 기종 ({devices.filter(d => !d.deleted_at && d.is_sold).length}대)</option>
                  {uniqueModels.sold.map(([model, count]) => (
                    <option key={model} value={model}>{model} ({count}대)</option>
                  ))}
                </select>

                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--green)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkRestoreToStock}
                    >
                      🔄 선택 재고복원 ({selectedIds.length})
                    </button>
                    <button 
                      style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkDelete}
                    >
                      🗑️ 선택 삭제 ({selectedIds.length})
                    </button>
                  </div>
                )}
              </div>
              
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--purple-l)', whiteSpace: 'nowrap' }}>
                총 판매 대수: {filteredSoldDevices.length}대
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
                    <th style={{ width: '11%', cursor: 'pointer' }} onClick={() => toggleSort('sale_date')}>
                      판매일 {sortField === 'sale_date' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '11%', cursor: 'pointer' }} onClick={() => toggleSort('sticker')}>
                      스티커 No {sortField === 'sticker' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                      모델명 {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '13%' }}>IMEI</th>
                    <th style={{ width: '8%' }}>Color</th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                      매입원가 {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('selling_price')}>
                      판매가격 {sortField === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '10%', cursor: 'pointer' }} onClick={() => toggleSort('seller_name')}>
                      판매사원 {sortField === 'seller_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '12%' }}>판매 메모 / 결제정보</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>재고복원</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        Loading sold device list...
                      </td>
                    </tr>
                  ) : filteredSoldDevices.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        판매 완료된 기기 내역이 없습니다.
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
                        <td>{item.color || '-'}</td>
                        <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{formatPrice(item.purchase_cost_krw)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{formatPrice(item.selling_price)}</td>
                        <td style={{ fontWeight: 700 }}>{item.seller_name || '-'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--t2)' }}>{item.notes || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-red"
                            style={{ width: '28px', height: '28px', minWidth: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', background: '#fef2f2', color: 'var(--red)', borderColor: '#fee2e2', cursor: 'pointer' }}
                            onClick={() => handleRestoreToStock(item.id)}
                            title="재고복원"
                          >
                            🔄
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ==================== VIEW 4: SETTINGS (MASTER DATA) ==================== */}
        {activeTab === 'settings' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Location Management Card */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍</span> 보관 위치 기준 정보 관리
                </h3>
                
                {/* Add Location Form */}
                <form onSubmit={handleAddLocationFromSettings} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="새 보관 위치 입력 (예: Mr.han 3층)"
                    value={newLocInput}
                    onChange={(e) => setNewLocInput(e.target.value)}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                  <button type="submit" className="btn-submit" style={{ margin: 0, width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}>
                    추가
                  </button>
                </form>

                {/* Locations list */}
                <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>위치명</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>조작</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>등록된 위치가 없습니다.</td>
                        </tr>
                      ) : (
                        locations.map((loc) => (
                          <tr key={loc.id}>
                            <td style={{ fontWeight: 700 }}>{loc.name}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button type="button" className="btn-sm btn-blue" onClick={() => handleRenameLocation(loc.name)}>수정</button>
                                <button type="button" className="btn-sm btn-red" onClick={() => handleDeleteLocation(loc.name)}>삭제</button>
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
                  <span>📱</span> 모델명 기준 정보 관리
                </h3>
                
                {/* Add Model Form */}
                <form onSubmit={handleAddModelFromSettings} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="새 모델명 입력 (예: iPhone 16 Pro Max)"
                    value={newModInput}
                    onChange={(e) => setNewModInput(e.target.value)}
                    className="form-input"
                    style={{ margin: 0 }}
                  />
                  <button type="submit" className="btn-submit" style={{ margin: 0, width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}>
                    추가
                  </button>
                </form>

                {/* Models list */}
                <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>모델명</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>조작</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '16px', color: 'var(--t3)' }}>등록된 모델명이 없습니다.</td>
                        </tr>
                      ) : (
                        models.map((mod) => (
                          <tr key={mod.id}>
                            <td style={{ fontWeight: 700 }}>{mod.name}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button type="button" className="btn-sm btn-blue" onClick={() => handleRenameModel(mod.name)}>수정</button>
                                <button type="button" className="btn-sm btn-red" onClick={() => handleDeleteModel(mod.name)}>삭제</button>
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
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>마진 및 정산관리</h3>
              <p style={{ color: 'var(--t2)', fontSize: '13px', lineHeight: 1.6 }}>
                마진 및 정산관리 기능 준비 중입니다. 차후 업데이트 예정입니다.
              </p>
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
                  placeholder="모델명, IMEI, 또는 스티커 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '220px', margin: 0, padding: '8px 12px', fontSize: '13px' }}
                />
                {selectedIds.length > 0 && (
                  <>
                    <button 
                      style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', color: 'var(--green)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkRestore}
                    >
                      🔄 선택 복원 ({selectedIds.length})
                    </button>
                    <button 
                      style={{ margin: 0, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--red)', padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={handleBulkPermanentDelete}
                    >
                      🔥 선택 영구삭제 ({selectedIds.length})
                    </button>
                  </>
                )}
              </div>
              
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap' }}>
                휴지통 기기: {filteredTrashDevices.length}대 (7일 후 영구 자동 삭제)
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
                      스티커 No {sortField === 'sticker' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('model_name')}>
                      모델명 {sortField === 'model_name' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%' }}>IMEI</th>
                    <th style={{ width: '8%' }}>Color</th>
                    <th style={{ width: '10%', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('purchase_cost_krw')}>
                      매입원가 {sortField === 'purchase_cost_krw' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', cursor: 'pointer' }} onClick={() => toggleSort('deleted_at')}>
                      삭제 일시 {sortField === 'deleted_at' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ width: '15%', textAlign: 'center' }}>조작</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        Loading trash bin...
                      </td>
                    </tr>
                  ) : filteredTrashDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        휴지통이 비어 있습니다.
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
                              title="복원"
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
                              title="영구삭제"
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
              <span className="modal-title" style={{ fontSize: '16px', fontWeight: 800 }}>📥 대량 기기 입고 (Bulk Device Ingestion)</span>
              <button className="modal-x" onClick={() => setIsCSVModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              {/* Method Switcher Tabs */}
              <div className="auth-tabs" style={{ display: 'flex', background: 'rgba(0, 0, 0, .03)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                <button 
                  type="button"
                  className={`tab-btn ${intakeMethod === 'sync' ? 'active' : ''}`}
                  onClick={() => setIntakeMethod('sync')}
                  style={{ flex: 1, padding: '10px', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}
                >
                  🌐 구글 시트 실시간 연동
                </button>
                <button 
                  type="button"
                  className={`tab-btn ${intakeMethod === 'file' ? 'active' : ''}`}
                  onClick={() => setIntakeMethod('file')}
                  style={{ flex: 1, padding: '10px', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}
                >
                  📁 CSV 파일 업로드
                </button>
                <button 
                  type="button"
                  className={`tab-btn ${intakeMethod === 'paste' ? 'active' : ''}`}
                  onClick={() => setIntakeMethod('paste')}
                  style={{ flex: 1, padding: '10px', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}
                >
                  📋 복사 붙여넣기 (Ctrl+C/V)
                </button>
              </div>

              {/* METHOD 1: Google Sheets Live Sync */}
              {intakeMethod === 'sync' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--t2)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💡</span> 실시간 구글 스프레드시트 동기화 안내
                    </h4>
                    <p>
                      Phoneswitchhub 공식 구글 시트(<a href="https://docs.google.com/spreadsheets/d/1NpSAZNB9xb0pYZxs5sKp9hxXQraMPXcpxWyhUO2o4DM/edit" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple)', textDecoration: 'underline', fontWeight: 600 }}>장부 링크</a>)에서 실시간으로 전체 기기 내역을 조회해 데이터베이스에 동기화합니다.
                    </p>
                    <p style={{ marginTop: '6px' }}>
                      • <b>IMEI를 고유 키</b>로 하여 이미 등록된 기기는 정보를 덮어쓰고(Update), 새로운 기기는 자동으로 추가(Insert)합니다.
                    </p>
                    <p style={{ marginTop: '6px' }}>
                      • 연동 시 데이터 용량에 따라 완료까지 수 초 정도 소요될 수 있으니 완료 토스트창이 뜰 때까지 기다려 주세요.
                    </p>
                  </div>
                  
                  <button 
                    type="button"
                    className="btn-submit"
                    onClick={handleLiveSync}
                    disabled={importingCSV}
                    style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {importingCSV ? '🔄 구글 시트 데이터 로딩 및 동기화 중...' : '🌐 구글 시트에서 실시간 불러오기 시작'}
                  </button>
                </div>
              )}

              {/* METHOD 2: CSV File Upload */}
              {intakeMethod === 'file' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--t2)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>📁 CSV 파일 내보내기 안내</h4>
                    <p>구글 스프레드시트 또는 엑셀에서 [파일] ➔ [다운로드] ➔ [쉼표로 구분된 값(.csv)]으로 저장한 뒤 아래에 업로드해 주세요.</p>
                  </div>

                  <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', background: '#f8fafc', position: 'relative' }}>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      style={{ display: 'block', margin: '0 auto 12px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>UTF-8 인코딩 형식의 파일만 지원됩니다.</span>
                  </div>

                  {csvFileText && (
                    <div className="animate-fade-in" style={{ marginTop: '8px' }}>
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', marginBottom: '6px', display: 'block' }}>
                        📄 로드된 CSV 파일 데이터 일부 미리보기
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
                    {importingCSV ? '🔄 기기 업로드 처리 중...' : '🚀 업로드된 CSV 데이터 일괄 등록'}
                  </button>
                </div>
              )}

              {/* METHOD 3: Clipboard Copy Paste */}
              {intakeMethod === 'paste' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '12px', lineHeight: 1.6, color: 'var(--t2)' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--t1)', marginBottom: '8px' }}>📋 복사 붙여넣기(Ctrl+C / Ctrl+V) 안내</h4>
                    <p>엑셀 이나 구글 시트의 데이터 영역(행들과 열들)을 마우스 드래그로 복사(Ctrl+C)한 후, 아래 입력창에 바로 붙여넣기(Ctrl+V) 하시면 자동으로 탭 구분 기호를 분석하여 즉시 입고합니다.</p>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', marginBottom: '6px', display: 'block' }}>
                      ✍️ 여기에 복사한 데이터 붙여넣기
                    </label>
                    <textarea
                      rows={6}
                      placeholder="구글 시트의 행 영역을 복사해서 붙여넣으세요...&#10;예시:&#10;26. 6. 8.	[판매날짜]	...	M12345	iPhone 14 Pro	351234567890123	Gold	FALSE	Shop	90%"
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
                    {importingCSV ? '🔄 붙여넣은 데이터 구문 분석 및 등록 중...' : '🚀 붙여넣은 데이터 일괄 등록'}
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
                {editingDevice ? '✏️ 단말기 세부 정보 수정' : '➕ 단말기 수동 개별 입고'}
              </span>
              <button className="modal-x" onClick={() => {
                setIsManualModalOpen(false);
                setEditingDevice(null);
              }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px', maxHeight: '65vh', overflowY: 'auto' }}>
              
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">스티커 번호 (Sticker No.)</label>
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
                <label className="form-label">모델명 (Model Name) *</label>
                <select
                  value={isCustomModel ? '___new___' : modelName}
                  onChange={(e) => handleModelSelectChange(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                  disabled={!!editingDevice && staffProfile?.role !== 'admin'}
                >
                  <option value="">-- 모델명 선택 --</option>
                  {modelOptions.map((mod) => (
                    <option key={mod.id} value={mod.name}>{mod.name}</option>
                  ))}
                  <option value="___new___" style={{ color: 'var(--purple)', fontWeight: 700 }}>+ ➕ 새 모델명 직접 등록</option>
                </select>
                
                {isCustomModel && (
                  <div className="animate-slide-up" style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="예: iPhone 15 Pro 128GB"
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, borderColor: 'var(--purple)' }}
                      disabled={!!editingDevice && staffProfile?.role !== 'admin'}
                    />
                    <small style={{ color: 'var(--purple)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      새로 입력하신 모델명은 기준 정보에 자동 추가됩니다.
                    </small>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">IMEI 번호 *</label>
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
                <label className="form-label">색상 (Color)</label>
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
                <label className="form-label">배터리 성능 % / 액정 상태</label>
                <input
                  type="text"
                  placeholder="85 또는 จอปลอม"
                  value={batteryPct}
                  onChange={(e) => setBatteryPct(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">보관 위치 (Location)</label>
                <select
                  value={isCustomLocation ? '___new___' : location}
                  onChange={(e) => handleLocationSelectChange(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">-- 위치 선택 --</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                  <option value="___new___" style={{ color: 'var(--purple)', fontWeight: 700 }}>+ ➕ 새 위치 직접 등록</option>
                </select>

                {isCustomLocation && (
                  <div className="animate-slide-up" style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="예: Mr.han 2층"
                      value={customLocationName}
                      onChange={(e) => setCustomLocationName(e.target.value)}
                      className="form-input"
                      style={{ margin: 0, borderColor: 'var(--purple)' }}
                    />
                    <small style={{ color: 'var(--purple)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      새로 입력하신 위치는 기준 정보에 자동 추가됩니다.
                    </small>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">매입원가 (KRW ₩) *</label>
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
                <label className="form-label">소매판매가 (THB ฿) *</label>
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
                <label className="form-label">입고 날짜</label>
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
                <label className="form-label">상세 비고 (Notes)</label>
                <textarea
                  placeholder="스크래치, 부품 교체 기록 등..."
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
                {savingDevice ? t('loading') : '💾 정보 저장'}
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
              <span className="modal-title">💸 판매 장부 등록</span>
              <button className="modal-x" onClick={() => setSellingDevice(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                기기명: <b style={{ color: 'var(--purple-l)' }}>{sellingDevice.model_name}</b><br />
                IMEI: <span className="font-mono">{sellingDevice.imei}</span>
              </p>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">판매 일자 (Sale Date)</label>
                <input
                  type="text"
                  placeholder="26. 6. 8."
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">판매 사원명 (Seller Name) *</label>
                <select
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">-- 판매 사원 선택 --</option>
                  {staffMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">판매 메모 / 수금 정보</label>
                <input
                  type="text"
                  placeholder="현금 수금 14,900 또는 할부계약(IRIS0000126)"
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
                {processingSale ? t('loading') : '💸 판매 승인'}
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
              <span className="modal-title">📌 단말기 예약 등록</span>
              <button className="modal-x" onClick={() => setReservingDevice(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                기기명: <b style={{ color: 'var(--purple-l)' }}>{reservingDevice.model_name}</b><br />
                IMEI: <span className="font-mono">{reservingDevice.imei}</span>
              </p>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">예약 사원명 (Reserver Name) *</label>
                <select
                  value={reserverName}
                  onChange={(e) => setReserverName(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="">-- 예약 사원 선택 --</option>
                  {staffMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">예약 상세 메모</label>
                <input
                  type="text"
                  placeholder="예: 금주 토요일 수령 예정, 계약금 1,000바트 수령"
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
                {processingReservation ? t('loading') : '📌 예약 확정'}
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
