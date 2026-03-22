import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative text-center animate-fade-up">
        <div className="text-[120px] font-extrabold gradient-text leading-none mb-2">404</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Страница не найдена</h1>
        <p className="text-gray-500 mb-8">Возможно, она была удалена или вы ввели неверный адрес.</p>
        <Link to="/" className="btn-primary">На главную</Link>
      </div>
    </div>
  );
}
