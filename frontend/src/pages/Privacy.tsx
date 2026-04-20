import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft } from "lucide-react";
import { Icon } from "@/components/Icon";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-surface-50">
      <Helmet>
        <title>Политика конфиденциальности — Scribi</title>
        <meta
          name="description"
          content="Политика обработки персональных данных Scribi — соответствие 152-ФЗ, используемые сервисы, права субъекта данных."
        />
        <link rel="canonical" href="https://dicto.pro/privacy" />
      </Helmet>

      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <Icon icon={ChevronLeft} size={16} />
            На главную
          </Link>
          <Link to="/" className="text-xl font-bold gradient-text">
            Scribi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <article className="prose prose-gray max-w-none">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-600">
            Юридический документ
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Политика обработки персональных данных
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Редакция от 15 апреля 2026 г. · Применяется с даты регистрации пользователя.
          </p>

          <section className="mt-8 space-y-4 text-[15px] leading-relaxed text-gray-800">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">1. Общие положения</h2>
            <p>
              Настоящая политика регулирует обработку персональных данных оператором
              <strong> ИП Сабирзянов Ислам</strong> (далее — «Оператор», «Scribi»,
              «мы») пользователей сервиса транскрибации аудио и видео, размещённого по
              адресу <code>dicto.pro</code> (далее — «Сервис»).
            </p>
            <p>
              Политика разработана в соответствии с Федеральным законом от 27.07.2006
              № 152-ФЗ «О персональных данных» и определяет порядок обработки,
              хранения и защиты персональных данных.
            </p>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">2. Какие данные мы обрабатываем</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li><strong>Регистрационные:</strong> email, имя, хэш пароля.</li>
              <li><strong>Пользовательский контент:</strong> загружаемые аудио/видео файлы и их текстовая транскрипция.</li>
              <li><strong>Технические:</strong> IP-адрес, User-Agent, cookies сессии, логи активности.</li>
              <li><strong>Платёжные:</strong> через платёжного агента ООО «ЮMoney» (ЮKassa) — мы не храним данные карт.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">3. Цели обработки</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Предоставление функциональности сервиса (транскрибация, AI-анализ, RAG-чат).</li>
              <li>Авторизация и разграничение доступа.</li>
              <li>Тарификация и приём платежей.</li>
              <li>Направление сервисных уведомлений по email.</li>
              <li>Соблюдение требований законодательства РФ.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">4. Правовые основания</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Согласие субъекта (ст. 6 п. 1 подп. 1 152-ФЗ) — чекбокс при регистрации.</li>
              <li>Исполнение договора (ст. 6 п. 1 подп. 5) — публичная оферта.</li>
              <li>Соблюдение закона (ст. 6 п. 1 подп. 2) — налоговая и платёжная отчётность.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">5. Используемые третьи лица и трансграничная передача</h2>
            <p>
              Для предоставления функций AI мы используем следующих обработчиков.
              Со всеми заключены договоры обработки данных (DPA) с условием
              «обрабатываемые данные не используются для обучения моделей»:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-4 font-semibold text-gray-900">Обработчик</th>
                    <th className="py-2 pr-4 font-semibold text-gray-900">Страна</th>
                    <th className="py-2 pr-4 font-semibold text-gray-900">Что передаётся</th>
                    <th className="py-2 font-semibold text-gray-900">Цель</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4">Mistral AI</td>
                    <td className="py-2 pr-4">Франция (ЕС)</td>
                    <td className="py-2 pr-4">Аудио-файл, фрагменты текста</td>
                    <td className="py-2">Транскрибация, векторный поиск</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Google LLC</td>
                    <td className="py-2 pr-4">США</td>
                    <td className="py-2 pr-4">Текст транскрипции</td>
                    <td className="py-2">AI-саммари, чат</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">ООО «Селектел»</td>
                    <td className="py-2 pr-4">Россия</td>
                    <td className="py-2 pr-4">Файлы, БД</td>
                    <td className="py-2">Хранение</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">ООО «ЮMoney»</td>
                    <td className="py-2 pr-4">Россия</td>
                    <td className="py-2 pr-4">Сумма, email</td>
                    <td className="py-2">Приём платежей</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Передача в США и ЕС осуществляется только с отдельного согласия
              субъекта (ст. 12 152-ФЗ), которое предоставляется чекбоксом при
              регистрации. Все передачи защищены TLS-шифрованием.
            </p>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">6. Сроки хранения</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Аккаунт и транскрипции — пока пользователь не удалит.</li>
              <li>Платёжные документы — 5 лет (требование НК РФ).</li>
              <li>Логи безопасности — 6 месяцев.</li>
              <li>Резервные копии — до 30 дней после основного удаления.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">7. Права субъекта</h2>
            <p>В соответствии со ст. 14 152-ФЗ вы имеете право:</p>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Получить информацию об обрабатываемых данных.</li>
              <li>Требовать уточнения, блокировки или уничтожения данных.</li>
              <li>Отозвать согласие в любой момент (удаление аккаунта).</li>
              <li>Обжаловать действия Оператора в Роскомнадзоре.</li>
            </ul>
            <p>
              Обращения направляйте на{" "}
              <a href="mailto:privacy@dicto.pro" className="font-semibold text-primary-700 underline">
                privacy@dicto.pro
              </a>
              . Срок ответа — не позднее 10 рабочих дней.
            </p>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">8. Меры защиты</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>TLS 1.2+ для всех соединений.</li>
              <li>Хэширование паролей (bcrypt).</li>
              <li>Разграничение доступа по ролям, JWT-токены с TTL.</li>
              <li>Регулярное обновление зависимостей и серверного ПО.</li>
              <li>Журналирование доступа к ПДн.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">9. Контакты оператора</h2>
            <p>
              ИП Сабирзянов Ислам<br />
              ИНН: [указать]<br />
              Email:{" "}
              <a href="mailto:privacy@dicto.pro" className="font-semibold text-primary-700 underline">
                privacy@dicto.pro
              </a>
            </p>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">10. Изменения политики</h2>
            <p>
              Оператор вправе изменить настоящую политику. Актуальная редакция всегда
              доступна по адресу <code>dicto.pro/privacy</code>. Существенные изменения
              сопровождаются уведомлением на email пользователя за 30 дней.
            </p>
          </section>

          <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 text-sm">
            <Link to="/terms" className="font-semibold text-primary-700 hover:text-primary-600">
              Пользовательское соглашение →
            </Link>
            <Link to="/" className="text-gray-500 hover:text-gray-900">
              На главную
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
