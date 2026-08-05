const fs = require('fs');

let data = fs.readFileSync('src/pages/Tenants.jsx', 'utf8');

data = data.replace(
  /import \{\n  getTenants,\n  createTenant,\n  updateTenant,\n  resetTenantAdminPassword,\n  deleteTenant,\n  getDashboardStats\n\} from '\.\.\/services\/tenantService';/,
  `import {
  getTenants,
  createTenant,
  updateTenant,
  resetTenantAdminPassword,
  deleteTenant,
  getDashboardStats
} from '../services/tenantService';
import planService from '../services/subscriptionPlanService';`
);

data = data.replace(
  /const \[tenants, setTenants\] = useState\(\[\]\);/,
  `const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);`
);

data = data.replace(
  /const \[tenantsData, statsData\] = await Promise\.all\(\[\n        getTenants\(\),\n        getDashboardStats\(\)\n      \]\);/,
  `const [tenantsData, statsData, plansRes] = await Promise.all([
        getTenants(),
        getDashboardStats(),
        planService.getAllPlans()
      ]);
      setPlans(plansRes.data || []);`
);

data = data.replace(
  /<select value=\{form\.planId\} onChange=\{e => setForm\(\{ \.\.\.form, planId: e\.target\.value \}\)\}>/,
  `<select value={form.planId} onChange={e => {
                  const selectedPlan = plans.find(p => p.id === parseInt(e.target.value, 10));
                  setForm({ 
                    ...form, 
                    planId: e.target.value, 
                    storageLimit: selectedPlan ? selectedPlan.storageLimitMb : form.storageLimit, 
                    maxUsers: selectedPlan ? selectedPlan.maxUsers : form.maxUsers 
                  });
                }}>`
);

data = data.replace(
  /<option value="1">Basic Plan<\/option>\n                  <option value="2">Pro Plan<\/option>/,
  `{plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{Number(p.price).toLocaleString()}/{p.billingCycle === 'monthly' ? 'mo' : p.billingCycle === 'yearly' ? 'yr' : 'life'})</option>
                  ))}`
);

fs.writeFileSync('src/pages/Tenants.jsx', data);
console.log('Fixed Tenants.jsx');
