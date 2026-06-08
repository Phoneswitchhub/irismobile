'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { formatPrice, formatDate, resizeAndCompressImage } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  stock: number;
  description: string;
  images: string[];
  status: string;
  created_at: string;
  seller_id: string;
}

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  status: string;
  payment_method: string;
  deposit_confirmed: boolean;
  shipping_company?: string;
  tracking_number?: string;
  created_at: string;
  notes?: string;
  products?: {
    title: string;
  };
  buyer?: {
    name: string;
    phone: string;
  };
}

export default function StaffDashboard() {
  const router = useRouter();
  const { t, lang } = useTranslation();

  // Authentication & Profile States
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Active Menu: 'overview' | 'inventory' | 'sales'
  const [activeMenu, setActiveMenu] = useState<'overview' | 'inventory' | 'sales'>('overview');

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Product Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pTitle, setPTitle] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCat, setPCat] = useState('iPhone');
  const [pCondition, setPCondition] = useState('s');
  const [pStock, setPStock] = useState('1');
  const [pDesc, setPDesc] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);

  // Order Tracking Input Modal States
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<Order | null>(null);
  const [trackingCompany, setTrackingCompany] = useState('Flash Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submittingTracking, setSubmittingTracking] = useState(false);

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

  // 2. Fetch Data (Inventory & Sales)
  const loadDashboardData = useCallback(async () => {
    if (!isAuthorized || !staffProfile) return;
    setLoadingData(true);
    try {
      // Query internal products (products belonging to the staff user or all products if admin)
      let productQuery = supabase.from('products').select('*');
      if (staffProfile.role !== 'admin') {
        productQuery = productQuery.eq('seller_id', staffProfile.id);
      }
      const { data: prodData, error: prodErr } = await productQuery.order('created_at', { ascending: false });
      if (prodErr) throw prodErr;
      setProducts(prodData || []);

      // Query internal orders (orders received by the staff/direct store or all orders if admin)
      let orderQuery = supabase
        .from('orders')
        .select('*, products(title), buyer:profiles!orders_buyer_id_fkey(name, phone)');
      if (staffProfile.role !== 'admin') {
        orderQuery = orderQuery.eq('seller_id', staffProfile.id);
      }
      const { data: ordData, error: ordErr } = await orderQuery.order('created_at', { ascending: false });
      if (ordErr) throw ordErr;
      setOrders(ordData || []);
    } catch (err: any) {
      console.error(err);
      showToast(t('error_occurred') + err.message, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [isAuthorized, staffProfile, showToast, t]);

  useEffect(() => {
    if (isAuthorized) {
      loadDashboardData();
    }
  }, [isAuthorized, loadDashboardData]);

  // 3. Stats Calculations (Overview Tab)
  const stats = useMemo(() => {
    const totalSKUs = products.length;
    const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
    
    // Monthly sales calculation (Current Month orders completed)
    const now = new Date();
    const currentMonthOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      return (
        o.status === 'completed' &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    });
    const monthlySalesVal = currentMonthOrders.reduce((acc, o) => acc + o.total_price, 0);

    // Waiting Payout / Waiting Shipment Orders
    const pendingShipmentCount = orders.filter(o => o.status === 'confirmed').length;

    // Low stock items (stock <= 3)
    const lowStockItems = products.filter(p => p.stock <= 3 && p.status === 'active');

    return {
      totalSKUs,
      totalStockValue,
      monthlySalesVal,
      pendingShipmentCount,
      lowStockItems
    };
  }, [products, orders]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // 4. Quick Stock Adjustment Handler
  const handleQuickStockAdjust = async (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
      showToast(t('toast_status_updated'), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // 5. Product Add / Edit Submit Handler
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setPTitle('');
    setPPrice('');
    setPCat('iPhone');
    setPCondition('s');
    setPStock('1');
    setPDesc('');
    setExistingImages([]);
    setNewImageFiles([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setPTitle(product.title);
    setPPrice(product.price.toString());
    setPCat(product.category);
    setPCondition(product.condition);
    setPStock(product.stock.toString());
    setPDesc(product.description || '');
    setExistingImages(product.images || []);
    setNewImageFiles([]);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!pTitle.trim() || !pPrice) {
      showToast(t('toast_title_price_required'), 'error');
      return;
    }
    if (!staffProfile) return;

    setSavingProduct(true);
    try {
      const imageUrls = [...existingImages];

      // Upload new images to products bucket under path sellerId/filename
      for (const file of newImageFiles) {
        const compressed = await resizeAndCompressImage(file);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const path = `${staffProfile.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('products')
          .upload(path, compressed);

        if (uploadErr) {
          console.error(uploadErr);
          showToast(t('toast_upload_failed') + uploadErr.message, 'error');
        } else {
          const { data: urlData } = supabase.storage
            .from('products')
            .getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
      }

      const payload = {
        title: pTitle.trim(),
        price: Number(pPrice),
        category: pCat,
        condition: pCondition,
        stock: Number(pStock),
        description: pDesc.trim(),
        images: imageUrls,
        seller_id: staffProfile.id
      };

      let error;
      if (editingProduct) {
        ({ error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id));
      } else {
        ({ error } = await supabase
          .from('products')
          .insert({ ...payload, status: 'active' }));
      }

      if (error) throw error;

      showToast(t('toast_product_saved'), 'success');
      setIsModalOpen(false);
      loadDashboardData();
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  // Product Toggle Status (Active / Hidden)
  const handleToggleProductStatus = async (product: Product) => {
    const nextStatus = product.status === 'active' ? 'hidden' : 'active';
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: nextStatus })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: nextStatus } : p));
      showToast(nextStatus === 'active' ? t('toast_product_published') : t('toast_product_hidden'), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // Product Delete Handler
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t('confirm_delete'))) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast(t('toast_product_deleted'), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // 6. CSV Exporter for Inventory List
  const handleExportCSV = () => {
    if (products.length === 0) {
      showToast(t('empty_products'), 'error');
      return;
    }
    const headers = ['ID', 'Title', 'Price (THB)', 'Category', 'Condition', 'Stock', 'Status', 'Created At'];
    const rows = products.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.price,
      p.category,
      p.condition.toUpperCase(),
      p.stock,
      p.status,
      p.created_at
    ]);

    // Prepend UTF-8 BOM so Excel opens Korean/Thai characters correctly
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✅ CSV downloaded successfully', 'success');
  };

  // 7. Order State Transition Processing
  const handleConfirmDeposit = async (orderId: string) => {
    if (!confirm(t('confirm_deposit_check'))) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deposit_confirmed: true })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, deposit_confirmed: true } : o));
      showToast(t('toast_status_updated'), 'success');
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  const handleOpenTrackingModal = (order: Order) => {
    setSelectedOrderForTracking(order);
    setTrackingCompany('Flash Express');
    setTrackingNumber('');
  };

  const handleSaveTracking = async () => {
    if (!selectedOrderForTracking) return;
    if (!trackingNumber.trim()) {
      showToast(t('toast_enter_tracking'), 'error');
      return;
    }

    setSubmittingTracking(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          shipping_company: trackingCompany,
          tracking_number: trackingNumber.trim()
        })
        .eq('id', selectedOrderForTracking.id);

      if (error) throw error;

      showToast(t('toast_order_shipped'), 'success');
      setSelectedOrderForTracking(null);
      loadDashboardData();
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    } finally {
      setSubmittingTracking(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(t('confirm_cancel_order_seller'))) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      showToast(t('toast_order_cancelled'), 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;

      showToast(t('toast_order_completed'), 'success');
      loadDashboardData();
    } catch (err: any) {
      showToast(t('error_occurred') + err.message, 'error');
    }
  };

  // Rendering Loading screen while authorization executes
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium tracking-wide">Checking staff authorization...</p>
        </div>
      </div>
    );
  }

  // Rendering Access Denied splash card
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4 font-sans">
        <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-red-500/20 text-center relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-red-500/10 rounded-full blur-2xl"></div>
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight text-red-400">{t('access_denied_title')}</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            {t('staff_no_access')}
          </p>
          <div className="py-2 px-4 bg-slate-900 rounded-lg inline-block text-xs text-slate-500">
            Redirecting to home in <span className="text-violet-400 font-bold">{redirectCountdown}</span> seconds...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex overflow-hidden">
      
      {/* Dynamic Background Blur Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* LEFT SIDEBAR (Desktop Fixed) */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between shrink-0 relative z-10">
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-slate-900/60">
            <h2 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent tracking-wider">
              {t('staff_portal')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">
              {staffProfile?.store_name || staffProfile?.name || 'Staff User'}
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveMenu('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === 'overview'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span>📊</span> {t('staff_menu_overview')}
            </button>
            <button
              onClick={() => setActiveMenu('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === 'inventory'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span>📱</span> {t('staff_menu_inventory')}
            </button>
            <button
              onClick={() => setActiveMenu('sales')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeMenu === 'sales'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/20'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span>📦</span> {t('staff_menu_sales')}
            </button>
          </nav>
        </div>

        {/* Footer controls inside Sidebar */}
        <div className="p-4 border-t border-slate-900">
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white hover:border-slate-700 font-semibold transition-all"
          >
            ↩️ {t('go_home_btn')}
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN VIEWPORT */}
      <main className="flex-1 overflow-y-auto relative z-10 px-8 py-8">
        
        {/* Upper Toolbar */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900/50">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('staff_dashboard_title')}</h1>
            <p className="text-xs text-slate-400 mt-1">Manage private stock and process direct orders.</p>
          </div>
          
          {/* Lang swapper placeholder or simple status */}
          <div className="flex items-center gap-2 text-xs bg-slate-900/50 border border-slate-800 rounded-full px-3.5 py-1.5 text-slate-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Connected to Supabase
          </div>
        </header>

        {/* --- OVERVIEW TAB CONTENT --- */}
        {activeMenu === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Grid statistics panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="glass-card p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('staff_total_stock_value')}</p>
                <h3 className="text-2xl font-black text-white mt-2">฿{formatPrice(stats.totalStockValue)}</h3>
                <div className="absolute top-4 right-4 text-3xl opacity-20">💰</div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('staff_active_sku')}</p>
                <h3 className="text-2xl font-black text-white mt-2">{stats.totalSKUs}</h3>
                <div className="absolute top-4 right-4 text-3xl opacity-20">🏷️</div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('staff_monthly_sales')}</p>
                <h3 className="text-2xl font-black text-violet-400 mt-2">฿{formatPrice(stats.monthlySalesVal)}</h3>
                <div className="absolute top-4 right-4 text-3xl opacity-20">📈</div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">배송 대기 주문 (Shipments)</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-2">{stats.pendingShipmentCount}</h3>
                <div className="absolute top-4 right-4 text-3xl opacity-20">🚚</div>
              </div>

            </div>

            {/* Low stock alerts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Low Stock card (col-span 2) */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 lg:col-span-2">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <span>🚨</span> 저재고 경고 리스트 (Low Stock Warnings)
                </h3>
                {stats.lowStockItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    ✅ All active items have sufficient stock.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-400">
                          <th className="py-3 px-2">상품명</th>
                          <th className="py-3 px-2">카테고리</th>
                          <th className="py-3 px-2 text-right">단가</th>
                          <th className="py-3 px-2 text-center">현재고</th>
                          <th className="py-3 px-2 text-center">조정</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.lowStockItems.map(item => (
                          <tr key={item.id} className="border-b border-slate-900 hover:bg-slate-900/40">
                            <td className="py-3 px-2 font-medium text-white">{item.title}</td>
                            <td className="py-3 px-2 text-slate-400">{item.category}</td>
                            <td className="py-3 px-2 text-right font-semibold">฿{formatPrice(item.price)}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="bg-red-950/60 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-bold">
                                {item.stock} 개
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                onClick={() => handleQuickStockAdjust(item.id, item.stock, 5)}
                                className="bg-slate-800 hover:bg-violet-600 hover:text-white px-2 py-1 rounded-md text-[10px] font-bold"
                              >
                                +5 재고추가
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick info panel (col-span 1) */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4">📢 사내 작업 공지</h3>
                <div className="space-y-4 text-xs leading-relaxed text-slate-400">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="font-bold text-slate-300">실시간 재고 조정</p>
                    <p className="mt-1">사내 재고 탭에서 마우스 클릭으로 재고를 즉시 가감할 수 있습니다. 수정한 내역은 직영점 쇼핑 화면에 실시간으로 반영됩니다.</p>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="font-bold text-slate-300">안심 배송 처리</p>
                    <p className="mt-1">고객이 안심 거래 입금을 완료하면 관리자 입금 확인 버튼이 켜집니다. 확인이 끝난 후 배송 송장을 넣어주세요.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- INVENTORY TAB CONTENT --- */}
        {activeMenu === 'inventory' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Inventory controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
              <div className="flex flex-1 items-center gap-3">
                <input
                  type="text"
                  placeholder="모델명 또는 기기 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500 w-full md:max-w-xs"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-violet-500"
                >
                  <option value="all">전체 카테고리</option>
                  <option value="iPhone">iPhone</option>
                  <option value="iPad">iPad</option>
                  <option value="Galaxy">Galaxy</option>
                  <option value="MacBook">MacBook</option>
                  <option value="Other">기타 (Other)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all"
                >
                  📥 {t('staff_download_csv')}
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-950/35 transition-all"
                >
                  ➕ 상품 신규 등록
                </button>
              </div>
            </div>

            {/* Inventory Table Grid */}
            <div className="glass-card rounded-2xl border border-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 bg-slate-900/30">
                      <th className="py-4 px-4 w-16">이미지</th>
                      <th className="py-4 px-4">상품명</th>
                      <th className="py-4 px-4 text-center">기기등급</th>
                      <th className="py-4 px-4">카테고리</th>
                      <th className="py-4 px-4 text-right">단가 (Price)</th>
                      <th className="py-4 px-4 text-center w-36">재고 조정 (Stock)</th>
                      <th className="py-4 px-4 text-center">공개상태</th>
                      <th className="py-4 px-4 text-center">수정/삭제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                          Data loading from Supabase...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          {t('empty_products')}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(product => (
                        <tr key={product.id} className="border-b border-slate-900/60 hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 px-4">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-800"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-600">
                                No Img
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">{product.title}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
                              {product.condition}급
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{product.category}</td>
                          <td className="py-3 px-4 text-right font-bold text-white">฿{formatPrice(product.price)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2.5">
                              <button
                                onClick={() => handleQuickStockAdjust(product.id, product.stock, -1)}
                                disabled={product.stock <= 0}
                                className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-300 font-bold transition-all text-center flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className={`w-8 text-center font-bold ${product.stock <= 3 ? 'text-red-400 font-black' : 'text-white'}`}>
                                {product.stock}
                              </span>
                              <button
                                onClick={() => handleQuickStockAdjust(product.id, product.stock, 1)}
                                className="w-7 h-7 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-bold transition-all text-center flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleProductStatus(product)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                product.status === 'active'
                                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30'
                                  : 'bg-amber-950/50 border-amber-500/30 text-amber-400 hover:bg-amber-900/30'
                              }`}
                            >
                              {product.status === 'active' ? t('product_status_active') : t('product_status_hidden')}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(product)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all font-semibold"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-red-950 hover:text-red-400 border border-slate-800 hover:border-red-900 rounded-lg text-slate-400 transition-all font-semibold"
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
          </div>
        )}

        {/* --- SALES & ORDERS TAB CONTENT --- */}
        {activeMenu === 'sales' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Orders summary */}
            <div className="glass-card rounded-2xl border border-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 bg-slate-900/30">
                      <th className="py-4 px-4">주문번호</th>
                      <th className="py-4 px-4">주문일자</th>
                      <th className="py-4 px-4">상품 / 수량</th>
                      <th className="py-4 px-4 text-right">총 금액</th>
                      <th className="py-4 px-4">구매자 연락처</th>
                      <th className="py-4 px-4 text-center">결제수단</th>
                      <th className="py-4 px-4 text-center">입금확인</th>
                      <th className="py-4 px-4 text-center">배송/송장</th>
                      <th className="py-4 px-4 text-center">주문상태</th>
                      <th className="py-4 px-4 text-center">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                          Data loading from Supabase...
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500">
                          {t('no_orders')}
                        </td>
                      </tr>
                    ) : (
                      orders.map(order => (
                        <tr key={order.id} className="border-b border-slate-900/60 hover:bg-slate-900/30 transition-colors">
                          <td className="py-4 px-4 font-mono text-slate-400">
                            #{order.id.slice(0, 8)}...
                          </td>
                          <td className="py-4 px-4 text-slate-400">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-semibold text-white block">{order.products?.title || 'Unknown Product'}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">수량: {order.quantity}개</span>
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-white">
                            ฿{formatPrice(order.total_price)}
                          </td>
                          <td className="py-4 px-4">
                            <span className="block text-slate-300 font-medium">{order.buyer?.name || 'N/A'}</span>
                            <span className="block text-[10px] text-slate-500">{order.buyer?.phone || 'N/A'}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-full">
                              {order.payment_method === 'online' ? '송금 (Online)' : '현장결제 (COD)'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {order.payment_method === 'online' ? (
                              <button
                                onClick={() => !order.deposit_confirmed && handleConfirmDeposit(order.id)}
                                disabled={order.deposit_confirmed}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                  order.deposit_confirmed
                                    ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400 disabled:opacity-100'
                                    : 'bg-violet-950/50 hover:bg-violet-900 border-violet-500/30 text-violet-400 active:scale-95'
                                }`}
                              >
                                {order.deposit_confirmed ? '확인완료' : '입금 확인하기'}
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[10px]">수령 시 현장수금</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {order.status === 'confirmed' || order.status === 'completed' ? (
                              <div className="text-[10px] text-slate-300 font-mono">
                                <span className="block font-bold">{order.shipping_company}</span>
                                <span className="block text-slate-500">{order.tracking_number}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">미발송</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              order.status === 'pending'
                                ? 'bg-amber-950/30 border-amber-500/20 text-amber-400'
                                : order.status === 'confirmed'
                                ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-400'
                                : order.status === 'completed'
                                ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                                : 'bg-red-950/30 border-red-500/20 text-red-400'
                            }`}>
                              {order.status === 'pending'
                                ? '대기중'
                                : order.status === 'confirmed'
                                ? '배송중'
                                : order.status === 'completed'
                                ? '완료'
                                : '취소됨'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleOpenTrackingModal(order)}
                                  className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold text-[10px] transition-all"
                                >
                                  배송등록
                                </button>
                              )}
                              {order.status === 'confirmed' && (
                                <button
                                  onClick={() => handleCompleteOrder(order.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] transition-all"
                                >
                                  구매확정
                                </button>
                              )}
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="px-2 py-1 bg-slate-900 hover:bg-red-950 border border-slate-800 hover:border-red-900 text-slate-400 hover:text-red-400 rounded font-bold text-[10px] transition-all"
                                >
                                  주문취소
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
          </div>
        )}

      </main>

      {/* PRODUCT CREATION/EDITING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans animate-fadeIn">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-white">
                {editingProduct ? '✏️ 상품 정보 수정' : '➕ 사내 신규 상품 등록'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-all text-xs"
              >
                ✕
              </button>
            </header>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">상품명 *</label>
                  <input
                    type="text"
                    placeholder="iPhone 15 Pro 256GB Black"
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">단가 (฿) *</label>
                  <input
                    type="number"
                    placeholder="29000"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">카테고리 *</label>
                  <select
                    value={pCat}
                    onChange={(e) => setPCat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
                  >
                    <option value="iPhone">iPhone</option>
                    <option value="iPad">iPad</option>
                    <option value="Galaxy">Galaxy</option>
                    <option value="MacBook">MacBook</option>
                    <option value="Other">기타 (Other)</option>
                  </select>
                </div>

                {/* Condition */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">등급 (Condition) *</label>
                  <select
                    value={pCondition}
                    onChange={(e) => setPCondition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
                  >
                    <option value="new">새제품 (New)</option>
                    <option value="s">S급 중고</option>
                    <option value="a">A급 중고</option>
                    <option value="b">B급 중고</option>
                  </select>
                </div>

                {/* Stock */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">초기 재고수량 *</label>
                  <input
                    type="number"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold uppercase">상세 설명</label>
                <textarea
                  rows={3}
                  placeholder="상품 스펙, 내부 보관 상태 등을 기재하세요..."
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Image selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold uppercase">상품 사진 첨부</label>
                <div className="grid grid-cols-5 gap-3">
                  {existingImages.map((imgUrl, i) => (
                    <div key={i} className="aspect-square bg-slate-950 rounded-xl border border-slate-850 relative group overflow-hidden">
                      <img src={imgUrl} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-red-400 font-bold"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  {newImageFiles.map((file, i) => (
                    <div key={i} className="aspect-square bg-slate-950 rounded-xl border border-slate-850 relative group overflow-hidden">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImageFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-red-400 font-bold"
                      >
                        제거
                      </button>
                    </div>
                  ))}
                  {(existingImages.length + newImageFiles.length < 10) && (
                    <label className="aspect-square bg-slate-950 hover:bg-slate-900 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                      <span className="text-xl text-slate-500">+</span>
                      <span className="text-[10px] text-slate-500 mt-1">추가</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            const filesArray = Array.from(e.target.files);
                            setNewImageFiles(prev => [...prev, ...filesArray]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <footer className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={savingProduct}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-950/35 transition-all"
              >
                {savingProduct ? t('loading') : t('save_btn_short')}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* SHIPPING TRACKING MODAL */}
      {selectedOrderForTracking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-white">📦 배송 정보 입력</h3>
              <button
                onClick={() => setSelectedOrderForTracking(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-all text-xs"
              >
                ✕
              </button>
            </header>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold uppercase">배송사 선택</label>
                <select
                  value={trackingCompany}
                  onChange={(e) => setTrackingCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="Flash Express">Flash Express</option>
                  <option value="Kerry Express">Kerry Express</option>
                  <option value="Thailand Post">Thailand Post (EMS)</option>
                  <option value="J&T Express">J&T Express</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold uppercase">송장 번호 (Tracking Number) *</label>
                <input
                  type="text"
                  placeholder="송장 번호를 정확히 입력해주세요"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <footer className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setSelectedOrderForTracking(null)}
                className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveTracking}
                disabled={submittingTracking}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-violet-950/35 transition-all"
              >
                {submittingTracking ? t('loading') : '🚀 수락 및 배송시작'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* GLOBAL TOAST ALERT POPUP */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 font-sans animate-slideUp">
          <div className={`px-4 py-3 rounded-2xl border text-sm font-semibold flex items-center gap-2.5 shadow-2xl ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/30 text-emerald-400'
              : toast.type === 'error'
              ? 'bg-red-950 border-red-500/30 text-red-400'
              : 'bg-slate-900 border-slate-800 text-slate-200'
          }`}>
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            {toast.message}
          </div>
        </div>
      )}

    </div>
  );
}
