const fs = require('fs');
let c = fs.readFileSync('src/pages/Roles.jsx', 'utf8');

c = c.replace(
  '<tbody>\n                {modules.map((m) => (',
  '<tbody>\n                {(isSuperAdminManagingTenant ? modules : modules.filter(m => { const tenantAdminRole = roles.find(r => r.name.toLowerCase().includes("tenant admin")); return tenantAdminRole && matrix[tenantAdminRole.id]?.[m.id] && matrix[tenantAdminRole.id]?.[m.id] !== "---" })).map((m) => ('
);

fs.writeFileSync('src/pages/Roles.jsx', c);
console.log('Patched Roles.jsx matrix filter');
