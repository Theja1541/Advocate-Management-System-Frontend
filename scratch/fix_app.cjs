const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace(
  '<Route path="/settings/masters" element={<ProtectedRoute element={<MasterSettings />} moduleKey="roles" />} />',
  '<Route path="/settings/masters" element={<ProtectedRoute element={<MasterSettings />} moduleKey="masters" />} />'
);
fs.writeFileSync('src/App.jsx', c);
console.log('Patched App.jsx');
