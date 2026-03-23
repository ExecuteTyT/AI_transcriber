import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { articles } from "./articles";

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Блог Voitra — статьи о транскрибации, нейросетях и продуктивности</title>
        <meta name="description" content="Полезные статьи и гайды: как транскрибировать аудио, сравнение сервисов и нейросетей, расшифровка Zoom-совещаний, субтитры для YouTube." />
        <link rel="canonical" href="https://voitra.ru/blog" />
      </Helmet>
      {/* Header */}
      <header className="glass border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">Voitra</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Войти</Link>
            <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5">Попробовать</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Блог</p>
          <h1 className="section-heading mb-4">Статьи и гайды</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Транскрибация, нейросети, продуктивность — полезные материалы от команды Voitra
          </p>
        </div>

        <div className="space-y-6">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="card-hover gradient-border block p-6 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="badge bg-primary-50 text-primary-700">{article.category}</span>
                <span className="text-xs text-gray-400">{article.date}</span>
                <span className="text-xs text-gray-400">{article.readTime}</span>
              </div>
              <h2 className="text-xl font-bold group-hover:text-primary-600 transition mb-2">
                {article.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {article.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <span className="font-bold gradient-text">Voitra</span>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-gray-600 transition">Главная</Link>
            <Link to="/pricing" className="hover:text-gray-600 transition">Тарифы</Link>
            <Link to="/register" className="hover:text-gray-600 transition">Регистрация</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
