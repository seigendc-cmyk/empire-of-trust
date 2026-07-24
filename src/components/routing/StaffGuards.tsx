import React from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import type { StaffPermission } from '../../types/staff';

const Resolving: React.FC = () => (
  <div role="status" className="grid min-h-[45vh] place-items-center p-8 text-sm font-bold">
    Verifying staff authorization…
  </div>
);

export const RequireStaff: React.FC = () => {
  const { phase } = useStaffAuth();
  const location = useLocation();
  if (phase === 'loading') return <Resolving />;
  if (phase === 'unauthenticated') {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  }
  if (phase === 'error') {
    return <Navigate to="/staff/auth-error" replace state={{ from: location.pathname }} />;
  }
  if (phase === 'suspended') return <Navigate to="/staff/suspended" replace />;
  if (phase !== 'authorized') return <Navigate to="/access-denied" replace />;
  return <Outlet />;
};

export const RequirePermission: React.FC<{
  permission: StaffPermission;
  children?: React.ReactNode;
}> = ({ permission, children }) => {
  const { phase, staffUser } = useStaffAuth();
  if (phase === 'loading') return <Resolving />;
  if (phase !== 'authorized' || !staffUser) return <Navigate to="/access-denied" replace />;
  if (!staffUser.permissions.includes(permission)) {
    return <Navigate to="/staff/forbidden" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
};

export const RequireSeriesAssignment: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { phase, staffUser } = useStaffAuth();
  const { seriesId } = useParams();
  if (phase === 'loading') return <Resolving />;
  if (phase !== 'authorized' || !staffUser) return <Navigate to="/access-denied" replace />;
  const globalSeriesAccess = staffUser.roles.some((role) =>
    ['owner', 'administrator', 'publisher'].includes(role)
  );
  if (!seriesId || (!globalSeriesAccess && !staffUser.assignedSeriesIds.includes(seriesId))) {
    return <Navigate to="/staff/forbidden" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
};
