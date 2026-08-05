const fs = require('fs');

let c = fs.readFileSync('src/context/AuthContext.jsx', 'utf8');

const regex = /const hasPermission = \(key, action = 'V'\) => \{[\s\S]*?return perm\.includes\(action\);\s*\};/;
const replacement = `const hasPermission = (key, action = 'V') => {
    if (key === 'dash') return true;
    const userRole = user?.role || 'Super Admin';
    
    if (userRole === 'Super Admin') {
      if (key === 'roles') return false; // Hidden for Super Admin
      return true; // Super Admin bypasses all other permission checks
    }

    const keyCode = KEY_ALIASES[key] || key;
    const rolePerms = permByRole[userRole];
    
    if (!rolePerms) {
      return false; // Wait until permissions matrix loads
    }

    const perm = rolePerms[keyCode] || '---';
    return perm.includes(action);
  };`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/context/AuthContext.jsx', c);
console.log('Fixed Super Admin permissions');
