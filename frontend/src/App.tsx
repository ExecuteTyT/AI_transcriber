import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ForgotPassword from "@/pages/ForgotPassword";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Pricing from "@/pages/Pricing";
import Profile from "@/pages/Profile";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import Subscription from "@/pages/Subscription";
import Transcription from "@/pages/Transcription";
import Admin from "@/pages/Admin";
import Upload from "@/pages/Upload";
import AudioToText from "@/pages/seo/AudioToText";
import VideoToText from "@/pages/seo/VideoToText";
import NeuralTranscription from "@/pages/seo/NeuralTranscription";
import VoiceMessages from "@/pages/seo/VoiceMessages";
import BlogIndex from "@/pages/blog/BlogIndex";
import BlogArticle from "@/pages/blog/BlogArticle";
import { useAuthStore } from "@/store/authStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function HomePage() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function SmartPricingRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/app/pricing" replace />;
  return <Pricing />;
}

export default function App() {
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    }
  }, [isAuthenticated, loadUser]);

  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<SmartPricingRoute />} />
      <Route path="/audio-v-tekst" element={<AudioToText />} />
      <Route path="/video-v-tekst" element={<VideoToText />} />
      <Route path="/nejroset-transkribaciya" element={<NeuralTranscription />} />
      <Route path="/rasshifrovka-golosovyh" element={<VoiceMessages />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogArticle />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected pages */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/transcription/:id" element={<Transcription />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/app/pricing" element={<Pricing />} />
        <Route path="/admin" element={<Admin />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
