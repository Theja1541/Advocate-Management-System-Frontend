const fs = require('fs');

let data = fs.readFileSync('src/App.jsx', 'utf8');

data = data.replace(
  "const Tenants = React.lazy(() => import('./pages/Tenants'));",
  "const Tenants = React.lazy(() => import('./pages/Tenants'));\nconst SubscriptionPlans = React.lazy(() => import('./pages/SubscriptionPlans'));"
);

data = data.replace(
  '<Route path="/settings/masters" element={<ProtectedRoute element={<MasterSettings />} moduleKey="masters" />} />',
  '<Route path="/settings/masters" element={<ProtectedRoute element={<MasterSettings />} moduleKey="masters" />} />\n              <Route path="/settings/plans" element={<ProtectedRoute element={<SubscriptionPlans />} moduleKey="plans" />} />'
);

fs.writeFileSync('src/App.jsx', data);
console.log('Fixed App.jsx');
