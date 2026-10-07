(() => {
  "use strict";

  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  const menuLabel = menuButton?.querySelector("[aria-hidden='true']:not(.menu-toggle__icon)");
  const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

  const backgroundElements = [
    document.querySelector("main"), document.querySelector("footer"),
    document.querySelector(".site-brand"), document.querySelector(".skip-link"),
  ].filter(Boolean);
  const previousInert = new Map();
  if (menuButton && menu) menuButton.hidden = false;

  const isMenuOpen = () => menuButton?.getAttribute("aria-expanded") === "true";

  const closeMenu = ({ returnFocus = false } = {}) => {
    if (!menuButton || !menu) return;
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.querySelector(".sr-only").textContent = "メニューを開く";
    if (menuLabel) menuLabel.textContent = "MENU";
    document.body.classList.remove("menu-open");
    previousInert.forEach((value, element) => { element.inert = value; });
    previousInert.clear();
    if (returnFocus) menuButton.focus();
  };

  const openMenu = () => {
    if (!menuButton || !menu) return;
    menu.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.querySelector(".sr-only").textContent = "メニューを閉じる";
    if (menuLabel) menuLabel.textContent = "CLOSE";
    document.body.classList.add("menu-open");
    backgroundElements.forEach((element) => {
      previousInert.set(element, element.inert);
      element.inert = true;
    });
    menu.querySelector(focusableSelector)?.focus();
  };

  menuButton?.addEventListener("click", () => {
    if (isMenuOpen()) closeMenu();
    else openMenu();
  });

  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu({ returnFocus: true });
      if (!link.hash || link.origin !== location.origin || link.pathname !== location.pathname) return;
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        // Move focus out of the now-hidden menu to the chosen section.
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
          target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
        }
        target.focus({ preventScroll: true });
      }
    });
  });

  // Restore page scrolling if an open mobile menu becomes a desktop header.
  const desktopHeader = window.matchMedia("(min-width: 1100px)");
  desktopHeader.addEventListener("change", (event) => {
    if (!event.matches || !isMenuOpen()) return;
    const focusWasInMenu = menu?.contains(document.activeElement) || document.activeElement === menuButton;
    closeMenu();
    if (focusWasInMenu) document.querySelector(".site-brand")?.focus();
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

  // A continuous filmstrip, progressively enhanced from a native scrollable list.
  // Only the loop copy is duplicated; it is excluded from reading and focus.
  const gallery = document.querySelector(".hero-gallery");
  const viewport = gallery?.querySelector(".hero-gallery__viewport");
  const track = gallery?.querySelector(".hero-gallery__track");
  const group = gallery?.querySelector(".hero-gallery__group");
  const playbackButton = gallery?.querySelector(".hero-gallery__toggle");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (viewport && track && group && playbackButton && typeof track.animate === "function") {
    const loopCopies = [];
    const ensureLoopWidth = () => {
      const groupWidth = group.getBoundingClientRect().width;
      if (!groupWidth) return;
      // Keep a viewport of spare photos beyond every position in a full cycle.
      // Native scrollLeft can then retain the current position when paused.
      const needed = Math.max(1, Math.ceil(viewport.clientWidth / groupWidth));
      while (loopCopies.length < needed) {
        const copy = group.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.inert = true;
        copy.querySelectorAll("img").forEach((img) => {
          img.alt = "";
          img.loading = "lazy";
          img.removeAttribute("fetchpriority");
        });
        loopCopies.push(copy);
        track.append(copy);
      }
    };

    const speed = 24; // CSS pixels per second, at every viewport width.
    let animation = null;
    let userPaused = false;
    let inView = true;
    let distance = group.getBoundingClientRect().width;

    const updateButton = () => {
      const running = Boolean(animation);
      playbackButton.hidden = motionPreference.matches;
      playbackButton.textContent = running ? "PAUSE" : "PLAY";
      playbackButton.setAttribute("aria-label", running ? "写真の自動スクロールを停止" : "写真の自動スクロールを再開");
    };

    const pause = () => {
      if (animation) {
        const position = ((Number(animation.currentTime) || 0) / 1000 * speed) % distance;
        animation.cancel();
        animation = null;
        gallery.classList.remove("is-running");
        viewport.scrollLeft = position;
      }
      updateButton();
    };

    const play = () => {
      if (motionPreference.matches || userPaused || animation) return;
      distance = group.getBoundingClientRect().width;
      if (!distance) return;
      const position = viewport.scrollLeft;
      gallery.classList.add("is-running", "is-looping");
      ensureLoopWidth();
      viewport.scrollLeft = 0;
      animation = track.animate([
        { transform: "translateX(0)" },
        { transform: `translateX(${-distance}px)` },
      ], { duration: distance / speed * 1000, iterations: Infinity, easing: "linear" });
      animation.currentTime = position / speed * 1000;
      if (document.hidden || !inView) animation.pause();
      updateButton();
    };

    playbackButton.addEventListener("click", () => {
      userPaused = Boolean(animation);
      if (userPaused) pause();
      else play();
    });

    // Direct interaction gives control to native touch, wheel and arrow-key scroll.
    const takeControl = () => { userPaused = true; pause(); };
    viewport.addEventListener("focus", takeControl);
    viewport.addEventListener("pointerdown", takeControl, { passive: true });
    viewport.addEventListener("wheel", takeControl, { passive: true });

    motionPreference.addEventListener("change", () => {
      if (motionPreference.matches) {
        pause();
        gallery.classList.remove("is-looping");
        // If the preference hides the active control, retain focus in the gallery.
        if (document.activeElement === playbackButton) viewport.focus();
      } else play();
      updateButton();
    });

    const updateVisibility = () => {
      if (!animation) return;
      if (document.hidden || !inView) animation.pause();
      else animation.play();
    };
    document.addEventListener("visibilitychange", updateVisibility);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        updateVisibility();
      }).observe(viewport);
    }

    // Recalculate the exact loop width after layout changes, without losing pause state.
    if ("ResizeObserver" in window) {
      const loopResize = new ResizeObserver(() => {
        if (gallery.classList.contains("is-looping")) ensureLoopWidth();
        const nextDistance = group.getBoundingClientRect().width;
        if (Math.abs(nextDistance - distance) < 1) return;
        const wasRunning = Boolean(animation);
        pause();
        distance = nextDistance;
        if (wasRunning) play();
      });
      loopResize.observe(group);
      loopResize.observe(viewport);
    }
    play();
    updateButton();
  }

  const emitEvent = (detail) => {
    window.dispatchEvent(new CustomEvent("bashiiin:analytics", { detail }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
    console.info("[Bashiiin analytics contract]", detail);
  };

  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    const fields = ["name", "email", "message"].map((name) => contactForm.elements.namedItem(name));
    const submit = contactForm.querySelector("#contact-submit");
    const status = contactForm.querySelector("#contact-status");
    const widget = contactForm.querySelector("#contact-turnstile");
    const configured = contactForm.dataset.endpointReady === "true" && Boolean(widget.dataset.sitekey.trim());
    let token = "";
    let widgetId = null;
    let pending = false;
    let started = false;
    contactForm.noValidate = true;

    const notify = (state, message, focus = false) => {
      contactForm.dataset.state = state;
      status.textContent = message;
      if (focus) status.focus();
    };
    const updateSubmit = () => { submit.disabled = !configured || !token || pending; };
    const validate = (field) => {
      const error = document.getElementById(`${field.id}-error`);
      let message = "";
      if (!field.value.trim()) message = "この項目を入力してください。";
      else if (field.value.length > field.maxLength) message = `${field.maxLength}文字以内で入力してください。`;
      else if (field.type === "email" && field.validity.typeMismatch) message = "メールアドレスの形式を確認してください。";
      error.textContent = message;
      error.hidden = !message;
      if (message) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
      return !message;
    };
    fields.forEach((field) => {
      field.addEventListener("blur", () => {
        // Reset/focus after success must not validate freshly cleared fields.
        if (!pending && contactForm.dataset.state !== "success") validate(field);
      });
      field.addEventListener("input", () => {
        if (contactForm.dataset.state === "success") {
          notify("initial", "内容をご確認のうえ、送信してください。");
        }
        if (!started) {
          started = true;
          emitEvent({ name: "form_start", placement: "contact" });
        }
        if (field.hasAttribute("aria-invalid")) validate(field);
      });
    });

    const resetToken = () => {
      token = "";
      updateSubmit();
      if (widgetId !== null && window.turnstile) {
        try { window.turnstile.reset(widgetId); } catch { /* Keep sending disabled; never log tokens or form values. */ }
      }
    };
    const verificationFailed = () => {
      token = "";
      updateSubmit();
      if (!pending) notify("error", "送信前の確認が完了していません。確認をやり直すか、ページを再読み込みしてください。");
    };
    if (configured) {
      widget.classList.add("is-configured");
      notify("initial", "送信前の確認を完了してください。");
      const api = document.createElement("script");
      api.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      api.async = true;
      api.addEventListener("error", verificationFailed);
      api.addEventListener("load", () => {
        try {
          window.turnstile.ready(() => {
            try {
              widgetId = window.turnstile.render(widget, {
                sitekey: widget.dataset.sitekey,
                action: "contact",
                theme: "light",
                size: "flexible",
                "response-field": false,
                callback: (responseToken) => {
                  token = responseToken;
                  updateSubmit();
                  if (contactForm.dataset.state === "initial" || contactForm.dataset.state === "error") {
                    notify("initial", "内容をご確認のうえ、送信してください。");
                  }
                },
                "expired-callback": verificationFailed,
                "timeout-callback": verificationFailed,
                "error-callback": verificationFailed,
              });
            } catch { verificationFailed(); }
          });
        } catch { verificationFailed(); }
      });
      document.head.append(api);
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (pending) return;
      const invalid = fields.filter((field) => !validate(field));
      if (invalid.length) {
        notify("error", "入力内容を確認してください。未入力または形式に誤りのある項目があります。");
        invalid[0].focus();
        return;
      }
      if (!configured) {
        notify("error", "現在、このフォームからは送信できません。", true);
        return;
      }
      if (!token) { verificationFailed(); status.focus(); return; }

      // JSON contract for the future Worker. Never persist, log or track these values.
      const payload = {
        name: fields[0].value.trim(),
        email: fields[1].value.trim(),
        message: fields[2].value.trim(),
        turnstileToken: token,
      };
      pending = true;
      updateSubmit();
      fields.forEach((field) => { field.readOnly = true; });
      contactForm.setAttribute("aria-busy", "true");
      submit.textContent = "送信中…";
      notify("sending", "送信中です。しばらくお待ちください。");
      emitEvent({ name: "form_submit", placement: "contact" });
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
          redirect: "error",
        });
        // Static HTML fallback, non-200 responses and malformed JSON must never imply success.
        if (response.status !== 200 || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("contact_failed");
        }
        const result = await response.json();
        if (result?.ok !== true) throw new Error("contact_failed");
        contactForm.reset();
        fields.forEach((field) => {
          field.removeAttribute("aria-invalid");
          const error = document.getElementById(`${field.id}-error`);
          error.textContent = "";
          error.hidden = true;
        });
        notify("success", "お問い合わせを送信しました。", true);
        // A single analytics path; no direct gtag call or form values.
        emitEvent({ name: "generate_lead", placement: "contact" });
      } catch {
        notify("failure", "送信を確認できませんでした。入力内容は保持しています。時間をおいて再度お試しください。", true);
      } finally {
        window.clearTimeout(timeout);
        pending = false;
        fields.forEach((field) => { field.readOnly = false; });
        contactForm.removeAttribute("aria-busy");
        submit.textContent = "送信する";
        resetToken();
      }
    });
    updateSubmit();
  }

  document.querySelectorAll(".tracked-link").forEach((link) => {
    link.addEventListener("click", () => {
      emitEvent({
        name: link.dataset.event,
        placement: link.dataset.placement,
        targetUrl: link.href,
      });
    });
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealGroups = [
    "#latest-info .copy-block, #latest-info .photo-frame",
    "#coffee .photo-frame, #coffee .copy-block",
    "#pudding .copy-block, #pudding .photo-frame",
    "#space .photo-frame, #space .copy-block",
    "#instagram .copy-block, #instagram .instagram__gallery",
  ];
  const revealTargets = revealGroups.flatMap((selector) => [...document.querySelectorAll(selector)]);

  revealTargets.forEach((element, index) => {
    element.dataset.reveal = "";
    element.style.setProperty("--reveal-delay", `${(index % 3) * 90}ms`);
  });

  if (!reducedMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("reveal-ready");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -6%" });

    revealTargets.forEach((element) => revealObserver.observe(element));

    const revealCurrentHash = () => {
      if (!window.location.hash) return;
      const targetSection = document.querySelector(window.location.hash);
      targetSection?.querySelectorAll("[data-reveal]").forEach((element) => {
        element.classList.add("is-revealed");
        revealObserver.unobserve(element);
      });
    };

    const revealVisibleTargets = () => {
      revealTargets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top >= window.innerHeight || rect.bottom <= 0) return;
        element.classList.add("is-revealed");
        revealObserver.unobserve(element);
      });
    };

    revealCurrentHash();
    window.requestAnimationFrame(revealVisibleTargets);
    window.addEventListener("load", revealVisibleTargets, { once: true });
    window.addEventListener("hashchange", revealCurrentHash);
  } else {
    revealTargets.forEach((element) => element.classList.add("is-revealed"));
  }

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
