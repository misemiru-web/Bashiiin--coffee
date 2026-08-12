(() => {
  "use strict";

  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  const menuLabel = menuButton?.querySelector("[aria-hidden='true']");
  const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

  const isMenuOpen = () => menuButton?.getAttribute("aria-expanded") === "true";

  const closeMenu = ({ returnFocus = false } = {}) => {
    if (!menuButton || !menu) return;
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.querySelector(".sr-only").textContent = "メニューを開く";
    if (menuLabel) menuLabel.textContent = "MENU";
    document.body.classList.remove("menu-open");
    if (returnFocus) menuButton.focus();
  };

  const openMenu = () => {
    if (!menuButton || !menu) return;
    menu.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.querySelector(".sr-only").textContent = "メニューを閉じる";
    if (menuLabel) menuLabel.textContent = "CLOSE";
    document.body.classList.add("menu-open");
    menu.querySelector(focusableSelector)?.focus();
  };

  menuButton?.addEventListener("click", () => {
    if (isMenuOpen()) closeMenu();
    else openMenu();
  });

  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("keydown", (event) => {
    if (!isMenuOpen() || !menu || !menuButton) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ returnFocus: true });
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = [menuButton, ...menu.querySelectorAll(focusableSelector)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const emitEvent = (detail) => {
    window.dispatchEvent(new CustomEvent("bashiiin:analytics", { detail }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
    console.info("[Bashiiin analytics contract]", detail);
  };

  document.querySelectorAll(".tracked-link").forEach((link) => {
    link.addEventListener("click", () => {
      emitEvent({
        name: link.dataset.event,
        placement: link.dataset.placement,
        targetUrl: link.href,
      });
    });
  });

  if ("IntersectionObserver" in window) {
    const viewed = new WeakSet();
    const timers = new WeakMap();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (viewed.has(entry.target)) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          const timer = window.setTimeout(() => {
            viewed.add(entry.target);
            observer.unobserve(entry.target);
            emitEvent({ name: "section_view", placement: "section", sectionId: entry.target.id });
          }, 1000);
          timers.set(entry.target, timer);
        } else {
          window.clearTimeout(timers.get(entry.target));
        }
      });
    }, { threshold: [0.25] });

    document.querySelectorAll(".tracked-section").forEach((section) => observer.observe(section));
  }

  const year = document.querySelector("#copyright-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
