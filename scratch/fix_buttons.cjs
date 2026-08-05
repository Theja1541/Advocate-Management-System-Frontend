const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/pages');

// 1. Amend.jsx - remove Import CSV/Excel
let amendPath = path.join(srcDir, 'Amend.jsx');
let amendContent = fs.readFileSync(amendPath, 'utf8');
amendContent = amendContent.replace(
  /<label className="btn g"[\s\S]*?<\/label>\s*/,
  ''
);
// Also ensure Add Mapping is primary, just in case
amendContent = amendContent.replace(
  /<button className="btn" onClick=\{openAddModal\}/,
  '<button className="btn primary" onClick={openAddModal}'
);
fs.writeFileSync(amendPath, amendContent);
console.log('Fixed Amend.jsx');

// 2. Refs.jsx - Add reference and Search
let refsPath = path.join(srcDir, 'Refs.jsx');
let refsContent = fs.readFileSync(refsPath, 'utf8');
refsContent = refsContent.replace(
  /<button className="btn" onClick=\{openAddModal\}>/,
  '<button className="btn primary" onClick={openAddModal}>'
);
refsContent = refsContent.replace(
  /<button type="submit" className="btn">/,
  '<button type="submit" className="btn primary">'
);
fs.writeFileSync(refsPath, refsContent);
console.log('Fixed Refs.jsx');

// 3. Land.jsx - Restore PageHeader correctly if broken, and make Add land record primary
let landPath = path.join(srcDir, 'Land.jsx');
let landContent = fs.readFileSync(landPath, 'utf8');

if (!landContent.includes('<PageHeader')) {
  // It's broken, restore it by replacing from `return (\n    <>` up to `<div className="kpis">`
  landContent = landContent.replace(
    /return \(\s*<>\s*<div className="kpis">/,
    `return (
    <>
      <PageHeader
        title="Land Details"
        description="Survey-wise land records — extent, patta, encumbrance and the title position behind each matter."
        actions={
          canEdit ? (
            <button className="btn primary" onClick={openAddModal} disabled={!clients.length}>
              Add land record
            </button>
          ) : null
        }
      />

      <div className="kpis">`
  );
  
  // Also fix the filterButtons array which got deleted
  if (!landContent.includes('const filterButtons = [')) {
    landContent = landContent.replace(
      /const headers = \[[\s\S]*?\];/,
      `$&

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'clear', label: 'Clear title' },
    { key: 'under_scrutiny', label: 'Under scrutiny' },
    { key: 'disputed', label: 'Disputed' },
  ];`
    );
  }
} else {
  // If not broken, just replace the button
  landContent = landContent.replace(
    /<button className="btn" onClick=\{openAddModal\} disabled=\{!clients\.length\}>/,
    '<button className="btn primary" onClick={openAddModal} disabled={!clients.length}>'
  );
}
fs.writeFileSync(landPath, landContent);
console.log('Fixed Land.jsx');


// 4. Opinions.jsx - Draft opinion
let opPath = path.join(srcDir, 'Opinions.jsx');
let opContent = fs.readFileSync(opPath, 'utf8');
opContent = opContent.replace(
  /<button className="btn" onClick=\{openAddModal\} disabled=\{!clients\.length \|\| !advocates\.length\}>/,
  '<button className="btn primary" onClick={openAddModal} disabled={!clients.length || !advocates.length}>'
);
fs.writeFileSync(opPath, opContent);
console.log('Fixed Opinions.jsx');


// 5. Daybook.jsx - Add entry
let dbPath = path.join(srcDir, 'Daybook.jsx');
let dbContent = fs.readFileSync(dbPath, 'utf8');
dbContent = dbContent.replace(
  /<button className="btn" onClick=\{handleSubmit\} disabled=\{saving\}>/,
  '<button className="btn primary" onClick={handleSubmit} disabled={saving}>'
);
fs.writeFileSync(dbPath, dbContent);
console.log('Fixed Daybook.jsx');

