export default function BottomBarSpacer() {
  return (
    <div
      className="md:hidden"
      aria-hidden
      style={{ height: "calc(96px + env(safe-area-inset-bottom))" }}
    />
  );
}
