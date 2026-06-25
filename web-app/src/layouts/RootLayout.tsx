import React from 'react';
import { Outlet } from 'react-router-dom';

// RootLayout is a transparent shell — each child route (Login, RoomLayout,
// DashboardLayout, CheckInPage) handles its own chrome/header/navigation.
export const RootLayout: React.FC = () => {
  return <Outlet />;
};
