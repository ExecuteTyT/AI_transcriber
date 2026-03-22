import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-2">Страница не найдена</p>
        <p className="text-gray-400 mb-8">
          Возможно, она была удалена или вы ввели неверный адрес.
        </p>
        <Link
          to="/"
          className="inline-block bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
