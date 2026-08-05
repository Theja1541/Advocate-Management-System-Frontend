const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const rolesRoute = '<Route path="/roles" element={<ProtectedRoute element={<Roles />} moduleKey="roles" />} />';
const tenantsRoute = '<Route path="/tenants" element={<ProtectedRoute element={<Tenants />} moduleKey="tenants" />} />';

content = content.replace(rolesRoute, rolesRoute + '\n              ' + tenantsRoute);
fs.writeFileSync('src/App.jsx', content);
console.log('Added tenants route successfully');
