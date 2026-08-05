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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const hasPermission = (key, action = 'V') => {
    if (key === 'dash') return true;
    const userRole = user?.role || 'Super Admin';
    
    // Allow Tenant Admin to access Tenant Settings
    if (key === 'tenantSettings' && userRole === 'Admin') return true;
    
    if (userRole === 'Super Admin') {
      if (key === 'roles') return false; // Hidden for Super Admin
      return true; // Super Admin bypasses all other permission checks
    }

    const keyCode = KEY_ALIASES[key] || key;
    const rolePerms = permByRole[userRole];
    
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
