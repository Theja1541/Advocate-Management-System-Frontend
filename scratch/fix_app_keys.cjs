const fs = require('fs');

let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(/moduleKey="diary"/g, 'moduleKey="hearings"');
c = c.replace(/moduleKey="cases"/g, (match, offset, string) => {
  // Only replace for tasks
  const snippet = string.slice(Math.max(0, offset - 50), offset);
  if (snippet.includes('/tasks')) {
    return 'moduleKey="tasks"';
  }
  if (snippet.includes('/alerts')) {
    return 'moduleKey="alerts"';
  }
  return match;
});

c = c.replace(/moduleKey="acts"/g, (match, offset, string) => {
  const snippet = string.slice(Math.max(0, offset - 50), offset);
  if (snippet.includes('/amendments')) return 'moduleKey="amend"';
  if (snippet.includes('/tools')) return 'moduleKey="tools"';
  return match;
});

c = c.replace(/moduleKey="docs"/g, (match, offset, string) => {
  const snippet = string.slice(Math.max(0, offset - 50), offset);
  if (snippet.includes('/references')) return 'moduleKey="refs"';
  return match;
});

// Remove KEY_ALIASES from AuthContext.jsx
let auth = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');
auth = auth.replace(
  /const KEY_ALIASES = \{[\s\S]*?\};/,
  `const KEY_ALIASES = {
  casetypes: 'roles',
  casestages: 'roles',
  courts: 'roles',
  expensecats: 'roles',
  doctypes: 'roles',
  taxes: 'roles',
  paymentmodes: 'roles',
};`
);

fs.writeFileSync('src/App.jsx', c);
fs.writeFileSync('src/context/AuthContext.jsx', auth);
console.log('App.jsx and AuthContext.jsx updated');
