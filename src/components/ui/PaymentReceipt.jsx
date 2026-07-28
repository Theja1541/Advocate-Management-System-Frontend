import React, { useRef } from 'react';
import { inr } from '../../utils/formatters';

const PST = {
  paid: ['Paid', 'paid'],
  part: ['Part paid', 'part'],
  pending: ['Pending', 'pending'],
};

export default function PaymentReceipt({
  payment,
  caseNo,
  partyName,
  formatDate,
  onClose,
}) {
  const printRef = useRef(null);

  if (!payment) return null;

  const received = Number(payment.amountReceived || 0);
  const outstanding = Number(payment.amountOutstanding || 0);
  const statusChip = PST[payment.status] || ['Unknown', 'pending'];

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .receipt-modal {
      max-width: 720px !important;
      width: 90% !important;
    }

    .rcpt-container {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      max-width: 680px;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    .rcpt-header-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #0f172a 0%, #1e3a8a 35%, #c5a880 100%);
    }

    .rcpt-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 12px;
      gap: 20px;
    }

    .firm-details {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .firm-logo {
      background: #0f172a;
      color: #ffffff;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      flex-shrink: 0;
    }

    .firm-logo svg {
      width: 24px;
      height: 24px;
      stroke: #c5a880;
    }

    .firm-name {
      font-family: 'Cinzel', serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0;
    }

    .firm-subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .firm-address {
      font-size: 11px;
      color: #94a3b8;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }

    .receipt-meta {
      text-align: right;
    }

    .receipt-title {
      font-family: 'Cinzel', serif;
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: 2px;
    }

    .meta-table {
      border-collapse: collapse;
      margin-left: auto;
    }

    .meta-table td {
      padding: 3px 6px;
      font-size: 11.5px;
    }

    .meta-label {
      color: #64748b;
      font-weight: 600;
      text-align: right;
    }

    .meta-value {
      color: #0f172a;
      font-weight: 500;
      text-align: left;
      padding-left: 10px;
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.paid {
      background-color: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .status-badge.part {
      background-color: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .status-badge.pending {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .rcpt-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 24px 0;
    }

    .details-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 1px;
      margin: 0 0 8px 0;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
      text-transform: uppercase;
    }

    .detail-name {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .detail-sub {
      font-size: 11.5px;
      color: #64748b;
      margin: 4px 0 0 0;
    }

    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .receipt-table th {
      background: #f8fafc;
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 1.5px;
      text-align: left;
      padding: 10px 14px;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }

    .receipt-table td {
      padding: 18px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      vertical-align: top;
    }

    .item-title {
      font-weight: 600;
      color: #0f172a;
      font-size: 13.5px;
    }

    .item-desc {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.5;
    }

    .text-right {
      text-align: right !important;
    }

    .font-semibold {
      font-weight: 600;
    }

    .summary-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-details {
      grid-column: 2;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
      color: #64748b;
    }

    .summary-row .summary-value {
      color: #0f172a;
      font-weight: 500;
    }

    .total-row {
      border-top: 2px double #e2e8f0;
      padding-top: 10px;
      font-size: 14.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .total-row .summary-value {
      color: #1e3a8a;
      font-weight: 700;
    }

    .receipt-footer {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 40px;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
    }

    .footer-notes {
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.6;
    }

    .notes-title {
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .signature-block {
      text-align: center;
    }

    .signature-line {
      border-top: 1.5px solid #cbd5e1;
      margin-bottom: 8px;
    }

    .signature-label {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      margin: 0;
    }

    .signature-firm {
      font-size: 9.5px;
      color: #94a3b8;
      margin: 3px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `;

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const win = window.open('', '_blank', 'width=800,height=950');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Receipt_${payment.receiptNo}</title>
  <style>
    body {
      margin: 0;
      padding: 40px;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${styles}
    .rcpt-container {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
  </style>
</head>
<body>
  ${node.outerHTML}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`);
    win.document.close();
    win.focus();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{styles}</style>
      <div
        className="modal-content receipt-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Payment receipt"
      >
        <div className="modal-h">
          <h3>Payment Receipt</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ padding: '24px', backgroundColor: '#f8fafc' }}>
          <div className="rcpt-container" ref={printRef}>
            <div className="rcpt-header-line"></div>
            
            <div className="rcpt-header">
              <div className="firm-details">
                <div className="firm-logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
                    <path d="M18 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4" />
                    <circle cx="8" cy="12" r="2" />
                    <line x1="8" y1="14" x2="8" y2="22" />
                    <line x1="16" y1="8" x2="16" y2="22" />
                  </svg>
                </div>
                <div>
                  <h2 className="firm-name">LEGAL DESK & ASSOCIATES</h2>
                  <p className="firm-subtitle">Advocates & Legal Consultants</p>
                  <p className="firm-address">High Court Chambers Complex, Suite 402<br />contact@legaldesk.com • +91 98765 43210</p>
                </div>
              </div>
              <div className="receipt-meta">
                <h1 className="receipt-title">RECEIPT</h1>
                <table className="meta-table">
                  <tbody>
                    <tr>
                      <td className="meta-label">RECEIPT NO:</td>
                      <td className="meta-value mono" style={{ fontWeight: 700 }}>#{payment.receiptNo}</td>
                    </tr>
                    <tr>
                      <td className="meta-label">DATE:</td>
                      <td className="meta-value">{formatDate(payment.transactionDate)}</td>
                    </tr>
                    <tr>
                      <td className="meta-label">STATUS:</td>
                      <td className="meta-value">
                        <span className={`status-badge ${statusChip[1]}`}>
                          {statusChip[0]}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rcpt-divider"></div>

            <div className="details-section">
              <div>
                <h3 className="section-title">Received From</h3>
                <p className="detail-name">{partyName}</p>
                <p className="detail-sub">Category: {payment.partyType}</p>
              </div>
              <div>
                <h3 className="section-title">Matter Reference</h3>
                <p className="detail-name">Case No: {caseNo || 'General Consultation'}</p>
                <p className="detail-sub">Professional fee settlement</p>
              </div>
            </div>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>DESCRIPTION OF SERVICES</th>
                  <th className="text-right">AMOUNT RECEIVED</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="item-title">Professional Legal Services</div>
                    <div className="item-desc">
                      Retainer fee and litigation representation services provided in connection with the matter {caseNo ? `under Case No. ${caseNo}` : 'referred above'}.
                    </div>
                  </td>
                  <td className="text-right mono font-semibold" style={{ fontSize: '14px' }}>
                    {inr(received)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="summary-container">
              <div className="summary-details">
                <div className="summary-row">
                  <span className="summary-label">Amount Received:</span>
                  <span className="summary-value mono">{inr(received)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Outstanding Balance:</span>
                  <span className="summary-value mono" style={{ color: outstanding ? '#b91c1c' : 'inherit' }}>
                    {outstanding ? inr(outstanding) : 'Nil'}
                  </span>
                </div>
                <div className="summary-row total-row">
                  <span className="summary-label">Total Applied:</span>
                  <span className="summary-value mono">{inr(received)}</span>
                </div>
              </div>
            </div>

            <div className="receipt-footer">
              <div className="footer-notes">
                <h4 className="notes-title">Important Acknowledgment:</h4>
                <p>
                  This is an official document verifying the receipt of the specified amount toward professional fees. 
                  All payments are subject to realizations where applicable. Thank you.
                </p>
              </div>
              <div className="signature-block">
                <div style={{ height: '36px' }}></div>
                <div className="signature-line"></div>
                <p className="signature-label">Authorized Representative</p>
                <p className="signature-firm">Legal Desk & Associates</p>
              </div>
            </div>
          </div>

          <div className="modal-foot" style={{ marginTop: '16px', padding: '16px 0 0', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn g" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn" onClick={handlePrint}>
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
