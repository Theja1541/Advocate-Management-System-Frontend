import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import Chip from '../components/ui/Chip';
import { inr } from '../utils/formatters';
import { getDashboard } from '../services/dashboardService';
import { getAlerts } from '../services/alertService';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/tenantService';

export default function Dashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [superStats, setSuperStats] = useState(null);
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const promises = [getDashboard(), getAlerts({ status: 'active' })];
      if (isSuperAdmin) promises.push(getDashboardStats());
      const settled = await Promise.allSettled(promises);

      if (settled[0].status === 'rejected') {
        throw settled[0].reason;
      }

      setDashboard(settled[0].value);
      setActiveAlerts(settled[1]?.status === 'fulfilled' ? settled[1].value || [] : []);
      if (settled[2]?.status === 'fulfilled') setSuperStats(settled[2].value);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
      setDashboard(null);
      setActiveAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const fetchAlertsOnly = async () => {
      try {
        const alerts = await getAlerts({ status: 'active' });
        setActiveAlerts(alerts);
      } catch (err) {
        console.error('Background alert fetch failed', err);
      }
    };
    
    const interval = setInterval(fetchAlertsOnly, 60000);
    return () => clearInterval(interval);
  }, []);

  const headerActions = (
    <>
      <button className="btn secondary" onClick={() => navigate('/hearings')}>Open hearings</button>
      <button className="btn primary" onClick={() => navigate('/cases')}>New case</button>
    </>
  );

  const kpis = dashboard?.kpis || {};
  const causeList = dashboard?.causeList || [];
  const causeMeta = dashboard?.causeMeta || {};
  const recentActivity = dashboard?.recentActivity || [];
  const notifications = dashboard?.notifications || [];
  const displayDate = dashboard?.displayDate || '—';

  const highPriority = activeAlerts.filter(a => a.priority === 'high').length;
  const dueToday = activeAlerts.filter(a => a.alertType.includes('TODAY') || a.alertType === 'PAYMENT_DUE').length;
  const overdue = activeAlerts.filter(a => a.alertType.includes('OVERDUE') || a.alertType.includes('MISSED')).length;
  const totalActive = activeAlerts.length;

  if (isSuperAdmin) {
    const totalTenants = superStats?.totalTenants ?? superStats?.total ?? 0;
    const activeTenants = superStats?.activeTenants ?? superStats?.active ?? 0;
    const suspendedTenants = superStats?.suspendedTenants ?? superStats?.suspended ?? (totalTenants - activeTenants);

    return (
      <>
        <PageHeader
          title="Super Admin Dashboard"
          description="Overview of platform tenants, active subscriptions, and administrative settings."
          actions={
            <button className="btn primary" onClick={() => navigate('/tenants')}>
              Manage Tenants
            </button>
          }
        />

        {error ? (
          <div className="card" style={{ marginBottom: 'var(--space-2)', color: 'var(--danger)', padding: 'var(--space-3)' }}>
            {error}
            <button type="button" className="btn outline sm" style={{ marginLeft: 'var(--space-2)' }} onClick={loadDashboard}>
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="card">
            <div className="empty">Loading super admin dashboard…</div>
          </div>
        ) : (
          <>
            <h3 style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-heading)' }}>
              Tenant Metrics
            </h3>
            <div className="kpis">
              <div style={{ cursor: 'pointer' }} onClick={() => navigate('/tenants')}>
                <KPICard label="Total Tenants" value={totalTenants} status="all registered law firms / organizations" />
              </div>
              <div style={{ cursor: 'pointer' }} onClick={() => navigate('/tenants')}>
                <KPICard label="Active Tenants" value={activeTenants} status="currently operational" type="success" />
              </div>
              <div style={{ cursor: 'pointer' }} onClick={() => navigate('/tenants')}>
                <KPICard label="Suspended Tenants" value={suspendedTenants} status="account suspended or inactive" type="danger" />
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Quick Portal Navigation</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div 
                  className="card" 
                  style={{ padding: '16px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onClick={() => navigate('/tenants')}
                >
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Tenants Management</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Create, edit, suspend, and view details of all tenant law firms.</p>
                </div>
                <div 
                  className="card" 
                  style={{ padding: '16px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onClick={() => navigate('/settings/plans')}
                >
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Subscription Plans</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Manage pricing tiers, user limits, and storage quotas.</p>
                </div>
                <div 
                  className="card" 
                  style={{ padding: '16px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onClick={() => navigate('/settings/tenant')}
                >
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Tenant Settings</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Configure custom platform branding and tenant logo.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Everything listed for today, ${displayDate}.`}
        actions={headerActions}
      />

      {error ? (
        <div className="card" style={{ marginBottom: 'var(--space-2)', color: 'var(--danger)', padding: 'var(--space-3)' }}>
          {error}
          <button type="button" className="btn outline sm" style={{ marginLeft: 'var(--space-2)' }} onClick={loadDashboard}>
            Retry
          </button>
        </div>
      ) : null}

      {loading && !dashboard ? (
        <div className="card">
          <div className="empty">Loading dashboard…</div>
        </div>
      ) : (
        <>
          <div className="kpis">
            <KPICard label="Total cases" value={kpis.totalCases || 0} status="on the register" />
            <KPICard label="Active" value={kpis.activeCases || 0} status="before the courts" type="success" />
            <KPICard label="Closed" value={kpis.closedCases || 0} status="disposed" />
            <KPICard
              label="Today's hearings"
              value={kpis.todayHearings || causeList.length || 0}
              status={`${kpis.pendingHearings ?? causeMeta.pendingCount ?? 0} still to be called`}
              type="danger"
            />
            <KPICard
              label="Pending payments"
              value={inr(kpis.duePaymentAmount || 0)}
              status={`across ${kpis.pendingPaymentsCount || 0} matters`}
              type="warning"
              valueStyle={{ fontSize: 'var(--text-xl)' }}
            />
            <KPICard
              label="Pending tasks"
              value={kpis.pendingTasks || 0}
              status="approvals & filings"
              type="warning"
            />
            <KPICard
              label="Disputed title"
              value={kpis.disputedTitle || 0}
              status="land records"
              type="danger"
            />
          </div>

          <h3 style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-heading)' }}>Notifications Center</h3>
          <div className="kpis">
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts', { state: { statusFilter: 'active', priorityFilter: 'high' } })}>
              <KPICard label="High Priority" value={highPriority} status="requires immediate action" type="danger" />
            </div>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts', { state: { statusFilter: 'active', query: 'TODAY' } })}>
              <KPICard label="Due Today" value={dueToday} status="deadlines and hearings" type="success" />
            </div>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts', { state: { statusFilter: 'active', query: 'OVERDUE' } })}>
              <KPICard label="Overdue" value={overdue} status="missed dates and payments" type="warning" />
            </div>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts', { state: { statusFilter: 'active' } })}>
              <KPICard label="Total Active" value={totalActive} status="all open notifications" />
            </div>
          </div>

          <div className="cause">
            <div className="cause-h">
              <h3>Today's Case List</h3>
              <span className="dt">
                {String(displayDate).toUpperCase()} · {causeMeta.matterCount || causeList.length} MATTERS · {causeMeta.courtCount || 0} COURTS
              </span>
            </div>
            {causeList.length ? (
              causeList.map((c, index) => (
                <div key={`${c.no}-${index}`} className={`cause-row ${c.done ? 'done' : ''}`}>
                  <div className="ctime">
                    {c.t}<span>{c.ap}</span>
                  </div>
                  <div className="cmain">
                    <div className="cno">{c.no}</div>
                    <div className="cpar ser">
                      {c.clientName}
                      <span className="vs">vs</span>
                      {c.opponent}
                    </div>
                    <div className="cct">
                      {c.court} &nbsp;·&nbsp; {c.advocateName}
                    </div>
                  </div>
                  <div className="cmeta">
                    <Chip type={c.done ? 'c-grey' : 'c-tape'} label={c.done ? 'Called' : c.stage} />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: 'var(--space-3)' }}>No hearings listed for this date.</div>
            )}
          </div>

          <div className="two">
            <div className="card">
              <div className="card-t">Recent activity</div>
              <div className="card-s">LAST FIVE ENTRIES</div>
              {recentActivity.length ? (
                recentActivity.map((act, index) => (
                  <div key={index} className="act-item">
                    <span className="dot" style={{ backgroundColor: act.color }}></span>
                    <div>
                      <div className="x" dangerouslySetInnerHTML={{ __html: act.text }}></div>
                      <div className="w">{act.time}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">No recent activity.</div>
              )}
            </div>

            <div className="card">
              <div className="card-t">Notifications</div>
              <div className="card-s">REQUIRING ATTENTION</div>
              {notifications.length ? (
                notifications.map((a) => {
                  const sevMap = { tape: 'danger', baize: 'success', brass: 'warning', ink: 'text-secondary' };
                  const sevColor = sevMap[a.severity] || 'text-secondary';
                  return (
                    <div key={a.id} className="act-item">
                      <span
                        className="dot"
                        style={{
                          backgroundColor: `var(--${sevColor})`,
                        }}
                      ></span>
                      <div>
                        <div className="x">
                          <b>{a.type}</b> — {a.description}
                        </div>
                        <div className="w">{a.dueInfo}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty">No open alerts.</div>
              )}
              <button
                className="btn ghost sm"
                style={{ marginTop: 'var(--space-2)' }}
                onClick={() => navigate('/alerts')}
              >
                See all alerts
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
