// Единственный источник правды для тарифов на фронте.
// Зеркало backend/app/services/plans.py — при изменении бэка обновить здесь.

export type PlanId = "free" | "start" | "pro" | "expert" | "premium";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceRub: number;
  minutesLimit: number;
  maxFileDurationMin: number;
  aiSummaries: number; // -1 = unlimited
  maxSpeakers: number; // -1 = unlimited
  ragChatLimit: number; // -1 = unlimited, 0 = locked
  actionItems: boolean;
  exportFormats: readonly ("txt" | "srt" | "docx")[];
  maxUsers: number;
  overageRubPerMin: number;
  highlight?: "popular" | "premium";
}

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Попробуйте без риска",
    priceRub: 0,
    // Free: 0 ежемесячных минут — пробные 30 приходят разово из bonus_minutes.
    minutesLimit: 0,
    maxFileDurationMin: 15,
    aiSummaries: 1,
    maxSpeakers: 3,
    ragChatLimit: 0,
    actionItems: false,
    exportFormats: ["txt", "srt"],
    maxUsers: 1,
    overageRubPerMin: 4.0,
  },
  {
    id: "start",
    name: "Старт",
    tagline: "Для подкастеров и фрилансеров",
    priceRub: 500,
    minutesLimit: 600,
    maxFileDurationMin: 120,
    aiSummaries: -1,
    maxSpeakers: 10,
    ragChatLimit: 10,
    actionItems: true,
    exportFormats: ["txt", "srt", "docx"],
    maxUsers: 1,
    overageRubPerMin: 2.0,
  },
  {
    id: "pro",
    name: "Про",
    tagline: "Для журналистов и регулярной работы",
    priceRub: 990,
    minutesLimit: 1800,
    maxFileDurationMin: 180,
    aiSummaries: -1,
    maxSpeakers: -1,
    ragChatLimit: -1,
    actionItems: true,
    exportFormats: ["txt", "srt", "docx"],
    maxUsers: 1,
    overageRubPerMin: 1.5,
    highlight: "popular",
  },
  {
    id: "expert",
    name: "Эксперт",
    tagline: "Для адвокатов и ежедневных митингов",
    priceRub: 1990,
    minutesLimit: 4200,
    maxFileDurationMin: 240,
    aiSummaries: -1,
    maxSpeakers: -1,
    ragChatLimit: -1,
    actionItems: true,
    exportFormats: ["txt", "srt", "docx"],
    maxUsers: 1,
    overageRubPerMin: 0.9,
  },
  {
    id: "premium",
    name: "Премиум",
    tagline: "Для студий и максимальных объёмов",
    priceRub: 3490,
    minutesLimit: 8400,
    maxFileDurationMin: 360,
    aiSummaries: -1,
    maxSpeakers: -1,
    ragChatLimit: -1,
    actionItems: true,
    exportFormats: ["txt", "srt", "docx"],
    maxUsers: 1,
    overageRubPerMin: 0.7,
    highlight: "premium",
  },
] as const;

export const PLANS_BY_ID: Record<PlanId, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.id, p]),
) as Record<PlanId, Plan>;

// Начальная точка для «от X ₽/мес» в hero / meta-тегах.
// Первый платный тариф.
export const STARTING_PRICE_RUB = PLANS.find((p) => p.priceRub > 0)!.priceRub;

export const plansLabels = {
  /** "10 часов" или "2 часа" — для описания лимитов в маркетинге. */
  minutesAsHours(minutes: number): string {
    const hours = Math.round(minutes / 60);
    const mod100 = hours % 100;
    const mod10 = hours % 10;
    if (mod100 >= 11 && mod100 <= 14) return `${hours} часов`;
    if (mod10 === 1) return `${hours} час`;
    if (mod10 >= 2 && mod10 <= 4) return `${hours} часа`;
    return `${hours} часов`;
  },
  /** "2 часа", "3 часа" — для max-file-duration. */
  fileDurationLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} минут`;
    return plansLabels.minutesAsHours(minutes);
  },
};
