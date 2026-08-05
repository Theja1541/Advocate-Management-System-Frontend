const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.js', 'utf8');
content = content.replace(
  /\{ k: 'roles', l: 'Roles & Access' \}/,
  "{ k: 'tenants', l: 'Tenants' }, { k: 'roles', l: 'Roles & Access' }"
);
fs.writeFileSync('src/data/mockData.js', content);
console.log('Fixed mockData');
