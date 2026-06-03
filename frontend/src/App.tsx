import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";

// ─── Eager imports ───
// Эти страницы пре-рендерятся через scripts/prerender.ts для SEO — их HTML должен
// присутствовать в статической сборке. React.lazy на них сломает SSR.
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import AudioToText from "@/pages/seo/AudioToText";
import VideoToText from "@/pages/seo/VideoToText";
import NeuralTranscription from "@/pages/seo/NeuralTranscription";
import VoiceMessages from "@/pages/seo/VoiceMessages";
import AudioToTextFree from "@/pages/seo/AudioToTextFree";
import TranskribaciyaAudio from "@/pages/seo/TranskribaciyaAudio";
import PerevestiAudio from "@/pages/seo/PerevestiAudio";
import RasshifrovkaAudio from "@/pages/seo/RasshifrovkaAudio";
import PreobrazovatAudio from "@/pages/seo/PreobrazovatAudio";
import BezRegistracii from "@/pages/seo/BezRegistracii";
import IzSsylki from "@/pages/seo/IzSsylki";
import RusskijYazyk from "@/pages/seo/RusskijYazyk";
import AnglijskijYazyk from "@/pages/seo/AnglijskijYazyk";
import KazahskijYazyk from "@/pages/seo/KazahskijYazyk";
import DlyaPodkastov from "@/pages/seo/DlyaPodkastov";
import DlyaLekcij from "@/pages/seo/DlyaLekcij";
import Transkribaciya from "@/pages/seo/Transkribaciya";
import PerevodAudio from "@/pages/seo/PerevodAudio";
import TranskribaciyaVideo from "@/pages/seo/TranskribaciyaVideo";
import TranskribaciyaOnlayn from "@/pages/seo/TranskribaciyaOnlayn";
import RasshifrovkaVideo from "@/pages/seo/RasshifrovkaVideo";
import RaspoznavanieRechi from "@/pages/seo/RaspoznavanieRechi";
import ProtocolSoveshchaniya from "@/pages/seo/ProtocolSoveshchaniya";
import RasshifrovkaIntervyu from "@/pages/seo/RasshifrovkaIntervyu";
import YoutubeVTekst from "@/pages/seo/YoutubeVTekst";
import Mp3VTekst from "@/pages/seo/Mp3VTekst";
import DiktofonVTekst from "@/pages/seo/DiktofonVTekst";
import DlyaBiznesa from "@/pages/seo/DlyaBiznesa";
import DlyaZhurnalistov from "@/pages/seo/DlyaZhurnalistov";
import SubtitryDlyaVideo from "@/pages/seo/SubtitryDlyaVideo";
import ZoomVTekst from "@/pages/seo/ZoomVTekst";
import NemeckijYazyk from "@/pages/seo/NemeckijYazyk";
import FrancuzskijYazyk from "@/pages/seo/FrancuzskijYazyk";
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
// Admin вынесен в отдельный bundle (src/admin/AdminApp.tsx), деплоится на
// admin.dicto.pro. В публичном бандле dicto.pro его НЕТ — это снижает
// attack surface и даёт сетевую изоляцию.

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
      <ScrollToTop />
      <Routes>
        {/* Public pages (eager, prerendered) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<SmartPricingRoute />} />
        <Route path="/audio-v-tekst" element={<AudioToText />} />
        <Route path="/video-v-tekst" element={<VideoToText />} />
        <Route path="/nejroset-transkribaciya" element={<NeuralTranscription />} />
        <Route path="/rasshifrovka-golosovyh" element={<VoiceMessages />} />
        <Route path="/audio-v-tekst-besplatno" element={<AudioToTextFree />} />
        <Route path="/transkribaciya-audio" element={<TranskribaciyaAudio />} />
        <Route path="/perevesti-audio-v-tekst" element={<PerevestiAudio />} />
        <Route path="/rasshifrovka-audio" element={<RasshifrovkaAudio />} />
        <Route path="/preobrazovat-audio" element={<PreobrazovatAudio />} />
        <Route path="/bez-registracii" element={<BezRegistracii />} />
        <Route path="/iz-ssylki" element={<IzSsylki />} />
        <Route path="/russkij-yazyk" element={<RusskijYazyk />} />
        <Route path="/anglijskij-yazyk" element={<AnglijskijYazyk />} />
        <Route path="/kazahskij-yazyk" element={<KazahskijYazyk />} />
        <Route path="/dlya-podkastov" element={<DlyaPodkastov />} />
        <Route path="/dlya-lekcij" element={<DlyaLekcij />} />
        <Route path="/transkribaciya" element={<Transkribaciya />} />
        <Route path="/perevod-audio-v-tekst" element={<PerevodAudio />} />
        <Route path="/transkribaciya-video" element={<TranskribaciyaVideo />} />
        <Route path="/transkribaciya-onlayn" element={<TranskribaciyaOnlayn />} />
        <Route path="/rasshifrovka-video" element={<RasshifrovkaVideo />} />
        <Route path="/raspoznavanie-rechi" element={<RaspoznavanieRechi />} />
        <Route path="/protokol-soveshchaniya" element={<ProtocolSoveshchaniya />} />
        <Route path="/rasshifrovka-intervyu" element={<RasshifrovkaIntervyu />} />
        <Route path="/youtube-v-tekst" element={<YoutubeVTekst />} />
        <Route path="/mp3-v-tekst" element={<Mp3VTekst />} />
        <Route path="/diktofon-v-tekst" element={<DiktofonVTekst />} />
        <Route path="/dlya-biznesa" element={<DlyaBiznesa />} />
        <Route path="/dlya-zhurnalistov" element={<DlyaZhurnalistov />} />
        <Route path="/subtitry-dlya-video" element={<SubtitryDlyaVideo />} />
        <Route path="/zoom-v-tekst" element={<ZoomVTekst />} />
        <Route path="/nemeckij-yazyk" element={<NemeckijYazyk />} />
        <Route path="/francuzskij-yazyk" element={<FrancuzskijYazyk />} />
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
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
