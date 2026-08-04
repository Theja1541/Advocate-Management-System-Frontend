const fs = require('fs');
const path = require('path');

const files = [
  'CaseApproval.jsx',
  'Clients.jsx',
  'Daybook.jsx',
  'Docs.jsx',
  'Land.jsx',
  'Member.jsx',
  'Reports.jsx',
  'Tasks.jsx'
];

const dir = 'd:/THEJA/ADVOCATE MANAGEMENT SYSTEM/Frontend/src/pages';

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('const PAGE_SIZE')) {
    console.log(`Skipping ${file} - no PAGE_SIZE`);
    return;
  }
  
  content = content.replace(/const\s+PAGE_SIZE\s*=\s*\d+;\s*\n?/g, '');
  content = content.replace(/(const\s+\[page,\s*setPage\]\s*=\s*useState\([^)]+\);)/, '$1\n  const [pageSize, setPageSize] = useState(10);');
  content = content.replace(/PAGE_SIZE/g, 'pageSize');
  
  const regex = /<div\s+className="mut"[^>]*>\s*Showing\s*\{pageStart\s*\+\s*1\}[^\{]*\{Math\.min\(pageStart\s*\+\s*pageSize,\s*([a-zA-Z0-9_\.]+)\.length\)\}\s*of(?:\{['" ]+\}| )\s*\{[a-zA-Z0-9_\.]+\.length\}\s*<\/div>/s;
  
  const match = content.match(regex);
  if (match) {
    const arrName = match[1];
    const replacement = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mut" style={{ fontSize: '11.5px' }}>Show</span>
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{ padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mut" style={{ fontSize: '11.5px' }}>
              entries | Showing {pageStart + 1}–{Math.min(pageStart + pageSize, ${arrName}.length)} of {${arrName}.length}
            </span>
          </div>`;
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Regex match failed for ${file}`);
  }
});
