import React, { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { inr } from '../utils/formatters';

const AREA = {
  sqft: ['Square feet', 1],
  cent: ['Cent', 435.6],
  acre: ['Acre', 43560],
  sqm: ['Square metre', 10.7639],
  guntha: ['Guntha', 1089],
  ankanam: ['Ankanam', 72],
  sqyd: ['Square yard (gaz)', 9]
};

export default function Calculators() {
  const [tab, setTab] = useState('fee');

  // Fee state
  const [fv, setFv] = useState(1850000);
  const [fp, setFp] = useState(12);
  const [fs, setFs] = useState(50);
  const [fj, setFj] = useState(35);
  const [fr, setFr] = useState(15);

  // Percentage state
  const [pv, setPv] = useState(4200000);
  const [pp, setPp] = useState(15);
  const [pa, setPa] = useState(630000);

  // Court fee state
  const [cv, setCv] = useState(1850000);
  const [cp, setCp] = useState(1);
  const [ca, setCa] = useState(12);
  const [cm, setCm] = useState(4500);

  // Area state
  const [av, setAv] = useState(1);
  const [au, setAu] = useState('cent');

  const renderTabs = () => (
    <div className="tabs">
      <button className={tab === 'fee' ? 'on' : ''} onClick={() => setTab('fee')}>Advocate fee</button>
      <button className={tab === 'pct' ? 'on' : ''} onClick={() => setTab('pct')}>Percentage</button>
      <button className={tab === 'court' ? 'on' : ''} onClick={() => setTab('court')}>Civil case fee</button>
      <button className={tab === 'area' ? 'on' : ''} onClick={() => setTab('area')}>Area converter</button>
    </div>
  );

  // Fee Calculations
  const calculatedFee = (fv * fp) / 100;
  const totalSharePercentage = fs + fj + fr;

  // Percentage Calculations
  const pctOfVal = (pv * pp) / 100;
  const valAsPctOfVal = pv ? ((pa / pv) * 100).toFixed(2) : '0.00';

  // Court Fee Calculations
  const courtFeeEst = (cv * cp) / 100;
  const advFeeEst = (cv * ca) / 100;
  const totalCourtFeeEst = courtFeeEst + advFeeEst + cm;

  // Area Calculations
  const currentAreaUnitMultiplier = AREA[au] ? AREA[au][1] : 1;
  const areaSqft = av * currentAreaUnitMultiplier;

  return (
    <>
      <PageHeader
        title="Calculators & Converters"
        description="Fee working and land measure conversion — the two sums this office does every day."
      />

      {renderTabs()}

      {tab === 'fee' && (
        <div className="card">
          <div className="card-t">Advocate fee calculator</div>
          <div className="card-s">SUIT VALUE × AGREED PERCENTAGE, SHARED ACROSS SENIOR, JUNIOR AND REFERRAL</div>
          <div className="fgrid" style={{ alignItems: 'flex-end' }}>
            <div className="f" style={{ flex: '2 1 200px' }}>
              <label>Suit value (₹)</label>
              <input type="number" className="mono" value={fv || ''} onChange={e => setFv(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ flex: '1 1 120px' }}>
              <label>Fee %</label>
              <input type="number" className="mono" value={fp || ''} step="0.5" onChange={e => setFp(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ flex: '1.5 1 180px', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[5, 10, 15, 20].map(val => (
                  <button
                    key={val}
                    type="button"
                    className={`btn sm ${fp === val ? '' : 'g'}`}
                    style={{ padding: '6px 10px', fontSize: '11px', minWidth: 'auto', flex: 1 }}
                    onClick={() => setFp(val)}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="fgrid" style={{ marginTop: '14px' }}>
            <div className="f" style={{ flex: 1 }}>
              <label>Senior share %</label>
              <input type="number" className="mono" value={fs || ''} onChange={e => setFs(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ flex: 1 }}>
              <label>Junior share %</label>
              <input type="number" className="mono" value={fj || ''} onChange={e => setFj(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ flex: 1 }}>
              <label>Referral share %</label>
              <input type="number" className="mono" value={fr || ''} onChange={e => setFr(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="calc-out">
            <div className="co-l">Total advocate fee</div>
            <div className="co-v">{inr(calculatedFee)}</div>
            <div className="co-s">{fp}% of {inr(fv)}</div>
          </div>

          {totalSharePercentage !== 100 && (
            <div className="card" style={{ margin: '12px 0 0', borderColor: 'var(--tape)', borderLeft: '3px solid var(--tape)', padding: '10px' }}>
              <div style={{ fontSize: '12px', color: 'var(--tape)', fontWeight: 'bold' }}>
                ⚠️ Shares total {totalSharePercentage}%. Adjust senior, junior and referral so they add up to 100% before recording this against a case.
              </div>
            </div>
          )}

          <div className="split">
            {[
              ['Senior advocate', fs],
              ['Junior advocate', fj],
              ['Referral advocate', fr]
            ].map((x, idx) => (
              <div className="card" style={{ margin: 0 }} key={idx}>
                <div className="card-s" style={{ margin: '0 0 4px' }}>{x[0].toUpperCase()}</div>
                <div className="ser" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {inr((calculatedFee * x[1]) / 100)}
                </div>
                <div className="mut mono" style={{ fontSize: '10.5px' }}>{x[1]}% share</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'pct' && (
        <div className="card">
          <div className="card-t">Percentage calculator</div>
          <div className="card-s">WHAT IS X% OF A VALUE, AND WHAT PERCENTAGE IS ONE FIGURE OF ANOTHER</div>
          <div className="fgrid">
            <div className="f">
              <label>Value (₹)</label>
              <input type="number" className="mono" value={pv || ''} onChange={e => setPv(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ maxWidth: '130px' }}>
              <label>Percentage</label>
              <input type="number" className="mono" value={pp || ''} step="0.25" onChange={e => setPp(Number(e.target.value) || 0)} />
            </div>
            <div className="f">
              <label>Part amount (₹)</label>
              <input type="number" className="mono" value={pa || ''} onChange={e => setPa(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="split">
            <div className="calc-out">
              <div className="co-l">{pp}% of {inr(pv)}</div>
              <div className="co-v">{inr(pctOfVal)}</div>
              <div className="co-s">value × {pp} ÷ 100</div>
            </div>
            <div className="calc-out">
              <div className="co-l">{inr(pa)} as a % of {inr(pv)}</div>
              <div className="co-v">{valAsPctOfVal}%</div>
              <div className="co-s">part ÷ value × 100</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'court' && (
        <div className="card">
          <div className="card-t">Civil case fee</div>
          <div className="card-s">INDICATIVE COURT FEE ON THE SUIT VALUE, PLUS THE ADVOCATE FEE AT THE AGREED RATE</div>
          <div className="fgrid">
            <div className="f">
              <label>Suit value (₹)</label>
              <input type="number" className="mono" value={cv || ''} onChange={e => setCv(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ maxWidth: '150px' }}>
              <label>Court fee %</label>
              <input type="number" className="mono" value={cp || ''} step="0.25" onChange={e => setCp(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ maxWidth: '150px' }}>
              <label>Advocate fee %</label>
              <input type="number" className="mono" value={ca || ''} step="0.5" onChange={e => setCa(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ maxWidth: '150px' }}>
              <label>Misc. & process (₹)</label>
              <input type="number" className="mono" value={cm || ''} onChange={e => setCm(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="calc-out">
            <div className="co-l">Estimated total payable by client</div>
            <div className="co-v">{inr(totalCourtFeeEst)}</div>
            <div className="co-s">court fee {inr(courtFeeEst)} &nbsp;+&nbsp; advocate fee {inr(advFeeEst)} &nbsp;+&nbsp; misc. {inr(cm)}</div>
          </div>

          <div className="card-s" style={{ marginTop: '12px' }}>
            Court fee is calculated here at a flat percentage for estimation. Actual fee is governed by the Andhra Pradesh Court Fees and Suits Valuation Act, 1956 and its slabs — verify before filing.
          </div>
        </div>
      )}

      {tab === 'area' && (
        <div className="card">
          <div className="card-t">Area converter</div>
          <div className="card-s">LAND MEASURE USED ACROSS ANDHRA PRADESH — CONVERTS TO EVERY OTHER UNIT AT ONCE</div>
          <div className="fgrid">
            <div className="f" style={{ maxWidth: '180px' }}>
              <label>Value</label>
              <input type="number" className="mono" value={av || ''} step="any" onChange={e => setAv(Number(e.target.value) || 0)} />
            </div>
            <div className="f" style={{ maxWidth: '200px' }}>
              <label>Unit</label>
              <select value={au} onChange={e => setAu(e.target.value)}>
                {Object.entries(AREA).map(([k, v]) => (
                  <option key={k} value={k}>{v[0]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="calc-out">
            <div className="co-l">{av} {AREA[au] ? AREA[au][0] : ''} equals</div>
            <div className="co-v">{areaSqft.toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq ft</div>
            <div className="co-s">1 {AREA[au] ? AREA[au][0].toLowerCase() : ''} = {AREA[au] ? AREA[au][1].toLocaleString('en-IN') : ''} sq ft</div>
          </div>

          <div className="card" style={{ marginTop: '12px' }}>
            {Object.entries(AREA).filter(([k]) => k !== au).map(([k, a]) => (
              <div className="conv-row" key={k}>
                <span style={{ fontSize: '12.5px' }}>{a[0]}</span>
                <span className="cv">{(areaSqft / a[1]).toLocaleString('en-IN', { maximumFractionDigits: 4 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
