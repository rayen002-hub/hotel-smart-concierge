import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { RoomLayout } from '../layouts/RoomLayout';
import { NotFound } from '../pages/NotFound';
import { CheckInPage } from '../pages/public/CheckInPage';
import { RoomHomePage } from '../pages/public/RoomHomePage';
import { RoomComplaintPage } from '../pages/public/RoomComplaintPage';
import { RoomComplaintsPage } from '../pages/public/RoomComplaintsPage';
import { RoomHotelInfoPage } from '../pages/public/RoomHotelInfoPage';
import { RoomCurrencyPage } from '../pages/public/RoomCurrencyPage';

// Placeholders for Auth/Staff Pages
const Login = () => <div className="p-4">Login Page</div>;
const ReceptionDashboard = () => <div className="p-4">Reception Dashboard</div>;
const ManagerDashboard = () => <div className="p-4">Manager Dashboard</div>;
const AdminDashboard = () => <div className="p-4">Admin Dashboard</div>;

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
      { path: 'login', element: <Login /> },

      // Staff Dashboards
      { path: 'dashboard/reception', element: <ReceptionDashboard /> },
      { path: 'dashboard/manager', element: <ManagerDashboard /> },
      { path: 'dashboard/admin', element: <AdminDashboard /> },

      // 404 Catch-all
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
