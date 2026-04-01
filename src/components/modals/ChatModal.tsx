import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Headphones, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useSound } from '@/hooks/useSound';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  createSupportTicket,
  getSupportTickets,
  getTicketMessages,
  sendTicketMessage,
  updateTicketStatus,
  type SupportTicket,
  type SupportTicketMessage,
} from '@/lib/tickets';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'account', label: 'Account' },
  { value: 'bonus', label: 'Bonus / Promo' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
];

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { user } = useAuthStore();
  const { play } = useSound();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.email === 'yousefch1978@gmail.com';

  const visibleTickets = useMemo(() => {
    if (isAdmin) return tickets;
    return tickets.filter((ticket) => ticket.user_id === user?.id);
  }, [tickets, isAdmin, user?.id]);

  const selectedTicket = visibleTickets.find((ticket) => ticket.id === selectedTicketId) || null;

  const loadTickets = async () => {
    const data = await getSupportTickets();
    setTickets(data);
  };

  const loadMessages = async (ticketId: string) => {
    const data = await getTicketMessages(ticketId);
    setMessages(data);
  };

  useEffect(() => {
    if (!isOpen) return;

    const boot = async () => {
      try {
        await loadTickets();
      } catch (error) {
        console.error(error);
        toast.error('Failed to load tickets');
      }
    };

    boot();

    const ticketChannel = supabase
      .channel('support_tickets_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        async () => {
          try {
            await loadTickets();
          } catch (error) {
            console.error(error);
          }
        }
      )
      .subscribe();

    const messageChannel = supabase
      .channel('support_ticket_messages_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_ticket_messages' },
        async (payload) => {
          try {
            const row = payload.new as { ticket_id?: string } | null;
            if (row?.ticket_id && row.ticket_id === selectedTicketId) {
              await loadMessages(row.ticket_id);
            }
            await loadTickets();
          } catch (error) {
            console.error(error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [isOpen, selectedTicketId]);

  useEffect(() => {
    if (selectedTicketId) {
      loadMessages(selectedTicketId).catch((error) => {
        console.error(error);
        toast.error('Failed to load ticket messages');
      });
    } else {
      setMessages([]);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedTicketId && visibleTickets.length > 0) {
      setSelectedTicketId(visibleTickets[0].id);
    }
  }, [visibleTickets, selectedTicketId]);

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!subject.trim() || !newMessage.trim()) {
      toast.error('Fill in subject and message');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        userId: user.id,
        username: user.username,
        subject: subject.trim(),
        category,
        message: newMessage.trim(),
      });

      play('message');
      setSubject('');
      setCategory('other');
      setNewMessage('');
      setShowNewTicket(false);
      await loadTickets();
      setSelectedTicketId(ticket.id);
      toast.success('Ticket created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicketId || !replyInput.trim()) return;

    setIsSubmitting(true);
    try {
      await sendTicketMessage({
        ticketId: selectedTicketId,
        userId: user.id,
        username: isAdmin ? 'Support Team' : user.username,
        message: replyInput.trim(),
        isAdmin,
      });

      play('message');
      setReplyInput('');
      await loadMessages(selectedTicketId);
      await loadTickets();
    } catch (error) {
      console.error(error);
      toast.error('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: 'open' | 'pending' | 'closed') => {
    if (!selectedTicketId) return;
    try {
      await updateTicketStatus(selectedTicketId, status);
      await loadTickets();
      toast.success(`Ticket marked ${status}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const statusColor = (status: string) => {
    if (status === 'open') return 'text-yellow-400';
    if (status === 'pending') return 'text-blue-400';
    if (status === 'closed') return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="fixed inset-0 sm:inset-auto sm:right-4 sm:top-20 sm:w-[980px] sm:h-[700px] z-50 flex items-end sm:items-start justify-center sm:justify-end p-4 sm:p-0"
          >
            <div className="bg-dark-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full h-full sm:h-auto flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-neon-purple" />
                  <h2 className="text-lg font-semibold text-white">Support Tickets</h2>
                </div>
                <div className="flex items-center gap-2">
                  {!isAdmin && (
                    <Button
                      onClick={() => setShowNewTicket((v) => !v)}
                      className="bg-neon-purple text-white hover:bg-neon-purple/90"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      New Ticket
                    </Button>
                  )}
                  <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[320px_1fr] h-full min-h-0">
                <div className="border-r border-white/5 flex flex-col min-h-0">
                  {!isAdmin && showNewTicket && (
                    <form onSubmit={handleCreateTicket} className="p-3 border-b border-white/5 space-y-2">
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject"
                        className="bg-dark-700 border-white/10 text-white"
                      />
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-10 rounded-md bg-dark-700 border border-white/10 text-white px-3"
                      >
                        {CATEGORIES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Describe the issue..."
                        className="w-full min-h-[110px] rounded-md bg-dark-700 border border-white/10 text-white p-3 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isSubmitting} className="bg-neon-purple text-white hover:bg-neon-purple/90">
                          Create
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewTicket(false)}
                          className="border-white/10 text-gray-300"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {visibleTickets.length === 0 ? (
                      <div className="text-center text-gray-500 py-8 text-sm">
                        {isAdmin ? 'No tickets yet' : 'No tickets yet. Create one.'}
                      </div>
                    ) : (
                      visibleTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className={`w-full text-left rounded-xl border p-3 transition-colors ${
                            selectedTicketId === ticket.id
                              ? 'border-neon-purple bg-neon-purple/10'
                              : 'border-white/5 bg-dark-700/40 hover:bg-dark-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-white truncate">{ticket.subject}</span>
                            <span className={`text-xs font-medium ${statusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mb-1">
                            {ticket.username} • {ticket.category}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {formatTime(ticket.updated_at)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col min-h-0">
                  {selectedTicket ? (
                    <>
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-white font-semibold">{selectedTicket.subject}</div>
                          <div className="text-xs text-gray-400">
                            {selectedTicket.username} • {selectedTicket.category} •{' '}
                            <span className={statusColor(selectedTicket.status)}>{selectedTicket.status}</span>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleStatusChange('open')}
                              variant="outline"
                              className="border-white/10 text-gray-300"
                            >
                              Open
                            </Button>
                            <Button
                              onClick={() => handleStatusChange('pending')}
                              variant="outline"
                              className="border-white/10 text-gray-300"
                            >
                              Pending
                            </Button>
                            <Button
                              onClick={() => handleStatusChange('closed')}
                              className="bg-green-600 text-white hover:bg-green-700"
                            >
                              Close
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[80%] px-3 py-2 rounded-xl ${
                                msg.is_admin ? 'bg-purple-500/20 text-white' : 'bg-green-500/20 text-white'
                              }`}
                            >
                              <div className="text-xs mb-1">
                                {msg.is_admin ? 'Support 👑' : msg.username} • {formatTime(msg.created_at)}
                              </div>
                              <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {selectedTicket.status !== 'closed' && user && (
                        <form onSubmit={handleReply} className="p-3 border-t border-white/5 flex gap-2">
                          <Input
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            placeholder={isAdmin ? 'Reply to ticket...' : 'Write a reply...'}
                            className="flex-1 bg-dark-700 border-white/10 text-white text-sm"
                          />
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-neon-purple text-white hover:bg-neon-purple/90"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </form>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                      Select a ticket
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
