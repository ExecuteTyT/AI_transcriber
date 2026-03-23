import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-primary-950 bg-grid flex items-center justify-center relative overflow-hidden">
      {/* Floating glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />

      <div className="relative text-center animate-fade-up">
        {/* Wave bars behind text */}
        <div className="flex items-end justify-center gap-1 h-20 mb-6 opacity-30">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="w-1.5 bg-primary-400 rounded-full animate-wave-bar"
              style={{ animationDelay: `${i * 0.12}s`, height: "100%" }}
            />
          ))}
        </div>

        <div className="text-[160px] font-black text-white/10 leading-none mb-2 select-none">404</div>
        <div className="gradient-text text-6xl font-black -mt-28 mb-8 select-none">404</div>

        <h1 className="text-xl font-semibold text-white mb-2">Страница не найдена</h1>
        <p className="text-primary-200/80 mb-8">Возможно, она была удалена или вы ввели неверный адрес.</p>
        <Link to="/" className="bg-white text-primary-950 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-all duration-200 hover:-translate-y-0.5">
          На главную
        </Link>
      </div>
    </div>
  );
}
