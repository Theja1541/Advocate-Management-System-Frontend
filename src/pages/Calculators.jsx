import React, { useState, useEffect } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { inr } from '../utils/formatters';
import { getStateFeeConfigs } from '../services/caseMastersService';
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
];

export default function Calculators() {
  const [tab, setTab] = useState('court'); // Default to Civil Staff Calculator

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

  // Civil Staff State-wise Court Fee State
  const [cv, setCv] = useState(1850000);
  const [selectedStateCode, setSelectedStateCode] = useState('AP');
  const [stateRules, setStateRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [advocateFeePctOverride, setAdvocateFeePctOverride] = useState(null);
  const [processFeeOverride, setProcessFeeOverride] = useState(null);
  const [filingFeeOverride, setFilingFeeOverride] = useState(null);
  const [miscChargesOverride, setMiscChargesOverride] = useState(null);

  // Area state
  const [av, setAv] = useState(1);
  const [au, setAu] = useState('cent');

  // Load state rules from server
  useEffect(() => {
    async function loadStateRules() {
      setLoadingRules(true);
      try {
        const rules = await getStateFeeConfigs(true);
        setStateRules(rules);
      } catch (err) {
        console.error('Failed to load state fee configs:', err);
      } finally {
        setLoadingRules(false);
      }
    }
    loadStateRules();
  }, []);

  // Find active rule for selected state
  const activeStateRule = stateRules.find(r => r.stateCode === selectedStateCode && r.isActive);

  // Reset overrides when state changes
  const handleStateChange = (code) => {
    setSelectedStateCode(code);
    setAdvocateFeePctOverride(null);
    setProcessFeeOverride(null);
    setFilingFeeOverride(null);
    setMiscChargesOverride(null);
  };

  // Prepare active rule with any manual user overrides
  const effectiveRuleForCalculation = activeStateRule ? {
    ...activeStateRule,
    processFee: processFeeOverride !== null ? processFeeOverride : activeStateRule.processFee,
    filingFee: filingFeeOverride !== null ? filingFeeOverride : activeStateRule.filingFee,
    miscCharges: miscChargesOverride !== null ? miscChargesOverride : activeStateRule.miscCharges,
  } : null;

  const currentAdvocateFeePct = advocateFeePctOverride !== null
    ? advocateFeePctOverride
    : (activeStateRule ? activeStateRule.defaultAdvocateFeePct : 10);

  const calcBreakdown = effectiveRuleForCalculation
    ? calculateCourtFeeClient(effectiveRuleForCalculation, cv, currentAdvocateFeePct)
    : null;

  const renderTabs = () => (
    <div className="tabs">
      <button className={tab === 'court' ? 'on' : ''} onClick={() => setTab('court')}>🏛️ Civil Staff Calculator</button>
      <button className={tab === 'fee' ? 'on' : ''} onClick={() => setTab('fee')}>Advocate fee</button>
      <button className={tab === 'pct' ? 'on' : ''} onClick={() => setTab('pct')}>Percentage</button>
      <button className={tab === 'area' ? 'on' : ''} onClick={() => setTab('area')}>Area converter</button>
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
        description="State-wise Civil Staff Court Fee working, Advocate fee sharing, and Land measure conversions."
      />

      {renderTabs()}

      {tab === 'court' && (
        <div className="card">
          <div className="card-t">State-wise Amount Calculator — Civil Staff Calculator</div>
          <div className="card-s">AUTOMATIC STATE-SPECIFIC COURT FEE RULES, SEPARATE CHARGES, AND ITEMIZATION</div>

          <div className="fgrid" style={{ marginTop: '12px' }}>
            <div className="f" style={{ flex: '1.5 1 200px' }}>
              <label>Select State / Jurisdiction</label>
              <select value={selectedStateCode} onChange={e => handleStateChange(e.target.value)}>
                {ALL_INDIAN_STATES.map(s => {
                  const hasRule = stateRules.some(r => r.stateCode === s.code && r.isActive);
                  return (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code}) {hasRule ? '✓ Configured' : '— No Config'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="f" style={{ flex: '2 1 240px' }}>
              <label>Suit Value (₹)</label>
              <input 
                type="number" 
                className="mono" 
                value={cv || ''} 
                onChange={e => setCv(Number(e.target.value) || 0)} 
                placeholder="Enter suit value..."
              />
            </div>
          </div>

          {/* Validation Warning if No Configuration Exists */}
          {!loadingRules && !activeStateRule && (
            <div className="card" style={{ margin: '14px 0 0', borderColor: 'var(--tape)', borderLeft: '4px solid var(--tape)', padding: '14px', background: 'rgba(230, 57, 70, 0.05)' }}>
              <div style={{ fontSize: '13px', color: 'var(--tape)', fontWeight: 'bold' }}>
                ⚠️ No active court fee configuration found for {selectedStateName} ({selectedStateCode}).
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)' }}>
                Please ask an Administrator to define fee calculation rules, government act details, and slabs for <b>{selectedStateName}</b> in <b>Master Settings → State Fee Rules</b>.
              </div>
            </div>
          )}

          {activeStateRule && calcBreakdown && (
            <>
              {/* Separate Editable Charges & Rates Grid */}
              <div className="fgrid" style={{ marginTop: '14px' }}>
                <div className="f">
                  <label>Advocate Fee (%)</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    className="mono" 
                    value={currentAdvocateFeePct} 
                    onChange={e => setAdvocateFeePctOverride(Number(e.target.value) || 0)} 
                  />
                </div>
                <div className="f">
                  <label>Process Fee (₹)</label>
                  <input 
                    type="number" 
                    className="mono" 
                    value={calcBreakdown.processFee} 
                    onChange={e => setProcessFeeOverride(Number(e.target.value) || 0)} 
                  />
                </div>
                <div className="f">
                  <label>Filing Fee (₹)</label>
                  <input 
                    type="number" 
                    className="mono" 
                    value={calcBreakdown.filingFee} 
                    onChange={e => setFilingFeeOverride(Number(e.target.value) || 0)} 
                  />
                </div>
                <div className="f">
                  <label>Misc. Charges (₹)</label>
                  <input 
                    type="number" 
                    className="mono" 
                    value={calcBreakdown.miscCharges} 
                    onChange={e => setMiscChargesOverride(Number(e.target.value) || 0)} 
                  />
                </div>
              </div>

              {/* Total Summary Highlight */}
              <div className="calc-out" style={{ marginTop: '16px' }}>
                <div className="co-l">Total Payable by Client ({selectedStateName})</div>
                <div className="co-v">{inr(calcBreakdown.totalAmount)}</div>
                <div className="co-s">
                  Court Fee {inr(calcBreakdown.courtFee)} &nbsp;+&nbsp; Advocate Fee {inr(calcBreakdown.advocateFee)} &nbsp;+&nbsp; Addl. Charges {inr(calcBreakdown.totalAdditionalCharges)}
                </div>
              </div>

              {/* Itemized Calculation Breakdown Table */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Detailed Itemized Calculation Breakdown</div>
                <div className="tbl-card">
                  <table className="t sm">
                    <thead>
                      <tr>
                        <th>Fee Head Component</th>
                        <th>Calculation Basis / Details</th>
                        <th className="r">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><b>State Court Fee</b></td>
                        <td className="mut">{calcBreakdown.formulaExplanation}</td>
                        <td className="r mono font-semibold">{inr(calcBreakdown.courtFee)}</td>
                      </tr>
                      <tr>
                        <td><b>Advocate Professional Fee</b></td>
                        <td className="mut">{calcBreakdown.advocateFeePct}% of Suit Value ₹{cv.toLocaleString('en-IN')}</td>
                        <td className="r mono font-semibold">{inr(calcBreakdown.advocateFee)}</td>
                      </tr>
                      <tr>
                        <td><b>Process Fee</b></td>
                        <td className="mut">State schedule process issuance charges</td>
                        <td className="r mono">{inr(calcBreakdown.processFee)}</td>
                      </tr>
                      <tr>
                        <td><b>Filing & Stamp Fee</b></td>
                        <td className="mut">Court vakalat & suit filing stamps</td>
                        <td className="r mono">{inr(calcBreakdown.filingFee)}</td>
                      </tr>
                      <tr>
                        <td><b>Miscellaneous Charges</b></td>
                        <td className="mut">Documentation, typing, and messenger expenses</td>
                        <td className="r mono">{inr(calcBreakdown.miscCharges)}</td>
                      </tr>
                      <tr style={{ background: 'var(--subtle, #f8f9fa)', fontWeight: 'bold' }}>
                        <td>TOTAL ESTIMATED PAYABLE</td>
                        <td>Sum of all state fee heads</td>
                        <td className="r mono" style={{ fontSize: '14px', color: 'var(--accent)' }}>{inr(calcBreakdown.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Government Act Details Box */}
              <div className="card" style={{ marginTop: '14px', padding: '12px', background: 'var(--subtle, #f9fafb)', border: '1px solid var(--rule)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' }}>
                  ⚖️ Applicable Government Act & Gazette Notification
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, marginTop: '4px' }}>
                  {calcBreakdown.actDetails.actName}
                </div>
                <div className="mut" style={{ fontSize: '12px', marginTop: '2px' }}>
                  <b>Version:</b> {calcBreakdown.actDetails.actVersion} &nbsp;|&nbsp; <b>Notification / G.O.:</b> {calcBreakdown.actDetails.notificationNo} &nbsp;|&nbsp; <b>Effective Window:</b> {calcBreakdown.actDetails.effectiveFrom} to {calcBreakdown.actDetails.effectiveTo}
                </div>
                {activeStateRule.notes && (
                  <div style={{ fontSize: '12px', marginTop: '6px', fontStyle: 'italic', color: 'var(--text)' }}>
                    "{activeStateRule.notes}"
                  </div>
                )}
              </div>

              {/* Slab details table if rule is SLAB */}
              {activeStateRule.ruleType === 'SLAB' && activeStateRule.slabs && activeStateRule.slabs.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Active State Slabs Schedule</div>
                  <div className="tbl-card">
                    <table className="t sm" style={{ fontSize: '11.5px' }}>
                      <thead>
                        <tr>
                          <th>Slab Tier</th>
                          <th>Suit Value Range (₹)</th>
                          <th>Fee Structure</th>
                          <th>Min Fee</th>
                          <th>Match Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeStateRule.slabs.map((slab, idx) => {
                          const isMatched = calcBreakdown.matchedSlab && calcBreakdown.matchedSlab.id === slab.id;
                          return (
                            <tr key={idx} style={isMatched ? { background: 'rgba(40, 167, 69, 0.08)', fontWeight: 'bold' } : {}}>
                              <td>Slab #{idx + 1}</td>
                              <td>
                                ₹{Number(slab.fromAmount).toLocaleString('en-IN')} – {slab.toAmount ? `₹${Number(slab.toAmount).toLocaleString('en-IN')}` : 'Above'}
                              </td>
                              <td>{slab.feeType === 'PERCENTAGE' ? `${slab.feeValue}%` : `Fixed ₹${slab.feeValue}`}</td>
                              <td>{slab.minFee > 0 ? `₹${slab.minFee}` : '—'}</td>
                              <td>{isMatched ? <span className="chip c-baize">Active Slab</span> : <span className="mut">—</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
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
