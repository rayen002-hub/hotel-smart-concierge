import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listGuestMessages, sendGuestMessage } from '../../api/complaintApi';
import { connectClientSocket, disconnectSocket, getSocket } from '../../api/socketClient';
import type { ApiError } from '../../api/apiClient';

interface Message {
  id: string;
  senderType: 'CLIENT' | 'STAFF';
  clientMessage: string;
  createdAt: string;
  senderUser?: { name: string } | null;
}

export const RoomMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Initial fetch (REST fallback) ──────────────────────────────────

  const fetchMessages = async () => {
    try {
      const res = await listGuestMessages();
      setMessages(res.data || []);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || 'Erreur lors du chargement des messages.');
    } finally {
      setLoading(false);
    }
  };

  // ── Socket.IO real-time ────────────────────────────────────────────

  useEffect(() => {
    fetchMessages();

    // Connect WebSocket
    try {
      const socket = connectClientSocket();

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      // Listen for new messages
      socket.on('guest:new_message', (msg: any) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, {
            id: msg.id,
            senderType: msg.senderType,
            clientMessage: msg.clientMessage,
            createdAt: msg.createdAt,
          }];
        });
      });
    } catch {
      console.warn('[Socket] Could not connect, using REST fallback');
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const socket = getSocket();

      if (socket?.connected) {
        // Send via WebSocket
        socket.emit('guest:send_message', { message: newMessage.trim() }, (res: any) => {
          if (res?.success) {
            setNewMessage('');
            setSuccess('Message envoyé !');
            setTimeout(() => setSuccess(''), 3000);
          } else {
            setError(res?.error || "Erreur lors de l'envoi.");
          }
          setSending(false);
        });
      } else {
        // Fallback to REST
        await sendGuestMessage({ message: newMessage.trim() });
        setNewMessage('');
        setSuccess('Message envoyé !');
        setTimeout(() => setSuccess(''), 3000);
        await fetchMessages();
        setSending(false);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.error || "Erreur lors de l'envoi.");
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  // Group messages by date
  const groupedMessages: { date: string; items: Message[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date, items: [] });
    }
    groupedMessages[groupedMessages.length - 1].items.push(msg);
  }

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-lg space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/room')}
            className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
          >
            ← Retour
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">💬 Messages</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Conversation avec la réception
              {connected && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400">en direct</span>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchMessages(); }}
            disabled={loading}
            className="h-8 px-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-semibold hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer disabled:opacity-50"
          >
            🔄
          </button>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
            ✅ {success}
          </div>
        )}

        {/* Messages area */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden">
          <div className="h-[400px] overflow-y-auto p-4 space-y-3" id="messages-container">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                <span className="text-3xl">💬</span>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Aucun message. Envoyez votre premier message à la réception !
                </p>
              </div>
            ) : (
              <>
                {groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-2">
                    {/* Date separator */}
                    <div className="flex items-center justify-center">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/50 px-2 py-0.5 rounded-full">
                        {group.date}
                      </span>
                    </div>

                    {group.items.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === 'CLIENT' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                            msg.senderType === 'CLIENT'
                              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm'
                              : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-bl-sm'
                          }`}
                        >
                          {msg.senderType === 'STAFF' && (
                            <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mb-1">
                              🏨 Réception
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.clientMessage}</p>
                          <p className={`text-[9px] mt-1 text-right ${
                            msg.senderType === 'CLIENT' ? 'text-white/70' : 'text-[hsl(var(--muted-foreground))]'
                          }`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-[hsl(var(--border))] p-3 bg-[hsl(var(--muted))]/20">
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre message..."
                maxLength={2000}
                rows={1}
                className="flex-1 resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                className="shrink-0 h-9 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {sending ? '…' : '➤'}
              </button>
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 text-right">
              {newMessage.length} / 2000
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
