import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";

// ─── Eager imports ───
// Эти страницы пре-рендерятся через scripts/prerender.ts для SEO — их HTML должен
// присутствовать в статической сборке. React.lazy на них сломает SSR.
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import AudioToText from "@/pages/seo/AudioToText";
import VideoToText from "@/pages/seo/VideoToText";
import NeuralTranscription from "@/pages/seo/NeuralTranscription";
import VoiceMessages from "@/pages/seo/VoiceMessages";
import BlogIndex from "@/pages/blog/BlogIndex";
import BlogArticle from "@/pages/blog/BlogArticle";

// ─── Lazy imports ───
// Всё остальное — code-split по отдельным чанкам. Загружается по требованию
// при навигации. Для протектед-зон юзер всё равно сначала логинится, так что
// нет смысла грузить их в main bundle.
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Upload = lazy(() => import("@/pages/Upload"));
const Transcription = lazy(() => import("@/pages/Transcription"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const Profile = lazy(() => import("@/pages/Profile"));
const Admin = lazy(() => import("@/pages/Admin"));

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

/**
 * Fallback пока lazy-чанк грузится. Ink bg чтобы не мигало белым.
 * Обычно чанк грузится <100 мс — этот loader едва будет виден.
 */
function RouteLoader() {
  return (
    <div className="min-h-dvh bg-[var(--bg)] flex items-center justify-center">
      <span
        className="inline-flex items-end gap-[2px] h-5"
        role="status"
        aria-label="Загрузка"
      >
        {[0.35, 0.7, 1, 0.7, 0.35].map((base, i) => (
          <span
            key={i}
            className="hero-eq-bar rounded-full bg-acid-300"
            style={{
              width: 2,
              height: `${base * 100}%`,
              animationDelay: `${i * 0.12}s`,
              animationDuration: `${0.9 + (i % 3) * 0.25}s`,
            }}
          />
        ))}
      </span>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    }
  }, [isAuthenticated, loadUser]);

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Public pages (eager, prerendered) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<SmartPricingRoute />} />
        <Route path="/audio-v-tekst" element={<AudioToText />} />
        <Route path="/video-v-tekst" element={<VideoToText />} />
        <Route path="/nejroset-transkribaciya" element={<NeuralTranscription />} />
        <Route path="/rasshifrovka-golosovyh" element={<VoiceMessages />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />

        {/* Public pages (lazy) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Protected pages (lazy) */}
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
    </Suspense>
  );
}
