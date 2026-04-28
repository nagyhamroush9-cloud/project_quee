import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { PatientAppointments } from "./pages/PatientAppointments";
import { PatientPayments } from "./pages/PatientPayments";
import { PatientQueue } from "./pages/PatientQueue";
import { ReceptionQueue } from "./pages/ReceptionQueue";
import { DoctorSchedule } from "./pages/DoctorSchedule";
import { DoctorAppointments } from "./pages/DoctorAppointments";
import { AdminAnalytics } from "./pages/AdminAnalytics";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminAppointments } from "./pages/AdminAppointments";
import { AdminAudit } from "./pages/AdminAudit";
import { DoctorQueue } from "./pages/DoctorQueue";
import { Notifications } from "./pages/Notifications";
import { Profile } from "./pages/Profile";
import { BookAppointment } from "./pages/BookAppointment";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuth } from "./state/auth.jsx";

function AppLayout({ children }) {
  return (
    <AppShell>
      <Toaster position="top-right" />
      {children}
    </AppShell>
  );
}

function Home() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") return <Navigate to="/app/admin/analytics" replace />;
  if (user?.role === "RECEPTIONIST") return <Navigate to="/app/reception/queue" replace />;
  if (user?.role === "DOCTOR") return <Navigate to="/app/doctor/schedule" replace />;
  return <Navigate to="/app/appointments" replace />;
}

export function App() {
  const { isAuthed } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthed ? "/app" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Home />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/notifications"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Notifications />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/appointments"
          element={
            <ProtectedRoute roles={["PATIENT"]}>
              <AppLayout>
                <PatientAppointments />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/payments"
          element={
            <ProtectedRoute roles={["PATIENT"]}>
              <AppLayout>
                <PatientPayments />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/queue"
          element={
            <ProtectedRoute roles={["PATIENT"]}>
              <AppLayout>
                <PatientQueue />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/profile"
          element={
            <ProtectedRoute roles={["PATIENT"]}>
              <AppLayout>
                <Profile />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/book-appointment"
          element={
            <ProtectedRoute roles={["PATIENT"]}>
              <AppLayout>
                <BookAppointment />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/reception/queue"
          element={
            <ProtectedRoute roles={["RECEPTIONIST", "ADMIN"]}>
              <AppLayout>
                <ReceptionQueue />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/doctor/schedule"
          element={
            <ProtectedRoute roles={["DOCTOR", "ADMIN"]}>
              <AppLayout>
                <DoctorSchedule />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/doctor/appointments"
          element={
            <ProtectedRoute roles={["DOCTOR", "ADMIN"]}>
              <AppLayout>
                <DoctorAppointments />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/doctor/queue"
          element={
            <ProtectedRoute roles={["DOCTOR", "ADMIN"]}>
              <AppLayout>
                <DoctorQueue />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/admin/analytics"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AppLayout>
                <AdminAnalytics />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/admin/users"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AppLayout>
                <AdminUsers />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/admin/audit"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AppLayout>
                <AdminAudit />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/admin/appointments"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AppLayout>
                <AdminAppointments />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={isAuthed ? "/app" : "/login"} replace />} />
      </Routes>
    </>
  );
}

