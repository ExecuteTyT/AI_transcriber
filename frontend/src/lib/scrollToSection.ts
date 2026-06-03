/**
 * Плавный скролл к секции по id с компенсацией высоты fixed-хедера (72px).
 * No-op, если элемента нет (напр. секция есть только на Landing).
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: "smooth" });
}
