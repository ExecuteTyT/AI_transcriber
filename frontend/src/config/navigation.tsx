import { LayoutDashboard, Upload, User, Tag, CreditCard, LogOut, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  Icon: LucideIcon;
  match?: (path: string) => boolean;
  isFab?: boolean;
};

export type RouteMeta = {
  title: string;
  showBack?: boolean;
  backTo?: string;
};

export const PRIMARY_TABS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Главная",
    Icon: LayoutDashboard,
    match: (p) => p === "/dashboard" || p.startsWith("/transcription/"),
  },
  {
    to: "/app/pricing",
    label: "Тарифы",
    Icon: Tag,
  },
  {
    to: "/upload",
    label: "Загрузить",
    Icon: Upload,
    isFab: true,
  },
  {
    to: "/profile",
    label: "Профиль",
    Icon: User,
  },
];

export const OVERFLOW_ITEMS: NavItem[] = [
  { to: "/subscription", label: "Подписка", Icon: CreditCard },
];

export const DESKTOP_SECTIONS = [
  {
    items: [
      { to: "/dashboard", label: "Транскрипции", Icon: LayoutDashboard, match: (p: string) => p === "/dashboard" || p.startsWith("/transcription/") },
      { to: "/upload", label: "Загрузить", Icon: Upload },
    ],
  },
  {
    label: "Аккаунт",
    items: [
      { to: "/app/pricing", label: "Тарифы", Icon: Tag },
      { to: "/subscription", label: "Подписка", Icon: CreditCard },
      { to: "/profile", label: "Профиль", Icon: User },
    ],
  },
];

export function getRouteMeta(pathname: string): RouteMeta {
  if (pathname === "/dashboard") return { title: "Главная" };
  if (pathname === "/upload") return { title: "Загрузка", showBack: true, backTo: "/dashboard" };
  if (pathname.startsWith("/transcription/")) return { title: "Транскрипция", showBack: true, backTo: "/dashboard" };
  if (pathname === "/profile") return { title: "Профиль", showBack: true, backTo: "/dashboard" };
  if (pathname === "/subscription") return { title: "Подписка", showBack: true, backTo: "/dashboard" };
  if (pathname === "/app/pricing") return { title: "Тарифы", showBack: true, backTo: "/dashboard" };
  if (pathname === "/admin") return { title: "Админ", showBack: true, backTo: "/dashboard" };
  return { title: "Scribi" };
}

export { MoreHorizontal, LogOut };
