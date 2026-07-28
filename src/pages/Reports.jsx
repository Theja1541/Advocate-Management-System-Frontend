import React, { useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { getReport, exportReportCsv } from '../services/reportService';

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

const humanizeKey = (key) =>
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

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

  const tables = useMemo(
    () => (activeReport ? extractReportTables(activeReport) : []),
    [activeReport]
  );

  const handleGenerate = async (reportDef) => {
    if (busyType) return;
    setError('');
    setBusyType(reportDef.type);
    try {
      const report = await getReport(reportDef.type);
      setActiveReport(report);
      setModalOpen(true);
    } catch (err) {
      setError(err.message || `Failed to generate ${reportDef.title}`);
    } finally {
      setBusyType(null);
    }
  };

  const handleExport = async (reportDef) => {
    if (busyType) return;
    setError('');
    setBusyType(reportDef.type);
    try {
      await exportReportCsv(reportDef.type);
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
        <div className="card" style={{ marginBottom: '12px', color: 'var(--tape)' }}>
          {error}
        </div>
      ) : null}

      <div className="grid3">
        {REPORTS.map((r) => (
          <div className="card" style={{ margin: 0 }} key={r.type}>
            <div className="card-t" style={{ fontSize: '14px' }}>{r.title}</div>
            <div className="mut" style={{ fontSize: '11.5px', lineHeight: 1.5, margin: '5px 0 11px', minHeight: '34px' }}>
              {r.description}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn sm"
                disabled={busyType === r.type}
                onClick={() => handleGenerate(r)}
              >
                {busyType === r.type ? 'Loading…' : 'Generate'}
              </button>
              <button
                type="button"
                className="btn g sm"
                disabled={busyType === r.type}
                onClick={() => handleExport(r)}
              >
                Export
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
          <div className="mut" style={{ marginBottom: '12px', fontSize: '12px' }}>
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
              <div key={table.name} style={{ marginBottom: '16px' }}>
                <div className="card-t" style={{ fontSize: '13px', marginBottom: '8px' }}>
                  {table.name}
                </div>
                <DataTable
                  headers={columns.map((key) => ({
                    label: humanizeKey(key),
                    className: 'mono',
                  }))}
                >
                  {table.rows.map((row, rowIndex) => (
                    <tr key={`${table.name}-${rowIndex}`}>
                      {columns.map((col) => (
                        <td key={col} className="mono" style={{ fontSize: '11px' }}>
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </DataTable>
              </div>
            );
          })
        ) : (
          <div className="empty">No rows returned for this report.</div>
        )}

        <div className="modal-foot" style={{ margin: '0 -16px -16px', borderRadius: '0 0 8px 8px' }}>
          <button type="button" className="btn g" onClick={closeModal}>
            Close
          </button>
          {activeReport?.reportType ? (
            <button
              type="button"
              className="btn"
              disabled={!!busyType}
              onClick={() =>
                handleExport({
                  type: activeReport.reportType,
                  title: activeReport.title,
                })
              }
            >
              Export CSV
            </button>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
