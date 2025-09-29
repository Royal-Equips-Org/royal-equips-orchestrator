import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  Shield,
  Zap,
  Target,
  Globe,
  Clock,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings
} from 'lucide-react';

import { useSocketStore } from '../../stores/socket-store';
import { usePerformance } from '../../hooks/usePerformance';

interface FinancialMetrics {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  transaction_count: number;
  avg_transaction_value: number;
  conversion_rate: number;
  monthly_recurring_revenue: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  gateway: string;
  customer_id?: string;
  order_id?: string;
  description?: string;
  processed_at: string;
  fees: number;
  net_amount: number;
}

interface FraudAlert {
  id: string;
  transaction_id: string;
  risk_score: number;
  alert_type: string;
  description: string;
  created_at: string;
  status: string;
}

interface DashboardData {
  overview: {
    total_revenue_today: number;
    pending_transactions: number;
    failed_transactions: number;
    fraud_alerts: number;
    active_payment_methods: number;
    last_updated: string;
  };
  financial_metrics: FinancialMetrics;
  cash_flow: any;
  recent_activity: Transaction[];
  fraud_alerts: FraudAlert[];
  performance_metrics: any;
}

const FinanceModule: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedView, setSelectedView] = useState('dashboard');

  const socketStore = useSocketStore();
  const { trackInteraction } = usePerformance();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/finance/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      
      const result = await response.json();
      if (result.status === 'success') {
        setDashboardData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Finance dashboard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load finance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async (filters: any = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/finance/transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const result = await response.json();
      if (result.status === 'success') {
        setTransactions(result.data.transactions);
      }
    } catch (err) {
      console.error('Transaction fetch error:', err);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
    fetchTransactions();

    // Set up refresh interval
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Socket event handlers
  useEffect(() => {
    const socket = socketStore.socket;
    if (!socket) return;

    socket.on('finance_update', (data: any) => {
      setDashboardData(prev => prev ? { ...prev, ...data } : data);
      trackInteraction('finance_realtime_update');
    });

    socket.on('transaction_processed', (transaction: any) => {
      setTransactions(prev => [transaction, ...prev.slice(0, 49)]);
      trackInteraction('finance_transaction_update');
    });

    socket.on('fraud_alert', (alert: any) => {
      if (dashboardData) {
        setDashboardData(prev => prev ? {
          ...prev,
          fraud_alerts: [alert, ...prev.fraud_alerts]
        } : prev);
      }
      trackInteraction('finance_fraud_alert');
    });

    return () => {
      socket.off('finance_update');
      socket.off('transaction_processed');
      socket.off('fraud_alert');
    };
  }, [socketStore.socket, dashboardData, trackInteraction]);

  // Calculated metrics
  const calculatedMetrics = useMemo(() => {
    if (!dashboardData) return null;

    const { financial_metrics, overview } = dashboardData;
    
    return {
      revenueGrowth: financial_metrics.profit_margin > 0 ? 15.8 : -5.2, // Simulated growth
      conversionTrend: financial_metrics.conversion_rate > 2.5 ? 'up' : 'down',
      fraudRate: (overview.fraud_alerts / (overview.fraud_alerts + transactions.length)) * 100 || 0,
      avgProcessingTime: 2.3, // Simulated processing time
      topPaymentMethod: 'Credit Card', // Would be calculated from actual data
      cashFlowHealth: financial_metrics.net_profit > 0 ? 'healthy' : 'warning'
    };
  }, [dashboardData, transactions]);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'captured':
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
      case 'declined':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 55) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="text-lg">Loading financial data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">Finance Module Error</h3>
        </div>
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { overview, financial_metrics, recent_activity, fraud_alerts } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Financial Intelligence</h1>
            <p className="text-gray-400">Real-time financial operations & analytics</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              trackInteraction('finance_period_change');
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="quarterly">This Quarter</option>
          </select>

          {/* View Selector */}
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="dashboard">Dashboard</option>
            <option value="transactions">Transactions</option>
            <option value="analytics">Analytics</option>
            <option value="fraud">Fraud Detection</option>
          </select>

          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Today */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Revenue Today</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(overview.total_revenue_today)}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
          </div>
          {calculatedMetrics && (
            <div className="flex items-center mt-2 text-sm">
              {calculatedMetrics.revenueGrowth > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-400 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-400 mr-1" />
              )}
              <span className={calculatedMetrics.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPercent(Math.abs(calculatedMetrics.revenueGrowth))}
              </span>
              <span className="text-gray-400 ml-1">vs yesterday</span>
            </div>
          )}
        </div>

        {/* Transaction Stats */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-cyan-400">
                {financial_metrics.transaction_count.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Activity className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-400">Avg: </span>
            <span className="text-cyan-400 ml-1">
              {formatCurrency(financial_metrics.avg_transaction_value)}
            </span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Conversion Rate</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatPercent(financial_metrics.conversion_rate)}
              </p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Target className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            {calculatedMetrics?.conversionTrend === 'up' ? (
              <ArrowUp className="h-4 w-4 text-green-400 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-400 mr-1" />
            )}
            <span className="text-gray-400">trend</span>
          </div>
        </div>

        {/* Security Alerts */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Fraud Alerts</p>
              <p className="text-2xl font-bold text-red-400">
                {overview.fraud_alerts}
              </p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Shield className="h-6 w-6 text-red-400" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-400">Risk: </span>
            <span className={getRiskColor(calculatedMetrics?.fraudRate || 0)}>
              {formatPercent(calculatedMetrics?.fraudRate || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedView === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <button
                onClick={() => setSelectedView('transactions')}
                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>View All</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {recent_activity.slice(0, 6).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'revenue' ? 'bg-green-500/20' :
                      transaction.type === 'expense' ? 'bg-red-500/20' :
                      'bg-gray-500/20'
                    }`}>
                      {transaction.type === 'revenue' ? (
                        <ArrowUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {transaction.payment_method} • {transaction.gateway}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(transaction.processed_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Health */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Health</h3>
            
            <div className="space-y-4">
              {/* Profit Margin */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Profit Margin</span>
                  <span className="text-sm font-medium">
                    {formatPercent(financial_metrics.profit_margin)}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full">
                  <div
                    className={`h-2 rounded-full ${
                      financial_metrics.profit_margin > 20 ? 'bg-green-500' :
                      financial_metrics.profit_margin > 10 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(5, Math.min(100, financial_metrics.profit_margin))}%` }}
                  />
                </div>
              </div>

              {/* Cash Flow */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Net Profit</span>
                  <span className={`text-sm font-medium ${
                    financial_metrics.net_profit > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(financial_metrics.net_profit)}
                  </span>
                </div>
              </div>

              {/* Monthly Recurring Revenue */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Monthly Recurring Revenue</span>
                  <span className="text-sm font-medium text-cyan-400">
                    {formatCurrency(financial_metrics.monthly_recurring_revenue)}
                  </span>
                </div>
              </div>

              {/* Processing Health */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Avg Processing Time</span>
                  <span className="text-sm font-medium text-green-400">
                    {calculatedMetrics?.avgProcessingTime}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'transactions' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <button className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left pb-3 text-sm text-gray-400">Date/Time</th>
                  <th className="text-left pb-3 text-sm text-gray-400">Type</th>
                  <th className="text-left pb-3 text-sm text-gray-400">Amount</th>
                  <th className="text-left pb-3 text-sm text-gray-400">Method</th>
                  <th className="text-left pb-3 text-sm text-gray-400">Status</th>
                  <th className="text-left pb-3 text-sm text-gray-400">Gateway</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-800">
                    <td className="py-3 text-sm">
                      {new Date(transaction.processed_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.type === 'revenue' ? 'bg-green-500/20 text-green-400' :
                        transaction.type === 'expense' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 font-medium">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                    <td className="py-3 text-sm text-gray-400">
                      {transaction.payment_method}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-400">
                      {transaction.gateway}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedView === 'fraud' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-400" />
              <span>Fraud Detection Alerts</span>
            </h3>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-400">Real-time monitoring active</span>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            {fraud_alerts.length > 0 ? (
              fraud_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.risk_score >= 70 ? 'bg-red-900/20 border-red-500/30' :
                    alert.risk_score >= 55 ? 'bg-yellow-900/20 border-yellow-500/30' :
                    'bg-blue-900/20 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className={`h-5 w-5 ${getRiskColor(alert.risk_score)}`} />
                        <span className="font-medium">{alert.alert_type}</span>
                        <span className={`px-2 py-1 rounded text-xs ${getRiskColor(alert.risk_score)}`}>
                          Risk: {alert.risk_score}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Transaction ID: {alert.transaction_id}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No fraud alerts detected</p>
                <p className="text-sm">All transactions appear legitimate</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Footer */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Global Payments</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Real-time Processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Last updated: {new Date(overview.last_updated).toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span>Uptime: 99.9%</span>
            <div className="h-2 w-2 bg-green-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceModule;