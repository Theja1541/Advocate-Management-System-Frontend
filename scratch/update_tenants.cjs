const fs = require('fs');
let content = fs.readFileSync('src/pages/Tenants.jsx', 'utf8');

// Add react-router-dom import
content = content.replace(
  "import React, { useCallback, useEffect, useState } from 'react';",
  "import React, { useCallback, useEffect, useState } from 'react';\nimport { useNavigate } from 'react-router-dom';"
);

// Add useNavigate hook
content = content.replace(
  "export default function Tenants() {",
  "export default function Tenants() {\n  const navigate = useNavigate();"
);

// Add the "Roles" action button
const replacementBtn = `                      <button
                        className="btn btn-icon"
                        title="Reset Admin Password"
                        onClick={() => {
                          setSelectedTenant(t);
                          setNewPassword('');
                          setIsPasswordModalOpen(true);
                        }}
                      >
                        🔑
                      </button>
                      <button
                        className="btn btn-icon"
                        title="Manage Roles"
                        onClick={() => navigate(\`/tenants/\${t.id}/roles\`)}
                      >
                        🛡️
                      </button>`;

content = content.replace(/<button[\s\S]*?title="Reset Admin Password"[\s\S]*?<\/button>/m, replacementBtn);

fs.writeFileSync('src/pages/Tenants.jsx', content);
console.log('Updated Tenants.jsx');
