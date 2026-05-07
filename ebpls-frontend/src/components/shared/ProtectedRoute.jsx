/**
 * ProtectedRoute.jsx
 * Route guard enforcing authentication and role-based access control.
 *
 * Usage (in App.jsx):
 *   <Route element={<ProtectedRoute allowedRoles={[ROLES.APPLICANT]} />}>
 *     <Route path="/applicant/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 * @policy  Unauthenticated → redirect to /login (replace, no back-button loop).
 * @policy  Wrong role → redirect to /login (silently — never show a 403 page).
 *          This prevents role enumeration by unauthorized users.
 * @policy  If allowedRoles is omitted, any authenticated user may enter.
 */

import { Navigate, Outlet } from 'react-router-dom';

import useAuthStore from '../../store/authStore';
import { ROUTES } from '../../utils/constants';

/**
 * @param {{ allowedRoles?: string[] }} props
 *   allowedRoles — optional list of ROLES values permitted for this route group.
 *                  Omit to allow any authenticated user.
 */
function ProtectedRoute({ allowedRoles }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user            = useAuthStore((s) => s.user);

  // Step 1 — Must be authenticated.
  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Step 2 — If a role whitelist is provided, enforce it.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Authorised — render the child route.
  return <Outlet />;
}

export default ProtectedRoute;
