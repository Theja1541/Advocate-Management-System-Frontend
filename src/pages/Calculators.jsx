import React, { useState, useEffect } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { inr } from '../utils/formatters';
import { calculateCourtFeeClient } from '../services/courtFeeCalculator.service';

const AREA = {
  sqft: ['Square feet', 1],
  cent: ['Cent', 435.6],
  acre: ['Acre', 43560],
  sqm: ['Square metre', 10.7639],
  guntha: ['Guntha', 1089],
  ankanam: ['Ankanam', 72],
  sqyd: ['Square yard (gaz)', 9]
};

const ALL_INDIAN_STATES = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'TS', name: 'Telangana' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi' },
  { code: 'KL', name: 'Kerala' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'HR', name: 'Haryana' },
  { code: 'PB', name: 'Punjab' },
  { code: 'OR', name: 'Odisha' },
  { code: 'BR', name: 'Bihar' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'AS', name: 'Assam' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'UT', name: 'Uttarakhand' },
];

export default function Calculators() {
  const [tab, setTab] = useState('court');

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

  // Court Fee State
  const [cv, setCv] = useState(1000);
  const [selectedStateCode, setSelectedStateCode] = useState('AP');
  const [courtFeeResult, setCourtFeeResult] = useState(null);
  const [calcError, setCalcError] = useState(null);

  // Area state
  const [av, setAv] = useState(1);
  const [au, setAu] = useState('cent');

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        setCalcError(null);
        const result = await calculateCourtFeeClient(selectedStateCode, 'MONEY_SUIT', cv);
        setCourtFeeResult(result ? result.courtFee : 0);
      } catch (err) {
        setCalcError(err.response?.data?.error || 'Error calculating court fee.');
        setCourtFeeResult(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedStateCode, cv]);

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
      <button className={`btn ${tab === 'court' ? 'primary' : 'secondary'}`} onClick={() => setTab('court')}>🏛️ Court Fee</button>
      <button className={`btn ${tab === 'fee' ? 'primary' : 'secondary'}`} onClick={() => setTab('fee')}>Advocate fee</button>
      <button className={`btn ${tab === 'pct' ? 'primary' : 'secondary'}`} onClick={() => setTab('pct')}>Percentage</button>
      <button className={`btn ${tab === 'area' ? 'primary' : 'secondary'}`} onClick={() => setTab('area')}>Area converter</button>
    </div>
  );

  // Fee Calculations
  const calculatedFee = (fv * fp) / 100;
  const totalSharePercentage = fs + fj + fr;

  // Percentage Calculations
  const pctOfVal = (pv * pp) / 100;
  const valAsPctOfVal = pv ? ((pa / pv) * 100).toFixed(2) : '0.00';

  // Area Calculations
  const currentAreaUnitMultiplier = AREA[au] ? AREA[au][1] : 1;
  const areaSqft = av * currentAreaUnitMultiplier;

  const selectedStateObj = ALL_INDIAN_STATES.find(s => s.code === selectedStateCode);
  const selectedStateName = selectedStateObj ? selectedStateObj.name : selectedStateCode;

  return (
    <>
      <PageHeader
        title="Calculators & Converters"
        description="State-wise Court Fee working, Advocate fee sharing, and Land measure conversions."
      />

      {renderTabs()}

      {tab === 'court' && (
        <div className="card">
          <div className="card-t">State-wise Court Fee Calculator</div>
          <div className="card-s">AUTOMATIC STATE-SPECIFIC COURT FEE CALCULATION</div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f" style={{ flex: '1.5 1 200px' }}>
              <label>Select State / Jurisdiction</label>
              <select value={selectedStateCode} onChange={e => setSelectedStateCode(e.target.value)}>
                {ALL_INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="f" style={{ flex: '2 1 240px' }}>
              <label>Suit Value (₹)</label>
              <input 
                type="number" 
                className="mono" 
                value={cv === 0 ? '' : cv} 
                onChange={e => setCv(Number(e.target.value) || 0)} 
                placeholder="Enter suit value..."
              />
            </div>
          </div>

          {calcError && (
            <div className="card" style={{ margin: '14px 0 0', borderColor: 'var(--tape)', borderLeft: '4px solid var(--tape)', padding: '14px', background: 'rgba(230, 57, 70, 0.05)' }}>
              <div style={{ fontSize: '13px', color: 'var(--tape)', fontWeight: 'bold' }}>
                ⚠️ {calcError}
              </div>
            </div>
          )}

          {!calcError && courtFeeResult !== null && (
            <div className="calc-out" style={{ marginTop: '16px' }}>
              <div className="co-l">Court Fee ({selectedStateName})</div>
              <div className="co-v">{inr(courtFeeResult)}</div>
              <div className="co-s">
                Calculated automatically based on suit value
              </div>
            </div>
          )}
        </div>
      )}

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
                <div className="mut mono" style={{ fontSize: '12px' }}>{x[1]}% share</div>
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
