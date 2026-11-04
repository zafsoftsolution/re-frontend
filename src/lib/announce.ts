/**
 * One shared polite live region for transient status messages ("Added to
 * quote"), instead of an aria-live span inside every button — a table of 50
 * parts would otherwise put 50 live regions on the page.
 */
const ID = "re-live-announcer";

export function announce(message: string): void {
  if (typeof document === "undefined") return;
  let region = document.getElementById(ID);
  const created = !region;
  if (!region) {
    region = document.createElement("div");
    region.id = ID;
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.setAttribute("role", "status");
    region.className = "sr-only";
    document.body.appendChild(region);
  }
  const el = region;
  // Clear first so repeating the same message is announced again; a freshly
  // inserted region needs a moment before screen readers watch it.
  el.textContent = "";
  setTimeout(() => {
    el.textContent = message;
  }, created ? 150 : 50);
}
