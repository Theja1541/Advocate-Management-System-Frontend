import React from 'react';

export default function KPICard({ label, value, status, type, valueStyle }) {
  // type can be 'success', 'warning', 'danger', 'info', or legacy 'b', 't', 'r'
  const finalType = type || 'primary';
  return (
    <div className={`kpi ${finalType}`}>
      <div className="l">{label}</div>
      <div className="v" style={valueStyle}>{value}</div>
      <div className="s">{status}</div>
    </div>
  );
}
