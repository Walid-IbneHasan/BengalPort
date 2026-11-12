// Brings a message into sight when it appears or changes, for example a
// form's error next to its button at the foot of a long form.
export function intoView(node: HTMLElement, _message?: unknown) {
  const show = () => {
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
  };
  requestAnimationFrame(show);
  return { update: () => requestAnimationFrame(show) };
}
