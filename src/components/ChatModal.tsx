'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';
import { filterBypassKeywords, resizeAndCompressImage } from '@/lib/utils';

interface ChatModalProps {
  room: any; // Room details (id, product_id, buyer_id, seller_id, product_title, partner_store_name, etc.)
  onClose: () => void;
  currentUserId: string;
}

export default function ChatModal({
  room,
  onClose,
  currentUserId
}: ChatModalProps) {
  const { t } = useTranslation();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomId = room?.id;

  // 1. Fetch initial message history
  const fetchMessages = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fetch messages failed:', error);
      } else {
        setMessages(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [roomId]);

  // 2. Realtime subscription to new messages
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          setMessages((prev) => {
            // Check duplicate
            if (prev.some((msg) => msg.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 3. Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send text message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !roomId) return;

    const blockLabels = {
      phone: t('phone_blocked'),
      line: t('line_blocked'),
      account: t('account_blocked')
    };

    const rawText = inputText.trim();
    const filteredText = filterBypassKeywords(rawText, blockLabels);

    if (rawText !== filteredText) {
      alert(t('toast_bypass_filtered'));
    }

    setInputText('');

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: currentUserId,
          message: filteredText,
        });

      if (error) {
        alert(t('toast_send_failed') + error.message);
      }
    } catch (e: any) {
      alert(t('toast_send_failed') + e.toString());
    }
  };

  // 5. Send file attachment (image/video)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;

    // Validate type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert(t('toast_only_media'));
      return;
    }

    // Validate size (max 20MB for video, 8MB for image)
    const maxSize = isVideo ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(t('toast_file_too_large'));
      return;
    }

    setIsUploading(true);
    try {
      let finalFile = file;
      if (isImage) {
        finalFile = await resizeAndCompressImage(file, 1000, 0.75);
      }

      const fileExt = finalFile.name.split('.').pop() || 'jpg';
      const fileName = `${roomId}_${Date.now()}.${fileExt}`;
      const filePath = `chat_media/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from('products') // Storing chat media in products bucket or generic bucket
        .upload(filePath, finalFile);

      if (upErr) {
        alert(t('toast_upload_failed') + upErr.message);
        setIsUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      const mediaUrl = urlData.publicUrl;

      // Insert message with media
      const { error: msgErr } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: currentUserId,
          message: isImage ? '📷 Image attachment' : '🎥 Video attachment',
          media_url: mediaUrl
        });

      if (msgErr) {
        alert(t('toast_send_failed') + msgErr.message);
      }
    } catch (err: any) {
      alert(t('toast_upload_failed') + err.toString());
    } finally {
      setIsUploading(false);
      // Clear file input
      e.target.value = '';
    }
  };

  if (!room) return null;

  const otherPartyName = room.partner_store_name || room.buyer_name || 'Partner';

  return (
    <div className="modal-bg open" onClick={onClose} style={{ display: 'flex', zIndex: 3100 }}>
      <div 
        className="modal chat-modal animate-slide-up" 
        style={{ maxWidth: '440px', padding: 0, overflow: 'hidden', borderRadius: '22px', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-hd" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="modal-title" style={{ fontSize: '15px', fontWeight: 800 }}>
            💬 {otherPartyName} ({room.product_title || t('product_inquiry')})
          </span>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        {/* Message area */}
        <div 
          className="chat-messages-body" 
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg3)', padding: '16px' }}
        >
          {loading && messages.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}>{t('chat_loading')}</div>
          ) : messages.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}>{t('chat_start')}</div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
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
                      background: isMine ? 'var(--purple)' : 'var(--bg2)',
                      color: isMine ? '#fff' : 'var(--t1)',
                      fontSize: '13px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      textAlign: 'left',
                      wordBreak: 'break-all'
                    }}
                  >
                    {msg.media_url ? (
                      msg.media_url.match(/\.(mp4|webm|mov|avi)$/i) ? (
                        <video src={msg.media_url} controls style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '180px' }} />
                      ) : (
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                          <img src={msg.media_url} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '180px', objectFit: 'cover' }} />
                        </a>
                      )
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="chat-input-footer" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 16px' }}>
          <input 
            type="file" 
            id="chatFileInput" 
            accept="image/*,video/*" 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
            disabled={isUploading}
          />
          <button 
            onClick={() => document.getElementById('chatFileInput')?.click()} 
            className="chat-attach-btn" 
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--t2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              fontSize: '16px'
            }}
            disabled={isUploading}
          >
            {isUploading ? '⌛' : '📎'}
          </button>
          
          <input 
            type="text" 
            className="chat-text-input" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t('chat_input_placeholder')} 
            style={{
              flex: 1,
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              color: 'var(--t1)',
              outline: 'none',
              padding: '10px 14px',
              fontSize: '13px'
            }}
          />
          
          <button 
            onClick={handleSendMessage} 
            className="chat-send-button"
            style={{
              background: 'var(--gp)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '10px 16px',
              fontSize: '13px'
            }}
          >
            {t('chat_send')}
          </button>
        </div>
      </div>
    </div>
  );
}
