const fs = require('fs');
let content = fs.readFileSync('src/pages/Roles.jsx', 'utf8');

// Add react-router-dom imports
content = content.replace(
  "import React, { useCallback, useEffect, useState } from 'react';",
  "import React, { useCallback, useEffect, useState } from 'react';\nimport { useParams, useNavigate } from 'react-router-dom';"
);

// Read id from route
content = content.replace(
  "export default function Roles() {",
  "export default function Roles() {\n  const { id: targetTenantId } = useParams();\n  const navigate = useNavigate();"
);

// Pass targetTenantId to getRoles, getRoleById, getModules (wait, getModules doesn't need it, but let's pass to getRoles and getRoleById)
content = content.replace(
  "const [roleList, moduleList] = await Promise.all([getRoles(), getModules()]);",
  "const [roleList, moduleList] = await Promise.all([getRoles(targetTenantId), getModules()]);"
);

content = content.replace(
  "const detailed = await Promise.all(roleList.map((r) => getRoleById(r.id)));",
  "const detailed = await Promise.all(roleList.map((r) => getRoleById(r.id, targetTenantId)));"
);

// Pass targetTenantId to updatePermission
content = content.replace(
  "await updatePermission({ roleId: role.id, moduleId: mod.id, accessLevel: level });",
  "await updatePermission({ roleId: role.id, moduleId: mod.id, accessLevel: level, targetTenantId });"
);

// Add "Back to Tenants" button in PageHeader if targetTenantId exists
content = content.replace(
  "      <PageHeader\n        title=\"Roles & Access\"\n        description=\"Manage roles and set permissions across modules.\"\n      />",
  "      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>\n        {targetTenantId && (\n          <button className=\"btn btn-secondary\" onClick={() => navigate('/tenants')}>\n            &larr; Back to Tenants\n          </button>\n        )}\n        <PageHeader\n          title={targetTenantId ? `Roles & Access (Tenant ${targetTenantId})` : \"Roles & Access\"}\n          description=\"Manage roles and set permissions across modules.\"\n          style={{ marginBottom: 0 }}\n        />\n      </div>"
);

fs.writeFileSync('src/pages/Roles.jsx', content);
console.log('Updated Roles.jsx');
