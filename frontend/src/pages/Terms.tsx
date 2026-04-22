import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Icon } from "@/components/Icon";
import Seo from "@/components/Seo";

export default function Terms() {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <Seo
        title="Пользовательское соглашение — Dicto"
        description="Публичная оферта сервиса транскрибации Dicto — условия использования, тарифы, ответственность сторон."
        canonical="https://dicto.pro/terms"
      />

      <header
        className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 md:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors touch-target -ml-2 px-2"
          >
            <Icon icon={ChevronLeft} size={14} />
            На главную
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl tracking-[-0.015em] text-[var(--fg)] leading-none"
          >
            <span
              className="dot-accent"
              aria-hidden
            />
            Dicto
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 md:px-6 md:py-14">
        <article className="max-w-none">
          <p className="eyebrow">Публичная оферта</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-[var(--fg)]">
            Пользовательское <em className="italic text-[var(--accent)]">соглашение</em>
          </h1>
          <p className="mt-4 text-[13px] text-[var(--fg-subtle)]">Редакция от 15 апреля 2026 г.</p>

          <section className="mt-10 space-y-5 text-[15px] leading-[1.65] text-[var(--fg-muted)]">
            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">1. Термины</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li><strong className="text-[var(--fg)]">Сервис</strong> — облачный сервис транскрибации, размещённый на <code className="font-mono text-[13px] text-[var(--fg)]">dicto.pro</code>.</li>
              <li><strong className="text-[var(--fg)]">Пользователь</strong> — физическое или юридическое лицо, зарегистрировавшее учётную запись.</li>
              <li><strong className="text-[var(--fg)]">Контент</strong> — аудио- и видео-файлы, загружаемые Пользователем.</li>
              <li><strong className="text-[var(--fg)]">Подписка</strong> — платный тариф, предоставляющий расширенный функционал.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">2. Предмет</h2>
            <p>
              Оператор предоставляет Пользователю доступ к сервису автоматической
              транскрибации аудио- и видео-записей в текст с применением технологий
              искусственного интеллекта. Услуга оказывается на условиях, указанных в
              настоящем соглашении и на странице{" "}
              <Link to="/pricing" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                тарифов
              </Link>.
            </p>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">3. Регистрация и аккаунт</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Регистрация бесплатна, требует актуального email-адреса.</li>
              <li>Пользователь обязан обеспечить конфиденциальность своих учётных данных.</li>
              <li>Один Пользователь вправе иметь один аккаунт (кроме тарифа «Бизнес» — до 5 пользователей).</li>
              <li>Оператор вправе заблокировать аккаунт при нарушении настоящего соглашения.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">4. Права и обязанности Пользователя</h2>
            <p>Пользователь <strong className="text-[var(--fg)]">обязуется</strong>:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Иметь права на загружаемый контент (авторские / смежные / согласие субъектов).</li>
              <li>Не загружать материалы, нарушающие законодательство РФ (экстремизм, детская порнография, персональные данные третьих лиц без согласия и т.д.).</li>
              <li>Не предпринимать попыток обойти ограничения тарифа, взломать Сервис, использовать автоматизированные запросы в промышленных масштабах.</li>
            </ul>
            <p>Пользователь <strong className="text-[var(--fg)]">вправе</strong>:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Использовать результаты транскрибации по своему усмотрению.</li>
              <li>В любой момент отказаться от услуг и удалить свой аккаунт.</li>
              <li>Запрашивать копию своих данных (право на портируемость).</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">5. Права и обязанности Оператора</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Оператор обязуется обеспечить работу Сервиса 24/7 со стандартом доступности 99,0% в месячном выражении.</li>
              <li>Плановые технические работы возможны до 4 часов в месяц — с предварительным уведомлением.</li>
              <li>Оператор вправе отказать в обслуживании при нарушении п. 4 — без возврата средств.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">6. Оплата и возвраты</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Подписка оплачивается через платёжного агента ООО «ЮMoney» (ЮKassa).</li>
              <li>Тариф списывается ежемесячно в день оформления подписки.</li>
              <li>Отмена подписки осуществляется в кабинете Пользователя в любой момент; доступ сохраняется до конца оплаченного периода.</li>
              <li>
                <strong className="text-[var(--fg)]">Возврат средств</strong>: в течение 14 дней с даты первой
                оплаты — без условий, при более длительном пользовании — только
                пропорционально неиспользованным минутам текущего периода.
                Обращение на{" "}
                <a href="mailto:support@dicto.pro" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                  support@dicto.pro
                </a>.
              </li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">7. Интеллектуальная собственность</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Контент, загружаемый Пользователем, остаётся его собственностью.</li>
              <li>
                Оператор не использует контент для обучения моделей и не передаёт его третьим лицам, кроме указанных в{" "}
                <Link to="/privacy" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                  политике конфиденциальности
                </Link>.
              </li>
              <li>Исходный код, дизайн и бренд Dicto принадлежат Оператору.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">8. Ответственность</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Сервис предоставляется «как есть». Оператор не гарантирует 100% точности автоматической транскрибации.</li>
              <li>Оператор не несёт ответственности за содержание загруженных материалов.</li>
              <li>Совокупный размер ответственности Оператора ограничен суммой оплаты, произведённой Пользователем за последние 3 месяца.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">9. Разрешение споров</h2>
            <p>
              Споры разрешаются путём переговоров. При недостижении согласия — в
              судебном порядке по месту нахождения Оператора в соответствии с
              законодательством РФ.
            </p>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">10. Реквизиты Оператора</h2>
            <p>
              ИП Сабирзянов Ислам<br />
              ИНН: [указать]<br />
              Email:{" "}
              <a href="mailto:support@dicto.pro" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                support@dicto.pro
              </a>
            </p>
          </section>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6 font-mono text-[11px] uppercase tracking-[0.18em]">
            <Link to="/privacy" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              Политика конфиденциальности →
            </Link>
            <Link to="/" className="text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors">
              На главную
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
