import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { getRouteMeta } from "@/config/navigation";
import IconButton from "@/components/ui/IconButton";

export default function MobileTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = getRouteMeta(location.pathname);

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-top-bar pt-safe bg-white/90 backdrop-blur-xl border-b border-gray-100 md:hidden">
      <div className="flex items-center gap-1 h-full px-2">
        {meta.showBack ? (
          <IconButton
            aria-label="Назад"
            onClick={() => navigate(meta.backTo ?? -1 as unknown as string)}
          >
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
        ) : (
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-[11px]">V</span>
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">Voitra</span>
          </div>
        )}
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">
          {meta.showBack ? meta.title : ""}
        </h1>
        {/* Right-side action portal */}
        <div id="topbar-actions" className="flex items-center" />
      </div>
    </header>
  );
}
