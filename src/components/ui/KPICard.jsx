import React from 'react';

export default function KPICard({ label, value, status, type, valueStyle }) {
  // type can be 'b' (baize/green), 't' (tape/red), 'r' (brass/gold), or undefined (neutral)
  return (
    <div className={`kpi ${type ? type : ''}`}>
      <div className="l">{label}</div>
      <div className="v" style={valueStyle}>{value}</div>
      <div className="s">{status}</div>
    </div>
  );
}
