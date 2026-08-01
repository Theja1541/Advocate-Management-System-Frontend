import React from 'react';
import useAuth from '../hooks/useAuth';

/**
 * A wrapper component that conditionally renders its children
 * if the authenticated user has one of the allowed roles.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Elements to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles allowed to view the content
 * @param {React.ReactNode} [props.fallback] - Optional fallback content if unauthorized
 */
export default function RoleGuard({ children, allowedRoles, fallback = null }) {
  const { user } = useAuth();

  if (!user || !user.role) {
    return fallback;
  }

  if (allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  return fallback;
}
