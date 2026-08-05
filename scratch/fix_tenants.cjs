const fs = require('fs');
let content = fs.readFileSync('src/pages/Tenants.jsx', 'utf8');

const replacement = `  const headerActions = (
    <button
      className="btn btn-primary"
      onClick={() => {
        setForm(emptyForm);
        setSelectedTenant(null);
        setError('');
        setIsModalOpen(true);
      }}
    >
      + Add Tenant
    </button>
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Tenants"
        description="Manage law firms, their subscriptions, and limits."
        action={headerActions}
      />
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <DataTable headers={headers}>
          {loading ? (
            <tr><td colSpan={headers.length} className="c mut">Loading...</td></tr>
          ) : (
            tenants.map(t => (
              <tr key={t.id}>
                <td><Chip label={t.code} /></td>
                <td><strong>{t.name}</strong></td>
                <td>{t.email}</td>
                <td>{t.maxUsers}</td>
                <td>
                  <Chip
                    label={t.status}
                    type={t.status === 'active' ? 'success' : 'danger'}
                  />
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="btn btn-icon"
                      title="Edit"
                      onClick={() => {
                        setSelectedTenant(t);
                        setForm({
                          name: t.name,
                          code: t.code,
                          email: t.email,
                          phone: t.phone,
                          maxUsers: t.maxUsers,
                          storageLimit: t.storageLimit
                        });
                        setIsModalOpen(true);
                      }}
                    >
                      ✏️
                    </button>
                    {t.status === 'active' ? (
                      <button className="btn btn-icon" title="Suspend" onClick={() => handleStatusChange(t, 'suspended')}>⏸️</button>
                    ) : (
                      <button className="btn btn-icon" title="Activate" onClick={() => handleStatusChange(t, 'active')}>▶️</button>
                    )}
                    <button
                      className="btn btn-icon"
                      title="Reset Admin Password"
                      onClick={() => {
                        setSelectedTenant(t);
                        setNewPassword('');
                        setIsPasswordModalOpen(true);
                      }}
                    >
                      🔑
                    </button>
                    <button
                      className="btn btn-icon"
                      title="Manage Roles"
                      onClick={() => navigate(\`/tenants/\${t.id}/roles\`)}
                    >
                      🛡️
                    </button>
                    <button className="btn btn-icon text-danger" title="Delete" onClick={() => handleDelete(t)}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
          {tenants.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="c mut">No tenants found</td>
            </tr>`;

const regex = /const headerActions = \([\s\S]*?No tenants found<\/td>\s*<\/tr>/m;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/pages/Tenants.jsx', content);
  console.log('Fixed Tenants.jsx');
} else {
  console.log('Regex did not match');
}
