import React, { useState } from 'react';
import { useLegalData } from '../context/DataContext';
import PageHeader from '../components/ui/PageHeader';

export default function Amend() {
  const { amend } = useLegalData();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const getFilteredBlocks = () => {
    return amend.map(g => {
      const filteredRows = g.rows.filter(r => 
        !q || 
        String(r[0] || '').toLowerCase().includes(q) || 
        String(r[2] || '').toLowerCase().includes(q) ||
        String(r[1] || '').toLowerCase().includes(q) || 
        String(r[3] || '').toLowerCase().includes(q)
      );
      return { ...g, rows: filteredRows };
    }).filter(g => g.rows.length > 0);
  };

  const filteredBlocks = getFilteredBlocks();

  const formatHeaderDate = (dateStr) => {
    if (!dateStr) return '01 JULY 2024';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(dateStr).toUpperCase();
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  };

  return (
    <>
      <PageHeader
        title="Amendment Tracker"
        description="Old law to new — section-by-section, with the date the change took effect."
      />

      <div className="card" style={{ borderLeft: '3px solid var(--tape)' }}>
        <div className="card-t">Three codes replaced on 1 July 2024</div>
        <div className="card-s" style={{ marginBottom: '9px' }}>
          IPC → BNS &nbsp;·&nbsp; CrPC → BNSS &nbsp;·&nbsp; EVIDENCE ACT → BSA
        </div>
        <div className="fgrid">
          <div className="f" style={{ flex: 3 }}>
            <label>Find a section in either law</label>
            <input
              type="text"
              className="mono"
              placeholder="e.g. 302, 65B, cheating"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div id="amWrap">
        {filteredBlocks.length ? (
          filteredBlocks.map((g, gi) => (
            <div className="tbl-card" key={gi}>
              <div style={{ padding: '12px 14px', borderBottom: '1.5px solid var(--rule)', backgroundColor: 'var(--panel)' }}>
                <div className="card-t" style={{ fontSize: '13.5px', margin: 0 }}>{g.g}</div>
                <div className="card-s" style={{ margin: '2px 0 0' }}>EFFECTIVE {formatHeaderDate(g.effectiveDate)}</div>
              </div>
              {g.rows.map((r, ri) => (
                <div className="amend" key={ri}>
                  <div className="old">
                    <div className="sec">Section {r[0]}</div>
                    <div className="ttl">{r[1]}</div>
                  </div>
                  <div className="arrow">→</div>
                  <div className="new">
                    <div className="sec">Section {r[2]}</div>
                    <div className="ttl">{r[3]}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="card">
            <div className="empty">No section matches that search.</div>
          </div>
        )}
      </div>
    </>
  );
}
