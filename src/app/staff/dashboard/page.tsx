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
}

export default function StaffDashboard() {
  const router = useRouter();
  const { t, lang } = useTranslation();

  // Authentication & Profile States
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Active Tab: 'overview' | 'ledger' | 'sales'
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'sales'>('overview');

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

  // Manual Input Form State
  const [sticker, setSticker] = useState('');
  const [modelName, setModelName] = useState('');
  const [imei, setImei] = useState('');
  const [color, setColor] = useState('');
  const [batteryPct, setBatteryPct] = useState('100');
  const [location, setLocation] = useState('Shop');
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

  useEffect(() => {
    if (isAuthorized) {
      loadLedgerData();
    }
  }, [isAuthorized, loadLedgerData]);

  // 3. Stats Calculations
  const stats = useMemo(() => {
    const activeStock = devices.filter(d => !d.is_sold);
    const soldList = devices.filter(d => d.is_sold);

    const totalStockCount = activeStock.length;
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

    return {
      totalStockCount,
      totalPurchaseCostKRW,
      totalSellingValueTHB,
      totalSoldCount,
      totalSoldRevenueTHB,
      locationCounts
    };
  }, [devices]);

  // Filtered lists
  const filteredActiveDevices = useMemo(() => {
    return devices.filter(d => {
      if (d.is_sold) return false;
      const matchSearch = d.model_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = locationFilter === 'all' || d.stock_location === locationFilter;
      return matchSearch && matchLoc;
    });
  }, [devices, searchQuery, locationFilter]);

  const filteredSoldDevices = useMemo(() => {
    return devices.filter(d => {
      if (!d.is_sold) return false;
      const matchSearch = d.model_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (d.imei && d.imei.includes(searchQuery)) ||
                          (d.sticker && d.sticker.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [devices, searchQuery]);

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
        const rawImei = row[imeiIdx] ? row[imeiIdx].trim().replace(/\s+/g, '') : '';
        if (!rawImei || rawImei.toLowerCase() === 'imei' || isNaN(Number(rawImei.slice(0, 5)))) {
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
      const res = await fetch('/api/inventory?all=true');
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
        const rawImei = row[imeiIdx] ? row[imeiIdx].trim().replace(/\s+/g, '') : '';
        if (!rawImei || rawImei.toLowerCase() === 'imei' || isNaN(Number(rawImei.slice(0, 5)))) {
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
    setImei('');
    setColor('');
    setBatteryPct('100');
    setLocation('Shop');
    setPurchaseCost('');
    setSellingPrice('');
    setSiteDate(new Date().toLocaleDateString('ko-KR').slice(2));
    setNotes('');
    setIsManualModalOpen(true);
  };

  // 6. Manual Intake Single Addition Handler
  const handleSaveManualIntake = async () => {
    if (!modelName.trim() || !imei.trim()) {
      showToast('❌ Model Name and IMEI are required.', 'error');
      return;
    }
    
    setSavingDevice(true);
    try {
      const payload = {
        sticker: sticker.trim() || null,
        model_name: modelName.trim(),
        imei: imei.trim().replace(/\s+/g, ''),
        color: color.trim() || null,
        battery_pct: batteryPct.trim() || '100',
        stock_location: location,
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
        ({ error } = await supabase
          .from('sheets_inventory')
          .insert(payload));
      }

      if (error) throw error;

      showToast(editingDevice ? '✅ Device updated.' : '✅ Device added to stock.', 'success');
      setIsManualModalOpen(false);
      setEditingDevice(null);
      
      // Reset Form fields
      setSticker('');
      setModelName('');
      setImei('');
      setColor('');
      setBatteryPct('100');
      setPurchaseCost('');
      setSellingPrice('');
      setSiteDate('');
      setNotes('');

      loadLedgerData();
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    } finally {
      setSavingDevice(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (device: DeviceItem) => {
    setEditingDevice(device);
    setSticker(device.sticker || '');
    setModelName(device.model_name);
    setImei(device.imei);
    setColor(device.color || '');
    setBatteryPct(device.battery_pct || '100');
    setLocation(device.stock_location || 'Shop');
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

  // Re-verify back to inventory stock
  const handleRestoreToStock = async (deviceId: string) => {
    if (!confirm('Mark this device back as active stock?')) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_sold: false,
          sale_date: null,
          seller_name: null
        })
        .eq('id', deviceId);

      if (error) throw error;

      showToast('🔄 Device returned to active stock list.', 'success');
      loadLedgerData();
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    }
  };

  // Delete Device Handler
  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to permanently delete this device ledger row?')) return;
    try {
      const { error } = await supabase
        .from('sheets_inventory')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      setDevices(prev => prev.filter(d => d.id !== deviceId));
      showToast('🗑️ Device deleted from system.', 'success');
    } catch (err: any) {
      showToast('❌ Error: ' + err.message, 'error');
    }
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
            onClick={() => setActiveTab('overview')}
          >
            <span className="ico">📊</span> {t('staff_menu_overview') || '경영 개요'}
          </button>
          
          <button 
            className={`sb-link ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <span className="ico">📱</span> {t('staff_menu_inventory') || '기기 입고/재고'}
          </button>

          <button 
            className={`sb-link ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <span className="ico">💸</span> {t('staff_menu_sales') || '판매 완료 장부'}
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
        <header className="main-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800 }}>
              {activeTab === 'overview' && `📊 ${t('staff_menu_overview') || '경영 개요'}`}
              {activeTab === 'ledger' && `📱 ${t('staff_menu_inventory') || '기기 입고 및 재고 관리'}`}
              {activeTab === 'sales' && `💸 ${t('staff_menu_sales') || '판매 완료 장부'}`}
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
                <div className="sc-num" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--green)', margin: '8px 0 2px' }}>
                  {stats.totalStockCount} 대
                </div>
                <div className="sc-lbl" style={{ color: 'var(--t2)', fontSize: '11px', fontWeight: 600 }}>현재고 수량</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                <input
                  type="text"
                  placeholder="모델명, IMEI, 또는 스티커 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '280px', margin: 0 }}
                />
                
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '160px', margin: 0 }}
                >
                  <option value="all">전체 위치</option>
                  <option value="Shop">Shop</option>
                  <option value="TUKCOM">TUKCOM</option>
                  <option value="Mr.han">Mr.han</option>
                  <option value="DHL">DHL (오는중)</option>
                  <option value="OTHER">기타 (OTHER)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn-submit"
                  style={{ margin: 0, background: '#f1f5f9', border: '1px solid var(--border)', color: '#334155' }}
                  onClick={() => setIsCSVModalOpen(true)}
                >
                  📥 대량 기기 입고 (시트/CSV/Ctrl+V)
                </button>
                <button 
                  className="btn-submit"
                  style={{ margin: 0 }}
                  onClick={handleOpenAddModal}
                >
                  ➕ 수동 개별 입고
                </button>
              </div>
            </div>

            {/* Devices Stock Grid Table */}
            <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>스티커 No</th>
                    <th>입고일</th>
                    <th>모델명 (Model)</th>
                    <th>IMEI</th>
                    <th>Color</th>
                    <th style={{ textAlign: 'center' }}>배터리</th>
                    <th style={{ textAlign: 'right' }}>매입원가</th>
                    <th style={{ textAlign: 'right' }}>소매판매가</th>
                    <th>위치 (Location)</th>
                    <th>비고 (Notes)</th>
                    <th style={{ textAlign: 'center' }}>조작</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        Database fetching active records...
                      </td>
                    </tr>
                  ) : filteredActiveDevices.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        재고 목록이 비어 있습니다. 입고를 진행해 주세요.
                      </td>
                    </tr>
                  ) : (
                    filteredActiveDevices.map(item => (
                      <tr key={item.id}>
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
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#e11d48' }}>
                          ₩{formatPrice(item.purchase_cost_krw)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                          ฿{formatPrice(item.selling_price)}
                        </td>
                        <td>
                          <span className="badge bg-gray">{item.stock_location || 'Shop'}</span>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--t2)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.notes || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              className="btn-sm btn-green"
                              onClick={() => handleOpenSellModal(item)}
                            >
                              💸 판매완료
                            </button>
                            <button
                              className="btn-sm btn-blue"
                              onClick={() => handleOpenEdit(item)}
                            >
                              수정
                            </button>
                            <button
                              className="btn-sm btn-red"
                              onClick={() => handleDeleteDevice(item.id)}
                            >
                              삭제
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
              <input
                type="text"
                placeholder="모델명, IMEI, 또는 판매 직원 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ maxWidth: '280px', margin: 0 }}
              />
              
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple-l)' }}>
                총 판매 대수: {filteredSoldDevices.length}대
              </div>
            </div>

            {/* Sales Grid Table */}
            <div className="tbl-wrap" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>판매일</th>
                    <th>스티커 No</th>
                    <th>모델명</th>
                    <th>IMEI</th>
                    <th>Color</th>
                    <th style={{ textAlign: 'right' }}>매입원가</th>
                    <th style={{ textAlign: 'right' }}>판매가격</th>
                    <th>판매사원</th>
                    <th>판매 메모 / 결제정보</th>
                    <th style={{ textAlign: 'center' }}>재고복원</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        Loading sold device list...
                      </td>
                    </tr>
                  ) : filteredSoldDevices.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--t2)' }}>
                        판매 완료된 기기 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredSoldDevices.map(item => (
                      <tr key={item.id} style={{ background: '#fafaf9' }}>
                        <td style={{ fontWeight: 700, color: 'var(--green)' }}>{item.sale_date || '-'}</td>
                        <td style={{ color: 'var(--t2)' }}>{item.sticker || '-'}</td>
                        <td style={{ fontWeight: 700 }}>{item.model_name}</td>
                        <td className="font-mono" style={{ fontSize: '11px' }}>{item.imei}</td>
                        <td>{item.color || '-'}</td>
                        <td style={{ textAlign: 'right', color: '#94a3b8' }}>₩{formatPrice(item.purchase_cost_krw)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>฿{formatPrice(item.selling_price)}</td>
                        <td style={{ fontWeight: 700 }}>{item.seller_name || '-'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--t2)' }}>{item.notes || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-sm btn-red"
                            style={{ background: '#fef2f2', color: 'var(--red)', borderColor: '#fee2e2' }}
                            onClick={() => handleRestoreToStock(item.id)}
                          >
                            🔄 재고복원
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
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">모델명 (Model Name) *</label>
                <input
                  type="text"
                  placeholder="AIP15 Pro-256G"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
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
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                >
                  <option value="Shop">Shop</option>
                  <option value="TUKCOM">TUKCOM</option>
                  <option value="Mr.han">Mr.han</option>
                  <option value="DHL">DHL (오는중)</option>
                  <option value="OTHER">기타 (OTHER)</option>
                </select>
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
                <input
                  type="text"
                  placeholder="Nam, Beam, Muay 등..."
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="form-input"
                  style={{ margin: 0 }}
                />
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
