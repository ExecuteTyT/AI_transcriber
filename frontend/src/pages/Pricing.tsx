import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import SiteHeader from "@/components/SiteHeader";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  RefreshCw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { paymentsApi, WALLET_PACKS, WALLET_CUSTOM, customTopupPrice } from "@/api/payments";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/states/ErrorState";
import PricingCalculator from "@/components/pricing/PricingCalculator";
import { fadeUp, staggerChildren, springTight } from "@/lib/motion";
import { reachGoal } from "@/lib/metrika";
import { cn } from "@/lib/cn";

type FeatureGroup = {
  icon: LucideIcon;
  title: string;
  items: { label: string; included: boolean }[];
};

type Plan = {
  id: "free" | "start" | "pro" | "expert" | "premium";
  name: string;
  tagline: string;
  price: number;
  period: string;
  /** Минут в тарифе. Для Free — разовый бонус, период не учитывается. */
  minutesPerMonth: number | null;
  /** Pre-computed для отображения мелким шрифтом под основной ценой. */
  pricePerMinute: number | null;
  /**
   * Сильный визуальный highlight — только для «default choice» (Pro).
   * Использовать максимум на ОДНОМ тарифе чтобы не конкурировать за внимание.
   * Premium-вариант (тёмный градиент) больше не используется — заменён на topLabel-чип.
   */
  highlight?: "popular";
  /**
   * Eyebrow-чип над названием тарифа («Популярный», «Максимум»).
   * Лёгкая визуальная метка без перекраски всей карточки.
   */
  topLabel?: string;
  groups: FeatureGroup[];
  ctaLabel: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Попробуйте без риска",
    price: 0,
    period: "",
    minutesPerMonth: null,
    pricePerMinute: null,
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "30 минут на пробу (разово)", included: true },
          { label: "Файлы до 15 минут", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "1 AI-разбор (проба)", included: true },
          { label: "Разметка до 3 спикеров", included: true },
          { label: "RAG-чат по записи", included: false },
          { label: "Задачи (action items)", included: false },
        ],
      },
      {
        icon: RefreshCw,
        title: "Экспорт",
        items: [
          { label: "TXT / SRT", included: true },
          { label: "DOCX", included: false },
        ],
      },
    ],
    ctaLabel: "Начать бесплатно",
  },
  {
    id: "start",
    name: "Старт",
    tagline: "Для подкастеров и фрилансеров",
    price: 500,
    period: "/мес",
    minutesPerMonth: 600,
    pricePerMinute: 0.83,
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "600 минут (10 часов)", included: true },
          { label: "Файлы до 2 часов", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "Саммари без лимита", included: true },
          { label: "До 10 спикеров", included: true },
          { label: "10 RAG-вопросов / запись", included: true },
          { label: "Задачи (action items)", included: true },
        ],
      },
      {
        icon: RefreshCw,
        title: "Экспорт",
        items: [{ label: "TXT / SRT / DOCX", included: true }],
      },
    ],
    ctaLabel: "Выбрать Старт",
  },
  {
    id: "pro",
    name: "Про",
    tagline: "Для журналистов и регулярной работы",
    price: 990,
    period: "/мес",
    minutesPerMonth: 1800,
    pricePerMinute: 0.55,
    highlight: "popular",
    topLabel: "Популярный",
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "1 800 минут (30 часов)", included: true },
          { label: "Файлы до 3 часов", included: true },
          { label: "Приоритетная обработка", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "Всё без лимита", included: true },
          { label: "До 10 спикеров", included: true },
          { label: "RAG-чат безлимит", included: true },
          { label: "Задачи (action items)", included: true },
        ],
      },
      {
        icon: RefreshCw,
        title: "Экспорт",
        items: [{ label: "TXT / SRT / DOCX", included: true }],
      },
    ],
    ctaLabel: "Выбрать Про",
  },
  {
    id: "expert",
    name: "Эксперт",
    tagline: "Для адвокатов и ежедневных митингов",
    price: 1990,
    period: "/мес",
    minutesPerMonth: 4200,
    pricePerMinute: 0.47,
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "4 200 минут (70 часов)", included: true },
          { label: "Файлы до 4 часов", included: true },
          { label: "Приоритетная обработка", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "Всё без лимита", included: true },
          { label: "До 10 спикеров", included: true },
          { label: "RAG-чат безлимит", included: true },
          { label: "Задачи (action items)", included: true },
        ],
      },
      {
        icon: RefreshCw,
        title: "Экспорт",
        items: [{ label: "TXT / SRT / DOCX", included: true }],
      },
    ],
    ctaLabel: "Выбрать Эксперт",
  },
  {
    id: "premium",
    name: "Премиум",
    tagline: "Для студий и максимальных объёмов",
    price: 3490,
    period: "/мес",
    minutesPerMonth: 8400,
    pricePerMinute: 0.42,
    topLabel: "Максимум",
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "8 400 минут (140 часов)", included: true },
          { label: "Файлы до 3 часов", included: true },
          { label: "Приоритетная обработка", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "Всё без лимита", included: true },
          { label: "До 10 спикеров", included: true },
          { label: "RAG-чат безлимит", included: true },
          { label: "Задачи (action items)", included: true },
        ],
      },
      {
        icon: RefreshCw,
        title: "Экспорт",
        items: [{ label: "TXT / SRT / DOCX", included: true }],
      },
    ],
    ctaLabel: "Выбрать Премиум",
  },
];

const TRUST_ITEMS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Shield,
    title: "Отмена в 1 клик",
    description: "Без звонков в поддержку, без скрытых условий",
  },
  {
    icon: CreditCard,
    title: "Безопасная оплата",
    description: "YooKassa, все популярные карты и СБП",
  },
  {
    icon: Zap,
    title: "Мгновенный апгрейд",
    description: "Новые минуты доступны сразу после оплаты",
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Как работает смена тарифа?",
    a: "Переход мгновенный. Новые лимиты начинают действовать сразу после оплаты. Неиспользованные минуты прошлого тарифа добавляются к новому.",
  },
  {
    q: "Можно ли отменить подписку?",
    a: (
      <>
        Да, в любой момент на странице{" "}
        <Link
          to="/subscription"
          className="font-semibold text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 hover:decoration-[var(--accent)]"
        >
          Подписка
        </Link>
        . Доступ сохранится до конца оплаченного периода.
      </>
    ),
  },
  {
    q: "Что если закончатся минуты?",
    a: "Обработка новых файлов приостановится, но все прошлые транскрипции останутся доступны. Добавить минуты можно в один клик — апгрейд на более высокий тариф или переход на следующий расчётный период.",
  },
  {
    q: "Есть ли возврат средств?",
    a: "Если сервис не подошёл — напишите в поддержку в течение 14 дней, вернём деньги без лишних вопросов.",
  },
  {
    q: "Подходит ли для команды?",
    a: (
      <>
        Командные тарифы (общий биллинг, shared workspace, роли) — в разработке. Пока для команд напишите на{" "}
        <a
          href="mailto:dicto.pro@yandex.ru"
          className="font-semibold text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40 hover:decoration-[var(--accent)]"
        >
          dicto.pro@yandex.ru
        </a>{" "}
        — оформим несколько связанных аккаунтов с единым счётом и закрывающими документами.
      </>
    ),
  },
];

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  start: "Старт",
  pro: "Про",
  expert: "Эксперт",
  premium: "Премиум",
};

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleTopup = async (pack: string) => {
    if (!user) {
      navigate("/register");
      return;
    }
    setWalletLoading(pack);
    setError("");
    try {
      const result = await paymentsApi.topupWallet(pack);
      reachGoal("checkout_started", { source: "pricing", kind: "topup", pack });
      window.location.href = result.confirmation_url;
    } catch (err) {
      handleTopupError(err);
    }
  };

  const handleTopupCustom = async (minutes: number) => {
    if (!user) {
      navigate("/register");
      return;
    }
    setWalletLoading("custom");
    setError("");
    try {
      const result = await paymentsApi.topupWalletCustom(minutes);
      reachGoal("checkout_started", { source: "pricing", kind: "topup", pack: "custom", minutes });
      window.location.href = result.confirmation_url;
    } catch (err) {
      handleTopupError(err);
    }
  };

  const handleTopupError = (err: unknown) => {
    const axiosErr = err as {
      response?: { status?: number; data?: { detail?: string } };
      message?: string;
    };
    const status = axiosErr.response?.status;
    const detail = axiosErr.response?.data?.detail;
    const msg =
      status === 502 || status === 503
        ? "Платёжный сервис временно недоступен. Попробуйте позже."
        : status === 500
          ? "Ошибка сервера. Попробуйте позже."
          : detail || axiosErr.message || "Не удалось создать платёж";
    setError(msg);
    toast.error(msg);
    setWalletLoading(null);
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate("/register");
      return;
    }
    if (planId === "free" || user.plan === planId) return;
    setLoading(planId);
    setError("");
    try {
      const result = await paymentsApi.subscribe(planId);
      // Цель Метрики — intent на оплату (перед уходом на YooKassa).
      reachGoal("subscribe_click", { plan: planId });
      window.location.href = result.confirmation_url;
    } catch (err) {
      const axiosErr = err as {
        response?: { status?: number; data?: { detail?: string } };
        message?: string;
      };
      const status = axiosErr.response?.status;
      const detail = axiosErr.response?.data?.detail;
      let msg: string;
      if (status === 401 || status === 403) {
        // Сессия истекла прямо во время оформления — даём явное сообщение
        // и сохраняем намерение, чтобы вернуть юзера обратно после re-login.
        sessionStorage.setItem("pending_subscribe_plan", planId);
        msg = "Сессия истекла. Войдите снова — мы вернём вас сюда.";
      } else if (status === 502 || status === 503) {
        msg = "Платёжный сервис временно недоступен. Попробуйте позже.";
      } else if (status === 500) {
        msg = "Ошибка сервера. Попробуйте позже.";
      } else {
        msg = detail || axiosErr.message || "Ошибка создания платежа";
      }
      setError(msg);
      // Toast — чтобы фидбек был у места клика: баннер ErrorState рисуется вверху
      // страницы и на мобиле часто за пределами экрана («ничего не произошло»).
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  const isStandalone = !user;

  const content = (
    <motion.div
      variants={staggerChildren(0.06)}
      initial="hidden"
      animate="visible"
      className="space-y-8 md:space-y-12"
    >
      {!isStandalone && (
        <motion.header variants={fadeUp}>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Тарифы</h1>
          <p className="mt-1 text-sm text-gray-500">
            Платите только за то, что используете. Отмена в любой момент.
          </p>
        </motion.header>
      )}

      {isStandalone && (
        <motion.header variants={fadeUp} className="max-w-3xl">
          <p className="eyebrow mb-4">Тарифы</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
            Простые <em className="italic text-[var(--accent)]">и прозрачные</em>
          </h1>
          <p className="mt-5 max-w-[44ch] text-[15px] text-[var(--fg-muted)] leading-[1.55]">
            Начните бесплатно. Переходите, когда понадобится больше минут. Без скрытых платежей и без карты.
          </p>
        </motion.header>
      )}

      {!isStandalone && user && <CurrentPlanBar user={user} />}

      {error && (
        <motion.div variants={fadeUp}>
          <ErrorState title="Не удалось создать платёж" description={error} />
        </motion.div>
      )}

      {/* На мобильном — горизонтальный snap-scroll с peek следующей карточки
          (iOS-native pattern). На md+ — обычный grid. Отрицательный margin/padding
          расширяет область скролла до краёв экрана, а scroll-px удерживает
          выровненную snap-точку с учётом отступов layout-контейнера. */}
      <motion.div
        variants={fadeUp}
        className={cn(
          "flex md:grid gap-4 md:gap-4",
          "overflow-x-auto md:overflow-visible",
          "snap-x snap-mandatory md:snap-none",
          "-mx-4 sm:-mx-6 md:mx-0 px-4 sm:px-6 md:px-0",
          "scroll-px-4 sm:scroll-px-6 md:scroll-px-0",
          "pb-4 md:pb-0",
          "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:items-stretch",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={user?.plan === plan.id}
            loading={loading === plan.id}
            disabled={loading !== null}
            onSelect={() => handleSubscribe(plan.id)}
          />
        ))}
      </motion.div>

      <motion.div variants={fadeUp}>
        <WalletPacksBlock
          loading={walletLoading}
          disabled={walletLoading !== null}
          onSelect={handleTopup}
          onSelectCustom={handleTopupCustom}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <EnterpriseCard />
      </motion.div>

      <motion.div variants={fadeUp}>
        <PricingCalculator />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-px sm:grid-cols-3 border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--border)]">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 bg-[var(--bg-elevated)] p-5"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] border border-[var(--accent)]/20">
              <Icon icon={item.icon} size={16} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--fg)]">{item.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.section variants={fadeUp} className="pt-4">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <p className="eyebrow mb-3">FAQ</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
              Частые <em className="italic text-[var(--accent)]">вопросы</em>
            </h2>
          </div>
          <a
            href="mailto:dicto.pro@yandex.ru"
            className="hidden md:inline font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors"
          >
            Нужна помощь? →
          </a>
        </div>
        <div className="border-t border-[var(--border)]">
          {FAQ.map((item, i) => (
            <FaqRow
              key={i}
              question={item.q}
              answer={item.a}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </motion.section>

      <motion.section variants={fadeUp}>
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-12 md:px-12 md:py-16">
          <div className="max-w-2xl">
            <h3 className="font-display text-4xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-4">
              Готовы <em className="italic text-[var(--accent)]">сэкономить</em> часы?
            </h3>
            <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] mb-8 max-w-[44ch]">
              Бесплатная проба при регистрации: 30 минут и AI-разбор. Без карты, без подписки на пробный период.
            </p>
            <Link
              to={user ? "/upload" : "/register"}
              className="btn-accent !py-4 !px-7 !text-[15px]"
            >
              {user ? "Загрузить запись" : "Попробовать бесплатно"} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );

  if (!isStandalone) return content;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Seo
        title="Тарифы Dicto — транскрибация от 500 ₽/мес"
        description="Тарифы Dicto: Free (30 мин на пробу), Старт (500 ₽/мес, 10 ч), Про (990 ₽, 30 ч), Эксперт (1 990 ₽, 70 ч), Премиум (3 490 ₽, 140 ч). AI-саммари, разметка спикеров, экспорт TXT/SRT/DOCX."
        canonical="https://dicto.pro/pricing"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Главная", item: "https://dicto.pro/" },
            { "@type": "ListItem", position: 2, name: "Тарифы", item: "https://dicto.pro/pricing" },
          ],
        }}
      />
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">{content}</div>
    </div>
  );
}

function CurrentPlanBar({
  user,
}: {
  user: { plan: string; minutes_used: number; minutes_limit: number };
}) {
  const percent =
    user.minutes_limit > 0
      ? Math.min(100, Math.round((user.minutes_used / user.minutes_limit) * 100))
      : 0;
  const low = percent >= 80;

  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 md:p-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] border border-[var(--accent)]/20">
          <Icon icon={Check} size={18} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--fg)]">
            Текущий план:{" "}
            <span className="font-bold text-[var(--accent)]">
              {PLAN_NAMES[user.plan] || user.plan}
            </span>
          </p>
          <p className="text-xs text-[var(--fg-muted)]">
            Использовано{" "}
            <span className="font-semibold tabular text-[var(--fg)]">
              {user.minutes_used}
            </span>{" "}
            из{" "}
            <span className="tabular">{user.minutes_limit}</span> мин
          </p>
        </div>
        {low && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400 ring-1 ring-amber-500/30">
            <Icon icon={Zap} size={12} />
            Лимит заканчивается
          </span>
        )}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
          className={cn(
            "h-full rounded-full",
            low
              ? percent >= 100
                ? "bg-rose-500"
                : "bg-amber-500"
              : "bg-[var(--accent)]"
          )}
        />
      </div>
    </motion.div>
  );
}

type PlanVariant = "default" | "popular";

// Тема-зависимая палитра для карточки:
// - popular → --highlight-* (в dark: acid bg + ink текст, в light: ink bg + cream текст).
//             Применяется ТОЛЬКО к одному тарифу — иначе борьба за внимание.
// - default → обычная elevated cream/ink карточка.
//
// Visual hierarchy: ровно один «popular» = default choice (Pro), остальные — default.
// Дополнительная дифференциация через `topLabel`-чип («Максимум» у Премиума и т.п.).
function usePlanPalette(variant: PlanVariant) {
  if (variant === "popular") {
    return {
      surface: "bg-[var(--highlight-bg)] border-[var(--highlight-bg)]",
      fg: "text-[var(--highlight-fg)]",
      fgMuted: "text-[var(--highlight-fg-muted)]",
      fgSubtle: "text-[var(--highlight-fg-subtle)]",
      accent: "text-[var(--highlight-accent)]",
      ctaBg: "bg-[var(--highlight-accent)] text-[var(--highlight-accent-fg)] hover:opacity-90",
      ctaDisabled: "bg-[var(--highlight-accent)]/15 text-[var(--highlight-fg-muted)]",
      topLabelBg: "bg-[var(--highlight-accent)]/15 text-[var(--highlight-accent)] ring-1 ring-[var(--highlight-accent)]/30",
    };
  }
  return {
    surface: "bg-[var(--bg-elevated)] border-[var(--border)]",
    fg: "text-[var(--fg)]",
    fgMuted: "text-[var(--fg-muted)]",
    fgSubtle: "text-[var(--fg-subtle)]",
    accent: "text-[var(--accent)]",
    ctaBg: "border border-[var(--border-strong)] text-[var(--fg)] hover:bg-[var(--bg-muted)]",
    ctaDisabled: "bg-[var(--border)] text-[var(--fg-subtle)]",
    topLabelBg: "bg-[var(--bg-muted)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]",
  };
}

function PlanCard({
  plan,
  isCurrent,
  loading,
  disabled,
  onSelect,
}: {
  plan: Plan;
  isCurrent: boolean;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const variant: PlanVariant = plan.highlight === "popular" ? "popular" : "default";
  const p = usePlanPalette(variant);

  // Top-label чип: «Текущий» приоритетнее plan.topLabel («Популярный», «Максимум»).
  const topLabel = isCurrent ? "✓ Текущий" : plan.topLabel;
  const topLabelStyle = isCurrent
    ? cn("bg-[var(--bg-muted)]/40 ring-1", p.accent, variant === "popular" ? "ring-[var(--highlight-accent)]/40" : "ring-[var(--accent)]/30")
    : p.topLabelBg;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={springTight}
      className={cn(
        // min-w на мобильном: 85% ширины контейнера = peek следующей карточки справа
        // = подсказка «здесь скроллится». На md+ — обычное grid-поведение.
        "relative flex min-w-[85%] xs:min-w-[80%] sm:min-w-[60%] md:min-w-0 flex-col overflow-hidden rounded-3xl border p-5 xs:p-6 md:p-7",
        "snap-center md:snap-align-none",
        p.surface
      )}
    >
      {topLabel && (
        <span
          className={cn(
            "absolute top-5 right-5 inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]",
            topLabelStyle
          )}
        >
          {topLabel}
        </span>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <p className={cn("mb-4 font-mono text-[10px] uppercase tracking-[0.2em]", p.fgSubtle)}>
          /{plan.id}
        </p>
        {/* clamp(): название тарифа ужимается в узких колонках (5 cards @ xl),
            чтобы "Премиум" не переносилось и не создавало ломаный лэйаут. */}
        <h3
          className={cn("font-display leading-[1] tracking-[-0.01em]", p.fg)}
          style={{ fontSize: "clamp(1.6rem, 1.1rem + 1.6vw, 2.25rem)" }}
        >
          {plan.name}
        </h3>
        <p className={cn("mt-2 text-[12px] leading-[1.4]", p.fgMuted)}>{plan.tagline}</p>

        <div className="mt-6 flex items-baseline gap-1.5 min-w-0">
          <span
            className={cn("font-display leading-none tabular tracking-[-0.02em]", p.fg)}
            style={{ fontSize: "clamp(2.25rem, 1.5rem + 3vw, 3.5rem)" }}
          >
            {plan.price === 0 ? "0" : plan.price.toLocaleString("ru-RU")}
          </span>
          <span className={cn("font-mono text-[12px]", p.fgMuted)}>₽{plan.period}</span>
        </div>
        {/* Вторичная метрика — ₽/мин. Главная сравнительная цифра для юзера
            при выборе тарифа: позволяет сразу видеть монотонность скидки. */}
        {plan.pricePerMinute !== null && (
          <p className={cn("mt-1.5 font-mono text-[11px] tabular", p.fgSubtle)}>
            {plan.pricePerMinute.toFixed(2)} ₽ / минута
          </p>
        )}

        <div className="mt-7 flex-1 space-y-5">
          {plan.groups.map((group) => (
            <FeatureGroupBlock
              key={group.title}
              group={group}
              fgSubtle={p.fgSubtle}
              fgMuted={p.fgMuted}
              accent={p.accent}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onSelect}
          disabled={isCurrent || disabled}
          className={cn(
            "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition-colors duration-base",
            isCurrent ? cn(p.ctaDisabled, "cursor-default") : p.ctaBg,
            disabled && !isCurrent && "opacity-60 cursor-wait"
          )}
        >
          {loading ? (
            "Перенаправление…"
          ) : isCurrent ? (
            <>
              <Icon icon={Check} size={14} strokeWidth={2.5} />
              Ваш план
            </>
          ) : (
            <>
              {plan.ctaLabel} <span aria-hidden>→</span>
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}

function FeatureGroupBlock({
  group,
  fgSubtle,
  fgMuted,
  accent,
}: {
  group: FeatureGroup;
  fgSubtle: string;
  fgMuted: string;
  accent: string;
}) {
  return (
    <div>
      <div className={cn("mb-2.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]", fgSubtle)}>
        <Icon icon={group.icon} size={11} />
        {group.title}
      </div>
      <ul className="space-y-2">
        {group.items.map((item) => (
          <li
            key={item.label}
            className={cn("flex items-start gap-2 text-[13px] leading-snug", !item.included && "opacity-45")}
          >
            <span className={cn("mt-[2px] flex-shrink-0", item.included ? accent : fgSubtle)}>
              {item.included ? "✓" : "✕"}
            </span>
            <span className={fgMuted}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqRow({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 md:gap-6 py-6 text-left group"
      >
        <div className="flex items-start gap-3 md:gap-5 flex-1 min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] pt-1.5 flex-shrink-0">
            Q
          </span>
          <span className="font-display text-lg xs:text-xl md:text-2xl leading-[1.2] text-[var(--fg)] text-left break-words">
            {question}
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className={cn(
            "mt-2 flex-shrink-0",
            open ? "text-[var(--accent)]" : "text-[var(--fg-subtle)] group-hover:text-[var(--fg)]"
          )}
        >
          <Icon icon={ChevronDown} size={18} strokeWidth={1.5} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-[1.75rem] md:pl-[3.5rem] pb-6 text-[14px] leading-[1.55] text-[var(--fg-muted)]">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WalletPacksBlock({
  loading,
  disabled,
  onSelect,
  onSelectCustom,
}: {
  loading: string | null;
  disabled: boolean;
  onSelect: (pack: string) => void;
  onSelectCustom: (minutes: number) => void;
}) {
  const [customMinutes, setCustomMinutes] = useState(WALLET_CUSTOM.min * 4); // 120 мин по умолчанию
  const customPrice = customTopupPrice(customMinutes);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between md:gap-10 mb-7">
        <div className="max-w-[52ch]">
          <p className="eyebrow mb-3">Кошелёк</p>
          <h3 className="font-display text-2xl md:text-[28px] leading-[1.1] tracking-[-0.015em] text-[var(--fg)]">
            Нет регулярной нагрузки? <em className="italic text-[var(--accent)]">Докупите минуты</em>
          </h3>
          <p className="mt-3 text-[14px] leading-[1.55] text-[var(--fg-muted)]">
            Разовая оплата без подписки: минуты не сгорают и тратятся после бонуса и
            тарифных. Удобно для разовых задач или когда упёрлись в лимит.{" "}
            <span className="text-[var(--fg)]">Нужно регулярно — подписка выгоднее в&nbsp;2–4&nbsp;раза за минуту.</span>
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {WALLET_PACKS.map((pack) => {
          const perMin = pack.price / pack.minutes;
          return (
            <button
              key={pack.code}
              type="button"
              onClick={() => onSelect(pack.code)}
              disabled={disabled}
              className={cn(
                "group flex flex-col items-start rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-5 text-left transition-colors duration-base hover:border-[var(--accent)]/40 hover:bg-[var(--bg-muted)]",
                disabled && "opacity-60 cursor-wait"
              )}
            >
              <span className="font-display text-3xl leading-none tabular text-[var(--fg)]">
                {pack.minutes}
                <span className="ml-1.5 font-mono text-[12px] text-[var(--fg-muted)]">мин</span>
              </span>
              <span className="mt-3 flex items-baseline gap-1.5">
                <span className="font-sans font-semibold text-xl text-[var(--fg)] tabular">
                  {pack.price.toLocaleString("ru-RU")}
                </span>
                <span className="font-mono text-[12px] text-[var(--fg-muted)]">₽</span>
              </span>
              <span className="mt-1 font-mono text-[11px] tabular text-[var(--fg-subtle)]">
                {perMin.toFixed(2)} ₽ / минута
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] group-hover:text-[var(--accent)] transition-colors">
                {loading === pack.code ? "Перенаправление…" : "Пополнить"}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Слайдер — произвольное число минут */}
      <div className="mt-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            Своё количество
          </p>
          <p className="text-[13px] text-[var(--fg-muted)]">
            <span className="font-display text-2xl tabular text-[var(--fg)]">{customMinutes}</span> мин ·{" "}
            <span className="font-semibold text-[var(--fg)] tabular">{customPrice.toLocaleString("ru-RU")} ₽</span>
            <span className="ml-1.5 font-mono text-[11px] text-[var(--fg-subtle)]">
              ({WALLET_CUSTOM.ratePerMin.toFixed(2)} ₽/мин)
            </span>
          </p>
        </div>
        <input
          type="range"
          min={WALLET_CUSTOM.min}
          max={WALLET_CUSTOM.max}
          step={WALLET_CUSTOM.step}
          value={customMinutes}
          onChange={(e) => setCustomMinutes(Number(e.target.value))}
          disabled={disabled}
          aria-label="Количество минут для докупки"
          className="mt-4 w-full accent-[var(--accent)] cursor-pointer disabled:cursor-wait"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--fg-subtle)] tabular">
          <span>{WALLET_CUSTOM.min} мин</span>
          <span>{WALLET_CUSTOM.max} мин</span>
        </div>
        <button
          type="button"
          onClick={() => onSelectCustom(customMinutes)}
          disabled={disabled}
          className={cn(
            "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-[13px] font-semibold text-[var(--accent-fg)] transition-colors duration-base hover:bg-[var(--accent-hover)]",
            disabled && "opacity-60 cursor-wait"
          )}
        >
          {loading === "custom"
            ? "Перенаправление…"
            : `Докупить ${customMinutes} мин — ${customPrice.toLocaleString("ru-RU")} ₽`}
        </button>
      </div>
    </div>
  );
}

function EnterpriseCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="max-w-[52ch]">
          <p className="eyebrow mb-3">Для команд</p>
          <h3 className="font-display text-2xl md:text-[28px] leading-[1.1] tracking-[-0.015em] text-[var(--fg)]">
            Нужно несколько мест или 200+ часов в месяц?
          </h3>
          <p className="mt-3 text-[14px] leading-[1.55] text-[var(--fg-muted)]">
            Командные тарифы (общий биллинг, shared workspace, роли) — в разработке. Сейчас оформляем несколько
            связанных аккаунтов с единым счётом, закрывающими документами и DPA по 152-ФЗ.
          </p>
        </div>
        <a
          href="mailto:dicto.pro@yandex.ru?subject=Dicto%20%E2%80%94%20%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B0"
          className="btn-accent !py-3.5 !px-6 !text-[14px] whitespace-nowrap self-start md:self-auto"
        >
          Связаться <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}
