import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "@/App";
import { PublicOnlyRoute } from "@/components/auth/PublicOnlyRoute";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { MetaProvider } from "@/contexts/MetaContext";
import AuthCallback from "@/pages/AuthCallback";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Register from "@/pages/Register";

export default function RootApp() {
  return (
    <AuthProvider>
      <MetaProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<App />} />
            </Route>

            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Toaster />
          <Sonner />
        </BrowserRouter>
      </MetaProvider>
    </AuthProvider>
  );
}
