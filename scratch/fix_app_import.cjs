const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');
const search = "const Roles = React.lazy(() => import('./pages/Roles'));";
const replace = "const Roles = React.lazy(() => import('./pages/Roles'));\nconst Tenants = React.lazy(() => import('./pages/Tenants'));";
content = content.replace(search, replace);
fs.writeFileSync('src/App.jsx', content);
console.log('Added missing Tenants import to App.jsx');
