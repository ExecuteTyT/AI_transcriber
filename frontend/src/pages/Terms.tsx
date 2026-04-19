import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft } from "lucide-react";
import { Icon } from "@/components/Icon";

export default function Terms() {
  return (
    <div className="min-h-screen bg-surface-50">
      <Helmet>
        <title>Пользовательское соглашение — Scribi</title>
        <meta
          name="description"
          content="Публичная оферта сервиса транскрибации Scribi — условия использования, тарифы, ответственность сторон."
        />
        <link rel="canonical" href="https://dicto.pro/terms" />
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
            Публичная оферта
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Пользовательское соглашение
          </h1>
          <p className="mt-2 text-sm text-gray-500">Редакция от 15 апреля 2026 г.</p>

          <section className="mt-8 space-y-4 text-[15px] leading-relaxed text-gray-800">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">1. Термины</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li><strong>Сервис</strong> — облачный сервис транскрибации, размещённый на <code>dicto.pro</code>.</li>
              <li><strong>Пользователь</strong> — физическое или юридическое лицо, зарегистрировавшее учётную запись.</li>
              <li><strong>Контент</strong> — аудио- и видео-файлы, загружаемые Пользователем.</li>
              <li><strong>Подписка</strong> — платный тариф, предоставляющий расширенный функционал.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">2. Предмет</h2>
            <p>
              Оператор предоставляет Пользователю доступ к сервису автоматической
              транскрибации аудио- и видео-записей в текст с применением технологий
              искусственного интеллекта. Услуга оказывается на условиях, указанных в
              настоящем соглашении и на странице <Link to="/pricing" className="font-semibold text-primary-700 underline">тарифов</Link>.
            </p>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">3. Регистрация и аккаунт</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Регистрация бесплатна, требует актуального email-адреса.</li>
              <li>Пользователь обязан обеспечить конфиденциальность своих учётных данных.</li>
              <li>Один Пользователь вправе иметь один аккаунт (кроме тарифа «Бизнес» — до 5 пользователей).</li>
              <li>Оператор вправе заблокировать аккаунт при нарушении настоящего соглашения.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">4. Права и обязанности Пользователя</h2>
            <p>Пользователь <strong>обязуется</strong>:</p>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Иметь права на загружаемый контент (авторские / смежные / согласие субъектов).</li>
              <li>Не загружать материалы, нарушающие законодательство РФ (экстремизм, детская порнография, персональные данные третьих лиц без согласия и т.д.).</li>
              <li>Не предпринимать попыток обойти ограничения тарифа, взломать Сервис, использовать автоматизированные запросы в промышленных масштабах.</li>
            </ul>
            <p>Пользователь <strong>вправе</strong>:</p>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Использовать результаты транскрибации по своему усмотрению.</li>
              <li>В любой момент отказаться от услуг и удалить свой аккаунт.</li>
              <li>Запрашивать копию своих данных (право на портируемость).</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">5. Права и обязанности Оператора</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Оператор обязуется обеспечить работу Сервиса 24/7 со стандартом доступности 99,0% в месячном выражении.</li>
              <li>Плановые технические работы возможны до 4 часов в месяц — с предварительным уведомлением.</li>
              <li>Оператор вправе отказать в обслуживании при нарушении п. 4 — без возврата средств.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">6. Оплата и возвраты</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Подписка оплачивается через платёжного агента ООО «ЮMoney» (ЮKassa).</li>
              <li>Тариф списывается ежемесячно в день оформления подписки.</li>
              <li>Отмена подписки осуществляется в кабинете Пользователя в любой момент; доступ сохраняется до конца оплаченного периода.</li>
              <li>
                <strong>Возврат средств</strong>: в течение 14 дней с даты первой
                оплаты — без условий, при более длительном пользовании — только
                пропорционально неиспользованным минутам текущего периода.
                Обращение на <a href="mailto:support@dicto.pro" className="font-semibold text-primary-700 underline">support@dicto.pro</a>.
              </li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">7. Интеллектуальная собственность</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Контент, загружаемый Пользователем, остаётся его собственностью.</li>
              <li>Оператор не использует контент для обучения моделей и не передаёт его третьим лицам, кроме указанных в <Link to="/privacy" className="font-semibold text-primary-700 underline">политике конфиденциальности</Link>.</li>
              <li>Исходный код, дизайн и бренд Scribi принадлежат Оператору.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">8. Ответственность</h2>
            <ul className="list-inside list-disc space-y-1.5 pl-1">
              <li>Сервис предоставляется «как есть». Оператор не гарантирует 100% точности автоматической транскрибации.</li>
              <li>Оператор не несёт ответственности за содержание загруженных материалов.</li>
              <li>Совокупный размер ответственности Оператора ограничен суммой оплаты, произведённой Пользователем за последние 3 месяца.</li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">9. Разрешение споров</h2>
            <p>
              Споры разрешаются путём переговоров. При недостижении согласия — в
              судебном порядке по месту нахождения Оператора в соответствии с
              законодательством РФ.
            </p>

            <h2 className="text-xl font-bold tracking-tight text-gray-900">10. Реквизиты Оператора</h2>
            <p>
              ИП Сабирзянов Ислам<br />
              ИНН: [указать]<br />
              Email: <a href="mailto:support@dicto.pro" className="font-semibold text-primary-700 underline">support@dicto.pro</a>
            </p>
          </section>

          <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 text-sm">
            <Link to="/privacy" className="font-semibold text-primary-700 hover:text-primary-600">
              Политика конфиденциальности →
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
