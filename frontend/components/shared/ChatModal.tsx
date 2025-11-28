'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import axios from 'axios';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ChatModalProps {
  orderId: string;
  orderNumber: string;
  currentUserRole: 'USER' | 'DRIVER';
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ orderId, orderNumber, currentUserRole, isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages
  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat/${orderId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setMessages(response.data.data.messages || []);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('Failed to load chat messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Join order room for real-time messages
    const socket = getSocket();
    if (socket) {
      socket.emit('order:track', { orderId });

      // Listen for new messages
      const handleNewMessage = (data: ChatMessage) => {
        if (data.orderId === orderId) {
          setMessages(prev => [...prev, data]);
          setTimeout(scrollToBottom, 100);

          // Mark as read if sent by other person
          if (data.senderRole !== currentUserRole) {
            socket.emit('chat:mark-read', { orderId });
          }
        }
      };

      // Listen for typing indicators
      const handleTyping = (data: any) => {
        if (data.userRole !== currentUserRole) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      };

      const handleStopTyping = () => {
        setIsTyping(false);
      };

      socket.on('chat:message', handleNewMessage);
      socket.on('typing:user', handleTyping);
      socket.on('typing:stop', handleStopTyping);

      return () => {
        socket.off('chat:message', handleNewMessage);
        socket.off('typing:user', handleTyping);
        socket.off('typing:stop', handleStopTyping);
        socket.emit('order:untrack', { orderId });
      };
    }
  }, [isOpen, orderId, currentUserRole]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const socket = getSocket();
      if (socket) {
        socket.emit('chat:message', {
          orderId,
          message: newMessage.trim()
        });
        setNewMessage('');

        // Stop typing indicator
        socket.emit('typing:stop', { orderId });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    const socket = getSocket();
    if (!socket) return;

    // Emit typing start
    socket.emit('typing:start', { orderId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { orderId });
    }, 2000);
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md h-[600px] bg-white rounded-2xl shadow-xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
            <p className="text-sm text-gray-500">Order #{orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F58FF]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No messages yet</p>
              <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOwnMessage = msg.senderRole === currentUserRole;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-[#0F58FF] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0F58FF] focus:border-transparent"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-[#0F58FF] text-white rounded-full hover:bg-[#0D35D1] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
