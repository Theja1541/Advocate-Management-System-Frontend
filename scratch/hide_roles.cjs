const fs = require('fs');
let c = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

c = c.replace(
  "if (userRole === 'Super Admin' && key === 'tenants') return true;",
  "if (userRole === 'Super Admin' && key === 'tenants') return true;\n    if (userRole === 'Super Admin' && key === 'roles') return false;"
);

fs.writeFileSync('src/context/AuthContext.jsx', c);
console.log('Patched AuthContext.jsx');
