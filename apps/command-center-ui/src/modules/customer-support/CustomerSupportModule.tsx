import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MessageCircle, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Bot, 
  Send,
  Filter,
  Search,
  MoreVertical,
  Star,
  Mail,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import { usePerformance } from '../../hooks/usePerformance';

interface SupportTicket {
  id: string;
  customer_email: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent';
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed' | 'escalated';
  category: string;
  sentiment_score: number;
  order_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  agent_response?: string;
  customer_satisfaction_rating?: number;
}

interface SupportMetrics {
  total_tickets: number;
  open_tickets: number;
  resolved_today: number;
  avg_response_time_hours: number;
  customer_satisfaction: number;
  escalation_rate: number;
  ai_responses_generated: number;
  sentiment_score: number;
}

interface AIResponseOptions {
  tone: 'professional' | 'friendly' | 'empathetic' | 'formal';
  maxLength: number;
  includeOrderInfo: boolean;
  personalizeResponse: boolean;
}

const CustomerSupportModule: React.FC = () => {
  // State management
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics>({
    total_tickets: 0,
    open_tickets: 0,
    resolved_today: 0,
    avg_response_time_hours: 0,
    customer_satisfaction: 0,
    escalation_rate: 0,
    ai_responses_generated: 0,
    sentiment_score: 0
  });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: ''
  });
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiOptions, setAiOptions] = useState<AIResponseOptions>({
    tone: 'professional',
    maxLength: 500,
    includeOrderInfo: true,
    personalizeResponse: true
  });
  const [newTicket, setNewTicket] = useState({
    customer_email: '',
    subject: '',
    description: '',
    priority: 'medium' as const,
    category: 'general'
  });
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  // Hooks
  const { trackEvent, trackMetric } = usePerformance();
  const socket = useSocket();

  // Real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('ticket_created', (data) => {
        setTickets(prev => [data.ticket, ...prev]);
        trackEvent('ticket_created_realtime');
      });

      socket.on('ticket_updated', (data) => {
        setTickets(prev => prev.map(ticket => 
          ticket.id === data.ticket_id 
            ? { ...ticket, ...data.updates }
            : ticket
        ));
        trackEvent('ticket_updated_realtime');
      });

      socket.on('ticket_escalated', (data) => {
        setTickets(prev => prev.map(ticket => 
          ticket.id === data.ticket_id 
            ? { ...ticket, status: 'escalated', priority: data.new_priority }
            : ticket
        ));
        trackEvent('ticket_escalated_realtime');
      });

      socket.on('support_metrics_update', (data) => {
        setMetrics(data.metrics);
      });

      return () => {
        socket.off('ticket_created');
        socket.off('ticket_updated');
        socket.off('ticket_escalated');
        socket.off('support_metrics_update');
      };
    }
  }, [socket, trackEvent]);

  // Data fetching
  const fetchSupportData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [ticketsResponse, metricsResponse] = await Promise.all([
        fetch('/api/customer-support/tickets'),
        fetch('/api/customer-support/analytics')
      ]);

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData.data.tickets);
      }

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data.ticket_analytics);
      }

      trackMetric('support_data_load_time', Date.now());
    } catch (error) {
      console.error('Error fetching support data:', error);
    } finally {
      setLoading(false);
    }
  }, [trackMetric]);

  useEffect(() => {
    fetchSupportData();
    const interval = setInterval(fetchSupportData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchSupportData]);

  // AI response generation
  const generateAIResponse = async (ticketId: string) => {
    try {
      setAiGenerating(true);
      setAiResponse('');

      const response = await fetch('/api/customer-support/ai/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          response_tone: aiOptions.tone,
          max_length: aiOptions.maxLength,
          context: {
            include_order_info: aiOptions.includeOrderInfo,
            personalize: aiOptions.personalizeResponse
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.data.ai_response);
        trackEvent('ai_response_generated');
      } else {
        throw new Error('Failed to generate AI response');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  // Ticket management
  const createTicket = async () => {
    try {
      const response = await fetch('/api/customer-support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTicket)
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(prev => [data.data.ticket, ...prev]);
        setNewTicket({
          customer_email: '',
          subject: '',
          description: '',
          priority: 'medium',
          category: 'general'
        });
        setShowNewTicketForm(false);
        trackEvent('ticket_created_manual');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const updateTicket = async (ticketId: string, updates: Partial<SupportTicket>) => {
    try {
      const response = await fetch(`/api/customer-support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? data.data.ticket : ticket
        ));
        trackEvent('ticket_updated_manual');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const escalateTicket = async (ticketId: string, reason: string) => {
    try {
      const response = await fetch(`/api/customer-support/escalate/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        trackEvent('ticket_escalated_manual');
      }
    } catch (error) {
      console.error('Error escalating ticket:', error);
    }
  };

  // Filtering and search
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesStatus = !filters.status || ticket.status === filters.status;
      const matchesPriority = !filters.priority || ticket.priority === filters.priority;
      const matchesCategory = !filters.category || ticket.category === filters.category;
      const matchesSearch = !filters.search || 
        ticket.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
        ticket.customer_email.toLowerCase().includes(filters.search.toLowerCase()) ||
        ticket.description.toLowerCase().includes(filters.search.toLowerCase());

      return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
    });
  }, [tickets, filters]);

  // Priority and status styling
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'urgent':
        return 'text-red-400 bg-red-500/20';
      case 'high':
        return 'text-orange-400 bg-orange-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'low':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'text-blue-400 bg-blue-500/20';
      case 'open':
        return 'text-cyan-400 bg-cyan-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'resolved':
        return 'text-green-400 bg-green-500/20';
      case 'closed':
        return 'text-gray-400 bg-gray-500/20';
      case 'escalated':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSentimentColor = (score: number) => {
    if (score >= 1) return 'text-green-400';
    if (score >= 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-cyan"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <MessageCircle className="text-accent-cyan" />
            Customer Support Command Center
          </h1>
          <p className="text-text-dim">AI-powered customer service automation and management</p>
        </div>
        <button
          onClick={() => setShowNewTicketForm(true)}
          className="px-4 py-2 bg-accent-cyan text-bg rounded-lg hover:bg-accent-cyan/80 transition-colors"
        >
          Create Ticket
        </button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-accent-cyan" />
            <span className="text-sm text-text-dim">Total Tickets</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {metrics.total_tickets.toLocaleString()}
          </div>
        </motion.div>

        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-text-dim">Open</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {metrics.open_tickets.toLocaleString()}
          </div>
        </motion.div>

        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm text-text-dim">Resolved Today</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {metrics.resolved_today.toLocaleString()}
          </div>
        </motion.div>

        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-accent-magenta" />
            <span className="text-sm text-text-dim">Avg Response</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {metrics.avg_response_time_hours.toFixed(1)}h
          </div>
        </motion.div>

        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-accent-green" />
            <span className="text-sm text-text-dim">Satisfaction</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {(metrics.customer_satisfaction * 100).toFixed(0)}%
          </div>
        </motion.div>

        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-text-dim">Escalation Rate</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {(metrics.escalation_rate * 100).toFixed(1)}%
          </div>
        </motion.div>

        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-accent-cyan" />
            <span className="text-sm text-text-dim">AI Responses</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {metrics.ai_responses_generated.toLocaleString()}
          </div>
        </motion.div>

        <motion.div 
          className="bg-surface rounded-xl p-4 border border-surface"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-text-dim" />
            <span className="text-sm text-text-dim">Sentiment</span>
          </div>
          <div className={`text-2xl font-bold ${getSentimentColor(metrics.sentiment_score)}`}>
            {metrics.sentiment_score > 0 ? '+' : ''}{metrics.sentiment_score.toFixed(1)}
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-surface rounded-xl p-4 border border-surface">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 text-text-primary">
            <Filter className="w-5 h-5" />
            <span>Filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 flex-1">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-1 bg-bg border border-surface rounded-lg text-text-primary text-sm"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-1 bg-bg border border-surface rounded-lg text-text-primary text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-1 bg-bg border border-surface rounded-lg text-text-primary text-sm"
            >
              <option value="">All Categories</option>
              <option value="billing">Billing</option>
              <option value="shipping">Shipping</option>
              <option value="product">Product</option>
              <option value="technical">Technical</option>
              <option value="refund">Refund</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 bg-bg border border-surface rounded-lg text-text-primary placeholder-text-dim w-64"
            />
          </div>
        </div>
      </div>

      {/* Tickets List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Support Tickets ({filteredTickets.length})
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredTickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`bg-surface rounded-xl p-4 border cursor-pointer transition-all ${
                    selectedTicket?.id === ticket.id 
                      ? 'border-accent-cyan shadow-lg shadow-accent-cyan/20' 
                      : 'border-surface hover:border-accent-cyan/50'
                  }`}
                  onClick={() => setSelectedTicket(ticket)}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-text-primary font-medium">#{ticket.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                      
                      <h3 className="text-text-primary font-medium mb-1 line-clamp-1">
                        {ticket.subject}
                      </h3>
                      
                      <p className="text-text-dim text-sm mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-text-dim">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {ticket.customer_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                        {ticket.sentiment_score !== 0 && (
                          <span className={`flex items-center gap-1 ${getSentimentColor(ticket.sentiment_score)}`}>
                            <Users className="w-3 h-3" />
                            {ticket.sentiment_score > 0 ? '+' : ''}{ticket.sentiment_score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button className="p-1 hover:bg-bg rounded transition-colors">
                      <MoreVertical className="w-4 h-4 text-text-dim" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Ticket Details and AI Response */}
        <div className="space-y-6">
          {selectedTicket ? (
            <>
              {/* Ticket Details */}
              <div className="bg-surface rounded-xl p-4 border border-surface">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Ticket Details</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-text-dim">Subject</label>
                    <p className="text-text-primary">{selectedTicket.subject}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-text-dim">Description</label>
                    <p className="text-text-primary text-sm">{selectedTicket.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-text-dim">Status</label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => updateTicket(selectedTicket.id, { status: e.target.value as any })}
                        className="w-full px-2 py-1 bg-bg border border-surface rounded text-text-primary text-sm"
                      >
                        <option value="new">New</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm text-text-dim">Priority</label>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) => updateTicket(selectedTicket.id, { priority: e.target.value as any })}
                        className="w-full px-2 py-1 bg-bg border border-surface rounded text-text-primary text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => escalateTicket(selectedTicket.id, 'Manual escalation')}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Escalate
                    </button>
                    <button
                      onClick={() => generateAIResponse(selectedTicket.id)}
                      disabled={aiGenerating}
                      className="px-3 py-1 bg-accent-cyan text-bg rounded text-sm hover:bg-accent-cyan/80 transition-colors disabled:opacity-50"
                    >
                      {aiGenerating ? 'Generating...' : 'AI Response'}
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Response Generator */}
              <div className="bg-surface rounded-xl p-4 border border-surface">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Bot className="text-accent-cyan" />
                  AI Response Assistant
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-text-dim">Response Tone</label>
                    <select
                      value={aiOptions.tone}
                      onChange={(e) => setAiOptions(prev => ({ ...prev, tone: e.target.value as any }))}
                      className="w-full px-2 py-1 bg-bg border border-surface rounded text-text-primary text-sm"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="formal">Formal</option>
                    </select>
                  </div>
                  
                  {aiResponse && (
                    <div>
                      <label className="text-sm text-text-dim">Generated Response</label>
                      <div className="bg-bg border border-surface rounded p-3 text-text-primary text-sm">
                        {aiResponse}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateTicket(selectedTicket.id, { agent_response: aiResponse })}
                          className="px-3 py-1 bg-accent-green text-bg rounded text-sm hover:bg-accent-green/80 transition-colors"
                        >
                          Send Response
                        </button>
                        <button
                          onClick={() => setAiResponse('')}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-surface rounded-xl p-8 border border-surface text-center">
              <MessageCircle className="w-12 h-12 text-text-dim mx-auto mb-4" />
              <p className="text-text-dim">Select a ticket to view details and generate AI responses</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Form Modal */}
      <AnimatePresence>
        {showNewTicketForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowNewTicketForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-xl p-6 w-full max-w-lg border border-surface"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-text-primary mb-4">Create New Ticket</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-dim mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={newTicket.customer_email}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, customer_email: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg border border-surface rounded text-text-primary"
                    placeholder="customer@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-text-dim mb-1">Subject</label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg border border-surface rounded text-text-primary"
                    placeholder="Brief description of the issue"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-text-dim mb-1">Description</label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg border border-surface rounded text-text-primary h-24"
                    placeholder="Detailed description of the issue..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-dim mb-1">Priority</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-2 py-2 bg-bg border border-surface rounded text-text-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-text-dim mb-1">Category</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-2 py-2 bg-bg border border-surface rounded text-text-primary"
                    >
                      <option value="general">General</option>
                      <option value="billing">Billing</option>
                      <option value="shipping">Shipping</option>
                      <option value="product">Product</option>
                      <option value="technical">Technical</option>
                      <option value="refund">Refund</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={createTicket}
                  className="flex-1 px-4 py-2 bg-accent-cyan text-bg rounded-lg hover:bg-accent-cyan/80 transition-colors"
                >
                  Create Ticket
                </button>
                <button
                  onClick={() => setShowNewTicketForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CustomerSupportModule;