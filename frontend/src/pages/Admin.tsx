import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/api/client";
import { useAuthStore } from "@/store/authStore";

interface Stats {
  total_users: number;
  total_transcriptions: number;
  total_analyses: number;
  total_minutes_used: number;
  users_by_plan: Record<string, number>;
  transcriptions_by_status: Record<string, number>;
  users_today: number;
  transcriptions_today: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  minutes_used: number;
  minutes_limit: number;
  is_admin: boolean;
  created_at: string;
  transcription_count: number;
}

interface AdminTranscription {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  status: string;
  duration_sec: number | null;
  original_filename: string;
  created_at: string;
}

type Tab = "overview" | "users" | "transcriptions";

const planNames: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };
const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  start: "bg-primary-50 text-primary-700",
  pro: "bg-gradient-to-r from-primary-500 to-accent-500 text-white",
};

const statusColors: Record<string, string> = {
  queued: "bg-amber-50 text-amber-600",
  processing: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  failed: "bg-red-50 text-red-600",
};

export default function Admin() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [transcriptions, setTranscriptions] = useState<AdminTranscription[]>([]);
  const [transTotal, setTransTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === "users") loadUsers();
    if (tab === "transcriptions") loadTranscriptions();
  }, [tab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data);
    } catch { /* forbidden or error */ }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/admin/users", { params: { per_page: 50, search } });
      setUsers(data.items);
      setUsersTotal(data.total);
    } catch { /* */ }
  };

  const loadTranscriptions = async () => {
    try {
      const { data } = await api.get("/admin/transcriptions", { params: { per_page: 50 } });
      setTranscriptions(data.items);
      setTransTotal(data.total);
    } catch { /* */ }
  };

  const updateUserPlan = async (userId: string, plan: string) => {
    const limits: Record<string, number> = { free: 15, start: 300, pro: 1200 };
    await api.patch(`/admin/users/${userId}`, { plan, minutes_limit: limits[plan] || 15 });
    loadUsers();
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    await api.patch(`/admin/users/${userId}`, { is_admin: !isAdmin });
    loadUsers();
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Удалить пользователя ${email}? Все данные будут потеряны.`)) return;
    await api.delete(`/admin/users/${userId}`);
    loadUsers();
    loadStats();
  };

  const deleteTranscription = async (transId: string, title: string) => {
    if (!confirm(`Удалить транскрипцию "${title}"?`)) return;
    await api.delete(`/admin/transcriptions/${transId}`);
    loadTranscriptions();
    loadStats();
  };

  if (!user?.is_admin) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Доступ запрещён</h2>
        <p className="text-gray-400 mb-6">У вас нет прав администратора</p>
        <Link to="/dashboard" className="btn-primary">К транскрипциям</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Админ-панель</h1>
        </div>
        <p className="text-sm text-gray-400">Управление сервисом Dicto</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-surface-100 rounded-xl p-1 w-fit">
        {([["overview", "Обзор"], ["users", "Пользователи"], ["transcriptions", "Транскрипции"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && stats && (
        <div className="space-y-6 animate-fade-up">
          {/* Main stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Пользователей", value: stats.total_users, sub: `+${stats.users_today} сегодня`, color: "from-primary-500 to-primary-600" },
              { label: "Транскрипций", value: stats.total_transcriptions, sub: `+${stats.transcriptions_today} сегодня`, color: "from-emerald-500 to-emerald-600" },
              { label: "AI-анализов", value: stats.total_analyses, sub: "", color: "from-violet-500 to-violet-600" },
              { label: "Минут обработано", value: stats.total_minutes_used, sub: `~${Math.round(stats.total_minutes_used / 60)} ч`, color: "from-accent-500 to-red-500" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{stat.label}</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{stat.value.toLocaleString()}</p>
                {stat.sub && <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>}
              </div>
            ))}
          </div>

          {/* Plan distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Распределение по тарифам</h3>
            <div className="space-y-3">
              {Object.entries(stats.users_by_plan).map(([plan, count]) => {
                const percent = stats.total_users > 0 ? Math.round((count / stats.total_users) * 100) : 0;
                return (
                  <div key={plan} className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${planColors[plan] || "bg-gray-100 text-gray-600"}`}>
                      {planNames[plan] || plan}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 tabular-nums w-16 text-right">{count} ({percent}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status distribution */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Статусы транскрипций</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.transcriptions_by_status).map(([status, count]) => (
                <div key={status} className="text-center p-3 rounded-xl bg-surface-50">
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{count}</p>
                  <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusColors[status] || ""}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Поиск по email или имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers()}
              className="input-field !py-2.5 flex-1 max-w-md"
            />
            <button onClick={loadUsers} className="btn-secondary !py-2.5">Найти</button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Всего: {usersTotal}</p>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-surface-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Пользователь</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">План</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Использование</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Записей</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-surface-50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{u.name || "—"} {u.is_admin && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold ml-1">ADMIN</span>}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={u.plan}
                          onChange={(e) => updateUserPlan(u.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        >
                          <option value="free">Free</option>
                          <option value="start">Старт</option>
                          <option value="pro">Про</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-600 tabular-nums">{u.minutes_used} / {u.minutes_limit} мин</span>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-600">{u.transcription_count}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleAdmin(u.id, u.is_admin)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors text-xs"
                            title={u.is_admin ? "Снять админ" : "Сделать админом"}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteUser(u.id, u.email)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Удалить"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transcriptions tab */}
      {tab === "transcriptions" && (
        <div className="animate-fade-up">
          <p className="text-xs text-gray-400 mb-4">Всего: {transTotal}</p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-surface-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Файл</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Пользователь</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Статус</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Длительность</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Дата</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {transcriptions.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-surface-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{t.title}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{t.user_email}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusColors[t.status] || ""}`}>{t.status}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 tabular-nums">
                        {t.duration_sec ? `${Math.floor(t.duration_sec / 60)}:${String(t.duration_sec % 60).padStart(2, "0")}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {new Date(t.created_at).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => deleteTranscription(t.id, t.title)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
