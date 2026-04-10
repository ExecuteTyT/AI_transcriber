import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { OVERFLOW_ITEMS } from "@/config/navigation";
import { useAuthStore } from "@/store/authStore";
import MobileSheet from "@/components/ui/MobileSheet";

type OverflowSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function OverflowSheet({ open, onClose }: OverflowSheetProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    onClose();
    logout();
    navigate("/login");
  };

  return (
    <MobileSheet open={open} onClose={onClose} title="Ещё">
      <div className="space-y-1">
        {OVERFLOW_ITEMS.map((item) => {
          const Icon = item.Icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-target"
            >
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="text-[15px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        <div className="border-t border-gray-100 mt-2 pt-2">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name || "Пользователь"}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors w-full touch-target"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[15px] font-medium">Выйти</span>
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}
