(() => {
  "use strict";
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  const menuCloseButton = menu?.querySelector(".mobile-menu__close");
  const menuLabel = menuButton?.querySelector("[data-menu-label]");
  const menuSrLabel = menuButton?.querySelector(".sr-only");
  const menuBackground = [document.querySelector(".skip-link"), document.querySelector(".preview-notice"), document.querySelector(".site-header__inner"), document.querySelector("main"), document.querySelector(".site-footer")].filter(Boolean);
  const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
  const isMenuOpen = () => menuButton?.getAttribute("aria-expanded") === "true";
  const closeMenu = ({ returnFocus = false } = {}) => {
    if (!menuButton || !menu) return;
    menu.hidden = true; menuButton.setAttribute("aria-expanded", "false");
    if (menuSrLabel) menuSrLabel.textContent = "メニューを開く";
    if (menuLabel) menuLabel.textContent = "MENU";
    document.documentElement.classList.remove("menu-open");
    document.body.classList.remove("menu-open");
    menuBackground.forEach((element) => { element.inert = false; });
    if (returnFocus) menuButton.focus();
  };
  const openMenu = () => {
    if (!menuButton || !menu) return;
    menu.hidden = false; menuButton.setAttribute("aria-expanded", "true");
    if (menuSrLabel) menuSrLabel.textContent = "メニューを閉じる";
    if (menuLabel) menuLabel.textContent = "CLOSE";
    document.documentElement.classList.add("menu-open");
    document.body.classList.add("menu-open");
    menuBackground.forEach((element) => { element.inert = true; });
    menuCloseButton?.focus();
  };
  menuButton?.addEventListener("click", () => { if (isMenuOpen()) closeMenu(); else openMenu(); });
  menuCloseButton?.addEventListener("click", () => closeMenu({ returnFocus: true }));
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
  document.addEventListener("keydown", (event) => {
    if (!isMenuOpen() || !menu || !menuButton) return;
    if (event.key === "Escape") { event.preventDefault(); closeMenu({ returnFocus: true }); return; }
    if (event.key !== "Tab") return;
    const focusable = [...menu.querySelectorAll(focusableSelector)];
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const contactForm = document.querySelector("#contact-form");
  const formStatus = contactForm?.querySelector("[data-form-status]");
  const messageField = contactForm?.querySelector("#contact-message");
  const messageCount = contactForm?.querySelector("[data-message-count]");
  const fields = { name: contactForm?.querySelector("#contact-name"), email: contactForm?.querySelector("#contact-email"), message: messageField };
  const errorMessages = { name: "お名前を入力してください。", email: "有効なメールアドレスを入力してください。", message: "お問い合わせ内容を入力してください。" };
  const setFieldState = (name, isValid) => {
    const field = fields[name]; const error = contactForm?.querySelector(`[data-error-for="${name}"]`);
    if (!field || !error) return isValid;
    field.setAttribute("aria-invalid", String(!isValid)); error.textContent = isValid ? "" : errorMessages[name]; return isValid;
  };
  const validateField = (name) => {
    const field = fields[name]; if (!field) return true;
    const value = field.value.trim(); const isValid = name === "email" ? value !== "" && field.validity.valid : value !== "";
    return setFieldState(name, isValid);
  };
  Object.entries(fields).forEach(([name, field]) => {
    field?.addEventListener("blur", () => validateField(name));
    field?.addEventListener("input", () => { if (field.getAttribute("aria-invalid") === "true") validateField(name); });
  });
  messageField?.addEventListener("input", () => { if (messageCount) messageCount.textContent = `${messageField.value.length} / 2000`; });
  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault(); if (!formStatus) return;
    const validity = Object.keys(fields).map(validateField); formStatus.className = "form-status";
    if (validity.some((isValid) => !isValid)) {
      formStatus.classList.add("is-error"); formStatus.textContent = "入力内容をご確認ください。";
      contactForm.querySelector('[aria-invalid="true"]')?.focus(); return;
    }
    formStatus.classList.add("is-info");
    formStatus.textContent = "現在は確認用フォームです。送信機能は正式な送信環境の確定後に接続します。";
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealSelectors = [".section-heading", ".latest-info__panel > *", ".coffee__main", ".coffee__features article", ".coffee__detail figure", ".beans__intro", ".beans__visuals", ".bean-card", ".sweets__layout > *", ".space__heading > *", ".space__wide", ".space__detail > *", ".culture__layout > *", ".journal__heading > *", ".journal__gallery figure", ".contact__layout > *"];
  const revealTargets = [...document.querySelectorAll(revealSelectors.join(","))];
  revealTargets.forEach((element, index) => { element.dataset.reveal = ""; element.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`); });
  if (!reducedMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("reveal-ready");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (!entry.isIntersecting) return; entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }), { threshold: 0.08, rootMargin: "0px 0px -5%" });
    revealTargets.forEach((element) => observer.observe(element));

    const revealVisibleTargets = () => {
      revealTargets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
        element.classList.add("is-revealed");
        observer.unobserve(element);
      });
    };

    const revealCurrentHash = () => {
      if (!window.location.hash) return;
      document.querySelector(window.location.hash)?.querySelectorAll("[data-reveal]").forEach((element) => {
        element.classList.add("is-revealed");
        observer.unobserve(element);
      });
    };

    revealCurrentHash();
    window.requestAnimationFrame(revealVisibleTargets);
    window.addEventListener("load", revealVisibleTargets, { once: true });
    window.addEventListener("hashchange", revealCurrentHash);
  } else revealTargets.forEach((element) => element.classList.add("is-revealed"));
  const year = document.querySelector("#copyright-year"); if (year) year.textContent = String(new Date().getFullYear());
})();
