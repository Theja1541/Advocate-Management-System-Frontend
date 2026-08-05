const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/pages');
let landPath = path.join(srcDir, 'Land.jsx');
let landContent = fs.readFileSync(landPath, 'utf8');
landContent = landContent.replace(
  /<button className="btn" onClick=\{openAddModal\} disabled=\{!clients\.length\}>/g,
  '<button className="btn primary" onClick={openAddModal} disabled={!clients.length}>'
);
fs.writeFileSync(landPath, landContent);
console.log('Fixed Land.jsx');
