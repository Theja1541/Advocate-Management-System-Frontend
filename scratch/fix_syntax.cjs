const fs = require('fs');

let c = fs.readFileSync('src/pages/Roles.jsx', 'utf8');

const target = `
                );
              })}
            </div>
          </div>
                );
              })}
            </div>
          </div>
`;

const replacement = `
                );
              })}
            </div>
          </div>
`;

// Just string replace
c = c.replace(target, replacement);
fs.writeFileSync('src/pages/Roles.jsx', c);
console.log('Fixed syntax error');
