// Fades a section up the first time it scrolls into view. Nothing moves for
// people who asked for less motion, or when rendered without a browser.
export function reveal(node: HTMLElement, options: { threshold?: number } = {}) {
  if (typeof matchMedia === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return {};
  node.style.opacity = "0";
  node.style.transform = "translateY(24px)";
  node.style.transition = "opacity 620ms cubic-bezier(.23,1,.32,1), transform 620ms cubic-bezier(.23,1,.32,1)";
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        requestAnimationFrame(() => {
          node.style.opacity = "1";
          node.style.transform = "none";
        });
        observer.disconnect();
      }
    },
    { threshold: options.threshold ?? 0.12 },
  );
  observer.observe(node);
  return { destroy: () => observer.disconnect() };
}
