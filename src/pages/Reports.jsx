import React, { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { getReport, exportReport } from '../services/reportService';

const REPORTS = [
  {
    type: 'case',
    title: 'Case Report',
    description: 'Every matter by court, stage, advocate and next date',
  },
  {
    type: 'advocate',
    title: 'Advocate Report',
    description: 'Case load, disposal and fee earned per advocate',
  },
  {
    type: 'client',
    title: 'Client Report',
    description: 'Matters, documents and fee position per client',
  },
  {
    type: 'payment',
    title: 'Payment Report',
    description: 'Receipts, outstanding and advocate shares',
  },
  {
    type: 'membership',
    title: 'Membership Report',
    description: 'Plans, renewals and expiry',
  },
  {
    type: 'daily',
    title: 'Daily Report',
    description: 'Day book, hearings held and diary entries for a date',
  },
  {
    type: 'monthly',
    title: 'Monthly Report',
    description: 'Consolidated position for the month',
  },
  {
    type: 'state-wise',
    title: 'State-wise Report',
    description: 'Matters and amounts grouped by state',
  },
];

const humanizeKey = (key) => {
  const k = String(key);
  if (k === 'advocateId') return 'ADV. ID';
  if (k === 'advocateName') return 'ADVOCATE';
  if (k === 'clientId') return 'CL. ID';
  if (k === 'clientName') return 'CLIENT';
  if (k === 'nextHearing') return 'NEXT DATE';
  if (k === 'caseValue') return 'VALUE';
  if (k === 'caseNo') return 'CASE NO';
  if (k === 'caseCount') return 'CASES';
  if (k === 'activeCount') return 'ACTIVE';
  if (k === 'closedCount') return 'CLOSED';
  if (k === 'pendingCount') return 'PENDING';

  return k
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const isPlainObject = (value) =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const flattenObjectRows = (obj, label = 'Summary') => {
  if (!isPlainObject(obj)) return [];
  const rows = Object.entries(obj)
    .filter(([, value]) => !Array.isArray(value) && !isPlainObject(value))
    .map(([key, value]) => ({ metric: humanizeKey(key), value }));
  return rows.length ? [{ name: label, rows }] : [];
};

const extractReportTables = (report) => {
  const data = report?.data || {};
  const tables = [];

  const push = (name, rows) => {
    if (!Array.isArray(rows) || !rows.length) return;
    tables.push({ name, rows });
  };

  if (Array.isArray(data.rows)) push('Rows', data.rows);
  if (Array.isArray(data.advocateShares)) push('Advocate Shares', data.advocateShares);
  if (Array.isArray(data.daybook)) push('Daybook', data.daybook);
  if (Array.isArray(data.hearings)) push('Hearings', data.hearings);
  if (Array.isArray(data.diary)) push('Diary', data.diary);

  if (isPlainObject(data.summary)) {
    if (Array.isArray(data.summary.byCourt)) push('By Court', data.summary.byCourt);
    if (Array.isArray(data.summary.byStatus)) push('By Status', data.summary.byStatus);
    if (Array.isArray(data.summary.byState)) push('By State', data.summary.byState);
    tables.push(...flattenObjectRows(data.summary, 'Summary'));
  }

  ['cases', 'payments', 'daybook', 'diary'].forEach((sectionKey) => {
    const section = data[sectionKey];
    if (!isPlainObject(section)) return;
    if (Array.isArray(section.byCourt)) {
      push(`${humanizeKey(sectionKey)} By Court`, section.byCourt);
    }
    tables.push(...flattenObjectRows(section, humanizeKey(sectionKey)));
  });

  if (!tables.length && isPlainObject(data)) {
    tables.push(...flattenObjectRows(data, 'Summary'));
  }

  return tables;
};

const formatCell = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function Reports() {
  const [busyType, setBusyType] = useState(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  // Filters State
  const [date, setDate] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  const tables = useMemo(
    () => (activeReport ? extractReportTables(activeReport) : []),
    [activeReport]
  );

  const getCleanParams = () => {
    const params = {};
    if (date) params.date = date;
    if (month) params.month = month;
    if (year) params.year = year;
    return params;
  };

  const handleGenerate = async (reportDef) => {
    if (busyType) return;
    setError('');
    setBusyType(reportDef.type);
    try {
      const report = await getReport(reportDef.type, getCleanParams());
      setActiveReport(report);
      setModalOpen(true);
    } catch (err) {
      setError(err.message || `Failed to generate ${reportDef.title}`);
    } finally {
      setBusyType(null);
    }
  };

  const handleExport = async (reportDef, format = 'xlsx') => {
    if (busyType) return;
    setError('');
    setBusyType(reportDef.type);
    try {
      await exportReport(reportDef.type, format, getCleanParams());
    } catch (err) {
      setError(err.message || `Failed to export ${reportDef.title}`);
    } finally {
      setBusyType(null);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveReport(null);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate, preview and export. Every report honours the role of the person running it."
      />

      {error ? (
        <div className="card" style={{ marginBottom: 'var(--space-2)', color: 'var(--danger)', padding: 'var(--space-3)' }}>
          {error}
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <div className="card-t" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>Report Filters</div>
        <div className="fgrid">
          <div className="f" style={{ flex: 1 }}>
            <label>Specific Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setMonth('');
              }}
            />
          </div>
          <div className="f" style={{ flex: 1 }}>
            <label>Month</label>
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setDate('');
              }}
            >
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          <div className="f" style={{ flex: 1 }}>
            <label>Year</label>
            <input
              type="number"
              placeholder="e.g. 2026"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              className="btn outline"
              onClick={() => {
                setDate('');
                setMonth('');
                setYear('');
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid3">
        {REPORTS.map((r) => (
          <div className="card" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} key={r.type}>
            <div>
              <div className="card-t" style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{r.title}</div>
              <div className="mut" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 'var(--space-1) 0 var(--space-3)', minHeight: '34px' }}>
                {r.description}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary sm"
                disabled={busyType === r.type}
                onClick={() => handleGenerate(r)}
                style={{ flex: '1 1 auto' }}
              >
                {busyType === r.type ? 'Loading…' : 'Generate'}
              </button>
              <button
                type="button"
                className="btn secondary sm"
                disabled={busyType === r.type}
                onClick={() => handleExport(r, 'xlsx')}
              >
                Excel
              </button>
              <button
                type="button"
                className="btn secondary sm"
                disabled={busyType === r.type}
                onClick={() => handleExport(r, 'csv')}
              >
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={activeReport?.title || 'Report'}
        className="report-modal"
      >
        {activeReport?.description ? (
          <div className="mut" style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {activeReport.description}
            {activeReport.generatedAt
              ? ` · Generated ${new Date(activeReport.generatedAt).toLocaleString()}`
              : ''}
          </div>
        ) : null}

        {tables.length ? (
          tables.map((table) => {
            const columns = [];
            table.rows.forEach((row) => {
              Object.keys(row).forEach((key) => {
                if (!columns.includes(key)) columns.push(key);
              });
            });

            return (
              <div key={table.name} className={`report-table-wrapper report-table-${table.name.toLowerCase().replace(/\s+/g, '-')}`} style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card-t" style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  {table.name}
                </div>
                <DataTable
                  headers={columns.map((key) => {
                    const isNum = key.toLowerCase().includes('value') || key.toLowerCase().includes('count') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('fee') || key === 'id' || key.toLowerCase().includes('id');
                    return {
                      label: humanizeKey(key),
                      className: `mono ${isNum ? 'num' : ''}`,
                      style: { textAlign: isNum ? 'right' : 'left' }
                    };
                  })}
                >
                  {table.rows.map((row, rowIndex) => (
                    <tr key={`${table.name}-${rowIndex}`}>
                      {columns.map((col) => {
                        const isNum = typeof row[col] === 'number' || col.toLowerCase().includes('value') || col.toLowerCase().includes('count') || col.toLowerCase().includes('amount') || col.toLowerCase().includes('fee') || col === 'id' || col.toLowerCase().includes('id');
                        return (
                          <td key={col} className={`mono ${isNum ? 'num' : ''}`} style={{ fontSize: 'var(--text-sm)', textAlign: isNum ? 'right' : 'left' }}>
                            {formatCell(row[col])}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </DataTable>
              </div>
            );
          })
        ) : (
          <div className="empty">No rows returned for this report.</div>
        )}

        <div className="modal-foot" style={{ margin: 'var(--space-2) calc(-1 * var(--space-4)) calc(-1 * var(--space-4))', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button type="button" className="btn secondary" onClick={closeModal}>
            Close
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => window.print()}
          >
            Print Report
          </button>
          {activeReport?.reportType ? (
            <>
              <button
                type="button"
                className="btn primary"
                disabled={!!busyType}
                onClick={() =>
                  handleExport({
                    type: activeReport.reportType,
                    title: activeReport.title,
                  }, 'xlsx')
                }
              >
                Export Excel
              </button>
              <button
                type="button"
                className="btn outline"
                disabled={!!busyType}
                onClick={() =>
                  handleExport({
                    type: activeReport.reportType,
                    title: activeReport.title,
                  }, 'csv')
                }
              >
                Export CSV
              </button>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
