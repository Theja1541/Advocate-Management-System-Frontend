const fs = require('fs');

const files = ['Alerts.jsx', 'Amend.jsx', 'Cases.jsx', 'Hearings.jsx', 'Member.jsx', 'Tasks.jsx'];
files.forEach(f => {
  const p = 'd:/THEJA/ADVOCATE MANAGEMENT SYSTEM/Frontend/src/pages/' + f;
  let c = fs.readFileSync(p, 'utf8');
  
  // Remove old 'Showing X-Y of Z' blocks that don't match exactly.
  // A broader regex to remove the old pagination div block if it exists
  const oldPaginationRegex = /<div[^>]*>\s*<div[^>]*>\s*Showing[^<]+<\/div>\s*<div[^>]*>(?:\s*<button[^>]*>.*?<\/button>\s*)+<\/div>\s*<\/div>/s;
  c = c.replace(oldPaginationRegex, '');
  
  // Also remove standalone "Showing " divs just in case
  c = c.replace(/<div className="mut"[^>]*>\s*Showing\s*\{[^\}]+\}[^\{]*\{[^\}]+\}\s*of\s*(?:\{[^\}]+\}|[^\<]+)\s*<\/div>/g, '');

  const sliceMatch = c.match(/const paged[A-Za-z0-9]+ = ([A-Za-z0-9_\.]+)\.slice/);
  const arrName = sliceMatch ? sliceMatch[1] : (c.includes('alerts') ? 'alerts' : 'unknown');
  
  let pageVar = 'page';
  if (c.includes('currentPage')) pageVar = 'currentPage';
  
  let startVar = 'pageStart';
  let totalVar = 'totalPages';
  let setPageFn = 'setPage';
  
  if (arrName !== 'unknown') {
    const block = `
      {!loading && ${arrName}.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mut" style={{ fontSize: '11.5px' }}>Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); ${setPageFn}(1); }} style={{ padding: '2px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mut" style={{ fontSize: '11.5px' }}>entries | Showing {${startVar} + 1}–{Math.min(${startVar} + pageSize, ${arrName}.length)} of {${arrName}.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn ghost sm" disabled={${pageVar} <= 1} onClick={() => ${setPageFn}((p) => Math.max(1, p - 1))}>Previous</button>
            <button type="button" className="btn ghost sm" disabled style={{ cursor: 'default' }}>{${pageVar}} / {${totalVar}}</button>
            <button type="button" className="btn ghost sm" disabled={${pageVar} >= ${totalVar}} onClick={() => ${setPageFn}((p) => Math.min(${totalVar}, p + 1))}>Next</button>
          </div>
        </div>
      )}`;
      
    c = c.replace(/<\/DataTable>/, '</DataTable>\n' + block);
    fs.writeFileSync(p, c, 'utf8');
    console.log('Fixed ' + f);
  } else {
    console.log('Skipped ' + f);
  }
});
