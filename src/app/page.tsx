'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { formatPrice, resizeAndCompressImage } from '@/lib/utils';
import MobileLayout from '@/components/MobileLayout';
import Navbar from '@/components/Navbar';
import BottomNav, { TabName } from '@/components/BottomNav';
import DetailModal from '@/components/DetailModal';
import OrderModal from '@/components/OrderModal';
import ChatModal from '@/components/ChatModal';

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<TabName>('shop');

  // Auth / User State
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Stats States
  const [stats, setStats] = useState({ productsCount: 0, sellersCount: 0 });

  // Filters State
  const [activeShopFilter, setActiveShopFilter] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Search Tab States
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchProvince, setSearchProvince] = useState('all');
  const [searchMinPrice, setSearchMinPrice] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');

  // Cart States
  const [cartItems, setCartItems] = useState<{ product_id: string; quantity: number }[]>([]);
  const [cartProducts, setCartProducts] = useState<any[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);

  // My Page / History States
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [myInquiries, setMyInquiries] = useState<any[]>([]);
  const [orderTracker, setOrderTracker] = useState({
    unpaid: 0,
    paid: 0,
    shipping: 0,
    completed: 0,
    returned: 0,
  });

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [activeChatRoom, setActiveChatRoom] = useState<any>(null);

  // Toast / Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Show Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // 1. Init Session & Auth Listener
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
        setMyOrders([]);
        setMyInquiries([]);
        setOrderTracker({ unpaid: 0, paid: 0, shipping: 0, completed: 0, returned: 0 });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Profile Details
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setUserProfile(data);
      }
    } catch (e) {
      console.error('Profile fetch failed:', e);
    }
  };

  // 2. Fetch General Data (Shops, Stats, Products)
  const fetchGeneralData = useCallback(async () => {
    try {
      // Fetch stats counts
      const [pCount, sCount] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller').eq('is_approved', true)
      ]);
      setStats({
        productsCount: pCount.count || 0,
        sellersCount: sCount.count || 0,
      });

      // Fetch approved seller list
      const { data: sellersData } = await supabase
        .from('profiles')
        .select('id, name, store_name, profile_image, description, partner_type, location_province, location_district, location_address, location_coords, commission_rate, payout_method')
        .eq('role', 'seller')
        .eq('is_approved', true);
      setShops(sellersData || []);

    } catch (e) {
      console.error('General data fetch failed:', e);
    }
  }, []);

  useEffect(() => {
    fetchGeneralData();
  }, [fetchGeneralData]);

  // Load Products (filtered by shop & category)
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      let query = supabase
        .from('products')
        .select('id, title, description, price, images, category, seller_id, condition, stock, status, profiles(id, name, store_name, partner_type, location_province, location_district, location_address, location_coords)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }
      if (activeShopFilter !== 'all') {
        query = query.eq('seller_id', activeShopFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        setProducts(data);
      }
    } catch (e) {
      console.error('Products fetch failed:', e);
    } finally {
      setLoadingProducts(false);
    }
  }, [activeCategory, activeShopFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 3. User Specific Data (Orders, Chat Rooms, Tracker)
  const fetchUserInquiries = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*, products(title), seller:profiles!chat_rooms_seller_id_fkey(name, store_name, profile_image), chat_messages(id, is_read, sender_id)')
        .eq('buyer_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setMyInquiries(data);
      }
    } catch (e) {
      console.error('Inquiries fetch failed:', e);
    }
  }, [user]);

  const fetchUserOrders = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, products(title, images, price), seller:profiles!orders_seller_id_fkey(store_name, phone)')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyOrders(data);

        // Update Tracker status metrics
        let unpaid = 0;
        let paid = 0;
        let shipping = 0;
        let completed = 0;
        let returned = 0;

        data.forEach((o: any) => {
          if (o.status === 'pending') {
            if (o.deposit_confirmed) paid++;
            else unpaid++;
          } else if (o.status === 'confirmed') {
            shipping++;
          } else if (o.status === 'completed') {
            completed++;
          } else if (o.status === 'cancelled') {
            returned++;
          }
        });

        setOrderTracker({ unpaid, paid, shipping, completed, returned });
      }
    } catch (e) {
      console.error('Orders fetch failed:', e);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserOrders();
      fetchUserInquiries();
    }
  }, [user, fetchUserOrders, fetchUserInquiries]);

  // Realtime subscription for order tracker updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_orders_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          fetchUserOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserOrders]);

  // 4. Cart Core Management (localStorage persist)
  const getCartFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('iris_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }, []);

  const saveCartToStorage = (cart: { product_id: string; quantity: number }[]) => {
    setCartItems(cart);
    localStorage.setItem('iris_cart', JSON.stringify(cart));
  };

  useEffect(() => {
    setCartItems(getCartFromStorage());
  }, [getCartFromStorage]);

  // Sync Cart Products (load product info when tab is cart)
  const fetchCartProducts = useCallback(async () => {
    if (cartItems.length === 0) {
      setCartProducts([]);
      return;
    }
    setLoadingCart(true);
    try {
      const prodIds = cartItems.map(item => item.product_id);
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, images, category, condition, stock, seller_id, status, profiles(store_name, name)')
        .in('id', prodIds);

      if (!error && data) {
        setCartProducts(data);
      }
    } catch (e) {
      console.error('Cart products fetch failed:', e);
    } finally {
      setLoadingCart(false);
    }
  }, [cartItems]);

  useEffect(() => {
    if (activeTab === 'cart') {
      fetchCartProducts();
    }
  }, [activeTab, fetchCartProducts]);

  // Cart Actions
  const handleAddToCart = (product: any) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    const cart = getCartFromStorage();
    const existing = cart.find((item: any) => item.product_id === product.id);

    if (existing) {
      if (existing.quantity >= (product.stock || 1)) {
        showToast(t('toast_out_of_stock'), 'error');
        return;
      }
      existing.quantity += 1;
    } else {
      cart.push({ product_id: product.id, quantity: 1 });
    }
    saveCartToStorage(cart);
    showToast(t('toast_added_to_cart'), 'success');
    setSelectedProduct(null); // Close modal
  };

  const handleRemoveFromCart = (productId: string) => {
    const cart = getCartFromStorage().filter((item: any) => item.product_id !== productId);
    saveCartToStorage(cart);
    showToast(t('toast_cart_item_removed') || 'Item removed', 'success');
  };

  const handleUpdateCartQty = async (productId: string, delta: number) => {
    const cart = getCartFromStorage();
    const item = cart.find((i: any) => i.product_id === productId);
    if (!item) return;

    // Check stock limit dynamically
    const prodInfo = cartProducts.find(p => p.id === productId);
    const maxStock = prodInfo ? prodInfo.stock : 1;

    item.quantity += delta;
    if (item.quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    if (item.quantity > maxStock) {
      item.quantity = maxStock;
      showToast(t('toast_out_of_stock'), 'error');
    }
    saveCartToStorage(cart);
  };

  // Cart total count helper for navbar badge
  const cartBadgeCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // 5. Search Filters Compute
  const filteredSearchProducts = useMemo(() => {
    if (activeTab !== 'search') return [];
    
    return products.filter((p) => {
      // Keyword match
      if (searchKeyword.trim()) {
        const keyword = searchKeyword.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(keyword);
        const matchesDesc = p.description?.toLowerCase().includes(keyword);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Province filter match
      if (searchProvince !== 'all') {
        const prov = p.profiles?.location_province;
        if (prov !== searchProvince) return false;
      }

      // Price range match
      if (searchMinPrice) {
        if (Number(p.price) < Number(searchMinPrice)) return false;
      }
      if (searchMaxPrice) {
        if (Number(p.price) > Number(searchMaxPrice)) return false;
      }

      return true;
    });
  }, [activeTab, products, searchKeyword, searchProvince, searchMinPrice, searchMaxPrice]);

  // Get list of provinces from active partner shops for location dropdown
  const provincesList = useMemo(() => {
    return [...new Set(shops.map((s) => s.location_province).filter(Boolean))];
  }, [shops]);

  // 6. Checkout & Order Flow
  const handleBuyNow = (product: any) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setSelectedProduct(null);
    setCheckoutItems([product]);
    setIsOrderOpen(true);
  };

  const handleCartCheckoutAll = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    // Prepare items list from cartProducts matching cartItems
    const items = cartItems.map((c) => {
      const p = cartProducts.find((prod) => prod.id === c.product_id);
      if (p) {
        return {
          ...p,
          quantity: c.quantity
        };
      }
      return null;
    }).filter(Boolean);

    if (items.length === 0) return;
    
    setCheckoutItems(items);
    setIsOrderOpen(true);
  };

  const handleOrderSubmit = async (orderData: any, slip: File | null) => {
    if (!user) return;

    try {
      let slipUrl: string | null = null;
      if (slip) {
        const compressed = await resizeAndCompressImage(slip, 1000, 0.75);
        const ext = slip.name.split('.').pop() || 'jpg';
        const slipPath = `slips/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('products')
          .upload(slipPath, compressed);

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('products')
          .getPublicUrl(slipPath);

        slipUrl = urlData.publicUrl;
      }

      const fullAddr = `${orderData.province} - ${orderData.district} - ${orderData.address}`;
      const isBulk = checkoutItems.length > 1;

      // Calculate total notes prepending carrier if online payment
      let finalNotes = orderData.notes;
      if (orderData.payment_method === 'online') {
        finalNotes = `[배송사/Carrier: ${orderData.carrier}] ${finalNotes}`;
      }

      if (isBulk) {
        // Stock Double-Check
        const prodIds = checkoutItems.map(item => item.id);
        const { data: dbProds } = await supabase.from('products').select('id, stock, status, title').in('id', prodIds);
        
        for (const item of checkoutItems) {
          const p = dbProds?.find(prod => prod.id === item.id);
          if (!p || p.status !== 'active' || p.stock < item.quantity) {
            showToast(`${t('toast_out_of_stock')} (${p ? p.title : ""})`, 'error');
            return;
          }
        }

        // Insert Bulk Orders
        const orderPayloads = checkoutItems.map((item) => {
          const totalAmt = item.price * item.quantity;
          const commAmt = Math.min(totalAmt * 0.03, 400); // 3% escrow fee capped at ฿400

          return {
            buyer_id: user.id,
            seller_id: item.seller_id,
            product_id: item.id,
            quantity: item.quantity,
            total_price: totalAmt,
            notes: finalNotes || null,
            payment_method: orderData.payment_method,
            commission_amount: commAmt,
            payout_status: 'pending',
            delivery_address: fullAddr,
            deposit_confirmed: false,
            slip_url: slipUrl,
            status: 'pending'
          };
        });

        const { error: dbErr } = await supabase.from('orders').insert(orderPayloads);
        if (dbErr) throw dbErr;

        // Clear cart
        saveCartToStorage([]);
      } else {
        // Single Item Checkout
        const target = checkoutItems[0];
        const { data: dbProd } = await supabase.from('products').select('stock, status').eq('id', target.id).single();
        if (!dbProd || dbProd.status !== 'active' || dbProd.stock < orderData.quantity) {
          showToast(t('toast_out_of_stock'), 'error');
          return;
        }

        const totalAmt = target.price * orderData.quantity;
        const commAmt = Math.min(totalAmt * 0.03, 400);

        const { error: dbErr } = await supabase.from('orders').insert({
          buyer_id: user.id,
          seller_id: target.seller_id,
          product_id: target.id,
          quantity: orderData.quantity,
          total_price: totalAmt,
          notes: finalNotes || null,
          payment_method: orderData.payment_method,
          commission_amount: commAmt,
          payout_status: 'pending',
          delivery_address: fullAddr,
          deposit_confirmed: false,
          slip_url: slipUrl,
          status: 'pending'
        });

        if (dbErr) throw dbErr;
      }

      // Update buyer profile address details for future orders auto-fill
      await supabase
        .from('profiles')
        .update({
          location_province: orderData.province,
          location_district: orderData.district,
          location_address: orderData.address
        })
        .eq('id', user.id);

      showToast(t('success_order'), 'success');
      setIsOrderOpen(false);

      // Refresh data
      fetchProducts();
      fetchUserOrders();
    } catch (err: any) {
      console.error(err);
      showToast(t('error_occurred') + (err.message || err.toString()), 'error');
    }
  };

  // 7. My Page Order Cancellation / Receipt Confirmation / Return Handler
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(t('confirm_cancel_order') || '정말 이 주문을 취소하시겠습니까? 상품 재고가 즉시 복구됩니다.')) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      showToast(t('toast_order_cancelled') || '❌ 주문이 취소되었습니다.', 'success');
      fetchUserOrders();
    } catch (e: any) {
      showToast(t('error_occurred') + e.message, 'error');
    }
  };

  const handleConfirmOrderReceipt = async (orderId: string) => {
    if (!confirm('상품을 무사히 받으셨습니까? 구매 확정 후에는 거래가 취소되지 않습니다.')) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;
      showToast(t('toast_order_completed') || '✅ 구매 확정이 완료되었습니다. 감사합니다!', 'success');
      fetchUserOrders();
    } catch (e: any) {
      showToast(t('error_occurred') + e.message, 'error');
    }
  };

  const handleReturnOrder = async (orderId: string) => {
    if (!confirm('정말 이 주문을 반송/거절하시겠습니까? 상품 재고가 즉시 복구됩니다.')) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      showToast(t('toast_order_returned') || '❌ 주문이 거절 및 반송되었습니다.', 'success');
      fetchUserOrders();
    } catch (e: any) {
      showToast(t('error_occurred') + e.message, 'error');
    }
  };

  const handleUploadSlipLater = async (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    showToast(t('loading') || '처리 중...', 'info');
    try {
      const compressed = await resizeAndCompressImage(file, 1000, 0.75);
      const ext = file.name.split('.').pop() || 'jpg';
      const slipPath = `slips/${user.id}/${orderId}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('products').upload(slipPath, compressed);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(slipPath);
      const slipUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from('orders')
        .update({ slip_url: slipUrl })
        .eq('id', orderId);

      if (dbErr) throw dbErr;

      showToast(t('toast_slip_uploaded') || '✅ 입금증이 등록되었습니다!', 'success');
      fetchUserOrders();
    } catch (err: any) {
      console.error(err);
      showToast(t('error_occurred') + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

  // 8. Chat Room Management (Initiate & Open chat)
  const handleOpenChat = async (product: any) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (user.id === product.seller_id) {
      showToast(t('toast_own_product_chat_error'), 'error');
      return;
    }

    try {
      // Find existing chat room
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', product.seller_id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      let roomId = room?.id;

      // Create new chat room if not exists
      if (!roomId) {
        const { data: newRoom, error: createErr } = await supabase
          .from('chat_rooms')
          .insert({
            buyer_id: user.id,
            seller_id: product.seller_id,
            product_id: product.id,
          })
          .select('id')
          .single();

        if (createErr) throw createErr;
        roomId = newRoom.id;
      }

      // Format room data for ChatModal
      const sellerStoreName = product.profiles?.store_name || product.profiles?.name || 'Seller';
      const chatRoomObj = {
        id: roomId,
        buyer_id: user.id,
        seller_id: product.seller_id,
        product_id: product.id,
        partner_store_name: sellerStoreName,
        product_title: product.title,
      };

      // Mark unread messages in this room as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      setSelectedProduct(null); // Close details modal
      setActiveChatRoom(chatRoomObj);

    } catch (err: any) {
      console.error(err);
      showToast(t('chat_load_failed') + ': ' + err.message, 'error');
    }
  };

  // Open Chat Room from My Page's Inquiry List
  const handleOpenInquiryChat = async (roomObj: any) => {
    if (!user) return;
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomObj.id)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      const sellerStoreName = roomObj.seller?.store_name || roomObj.seller?.name || 'Seller';
      const formattedRoom = {
        id: roomObj.id,
        buyer_id: roomObj.buyer_id,
        seller_id: roomObj.seller_id,
        product_id: roomObj.product_id,
        partner_store_name: sellerStoreName,
        product_title: roomObj.products?.title || t('product_inquiry'),
      };

      setActiveChatRoom(formattedRoom);
    } catch (e) {
      console.error(e);
    }
  };

  // 9. Logout Helper
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const getAvatarEmoji = (name: string) => {
    return ['👨', '👩', '🧑', '👦', '👧', '🧔'][name ? name.charCodeAt(0) % 6 : 0];
  };

  const getCategoryIcon = (cat: string) => {
    const map: Record<string, string> = { iPhone: '🍎', Samsung: '🌟', Xiaomi: '🔴', Other: '📦' };
    return map[cat] || '📱';
  };

  return (
    <MobileLayout>
      <Navbar onLogoClick={() => setActiveTab('shop')} />

      {/* ==================== VIEW 1: SHOP (MAIN) ==================== */}
      {activeTab === 'shop' && (
        <div className="view-section active animate-slide-up">
          {/* HERO */}
          <section className="hero">
            <div className="hero-bg" />
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="hero-content">
              <div className="hero-badge">{t('hero_badge')}</div>
              <h1 className="hero-title">
                Buy & Sell<br />
                <span className="grad">iPhone &amp; Galaxy</span><br />
                in Thailand
              </h1>
              <p className="hero-sub">{t('hero_sub')}</p>
              
              <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: '320px', margin: '0 auto' }}>
                <div onClick={() => setActiveTab('search')} style={{ cursor: 'pointer' }}>
                  <div className="stat-num">{stats.productsCount}</div>
                  <div className="stat-lbl">{t('stat_products')}</div>
                </div>
                <div>
                  <div className="stat-num">{stats.sellersCount}</div>
                  <div className="stat-lbl">{t('stat_sellers')}</div>
                </div>
              </div>
            </div>
          </section>

          {/* BUYER ORDER TRACKER CARD */}
          {user && (
            <div className="card" style={{ margin: '16px', padding: '16px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📦 {t('order_status_tracking')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center' }}>
                <div onClick={() => setActiveTab('mypage')} style={{ cursor: 'pointer' }}>
                  <div className="tracker-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--purple-l)' }}>{orderTracker.unpaid}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t2)', marginTop: '4px' }}>{t('track_unpaid')}</div>
                </div>
                <div onClick={() => setActiveTab('mypage')} style={{ cursor: 'pointer' }}>
                  <div className="tracker-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold)' }}>{orderTracker.paid}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t2)', marginTop: '4px' }}>{t('track_paid')}</div>
                </div>
                <div onClick={() => setActiveTab('mypage')} style={{ cursor: 'pointer' }}>
                  <div className="tracker-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cyan)' }}>{orderTracker.shipping}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t2)', marginTop: '4px' }}>{t('track_shipping')}</div>
                </div>
                <div onClick={() => setActiveTab('mypage')} style={{ cursor: 'pointer' }}>
                  <div className="tracker-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green)' }}>{orderTracker.completed}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t2)', marginTop: '4px' }}>{t('track_completed')}</div>
                </div>
                <div onClick={() => setActiveTab('mypage')} style={{ cursor: 'pointer' }}>
                  <div className="tracker-num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--red)' }}>{orderTracker.returned}</div>
                  <div style={{ fontSize: '9px', color: 'var(--t2)', marginTop: '4px' }}>{t('track_returned')}</div>
                </div>
              </div>
            </div>
          )}

          {/* REVIEWS PLACEHOLDER CARD */}
          <div 
            className="card" 
            style={{ margin: '16px', padding: '14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left' }}
            onClick={() => showToast('리뷰 게시판 기능 준비 중입니다! / Review Board Coming Soon!', 'success')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple-l)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⭐ <span>고객 후기 / Reviews</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--t3)' }}>더보기 / View All ▶</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '6px', fontStyle: 'italic', lineHeight: 1.4 }}>
              "본사 안심 거래 덕분에 너무 믿음직스러워요! 태국 최고 중고폰 플랫폼 추천합니다." - Areeya K. (★5)
            </div>
          </div>

          {/* PARTNER SHOPS HORIZONTAL LIST */}
          <section className="section" style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <div className="sec-head" style={{ marginBottom: '15px', textAlign: 'left', padding: '0 8px' }}>
              <div className="sec-label">{t('shops_title')}</div>
            </div>
            <div className="shop-logo-list">
              <div 
                className={`shop-logo-item ${activeShopFilter === 'all' ? 'active' : ''}`} 
                onClick={() => setActiveShopFilter('all')}
              >
                <div className="shop-logo-circle">🛍️</div>
                <div className="shop-logo-name">{t('all_categories')}</div>
              </div>
              {shops.map((s) => {
                const isSelected = activeShopFilter === s.id;
                const name = s.store_name || s.name;
                return (
                  <div 
                    key={s.id} 
                    className={`shop-logo-item ${isSelected ? 'active' : ''}`} 
                    onClick={() => setActiveShopFilter(s.id)}
                  >
                    <div className="shop-logo-circle">
                      {s.profile_image ? (
                        <img src={s.profile_image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getAvatarEmoji(name)
                      )}
                    </div>
                    <div className="shop-logo-name">{name}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* PRODUCTS LIST GRID */}
          <section className="section section-alt">
            <div className="sec-head">
              <h2 className="sec-title">{t('all_categories')}</h2>
            </div>
            <div className="cat-filter">
              <button 
                className={`cat-btn ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                {t('all_categories')}
              </button>
              <button 
                className={`cat-btn ${activeCategory === 'iPhone' ? 'active' : ''}`}
                onClick={() => setActiveCategory('iPhone')}
              >
                🍎 iPhone
              </button>
              <button 
                className={`cat-btn ${activeCategory === 'Samsung' ? 'active' : ''}`}
                onClick={() => setActiveCategory('Samsung')}
              >
                🌟 Samsung
              </button>
              <button 
                className={`cat-btn ${activeCategory === 'Xiaomi' ? 'active' : ''}`}
                onClick={() => setActiveCategory('Xiaomi')}
              >
                🔴 Xiaomi
              </button>
              <button 
                className={`cat-btn ${activeCategory === 'Other' ? 'active' : ''}`}
                onClick={() => setActiveCategory('Other')}
              >
                기타
              </button>
            </div>

            {loadingProducts ? (
              <div className="empty">
                <div className="empty-ico">📱</div>
                <div className="empty-ttl">{t('loading')}</div>
              </div>
            ) : products.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">📱</div>
                <div className="empty-ttl">등록된 상품이 없습니다.</div>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((p) => {
                  const sName = p.profiles?.store_name || p.profiles?.name || t('role_seller');
                  const conditionKey = 'condition_' + (p.condition ? p.condition.toLowerCase().replace(' ', '') : 's');
                  return (
                    <div 
                      key={p.id} 
                      className="product-card animate-slide-up"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <div className="p-img">
                        {p.images && p.images.length > 0 ? (
                          <img src={p.images[0]} alt={p.title} />
                        ) : (
                          getCategoryIcon(p.category)
                        )}
                        <span className="p-badge">{t(conditionKey)}</span>
                      </div>
                      <div className="p-info">
                        <div className="p-seller">🏪 {sName}</div>
                        <div className="p-title">{p.title}</div>
                        <div className="p-price">
                          {formatPrice(p.price)} <small>THB</small>
                        </div>
                        <button 
                          className="btn-buy"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                          }}
                        >
                          {t('btn_buy')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== VIEW 2: SEARCH ==================== */}
      {activeTab === 'search' && (
        <div className="view-section active animate-slide-up">
          <section className="section">
            <div className="sec-head" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <h2 className="sec-title">{t('tab_search')}</h2>
            </div>

            {/* Keyword Search */}
            <div className="search-row" style={{ marginBottom: '14px' }}>
              <input 
                type="text" 
                className="search-in" 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={t('search_placeholder')} 
              />
            </div>

            {/* Province location filter */}
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--t2)', fontWeight: 700, minWidth: '60px' }}>
                {t('search_location_label') || '지역 필터:'}
              </span>
              <select 
                className="form-input" 
                value={searchProvince}
                onChange={(e) => setSearchProvince(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
              >
                <option value="all">{t('search_all_locations') || '전체 지역'}</option>
                {provincesList.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Budget price range filter */}
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--t2)', fontWeight: 700 }}>
                  {t('budget_range')}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 700 }}>
                  {searchMaxPrice ? `0 ~ ฿${Number(searchMaxPrice).toLocaleString()}` : `0 ~ ฿80,000+ (${t('all') || '전체'})`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="80000" 
                  step="1000"
                  value={searchMaxPrice || '80000'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '80000') {
                      setSearchMaxPrice(''); // No limit
                    } else {
                      setSearchMaxPrice(val);
                    }
                  }}
                  style={{ 
                    flex: 1, 
                    accentColor: 'var(--gold)',
                    cursor: 'pointer',
                    height: '6px',
                    borderRadius: '3px',
                    background: 'var(--border)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Search Grid Results */}
            {filteredSearchProducts.length === 0 ? (
              <div className="empty">
                <div className="empty-ico">🔍</div>
                <div className="empty-ttl">{t('search_no_results')}</div>
              </div>
            ) : (
              <div className="products-grid">
                {filteredSearchProducts.map((p) => {
                  const sName = p.profiles?.store_name || p.profiles?.name || t('role_seller');
                  const conditionKey = 'condition_' + (p.condition ? p.condition.toLowerCase().replace(' ', '') : 's');
                  return (
                    <div 
                      key={p.id} 
                      className="product-card animate-slide-up"
                      onClick={() => setSelectedProduct(p)}
                    >
                      <div className="p-img">
                        {p.images && p.images.length > 0 ? (
                          <img src={p.images[0]} alt={p.title} />
                        ) : (
                          getCategoryIcon(p.category)
                        )}
                        <span className="p-badge">{t(conditionKey)}</span>
                      </div>
                      <div className="p-info">
                        <div className="p-seller">🏪 {sName}</div>
                        <div className="p-title">{p.title}</div>
                        <div className="p-price">
                          {formatPrice(p.price)} <small>THB</small>
                        </div>
                        <button 
                          className="btn-buy"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                          }}
                        >
                          {t('btn_buy')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== VIEW 3: SHOPPING CART ==================== */}
      {activeTab === 'cart' && (
        <div className="view-section active animate-slide-up">
          <section className="section">
            <div className="sec-head" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <h2 className="sec-title">{t('tab_cart')}</h2>
            </div>

            {loadingCart ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>{t('loading')}</div>
            ) : cartItems.length === 0 ? (
              <div className="empty" style={{ padding: '40px 20px' }}>
                <div className="empty-ico">🛒</div>
                <div className="empty-ttl">{t('cart_empty')}</div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActiveTab('shop')} 
                  style={{ margin: '20px auto 0' }}
                >
                  🛍️ 쇼핑하러 가기
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {cartItems.map((item) => {
                    const p = cartProducts.find((prod) => prod.id === item.product_id);
                    if (!p || p.status !== 'active') {
                      return (
                        <div key={item.product_id} className="card" style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6 }}>
                          <div style={{ fontSize: '12px', color: 'var(--red)' }}>판매가 불가능한 상품이 포함되어 있습니다.</div>
                          <button className="btn-sm btn-red" onClick={() => handleRemoveFromCart(item.product_id)}>✕</button>
                        </div>
                      );
                    }

                    const qty = Math.min(item.quantity, p.stock || 1);
                    const itemSubtotal = p.price * qty;
                    const sName = p.profiles?.store_name || p.profiles?.name || t('role_seller');
                    const conditionKey = 'condition_' + (p.condition ? p.condition.toLowerCase().replace(' ', '') : 's');

                    return (
                      <div key={p.id} className="card" style={{ padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--border)', background: 'var(--card)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left' }}>
                          <div style={{ width: '55px', height: '55px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {p.images && p.images.length > 0 ? (
                              <img src={p.images[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              '📱'
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--t1)' }}>{p.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>🏪 {sName} | ⭐ {t(conditionKey)}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', marginTop: '4px' }}>{formatPrice(p.price)}</div>
                          </div>
                          <button 
                            onClick={() => handleRemoveFromCart(p.id)} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--t3)', fontSize: '16px', cursor: 'pointer', padding: '4px' }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '10px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', padding: '3px 6px' }}>
                            <button 
                              onClick={() => handleUpdateCartQty(p.id, -1)} 
                              style={{ background: 'transparent', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '20px', color: 'var(--t1)' }}
                            >
                              -
                            </button>
                            <span style={{ fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{qty}</span>
                            <button 
                              onClick={() => handleUpdateCartQty(p.id, 1)} 
                              style={{ background: 'transparent', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '20px', color: 'var(--t1)' }}
                            >
                              +
                            </button>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--t3)', fontSize: '11px', marginRight: '4px' }}>합계</span>
                            <strong style={{ color: 'var(--gold)', fontSize: '14px' }}>{formatPrice(itemSubtotal)}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cart Summary Panel */}
                <div className="card" style={{ padding: '16px', marginBottom: '20px', background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t2)' }}>총 합계 금액 (Total)</span>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 900, color: 'var(--gold)' }}>
                      {formatPrice(
                        cartItems.reduce((sum, item) => {
                          const p = cartProducts.find((prod) => prod.id === item.product_id);
                          return sum + (p ? p.price * item.quantity : 0);
                        }, 0)
                      )}
                    </span>
                  </div>
                  <button 
                    className="btn-submit" 
                    onClick={handleCartCheckoutAll}
                    style={{ margin: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    🛍️ <span>{t('btn_checkout_all') || '전체 주문하기'}</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== VIEW 4: MY PAGE ==================== */}
      {activeTab === 'mypage' && (
        <div className="view-section active animate-slide-up">
          <section className="section">
            <div className="sec-head" style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h2 className="sec-title">{t('tab_mypage')}</h2>
            </div>

            {!user ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{t('login_required_title')}</h3>
                <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '24px' }}>{t('login_required_desc')}</p>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => router.push('/auth')}
                >
                  {t('login_or_register')}
                </button>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
                  <div className="s-avatar" style={{ margin: 0, width: '64px', height: '64px' }}>
                    {userProfile?.profile_image ? (
                      <img src={userProfile.profile_image} alt={userProfile.name} />
                    ) : (
                      getAvatarEmoji(userProfile?.name || '')
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{userProfile?.name || '—'}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--t2)', marginTop: '2px' }}>📞 {userProfile?.phone || '—'}</p>
                    <span className="badge bg-purple" style={{ marginTop: '6px' }}>
                      {userProfile?.role === 'admin' ? 'Admin' : userProfile?.role === 'seller' ? t('role_seller') : t('role_buyer')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userProfile?.role !== 'buyer' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', justifyContent: 'center', background: 'var(--gp)' }}
                      onClick={() => {
                        if (userProfile?.role === 'admin') router.push('/admin/dashboard');
                        else if (userProfile?.role === 'seller') router.push('/seller/dashboard');
                      }}
                    >
                      📊 {t('dashboard')}
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleLogout}
                  >
                    🚪 {t('logout')}
                  </button>
                </div>

                {/* Buyer Orders History */}
                <div style={{ marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                    🛍️ <span>{t('my_orders_title')}</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myOrders.length === 0 ? (
                      <div className="empty" style={{ padding: '20px 0', fontSize: '12px', color: 'var(--t3)' }}>
                        {t('no_orders')}
                      </div>
                    ) : (
                      myOrders.map((o) => {
                        const prod = o.products || {};
                        const seller = o.seller || {};
                        const imgUrl = prod.images?.[0] || '';
                        const prodTitle = prod.title || t('product_inquiry');
                        
                        const statusMap: Record<string, string> = {
                          pending: t('status_pending'),
                          confirmed: t('status_confirmed'),
                          completed: t('status_completed'),
                          cancelled: t('status_cancelled')
                        };
                        const statusText = statusMap[o.status] || o.status || t('status_pending');
                        
                        let statusColor = 'var(--purple-l)';
                        if (o.status === 'completed') statusColor = 'var(--green)';
                        if (o.status === 'cancelled') statusColor = 'var(--red)';
                        if (o.status === 'confirmed') statusColor = 'var(--blue)';

                        const dateStr = new Date(o.created_at).toLocaleDateString();
                        const paymentText = o.payment_method === 'cod' ? t('order_pay_cod') : t('order_pay_online');

                        // Tracking Section link
                        let trackingHtml = null;
                        if (o.status === 'confirmed' && o.tracking_number) {
                          const company = o.tracking_company || 'Flash Express';
                          let trackingUrl = '';
                          if (company.toLowerCase().includes('flash')) {
                            trackingUrl = `https://www.flashexpress.co.th/tracking/?k=${o.tracking_number}`;
                          } else if (company.toLowerCase().includes('kex') || company.toLowerCase().includes('kerry')) {
                            trackingUrl = `https://th.kex-express.com/en/track/?track=${o.tracking_number}`;
                          }

                          trackingHtml = (
                            <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px dashed var(--border2)', borderRadius: '8px', padding: '10px', fontSize: '11px', marginTop: '4px', textAlign: 'left' }}>
                              <div style={{ fontWeight: 700, color: 'var(--purple-l)', marginBottom: '4px' }}>🚚 {t('tracking_info_title') || '배송 추적 정보'}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><b>{company}</b>: {o.tracking_number}</span>
                                {trackingUrl && (
                                  <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="badge bg-purple" style={{ fontWeight: 700, textDecoration: 'none' }}>
                                    🔍 추적/Track
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Action buttons
                        let buyerActionsHtml = null;
                        if (o.status === 'confirmed') {
                          buyerActionsHtml = (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button className="btn-sm btn-green" onClick={() => handleConfirmOrderReceipt(o.id)} style={{ flex: 1, padding: '8px 12px', fontWeight: 700 }}>
                                {t('btn_confirm_receipt') || '✅ 구매 확정'}
                              </button>
                              <button className="btn-sm btn-red" onClick={() => handleReturnOrder(o.id)} style={{ flex: 1, padding: '8px 12px', fontWeight: 700 }}>
                                {t('btn_reject_return') || '❌ 반송 / 거절'}
                              </button>
                            </div>
                          );
                        } else if (o.status === 'pending') {
                          buyerActionsHtml = (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button 
                                className="btn-sm btn-red" 
                                onClick={() => handleCancelOrder(o.id)} 
                                style={{ flex: 1, padding: '8px 12px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}
                              >
                                {t('btn_cancel_order') || '❌ 주문 취소'}
                              </button>
                            </div>
                          );
                        }

                        let slipSectionHtml = null;
                        if (o.status === 'pending') {
                          if (o.slip_url) {
                            slipSectionHtml = (
                              <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(0,0,0,0.05)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><strong>📄 입금증:</strong> <a href={o.slip_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-l)', textDecoration: 'underline', fontWeight: 700 }}>첨부됨 (보기)</a></span>
                                <button type="button" className="btn-sm" style={{ padding: '2px 6px', fontSize: '10px', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)' }} onClick={() => document.getElementById(`slipInput_${o.id}`)?.click()}>재첨부</button>
                              </div>
                            );
                          } else {
                            slipSectionHtml = (
                              <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(0,0,0,0.05)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: '10.5px' }}>⚠️ 입금 후 아래 버튼을 통해 입금증(Slip)을 첨부해 주세요.</div>
                                <button type="button" className="btn-sm btn-purple" style={{ width: '100%', padding: '6px', fontWeight: 700, fontSize: '11px', background: 'var(--cyan)', border: 'none', color: '#fff' }} onClick={() => document.getElementById(`slipInput_${o.id}`)?.click()}>
                                  📄 입금증 첨부하기 / Upload Slip
                                </button>
                              </div>
                            );
                          }
                        } else if (o.slip_url) {
                          slipSectionHtml = (
                            <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(0,0,0,0.05)', paddingTop: '6px' }}>
                              <strong>📄 입금증:</strong> <a href={o.slip_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-l)', textDecoration: 'underline', fontWeight: 700 }}>첨부된 입금증 보기</a>
                            </div>
                          );
                        }

                        return (
                          <div key={o.id} className="card" style={{ padding: '14px', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: "'Outfit', sans-serif" }}>{dateStr}</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, background: 'rgba(0,0,0,0.03)', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${statusColor}` }}>{statusText}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {imgUrl ? (
                                  <img src={imgUrl} alt={prodTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  '📱'
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--t1)' }}>{prodTitle}</div>
                                <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>🏪 {seller.store_name || t('role_seller')} | 📦 {o.quantity} 개</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', marginTop: '4px' }}>{formatPrice(o.total_price)}</div>
                              </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.01)', borderRadius: '8px', padding: '10px', fontSize: '11px', color: 'var(--t2)', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'left' }}>
                              <div><strong>📍 {t('order_address')}:</strong> {o.delivery_address}</div>
                              <div><strong>💳 {t('order_payment')}:</strong> {paymentText}</div>
                              {o.notes && <div><strong>📝 {t('order_notes')}:</strong> {o.notes}</div>}
                              {slipSectionHtml}
                            </div>
                            <input 
                              type="file" 
                              id={`slipInput_${o.id}`} 
                              accept="image/*" 
                              style={{ display: 'none' }} 
                              onChange={(event) => handleUploadSlipLater(o.id, event)} 
                            />
                            {trackingHtml}
                            {buyerActionsHtml}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Buyer Inquiry / Chat Rooms list */}
                <div style={{ marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', color: 'var(--purple-l)', display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                    💬 <span>{t('my_inquiries_title')}</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myInquiries.length === 0 ? (
                      <div className="empty" style={{ padding: '20px 0', fontSize: '12px', color: 'var(--t3)' }}>
                        {t('no_inquiries')}
                      </div>
                    ) : (
                      myInquiries.map((room) => {
                        const sellerName = room.seller?.store_name || room.seller?.name || t('role_seller');
                        const prodTitle = room.products?.title || t('product_inquiry');
                        const avatar = room.seller?.profile_image;

                        const unreadCount = room.chat_messages ? room.chat_messages.filter((m: any) => !m.is_read && m.sender_id !== user.id).length : 0;

                        return (
                          <div 
                            key={room.id} 
                            className="card" 
                            onClick={() => handleOpenInquiryChat(room)}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}
                          >
                            <div className="s-avatar" style={{ width: '36px', height: '36px', margin: 0, fontSize: '16px' }}>
                              {avatar ? (
                                <img src={avatar} alt={sellerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                getAvatarEmoji(sellerName)
                              )}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{sellerName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--t2)', marginTop: '2px' }}>📱 {prodTitle}</div>
                            </div>
                            <span style={{ color: 'var(--purple-l)', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
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
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer" style={{ marginTop: '40px' }}>
        <div className="footer-logo">💎 {t('app_title')}</div>
        <div className="footer-sub">{t('parent_company')}</div>
        <div className="footer-copy">© 2026 Phone Switch Hub. All rights reserved.</div>
      </footer>

      {/* BOTTOM TAB BAR */}
      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        cartCount={cartBadgeCount} 
      />

      {/* MODALS RENDER */}
      {selectedProduct && (
        <DetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onChat={handleOpenChat} 
          onAddToCart={handleAddToCart} 
          onBuyNow={handleBuyNow} 
          currentUserId={user?.id || null} 
        />
      )}

      {isOrderOpen && (
        <OrderModal 
          isOpen={isOrderOpen} 
          onClose={() => setIsOrderOpen(false)} 
          checkoutItems={checkoutItems} 
          onSubmit={handleOrderSubmit} 
        />
      )}

      {activeChatRoom && (
        <ChatModal 
          room={activeChatRoom} 
          onClose={() => {
            setActiveChatRoom(null);
            // Refresh inquiry room read states
            fetchUserInquiries();
          }} 
          currentUserId={user?.id || ''} 
        />
      )}

      {/* REACT TOAST COMPONENT */}
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
