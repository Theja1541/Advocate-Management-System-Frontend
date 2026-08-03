import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import KPICard from '../components/ui/KPICard';
import Chip from '../components/ui/Chip';
import { inr } from '../utils/formatters';
import { getDashboard } from '../services/dashboardService';
import { getAlerts } from '../services/alertService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, alerts] = await Promise.all([
        getDashboard(),
        getAlerts({ status: 'active' })
      ]);
      setDashboard(data);
      setActiveAlerts(alerts);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
      setDashboard(null);
      setActiveAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <button className="btn g" onClick={() => navigate('/hearings')}>Open hearings</button>
      <button className="btn" onClick={() => navigate('/cases')}>New case</button>
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Everything listed for today, ${displayDate}.`}
        actions={headerActions}
      />

      {error ? (
        <div className="card" style={{ marginBottom: '12px', color: 'var(--tape)' }}>
          {error}
          <button type="button" className="btn g sm" style={{ marginLeft: '10px' }} onClick={loadDashboard}>
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
            <KPICard label="Active" value={kpis.activeCases || 0} status="before the courts" type="b" />
            <KPICard label="Closed" value={kpis.closedCases || 0} status="disposed" />
            <KPICard
              label="Today's hearings"
              value={kpis.todayHearings || causeList.length || 0}
              status={`${kpis.pendingHearings ?? causeMeta.pendingCount ?? 0} still to be called`}
              type="t"
            />
            <KPICard
              label="Pending payments"
              value={inr(kpis.duePaymentAmount || 0)}
              status={`across ${kpis.pendingPaymentsCount || 0} matters`}
              type="r"
              valueStyle={{ fontSize: '21px' }}
            />
            <KPICard
              label="Pending tasks"
              value={kpis.pendingTasks || 0}
              status="approvals & filings"
              type="r"
            />
            <KPICard
              label="Disputed title"
              value={kpis.disputedTitle || 0}
              status="land records"
              type="t"
            />
          </div>

          <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>Notifications Center</h3>
          <div className="kpis">
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts', { state: { statusFilter: 'active', priorityFilter: 'high' } })}>
              <KPICard label="High Priority" value={highPriority} status="requires immediate action" type="t" />
            </div>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts', { state: { statusFilter: 'active', query: 'TODAY' } })}>
              <KPICard label="Due Today" value={dueToday} status="deadlines and hearings" type="b" />
            </div>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/alerts', { state: { statusFilter: 'active', query: 'OVERDUE' } })}>
              <KPICard label="Overdue" value={overdue} status="missed dates and payments" type="r" />
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
              <div className="empty" style={{ padding: '16px' }}>No hearings listed for this date.</div>
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
                notifications.map((a) => (
                  <div key={a.id} className="act-item">
                    <span
                      className="dot"
                      style={{
                        backgroundColor: `var(--${a.severity === 'ink' ? 'ink-3' : a.severity})`,
                      }}
                    ></span>
                    <div>
                      <div className="x">
                        <b>{a.type}</b> — {a.description}
                      </div>
                      <div className="w">{a.dueInfo}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">No open alerts.</div>
              )}
              <button
                className="btn g sm"
                style={{ marginTop: '10px' }}
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
