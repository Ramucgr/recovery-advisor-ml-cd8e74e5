import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Athletes from "./pages/Athletes";
import Injuries from "./pages/Injuries";
import Rehabilitation from "./pages/Rehabilitation";
import MedicalRecords from "./pages/MedicalRecords";
import Predictions from "./pages/Predictions";
import Reports from "./pages/Reports";
import Appointments from "./pages/Appointments";
import Messages from "./pages/Messages";
import Goals from "./pages/Goals";
import TrainingLoad from "./pages/TrainingLoad";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/athletes" element={<ProtectedRoute><DashboardLayout><Athletes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/injuries" element={<ProtectedRoute><DashboardLayout><Injuries /></DashboardLayout></ProtectedRoute>} />
            <Route path="/rehabilitation" element={<ProtectedRoute><DashboardLayout><Rehabilitation /></DashboardLayout></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute><DashboardLayout><MedicalRecords /></DashboardLayout></ProtectedRoute>} />
            <Route path="/predictions" element={<ProtectedRoute><DashboardLayout><Predictions /></DashboardLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><DashboardLayout><Reports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><DashboardLayout><Appointments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><DashboardLayout><Messages /></DashboardLayout></ProtectedRoute>} />
            <Route path="/goals" element={<ProtectedRoute><DashboardLayout><Goals /></DashboardLayout></ProtectedRoute>} />
            <Route path="/training-load" element={<ProtectedRoute><DashboardLayout><TrainingLoad /></DashboardLayout></ProtectedRoute>} />
            <Route path="/exercises" element={<ProtectedRoute><DashboardLayout><ExerciseLibrary /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
