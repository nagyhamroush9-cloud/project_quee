import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";

export function ProtectedRoute({ roles, children }) {
  const { isAuthed, user } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (roles && roles.length && !roles.includes(user?.role)) return <Navigate to="/app" replace />;
  return children;
}

