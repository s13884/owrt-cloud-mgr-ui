import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Devices from "../pages/Devices";
import { useAuth } from "../context/AuthContext";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const auth = useAuth();
  return auth.isLoggedIn ? children : <Login />;
}

export const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    )
  },
  {
    path: "/devices",
    element: (
      <PrivateRoute>
        <Devices />
      </PrivateRoute>
    )
  }
]);
