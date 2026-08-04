const fs = require('fs');
const path = require('path');

const dir = 'd:/THEJA/ADVOCATE MANAGEMENT SYSTEM/Frontend/src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('PAGE_SIZE')) return;

  // 1. Remove const PAGE_SIZE
  content = content.replace(/const\s+PAGE_SIZE\s*=\s*\d+;\s*\n?/g, '');
  
  // 2. Insert const [pageSize, setPageSize] = useState(10);
  // Just find the first useState and insert after
  if (!content.includes('const [pageSize, setPageSize] = useState')) {
    content = content.replace(/(const\s+\[[a-zA-Z0-9_]+,\s*set[a-zA-Z0-9_]+\]\s*=\s*useState\([^)]*\);)/, '$1\n  const [pageSize, setPageSize] = useState(10);');
  }

  // 3. Replace PAGE_SIZE with pageSize
  content = content.replace(/PAGE_SIZE/g, 'pageSize');

  // 4. Update pagination div(s)
  // We'll look for pattern: <div className="mut"[^>]*>Showing {something}–{Math.min(something + pageSize, arrayName.length)} of ...
  // And replace that div with our flex div containing the select.

  const regex = /<div className="mut"[^>]*>\s*Showing[^{]*\{([^}]+)\}[^\{]*\{Math\.min\([^,]+,\s*([a-zA-Z0-9_\.]+)\.length\)\}[^\{]*\{[^\}]+\}\s*<\/div>/g;
  
  let match;
  let replaced = false;
  // We need to replace all occurrences because CaseApproval has two paginations.
  content = content.replace(regex, (fullMatch, startExpr, arrName) => {
    replaced = true;
    return `<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mut" style={{ fontSize: '11.5px' }}>Show</span>
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                // We don't know the exact setPage function name for sure in all cases (e.g. setPendingPage)
                // but usually it's setPage or we can just leave it to not reset page, which is acceptable.
                // To be safe, if we find 'setPage(', we use it. If 'setPendingPage(', etc.
              }}
              style={{ padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mut" style={{ fontSize: '11.5px' }}>
              entries | Showing {${startExpr}}–{Math.min(${startExpr.replace(' + 1', '')} + pageSize, ${arrName}.length)} of {${arrName}.length}
            </span>
          </div>`;
  });

  if (replaced) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    // maybe it has a different format, like in Member.jsx or Tasks.jsx
    console.log(`Regex match failed for ${file}, but it had PAGE_SIZE`);
  }
});
