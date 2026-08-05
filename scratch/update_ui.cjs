const fs = require('fs');

let c = fs.readFileSync('src/pages/Roles.jsx', 'utf8');

const oldUI = `
          <div className="card">
            <div className="card-h">
              <div className="card-t">Subscribed Modules</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {modules.map((m) => {
                const isEnabled = tenantAdminRole ? (matrix[tenantAdminRole.id]?.[m.id] !== '---' && matrix[tenantAdminRole.id]?.[m.id] !== undefined) : false;
                const isSaving = savingKey === \`toggle-\${m.id}\`;
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.keyCode}</div>
                    </div>
                    <div>
                      <button 
                        className={\`btn \${isEnabled ? 'primary' : 'secondary'}\`} 
                        disabled={isSaving}
                        onClick={() => handleToggleTenantModule(m.id, !isEnabled)}
                      >
                        {isSaving ? 'Saving...' : isEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>`;

const newUI = `
          <div style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: 'var(--space-4)', color: 'var(--text-primary)', fontFamily: "'Spectral', serif" }}>Subscribed Modules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
              {modules.map((m) => {
                const isEnabled = tenantAdminRole ? (matrix[tenantAdminRole.id]?.[m.id] !== '---' && matrix[tenantAdminRole.id]?.[m.id] !== undefined) : false;
                const isSaving = savingKey === \`toggle-\${m.id}\`;
                return (
                  <div 
                    key={m.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: 'var(--space-4)', 
                      background: 'var(--card)',
                      border: '1px solid',
                      borderColor: isEnabled ? 'rgba(37, 99, 235, 0.2)' : 'var(--border-color)', 
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                  >
                    {isEnabled && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: '600', fontSize: 'var(--text-base)', color: isEnabled ? 'var(--primary)' : 'var(--text-primary)', transition: 'color 0.2s' }}>{m.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.keyCode}</div>
                    </div>
                    <div>
                      <div 
                        onClick={() => !isSaving && handleToggleTenantModule(m.id, !isEnabled)}
                        style={{
                          width: '46px',
                          height: '26px',
                          borderRadius: '13px',
                          background: isEnabled ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                          position: 'relative',
                          cursor: isSaving ? 'not-allowed' : 'pointer',
                          transition: 'background 0.3s ease',
                          opacity: isSaving ? 0.5 : 1
                        }}
                      >
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: '2px',
                          left: isEnabled ? '22px' : '2px',
                          transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>`;

// Use string replacement but carefully handle whitespace
if (c.includes(oldUI.trim())) {
  c = c.replace(oldUI.trim(), newUI.trim());
} else {
  // Try regex if whitespace is weird
  const regex = /<div className="card">\s*<div className="card-h">\s*<div className="card-t">Subscribed Modules<\/div>[\s\S]*?<\/div>\s*<\/div>/;
  c = c.replace(regex, newUI);
}

fs.writeFileSync('src/pages/Roles.jsx', c);
console.log('Updated Roles.jsx UI');
