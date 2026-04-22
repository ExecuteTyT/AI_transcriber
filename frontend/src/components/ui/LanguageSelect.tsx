import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/cn";

// Language code → ISO 3166-1 alpha-2 страны для flagcdn.com.
// Там, где язык совпадает со страной (ru, de, fr…), код тот же.
// Для мультистрановых (en/zh/ar…) — самый распространённый маркер.
const FLAG_COUNTRY: Record<string, string> = {
  ru: "ru",
  en: "gb",
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
  pt: "pt",
  nl: "nl",
  pl: "pl",
  uk: "ua",
  tr: "tr",
  zh: "cn",
  ja: "jp",
  ko: "kr",
  ar: "sa",
};

function FlagIcon({ code }: { code: string }) {
  const country = FLAG_COUNTRY[code];
  if (!country) {
    // auto → глобус как SVG, emoji 🌐 тоже рендерится везде, но держим единую графику.
    return (
      <span
        className="flex-shrink-0 flex h-4 w-6 items-center justify-center rounded-sm text-[var(--fg-muted)]"
        aria-hidden
      >
        <Icon icon={Globe} size={14} strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/24x18/${country}.png`}
      srcSet={`https://flagcdn.com/48x36/${country}.png 2x`}
      width={24}
      height={18}
      alt=""
      loading="lazy"
      className="flex-shrink-0 h-[18px] w-6 rounded-sm object-cover"
      aria-hidden
    />
  );
}

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  buttonClassName?: string;
  label?: string;
}

export function LanguageSelect({
  value,
  onChange,
  className,
  buttonClassName,
  label,
}: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ?? "Выбрать язык"}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-[14px] font-medium transition-colors",
          "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg)] hover:border-[var(--border-strong)]",
          buttonClassName
        )}
      >
        <FlagIcon code={current.code} />
        <span className="flex-1 text-left truncate">{current.label}</span>
        <Icon
          icon={ChevronDown}
          size={16}
          strokeWidth={1.75}
          className={cn(
            "text-[var(--fg-subtle)] transition-transform duration-fast",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.25, 1, 0.5, 1] }}
            className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] py-1.5 shadow-floating"
          >
            {LANGUAGES.map((lang) => {
              const selected = lang.code === value;
              return (
                <li key={lang.code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(lang.code);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] transition-colors",
                      selected
                        ? "text-[var(--fg)]"
                        : "text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)]"
                    )}
                    style={
                      selected
                        ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                        : undefined
                    }
                  >
                    <FlagIcon code={lang.code} />
                    <span className="flex-1 truncate">{lang.label}</span>
                    {selected && (
                      <Icon
                        icon={Check}
                        size={15}
                        strokeWidth={2}
                        className="flex-shrink-0"
                        style={{ color: "var(--accent)" }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
