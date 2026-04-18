import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Crown,
  RefreshCw,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { paymentsApi } from "@/api/payments";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/states/ErrorState";
import { fadeUp, staggerChildren, springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";

type FeatureGroup = {
  icon: LucideIcon;
  title: string;
  items: { label: string; included: boolean }[];
};

type Plan = {
  id: "free" | "start" | "pro" | "business";
  name: string;
  tagline: string;
  price: number;
  period: string;
  highlight?: "popular" | "premium";
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
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "30 минут в месяц", included: true },
          { label: "Файлы до 15 минут", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "5 саммари в месяц", included: true },
          { label: "Разметка до 3 спикеров", included: true },
          { label: "3 RAG-вопроса в месяц", included: true },
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
    price: 390,
    period: "/мес",
    highlight: "popular",
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "360 минут (6 часов)", included: true },
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
        items: [
          { label: "TXT / SRT / DOCX", included: true },
        ],
      },
    ],
    ctaLabel: "Оформить Старт",
  },
  {
    id: "pro",
    name: "Про",
    tagline: "Для бизнеса и продакшена",
    price: 790,
    period: "/мес",
    highlight: "premium",
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "1 500 минут (25 часов)", included: true },
          { label: "Файлы до 3 часов", included: true },
          { label: "Приоритетная обработка", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "Всё без лимита", included: true },
          { label: "Спикеры без ограничений", included: true },
          { label: "RAG-чат безлимит", included: true },
          { label: "Задачи (action items)", included: true },
        ],
      },
      {
        icon: RefreshCw,
        title: "Экспорт",
        items: [
          { label: "TXT / SRT / DOCX", included: true },
        ],
      },
    ],
    ctaLabel: "Оформить Про",
  },
  {
    id: "business",
    name: "Бизнес",
    tagline: "Для команд до 5 человек",
    price: 1990,
    period: "/мес",
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "4 000 минут (66 часов)", included: true },
          { label: "Файлы до 4 часов", included: true },
          { label: "Приоритетная обработка", included: true },
        ],
      },
      {
        icon: Sparkles,
        title: "AI-анализ",
        items: [
          { label: "Всё без лимита", included: true },
          { label: "Спикеры без ограничений", included: true },
          { label: "RAG-чат безлимит", included: true },
          { label: "Задачи (action items)", included: true },
        ],
      },
      {
        icon: RefreshCw,
        title: "Экспорт",
        items: [
          { label: "TXT / SRT / DOCX", included: true },
          { label: "До 5 пользователей", included: true },
        ],
      },
    ],
    ctaLabel: "Оформить Бизнес",
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
        <Link to="/subscription" className="font-semibold text-primary-700 underline underline-offset-2 hover:text-primary-600">
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
    a: "Тариф Про оптимален для команд до 5 человек. Для больших команд и корпоративных внедрений — напишите нам, согласуем индивидуальные условия.",
  },
];

const PLAN_NAMES: Record<string, string> = { free: "Free", start: "Старт", pro: "Про", business: "Бизнес" };

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
      window.location.href = result.confirmation_url;
    } catch (err) {
      const axiosErr = err as { response?: { status?: number }; message?: string };
      if (axiosErr.response?.status === 502 || axiosErr.response?.status === 503) {
        setError("Платёжный сервис временно недоступен. Попробуйте позже.");
      } else if (axiosErr.response?.status === 500) {
        setError("Ошибка сервера. Попробуйте позже.");
      } else {
        setError(axiosErr.message || "Ошибка создания платежа");
      }
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
        <motion.header variants={fadeUp} className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-700 ring-1 ring-primary-100">
            <Icon icon={Sparkles} size={12} />
            Тарифы
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl">
            Простые и прозрачные
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-gray-500">
            Начните бесплатно. Переходите, когда понадобится больше минут.
          </p>
        </motion.header>
      )}

      {!isStandalone && user && <CurrentPlanBar user={user} />}

      {error && (
        <motion.div variants={fadeUp}>
          <ErrorState title="Не удалось создать платёж" description={error} />
        </motion.div>
      )}

      <motion.div
        variants={fadeUp}
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 md:items-stretch md:gap-4"
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

      <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-3">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-2xl border border-gray-200/70 bg-white p-4"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Icon icon={item.icon} size={18} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">{item.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.section variants={fadeUp} className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">Частые вопросы</h2>
          <a
            href="mailto:support@scribi.ai"
            className="text-sm font-semibold text-primary-700 hover:text-primary-600"
          >
            Нужна помощь?
          </a>
        </div>
        <div className="divide-y divide-gray-200/60 overflow-hidden rounded-2xl border border-gray-200/60 bg-white">
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 px-6 py-8 text-center md:px-10 md:py-10">
          <div
            className="pointer-events-none absolute inset-0 bg-grid opacity-20"
            aria-hidden
          />
          <div className="relative">
            <h3 className="text-xl font-extrabold tracking-tight text-white md:text-2xl">
              Готовы сэкономить часы?
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
              15 минут бесплатной транскрибации. Регистрация занимает 30 секунд.
            </p>
            <Link
              to={user ? "/upload" : "/register"}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary-700 shadow-raised hover:bg-surface-50 transition-colors duration-base press"
            >
              <Icon icon={Sparkles} size={14} strokeWidth={2.25} />
              {user ? "Загрузить запись" : "Попробовать бесплатно"}
            </Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );

  if (!isStandalone) return content;

  return (
    <div className="min-h-screen bg-surface-50">
      <Helmet>
        <title>Тарифы Scribi — транскрибация от 290 ₽/мес</title>
        <meta
          name="description"
          content="Тарифы Scribi: Free (15 мин/мес бесплатно), Старт (290 ₽/мес, 5 часов), Про (590 ₽/мес, 20 часов). AI-саммари, разметка спикеров, экспорт."
        />
        <link rel="canonical" href="https://dicto.pro/pricing" />
      </Helmet>
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-bold gradient-text">
            Scribi
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">
              Войти
            </Link>
            <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5">
              Попробовать
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">{content}</div>
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
      className="relative overflow-hidden rounded-2xl border border-primary-100/80 bg-gradient-to-br from-primary-50 via-white to-accent-50/40 p-4 md:p-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glow-sm">
          <Icon icon={Check} size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900">
            Текущий план:{" "}
            <span className="font-bold text-primary-700">
              {PLAN_NAMES[user.plan] || user.plan}
            </span>
          </p>
          <p className="text-xs text-gray-500">
            Использовано{" "}
            <span className="font-semibold tabular text-gray-800">
              {user.minutes_used}
            </span>{" "}
            из{" "}
            <span className="tabular">{user.minutes_limit}</span> мин
          </p>
        </div>
        {low && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            <Icon icon={Zap} size={12} />
            Лимит заканчивается
          </span>
        )}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
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
              : "bg-gradient-to-r from-primary-500 to-accent-400"
          )}
        />
      </div>
    </motion.div>
  );
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
  const isPremium = plan.highlight === "premium";
  const isPopular = plan.highlight === "popular";

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={springTight}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl p-6 md:p-7",
        isPremium
          ? "bg-gradient-to-br from-gray-900 via-dark-100 to-primary-950 text-white shadow-elevated"
          : isPopular
          ? "bg-white shadow-raised ring-2 ring-primary-400/70"
          : "bg-white shadow-card ring-1 ring-gray-200/70"
      )}
    >
      {/* Decorative bg for Pro */}
      {isPremium && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 20% 0%, rgba(99,102,241,0.22) 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, rgba(249,115,22,0.18) 0%, transparent 55%)",
          }}
        />
      )}

      {/* Popular badge */}
      {isPopular && !isCurrent && (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-glow-sm">
          Популярный
        </span>
      )}
      {isCurrent && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
            isPremium
              ? "bg-white text-primary-700 shadow-glow-sm"
              : "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow-sm"
          )}
        >
          Текущий
        </span>
      )}

      <div className="relative flex flex-1 flex-col">
        <header className="flex items-center gap-2">
          <h3
            className={cn(
              "text-lg font-bold tracking-tight md:text-xl",
              isPremium ? "text-white" : "text-gray-900"
            )}
          >
            {plan.name}
          </h3>
          {isPremium && <Icon icon={Crown} size={16} className="text-amber-300" />}
        </header>
        <p
          className={cn(
            "mt-1 text-xs",
            isPremium ? "text-white/70" : "text-gray-500"
          )}
        >
          {plan.tagline}
        </p>

        <div className="mt-5 flex items-baseline gap-1">
          <span
            className={cn(
              "text-4xl font-extrabold tracking-tight tabular md:text-5xl",
              isPremium ? "text-white" : "text-gray-900"
            )}
          >
            {plan.price === 0 ? "0" : plan.price.toLocaleString("ru-RU")}
          </span>
          <span
            className={cn(
              "text-sm font-medium",
              isPremium ? "text-white/70" : "text-gray-500"
            )}
          >
            ₽{plan.period}
          </span>
        </div>

        <div className="mt-6 flex-1 space-y-4">
          {plan.groups.map((group) => (
            <FeatureGroupBlock key={group.title} group={group} premium={isPremium} />
          ))}
        </div>

        <button
          type="button"
          onClick={onSelect}
          disabled={isCurrent || disabled}
          className={cn(
            "mt-7 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-base press",
            isCurrent
              ? isPremium
                ? "bg-white/10 text-white/70 cursor-default"
                : "bg-primary-50 text-primary-600 cursor-default"
              : isPremium
              ? "bg-white text-primary-700 hover:bg-surface-50 shadow-raised"
              : isPopular
              ? "btn-primary !shadow-md"
              : "border-2 border-primary-500 text-primary-700 hover:bg-primary-50",
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
              {plan.ctaLabel}
              {!isPremium && !isPopular && (
                <Icon icon={Sparkles} size={12} strokeWidth={2.25} />
              )}
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}

function FeatureGroupBlock({ group, premium }: { group: FeatureGroup; premium: boolean }) {
  return (
    <div>
      <div
        className={cn(
          "mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]",
          premium ? "text-white/60" : "text-gray-400"
        )}
      >
        <Icon icon={group.icon} size={12} />
        {group.title}
      </div>
      <ul className="space-y-1.5">
        {group.items.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex items-start gap-2 text-[13.5px] leading-snug",
              !item.included && "opacity-50"
            )}
          >
            <span
              className={cn(
                "mt-[3px] flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
                item.included
                  ? premium
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-emerald-50 text-emerald-500"
                  : premium
                  ? "bg-white/5 text-white/40"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              <Icon
                icon={item.included ? Check : X}
                size={10}
                strokeWidth={item.included ? 3 : 2}
              />
            </span>
            <span className={cn(premium ? "text-white/90" : "text-gray-700")}>
              {item.label}
            </span>
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
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-fast hover:bg-surface-50"
      >
        <span className="text-[15px] font-semibold text-gray-900">{question}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-100 text-gray-500"
        >
          <Icon icon={ChevronDown} size={14} strokeWidth={2} />
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
            <div className="px-5 pb-4 text-[14px] leading-relaxed text-gray-600">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
