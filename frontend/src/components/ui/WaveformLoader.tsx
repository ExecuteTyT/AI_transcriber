interface Props {
  /** px высота всего loader-а. Дефолт 20. */
  size?: number;
  /** aria-label, если скринридер должен озвучить состояние. */
  label?: string;
  className?: string;
}

/**
 * 5-барный loader: имитация эквалайзера, брендовая замена spinner-у.
 * Для пользователей с prefers-reduced-motion — static "..." tri-dot.
 */
export default function WaveformLoader({ size = 20, label = "Загрузка", className = "" }: Props) {
  const bars = [0.35, 0.7, 1, 0.7, 0.35];
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-flex items-end gap-[2px] ${className}`}
      style={{ height: size }}
    >
      {bars.map((base, i) => (
        <span
          key={i}
          className="hero-eq-bar rounded-full bg-acid-300"
          style={{
            width: 2,
            height: `${base * 100}%`,
            animationDelay: `${i * 0.12}s`,
            animationDuration: `${0.9 + (i % 3) * 0.25}s`,
          }}
        />
      ))}
    </span>
  );
}
