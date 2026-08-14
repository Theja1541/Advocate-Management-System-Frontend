export const NAV = [
 { g: 'Today', items: [{ k: 'dash', l: 'Dashboard' }] },
 { g: 'Matters', items: [{ k: 'cases', l: 'Civil Cases' }, { k: 'approve', l: 'Case Approval' }, { k: 'hearings', l: 'Case Diary' }, { k: 'tasks', l: 'Tasks' }, { k: 'docs', l: 'Documents' }, { k: 'refs', l: 'References' }] },
 { g: 'Land & Title', items: [
   { k: 'land', l: 'Land Details' }, 
   { k: 'opinions', l: 'Legal Opinions' }
 ] },
 { g: 'People', items: [{ k: 'group-admins', l: 'Group Admins' }, { k: 'advs', l: 'Advocates' }, { k: 'clients', l: 'Clients' }, { k: 'member', l: 'Membership' }] },

 { g: 'Office', items: [{ k: 'daybook', l: 'Day Book' }, { k: 'pay', l: 'Payments' }, { k: 'alerts', l: 'Notification Center' }, { k: 'reports', l: 'Reports' }] },
 { g: 'Library', items: [{ k: 'acts', l: 'Bare Acts' }, { k: 'amend', l: 'Amendment Tracker' }, { k: 'legalTexts', l: 'Legal Texts' }] },
 { g: 'Tools', items: [{ k: 'tools', l: 'Calculators' }] },
 { g: 'Admin', items: [{ k: 'tenants', l: 'Tenants' }, { k: 'plans', l: 'Subscription Plans' }, { k: 'roles', l: 'Roles & Access' }, { k: 'masters', l: 'Master Settings' }, { k: 'tenantSettings', l: 'Tenant Settings' }] }
];

export const COURTS = [];
export const ADVS = [];
export const CLIENTS = [];
export const INITIAL_CASES = [];
export const CAUSE = [];
export const LADDER = [
  ['Staff Verification', 'Staff / Bearer'],
  ['Advocate Verification', 'Assigned advocate'],
  ['Admin Approval', 'Office admin']
];
export const INITIAL_DIARY = [];
export const INITIAL_DAYBOOK = [];
export const DB_CATS = ['Party Meeting', 'Court Visit', 'Office Visit', 'Field Visit', 'Office Expense', 'Misc.'];

export const PAYS = [];
export const MEMB = [];
export const DOCS = [];
export const REFS = [];
export const ACTS = [];
export const AMEND = [];
export const LANDS = [];
export const OPIN = [];
export const OP_TYPES = ['Title Search Opinion', 'Title Scrutiny Opinion', 'Bank Title Opinion', 'Assigned Land Opinion', 'Succession Opinion'];
export const ALERTS = [];
export const ROLES = ['Super Admin', 'Admin', 'Sub Admin', 'Advocate', 'Staff/Bearer'];
export const PMODS = ['Cases', 'Case Approval', 'Case Diary', 'Documents', 'Land Details', 'Legal Opinions', 'Advocates', 'Clients', 'Membership', 'Day Book', 'Payments', 'Reports', 'Bare Acts', 'Settings', 'Legal Texts'];
export const PERMS = {
  'Super Admin': ['VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA', 'VEA'],
  'Admin': ['VEA', 'VEA', 'VE', 'VE', 'VE', 'V', 'VEA', 'VEA', 'VE', 'VE', 'VEA', 'VE', 'V', '—', 'VE'],
  'Sub Admin': ['VE', 'V', 'VE', 'VE', 'VE', 'V', 'V', 'VE', 'V', 'VE', 'V', 'V', 'V', '—', 'V'],
  'Advocate': ['V', 'VA', 'VE', 'VE', 'VE', 'VEA', 'V', 'V', 'V', '—', 'V', 'V', 'V', '—', 'VE'],
  'Staff/Bearer': ['V', 'VA', 'V', 'VE', 'VE', '—', '—', 'V', '—', 'VE', '—', '—', 'V', '—', 'V']
};
