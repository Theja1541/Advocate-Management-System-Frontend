const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

content = content.replace(
  /import \{ getAlerts \} from '\.\.\/services\/alertService';/,
  "import { getAlerts } from '../services/alertService';\nimport { useAuth } from '../context/AuthContext';\nimport { getDashboardStats } from '../services/tenantService';"
);

content = content.replace(
  /export default function Dashboard\(\) \{/,
  "export default function Dashboard() {\n  const { user } = useAuth();\n  const isSuperAdmin = user?.role === 'Super Admin';\n  const [superStats, setSuperStats] = useState(null);"
);

content = content.replace(
  /const \[data, alerts\] = await Promise\.all\(\[\s*getDashboard\(\),\s*getAlerts\(\{ status: 'active' \}\)\s*\]\);/,
  `const promises = [getDashboard(), getAlerts({ status: 'active' })];
      if (isSuperAdmin) promises.push(getDashboardStats());
      const res = await Promise.all(promises);
      setDashboard(res[0]);
      setActiveAlerts(res[1]);
      if (res[2]) setSuperStats(res[2]);`
);

content = content.replace(
  /setDashboard\(data\);\s*setActiveAlerts\(alerts\);/,
  ""
);

content = content.replace(
  /return \(\n\s*<div className="page-container">/,
  `return (
    <div className="page-container">
      {isSuperAdmin && superStats && (
        <>
          <PageHeader
            title="SaaS System Dashboard"
            subtitle="Global Metrics Across All Tenants"
          />
          <div className="dashboard-grid">
            <KPICard title="Total Tenants" value={superStats.totalTenants} icon="🏢" color="primary" />
            <KPICard title="Active Tenants" value={superStats.activeTenants} icon="✅" color="success" />
            <KPICard title="Suspended Tenants" value={superStats.suspendedTenants} icon="⏸️" color="warning" />
            <KPICard title="Total Users" value={superStats.totalUsers} icon="👥" color="info" />
            <KPICard title="Total Cases" value={superStats.totalCases} icon="⚖️" color="default" />
          </div>
          <hr style={{ margin: '32px 0', borderColor: 'var(--border)' }} />
        </>
      )}`
);

fs.writeFileSync('src/pages/Dashboard.jsx', content);
console.log('Fixed Dashboard');
