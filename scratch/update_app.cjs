const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(
  '<Route path="/tenants" element={<ProtectedRoute element={<Tenants />} moduleKey="tenants" />} />',
  '<Route path="/tenants" element={<ProtectedRoute element={<Tenants />} moduleKey="tenants" />} />\n                <Route path="/tenants/:id/roles" element={<ProtectedRoute element={<Roles />} moduleKey="tenants" />} />'
);

fs.writeFileSync('src/App.jsx', content);
console.log('Updated App.jsx');
