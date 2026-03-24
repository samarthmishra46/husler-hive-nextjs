'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  email: string;
  mobile: string;
  discordUsername: string | null;
  discordId: string | null;
  subscriptionStatus: string;
  channelAdded: boolean;
  trialUsed: boolean;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
}

interface AuditLogEntry {
  _id: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  channelMembers: number;
  totalPayments: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setRecentActivity(data.recentActivity);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 401) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [searchTerm, statusFilter, router]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.status === 401) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      setLogs(data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (activeTab === 'overview') await fetchStats();
      if (activeTab === 'users') await fetchUsers();
      if (activeTab === 'logs') await fetchLogs();
      setLoading(false);
    };
    loadData();
  }, [activeTab, fetchStats, fetchUsers, fetchLogs]);

  useEffect(() => {
    if (activeTab === 'users') {
      const debounce = setTimeout(() => fetchUsers(), 300);
      return () => clearTimeout(debounce);
    }
  }, [searchTerm, statusFilter, activeTab, fetchUsers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20';
      case 'trial': return 'bg-blue-500/10 text-blue-300 ring-blue-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-300 ring-red-500/20';
      case 'expired': return 'bg-gray-500/10 text-gray-300 ring-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 ring-gray-500/20';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'payment_success': return 'text-emerald-400';
      case 'payment_failed': return 'text-red-400';
      case 'joined_channel': return 'text-blue-400';
      case 'kicked': return 'text-red-400';
      case 'left_channel': return 'text-orange-400';
      case 'subscribed': return 'text-amber-400';
      case 'trial_started': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-[80vh] px-6 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="mt-1 text-gray-400">Manage users, payments, and subscriptions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl bg-white/5 p-1">
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'users' as const, label: 'Users' },
            { id: 'logs' as const, label: 'Audit Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-8">
                {/* Stats grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'from-blue-500/20 to-blue-500/5' },
                    { label: 'Active Subscribers', value: stats.activeUsers, icon: '✅', color: 'from-emerald-500/20 to-emerald-500/5' },
                    { label: 'Trial Users', value: stats.trialUsers, icon: '⏳', color: 'from-purple-500/20 to-purple-500/5' },
                    { label: 'Channel Members', value: stats.channelMembers, icon: '💬', color: 'from-[#5865F2]/20 to-[#5865F2]/5' },
                    { label: 'Total Payments', value: stats.totalPayments, icon: '💳', color: 'from-amber-500/20 to-amber-500/5' },
                    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: '💰', color: 'from-green-500/20 to-green-500/5' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded-2xl border border-white/5 bg-gradient-to-br ${stat.color} p-6`}
                    >
                      <div className="mb-2 text-2xl">{stat.icon}</div>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-white">Recent Activity</h2>
                  <div className="space-y-2">
                    {recentActivity.map((log) => (
                      <div
                        key={log._id}
                        className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                      >
                        <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-300">{log.userEmail}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="py-8 text-center text-gray-500">No activity yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-4">
                  <input
                    type="text"
                    placeholder="Search by email, mobile, or Discord..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                    <option value="none">None</option>
                  </select>
                </div>

                {/* Users table */}
                <div className="overflow-x-auto rounded-2xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Mobile</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Discord</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Channel</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Joined</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-400">Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user._id}
                          className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-3 text-white">{user.email}</td>
                          <td className="px-4 py-3 text-gray-300">{user.mobile}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {user.discordUsername || <span className="text-gray-600">Not connected</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getStatusColor(user.subscriptionStatus)}`}>
                              {user.subscriptionStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.channelAdded ? (
                              <span className="text-emerald-400">✓ In Channel</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {formatDate(user.joinedAt)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {formatDate(user.leftAt)}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log._id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-300">{log.userEmail || 'System'}</span>
                    {log.details && (
                      <span className="text-xs text-gray-500">{log.details}</span>
                    )}
                    <span className="ml-auto text-xs text-gray-600">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="py-12 text-center text-gray-500">No audit logs yet</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
