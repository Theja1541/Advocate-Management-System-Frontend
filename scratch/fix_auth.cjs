const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

content = content.replace(
  /const userRole = user\?\.role \|\| 'Super Admin';/,
  "const userRole = user?.role || 'Super Admin';\n    if (userRole === 'Super Admin' && key === 'tenants') return true;"
);

fs.writeFileSync('src/context/AuthContext.jsx', content);
console.log('Fixed AuthContext');
