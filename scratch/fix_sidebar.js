const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.jsx', 'utf8');

content = content.replace(
  /<img src="\/logo\.png" alt="Logo" className="seal"/g,
  '<img src={user?.tenant?.logo || "/logo.png"} alt="Logo" className="seal"'
);

// Add tenant name
content = content.replace(
  /\{\!isCollapsed && \(\n\s*<div style=\{\{ overflow: 'hidden' \}\}>\n\s*<div style=\{\{ fontSize: '15px', fontWeight: '700'/g,
  `{!isCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '15px', fontWeight: '700'`
);

// We want to replace the app title with Tenant name if available
// Or we can just use multi_replace_file_content... 
// The current Sidebar has `<div style={{ fontSize: '15px', fontWeight: '700'` 
// Actually let's just do it directly.

fs.writeFileSync('src/components/layout/Sidebar.jsx', content);
console.log('Fixed Sidebar.jsx');
