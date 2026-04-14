import { motion } from "framer-motion";
import { Check, UploadCloud, Settings2, Waves, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

export type PipelineStage = "idle" | "uploading" | "processing" | "transcribing" | "analyzing" | "done" | "failed";

interface StepDef {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const STEPS: StepDef[] = [
  { id: "upload", label: "Загрузка", icon: UploadCloud, description: "Файл на сервере" },
  { id: "process", label: "Конвертация", icon: Settings2, description: "Подготовка аудио" },
  { id: "transcribe", label: "Транскрибация", icon: Waves, description: "Распознаём речь" },
  { id: "analyze", label: "AI-анализ", icon: Sparkles, description: "Готовим инсайты" },
];

function stageToIndex(stage: PipelineStage): number {
  switch (stage) {
    case "uploading":
      return 0;
    case "processing":
      return 1;
    case "transcribing":
      return 2;
    case "analyzing":
      return 3;
    case "done":
      return STEPS.length;
    default:
      return -1;
  }
}

interface Props {
  stage: PipelineStage;
  uploadPercent?: number;
  fileName?: string;
}

export function PipelineSteps({ stage, uploadPercent = 0, fileName }: Props) {
  const activeIdx = stageToIndex(stage);

  return (
    <div className="rounded-3xl border border-gray-200/70 bg-white p-5 shadow-raised md:p-6">
      {fileName && (
        <p className="mb-4 truncate text-center text-sm font-medium text-gray-500">{fileName}</p>
      )}
      <ol className="relative flex items-start justify-between gap-1">
        {STEPS.map((step, idx) => {
          const done = idx < activeIdx;
          const active = idx === activeIdx;
          const next = idx === activeIdx + 1 && stage !== "done";

          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="absolute left-[calc(50%+26px)] right-[calc(-50%+26px)] top-5 h-0.5 overflow-hidden rounded-full bg-surface-200"
                >
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: done ? "100%" : active ? "60%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                    className={cn(
                      "block h-full",
                      done
                        ? "bg-gradient-to-r from-primary-500 to-accent-500"
                        : "bg-gradient-to-r from-primary-400/60 to-primary-400/20"
                    )}
                  />
                </div>
              )}

              <motion.div
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{
                  scale: active ? 1.05 : 1,
                  opacity: done || active || next ? 1 : 0.55,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-2xl ring-2 ring-offset-2 ring-offset-white",
                  done
                    ? "bg-gradient-to-br from-primary-500 to-accent-500 text-white ring-primary-200"
                    : active
                    ? "bg-white text-primary-600 ring-primary-300 shadow-glow-sm"
                    : "bg-surface-50 text-gray-400 ring-surface-200"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-2xl bg-primary-200/40 animate-ping" aria-hidden />
                )}
                <span className="relative">
                  {done ? (
                    <Icon icon={Check} size={18} strokeWidth={2.5} />
                  ) : (
                    <Icon icon={step.icon} size={18} strokeWidth={active ? 2.2 : 1.75} />
                  )}
                </span>
              </motion.div>

              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-[12px] font-semibold tracking-tight md:text-sm",
                    done || active ? "text-gray-900" : "text-gray-400"
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px] font-medium md:text-xs",
                    active ? "text-primary-600" : "text-gray-400"
                  )}
                >
                  {active && stage === "uploading"
                    ? `${uploadPercent}%`
                    : step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {stage === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26 }}
          className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700"
        >
          Готово — переходим к результату…
        </motion.div>
      )}
    </div>
  );
}
