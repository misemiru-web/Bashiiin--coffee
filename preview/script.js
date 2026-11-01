(() => {
  "use strict";

  const initNavigation = () => {
    const header = document.querySelector(".site-header--formal");
    const menuButton = document.querySelector(".menu-toggle");
    const menu = document.querySelector("#mobile-menu");
    const accessibleLabel = menuButton?.querySelector(".sr-only");
    if (!header || !menuButton || !menu || !accessibleLabel) return;
    const menuLabel = menuButton?.querySelector("[aria-hidden='true']:not(.menu-toggle__icon)");
    const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

    const backgroundElements = [
      document.querySelector("main"), document.querySelector("footer"),
      document.querySelector(".site-brand"), document.querySelector(".skip-link"),
    ].filter(Boolean);
    const previousInert = new Map();

    const isMenuOpen = () => menuButton?.getAttribute("aria-expanded") === "true";

    const closeMenu = ({ returnFocus = false } = {}) => {
      if (!menuButton || !menu) return;
      menu.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
      accessibleLabel.textContent = "メニューを開く";
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
      accessibleLabel.textContent = "メニューを閉じる";
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

    // Hide the static links only after every navigation handler is registered.
    menu.hidden = true;
    header.classList.add("nav-ready");
    menuButton.hidden = false;
  };

  const initHeroGallery = () => {
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
  };

  const emitEvent = (detail) => {
    window.dispatchEvent(new CustomEvent("bashiiin:analytics", { detail }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
    console.info("[Bashiiin analytics contract]", detail);
  };

  const initContactForm = () => {
    // Static GitHub Pages preview only. No SDK, POST or lead-success path.
    const form = document.querySelector("#contact-form");
    if (!form) return;
    const submit = form.querySelector("#contact-submit");
    if (submit) submit.disabled = true;
    form.dataset.endpointReady = "false";
    form.addEventListener("submit", event => { event.preventDefault(); });
  };

  // Each feature can fail independently without hiding the static navigation.
  for (const initialize of [initNavigation, initHeroGallery, initContactForm]) {
    try { initialize(); } catch { /* Keep the HTML fallback available. */ }
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
