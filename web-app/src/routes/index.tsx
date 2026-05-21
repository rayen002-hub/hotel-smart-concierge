import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { RoomLayout } from '../layouts/RoomLayout';
import { StaffLayout } from '../layouts/StaffLayout';
import { NotFound } from '../pages/NotFound';
import { CheckInPage } from '../pages/public/CheckInPage';
import { RoomHomePage } from '../pages/public/RoomHomePage';
import { RoomComplaintPage } from '../pages/public/RoomComplaintPage';
import { RoomComplaintsPage } from '../pages/public/RoomComplaintsPage';
import { RoomHotelInfoPage } from '../pages/public/RoomHotelInfoPage';
import { RoomCurrencyPage } from '../pages/public/RoomCurrencyPage';
import { LoginPage } from '../pages/staff/LoginPage';
import { AuthGuard } from '../components/AuthGuard';
import { ReceptionDashboard } from '../pages/staff/ReceptionDashboard';
import { ManagerDashboard } from '../pages/staff/ManagerDashboard';
import { AdminDashboard } from '../pages/staff/AdminDashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },

      // Public Check-in
      { path: 'checkin', element: <CheckInPage /> },

      // Public Room Interface (protected by RoomLayout token gate)
      {
        path: 'room',
        element: <RoomLayout />,
        children: [
          { index: true, element: <RoomHomePage /> },
          { path: 'complaint', element: <RoomComplaintPage /> },
          { path: 'complaints', element: <RoomComplaintsPage /> },
          { path: 'hotel-info', element: <RoomHotelInfoPage /> },
          { path: 'currency', element: <RoomCurrencyPage /> },
        ],
      },

      // Auth
      { path: 'login', element: <LoginPage /> },

      // Staff Dashboards (protected by AuthGuard + StaffLayout)
      {
        path: 'dashboard',
        element: (
          <AuthGuard allowedRoles={['ADMIN', 'RECEPTIONIST', 'MAINTENANCE_MANAGER', 'HOUSEKEEPING_MANAGER']}>
            <StaffLayout />
          </AuthGuard>
        ),
        children: [
          {
            path: 'reception',
            element: (
              <AuthGuard allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                <ReceptionDashboard />
              </AuthGuard>
            ),
          },
          {
            path: 'manager',
            element: (
              <AuthGuard allowedRoles={['ADMIN', 'MAINTENANCE_MANAGER', 'HOUSEKEEPING_MANAGER']}>
                <ManagerDashboard />
              </AuthGuard>
            ),
          },
          {
            path: 'admin',
            element: (
              <AuthGuard allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </AuthGuard>
            ),
          },
        ],
      },

      // 404 Catch-all
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
