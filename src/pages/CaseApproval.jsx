import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import ApprovalLadder from '../components/ui/ApprovalLadder';
import Chip from '../components/ui/Chip';
import DataTable from '../components/ui/DataTable';
import { inr } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { LADDER } from '../data/mockData';
import { getCases, updateCase } from '../services/caseService';
import { getClients } from '../services/clientService';

const PAGE_SIZE = 5;
const TITLE_META_SEP = ' :: ';
const TITLE_VS_SEP = ' — vs ';

const LEVEL_FILTERS = [
  { key: 'all', label: 'All pending' },
  { key: '0', label: 'Level 1' },
  { key: '1', label: 'Level 2' },
  { key: '2', label: 'Level 3' },
  { key: '3', label: 'Level 4' },
];

const parseTitle = (title = '') => {
  const [head = '', stage = 'Filing', val = '0', fee = '10'] = String(title).split(TITLE_META_SEP);
  let caseType = head;
  let opponent = '';
  const vsIdx = head.indexOf(TITLE_VS_SEP);
  if (vsIdx >= 0) {
    caseType = head.slice(0, vsIdx);
    opponent = head.slice(vsIdx + TITLE_VS_SEP.length);
  }
  return {
    caseType: caseType || title || '—',
    opponent: opponent || '—',
    stage: stage || 'Filing',
    val: Number(val) || 0,
    fee: Number(fee) || 0,
  };
};

const formatHistoryDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getApprovalLevel = (c) => {
  const level = Number(c.approvalLevel);
  if (Number.isNaN(level) || level < 0) return 0;
  return Math.min(4, level);
};

export default function CaseApproval() {
  const { hasPermission, user } = useAuth();
  const canApprove = hasPermission('approve', 'A');

  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [caseList, clientList] = await Promise.all([getCases(), getClients()]);
      setCases(caseList);
      setClients(clientList);
    } catch (err) {
      setError(err.message || 'Failed to load approval queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPendingPage(1);
  }, [query, levelFilter]);

  const getClientName = (id) => {
    const client = clients.find((c) => String(c.id) === String(id));
    return client ? client.name : id ? String(id) : '—';
  };

  const enriched = cases.map((c) => ({
    ...c,
    ...parseTitle(c.title),
    lvl: getApprovalLevel(c),
  }));

  const q = query.trim().toLowerCase();

  const pendingCases = enriched.filter((c) => {
    if (c.status !== 'Pending Approval') return false;
    if (levelFilter !== 'all' && String(c.lvl) !== levelFilter) return false;
    if (!q) return true;
    const haystack = [
      c.caseNo,
      c.caseType,
      c.opponent,
      c.court,
      getClientName(c.clientId),
      String(c.lvl + 1),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const completedCases = enriched.filter((c) => {
    if (c.lvl < 4) return false;
    if (c.status !== 'Active' && c.status !== 'Closed') return false;
    if (!q) return true;
    const haystack = [c.caseNo, c.caseType, c.opponent, getClientName(c.clientId)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const pendingTotalPages = Math.max(1, Math.ceil(pendingCases.length / PAGE_SIZE));
  const pendingCurrent = Math.min(pendingPage, pendingTotalPages);
  const pendingStart = (pendingCurrent - 1) * PAGE_SIZE;
  const pagedPending = pendingCases.slice(pendingStart, pendingStart + PAGE_SIZE);

  const historyTotalPages = Math.max(1, Math.ceil(completedCases.length / PAGE_SIZE));
  const historyCurrent = Math.min(historyPage, historyTotalPages);
  const historyStart = (historyCurrent - 1) * PAGE_SIZE;
  const pagedHistory = completedCases.slice(historyStart, historyStart + PAGE_SIZE);

  const applyApprovalChange = async (caseItem, direction) => {
    const current = getApprovalLevel(caseItem);
    let nextLevel = current;
    let nextStatus = caseItem.status;

    if (direction > 0) {
      nextLevel = Math.min(4, current + 1);
      nextStatus = nextLevel >= 4 ? 'Active' : 'Pending Approval';
    } else {
      nextLevel = Math.max(0, current - 1);
      nextStatus = 'Pending Approval';
    }

    setActingId(caseItem.id);
    setError('');
    try {
      const updated = await updateCase(caseItem.id, {
        approvalLevel: nextLevel,
        status: nextStatus,
      });
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err.message || 'Failed to update approval status');
    } finally {
      setActingId(null);
    }
  };

  const approvalHistoryHeaders = [
    { label: 'Case no.' },
    { label: 'Parties' },
    { label: 'Approved by' },
    { label: 'Date' },
    { label: 'Comments' },
    { label: 'Status' },
  ];

  return (
    <>
      <PageHeader
        title="Case Approval"
        description="A civil case becomes active only after clearing all four levels. Each step records who approved it and when."
      />

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="fgrid">
          <div className="f" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search approvals</label>
            <input
              type="text"
              placeholder="Case no., party, type, court…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="filt">
        {LEVEL_FILTERS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            className={levelFilter === btn.key ? 'on' : ''}
            onClick={() => setLevelFilter(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: '12px',
            borderColor: 'var(--tape)',
            color: 'var(--tape)',
            fontSize: '12.5px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="empty">Loading approval queue…</div>
        </div>
      ) : pagedPending.length ? (
        pagedPending.map((c) => (
          <div className="card" key={c.id}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div className="cno-c">{c.caseNo}</div>
                <div className="card-t" style={{ margin: '3px 0' }}>
                  {getClientName(c.clientId)}{' '}
                  <span className="mut" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                    vs
                  </span>{' '}
                  {c.opponent}
                </div>
                <div className="card-s" style={{ margin: 0 }}>
                  {String(c.caseType || '—').toUpperCase()}
                  {c.court ? ` · ${String(c.court).toUpperCase()}` : ''}
                  {c.val ? ` · ${inr(c.val)}` : ''}
                </div>
              </div>
              <Chip type="c-brass" label={`At level ${Math.min(c.lvl + 1, 4)} of 4`} />
            </div>

            <ApprovalLadder ladder={LADDER} currentLevel={c.lvl} />

            {canApprove ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn b"
                  disabled={actingId === c.id || c.lvl >= 4}
                  onClick={() => applyApprovalChange(c, 1)}
                >
                  {actingId === c.id ? 'Updating…' : `Approve level ${Math.min(c.lvl + 1, 4)}`}
                </button>
                <button
                  className="btn g"
                  disabled={actingId === c.id || c.lvl <= 0}
                  onClick={() => applyApprovalChange(c, -1)}
                >
                  Send back
                </button>
              </div>
            ) : (
              <div
                className="mut"
                style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '8px' }}
              >
                Viewing only — Approval rights restricted for this profile.
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="card">
          <div className="empty">
            {enriched.some((c) => c.status === 'Pending Approval')
              ? 'No cases match this search or filter.'
              : 'No cases awaiting approval. Every filing has cleared all four levels.'}
          </div>
        </div>
      )}

      {!loading && pendingCases.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            margin: '12px 0 18px',
            flexWrap: 'wrap',
          }}
        >
          <div className="mut" style={{ fontSize: '11.5px' }}>
            Showing {pendingStart + 1}–
            {Math.min(pendingStart + PAGE_SIZE, pendingCases.length)} of {pendingCases.length}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn g sm"
              disabled={pendingCurrent <= 1}
              onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button type="button" className="btn g sm" disabled style={{ cursor: 'default' }}>
              {pendingCurrent} / {pendingTotalPages}
            </button>
            <button
              type="button"
              className="btn g sm"
              disabled={pendingCurrent >= pendingTotalPages}
              onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-t">Approval history</div>
        <div className="card-s">CASES THAT COMPLETED THE LADDER</div>

        <DataTable headers={approvalHistoryHeaders}>
          {loading ? (
            <tr>
              <td colSpan={6}>
                <div className="empty">Loading history…</div>
              </td>
            </tr>
          ) : pagedHistory.length ? (
            pagedHistory.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="cno-c">{c.caseNo}</span>
                </td>
                <td>
                  <span className="nm">{getClientName(c.clientId)}</span>
                </td>
                <td className="mut">{user?.n || 'Super Admin'}</td>
                <td className="mono" style={{ fontSize: '11px' }}>
                  {formatHistoryDate(c.updated_at || c.updatedAt)}
                </td>
                <td className="mut" style={{ fontSize: '11.5px' }}>
                  Records verified, fee agreed
                </td>
                <td>
                  <Chip
                    type={c.status === 'Closed' ? 'c-grey' : 'c-baize'}
                    label={c.status === 'Closed' ? 'Case closed' : 'Case active'}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>
                <div className="empty">No completed approvals yet.</div>
              </td>
            </tr>
          )}
        </DataTable>

        {!loading && completedCases.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginTop: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div className="mut" style={{ fontSize: '11.5px' }}>
              Showing {historyStart + 1}–
              {Math.min(historyStart + PAGE_SIZE, completedCases.length)} of{' '}
              {completedCases.length}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn g sm"
                disabled={historyCurrent <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button type="button" className="btn g sm" disabled style={{ cursor: 'default' }}>
                {historyCurrent} / {historyTotalPages}
              </button>
              <button
                type="button"
                className="btn g sm"
                disabled={historyCurrent >= historyTotalPages}
                onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
