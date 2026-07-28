import React from 'react';

export default function DataTable({ headers = [], children }) {
  return (
    <div className="tbl-card">
      <table className="t">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={h.className || ''}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
