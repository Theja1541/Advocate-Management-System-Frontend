const fs = require('fs');
let code = fs.readFileSync('D:/THEJA/ADVOCATE MANAGEMENT SYSTEM/Frontend/src/pages/CaseApproval.jsx.clean', 'utf8');

const lines = code.split('\n');
const startIndex = lines.findIndex(l => l.startsWith('import React'));
if (startIndex !== -1) {
    code = lines.slice(startIndex).filter(l => !l.includes('The above content shows the entire, complete file')).join('\n');
}

// 1. Remove parseTitle and TITLE_META_SEP
code = code.replace(/const TITLE_META_SEP = ' :: ';\n/, '');
code = code.replace(/const parseTitle = [\s\S]*?};\n};\n/, '');

// 2. Replace enrichedCases logic
const newLogic = `let opponent = '—';
    const vsIdx = String(c.title || '').indexOf(TITLE_VS_SEP);
    if (vsIdx >= 0) {
      opponent = String(c.title).slice(vsIdx + TITLE_VS_SEP.length);
    }
    return {
      ...c,
      opponent,
      val: Number(c.suitValue) || 0,
      fee: Number(c.feePercentage) || 0,
      advocateFee: Number(c.advocateFee) || 0,
      courtFee: Number(c.courtFee) || 0,
      totalPayable: Number(c.totalPayable) || 0,
      caseTypeDisplay: c.caseType?.name || '—',`;

code = code.replace(/const legacyParsed = parseTitle\(c\.title\);\n\s*return {\n\s*\.\.\.c,\n\s*\.\.\.legacyParsed,\n\s*caseTypeDisplay: c\.caseType\?\.name \|\| legacyParsed\.caseType,/g, newLogic);

// 3. Replace JSX UI
const newJsx = `{c.val ? \` · Suit Value: \${inr(c.val)}\` : ''}
                  {c.totalPayable ? \` · Fee: \${inr(c.totalPayable)}\` : ''}`;

code = code.replace(/{c\.val \? \` · \${inr\(c\.val\)}\` : ''}/g, newJsx);

fs.writeFileSync('D:/THEJA/ADVOCATE MANAGEMENT SYSTEM/Frontend/src/pages/CaseApproval.jsx', code);
console.log('Fixed CaseApproval.jsx completely.');
