'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { formatPrice, formatDate } from '@/lib/utils';
import { THAILAND_PROVINCES, Province, District } from '@/lib/addresses';

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useTranslation();

  // Authentication & Profile States
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Active Sidebar Page: 'overview' | 'sellers' | 'buyers' | 'products' | 'orders' | 'chat-rooms' | 'media'
  const [activePage, setActivePage] = useState<string>('overview');

  // Stats State
  const [stats, setStats] = useState({
    usersCount: 0,
    sellersCount: 0,
    productsCount: 0,
    ordersCount: 0,
    totalRevenue: 0,
    pendingSellersCount: 0
  });

  // Data Lists
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingSellers, setPendingSellers] = useState<any[]>([]);
  const [approvedSellers, setApprovedSellers] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [chatMedia, setChatMedia] = useState<any[]>([]);

  // Filters
  const [productSellerFilter, setProductSellerFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [orderSellerFilter, setOrderSellerFilter] = useState('all');

  // Config Partner Modal States
  const [selectedSellerForConfig, setSelectedSellerForConfig] = useState<any>(null);
  const [confPartnerType, setConfPartnerType] = useState('partner');
  const [confCommRate, setConfCommRate] = useState(10.0);
  const [confPayoutMethod, setConfPayoutMethod] = useState('parent_payment');
  const [confProvince, setConfProvince] = useState('');
  const [confDistrict, setConfDistrict] = useState('');
  const [confAddress, setConfAddress] = useState('');
  const [confCoords, setConfCoords] = useState('');
  const [districtsList, setDistrictsList] = useState<District[]>([]);

  // Buyer Orders View Modal States
  const [selectedBuyerForOrders, setSelectedBuyerForOrders] = useState<any>(null);

  // Chat History Viewer Modal States
  const [selectedChatRoomForHistory, setSelectedChatRoomForHistory] = useState<any>(null);
  const [chatMessagesHistory, setChatMessagesHistory] = useState<any[]>([]);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 1. Auth Guard Checklist
  useEffect(() => {
    const checkAdmin = async () => {
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

        if (error || !p || p.role !== 'admin') {
          showToast('Access denied. Admin role required.', 'error');
          router.push('/');
          return;
        }

        setAdminProfile(p);
        setIsAdmin(true);
      } catch (e) {
        console.error(e);
        router.push('/');
      } finally {
        setLoadingAdmin(false);
      }
    };
    checkAdmin();
  }, [router, showToast]);

  // 2. Data loading logic
  const loadStats = useCallback(async () => {
    try {
      const [users, sellers, prods, orders, revenue, pending] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller').eq('is_approved', true),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_price').eq('status', 'completed'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller').eq('is_approved', false)
      ]);

      const revTotal = (revenue.data || []).reduce((sum, o) => sum + Number(o.total_price), 0);

      setStats({
        usersCount: users.count || 0,
        sellersCount: sellers.count || 0,
        productsCount: prods.count || 0,
        ordersCount: orders.count || 0,
        totalRevenue: revTotal,
        pendingSellersCount: pending.count || 0
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadRecentOrders = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, products(title), buyer:profiles!orders_buyer_id_fkey(name), seller:profiles!orders_seller_id_fkey(name, store_name)')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentOrders(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadSellers = useCallback(async () => {
    try {
      const { data: pending } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'seller')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      const { data: approved } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'seller')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      setPendingSellers(pending || []);
      setApprovedSellers(approved || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadBuyers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, orders:orders!orders_buyer_id_fkey(id, status, total_price, created_at, payment_method, deposit_confirmed, commission_amount, notes, products(title))')
        .eq('role', 'buyer')
        .order('created_at', { ascending: false });
      setBuyers(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAllProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, profiles(name, store_name)')
        .order('created_at', { ascending: false });
      setAllProducts(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAllOrders = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, products(title), buyer:profiles!orders_buyer_id_fkey(name, phone, location_address), seller:profiles!orders_seller_id_fkey(name, store_name, partner_type, payout_method)')
        .order('created_at', { ascending: false });
      setAllOrders(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadChatRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id, created_at, updated_at,
          products(title),
          buyer:profiles!chat_rooms_buyer_id_fkey(name, phone),
          seller:profiles!chat_rooms_seller_id_fkey(name, store_name, phone)
        `)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setChatRooms(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadChatMedia = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id, message, message_type, media_url, created_at, sender_id,
          profiles(name, phone),
          room:chat_rooms(
            id,
            products(title),
            buyer:profiles!chat_rooms_buyer_id_fkey(name),
            seller:profiles!chat_rooms_seller_id_fkey(name, store_name)
          )
        `)
        .or('message_type.eq.image,message_type.eq.video')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setChatMedia(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    if (!isAdmin) return;
    await Promise.all([
      loadStats(),
      loadRecentOrders(),
      loadSellers(),
      loadBuyers(),
      loadAllProducts(),
      loadAllOrders()
    ]);
  }, [isAdmin, loadStats, loadRecentOrders, loadSellers, loadBuyers, loadAllProducts, loadAllOrders]);

  useEffect(() => {
    if (isAdmin) {
      refreshAllData();
    }
  }, [isAdmin, refreshAllData]);

  // Load specific subpages data when activePage changes
  useEffect(() => {
    if (activePage === 'chat-rooms') {
      loadChatRooms();
    } else if (activePage === 'media') {
      loadChatMedia();
    }
  }, [activePage, loadChatRooms, loadChatMedia]);

  // 3. User operations
  const handleApproveSeller = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', id);

    if (error) {
      showToast('❌ Approval failed: ' + error.message, 'error');
      return;
    }
    showToast('✅ Seller approved!', 'success');
    refreshAllData();
  };

  const handleRejectSeller = async (id: string) => {
    if (!confirm('Rejecting will demote this account to a buyer. Proceed?')) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'buyer' })
      .eq('id', id);

    if (error) {
      showToast('❌ Reject failed: ' + error.message, 'error');
      return;
    }
    showToast('❌ Seller application rejected.', 'info');
    refreshAllData();
  };

  const handleSuspendSeller = async (id: string) => {
    if (!confirm('Suspend this seller account?')) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: false })
      .eq('id', id);

    if (error) {
      showToast('❌ Suspension failed: ' + error.message, 'error');
      return;
    }
    showToast('🚫 Seller account suspended.', 'info');
    refreshAllData();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('❌ Delete failed: ' + error.message, 'error');
      return;
    }
    showToast('🗑️ User deleted successfully.');
    refreshAllData();
  };

  const handleResetPin = async (userId: string, phone: string) => {
    const newPin = prompt(`Enter new 4-digit PIN for this user (e.g. 1234):`);
    if (newPin === null) return;

    if (!/^\d{4}$/.test(newPin)) {
      showToast('⚠️ PIN must be exactly 4 digits.', 'error');
      return;
    }

    const { error } = await supabase.rpc('reset_user_pin', {
      user_id: userId,
      user_phone: phone,
      new_pin: newPin
    });

    if (error) {
      showToast('❌ PIN reset failed: ' + error.message, 'error');
      return;
    }

    showToast('🔑 PIN reset successfully!', 'success');
  };

  // 4. Partner Configuration cascading dropdown
  useEffect(() => {
    if (!confProvince) {
      setDistrictsList([]);
      setConfDistrict('');
      return;
    }
    const provData = THAILAND_PROVINCES.find(p => p.name_en === confProvince);
    if (provData) {
      setDistrictsList(provData.districts);
    } else {
      setDistrictsList([]);
    }
    setConfDistrict('');
  }, [confProvince]);

  const handleOpenPartnerConfig = (seller: any) => {
    setSelectedSellerForConfig(seller);
    setConfPartnerType(seller.partner_type || 'partner');
    setConfCommRate(seller.commission_rate || 10.0);
    setConfPayoutMethod(seller.payout_method || 'parent_payment');
    setConfProvince(seller.location_province || '');
    // Wait for cascading state
    setTimeout(() => {
      setConfDistrict(seller.location_district || '');
    }, 50);
    setConfAddress(seller.location_address || '');
    setConfCoords(seller.location_coords || '');
  };

  const handleSavePartnerConfig = async () => {
    if (!selectedSellerForConfig) return;
    if (!confProvince || !confDistrict) {
      showToast('❌ Please select both province and district.', 'error');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        partner_type: confPartnerType,
        commission_rate: confCommRate,
        payout_method: confPayoutMethod,
        location_province: confProvince,
        location_district: confDistrict,
        location_address: confAddress.trim(),
        location_coords: confCoords.trim() || null
      })
      .eq('id', selectedSellerForConfig.id);

    if (error) {
      showToast('❌ Save config failed: ' + error.message, 'error');
      return;
    }

    showToast('✅ Partner configurations saved!', 'success');
    setSelectedSellerForConfig(null);
    refreshAllData();
  };

  // 5. Product actions
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      // If product has foreign key orders constraints, hide it instead of hard delete
      if (error.code === '23503' || error.message.includes('foreign key') || error.message.includes('orders_product_id_fkey')) {
        const { error: hideErr } = await supabase
          .from('products')
          .update({ status: 'hidden' })
          .eq('id', id);

        if (hideErr) {
          showToast('❌ Hiding product failed: ' + hideErr.message, 'error');
        } else {
          showToast('🙈 Product hidden safely since orders contain references to it.', 'success');
          loadAllProducts();
        }
      } else {
        showToast('❌ Delete failed: ' + error.message, 'error');
      }
      return;
    }

    showToast('🗑️ Product deleted.');
    loadAllProducts();
    loadStats();
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (productSellerFilter !== 'all' && p.seller_id !== productSellerFilter) return false;
      if (productCategoryFilter !== 'all' && p.category !== productCategoryFilter) return false;
      return true;
    });
  }, [allProducts, productSellerFilter, productCategoryFilter]);

  // Seller options for filter
  const productSellerOptions = useMemo(() => {
    const map = new Map();
    allProducts.forEach(p => {
      if (p.profiles) {
        map.set(p.seller_id, p.profiles.store_name || p.profiles.name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allProducts]);

  // 6. Orders and settlements actions
  const handleConfirmOrderDeposit = async (orderId: string) => {
    if (!confirm('Confirm deposit received? Seller will be authorized to ship.')) return;
    const { error } = await supabase
      .from('orders')
      .update({ deposit_confirmed: true })
      .eq('id', orderId);

    if (error) {
      showToast('❌ Deposit confirmation failed: ' + error.message, 'error');
      return;
    }
    showToast('💰 Deposit confirmed! Seller notified to prepare shipment.', 'success');
    refreshAllData();
    // Refresh modal if active
    if (selectedBuyerForOrders) {
      setSelectedBuyerForOrders((prev: any) => {
        if (!prev) return null;
        const updatedOrders = prev.orders.map((o: any) => o.id === orderId ? { ...o, deposit_confirmed: true } : o);
        return { ...prev, orders: updatedOrders };
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    let trackingCompany = null;
    let trackingNumber = null;

    if (nextStatus === 'confirmed') {
      const trackingInput = prompt("Enter shipping details (Format: Carrier/TrackingNo, e.g. Flash Express/FLASH123456):\nLeave empty for default mock shipment.");
      if (trackingInput === null) return; // Cancel
      if (trackingInput.trim()) {
        const parts = trackingInput.split('/');
        trackingCompany = parts[0]?.trim() || 'Flash Express';
        trackingNumber = parts[1]?.trim() || 'FLASH' + Math.floor(Math.random() * 100000000);
      } else {
        trackingCompany = 'Flash Express';
        trackingNumber = 'FLASH' + Math.floor(Math.random() * 100000000);
      }
    } else if (nextStatus === 'cancelled') {
      if (!confirm("Are you sure you want to cancel this order? Stock will be restored.")) return;
    } else if (nextStatus === 'completed') {
      if (!confirm("Confirm complete this transaction? Seller will be pending payout.")) return;
    }

    const payload: any = { status: nextStatus };
    if (nextStatus === 'confirmed') {
      payload.tracking_company = trackingCompany;
      payload.tracking_number = trackingNumber;
    }

    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId);

    if (error) {
      showToast('❌ Status update failed: ' + error.message, 'error');
      return;
    }

    showToast('✅ Order status updated successfully.', 'success');
    refreshAllData();
    // Refresh modal if active
    if (selectedBuyerForOrders) {
      setSelectedBuyerForOrders((prev: any) => {
        if (!prev) return null;
        const updatedOrders = prev.orders.map((o: any) => {
          if (o.id === orderId) {
            const nextO = { ...o, status: nextStatus };
            if (nextStatus === 'confirmed') {
              nextO.tracking_company = trackingCompany;
              nextO.tracking_number = trackingNumber;
            }
            return nextO;
          }
          return o;
        });
        return { ...prev, orders: updatedOrders };
      });
    }
  };

  const handleCompletePayout = async (orderId: string) => {
    if (!confirm('Mark payout status as completed for this order?')) return;
    const { error } = await supabase
      .from('orders')
      .update({ payout_status: 'completed' })
      .eq('id', orderId);

    if (error) {
      showToast('❌ Payout completion failed: ' + error.message, 'error');
      return;
    }
    showToast('✅ Payout marked completed!', 'success');
    refreshAllData();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to permanently delete this order record? This cannot be undone.')) return;
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      showToast('❌ Order deletion failed: ' + error.message, 'error');
      return;
    }
    showToast('🗑️ Order deleted.');
    refreshAllData();
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      if (orderSellerFilter !== 'all' && o.seller_id !== orderSellerFilter) return false;
      return true;
    });
  }, [allOrders, orderSellerFilter]);

  // Seller options for orders filter
  const orderSellerOptions = useMemo(() => {
    const map = new Map();
    allOrders.forEach(o => {
      if (o.seller) {
        map.set(o.seller_id, o.seller.store_name || o.seller.name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allOrders]);

  // 7. Chat rooms actions
  const handleViewChatHistory = async (room: any) => {
    const sellerName = room.seller?.store_name || room.seller?.name || 'Seller';
    const buyerName = room.buyer?.name || 'Buyer';

    setSelectedChatRoomForHistory({
      id: room.id,
      sellerName,
      buyerName
    });
    setLoadingChatHistory(true);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, profiles(name, role)')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessagesHistory(data || []);
    } catch (e: any) {
      console.error(e);
      showToast('❌ Loading chat failed: ' + e.message, 'error');
    } finally {
      setLoadingChatHistory(false);
    }
  };

  const handleDeleteChatRoom = async (roomId: string) => {
    if (!confirm('Delete this chat room and all messages permanently?')) return;

    try {
      // Fetch media paths to delete files from storage
      const { data: mediaMsgs } = await supabase
        .from('chat_messages')
        .select('message, media_url')
        .eq('room_id', roomId)
        .or('message_type.eq.image,message_type.eq.video');

      if (mediaMsgs?.length) {
        const pathsToDelete: string[] = [];
        mediaMsgs.forEach((m) => {
          const url = m.media_url || m.message;
          const parts = url.split('/chat_media/');
          if (parts.length > 1) {
            pathsToDelete.push(`chat_media/${parts[1]}`);
          }
        });

        if (pathsToDelete.length > 0) {
          // Deleting files from products bucket under chat_media folder prefix
          const { error: storageErr } = await supabase.storage
            .from('products')
            .remove(pathsToDelete);
          if (storageErr) console.warn('Storage removal warning:', storageErr);
        }
      }

      // Delete messages in DB
      const { error: msgErr } = await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', roomId);

      if (msgErr) throw msgErr;

      // Delete room itself
      const { error: roomErr } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);

      if (roomErr) throw roomErr;

      showToast('🗑️ Chat room deleted.', 'success');
      loadChatRooms();
      loadStats();
    } catch (e: any) {
      console.error(e);
      showToast('❌ Deletion failed: ' + e.message, 'error');
    }
  };

  // 8. Chat media actions
  const handleDeleteChatMedia = async (msgId: string, mediaUrl: string) => {
    if (!confirm('Permanently delete this media file from storage?')) return;

    try {
      const parts = mediaUrl.split('/chat_media/');
      if (parts.length > 1) {
        const path = `chat_media/${parts[1]}`;
        const { error: storageErr } = await supabase.storage
          .from('products')
          .remove([path]);
        if (storageErr) console.warn('Storage removal error:', storageErr);
      }

      const { error: dbErr } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId);

      if (dbErr) throw dbErr;

      showToast('🗑️ Media file deleted.');
      loadChatMedia();
      loadStats();
    } catch (e: any) {
      console.error(e);
      showToast('❌ Deletion failed: ' + e.message, 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: '주문 대기 (Pending)',
      confirmed: '배송 중 (Shipping)',
      completed: '구매 확정 (Completed)',
      cancelled: '취소/반송 (Cancelled)'
    };
    return map[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow',
      confirmed: 'bg-blue',
      completed: 'bg-green',
      cancelled: 'bg-red'
    };
    return map[status] || 'bg-gray';
  };

  if (loadingAdmin) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#eaedf2' }}>
        <div style={{ color: 'var(--purple-l)', fontWeight: 700 }}>Checking administrator permissions...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="db-wrap">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sb-head">
          <div className="nav-logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <div className="nav-logo-icon">💎</div>
            <span className="nav-logo-text">PHONE SWITCH HUB</span>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-sec-lbl">관리자 메뉴</div>
          <button 
            className={`sb-link ${activePage === 'overview' ? 'active' : ''}`} 
            onClick={() => setActivePage('overview')}
          >
            <span className="ico">📊</span> 개요
          </button>
          <button 
            className={`sb-link ${activePage === 'sellers' ? 'active' : ''}`} 
            onClick={() => setActivePage('sellers')}
          >
            <span className="ico">💼</span> 판매자 관리
          </button>
          <button 
            className={`sb-link ${activePage === 'buyers' ? 'active' : ''}`} 
            onClick={() => setActivePage('buyers')}
          >
            <span className="ico">👥</span> 구매자 관리
          </button>
          <button 
            className={`sb-link ${activePage === 'products' ? 'active' : ''}`} 
            onClick={() => setActivePage('products')}
          >
            <span className="ico">📱</span> 전체 상품
          </button>
          <button 
            className={`sb-link ${activePage === 'orders' ? 'active' : ''}`} 
            onClick={() => setActivePage('orders')}
          >
            <span className="ico">📦</span> 전체 주문/정산
          </button>
          <button 
            className={`sb-link ${activePage === 'chat-rooms' ? 'active' : ''}`} 
            onClick={() => setActivePage('chat-rooms')}
          >
            <span className="ico">💬</span> 채팅방 관리
          </button>
          <button 
            className={`sb-link ${activePage === 'media' ? 'active' : ''}`} 
            onClick={() => setActivePage('media')}
          >
            <span className="ico">🖼️</span> 채팅 미디어 관리
          </button>
          
          <div className="sb-sec-lbl">바로가기</div>
          <button className="sb-link" onClick={() => router.push('/')}>
            <span className="ico">🏠</span> 메인 홈
          </button>
        </nav>

        <div className="sb-foot">
          <div className="sb-user">
            <div className="sb-avatar">👑</div>
            <div style={{ textAlign: 'left' }}>
              <div className="sb-uname">{adminProfile?.name || 'Admin'}</div>
              <div className="sb-urole">Administrator</div>
            </div>
          </div>
          <button 
            className="btn-nav btn-nav-outline" 
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }} 
            onClick={handleLogout}
          >
            🚪 로그아웃
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main">
        {/* ===== OVERVIEW PAGE ===== */}
        {activePage === 'overview' && (
          <div className="animate-slide-up">
            <div className="main-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h1>📊 관리자 개요</h1>
              <span style={{ color: 'var(--t2)', fontSize: '13px' }}>
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="main-body">
              {/* Stat Grid */}
              <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="sc-icon" style={{ background: 'rgba(139,92,246,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
                  <div className="sc-val" style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>{stats.usersCount}</div>
                  <div className="sc-lbl" style={{ fontSize: '11px', color: 'var(--t3)' }}>전체 회원</div>
                </div>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="sc-icon" style={{ background: 'rgba(251,191,36,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💼</div>
                  <div className="sc-val" style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>{stats.sellersCount}</div>
                  <div className="sc-lbl" style={{ fontSize: '11px', color: 'var(--t3)' }}>활성 판매자</div>
                </div>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="sc-icon" style={{ background: 'rgba(16,185,129,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📱</div>
                  <div className="sc-val" style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>{stats.productsCount}</div>
                  <div className="sc-lbl" style={{ fontSize: '11px', color: 'var(--t3)' }}>등록 상품</div>
                </div>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="sc-icon" style={{ background: 'rgba(34,211,238,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                  <div className="sc-val" style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>{stats.ordersCount}</div>
                  <div className="sc-lbl" style={{ fontSize: '11px', color: 'var(--t3)' }}>전체 주문</div>
                </div>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="sc-icon" style={{ background: 'rgba(251,191,36,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💰</div>
                  <div className="sc-val" style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: 'var(--gold)' }}>{stats.totalRevenue.toLocaleString()}</div>
                  <div className="sc-lbl" style={{ fontSize: '11px', color: 'var(--t3)' }}>총 매출 (฿)</div>
                </div>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} onClick={() => setActivePage('sellers')}>
                  <div className="sc-icon" style={{ background: 'rgba(239,68,68,.15)', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⏳</div>
                  <div className="sc-val" style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'Outfit', sans-serif", color: 'var(--red)' }}>{stats.pendingSellersCount}</div>
                  <div className="sc-lbl" style={{ fontSize: '11px', color: 'var(--t3)' }}>승인 대기</div>
                </div>
              </div>

              {/* Pending approval alert banner */}
              {stats.pendingSellersCount > 0 && (
                <div style={{ display: 'flex', background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.3)', borderRadius: '16px', padding: '18px', marginBottom: '24px', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                  <span style={{ fontSize: '24px' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>판매자 승인 대기 중</div>
                    <div style={{ fontSize: '13px', color: 'var(--t2)' }}>
                      승인 대기 중인 판매자 계정이 있습니다.{' '}
                      <span style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }} onClick={() => setActivePage('sellers')}>
                        지금 확인하기 →
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Orders table */}
              <div className="card">
                <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, marginBottom: '18px', textAlign: 'left' }}>최근 주문 현황</h3>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>구매자</th>
                        <th>판매자</th>
                        <th>상품</th>
                        <th>금액</th>
                        <th>결제/수수료</th>
                        <th>날짜</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--t3)' }}>주문 내역이 없습니다.</td></tr>
                      ) : (
                        recentOrders.map((o) => {
                          const buyerName = o.buyer?.name || '—';
                          const sellerName = o.seller?.store_name || o.seller?.name || '—';
                          const isCOD = o.payment_method === 'cod';
                          const commAmount = o.commission_amount ? `฿${Number(o.commission_amount).toLocaleString()}` : '฿0';
                          return (
                            <tr key={o.id}>
                              <td style={{ fontWeight: 600 }}>{buyerName}</td>
                              <td>{sellerName}</td>
                              <td>
                                <div>{o.products?.title || '—'}</div>
                                {o.notes && <div style={{ fontSize: '10px', color: 'var(--purple-l)', marginTop: '2px', whiteSpace: 'normal', lineHeight: 1.2 }}>💬 {o.notes}</div>}
                              </td>
                              <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{formatPrice(o.total_price)}</td>
                              <td style={{ fontSize: '12px' }}>
                                <span style={{ color: isCOD ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{isCOD ? 'COD' : '온라인'}</span>
                                <br />
                                <small style={{ color: 'var(--t2)' }}>수수료: {commAmount}</small>
                              </td>
                              <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(o.created_at)}</td>
                              <td><span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusText(o.status).split(' ')[0]}</span></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== SELLERS PAGE ===== */}
        {activePage === 'sellers' && (
          <div className="animate-slide-up">
            <div className="main-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h1>💼 판매자 관리</h1>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge bg-yellow">대기 {pendingSellers.length}</span>
                <span className="badge bg-green">승인 {approvedSellers.length}</span>
              </div>
            </div>

            <div className="main-body" style={{ textAlign: 'left' }}>
              {/* Pending approvals */}
              <h3 style={{ fontFamily: "'Outfit', sans-serif'", fontWeight: 700, marginBottom: '14px' }}>⏳ 승인 대기</h3>
              <div className="tbl-wrap" style={{ marginBottom: '28px' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>전화번호</th>
                      <th>매장명/구분</th>
                      <th>지역/주소</th>
                      <th>가입일</th>
                      <th>처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSellers.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--t3)' }}>대기 중인 판매자가 없습니다. ✅</td></tr>
                    ) : (
                      pendingSellers.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600, color: 'var(--t1)' }}>{s.name}</td>
                          <td>+66 {s.phone}</td>
                          <td>
                            <b>{s.store_name || '—'}</b>
                            <br />
                            <span style={{ fontSize: '11px', color: 'var(--t2)' }}>{s.partner_type === 'subsidiary' ? '직영 자회사' : '협력사'}</span>
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--t2)' }}>
                            {s.location_province ? `${s.location_province} - ${s.location_district || ''}` : '정보 없음'}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(s.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn-sm btn-green" onClick={() => handleApproveSeller(s.id)}>✅ 승인</button>
                              <button className="btn-sm btn-red" onClick={() => handleRejectSeller(s.id)}>❌ 거절</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Approved sellers list */}
              <h3 style={{ fontFamily: "'Outfit', sans-serif'", fontWeight: 700, marginBottom: '14px' }}>✅ 승인된 판매자 (직영/협력사)</h3>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>매장 정보</th>
                      <th>담당자/연락처</th>
                      <th>파트너 구분</th>
                      <th>지역/주소</th>
                      <th>정산방식/수수료율</th>
                      <th>가입일</th>
                      <th>처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedSellers.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--t3)' }}>승인된 판매자가 없습니다.</td></tr>
                    ) : (
                      approvedSellers.map((s) => {
                        const locText = s.location_province ? `${s.location_province} - ${s.location_district || ''}` : '정보 없음';
                        const payoutText = s.payout_method === 'cod_commission' ? 'COD 수금 정산' : '본사 직접정산';
                        return (
                          <tr key={s.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--t1)' }}>{s.store_name || '—'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{s.description || ''}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{s.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--t3)' }}>+66 {s.phone}</div>
                            </td>
                            <td>
                              {s.partner_type === 'subsidiary' ? (
                                <span className="badge bg-blue">직영 자회사</span>
                              ) : (
                                <span className="badge bg-purple">입점 협력사</span>
                              )}
                            </td>
                            <td style={{ fontSize: '11px', color: 'var(--t2)' }}>
                              <div>📍 {locText}</div>
                              <div style={{ color: 'var(--t3)', marginTop: '2px' }}>{s.location_address ? s.location_address.slice(0, 16) + '...' : ''}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--gold)' }}>{s.commission_rate || '10.0'}%</div>
                              <div style={{ fontSize: '10px', color: 'var(--t2)' }}>{payoutText}</div>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(s.created_at)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <button className="btn-sm btn-purple" onClick={() => handleOpenPartnerConfig(s)}>⚙️ 설정</button>
                                <button className="btn-sm btn-green" onClick={() => handleResetPin(s.id, s.phone)}>🔑 PIN</button>
                                <button className="btn-sm btn-red" onClick={() => handleSuspendSeller(s.id)}>🚫 정지</button>
                                <button 
                                  className="btn-sm btn-red" 
                                  style={{ background: 'rgba(239,68,68,.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.2)' }}
                                  onClick={() => handleDeleteUser(s.id)}
                                >
                                  🗑️ 삭제
                                </button>
                              </div>
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
        )}

        {/* ===== BUYERS PAGE ===== */}
        {activePage === 'buyers' && (
          <div className="animate-slide-up">
            <div className="main-hd" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h1>👥 구매자 관리</h1>
            </div>

            <div className="main-body">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>전화번호</th>
                      <th>가입일</th>
                      <th>주문관리</th>
                      <th>처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyers.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--t3)' }}>구매자가 없습니다.</td></tr>
                    ) : (
                      buyers.map((b) => {
                        const orderCount = b.orders?.length || 0;
                        return (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 600, color: 'var(--t1)' }}>{b.name}</td>
                            <td>+66 {b.phone}</td>
                            <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(b.created_at)}</td>
                            <td>
                              <button 
                                className="btn-sm btn-purple" 
                                onClick={() => setSelectedBuyerForOrders({ id: b.id, name: b.name, orders: b.orders || [] })}
                              >
                                📦 주문 내역 ({orderCount}건)
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button className="btn-sm btn-green" onClick={() => handleResetPin(b.id, b.phone)}>🔑 PIN</button>
                                <button className="btn-sm btn-red" onClick={() => handleDeleteUser(b.id)}>🗑️ 삭제</button>
                              </div>
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
        )}

        {/* ===== PRODUCTS PAGE ===== */}
        {activePage === 'products' && (
          <div className="animate-slide-up">
            <div className="main-hd" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h1>📱 전체 상품 목록</h1>
            </div>

            <div className="main-body" style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)' }}>판매자 필터:</span>
                  <select 
                    value={productSellerFilter} 
                    onChange={(e) => setProductSellerFilter(e.target.value)}
                    className="form-input" 
                    style={{ width: '180px', padding: '8px 12px', fontSize: '13px' }}
                  >
                    <option value="all">전체 판매자</option>
                    {productSellerOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)' }}>카테고리 필터:</span>
                  <select 
                    value={productCategoryFilter} 
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="form-input" 
                    style={{ width: '180px', padding: '8px 12px', fontSize: '13px' }}
                  >
                    <option value="all">전체 카테고리</option>
                    <option value="iPhone">🍎 iPhone</option>
                    <option value="Samsung">🌟 Samsung</option>
                    <option value="Xiaomi">🔴 Xiaomi</option>
                    <option value="Other">📦 기타</option>
                  </select>
                </div>
              </div>

              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>상품명</th>
                      <th>등급</th>
                      <th>판매자</th>
                      <th>카테고리</th>
                      <th>가격</th>
                      <th>재고</th>
                      <th>상태</th>
                      <th>등록일</th>
                      <th>처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--t3)' }}>상품 내역이 없습니다.</td></tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const store = p.profiles?.store_name || p.profiles?.name || '—';
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, color: 'var(--t1)' }}>{p.title}</td>
                            <td><span className="badge bg-purple">{p.condition || 'Used S'}</span></td>
                            <td>{store}</td>
                            <td><span className="badge bg-gray">{p.category}</span></td>
                            <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{formatPrice(p.price)}</td>
                            <td>{p.stock}</td>
                            <td>
                              <span className={`badge ${p.status === 'active' ? 'bg-green' : 'bg-gray'}`}>
                                {p.status === 'active' ? '판매중' : p.status === 'hidden' ? '숨김' : p.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(p.created_at)}</td>
                            <td>
                              <button className="btn-sm btn-red" onClick={() => handleDeleteProduct(p.id)}>🗑️</button>
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
        )}

        {/* ===== ORDERS PAGE ===== */}
        {activePage === 'orders' && (
          <div className="animate-slide-up">
            <div className="main-hd" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h1>📦 전체 주문 및 수수료 정산</h1>
            </div>

            <div className="main-body" style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t2)' }}>판매자 필터:</span>
                <select 
                  value={orderSellerFilter}
                  onChange={(e) => setOrderSellerFilter(e.target.value)}
                  className="form-input" 
                  style={{ width: '220px', padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="all">전체 판매자</option>
                  {orderSellerOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="card" style={{ padding: '12px' }}>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>주문번호</th>
                        <th>구매자/배송지</th>
                        <th>판매자(정산처)</th>
                        <th>상품/수량</th>
                        <th>총금액</th>
                        <th>결제방식/수수료</th>
                        <th>정산상태</th>
                        <th>날짜</th>
                        <th>주문상태</th>
                        <th>주문관리</th>
                        <th>정산처리</th>
                        <th>삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr><td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--t3)' }}>주문 내역이 없습니다.</td></tr>
                      ) : (
                        filteredOrders.map((o) => {
                          const buyerName = o.buyer?.name || '—';
                          const buyerPhone = o.buyer?.phone ? '+66 ' + o.buyer.phone : '';
                          const delivery = o.delivery_address || '주소 정보 없음';
                          const store = o.seller?.store_name || o.seller?.name || '—';
                          const pType = o.seller?.partner_type === 'subsidiary' ? '직영' : '협력';
                          const isCOD = o.payment_method === 'cod';
                          const comm = o.commission_amount ? `฿${Number(o.commission_amount).toLocaleString()}` : '฿0';
                          
                          const depositRequired = isCOD ? Math.round(Number(o.total_price) * 0.03) : Number(o.total_price);
                          const depositConfirmedBadge = o.deposit_confirmed ? (
                            <div style={{ marginTop: '4px' }}><span className="badge bg-green" style={{ fontSize: '10px', padding: '2px 6px' }}>✅ 입금확인됨</span></div>
                          ) : (
                            <div style={{ marginTop: '4px' }}>
                              <span className="badge bg-yellow" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 700 }}>
                                ⏳ 대기: ฿{depositRequired.toLocaleString()} ({isCOD ? '3%' : '100%'})
                              </span>
                            </div>
                          );

                          let adminActions: React.ReactNode = '—';
                          if (o.status === 'pending') {
                            if (!o.deposit_confirmed) {
                              adminActions = (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <button className="btn-sm btn-green" style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--purple-l)', borderColor: 'var(--purple-l)' }} onClick={() => handleConfirmOrderDeposit(o.id)}>💰 입금 확인</button>
                                  <button className="btn-sm btn-red" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}>주문취소</button>
                                </div>
                              );
                            } else {
                              adminActions = (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <button className="btn-sm btn-green" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleUpdateOrderStatus(o.id, 'confirmed')}>수락/배송</button>
                                  <button className="btn-sm btn-red" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}>주문취소</button>
                                </div>
                              );
                            }
                          } else if (o.status === 'confirmed') {
                            adminActions = (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button className="btn-sm btn-blue" style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(34,211,238,.15)', color: 'var(--cyan)', border: '1px solid rgba(34,211,238,.3)' }} onClick={() => handleUpdateOrderStatus(o.id, 'completed')}>구매승인</button>
                                <button className="btn-sm btn-red" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}>반송/취소</button>
                              </div>
                            );
                          }

                          let payoutAmountText = null;
                          if (o.status === 'completed') {
                            const payoutAmount = isCOD 
                              ? Math.max(0, Math.round(Number(o.total_price) * 0.03) - Number(o.commission_amount))
                              : Number(o.total_price) - Number(o.commission_amount);
                            payoutAmountText = (
                              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', marginTop: '2px' }}>
                                정산액: ฿{payoutAmount.toLocaleString()}
                              </div>
                            );
                          }

                          return (
                            <tr key={o.id}>
                              <td style={{ fontSize: '11px', color: 'var(--t3)' }}>{o.id.slice(0, 8)}…</td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{buyerName}</div>
                                <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{buyerPhone}</div>
                                <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px', whiteSpace: 'normal', lineHeight: 1.2 }}>🏠 {delivery}</div>
                                {o.notes && <div style={{ fontSize: '10px', color: 'var(--purple-l)', marginTop: '4px', whiteSpace: 'normal', lineHeight: 1.2, background: 'rgba(139,92,246,0.06)', borderRadius: '4px', padding: '4px 6px' }}>💬 <b>요청:</b> {o.notes}</div>}
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{store}</div>
                                <span style={{ fontSize: '10px', color: 'var(--t2)' }}>({pType})</span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 500, fontSize: '12px' }}>{o.products?.title || '—'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{o.quantity} 개</div>
                              </td>
                              <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{formatPrice(o.total_price)}</td>
                              <td>
                                <span className={`badge ${isCOD ? 'bg-red' : 'bg-green'}`}>{isCOD ? 'COD 현장결제' : '온라인 송금'}</span>
                                {depositConfirmedBadge}
                                {o.slip_url ? (
                                  <div style={{ marginTop: '4px' }}>
                                    <a href={o.slip_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: 'var(--purple-d)', textDecoration: 'underline', fontSize: '11px' }}>
                                      📄 입금증 보기
                                    </a>
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--t3)' }}>📄 입금증 없음</div>
                                )}
                                <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>수수료: <b>{comm}</b></div>
                              </td>
                              <td>
                                <span className={`badge ${o.payout_status === 'completed' ? 'bg-green' : 'bg-yellow'}`}>
                                  {o.payout_status === 'completed' ? '정산완료' : '정산대기'}
                                </span>
                              </td>
                              <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(o.created_at)}</td>
                              <td><span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusText(o.status).split(' ')[0]}</span></td>
                              <td>{adminActions}</td>
                              <td>
                                {o.status === 'completed' && o.payout_status !== 'completed' ? (
                                  <button className="btn-sm btn-green" onClick={() => handleCompletePayout(o.id)}>정산처리</button>
                                ) : (
                                  '—'
                                )}
                                {payoutAmountText}
                              </td>
                              <td>
                                <button 
                                  className="btn-sm btn-red" 
                                  style={{ background: 'rgba(239,68,68,.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.2)' }}
                                  onClick={() => handleDeleteOrder(o.id)}
                                >
                                  🗑️ 삭제
                                </button>
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
          </div>
        )}

        {/* ===== CHAT ROOMS MANAGEMENT ===== */}
        {activePage === 'chat-rooms' && (
          <div className="animate-slide-up">
            <div className="main-hd" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h1>💬 채팅방 관리</h1>
            </div>

            <div className="main-body">
              <div className="card">
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>방 번호 (Room ID)</th>
                        <th>관련 상품</th>
                        <th>구매자</th>
                        <th>판매자</th>
                        <th>마지막 대화일</th>
                        <th>처리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chatRooms.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--t3)' }}>채팅방 내역이 없습니다.</td></tr>
                      ) : (
                        chatRooms.map((r) => {
                          const buyerInfo = r.buyer ? (
                            <div>
                              <b>{r.buyer.name}</b>
                              <br />
                              <small style={{ color: 'var(--t2)' }}>+66 {r.buyer.phone}</small>
                            </div>
                          ) : '—';
                          const sellerStore = r.seller?.store_name || r.seller?.name || '—';
                          const sellerInfo = r.seller ? (
                            <div>
                              <b>{sellerStore}</b>
                              <br />
                              <small style={{ color: 'var(--t2)' }}>+66 {r.seller.phone}</small>
                            </div>
                          ) : '—';

                          return (
                            <tr key={r.id}>
                              <td style={{ fontSize: '11px', color: 'var(--t3)' }}>
                                {r.id.slice(0, 8)}…<br /><small style={{ color: 'var(--t3)' }}>{r.id}</small>
                              </td>
                              <td style={{ fontWeight: 600 }}>{r.products?.title || '—'}</td>
                              <td>{buyerInfo}</td>
                              <td>{sellerInfo}</td>
                              <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(r.updated_at || r.created_at)}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button className="btn-sm btn-purple" onClick={() => handleViewChatHistory(r)}>💬 대화 보기</button>
                                  <button className="btn-sm btn-red" onClick={() => handleDeleteChatRoom(r.id)}>🗑️ 삭제</button>
                                </div>
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
          </div>
        )}

        {/* ===== CHAT MEDIA MANAGEMENT ===== */}
        {activePage === 'media' && (
          <div className="animate-slide-up">
            <div className="main-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
              <h1>🖼️ 채팅 미디어 관리</h1>
              <span className="badge bg-purple">{chatMedia.length}개</span>
            </div>

            <div className="main-body" style={{ textAlign: 'left' }}>
              <div className="card" style={{ padding: '18px', marginBottom: '20px', background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed var(--border2)', fontSize: '13px', color: 'var(--t2)', lineHeight: '1.5' }}>
                💡 대화방에 업로드된 사진 및 동영상을 오래된 순으로 검토하고 수동으로 영구 삭제하여 서버 스토리지 용량을 확보할 수 있습니다.
              </div>

              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>미디어 파일</th>
                      <th>유형</th>
                      <th>대화방 정보</th>
                      <th>등록한 사람</th>
                      <th>등록 날짜</th>
                      <th>처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chatMedia.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '35px', color: 'var(--t3)' }}>미디어가 존재하지 않습니다.</td></tr>
                    ) : (
                      chatMedia.map((m) => {
                        const typeText = m.message_type === 'image' ? '📸 이미지' : '🎥 비디오';
                        const fileUrl = m.media_url || m.message;
                        const senderName = m.profiles?.name || '—';
                        const senderPhone = m.profiles?.phone ? '+66 ' + m.profiles.phone : '';

                        let previewHtml = null;
                        if (m.message_type === 'image') {
                          previewHtml = (
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                              <img src={fileUrl} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                            </a>
                          );
                        } else {
                          previewHtml = (
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '16px' }}>
                              🎬
                            </a>
                          );
                        }

                        const roomInfo = m.room ? (
                          <div>
                            <div><b>{m.room.products?.title || '상품 정보 없음'}</b></div>
                            <small style={{ color: 'var(--t3)', display: 'block', marginTop: '2px' }}>
                              구매: {m.room.buyer?.name || '—'} / 판매: {m.room.seller?.store_name || m.room.seller?.name || '—'}
                            </small>
                          </div>
                        ) : <span style={{ color: 'var(--t3)' }}>대화방 정보 없음</span>;

                        return (
                          <tr key={m.id}>
                            <td>{previewHtml}</td>
                            <td><span className={`badge ${m.message_type === 'image' ? 'bg-purple' : 'bg-blue'}`}>{typeText}</span></td>
                            <td>{roomInfo}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{senderName}</div>
                              <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{senderPhone}</div>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(m.created_at)}</td>
                            <td>
                              <button className="btn-sm btn-red" onClick={() => handleDeleteChatMedia(m.id, fileUrl)}>🗑️ 삭제</button>
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
        )}
      </main>

      {/* PARTNER CONFIG MODAL */}
      {selectedSellerForConfig && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <span className="modal-title">🏪 판매 파트너 설정</span>
              <button className="modal-x" onClick={() => setSelectedSellerForConfig(null)}>✕</button>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">매장명</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={selectedSellerForConfig.store_name || selectedSellerForConfig.name} 
                  disabled 
                  style={{ opacity: 0.7 }} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">파트너 구분</label>
                <select 
                  className="form-input" 
                  value={confPartnerType}
                  onChange={(e) => setConfPartnerType(e.target.value)}
                >
                  <option value="subsidiary">본사 직영점 (자회사)</option>
                  <option value="partner">외부 입점 대리점 (협력사)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">수수료율 (%)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    step="0.1" 
                    value={confCommRate}
                    onChange={(e) => setConfCommRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">정산 방식</label>
                  <select 
                    className="form-input"
                    value={confPayoutMethod}
                    onChange={(e) => setConfPayoutMethod(e.target.value)}
                  >
                    <option value="parent_payment">플랫폼 직접 수금 후 정산</option>
                    <option value="cod_commission">COD 배송후 협력사에서 송금</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">매장 소속 지역 (Province)</label>
                <select 
                  className="form-input"
                  value={confProvince}
                  onChange={(e) => setConfProvince(e.target.value)}
                >
                  <option value="">선택해주세요</option>
                  {THAILAND_PROVINCES.map(p => (
                    <option key={p.id} value={p.name_en}>{p.name_en} ({p.name_th})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">매장 소속 구/군 (District)</label>
                <select 
                  className="form-input"
                  value={confDistrict}
                  onChange={(e) => setConfDistrict(e.target.value)}
                  disabled={!confProvince}
                >
                  <option value="">선택해주세요</option>
                  {districtsList.map(d => (
                    <option key={d.id} value={d.name_en}>{d.name_en} ({d.name_th})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">매장 주소</label>
                <textarea 
                  className="form-textarea"
                  value={confAddress}
                  onChange={(e) => setConfAddress(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">지도 GPS 좌표</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="예: 13.7563, 100.5018"
                  value={confCoords}
                  onChange={(e) => setConfCoords(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn-submit" onClick={handleSavePartnerConfig} style={{ flex: 1, margin: 0 }}>💾 설정 저장</button>
              <button className="btn-sm btn-red" onClick={() => setSelectedSellerForConfig(null)} style={{ padding: '14px 20px', borderRadius: 'var(--r)' }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* BUYER ORDERS LIST MODAL */}
      {selectedBuyerForOrders && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal animate-slide-up" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <span className="modal-title">📦 {selectedBuyerForOrders.name}님의 주문 내역</span>
              <button className="modal-x" onClick={() => setSelectedBuyerForOrders(null)}>✕</button>
            </div>
            <div className="tbl-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>주문일자</th>
                    <th>상품명</th>
                    <th>총 금액</th>
                    <th>상태</th>
                    <th>주문관리</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBuyerForOrders.orders.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>주문 내역이 없습니다.</td></tr>
                  ) : (
                    [...selectedBuyerForOrders.orders]
                      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((o: any) => {
                        const isCOD = o.payment_method === 'cod';
                        const depositRequired = isCOD ? Math.round(Number(o.total_price) * 0.03) : Number(o.total_price);
                        
                        let actionButtons: React.ReactNode = '—';
                        if (o.status === 'pending') {
                          if (!o.deposit_confirmed) {
                            actionButtons = (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn-sm btn-green" style={{ background: 'var(--purple-l)', borderColor: 'var(--purple-l)' }} onClick={() => handleConfirmOrderDeposit(o.id)}>💰 입금 확인</button>
                                <button className="btn-sm btn-red" onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}>취소</button>
                              </div>
                            );
                          } else {
                            actionButtons = (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn-sm btn-green" onClick={() => handleUpdateOrderStatus(o.id, 'confirmed')}>수락/배송</button>
                                <button className="btn-sm btn-red" onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}>취소</button>
                              </div>
                            );
                          }
                        } else if (o.status === 'confirmed') {
                          actionButtons = (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="btn-sm btn-blue" style={{ background: 'rgba(34,211,238,.15)', color: 'var(--cyan)', border: '1px solid rgba(34,211,238,.3)' }} onClick={() => handleUpdateOrderStatus(o.id, 'completed')}>구매승인</button>
                              <button className="btn-sm btn-red" onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}>반송/취소</button>
                            </div>
                          );
                        }

                        return (
                          <tr key={o.id}>
                            <td style={{ fontSize: '12px', color: 'var(--t3)' }}>{formatDate(o.created_at)}</td>
                            <td style={{ fontWeight: 600, textAlign: 'left' }}>
                              <div>{o.products?.title || '알 수 없는 상품'}</div>
                              {o.notes && <div style={{ fontSize: '10px', color: 'var(--purple-l)', marginTop: '2px', lineHeight: 1.2 }}>💬 {o.notes}</div>}
                              {o.slip_url && <div style={{ fontSize: '10px', color: 'var(--purple-d)', marginTop: '2px' }}>📄 <a href={o.slip_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', fontWeight: 700 }}>입금증 보기</a></div>}
                            </td>
                            <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{formatPrice(o.total_price)}</td>
                            <td><span className={`badge ${getStatusBadgeClass(o.status)}`}>{getStatusText(o.status).split(' ')[0]}</span></td>
                            <td>{actionButtons}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-sm btn-red" onClick={() => setSelectedBuyerForOrders(null)} style={{ padding: '10px 20px', borderRadius: 'var(--r)' }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT HISTORY VIEWER MODAL */}
      {selectedChatRoomForHistory && (
        <div className="modal-bg open" style={{ display: 'flex', zIndex: 3000 }}>
          <div className="modal" style={{ maxWidth: '600px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd">
              <span className="modal-title">{selectedChatRoomForHistory.buyerName} &amp; {selectedChatRoomForHistory.sellerName} 대화 기록</span>
              <button className="modal-x" onClick={() => setSelectedChatRoomForHistory(null)}>✕</button>
            </div>
            <div 
              style={{ maxHeight: '450px', overflowY: 'auto', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}
            >
              {loadingChatHistory ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>대화 내용을 가져오는 중...</div>
              ) : chatMessagesHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>나눈 메시지가 없습니다.</div>
              ) : (
                chatMessagesHistory.map((m) => {
                  const sender = m.profiles?.name || '알수없음';
                  const isSeller = m.profiles?.role === 'seller';
                  const fileUrl = m.media_url || m.message;
                  return (
                    <div key={m.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', boxShadow: 'var(--shadow)', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(0,0,0,0.05)', paddingBottom: '4px', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px' }}>
                          <span style={{ fontSize: '10px', color: isSeller ? 'var(--purple-l)' : 'var(--cyan)', background: isSeller ? 'rgba(139,92,246,.15)' : 'rgba(34,211,238,.15)', padding: '1px 4px', borderRadius: '4px', marginRight: '4px' }}>
                            {isSeller ? '판매자' : '구매자'}
                          </span>
                          {sender}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--t3)' }}>
                          {new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      {m.message_type === 'image' ? (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          <img src={fileUrl} alt="Attachment" style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', display: 'block', marginTop: '4px' }} />
                        </a>
                      ) : m.message_type === 'video' ? (
                        <video src={fileUrl} controls style={{ maxWidth: '240px', borderRadius: '6px', marginTop: '4px', display: 'block' }} />
                      ) : (
                        <div style={{ marginTop: '2px', wordBreak: 'break-all', fontSize: '13px' }}>{m.message}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-sm btn-red" onClick={() => setSelectedChatRoomForHistory(null)} style={{ padding: '10px 20px', borderRadius: 'var(--r)' }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div 
          className="toast show" 
          style={{
            position: 'fixed',
            bottom: '30px',
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
    </div>
  );
}
