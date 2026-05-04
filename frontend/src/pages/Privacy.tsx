import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Icon } from "@/components/Icon";
import Seo from "@/components/Seo";

export default function Privacy() {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
      <Seo
        title="Политика конфиденциальности — Dicto"
        description="Политика обработки персональных данных Dicto — соответствие 152-ФЗ, используемые сервисы, права субъекта данных."
        canonical="https://dicto.pro/privacy"
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
          <p className="eyebrow">Юридический документ</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-[var(--fg)]">
            Политика обработки <em className="italic text-[var(--accent)]">персональных данных</em>
          </h1>
          <p className="mt-4 text-[13px] text-[var(--fg-subtle)]">
            Редакция от 1 мая 2026 г. · Применяется с даты регистрации пользователя.
          </p>

          <section className="mt-10 space-y-5 text-[15px] leading-[1.65] text-[var(--fg-muted)]">
            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">1. Общие положения</h2>
            <p>
              Настоящая политика регулирует обработку персональных данных оператором{" "}
              <strong className="text-[var(--fg)]">ИП Сабирзянов Ислам</strong> (далее — «Оператор», «Dicto»,
              «мы») пользователей сервиса транскрибации аудио и видео, размещённого по
              адресу <code className="font-mono text-[13px] text-[var(--fg)]">dicto.pro</code> (далее — «Сервис»).
            </p>
            <p>
              Политика разработана в соответствии с Федеральным законом от 27.07.2006
              № 152-ФЗ «О персональных данных» и определяет порядок обработки,
              хранения и защиты персональных данных.
            </p>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">2. Какие данные мы обрабатываем</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li><strong className="text-[var(--fg)]">Регистрационные:</strong> email, имя, хэш пароля.</li>
              <li><strong className="text-[var(--fg)]">Пользовательский контент:</strong> загружаемые аудио/видео файлы и их текстовая транскрипция.</li>
              <li><strong className="text-[var(--fg)]">Технические:</strong> IP-адрес, User-Agent, cookies сессии, логи активности.</li>
              <li><strong className="text-[var(--fg)]">Платёжные:</strong> через платёжного агента ООО «ЮMoney» (ЮKassa) — мы не храним данные карт.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">3. Цели обработки</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Предоставление функциональности сервиса (транскрибация, AI-анализ, RAG-чат).</li>
              <li>Авторизация и разграничение доступа.</li>
              <li>Тарификация и приём платежей.</li>
              <li>Направление сервисных уведомлений по email.</li>
              <li>Соблюдение требований законодательства РФ.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">4. Правовые основания</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Согласие субъекта (ст. 6 п. 1 подп. 1 152-ФЗ) — чекбокс при регистрации.</li>
              <li>Исполнение договора (ст. 6 п. 1 подп. 5) — публичная оферта.</li>
              <li>Соблюдение закона (ст. 6 п. 1 подп. 2) — налоговая и платёжная отчётность.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">5. Используемые третьи лица и трансграничная передача</h2>
            <p>
              Для целей транскрибации аудио и видео материалы передаются в{" "}
              <strong className="text-[var(--fg)]">Mistral AI SAS</strong> (15 rue des Halles, 75001 Paris,
              Франция) через API. Франция включена в перечень иностранных государств,
              обеспечивающих адекватную защиту персональных данных
              (Приказ РКН от 05.08.2022 № 128). Передача осуществляется на основании
              согласия пользователя и в соответствии со{" "}
              <strong className="text-[var(--fg)]">статьёй 12 Федерального закона № 152-ФЗ</strong>.
            </p>
            <p>
              Со всеми обработчиками заключены договоры обработки данных (DPA) с условием
              «обрабатываемые данные не используются для обучения моделей»:
            </p>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left bg-[var(--bg-elevated)]">
                    <th className="py-3 px-3 font-mono uppercase tracking-[0.12em] text-[11px] text-[var(--fg-subtle)]">Обработчик</th>
                    <th className="py-3 px-3 font-mono uppercase tracking-[0.12em] text-[11px] text-[var(--fg-subtle)]">Страна</th>
                    <th className="py-3 px-3 font-mono uppercase tracking-[0.12em] text-[11px] text-[var(--fg-subtle)]">Что передаётся</th>
                    <th className="py-3 px-3 font-mono uppercase tracking-[0.12em] text-[11px] text-[var(--fg-subtle)]">Цель</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr>
                    <td className="py-3 px-3 text-[var(--fg)]">Mistral AI</td>
                    <td className="py-3 px-3">Франция (ЕС)</td>
                    <td className="py-3 px-3">Аудио-файл, фрагменты текста</td>
                    <td className="py-3 px-3">Транскрибация, векторный поиск</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-[var(--fg)]">Google LLC</td>
                    <td className="py-3 px-3">США</td>
                    <td className="py-3 px-3">Текст транскрипции</td>
                    <td className="py-3 px-3">AI-саммари, чат</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-[var(--fg)]">ООО «Селектел»</td>
                    <td className="py-3 px-3">Россия</td>
                    <td className="py-3 px-3">Файлы, БД</td>
                    <td className="py-3 px-3">Хранение</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-[var(--fg)]">ООО «ЮMoney»</td>
                    <td className="py-3 px-3">Россия</td>
                    <td className="py-3 px-3">Сумма, email</td>
                    <td className="py-3 px-3">Приём платежей</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Передача в США и ЕС осуществляется только с отдельного согласия
              субъекта (ст. 12 152-ФЗ), которое предоставляется чекбоксом при
              регистрации. Все передачи защищены TLS-шифрованием.
            </p>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">6. Сроки хранения</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>
                <strong className="text-[var(--fg)]">Аудио/видео файлы:</strong> по умолчанию 7 дней
                с момента завершения транскрибации; пользователь может изменить от 1 до 30 дней
                или удалить вручную в карточке транскрипции.
              </li>
              <li>
                <strong className="text-[var(--fg)]">Текст транскрипции:</strong> до удаления
                аккаунта или ручного удаления пользователем (срок настраивается в профиле).
              </li>
              <li>
                <strong className="text-[var(--fg)]">Аккаунтные данные</strong> (email, имя): до удаления аккаунта пользователем.
              </li>
              <li>
                <strong className="text-[var(--fg)]">Платёжные данные:</strong> 5 лет (требование 402-ФЗ
                «О бухгалтерском учёте»).
              </li>
              <li>Логи безопасности и журнал согласий — 6 месяцев.</li>
              <li>Резервные копии — до 30 дней после основного удаления.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">7. Права субъекта</h2>
            <p>В соответствии со ст. 14 152-ФЗ вы имеете право:</p>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>Получить информацию об обрабатываемых данных.</li>
              <li>Требовать уточнения, блокировки или уничтожения данных.</li>
              <li>Отозвать согласие в любой момент (удаление аккаунта).</li>
              <li>Обжаловать действия Оператора в Роскомнадзоре.</li>
            </ul>
            <p>
              Обращения направляйте на{" "}
              <a href="mailto:privacy@dicto.pro" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                privacy@dicto.pro
              </a>
              . Срок ответа — не позднее 10 рабочих дней.
            </p>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">8. Меры защиты</h2>
            <ul className="list-disc pl-5 space-y-1.5 marker:text-[var(--fg-subtle)]">
              <li>TLS 1.2+ для всех соединений.</li>
              <li>Хэширование паролей (bcrypt).</li>
              <li>Разграничение доступа по ролям, JWT-токены с TTL.</li>
              <li>Регулярное обновление зависимостей и серверного ПО.</li>
              <li>Журналирование доступа к ПДн.</li>
            </ul>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">9. Порядок удаления данных</h2>
            <p>
              Вы можете в любой момент удалить аккаунт и все связанные данные
              (транскрипции, аудиофайлы, AI-анализы) в разделе{" "}
              <Link to="/profile" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                «Мои данные и конфиденциальность»
              </Link>{" "}
              в личном кабинете. Полное удаление с серверов происходит в течение 24 часов
              после запроса. Резервные копии стираются в течение 30 дней. По всем вопросам
              удаления — пишите на{" "}
              <a href="mailto:privacy@dicto.pro" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                privacy@dicto.pro
              </a>.
            </p>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">10. Контакты оператора</h2>
            <p>
              ИП Сабирзянов Ислам<br />
              ИНН: [указать]<br />
              ОГРНИП: [указать]<br />
              Адрес: [указать]<br />
              Email для запросов по ПДн:{" "}
              <a href="mailto:privacy@dicto.pro" className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-4 decoration-[var(--accent)]/40">
                privacy@dicto.pro
              </a>
              <br />
              Срок ответа на обращения — не позднее 10 рабочих дней.
            </p>

            <h2 className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] mt-8">11. Изменения политики</h2>
            <p>
              Оператор вправе изменить настоящую политику. Актуальная редакция всегда
              доступна по адресу <code className="font-mono text-[13px] text-[var(--fg)]">dicto.pro/privacy</code>. Существенные изменения
              сопровождаются уведомлением на email пользователя за 30 дней.
            </p>

            <p className="mt-12 pt-6 border-t border-[var(--border)] text-[12px] text-[var(--fg-subtle)] font-mono uppercase tracking-[0.18em]">
              Редакция от 01.05.2026
            </p>
          </section>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6 font-mono text-[11px] uppercase tracking-[0.18em]">
            <Link to="/terms" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              Пользовательское соглашение →
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
