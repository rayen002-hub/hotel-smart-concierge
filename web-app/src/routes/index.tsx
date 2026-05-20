import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { NotFound } from '../pages/NotFound';
import { CheckInPage } from '../pages/public/CheckInPage';

// Placeholders for Public Pages
const RoomHome = () => <div>Room Home Page</div>;
const RoomComplaint = () => <div>Room Complaint Submission</div>;
const RoomComplaintsList = () => <div>Room Complaints Tracking</div>;
const RoomHotelInfo = () => <div>Hotel Information</div>;
const RoomCurrency = () => <div>Currency Exchange Rates</div>;

// Placeholders for Auth/Staff Pages
const Login = () => <div>Login Page</div>;
const ReceptionDashboard = () => <div>Reception Dashboard</div>;
const ManagerDashboard = () => <div>Manager Dashboard</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      
      // Public Check-in
      { path: 'checkin', element: <CheckInPage /> },
      
      // Public Room Interface
      { path: 'room', element: <RoomHome /> },
      { path: 'room/complaint', element: <RoomComplaint /> },
      { path: 'room/complaints', element: <RoomComplaintsList /> },
      { path: 'room/hotel-info', element: <RoomHotelInfo /> },
      { path: 'room/currency', element: <RoomCurrency /> },

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
