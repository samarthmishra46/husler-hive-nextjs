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
  const [kickingUser, setKickingUser] = useState<string | null>(null);

  const handleKick = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to kick ${email} from the Discord channel?`)) return;
    setKickingUser(userId);
    try {
      const res = await fetch('/api/admin/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        alert(`${email} has been kicked successfully.`);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to kick user');
      }
    } catch {
      alert('Error kicking user');
    } finally {
      setKickingUser(null);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setStats(data.stats);
      setRecentActivity(data.recentActivity);
    } catch (error) { console.error('Error fetching stats:', error); }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setUsers(data.users);
    } catch (error) { console.error('Error fetching users:', error); }
  }, [searchTerm, statusFilter, router]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setLogs(data.logs);
    } catch (error) { console.error('Error fetching logs:', error); }
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

  const getStatusStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = { display: 'inline-flex', padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' };
    switch (status) {
      case 'active': return { ...base, background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' };
      case 'trial': return { ...base, background: 'rgba(124,58,237,0.1)', color: 'var(--purple)', border: '1px solid rgba(124,58,237,0.2)' };
      case 'cancelled': return { ...base, background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' };
      case 'expired': return { ...base, background: 'rgba(107,107,138,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
      default: return { ...base, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'payment_success': return '#059669';
      case 'payment_failed': return '#dc2626';
      case 'joined_channel': return '#3b82f6';
      case 'kicked': return '#dc2626';
      case 'left_channel': return '#f97316';
      case 'subscribed': return 'var(--purple)';
      case 'trial_started': return '#8b5cf6';
      default: return 'var(--text-muted)';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s', textAlign: 'center',
    background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
    color: isActive ? 'var(--purple)' : 'var(--text-muted)',
  });

  return (
    <div className="landing-section" style={{ minHeight: '80vh', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <p className="section-eyebrow">Admin</p>
          <h1 className="section-title">Admin <span className="hl">Dashboard</span></h1>
          <p className="section-body">Manage users, payments, and subscriptions</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px', marginBottom: '32px' }}>
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'users' as const, label: 'Users' },
            { id: 'logs' as const, label: 'Audit Logs' },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(activeTab === tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', height: '256px', alignItems: 'center', justifyContent: 'center' }}>
            <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'var(--purple)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Stats grid */}
                <div className="amenities-grid">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
                    { label: 'Active Subscribers', value: stats.activeUsers, icon: '✅' },
                    { label: 'Trial Users', value: stats.trialUsers, icon: '⏳' },
                    { label: 'Channel Members', value: stats.channelMembers, icon: '💬' },
                    { label: 'Total Payments', value: stats.totalPayments, icon: '💳' },
                    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: '💰' },
                  ].map((stat) => (
                    <div key={stat.label} className="amenity-card">
                      <span className="amenity-icon">{stat.icon}</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--purple)', letterSpacing: '-0.02em' }}>{stat.value}</div>
                      <p className="amenity-desc" style={{ marginTop: '4px' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Recent Activity</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentActivity.map((log) => (
                      <div key={log._id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '10px', transition: 'all 0.2s' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: getActionColor(log.action), letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '120px' }}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{log.userEmail}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-light)' }}>
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No activity yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                {/* Filters */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                  <input
                    type="text"
                    placeholder="Search by email, mobile, or Discord..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="subscribe-field"
                    style={{ flex: 1, padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)', fontSize: '0.85rem', color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)', fontSize: '0.85rem', color: 'var(--text)', outline: 'none', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
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
                <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--white)' }}>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Mobile</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Discord</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Channel</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Joined</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{user.email}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{user.mobile}</td>
                          <td style={{ padding: '12px 16px', color: user.discordUsername ? 'var(--text-muted)' : 'var(--text-light)' }}>
                            {user.discordUsername || 'Not connected'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={getStatusStyle(user.subscriptionStatus)}>{user.subscriptionStatus}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {user.channelAdded ? (
                              <span style={{ color: '#059669', fontWeight: 600 }}>✓ In Channel</span>
                            ) : (
                              <span style={{ color: 'var(--text-light)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                            {formatDate(user.joinedAt)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {user.channelAdded && user.discordId ? (
                              <button
                                onClick={() => handleKick(user._id, user.email)}
                                disabled={kickingUser === user._id}
                                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', opacity: kickingUser === user._id ? 0.5 : 1 }}
                              >
                                {kickingUser === user._id ? 'Kicking...' : '🚫 Kick'}
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {logs.map((log) => (
                  <div key={log._id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: getActionColor(log.action), letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{log.userEmail || 'System'}</span>
                    {log.details && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.details}</span>}
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-light)' }}>
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs yet</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
