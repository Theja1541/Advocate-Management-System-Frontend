const fs = require('fs');
let c = fs.readFileSync('src/pages/Tenants.jsx', 'utf8');

c = c.replace(
  /<button\s+className="btn btn-icon"\s+title="Manage Roles"[\s\S]*?<\/button>/,
  '<button className="btn btn-secondary btn-sm" style={{ marginLeft: "8px" }} title="Manage Roles" onClick={() => navigate(`/tenants/${t.id}/roles`)}>Roles & Access</button>'
);

fs.writeFileSync('src/pages/Tenants.jsx', c);
console.log('Updated Tenants.jsx');
