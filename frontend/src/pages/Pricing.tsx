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
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { paymentsApi } from "@/api/payments";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/states/ErrorState";
import PricingCalculator from "@/components/pricing/PricingCalculator";
import { fadeUp, staggerChildren, springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";

type FeatureGroup = {
  icon: LucideIcon;
  title: string;
  items: { label: string; included: boolean }[];
};

type Plan = {
  id: "free" | "start" | "pro" | "business" | "premium";
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
          { label: "180 мин бонус при регистрации", included: true },
          { label: "180 минут при регистрации (единоразово)", included: true },
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
    price: 500,
    period: "/мес",
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
    price: 820,
    period: "/мес",
    highlight: "popular",
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
    price: 2300,
    period: "/мес",
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "3 600 минут (60 часов)", included: true },
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
  {
    id: "premium",
    name: "Премиум",
    tagline: "Для студий и агентств",
    price: 4600,
    period: "/мес",
    highlight: "premium",
    groups: [
      {
        icon: Clock,
        title: "Минуты",
        items: [
          { label: "7 200 минут (120 часов)", included: true },
          { label: "Файлы до 6 часов", included: true },
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
          { label: "До 10 пользователей", included: true },
        ],
      },
    ],
    ctaLabel: "Оформить Премиум",
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

const PLAN_NAMES: Record<string, string> = { free: "Free", start: "Старт", pro: "Про", business: "Бизнес", premium: "Премиум" };

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
        <motion.header variants={fadeUp} className="max-w-3xl">
          <p className="eyebrow mb-4">Тарифы</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
            Простые <em className="italic text-acid-300">и прозрачные</em>
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

      <motion.div
        variants={fadeUp}
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:items-stretch md:gap-4"
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
        <PricingCalculator />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-px sm:grid-cols-3 border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--border)]">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 bg-[var(--bg-elevated)] p-5"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-acid-300/10 text-acid-300 border border-acid-300/20">
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
              Частые <em className="italic text-acid-300">вопросы</em>
            </h2>
          </div>
          <a
            href="mailto:support@dicto.pro"
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
              Готовы <em className="italic text-acid-300">сэкономить</em> часы?
            </h3>
            <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] mb-8 max-w-[44ch]">
              180 минут на тест при регистрации. Без карты, без подписки на пробный период.
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
      <Helmet>
        <title>Тарифы Dicto — транскрибация от 500 ₽/мес</title>
        <meta
          name="description"
          content="Тарифы Dicto: Free (180 мин при регистрации), Старт (500 ₽/мес, 10 часов), Про (820 ₽/мес, 25 часов), Бизнес (2 300 ₽, 60 часов), Премиум (4 600 ₽, 120 часов). AI-саммари, разметка спикеров, экспорт."
        />
        <link rel="canonical" href="https://dicto.pro/pricing" />
      </Helmet>
      <header
        className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">
            <span className="block w-1.5 h-1.5 rounded-full bg-acid-300 shadow-[0_0_12px_rgba(197,240,20,0.55)]" aria-hidden />
            Dicto
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-[13px] px-3 py-2 rounded-full font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
              Войти
            </Link>
            <Link to="/register" className="btn-accent !py-2.5 !px-5 !text-[13px]">
              Попробовать
            </Link>
          </div>
        </div>
      </header>
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
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-acid-300/10 text-acid-300 border border-acid-300/20">
          <Icon icon={Check} size={18} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--fg)]">
            Текущий план:{" "}
            <span className="font-bold text-acid-300">
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
              : "bg-acid-300"
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

  // Acid-on-ink для популярного плана; ink-серый gradient для премиум; обычный elevated для остальных.
  const cardStyle = isPopular
    ? "bg-acid-300 text-ink-900 border-acid-300"
    : isPremium
    ? "bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 text-[var(--fg)] border-[var(--border-strong)]"
    : "bg-[var(--bg-elevated)] text-[var(--fg)] border-[var(--border)]";

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={springTight}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl p-5 xs:p-6 md:p-7 border",
        cardStyle
      )}
    >
      {isPopular && !isCurrent && (
        <span className="absolute top-5 right-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-900/70">
          Популярный
        </span>
      )}
      {isPremium && !isCurrent && (
        <span className="absolute top-5 right-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-acid-300">
          <Icon icon={Crown} size={10} />
          Премиум
        </span>
      )}
      {isCurrent && (
        <span
          className={cn(
            "absolute top-5 right-5 font-mono text-[10px] uppercase tracking-[0.2em]",
            isPopular ? "text-ink-900" : "text-acid-300"
          )}
        >
          ✓ Текущий
        </span>
      )}

      <div className="relative flex flex-1 flex-col">
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.2em] mb-4",
            isPopular ? "text-ink-900/70" : "text-[var(--fg-subtle)]"
          )}
        >
          /{plan.id}
        </p>
        <h3
          className={cn(
            "font-display text-[28px] xs:text-3xl md:text-4xl leading-none tracking-[-0.01em] break-words",
            isPopular ? "text-ink-900" : "text-[var(--fg)]"
          )}
        >
          {plan.name}
        </h3>
        <p
          className={cn(
            "mt-2 text-[12px]",
            isPopular ? "text-ink-900/70" : "text-[var(--fg-muted)]"
          )}
        >
          {plan.tagline}
        </p>

        <div className="mt-6 flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display text-[44px] xs:text-5xl md:text-6xl leading-none tabular tracking-[-0.02em]",
              isPopular ? "text-ink-900" : "text-[var(--fg)]"
            )}
          >
            {plan.price === 0 ? "0" : plan.price.toLocaleString("ru-RU")}
          </span>
          <span
            className={cn(
              "font-mono text-[12px]",
              isPopular ? "text-ink-900/70" : "text-[var(--fg-muted)]"
            )}
          >
            ₽{plan.period}
          </span>
        </div>

        <div className="mt-7 flex-1 space-y-5">
          {plan.groups.map((group) => (
            <FeatureGroupBlock key={group.title} group={group} popular={isPopular} />
          ))}
        </div>

        <button
          type="button"
          onClick={onSelect}
          disabled={isCurrent || disabled}
          className={cn(
            "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition-colors duration-base",
            isCurrent
              ? isPopular
                ? "bg-ink-900/10 text-ink-900/60 cursor-default"
                : "bg-[var(--border)] text-[var(--fg-subtle)] cursor-default"
              : isPopular
              ? "bg-ink-900 text-acid-300 hover:bg-ink-800"
              : isPremium
              ? "bg-acid-300 text-ink-900 hover:bg-acid-200"
              : "border border-[var(--border-strong)] text-[var(--fg)] hover:bg-[var(--bg-muted)]",
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

function FeatureGroupBlock({ group, popular }: { group: FeatureGroup; popular: boolean }) {
  return (
    <div>
      <div
        className={cn(
          "mb-2.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]",
          popular ? "text-ink-900/65" : "text-[var(--fg-subtle)]"
        )}
      >
        <Icon icon={group.icon} size={11} />
        {group.title}
      </div>
      <ul className="space-y-2">
        {group.items.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex items-start gap-2 text-[13px] leading-snug",
              !item.included && "opacity-45"
            )}
          >
            <span
              className={cn(
                "mt-[2px] flex-shrink-0",
                item.included
                  ? popular
                    ? "text-ink-900"
                    : "text-acid-300"
                  : popular
                  ? "text-ink-900/40"
                  : "text-[var(--fg-subtle)]"
              )}
            >
              {item.included ? "✓" : "✕"}
            </span>
            <span className={cn(popular ? "text-ink-900/85" : "text-[var(--fg-muted)]")}>
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
            open ? "text-acid-300" : "text-[var(--fg-subtle)] group-hover:text-[var(--fg)]"
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
