'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { formatPrice, formatDate, resizeAndCompressImage, filterBypassKeywords } from '@/lib/utils';
import { THAILAND_PROVINCES, Province, District } from '@/lib/addresses';
import MobileLayout from '@/components/MobileLayout';
import Navbar from '@/components/Navbar';

export default function SellerDashboard() {
  const router = useRouter();
  const { t, lang, changeLanguage } = useTranslation();

  // Force Thai language for the partner dashboard since they are all Thai.
  useEffect(() => {
    if (lang !== 'th' && changeLanguage) {
      changeLanguage('th');
    }
  }, [lang, changeLanguage]);

  // Authentication & Profile States
  const [user, setUser] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  // Active Tab: 'overview' | 'products' | 'chats' | 'orders' | 'profile'
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Stats States
  const [stats, setStats] = useState({
    productsCount: 0,
    pendingOrdersCount: 0,
    completedOrdersCount: 0,
    totalRevenue: 0
  });

  // Data Lists
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);

  // Contracts state
  const [myContracts, setMyContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Partner stock states
  const [partnerInventory, setPartnerInventory] = useState<any[]>([]);
  const [partnerSharedStock, setPartnerSharedStock] = useState<any[]>([]);
  const [loadingPartnerData, setLoadingPartnerData] = useState(false);

  // Search & Filter for Partner Inventory & Requests
  const [partnerInventorySearch, setPartnerInventorySearch] = useState('');
  const [partnerInventoryCategory, setPartnerInventoryCategory] = useState('All');
  const [partnerRequestSearch, setPartnerRequestSearch] = useState('');
  const [partnerRequestCategory, setPartnerRequestCategory] = useState('All');

  // Seller Sale States
  const [sellingItem, setSellingItem] = useState<any | null>(null);
  const [customSalePrice, setCustomSalePrice] = useState<string>('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Profile Form States
  const [profName, setProfName] = useState('');
  const [profStore, setProfStore] = useState('');
  const [profProvince, setProfProvince] = useState('');
  const [profDistrict, setProfDistrict] = useState('');
  const [profAddress, setProfAddress] = useState('');
  const [profCoords, setProfCoords] = useState('');
  const [profDesc, setProfDesc] = useState('');
  const [profLineUserId, setProfLineUserId] = useState('');
  const [profileLogoFile, setProfileLogoFile] = useState<File | null>(null);
  const [profileLogoPreview, setProfileLogoPreview] = useState<string | null>(null);
  const [profileDistricts, setProfileDistricts] = useState<District[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Add/Edit Product Modal States
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [pTitle, setPTitle] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCat, setPCat] = useState('iPhone');
  const [pCondition, setPCondition] = useState('Used S');
  const [pStock, setPStock] = useState('1');
  const [pDesc, setPDesc] = useState('');
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);

  // Ship/Tracking Modal States
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [shipOrderId, setShipOrderId] = useState('');
  const [shipCompany, setShipCompany] = useState('Flash Express');
  const [shipTrackingNum, setShipTrackingNum] = useState('');
  const [savingShipInfo, setSavingShipInfo] = useState(false);

  // Chat Conversation Panel States
  const [activeChatRoom, setActiveChatRoom] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [isChatUploading, setIsChatUploading] = useState(false);
  
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<any>(null);

  // Lightbox view
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getDisplayPrice = (item: any) => {
    const match = item.notes?.match(/\[도매가:\s*(\d+)\]/);
    return match ? parseInt(match[1]) : item.selling_price;
  };

  const getStatusText = useCallback((status: string) => {
    const map: Record<string, string> = {
      pending: `${t('status_pending')} (Pending)`,
      confirmed: `${t('status_confirmed')} (Shipping)`,
      completed: `${t('status_completed')} (Completed)`,
      cancelled: `${t('status_cancelled')} (Cancelled)`
    };
    return map[status] || status;
  }, [t]);

  const getBrandLogo = (modelName: string) => {
    const name = (modelName || '').toLowerCase();
    if (name.includes('iphone') || name.includes('aip')) return '🍎';
    if (name.includes('ipad')) return '📱';
    if (name.includes('samsung') || name.includes('galaxy') || name.startsWith('s2') || name.startsWith('a5') || name.startsWith('a7')) return '🌟';
    if (name.includes('xiaomi') || name.includes('redmi')) return '🔴';
    return '📱';
  };

  const getBrandColor = (modelName: string) => {
    const name = (modelName || '').toLowerCase();
    if (name.includes('iphone') || name.includes('aip') || name.includes('ipad')) {
      return 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'; // Apple Purple
    }
    if (name.includes('samsung') || name.includes('galaxy')) {
      return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // Samsung Amber
    }
    if (name.includes('xiaomi') || name.includes('redmi')) {
      return 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'; // Xiaomi Red
    }
    return 'linear-gradient(135deg, #64748b 0%, #475569 100%)'; // Other Gray
  };

  const renderBatteryIndicator = (battery: string | number) => {
    if (!battery) return null;
    const bStr = String(battery).trim();
    const cleanStr = bStr.replace(/%/g, '');
    const num = parseInt(cleanStr, 10);
    
    if (isNaN(num)) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--red)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
          🔧 {bStr}
        </span>
      );
    }
    
    let bgColor = 'rgba(16, 185, 129, 0.08)';
    let textColor = 'var(--green)';
    let borderColor = 'rgba(16, 185, 129, 0.15)';
    if (num < 80) {
      bgColor = 'rgba(217, 119, 6, 0.08)';
      textColor = 'var(--gold)';
      borderColor = 'rgba(217, 119, 6, 0.15)';
    }
    if (num < 70) {
      bgColor = 'rgba(220, 38, 38, 0.08)';
      textColor = 'var(--red)';
      borderColor = 'rgba(220, 38, 38, 0.15)';
    }
    
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: bgColor, color: textColor, padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, border: `1px solid ${borderColor}` }}>
        🔋 {num}%
      </span>
    );
  };

  const filteredPartnerInventory = useMemo(() => {
    return partnerInventory.filter(item => {
      const q = partnerInventorySearch.trim().toLowerCase();
      const matchSearch = !q || 
        (item.model_name && item.model_name.toLowerCase().includes(q)) ||
        (item.sticker && item.sticker.toLowerCase().includes(q)) ||
        (item.imei && item.imei.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (partnerInventoryCategory === 'All') return true;
      if (partnerInventoryCategory === 'iPhone') return item.model_name?.toLowerCase().includes('iphone') || item.model_name?.toLowerCase().includes('aip');
      if (partnerInventoryCategory === 'Samsung') return item.model_name?.toLowerCase().includes('samsung') || item.model_name?.toLowerCase().includes('galaxy');
      if (partnerInventoryCategory === 'iPad') return item.model_name?.toLowerCase().includes('ipad');
      if (partnerInventoryCategory === 'Other') {
        const name = item.model_name?.toLowerCase() || '';
        return !name.includes('iphone') && !name.includes('aip') && !name.includes('samsung') && !name.includes('galaxy') && !name.includes('ipad');
      }
      return true;
    });
  }, [partnerInventory, partnerInventorySearch, partnerInventoryCategory]);

  const filteredPartnerSharedStock = useMemo(() => {
    return partnerSharedStock.filter(item => {
      const q = partnerRequestSearch.trim().toLowerCase();
      const matchSearch = !q || 
        (item.model_name && item.model_name.toLowerCase().includes(q)) ||
        (item.sticker && item.sticker.toLowerCase().includes(q)) ||
        (item.imei && item.imei.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (partnerRequestCategory === 'All') return true;
      if (partnerRequestCategory === 'iPhone') return item.model_name?.toLowerCase().includes('iphone') || item.model_name?.toLowerCase().includes('aip');
      if (partnerRequestCategory === 'Samsung') return item.model_name?.toLowerCase().includes('samsung') || item.model_name?.toLowerCase().includes('galaxy');
      if (partnerRequestCategory === 'iPad') return item.model_name?.toLowerCase().includes('ipad');
      if (partnerRequestCategory === 'Other') {
        const name = item.model_name?.toLowerCase() || '';
        return !name.includes('iphone') && !name.includes('aip') && !name.includes('samsung') && !name.includes('galaxy') && !name.includes('ipad');
      }
      return true;
    });
  }, [partnerSharedStock, partnerRequestSearch, partnerRequestCategory]);

  // 1. Auth check guard
  useEffect(() => {
    const checkSeller = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth');
          return;
        }

        const { data: p, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !p || (p.role !== 'seller' && p.role !== 'admin')) {
          router.push('/');
          return;
        }

        setUser(user);
        setSellerProfile(p);
      } catch (e) {
        console.error(e);
        router.push('/');
      } finally {
        setLoadingSeller(false);
      }
    };
    checkSeller();
  }, [router]);

  // Load profile details in form when profile loaded
  useEffect(() => {
    if (sellerProfile) {
      setProfName(sellerProfile.name || '');
      setProfStore(sellerProfile.store_name || '');
      setProfProvince(sellerProfile.location_province || '');
      // Wait for cascading district loading
      setTimeout(() => {
        setProfDistrict(sellerProfile.location_district || '');
      }, 50);
      setProfAddress(sellerProfile.location_address || '');
      setProfCoords(sellerProfile.location_coords || '');
      setProfDesc(sellerProfile.description || '');
      setProfLineUserId(sellerProfile.line_user_id || '');
      setProfileLogoPreview(sellerProfile.profile_image || null);
    }
  }, [sellerProfile]);

  // Load cascading districts
  useEffect(() => {
    if (!profProvince) {
      setProfileDistricts([]);
      setProfDistrict('');
      return;
    }
    const provData = THAILAND_PROVINCES.find(p => p.name_en === profProvince);
    if (provData) {
      setProfileDistricts(provData.districts);
    } else {
      setProfileDistricts([]);
    }
    setProfDistrict('');
  }, [profProvince]);

  // 2. Fetch Dashboard Data
  const loadStats = useCallback(async () => {
    if (!sellerProfile) return;
    const uid = sellerProfile.id;
    try {
      const [prods, pending, done, revenue] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', uid).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', uid).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', uid).eq('status', 'completed'),
        supabase.from('orders').select('total_price').eq('seller_id', uid).eq('status', 'completed')
      ]);

      const totalRev = (revenue.data || []).reduce((sum, o) => sum + Number(o.total_price), 0);

      setStats({
        productsCount: prods.count || 0,
        pendingOrdersCount: pending.count || 0,
        completedOrdersCount: done.count || 0,
        totalRevenue: totalRev
      });
    } catch (e) {
      console.error(e);
    }
  }, [sellerProfile]);

  const loadOrders = useCallback(async () => {
    if (!sellerProfile) return;
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, products(title, condition, images), profiles!orders_buyer_id_fkey(name, phone)')
        .eq('seller_id', sellerProfile.id)
        .order('created_at', { ascending: false });

      if (data) {
        setAllOrders(data);
        setRecentOrders(data.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  }, [sellerProfile]);

  const loadProducts = useCallback(async () => {
    if (!sellerProfile) return;
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerProfile.id)
        .order('created_at', { ascending: false });
      setMyProducts(data || []);
    } catch (e) {
      console.error(e);
    }
  }, [sellerProfile]);

  const loadPartnerData = useCallback(async () => {
    if (!sellerProfile || !sellerProfile.store_name) return;
    setLoadingPartnerData(true);
    try {
      const { data: invData } = await supabase
        .from('sheets_inventory')
        .select('*')
        .eq('stock_location', sellerProfile.store_name)
        .eq('is_sold', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      setPartnerInventory(invData || []);

      const { data: sharedData } = await supabase
        .from('sheets_inventory')
        .select('*')
        .eq('is_sold', false)
        .is('deleted_at', null)
        .like('notes', '%[협력사공개]%')
        .order('created_at', { ascending: false });

      setPartnerSharedStock(sharedData || []);
    } catch (e) {
      console.error('Failed to load partner data:', e);
    } finally {
      setLoadingPartnerData(false);
    }
  }, [sellerProfile]);

  const handleRequestPartnerDevice = async (device: any) => {
    if (!sellerProfile || !sellerProfile.store_name) return;
    try {
      if (device.notes && device.notes.includes('[이관신청:')) {
        showToast(t('toast_already_requested') || '이미 신청된 기기입니다.', 'error');
        return;
      }

      const currentNotes = device.notes || '';
      const requestTag = `[이관신청: ${sellerProfile.store_name}, ${sellerProfile.id}]`;
      const newNotes = currentNotes ? `${currentNotes} ${requestTag}` : requestTag;

      const { error } = await supabase
        .from('sheets_inventory')
        .update({ notes: newNotes })
        .eq('id', device.id);

      if (error) throw error;

      showToast(t('toast_transfer_request_success') || '이관 신청이 완료되었습니다.', 'success');
      await loadPartnerData();
    } catch (e: any) {
      showToast((t('toast_transfer_request_failed') || '신청 실패: ') + e.message, 'error');
    }
  };

  const handleOpenSellModal = (item: any) => {
    setSellingItem(item);
    setCustomSalePrice(String(getDisplayPrice(item)));
  };

  const handleConfirmSell = async () => {
    if (!sellingItem || !sellerProfile) return;
    const priceNum = Number(customSalePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast(t('toast_invalid_sale_price') || '올바른 판매 가격을 입력해 주세요.', 'error');
      return;
    }

    setIsProcessingSale(true);
    try {
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = today.getMonth() + 1;
      const dd = today.getDate();
      const formattedSaleDate = `${yy}. ${mm}. ${dd}.`;

      let newNotes = sellingItem.notes || '';
      const saleTag = `[협력사판매: ${sellerProfile.store_name}]`;
      newNotes = newNotes ? `${newNotes} ${saleTag}` : saleTag;

      const { error } = await supabase
        .from('sheets_inventory')
        .update({
          is_sold: true,
          is_approved: false, // Wait for headquarter approval
          sale_date: formattedSaleDate,
          seller_name: sellerProfile.store_name,
          selling_price: priceNum,
          notes: newNotes,
          sale_type: 'transfer' // Default sale type
        })
        .eq('id', sellingItem.id);

      if (error) throw error;

      showToast(t('toast_partner_sale_success') || '판매 처리가 완료되었습니다. 본사 승인 대기 중입니다.', 'success');
      setSellingItem(null);
      await loadPartnerData();
    } catch (err: any) {
      showToast((t('toast_partner_sale_failed') || '판매 처리 실패: ') + err.message, 'error');
    } finally {
      setIsProcessingSale(false);
    }
  };

  const loadChatRooms = useCallback(async () => {
    if (!sellerProfile) return;
    try {
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select('*, products(title), buyer:profiles!chat_rooms_buyer_id_fkey(name, profile_image), chat_messages(id, is_read, sender_id)')
        .eq('seller_id', sellerProfile.id)
        .order('updated_at', { ascending: false });

      if (!error && rooms) {
        setChatRooms(rooms);

        // Check if there are any unread messages from buyers
        const unreadExist = rooms.some(r => 
          r.chat_messages && r.chat_messages.some((m: any) => !m.is_read && m.sender_id !== sellerProfile.id)
        );
        setHasUnreadChats(unreadExist);
      }
    } catch (e) {
      console.error(e);
    }
  }, [sellerProfile]);

  const loadMyContracts = useCallback(async () => {
    if (!sellerProfile) return;
    setLoadingContracts(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('seller_id', sellerProfile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyContracts(data);
      }
    } catch (e) {
      console.error('Failed to load seller contracts:', e);
    } finally {
      setLoadingContracts(false);
    }
  }, [sellerProfile]);

  const handleDeleteSellerContract = async (id: string) => {
    if (!confirm(t('confirm_delete_contract'))) return;
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    if (error) {
      showToast(t('error_occurred') + error.message, 'error');
      return;
    }
    showToast('🗑️ ' + t('btn_delete'), 'success');
    loadMyContracts();
  };

  const refreshAllData = useCallback(async () => {
    if (!sellerProfile) return;
    const promises: Promise<any>[] = [
      loadStats(),
      loadOrders(),
      loadChatRooms()
    ];
    if (sellerProfile.store_type === 'direct') {
      promises.push(loadProducts());
      promises.push(loadMyContracts());
    } else {
      promises.push(loadPartnerData());
    }
    await Promise.all(promises);
  }, [sellerProfile, loadStats, loadOrders, loadProducts, loadChatRooms, loadMyContracts, loadPartnerData]);

  useEffect(() => {
    if (sellerProfile) {
      refreshAllData();
    }
  }, [sellerProfile, refreshAllData]);

  // Load contracts when tab becomes active
  useEffect(() => {
    if (sellerProfile && activeTab === 'contracts') {
      loadMyContracts();
    }
  }, [activeTab, sellerProfile, loadMyContracts]);

  // Load partner data when tab becomes active
  useEffect(() => {
    if (sellerProfile && (activeTab === 'partner_inventory' || activeTab === 'partner_request')) {
      loadPartnerData();
    }
  }, [activeTab, sellerProfile, loadPartnerData]);

  // Periodically refresh chat rooms badge
  useEffect(() => {
    if (!sellerProfile) return;
    const interval = setInterval(() => {
      loadChatRooms();
    }, 15000);
    return () => clearInterval(interval);
  }, [sellerProfile, loadChatRooms]);

  // 3. Product CRUD Actions
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setPTitle('');
    setPPrice('');
    setPCat('iPhone');
    setPCondition('Used S');
    setPStock('1');
    setPDesc('');
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setExistingImages([]);
    setRemovedImages([]);
    setIsProdModalOpen(true);
  };

  const handleOpenEditProduct = (product: any) => {
    setEditingProduct(product);
    setPTitle(product.title || '');
    setPPrice(String(product.price) || '');
    setPCat(product.category || 'iPhone');
    setPCondition(product.condition || 'Used S');
    setPStock(String(product.stock) || '1');
    setPDesc(product.description || '');
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setExistingImages(product.images || []);
    setRemovedImages([]);
    setIsProdModalOpen(true);
  };

  const handleRemoveExistingImg = (index: number) => {
    const url = existingImages[index];
    setRemovedImages(prev => [...prev, url]);
    setExistingImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleNewImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const existingCount = existingImages.length;
    const maxAllowed = 10 - existingCount;
    if (files.length > maxAllowed) {
      showToast(t('toast_max_images_detail').replace('{max}', String(maxAllowed)), 'error');
    }

    const selectedFiles = Array.from(files).slice(0, maxAllowed);
    setNewImageFiles(prev => [...prev, ...selectedFiles]);

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewImagePreviews(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveNewImgPreview = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, idx) => idx !== index));
    setNewImagePreviews(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProduct = async () => {
    if (!pTitle.trim() || !pPrice) {
      showToast(t('toast_title_price_required'), 'error');
      return;
    }
    if (!sellerProfile) return;

    setSavingProduct(true);
    try {
      const existingCount = existingImages.length;
      if (existingCount + newImageFiles.length > 10) {
        showToast(t('toast_max_images'), 'error');
        setSavingProduct(false);
        return;
      }

      // Upload new images to products bucket under path sellerId/filename
      const imageUrls = [...existingImages];
      for (const file of newImageFiles) {
        const compressed = await resizeAndCompressImage(file);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const path = `${sellerProfile.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        
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
        images: imageUrls
      };

      let error;
      if (editingProduct) {
        ({ error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id));

        // Delete removed images from storage
        if (!error && removedImages.length > 0) {
          const pathsToDelete = removedImages.map(url => {
            const parts = url.split('/products/');
            return parts.length > 1 ? parts[1] : null;
          }).filter(Boolean) as string[];

          if (pathsToDelete.length > 0) {
            await supabase.storage.from('products').remove(pathsToDelete);
          }
        }
      } else {
        ({ error } = await supabase
          .from('products')
          .insert({
            ...payload,
            seller_id: sellerProfile.id
          }));
      }

      if (error) throw error;

      showToast(t('toast_product_saved'), 'success');
      setIsProdModalOpen(false);
      refreshAllData();
    } catch (e: any) {
      showToast(t('error_occurred') + e.message, 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'hidden' : 'active';
    const { error } = await supabase
      .from('products')
      .update({ status: nextStatus })
      .eq('id', productId);

    if (error) {
      showToast('❌ Status update failed.', 'error');
      return;
    }
    showToast(nextStatus === 'active' ? t('toast_product_published') : t('toast_product_hidden'), 'success');
    loadProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t('confirm_delete') || 'Delete this product?')) return;
    const product = myProducts.find((p: any) => p.id === productId);
    const imagesToDelete = product?.images || [];

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      showToast('❌ Delete failed.', 'error');
      return;
    }

    if (imagesToDelete.length > 0) {
      const pathsToDelete = imagesToDelete.map((url: string) => {
        const parts = url.split('/products/');
        return parts.length > 1 ? parts[1] : null;
      }).filter(Boolean) as string[];

      if (pathsToDelete.length > 0) {
        await supabase.storage.from('products').remove(pathsToDelete);
      }
    }

    showToast(t('toast_product_deleted'), 'success');
    refreshAllData();
  };

  const copyProductLink = (productId: string) => {
    const link = window.location.origin + '/?p=' + productId;
    navigator.clipboard.writeText(link).then(() => {
      showToast(t('toast_link_copied') || '🔗 링크가 복사되었습니다!', 'success');
    }).catch(() => {
      showToast('Copy failed', 'error');
    });
  };

  // 4. Order Actions
  const handleOpenShipModal = (orderId: string) => {
    setShipOrderId(orderId);
    setShipCompany('Flash Express');
    setShipTrackingNum('');
    setIsShipModalOpen(true);
  };

  const handleSaveShippingInfo = async () => {
    if (!shipTrackingNum.trim()) {
      showToast(t('toast_enter_tracking'), 'error');
      return;
    }

    setSavingShipInfo(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          tracking_company: shipCompany,
          tracking_number: shipTrackingNum.trim()
        })
        .eq('id', shipOrderId);

      if (error) throw error;

      showToast(t('toast_order_shipped') || '🚀 배송이 시작되었습니다!', 'success');
      setIsShipModalOpen(false);
      refreshAllData();
    } catch (e: any) {
      showToast(t('error_occurred') + e.message, 'error');
    } finally {
      setSavingShipInfo(false);
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
      showToast(t('toast_order_returned'), 'success');
      refreshAllData();
    } catch (e: any) {
      showToast(t('error_occurred') + e.message, 'error');
    }
  };

  // 5. Chat System
  const loadChatMessages = async (roomId: string) => {
    setLoadingChatMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
      
      // Auto-scroll after delay
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChatMessages(false);
    }
  };

  const markChatMessagesAsRead = async (roomId: string) => {
    if (!sellerProfile) return;
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .neq('sender_id', sellerProfile.id)
        .eq('is_read', false);
      loadChatRooms();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleOpenSellerChat = async (room: any) => {
    const buyerName = room.buyer?.name || t('role_buyer');
    setActiveChatRoom({
      id: room.id,
      buyerName,
      productTitle: room.products?.title || t('product_inquiry'),
      buyer_id: room.buyer_id
    });

    await markChatMessagesAsRead(room.id);
    await loadChatMessages(room.id);

    // Subscribe to realtime changes
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
    }

    const channel = supabase
      .channel(`s_room_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`
        },
        async (payload) => {
          if (sellerProfile && payload.new.sender_id !== sellerProfile.id) {
            markChatMessagesAsRead(room.id);
          }
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    chatChannelRef.current = channel;
  };

  const handleCloseActiveChatPanel = () => {
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
    setActiveChatRoom(null);
    setChatMessages([]);
    loadChatRooms();
  };

  const handleSendChatMessage = async () => {
    if (!chatInputText.trim() || !activeChatRoom || !sellerProfile) return;

    const blockLabels = {
      phone: t('phone_blocked'),
      line: t('line_blocked'),
      account: t('account_blocked')
    };

    const rawText = chatInputText.trim();
    const filteredText = filterBypassKeywords(rawText, blockLabels);

    if (rawText !== filteredText) {
      showToast(t('toast_bypass_filtered'), 'error');
    }

    setChatInputText('');

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeChatRoom.id,
          sender_id: sellerProfile.id,
          message: filteredText,
          message_type: 'text'
        });

      if (error) throw error;
    } catch (e: any) {
      showToast(t('toast_send_failed') + e.message, 'error');
    }
  };

  const handleUploadChatMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatRoom || !sellerProfile) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showToast(t('toast_only_media'), 'error');
      return;
    }

    const maxSize = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(t('toast_file_too_large') + ` (Max ${isVideo ? '15MB' : '5MB'})`, 'error');
      return;
    }

    setIsChatUploading(true);
    try {
      let uploadFile = file;
      if (isImage) {
        uploadFile = await resizeAndCompressImage(file, 1200, 0.8);
      }

      const fileExt = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
      // Consistent bucket prefix with ChatModal 'products' bucket, chat_media/ prefix path
      const path = `chat_media/${activeChatRoom.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: upErr } = await supabase.storage
        .from('products')
        .upload(path, uploadFile);

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(path);

      const mediaUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from('chat_messages')
        .insert({
          room_id: activeChatRoom.id,
          sender_id: sellerProfile.id,
          message: isImage ? '📷 Image attachment' : '🎥 Video attachment',
          media_url: mediaUrl,
          message_type: isImage ? 'image' : 'video'
        });

      if (dbErr) throw dbErr;
    } catch (err: any) {
      console.error(err);
      showToast(t('toast_upload_failed') + err.message, 'error');
    } finally {
      setIsChatUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Cleanup subscription
  useEffect(() => {
    return () => {
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
      }
    };
  }, []);

  // 6. Profile settings save
  const handlePreviewAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileLogoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!profName.trim()) { showToast(t('toast_name_required'), 'error'); return; }
    if (!profStore.trim()) { showToast(t('toast_store_required'), 'error'); return; }
    if (!profProvince) { showToast(t('toast_province_required'), 'error'); return; }
    if (!profDistrict) { showToast(t('toast_district_required'), 'error'); return; }
    if (!sellerProfile) return;

    setSavingProfile(true);
    try {
      let logoUrl = sellerProfile.profile_image;
      if (profileLogoFile) {
        const compressed = await resizeAndCompressImage(profileLogoFile, 400, 0.8);
        const path = `avatars/${sellerProfile.id}_logo.jpg`;
        
        await supabase.storage
          .from('avatars')
          .upload(path, compressed, { upsert: true });

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        logoUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: profName.trim(),
          store_name: profStore.trim(),
          location_province: profProvince,
          location_district: profDistrict,
          location_address: profAddress.trim(),
          location_coords: profCoords.trim() || null,
          description: profDesc.trim(),
          profile_image: logoUrl,
          line_user_id: profLineUserId.trim()
        })
        .eq('id', sellerProfile.id);

      if (error) throw error;

      showToast(t('toast_profile_saved'), 'success');
      
      // Update local profile state
      setSellerProfile((prev: any) => ({
        ...prev,
        name: profName.trim(),
        store_name: profStore.trim(),
        location_province: profProvince,
        location_district: profDistrict,
        location_address: profAddress.trim(),
        location_coords: profCoords.trim() || null,
        description: profDesc.trim(),
        profile_image: logoUrl,
        line_user_id: profLineUserId.trim()
      }));

    } catch (e: any) {
      showToast(t('error_occurred') + e.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loadingSeller) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#eaedf2' }}>
        <div style={{ color: 'var(--purple-l)', fontWeight: 700 }}>Checking seller credentials...</div>
      </div>
    );
  }

  // Not approved seller screen
  if (sellerProfile && sellerProfile.role === 'seller' && !sellerProfile.is_approved) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--bg)', minHeight: '100vh', color: 'var(--t1)' }}>
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>⏳</div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px' }}>{t('seller_pending_approval')}</h2>
        <p style={{ color: 'var(--t2)', marginTop: '10px', fontSize: '14px' }}>{t('seller_pending_approval_desc')}</p>
        <button 
          onClick={() => router.push('/')}
          style={{ display: 'inline-block', marginTop: '24px', padding: '12px 28px', background: 'var(--gp)', color: '#fff', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          {t('go_home_btn')}
        </button>
      </div>
    );
  }

  return (
    <MobileLayout paddingBottom="76px" paddingTop="68px">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div className="nav-logo-icon">💎</div>
          <span className="nav-logo-text" style={{ fontSize: '16px', letterSpacing: '0.5px' }}>
            {t('seller_portal') || 'SELLER PORTAL'}
          </span>
        </div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(sellerProfile?.role === 'admin' || sellerProfile?.role === 'manager' || sellerProfile?.role === 'staff') && (
            <button 
              className="btn-nav" 
              style={{ 
                padding: '6px 10px', 
                fontSize: '11px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '8px',
                fontWeight: 'bold'
              }} 
              onClick={() => router.push('/staff/dashboard')}
            >
              🖥️ {t('staff_menu_inventory') || '사내 재고 관리'}
            </button>
          )}
          <button 
            className="btn-nav btn-nav-outline" 
            style={{ padding: '6px 10px', fontSize: '11px' }} 
            onClick={handleLogout}
          >
            🚪 {t('logout_btn') || '로그아웃'}
          </button>
        </div>
      </nav>

      {/* ==================== VIEW 1: OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="view-section active animate-slide-up">
          <div className="main-hd">
            <h1>📊 {t('overview') || '개요 Overview'}</h1>
            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>
              {new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="main-body" style={{ textAlign: 'left' }}>
            {/* Store details banner */}
            <div className="card" style={{ marginBottom: '20px', background: 'rgba(139, 92, 246, 0.08)', borderColor: 'var(--border2)', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--purple-l)', fontWeight: 700 }}>
                  🏪 {t('store_payout_info') || '매장 정산 구조 정보'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 900 }}>
                  {sellerProfile?.store_name || sellerProfile?.name}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '8px', fontSize: '11px', color: 'var(--t2)' }}>
                <div>{t('commission_rate')}: <span style={{ fontWeight: 800, color: 'var(--gold)' }}>{sellerProfile?.commission_rate || '10.0'}%</span></div>
                <div>{t('payout_method')}: <span style={{ fontWeight: 800, color: 'var(--cyan)' }}>{sellerProfile?.payout_method === 'cod_commission' ? t('payout_method_cod') : t('payout_method_parent')}</span></div>
                <div>{t('location_label') || '지역:'}: <span style={{ fontWeight: 800, color: 'var(--t1)' }}>{sellerProfile?.location_province || 'Bangkok'}</span></div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="stat-grid">
              <div className="stat-card">
                <div className="sc-icon" style={{ background: 'rgba(139,92,246,.15)' }}>📱</div>
                <div className="sc-val">{stats.productsCount}</div>
                <div className="sc-lbl">{t('sc_products')}</div>
              </div>
              <div className="stat-card">
                <div className="sc-icon" style={{ background: 'rgba(251,191,36,.15)' }}>📦</div>
                <div className="sc-val">{stats.pendingOrdersCount}</div>
                <div className="sc-lbl">{t('sc_pending_orders')}</div>
              </div>
              <div className="stat-card">
                <div className="sc-icon" style={{ background: 'rgba(16,185,129,.15)' }}>✅</div>
                <div className="sc-val">{stats.completedOrdersCount}</div>
                <div className="sc-lbl">{t('sc_completed_orders')}</div>
              </div>
              <div className="stat-card">
                <div className="sc-icon" style={{ background: 'rgba(34,211,238,.15)' }}>💰</div>
                <div className="sc-val">{stats.totalRevenue.toLocaleString()}</div>
                <div className="sc-lbl">{t('sc_revenue')}</div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="card" style={{ padding: '12px' }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
                {t('recent_orders_title') || '최근 주문'}
              </h3>
              <div>
                {recentOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)', fontSize: '12px' }}>
                    {t('no_orders')}
                  </div>
                ) : (
                  recentOrders.map((o) => {
                    const buyerName = o.profiles?.name || '—';
                    const buyerPhone = o.profiles?.phone ? '+66 ' + o.profiles.phone : '—';
                    const deliveryAddr = o.delivery_address || t('no_address_info');
                    const isCOD = o.payment_method === 'cod';
                    const commAmount = o.commission_amount ? `฿${Number(o.commission_amount).toLocaleString()}` : '฿0';

                    return (
                      <div key={o.id} className="mobile-order-card" style={{ background: 'rgba(0,0,0,0.015)' }}>
                        <div className="mobile-order-header">
                          <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 700 }}>#{o.id.slice(0, 8)}</span>
                          <span className={`badge ${statusBadge(o.status)}`}>{getStatusText(o.status)}</span>
                        </div>
                        <div className="mobile-order-body">
                          <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: '13px', marginBottom: '6px' }}>
                            {o.products?.title || '—'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                            <span>{t('order_qty')}: {o.quantity}{t('order_qty_suffix')}</span>
                            <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '14px' }}>{formatPrice(o.total_price)}</span>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '6px', padding: '8px', fontSize: '11px', marginBottom: '8px' }}>
                            <div>👤 <b>{buyerName}</b> ({buyerPhone})</div>
                            <div style={{ marginTop: '4px', color: 'var(--t3)', lineHeight: 1.3 }}>📍 {deliveryAddr}</div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                            <div>{t('payment_label')}: <span className={`badge ${isCOD ? 'bg-red' : 'bg-green'}`}>{isCOD ? 'COD' : t('pay_online')}</span></div>
                            <div style={{ opacity: 0.8 }}>{t('commission_label')}: <b>{commAmount}</b></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 2: PRODUCTS ==================== */}
      {activeTab === 'products' && sellerProfile?.store_type === 'direct' && (
        <div className="view-section active animate-slide-up">
          <div className="main-hd">
            <h1>📱 {t('my_products_management') || '내 상품 관리'}</h1>
            <button 
              className="btn-nav" 
              onClick={handleOpenAddProduct}
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              ➕ {t('add_product_btn') || '상품 등록'}
            </button>
          </div>

          <div className="main-body" style={{ textAlign: 'left' }}>
            <div className="products-grid">
              {myProducts.length === 0 ? (
                <div className="empty" style={{ gridColumn: '1/-1' }}>
                  <div className="empty-ico">📱</div>
                  <div className="empty-ttl">{t('empty_products')}</div>
                  <div className="empty-txt">{t('empty_products_desc')}</div>
                </div>
              ) : (
                myProducts.map((p) => {
                  const conditionText = p.condition || 'Used S';
                  return (
                    <div key={p.id} className="product-card">
                      <div className="p-img">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.title} loading="lazy" />
                        ) : (
                          getCategoryIcon(p.category)
                        )}
                        <div className="p-badge">{p.category || 'Mobile'}</div>
                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                          <span className={`badge ${p.status === 'active' ? 'bg-green' : 'bg-gray'}`}>
                            {p.status === 'active' ? t('product_status_active') : t('product_status_hidden')}
                          </span>
                        </div>
                      </div>
                      <div className="p-info">
                        <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="badge bg-purple" style={{ fontSize: '9px' }}>{t('grade_label') || '등급'}: {conditionText}</span>
                          <span style={{ fontSize: '11px', color: 'var(--t2)' }}>{t('search_stock') || '재고'}: <b>{p.stock}</b></span>
                        </div>
                        <div className="p-title" style={{ marginTop: '4px', fontSize: '12px', height: '36px', overflow: 'hidden' }}>{p.title}</div>
                        <div className="p-price" style={{ fontSize: '16px', marginBottom: '8px' }}>
                          {formatPrice(p.price)}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          <button className="btn-sm btn-purple" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => handleOpenEditProduct(p)}>{t('edit_btn')}</button>
                          <button 
                            className={`btn-sm ${p.status === 'active' ? 'btn-red' : 'btn-green'}`} 
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                            onClick={() => handleToggleProductStatus(p.id, p.status)}
                          >
                            {p.status === 'active' ? t('hide_btn') : t('show_btn')}
                          </button>
                          <button className="btn-sm btn-purple" style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--cyan)', border: 'none', color: '#fff' }} onClick={() => copyProductLink(p.id)}>{t('btn_copy_link')}</button>
                          <button className="btn-sm btn-red" style={{ padding: '4px 6px', fontSize: '10px' }} onClick={() => handleDeleteProduct(p.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 2-B: PARTNER INVENTORY (Franchise/Partner only) ==================== */}
      {activeTab === 'partner_inventory' && sellerProfile?.store_type !== 'direct' && (() => {
        const totalCount = partnerInventory.length;
        const totalValue = partnerInventory.reduce((sum, item) => sum + getDisplayPrice(item), 0);

        return (
          <div className="view-section active animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Gradient Stats Banner */}
            <div 
              style={{ 
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                borderRadius: '16px', 
                padding: '20px', 
                color: '#ffffff',
                boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative background glow orb */}
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }}></div>
              
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px' }}>🏪</span>
                    <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.3px' }}>
                      {sellerProfile?.store_name || sellerProfile?.name} {t('store_stock_title')}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '20px', fontWeight: 700 }}>
                    {t('partner_partner')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', opacity: 0.75, textTransform: 'uppercase', fontWeight: 600 }}>{t('partner_active_stock')}</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif", marginTop: '2px' }}>
                      {totalCount}<span style={{ fontSize: '13px', fontWeight: 500, marginLeft: '2px' }}>{t('staff_qty_unit')}</span>
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '14px' }}>
                    <div style={{ fontSize: '10px', opacity: 0.75, textTransform: 'uppercase', fontWeight: 600 }}>{t('partner_total_value')}</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif", marginTop: '2px', color: '#fbbf24' }}>
                      ฿{totalValue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters Card */}
            <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              {/* Search input bar */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: 'var(--t3)', fontSize: '14px' }}>🔍</span>
                <input
                  type="text"
                  placeholder={t('search_placeholder_device')}
                  value={partnerInventorySearch}
                  onChange={(e) => setPartnerInventorySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 34px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    fontSize: '12.5px',
                    outline: 'none',
                    background: '#f8fafc',
                    color: 'var(--t1)',
                    transition: 'all 0.2s'
                  }}
                />
                {partnerInventorySearch && (
                  <button
                    onClick={() => setPartnerInventorySearch('')}
                    style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--t3)', fontSize: '13px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Horizontal Category Pills */}
              <div 
                style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  overflowX: 'auto', 
                  paddingBottom: '2px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                className="hide-scrollbar"
              >
                {['All', 'iPhone', 'Samsung', 'iPad', 'Other'].map((cat) => {
                  const isActive = partnerInventoryCategory === cat;
                  const labelMap: Record<string, string> = {
                    All: t('all_categories') + ' (All)',
                    iPhone: '🍎 iPhone',
                    Samsung: '🌟 Samsung',
                    iPad: '📱 iPad',
                    Other: '📦 ' + t('category_other')
                  };
                  return (
                    <button
                      key={cat}
                      onClick={() => setPartnerInventoryCategory(cat)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: isActive ? 'var(--gp)' : '#f1f5f9',
                        color: isActive ? '#ffffff' : 'var(--t2)',
                        boxShadow: isActive ? '0 4px 10px rgba(124, 58, 237, 0.2)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      {labelMap[cat] || cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inventory List */}
            <div className="main-body" style={{ textAlign: 'left', margin: 0 }}>
              {loadingPartnerData ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>
                  <span className="spinner" style={{ marginRight: '8px' }}></span> {t('loading_data')}
                </div>
              ) : filteredPartnerInventory.length === 0 ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--t2)', border: '1px dashed var(--border)', borderRadius: '16px', background: 'var(--card)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px', textAlign: 'center' }}>🏪</div>
                  <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {partnerInventorySearch || partnerInventoryCategory !== 'All' ? t('partner_search_empty_results') : t('partner_search_empty_inventory')}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--t3)', marginTop: '6px' }}>
                    {partnerInventorySearch || partnerInventoryCategory !== 'All' ? t('partner_search_empty_results_desc') : t('partner_search_empty_inventory_desc')}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredPartnerInventory.map((item) => {
                    const price = getDisplayPrice(item);
                    const cleanNotesText = (item.notes || '').replace(/\[협력사공개\]/g, '').trim();
                    const brandColor = getBrandColor(item.model_name);
                    const brandLogo = getBrandLogo(item.model_name);

                    return (
                      <div 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '14px 16px', 
                          background: '#ffffff', 
                          border: '1px solid var(--border)', 
                          borderLeft: `4px solid`,
                          borderImage: `${brandColor} 1`, // Apply gradient left border
                          borderRadius: '12px',
                          boxShadow: '0 3px 8px rgba(15,23,42,0.02)',
                          gap: '12px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Left side: Info stack */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px' }}>{brandLogo}</span>
                            <div style={{ fontWeight: 850, fontSize: '13.5px', color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.model_name}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {item.sticker && (
                              <span style={{ fontSize: '10.5px', color: '#475569', background: '#f1f5f9', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                {t('label_sticker_no')}: {item.sticker}
                              </span>
                            )}
                            {item.imei && (
                              <span style={{ fontSize: '10.5px', color: '#64748b', background: '#f8fafc', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                IMEI: {item.imei}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px', fontSize: '11px', color: 'var(--t2)' }}>
                            <span style={{ background: '#ecfdf5', color: '#065f46', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                              🎨 {item.color || t('label_unassigned_color')}
                            </span>
                            {renderBatteryIndicator(item.battery_pct)}
                          </div>

                          {cleanNotesText && (
                            <div style={{ fontSize: '10.5px', color: 'var(--purple-l)', background: 'rgba(139,92,246,0.03)', padding: '4px 8px', borderRadius: '6px', marginTop: '4px', border: '1px dashed rgba(139,92,246,0.12)', lineHeight: 1.3 }}>
                              📝 {cleanNotesText}
                            </div>
                          )}
                        </div>

                        {/* Right side: Price & Action button */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                          <div style={{ fontSize: '16.5px', fontWeight: 900, color: 'var(--gold)', fontFamily: "'Outfit', sans-serif" }}>
                            ฿{price ? price.toLocaleString() : 0}
                          </div>
                          <button
                            className="btn-sm btn-green"
                            style={{ 
                              padding: '7px 12px', 
                              fontSize: '11px', 
                              borderRadius: '8px', 
                              fontWeight: 800, 
                              cursor: 'pointer', 
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
                            }}
                            onClick={() => handleOpenSellModal(item)}
                          >
                            💸 {t('btn_sale_complete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ==================== VIEW 2-C: PARTNER REQUESTS (Franchise/Partner only) ==================== */}
      {activeTab === 'partner_request' && sellerProfile?.store_type !== 'direct' && (
        <div className="view-section active animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="main-hd">
            <div>
              <h1>📥 {t('btn_request_transfer')}</h1>
              <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>
                {t('partner_request_empty_shared_desc')}
              </p>
            </div>
          </div>

          {/* Search and Filters Card */}
          <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            {/* Search input bar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', color: 'var(--t3)', fontSize: '14px' }}>🔍</span>
              <input
                type="text"
                placeholder={t('search_placeholder_device')}
                value={partnerRequestSearch}
                onChange={(e) => setPartnerRequestSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 34px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#f8fafc',
                  color: 'var(--t1)',
                  transition: 'all 0.2s'
                }}
              />
              {partnerRequestSearch && (
                <button
                  onClick={() => setPartnerRequestSearch('')}
                  style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--t3)', fontSize: '13px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Horizontal Category Pills */}
            <div 
              style={{ 
                display: 'flex', 
                gap: '6px', 
                overflowX: 'auto', 
                paddingBottom: '2px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
              className="hide-scrollbar"
            >
              {['All', 'iPhone', 'Samsung', 'iPad', 'Other'].map((cat) => {
                const isActive = partnerRequestCategory === cat;
                const labelMap: Record<string, string> = {
                  All: t('all_categories') + ' (All)',
                  iPhone: '🍎 iPhone',
                  Samsung: '🌟 Samsung',
                  iPad: '📱 iPad',
                  Other: '📦 ' + t('category_other')
                };
                return (
                  <button
                    key={cat}
                    onClick={() => setPartnerRequestCategory(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: isActive ? 'var(--gp)' : '#f1f5f9',
                      color: isActive ? '#ffffff' : 'var(--t2)',
                      boxShadow: isActive ? '0 4px 10px rgba(124, 58, 237, 0.2)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {labelMap[cat] || cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="main-body" style={{ textAlign: 'left', margin: 0 }}>
            {loadingPartnerData ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t3)' }}>
                <span className="spinner" style={{ marginRight: '8px' }}></span> {t('loading_data')}
              </div>
            ) : filteredPartnerSharedStock.length === 0 ? (
              <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--t2)', border: '1px dashed var(--border)', borderRadius: '16px', background: 'var(--card)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', textAlign: 'center' }}>📥</div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  {partnerRequestSearch || partnerRequestCategory !== 'All' ? t('partner_search_empty_results') : t('partner_request_empty_shared')}
                </div>
                <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--t3)', marginTop: '6px' }}>
                  {partnerRequestSearch || partnerRequestCategory !== 'All' ? t('partner_search_empty_results_desc') : t('partner_request_empty_shared_desc')}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredPartnerSharedStock.map((item) => {
                  const isRequestedByMe = item.notes && item.notes.includes(`[이관신청: ${sellerProfile.store_name}`);
                  const isRequestedByOther = item.notes && item.notes.includes('[이관신청:') && !isRequestedByMe;
                  const price = getDisplayPrice(item);
                  const brandColor = getBrandColor(item.model_name);
                  const brandLogo = getBrandLogo(item.model_name);

                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '14px 16px', 
                        background: '#ffffff', 
                        border: '1px solid var(--border)', 
                        borderLeft: `4px solid`,
                        borderImage: `${brandColor} 1`, // Apply gradient left border
                        borderRadius: '12px',
                        boxShadow: '0 3px 8px rgba(15,23,42,0.02)',
                        gap: '12px',
                        opacity: isRequestedByOther ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {/* Left side: Info stack */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px' }}>{brandLogo}</span>
                          <div style={{ fontWeight: 850, fontSize: '13.5px', color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.model_name}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {item.sticker && (
                            <span style={{ fontSize: '10.5px', color: '#475569', background: '#f1f5f9', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              {t('label_sticker_no')}: {item.sticker}
                            </span>
                          )}
                          {item.imei && (
                            <span style={{ fontSize: '10.5px', color: '#64748b', background: '#f8fafc', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              IMEI: {item.imei}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px', fontSize: '11px', color: 'var(--t2)' }}>
                          <span style={{ background: '#ecfdf5', color: '#065f46', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                            🎨 {item.color || t('label_unassigned_color')}
                          </span>
                          {renderBatteryIndicator(item.battery_pct)}
                        </div>
                      </div>

                      {/* Right side: Price & Request status buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <div style={{ fontSize: '16.5px', fontWeight: 900, color: 'var(--gold)', fontFamily: "'Outfit', sans-serif" }}>
                          ฿{price ? price.toLocaleString() : 0}
                        </div>
                        {isRequestedByMe ? (
                          <button 
                            className="btn-sm" 
                            disabled 
                            style={{ padding: '7px 12px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '8px', cursor: 'default', fontWeight: 800, whiteSpace: 'nowrap' }}
                          >
                            ⏳ {t('btn_request_complete')}
                          </button>
                        ) : isRequestedByOther ? (
                          <button 
                            className="btn-sm" 
                            disabled 
                            style={{ padding: '7px 12px', fontSize: '11px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'not-allowed', fontWeight: 800, whiteSpace: 'nowrap' }}
                          >
                            🔒 {t('btn_request_other')}
                          </button>
                        ) : (
                          <button 
                            className="btn-sm btn-purple" 
                            onClick={() => handleRequestPartnerDevice(item)}
                            style={{ 
                              padding: '7px 12px', 
                              fontSize: '11px', 
                              borderRadius: '8px', 
                              fontWeight: 800, 
                              cursor: 'pointer', 
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.15)'
                            }}
                          >
                            🔌 {t('btn_request_transfer')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== VIEW 3: CUSTOMER CHATS ==================== */}
      {activeTab === 'chats' && (
        <div className="view-section active animate-slide-up">
          <div className="main-hd">
            <h1>💬 {t('customer_chat_inquiry') || '고객 문의 채팅'}</h1>
          </div>

          <div className="main-body" style={{ padding: '16px' }}>
            <div id="sellerChatContainer" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
              
              {/* Chat list Panel */}
              {!activeChatRoom && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatRooms.length === 0 ? (
                    <div className="empty" style={{ padding: '40px 0' }}>
                      <div className="empty-ico">💬</div>
                      <div className="empty-ttl">{t('no_inquiries')}</div>
                    </div>
                  ) : (
                    chatRooms.map((room) => {
                      const buyerName = room.buyer?.name || t('role_buyer');
                      const prodTitle = room.products?.title || t('product_inquiry');
                      const avatar = room.buyer?.profile_image;

                      const unreadCount = room.chat_messages ? room.chat_messages.filter((m: any) => !m.is_read && m.sender_id !== sellerProfile?.id).length : 0;

                      return (
                        <div 
                          key={room.id}
                          className="card"
                          onClick={() => handleOpenSellerChat(room)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px 14px' }}
                        >
                          <div className="s-avatar" style={{ width: '40px', height: '40px', margin: 0, fontSize: '18px' }}>
                            {avatar ? (
                              <img src={avatar} alt={buyerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getAvatarEmoji(buyerName)
                            )}
                          </div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--t1)' }}>{buyerName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>📱 {prodTitle}</div>
                          </div>
                          <span style={{ color: 'var(--purple-l)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                            {unreadCount > 0 && (
                              <span style={{ background: 'var(--red)', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, marginRight: '4px' }}>
                                  {unreadCount}
                              </span>
                            )}
                            {t('chat_inquiry_by')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Chat details detail Panel overlay */}
              {activeChatRoom && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                    <button 
                      onClick={handleCloseActiveChatPanel}
                      style={{ background: 'transparent', border: 'none', color: 'var(--purple-l)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      ◀ <span>{t('cancel')}</span>
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--t1)' }}>
                      {activeChatRoom.buyerName} ({activeChatRoom.productTitle})
                    </span>
                    <div style={{ width: '40px' }} />
                  </div>

                  {/* Messages body */}
                  <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg2)' }}>
                    {loadingChatMessages ? (
                      <div className="empty">{t('chat_loading')}</div>
                    ) : chatMessages.length === 0 ? (
                      <div className="empty">{t('chat_start_seller')}</div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isMine = msg.sender_id === sellerProfile?.id;
                        const fileUrl = msg.media_url || msg.message;
                        return (
                          <div 
                            key={msg.id}
                            style={{
                              display: 'flex',
                              justifyContent: isMine ? 'flex-end' : 'flex-start',
                              width: '100%'
                            }}
                          >
                            <div 
                              style={{
                                maxWidth: '75%',
                                padding: '10px 14px',
                                borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                background: isMine ? 'var(--gp)' : 'rgba(0,0,0,0.04)',
                                color: isMine ? '#fff' : 'var(--t1)',
                                fontSize: '13px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                textAlign: 'left',
                                wordBreak: 'break-all'
                              }}
                            >
                              {msg.message_type === 'image' ? (
                                <img 
                                  src={fileUrl} 
                                  alt="Attachment" 
                                  onClick={() => setLightboxUrl(fileUrl)}
                                  style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', cursor: 'zoom-in', display: 'block' }} 
                                />
                              ) : msg.message_type === 'video' ? (
                                <video src={fileUrl} controls style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', display: 'block' }} />
                              ) : (
                                msg.message
                              )}
                              <div style={{ fontSize: '9px', textAlign: 'right', opacity: 0.6, marginTop: '4px' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Chat Input footer panel */}
                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      id="sellerChatFileInput" 
                      accept="image/*,video/*" 
                      style={{ display: 'none' }} 
                      onChange={handleUploadChatMedia}
                      disabled={isChatUploading}
                    />
                    <button 
                      onClick={() => document.getElementById('sellerChatFileInput')?.click()} 
                      style={{ padding: '10px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--t2)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px' }}
                      disabled={isChatUploading}
                    >
                      {isChatUploading ? '⏳' : '📎'}
                    </button>
                    <input 
                      type="text" 
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      placeholder={t('chat_input_placeholder')}
                      style={{ flex: 1, padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--t1)', fontSize: '12px', outline: 'none' }}
                    />
                    <button 
                      onClick={handleSendChatMessage} 
                      style={{ padding: '10px 14px', background: 'var(--gp)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      {t('chat_send')}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 4: ORDER HISTORY ==================== */}
      {activeTab === 'orders' && (
        <div className="view-section active animate-slide-up">
          <div className="main-hd">
            <h1>📦 {t('all_orders_history') || '전체 주문 내역'}</h1>
          </div>

          <div className="main-body" style={{ textAlign: 'left' }}>
            <div>
              {allOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)', fontSize: '12px' }}>
                  {t('no_orders')}
                </div>
              ) : (
                allOrders.map((o) => {
                  const buyerName = o.profiles?.name || '—';
                  const buyerPhone = o.profiles?.phone ? '+66 ' + o.profiles.phone : '—';
                  const deliveryAddr = o.delivery_address || t('no_address_info');
                  const isCOD = o.payment_method === 'cod';
                  const payBadge = isCOD ? '<span class="badge bg-red">COD</span>' : '<span class="badge bg-green">' + t('pay_online') + '</span>';
                  const comm = o.commission_amount ? `฿${Number(o.commission_amount).toLocaleString()}` : '฿0';
                  const payoutBadge = o.payout_status === 'completed' ? '<span class="badge bg-green">' + t('payout_status_completed') + '</span>' : '<span class="badge bg-yellow">' + t('payout_status_pending') + '</span>';

                  let actionButtons = null;
                  if (o.status === 'pending') {
                    if (o.deposit_confirmed) {
                      actionButtons = (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                          <button className="btn-action-sm btn-green" onClick={() => handleOpenShipModal(o.id)}>
                            🚀 {t('btn_please_ship') || '물건을 발송해주세요'}
                          </button>
                          <button className="btn-action-sm btn-red" onClick={() => handleCancelOrder(o.id)}>
                            {t('order_cancel')}
                          </button>
                        </div>
                      );
                    } else {
                      const waitMsg = o.payment_method === 'online' ? t('waiting_deposit_online') : t('waiting_deposit_cod');
                      actionButtons = (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <span style={{ color: 'var(--gold)', fontSize: '11px', fontWeight: 700 }}>{waitMsg}</span>
                          <button className="btn-action-sm btn-red" onClick={() => handleCancelOrder(o.id)}>
                            {t('order_cancel')}
                          </button>
                        </div>
                      );
                    }
                  } else if (o.status === 'confirmed') {
                    actionButtons = (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                        <span style={{ color: 'var(--purple-l)', fontSize: '11px', fontWeight: 700 }}>
                          🚚 {t('status_confirmed') || '배송중'}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={o.id} className="mobile-order-card">
                      <div className="mobile-order-header">
                        <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 700 }}>{t('order_id_label')} #{o.id.slice(0, 8)}</span>
                        <span className={`badge ${statusBadge(o.status)}`}>{getStatusText(o.status)}</span>
                      </div>
                      <div className="mobile-order-body">
                        <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: '13px', marginBottom: '6px' }}>
                          {o.products?.title || '—'}
                          <span className="badge bg-purple" style={{ fontSize: '9px', marginLeft: '4px' }}>
                            {o.products?.condition || 'Used S'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                          <span>{t('order_qty')}: {o.quantity}{t('order_qty_suffix')}</span>
                          <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '14px' }}>{formatPrice(o.total_price)}</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '6px', padding: '8px', fontSize: '11px', marginBottom: '8px' }}>
                          <div>👤 <b>{buyerName}</b> ({buyerPhone})</div>
                          <div style={{ marginTop: '4px', color: 'var(--t3)', lineHeight: 1.3 }}>📍 {deliveryAddr}</div>
                          {o.notes && <div style={{ marginTop: '6px', color: 'var(--purple-l)', background: 'rgba(139,92,246,0.06)', border: '1px dashed rgba(139,92,246,0.15)', borderRadius: '4px', padding: '4px 6px', lineHeight: 1.2 }}>💬 <b>{t('order_notes')}:</b> {o.notes}</div>}
                          {o.slip_url && <div style={{ marginTop: '6px', fontSize: '10px' }}>📄 <a href={o.slip_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-d)', textDecoration: 'underline', fontWeight: 700 }}>{t('view_slip')}</a></div>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                          <div dangerouslySetInnerHTML={{ __html: `${t('payment_label')}: ${payBadge} / ${t('commission_label')}: ${comm}` }} />
                          <div dangerouslySetInnerHTML={{ __html: `${t('payout_label')}: ${payoutBadge}` }} />
                        </div>
                        
                        {o.tracking_number && (
                          <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', padding: '8px', fontSize: '11px', color: 'var(--t2)', border: '1px dashed var(--border)' }}>
                            🚚 <b>{o.tracking_company || 'Flash Express'}</b>: {o.tracking_number}
                          </div>
                        )}
                      </div>
                      {actionButtons}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 5: PROFILE & STORE SETTINGS ==================== */}
      {activeTab === 'profile' && (
        <div className="view-section active animate-slide-up">
          <div className="main-hd">
            <h1>👤 {t('profile_shop_settings') || '프로필 및 매장 설정'}</h1>
          </div>

          <div className="main-body" style={{ textAlign: 'left' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="s-avatar" style={{ width: '80px', height: '80px', fontSize: '32px', margin: '0 auto 10px' }}>
                  {profileLogoPreview ? (
                    <img src={profileLogoPreview} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '💼'
                  )}
                </div>
                <label style={{ cursor: 'pointer' }}>
                  <span className="btn-sm btn-purple" style={{ fontSize: '11px', padding: '6px 12px' }}>
                    📷 {t('change_avatar_btn') || '사진 변경'}
                  </span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePreviewAvatar} />
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">{t('manager_name')}</label>
                <input type="text" className="form-input" value={profName} onChange={(e) => setProfName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('phone_number')}</label>
                <input type="text" className="form-input" value={sellerProfile ? '+66 ' + sellerProfile.phone : ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('store_name_label')}</label>
                <input type="text" className="form-input" value={profStore} onChange={(e) => setProfStore(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">{t('store_province')}</label>
                <select 
                  className="form-input" 
                  value={profProvince}
                  onChange={(e) => setProfProvince(e.target.value)}
                >
                  <option value="">Select Province</option>
                  {THAILAND_PROVINCES.map(p => (
                    <option key={p.id} value={p.name_en}>{p.name_en} ({p.name_th})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('store_district')}</label>
                <select 
                  className="form-input"
                  value={profDistrict}
                  onChange={(e) => setProfDistrict(e.target.value)}
                  disabled={!profProvince}
                >
                  <option value="">Select District</option>
                  {profileDistricts.map(d => (
                    <option key={d.id} value={d.name_en}>{d.name_en} ({d.name_th})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('store_detailed_address')}</label>
                <textarea className="form-textarea" value={profAddress} onChange={(e) => setProfAddress(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">{t('store_coords')}</label>
                <input type="text" className="form-input" placeholder="Ex: 13.7563, 100.5018" value={profCoords} onChange={(e) => setProfCoords(e.target.value)} />
              </div>

              <div className="form-group" style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed var(--border2)', padding: '14px', borderRadius: 'var(--r-sm)' }}>
                <label className="form-label" style={{ color: 'var(--purple-l)', fontWeight: 700 }}>
                  🔔 {t('line_notification_integration') || '라인 알림 연동 (LINE User ID)'}
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: U1234567890abcdef1234567890abcdef" 
                  style={{ marginBottom: '8px' }}
                  value={profLineUserId}
                  onChange={(e) => setProfLineUserId(e.target.value)}
                />
                <div style={{ fontSize: '10px', color: 'var(--t2)', lineHeight: 1.4 }}>
                  {t('line_notification_desc')}
                </div>
                <div style={{ marginTop: '6px', fontWeight: 700, fontSize: '10px' }}>
                  <span>{t('line_friend_link')}: </span>
                  <span style={{ color: 'var(--cyan)' }}>@phoneswitchhub</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('payout_and_payment_type')}</label>
                <select className="form-input" value={sellerProfile?.payout_method || 'parent_payment'} disabled style={{ opacity: 0.7, background: 'rgba(0,0,0,0.1)' }}>
                  <option value="parent_payment">{t('parent_payment_desc')}</option>
                  <option value="cod_commission">{t('cod_commission_desc')}</option>
                </select>
                <span style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '4px', display: 'block', lineHeight: 1.2 }}>
                  {t('payout_change_notice')}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">{t('store_introduction')}</label>
                <textarea className="form-textarea" value={profDesc} onChange={(e) => setProfDesc(e.target.value)} />
              </div>

              <button 
                className="btn-submit" 
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? t('loading') : t('save_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW 6: CONTRACTS ==================== */}
      {activeTab === 'contracts' && (
        <div className="view-section active animate-slide-up">
          <div className="main-hd">
            <h1>✍️ {t('contracts_archive_title')}</h1>
            <button 
              className="btn-nav" 
              onClick={() => router.push('/contract')}
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              📝 {t('btn_new_contract')}
            </button>
          </div>

          <div className="main-body" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingContracts ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>{t('loading_data')}</div>
              ) : myContracts.length === 0 ? (
                <div className="empty">
                  <div className="empty-ico">📄</div>
                  <div className="empty-ttl">{t('no_contracts')}</div>
                  <button className="btn btn-secondary" onClick={() => router.push('/contract')} style={{ margin: '12px auto 0' }}>
                    {t('go_create_contract')}
                  </button>
                </div>
              ) : (
                myContracts.map((c) => {
                  const isSigned = c.status === 'signed';
                  const dateStr = new Date(c.created_at).toLocaleDateString();
                  return (
                    <div key={c.id} className="card" style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{t('contract_no')}: {c.contract_no}</span>
                        <span className={`badge ${isSigned ? 'bg-green' : 'bg-yellow'}`}>
                          {isSigned ? `🟢 ${t('status_signed')}` : `⏳ ${t('status_pending_sign')}`}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>
                        {t('customer_name_label')}: {c.customer_name || t('unfilled')}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                        {t('device_label')}: {c.model} {c.color} ({c.capacity}) | IMEI: {c.imei || '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                        {t('installment_info_label')}: ฿{c.selling_price?.toLocaleString()} ({t('down_payment_short')} ฿{c.down_payment?.toLocaleString()} / {t('monthly_amount')} ฿{c.installment_amount?.toLocaleString()} x {c.installments_count}{t('months_unit')})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                        {t('created_date_label')}: {dateStr}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <a 
                          href={`/contract?id=${c.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-sm btn-purple" 
                          style={{ flex: 1, padding: '8px', fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          👁️ {t('btn_view_print')}
                        </a>
                        <button 
                          className="btn-sm btn-red" 
                          style={{ padding: '8px 12px', fontSize: '11px' }}
                          onClick={() => handleDeleteSellerContract(c.id)}
                        >
                          🗑️ {t('btn_delete')}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM TAB BAR */}
      <div className="tab-bar">
        <div className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { handleCloseActiveChatPanel(); setActiveTab('overview'); }}>
          <span className="tab-item-icon">📊</span>
          <span>{t('tab_overview')}</span>
        </div>
        
        {sellerProfile?.store_type === 'direct' ? (
          <div className={`tab-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => { handleCloseActiveChatPanel(); setActiveTab('products'); }}>
            <span className="tab-item-icon">📱</span>
            <span>{t('tab_my_products')}</span>
          </div>
        ) : (
          <>
            <div className={`tab-item ${activeTab === 'partner_inventory' ? 'active' : ''}`} onClick={() => { handleCloseActiveChatPanel(); setActiveTab('partner_inventory'); }}>
              <span className="tab-item-icon">🏪</span>
              <span>{t('tab_partner_inventory') || '우리 매장 재고'}</span>
            </div>
            <div className={`tab-item ${activeTab === 'partner_request' ? 'active' : ''}`} onClick={() => { handleCloseActiveChatPanel(); setActiveTab('partner_request'); }}>
              <span className="tab-item-icon">📥</span>
              <span>{t('tab_request_devices') || '기기 신청'}</span>
            </div>
          </>
        )}

        <div className={`tab-item ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
          <span className="tab-item-icon" style={{ position: 'relative' }}>
            💬
            {hasUnreadChats && (
              <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: 'var(--red)', width: '8px', height: '8px', borderRadius: '50%' }} />
            )}
          </span>
          <span>{t('tab_customer_chat')}</span>
        </div>
        
        <div className={`tab-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { handleCloseActiveChatPanel(); setActiveTab('orders'); }}>
          <span className="tab-item-icon">📦</span>
          <span>{t('tab_orders_history')}</span>
        </div>
        
        {sellerProfile?.store_type === 'direct' && (
          <div className={`tab-item ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => { handleCloseActiveChatPanel(); setActiveTab('contracts'); }}>
            <span className="tab-item-icon">✍️</span>
            <span>{t('tab_contracts')}</span>
          </div>
        )}
        
        <div className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => { handleCloseActiveChatPanel(); setActiveTab('profile'); }}>
          <span className="tab-item-icon">👤</span>
          <span>{t('tab_store_profile')}</span>
        </div>
      </div>

      {/* PARTNER RECORD SALE MODAL */}
      {sellingItem && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3100 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '400px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd" style={{ marginBottom: '16px' }}>
              <span className="modal-title">{t('modal_sell_title') || '💸 판매 완료 처리 (Record Sale)'}</span>
              <button className="modal-x" onClick={() => setSellingItem(null)}>✕</button>
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>{sellingItem.model_name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--t2)', marginTop: '4px' }}>
                  Sticker: {sellingItem.sticker || t('none_label') || '없음'} | IMEI: {sellingItem.imei}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--t3)', marginTop: '2px' }}>
                  {t('modal_sell_base_wholesale') || '기본 도매가'}: ฿{getDisplayPrice(sellingItem).toLocaleString()}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">{t('modal_sell_actual_price') || '실제 판매 가격 (Actual Sold Price in ฿) *'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>฿</span>
                  <input
                    type="number"
                    className="form-input"
                    value={customSalePrice}
                    onChange={(e) => setCustomSalePrice(e.target.value)}
                    placeholder={t('modal_sell_placeholder') || '판매가 입력'}
                    autoFocus
                  />
                </div>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.4, marginBottom: '16px' }}>
                {t('modal_sell_warning') || '* 판매 완료 처리 시 기기는 매장 재고 목록에서 즉시 제외되며 본사 판매 승인 대기 목록으로 연동됩니다. 본사의 최종 입금 확인 및 승인 후 매출 장부에 최종 반영됩니다.'}
              </p>
            </div>

            <div className="modal-ft" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
              <button
                className="btn-sm btn-grey"
                onClick={() => setSellingItem(null)}
                style={{ height: '36px', padding: '0 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                {t('modal_sell_cancel') || '취소 (Cancel)'}
              </button>
              <button
                className="btn-sm btn-green"
                onClick={handleConfirmSell}
                disabled={isProcessingSale}
                style={{ height: '36px', padding: '0 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
              >
                {isProcessingSale ? (t('modal_sell_processing') || '처리 중...') : (t('modal_sell_confirm') || '판매 완료 (Confirm Sell)')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT PRODUCT MODAL */}
      {isProdModalOpen && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '440px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd" style={{ marginBottom: '16px' }}>
              <span className="modal-title">{editingProduct ? t('product_edit_title') : t('product_register_title')}</span>
              <button className="modal-x" onClick={() => setIsProdModalOpen(false)}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '65vh', paddingRight: '4px', textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">{t('product_name_label')} *</label>
                <input type="text" className="form-input" placeholder={t('product_name_placeholder')} value={pTitle} onChange={(e) => setPTitle(e.target.value)} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">{t('product_price_label')} *</label>
                  <input type="number" className="form-input" placeholder="25000" value={pPrice} onChange={(e) => setPPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('product_category_label')} *</label>
                  <select className="form-select" value={pCat} onChange={(e) => setPCat(e.target.value)}>
                    <option value="iPhone">🍎 iPhone</option>
                    <option value="Samsung">🌟 Samsung</option>
                    <option value="Xiaomi">🔴 Xiaomi</option>
                    <option value="Other">{t('category_other')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">{t('product_condition_label')} *</label>
                  <select className="form-select" value={pCondition} onChange={(e) => setPCondition(e.target.value)}>
                    <option value="New">{t('condition_new')}</option>
                    <option value="Used S">{t('condition_s')}</option>
                    <option value="Used A">{t('condition_a')}</option>
                    <option value="Used B">{t('condition_b')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('product_stock_label')} *</label>
                  <input type="number" className="form-input" value={pStock} min="0" onChange={(e) => setPStock(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('product_desc_label')}</label>
                <textarea className="form-textarea" placeholder={t('product_desc_placeholder')} value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">{t('product_images_label')}</label>
                <div 
                  className="img-upload" 
                  onClick={() => document.getElementById('pImgInput')?.click()} 
                  style={{ padding: '20px', cursor: 'pointer', border: '2px dashed var(--border)', borderRadius: '10px', textAlign: 'center' }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>📷</div>
                  <div style={{ fontSize: '11px' }}>{t('click_to_select_images')} <span>(max 10{t('order_qty_suffix')})</span></div>
                </div>
                <input type="file" id="pImgInput" accept="image/*" multiple style={{ display: 'none' }} onChange={handleNewImagesSelect} />
                
                {/* Existing Images Previews */}
                {existingImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {existingImages.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={url} alt="Existing" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                        <button 
                          onClick={() => handleRemoveExistingImg(idx)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Selected Images Previews */}
                {newImagePreviews.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {newImagePreviews.map((src, idx) => (
                      <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={src} alt="New Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                        <button 
                          onClick={() => handleRemoveNewImgPreview(idx)}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                className="btn-submit" 
                onClick={handleSaveProduct}
                style={{ flex: 1, marginTop: 0 }}
                disabled={savingProduct}
              >
                💾 {savingProduct ? t('loading') : t('save_btn_short') || '저장'}
              </button>
              <button className="btn-sm btn-red" onClick={() => setIsProdModalOpen(false)} style={{ padding: '12px 16px', borderRadius: 'var(--r-sm)' }}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHIP/TRACKING MODAL */}
      {isShipModalOpen && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '400px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd" style={{ marginBottom: '16px' }}>
              <span className="modal-title">{t('tracking_input_title') || '📦 배송 정보 입력 (수락 및 배송)'}</span>
              <button className="modal-x" onClick={() => setIsShipModalOpen(false)}>✕</button>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">{t('tracking_company_label')}</label>
                <select className="form-select" value={shipCompany} onChange={(e) => setShipCompany(e.target.value)}>
                  <option value="Flash Express">⚡ Flash Express</option>
                  <option value="KEX (Kerry Express)">📦 KEX (Kerry Express)</option>
                  <option value="Thailand Post">📮 Thailand Post</option>
                  <option value="J&T Express">🚚 J&T Express</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('tracking_number_label')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('tracking_number_placeholder')} 
                  value={shipTrackingNum}
                  onChange={(e) => setShipTrackingNum(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                className="btn-submit" 
                onClick={handleSaveShippingInfo}
                style={{ flex: 1, marginTop: 0 }}
                disabled={savingShipInfo}
              >
                🚀 {savingShipInfo ? t('loading') : t('btn_ship_start') || '수락 및 배송 시작'}
              </button>
              <button className="btn-sm btn-red" onClick={() => setIsShipModalOpen(false)} style={{ padding: '12px 16px', borderRadius: 'var(--r-sm)' }}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxUrl && (
        <div 
          className="modal-bg open" 
          onClick={() => setLightboxUrl(null)}
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)', display: 'flex' }}
        >
          <button 
            onClick={() => setLightboxUrl(null)} 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '20px', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10000 }}
          >
            ✕
          </button>
          <div style={{ width: '100%', maxWidth: '480px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', margin: '0 auto' }}>
            <img src={lightboxUrl} alt="Zoomed" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }} />
          </div>
        </div>
      )}

      {/* TOAST COMPONENT */}
      {toast && (
        <div 
          className="toast show" 
          style={{
            position: 'fixed',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: toast.type === 'error' ? 'var(--red)' : toast.type === 'success' ? 'var(--green)' : 'var(--purple-l)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            textAlign: 'center',
            minWidth: '260px'
          }}
        >
          {toast.message}
        </div>
      )}
    </MobileLayout>
  );
}

// Helpers

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: 'bg-yellow',
    confirmed: 'bg-blue',
    completed: 'bg-green',
    cancelled: 'bg-red'
  };
  return map[s] || 'bg-gray';
}

function getAvatarEmoji(name: string) {
  return ['👨', '👩', '🧑', '👦', '👧', '🧔'][name ? name.charCodeAt(0) % 6 : 0];
}

function getCategoryIcon(cat: string) {
  const map: Record<string, string> = { iPhone: '🍎', Samsung: '🌟', Xiaomi: '🔴', Other: '📦' };
  return map[cat] || '📱';
}
