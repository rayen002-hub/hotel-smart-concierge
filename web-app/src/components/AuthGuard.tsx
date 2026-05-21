import { Navigate, useLocation } from 'react-router-dom';
import { getStaffToken } from '../api/apiClient';

const STAFF_USER_KEY = 'staff_user';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
}

/**
 * Retrieve the stored staff user from localStorage.
 */
export function getStoredUser(): StaffUser | null {
  try {
    const raw = localStorage.getItem(STAFF_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
}

/**
 * Clear stored staff session (token + user).
 */
export function clearStaffSession() {
  localStorage.removeItem(STAFF_USER_KEY);
  localStorage.removeItem('staff_token');
}

interface AuthGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

/**
 * AuthGuard — protects staff routes.
 * Redirects to /login if no token or user is found.
 * Redirects to /login if user role is not in allowedRoles.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles, children }) => {
  const location = useLocation();
  const token = getStaffToken();
  const user = getStoredUser();

  // Not authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role not allowed
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
