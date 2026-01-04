// script.js
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Sticky header
  const header = $(".header");
  const syncHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();

  // Mobile nav
  const navToggle = $(".nav-toggle");
  const navMenu = $("#navMenu");

  const setNavOpen = (open) => {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", String(open));
    navMenu.classList.toggle("is-open", open);
  };

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    setNavOpen(!isOpen);
  });

  $$(".nav-link", navMenu || document).forEach((a) => a.addEventListener("click", () => setNavOpen(false)));

  document.addEventListener("click", (e) => {
    if (!navMenu || !navToggle) return;
    if (!navMenu.classList.contains("is-open")) return;
    if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
    setNavOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setNavOpen(false);
  });

  // Reveal on scroll
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Scrollspy
  const spyLinks = $$("[data-scrollspy]");
  const sections = spyLinks.map(a => $(a.getAttribute("href"))).filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const setActive = (id) => {
      spyLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
    };

    const spy = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActive(visible.target.id);
    }, { rootMargin: "-30% 0px -60% 0px", threshold: [0.12, 0.2, 0.35] });

    sections.forEach((sec) => spy.observe(sec));
  }

  // Back to top
  $("[data-back-to-top]")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", "#top");
  });

  // Trailer lazy embed (YouTube ID or Vimeo numeric ID)
  const posterBtn = $("[data-video-poster]");
  const shell = $("[data-video-shell]");

  // Disable trailer poster if no video ID is provided
  if (posterBtn) {
    const id = (posterBtn.getAttribute("data-video-id") || "").trim();
    if (!id) {
      posterBtn.disabled = true;
      posterBtn.style.cursor = "default";
      const titleEl = $(".video-title", posterBtn);
      const subEl = $(".video-sub", posterBtn);
      if (titleEl) titleEl.textContent = "Trailer coming soon";
      if (subEl) subEl.textContent = "Check back for updates";
    }
  }

  const buildEmbed = (id) => {
    const isVimeo = /^[0-9]+$/.test(id);
    const src = isVimeo
      ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&title=0&byline=0&portrait=0`
      : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;

    const iframe = document.createElement("iframe");
    iframe.className = "video-embed";
    iframe.src = src;
    iframe.title = "Trailer video";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    return iframe;
  };

  posterBtn?.addEventListener("click", () => {
    const id = (posterBtn.getAttribute("data-video-id") || "").trim();
    if (!id || !shell) return;
    shell.replaceChildren(buildEmbed(id));
  });

  // Image placeholder handling (headshot + book 2)
  const setImgOrFallback = (img, wrap, fallbackSel, placeholderText) => {
    if (!img || !wrap) return;

    const src = (img.getAttribute("src") || "").trim();
    const fallback = fallbackSel ? $(fallbackSel, wrap) : null;

    const showFallback = () => {
      if (fallback) fallback.style.opacity = "1";
      wrap.classList.remove("has-photo");
      img.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAAAAACw=");
      if (placeholderText && fallback && !fallback.textContent.trim()) fallback.textContent = placeholderText;
    };

    const hideFallback = () => {
      if (fallback) fallback.style.opacity = "0";
      wrap.classList.add("has-photo");
    };

    if (!src || src.includes("{{")) return showFallback();

    img.addEventListener("load", hideFallback, { once: true });
    img.addEventListener("error", showFallback, { once: true });

    if (img.complete && img.naturalWidth > 0) hideFallback();
  };

  setImgOrFallback($(".avatar-img"), $("[data-author-photo-wrap]"), ".avatar-fallback", "");
  setImgOrFallback($("[data-book2-cover]"), $("[data-book2-cover]")?.closest(".bookcard-media"), ".thumb-fallback", "");

  // Hide optional elements if placeholders remain (or values are blank)
  const hideIfBadHref = (el) => {
    if (!el) return;
    const href = (el.getAttribute("href") || "").trim();
    if (!href || href === "#" || href.includes("{{")) el.style.display = "none";
  };

  // Hide media kit button if not provided
  hideIfBadHref($("[data-media-kit]"));

  // Hide any external links (target=_blank) that don't have a real URL (e.g., Book 2, Instagram)
  $$('a[target="_blank"]').forEach(hideIfBadHref);

  const book2Pub = $("[data-book2-pub]");
  if (book2Pub && book2Pub.textContent.includes("{{")) book2Pub.style.display = "none";

  // Subscribe form: prevent submission if no backend hooked up
  const subForm = $("[data-subscribe-form]");
  const subNote = $("[data-subscribe-note]");
  subForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (subNote) subNote.textContent = "Thanks — subscription can be connected to an email service later.";
    subForm.reset();
  });

  // Contact form -> mailto
  const mailtoForm = $("[data-mailto-form]");
  mailtoForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = ($("#name")?.value || "").trim();
    const msg = ($("#message")?.value || "").trim();

    const subject = encodeURIComponent(`Inquiry from ${name || "Website visitor"}`);
    const bodyText = `Name: ${name || "-"}\n\nMessage:\n${msg || "-"}`;
    const body = encodeURIComponent(bodyText);

    const emailLink = document.querySelector('a[href^="mailto:"]')?.getAttribute("href") || "mailto:";
    const to = emailLink.replace(/^mailto:/, "").trim() || "";
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });

  // Footer year
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
