import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authService from '../services/authService';
import { getRoles, getRoleById } from '../services/roleService';

const AuthContext = createContext(null);

import { DEMO_CREDENTIALS } from '../data/credentials';

const KEY_ALIASES = {
  casetypes: 'roles',
  casestages: 'roles',
  courts: 'roles',
  expensecats: 'roles',
  doctypes: 'roles',
  taxes: 'roles',
  paymentmodes: 'roles',
  hearings: 'diary',
};

const getAccessLevel = (mod) =>
  mod?.Permission?.accessLevel ||
  mod?.permission?.accessLevel ||
  '—';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeAdminContext, setActiveAdminContext] = useState(() => {
    const saved = localStorage.getItem('activeAdminContext');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.availableContexts && u.availableContexts.length > 0) {
          const defaultCtx = u.availableContexts[0];
          localStorage.setItem('activeAdminContext', JSON.stringify(defaultCtx));
          return defaultCtx;
        }
      } catch (e) {}
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [permByRole, setPermByRole] = useState({});

  const refreshPermissions = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setPermByRole({});
      return;
    }
    try {
      // Sync User Profile (including availableContexts)
      try {
        const meData = await authService.getMe();
        if (meData?.data?.user) {
          const fetchedUser = meData.data.user;
          setUser((prevUser) => {
            const updated = {
              ...prevUser,
              ...fetchedUser,
              n: fetchedUser.name,
            };
            localStorage.setItem('user', JSON.stringify(updated));

            // Validate activeAdminContext against new contexts
            const activeCtxStr = localStorage.getItem('activeAdminContext');
            if (activeCtxStr && fetchedUser.availableContexts) {
              try {
                const activeCtx = JSON.parse(activeCtxStr);
                const isValid = fetchedUser.availableContexts.some(
                  (c) => String(c.id) === String(activeCtx.id) && c.type === activeCtx.type
                );
                if (!isValid) {
                  if (fetchedUser.availableContexts.length > 0) {
                    const defaultCtx = fetchedUser.availableContexts[0];
                    setActiveAdminContext(defaultCtx);
                    localStorage.setItem('activeAdminContext', JSON.stringify(defaultCtx));
                  } else {
                    setActiveAdminContext(null);
                    localStorage.removeItem('activeAdminContext');
                  }
                }
              } catch (e) {}
            }
            return updated;
          });
        }
      } catch (err) {
        // ignore getMe errors to not block permissions load
      }

      const roles = await getRoles();
      const detailed = await Promise.all(roles.map((r) => getRoleById(r.id)));
      const next = {};
      detailed.forEach((role) => {
        next[role.name] = {};
        (role.modules || []).forEach((mod) => {
          if (mod.keyCode) {
            next[role.name][mod.keyCode] = getAccessLevel(mod);
          }
        });
      });
      setPermByRole(next);
    } catch {
      // Keep last known matrix if refresh fails (e.g. network blip)
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshPermissions();
    } else {
      setPermByRole({});
    }
  }, [isAuthenticated, refreshPermissions]);

  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.availableContexts && userData.availableContexts.length > 0) {
      const defaultCtx = userData.availableContexts[0];
      setActiveAdminContext(defaultCtx);
      localStorage.setItem('activeAdminContext', JSON.stringify(defaultCtx));
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Clear local session even if the API call fails
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setPermByRole({});
      setActiveAdminContext(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeAdminContext');
    }
  };

  const switchAdminContext = (context) => {
    setActiveAdminContext(context);
    localStorage.setItem('activeAdminContext', JSON.stringify(context));
  };

const normalizeRole = (role) => {
  if (!role) return '';
  const r = String(role).trim().toLowerCase();
  if (r.includes('super admin') || r.includes('super_admin')) return 'Super Admin';
  if (r.includes('tenant admin') || r.includes('tenant_admin') || r === 'admin') return 'Tenant Admin';
  if (r.includes('group admin') || r.includes('group_admin')) return 'Group Admin';
  if (r.includes('advocate')) return 'Advocate';
  if (r.includes('sub admin') || r.includes('sub_admin')) return 'Sub Admin';
  if (r.includes('staff')) return 'Staff/Bearer';
  return role;
};

  const hasPermission = (key, action = 'V') => {
    if (key === 'dash') return true;
    const rawRole = typeof user?.role === 'object' ? (user?.role?.name || '') : String(user?.role || '');
    const normRole = normalizeRole(rawRole);

    if (normRole === 'Super Admin') {
      if (['dash', 'tenants', 'plans', 'tenantSettings', 'masters', 'smtp'].includes(key)) return true;
      return false; // Restrict Super Admin to only Dashboard, Tenants, Subscription Plans, Tenant Settings, Settings, and SMTP
    }

    if (normRole === 'Tenant Admin') {
      if (['tenants', 'plans'].includes(key)) return false;
      // Fall through to matrix check
    }

    if (normRole === 'Group Admin') {
      // Hidden for Group Admin: platform/tenant settings, Group Admin management & Membership
      if (['tenants', 'plans', 'tenantSettings', 'group-admins', 'member'].includes(key)) return false;
      // Fall through to matrix check
    }


    const keyCode = KEY_ALIASES[key] || key;
    let targetRoleForPerms = normRole;
    if (normRole === 'Group Admin') {
      targetRoleForPerms = 'Tenant Admin'; // Group Admin inherits Tenant Admin's matrix exactly
    }

    // Force using the targetRoleForPerms matrix for Group Admin, ignoring its own rawRole matrix
    let rolePerms = normRole === 'Group Admin' ? permByRole[targetRoleForPerms] : (permByRole[rawRole] || permByRole[targetRoleForPerms]);

    if (!rolePerms && Object.keys(permByRole).length > 0) {
      const matchedKey = Object.keys(permByRole).find((k) => normalizeRole(k) === targetRoleForPerms);
      if (matchedKey) rolePerms = permByRole[matchedKey];
    }

    if (!rolePerms) {
      return false; // Wait until permissions matrix loads
    }

    let perm = rolePerms[keyCode];

    // Fallback for aliases or legacy keys
    if (!perm && key !== keyCode) {
      perm = rolePerms[key];
    }
    if (!perm && (key === 'diary' || key === 'hearings')) {
      perm = rolePerms['diary'] || rolePerms['hearings'];
    }

    perm = perm || '---';
    return perm.includes(action);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        refreshPermissions,
        permByRole,
        activeAdminContext,
        switchAdminContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
