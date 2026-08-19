/**
 * Gasworks — immersive interactions (intro, parallax, scroll reveals)
 */
(function () {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("#site-nav");
  const yearEl = document.querySelector("[data-year]");
  const intro = document.querySelector("[data-intro]");
  const introBarFill = intro?.querySelector(".intro__bar-fill");
  const hero = document.querySelector("[data-hero]");
  const heroFloat = document.querySelector("[data-hero-float]");
  const heroShift = document.querySelector("[data-hero-shift]");
  const heroVeil = document.querySelector("[data-hero-veil]");
  const skipLink = document.querySelector(".skip-link");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const enableScroll3d = !reduceMotion && finePointer;
  const introStorageKey = "gasworks-intro-done";

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  let open = false;

  function setNavOpen(next) {
    if (!header || !toggle || !nav) return;
    const was = open;
    open = next;
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    // Focus management: pull focus into the menu on open, restore to the toggle on close.
    if (open && !was) {
      const first = nav.querySelector("a, button");
      if (first) first.focus();
    } else if (!open && was) {
      toggle.focus();
    }
  }

  if (toggle && header && nav) {
    toggle.addEventListener("click", function () {
      setNavOpen(!open);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNavOpen(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) {
        setNavOpen(false);
        return;
      }
      // Trap Tab within the open mobile menu.
      if (e.key === "Tab" && open) {
        const focusables = Array.prototype.slice.call(
          nav.querySelectorAll("a, button")
        );
        if (!focusables.length) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    });
  }

  function onScrollHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ——— Intro ——— */
  function completeIntro(opts) {
    const instant = Boolean(opts && opts.instant);
    if (!intro) {
      document.body.classList.add("intro-done");
      return;
    }
    intro.classList.add("is-hidden");
    intro.setAttribute("aria-hidden", "true");
    document.body.classList.remove("intro-lock");
    document.body.classList.add("intro-done");
    try {
      window.sessionStorage.setItem(introStorageKey, "1");
    } catch (_) {
      /* ignore */
    }
    if (!instant) {
      window.setTimeout(function () {
        intro.style.display = "none";
      }, 900);
    } else {
      intro.style.display = "none";
    }
  }

  function runIntro() {
    if (!intro || reduceMotion) {
      completeIntro({ instant: true });
      return;
    }

    let stored = false;
    try {
      stored = window.sessionStorage.getItem(introStorageKey) === "1";
    } catch (_) {
      stored = false;
    }
    if (stored) {
      completeIntro({ instant: true });
      return;
    }

    document.body.classList.add("intro-lock");
    intro.setAttribute("aria-hidden", "false");

    function dismiss() {
      completeIntro({ instant: false });
    }

    skipLink?.addEventListener("click", function () {
      completeIntro({ instant: true });
    });

    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key === "Escape" && !intro.classList.contains("is-hidden")) dismiss();
      },
      { once: false }
    );

    if (introBarFill) {
      introBarFill.addEventListener(
        "animationend",
        function (e) {
          if (e.animationName === "introForgeProgress" || e.animationName === "introBar") {
            window.setTimeout(dismiss, 480);
          }
        },
        { once: true }
      );
    } else {
      window.setTimeout(dismiss, 2400);
    }
  }

  runIntro();

  if (!reduceMotion) {
    document.documentElement.style.scrollBehavior = "auto";
  }

  /* ——— Smooth in-page navigation + route “pulse” ——— */
  function getNavOffset() {
    return (header ? header.offsetHeight : 72) + 16;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothScrollToTarget(targetY, done) {
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 2) {
      if (done) window.requestAnimationFrame(done);
      return;
    }
    const duration = Math.min(1050, Math.max(480, Math.abs(dist) * 0.42));
    let t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      const t = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, startY + dist * easeOutCubic(t));
      if (t < 1) {
        window.requestAnimationFrame(frame);
      } else if (done) {
        done();
      }
    }
    window.requestAnimationFrame(frame);
  }

  if (!reduceMotion) {
    document.addEventListener(
      "click",
      function (e) {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (!a) return;
        const raw = a.getAttribute("href") || "";
        if (raw.length < 2) return;
        const id = raw.slice(1);
        const el = document.getElementById(id);
        if (!el) return;
        if (a.getAttribute("target") === "_blank") return;
        e.preventDefault();
        document.body.classList.add("is-route-pulse");
        const y = el.getBoundingClientRect().top + window.scrollY - getNavOffset();
        smoothScrollToTarget(y, function () {
          window.setTimeout(function () {
            document.body.classList.remove("is-route-pulse");
          }, 220);
        });
        try {
          history.pushState(null, "", raw);
        } catch (_) {
          /* ignore */
        }
      },
      true
    );
  }

  /* ——— Scroll-synced depth (sections + parallax shells) ——— */
  let depthTick = false;

  function updateDepthScenes() {
    depthTick = false;
    if (reduceMotion) return;
    const vh = window.innerHeight;
    if (enableScroll3d) {
      document.querySelectorAll("[data-depth-scene]").forEach(function (el) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;
        const mid = r.top + r.height * 0.32;
        const n = (mid - vh * 0.5) / (vh * 0.55);
        const rx = Math.max(-2, Math.min(2, n * -1.6));
        const rz = Math.max(-0.35, Math.min(0.35, n * 0.2));
        el.style.setProperty("--scene-rx", rx + "deg");
        el.style.setProperty("--scene-rz", rz + "deg");
      });
      document.querySelectorAll("[data-depth-inner]").forEach(function (el) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40) return;
        const mid = r.top + r.height * 0.22;
        const n = (mid - vh * 0.5) / vh;
        const py = n * -14;
        const pz = Math.abs(n) * 8;
        el.style.setProperty("--parallax-y", py.toFixed(2) + "px");
        el.style.setProperty("--parallax-z", pz.toFixed(1) + "px");
      });
      document.querySelectorAll("[data-depth-blox]").forEach(function (el) {
        const r = el.getBoundingClientRect();
        const midY = r.top + r.height / 2;
        const n = (midY - vh / 2) / vh;
        const py = n * -10;
        const ry = n * -1.5;
        el.style.transform =
          "translate3d(0, " + py.toFixed(1) + "px, 10px) rotateY(" + ry.toFixed(2) + "deg)";
      });
    } else {
      document.querySelectorAll("[data-depth-scene]").forEach(function (el) {
        el.style.setProperty("--scene-rx", "0deg");
        el.style.setProperty("--scene-rz", "0deg");
      });
      document.querySelectorAll("[data-depth-inner]").forEach(function (el) {
        el.style.setProperty("--parallax-y", "0px");
        el.style.setProperty("--parallax-z", "0px");
      });
      document.querySelectorAll("[data-depth-blox]").forEach(function (el) {
        el.style.transform = "";
      });
    }
  }

  function onDepthScroll() {
    if (!depthTick) {
      depthTick = true;
      window.requestAnimationFrame(updateDepthScenes);
    }
  }

  window.addEventListener("scroll", onDepthScroll, { passive: true });
  window.addEventListener("resize", onDepthScroll, { passive: true });
  updateDepthScenes();

  /* ——— Hero parallax + scroll veil ——— */
  let hx = 0;
  let hy = 0;
  let tx = 0;
  let ty = 0;
  let rafHero = 0;

  function renderHeroShift() {
    rafHero = 0;
    if (heroShift) {
      tx += (hx - tx) * 0.06;
      ty += (hy - ty) * 0.06;
      heroShift.style.transform =
        "translate3d(" +
        (tx * 14).toFixed(2) +
        "px," +
        (ty * 12).toFixed(2) +
        "px,0) scale(1.022)";
    }
    if (heroFloat && finePointer && !reduceMotion) {
      const frx = ty * -3.2;
      const fry = tx * 3.8;
      heroFloat.style.transform =
        "perspective(1200px) rotateX(" +
        frx.toFixed(2) +
        "deg) rotateY(" +
        fry.toFixed(2) +
        "deg) translate3d(0,0,14px)";
    }
  }

  function queueHero() {
    if (!rafHero) rafHero = window.requestAnimationFrame(renderHeroShift);
  }

  if (hero && heroShift && !reduceMotion && finePointer) {
    hero.addEventListener(
      "mousemove",
      function (e) {
        const r = hero.getBoundingClientRect();
        hx = (e.clientX - r.left) / r.width - 0.5;
        hy = (e.clientY - r.top) / r.height - 0.5;
        queueHero();
      },
      { passive: true }
    );

    hero.addEventListener(
      "mouseleave",
      function () {
        hx = 0;
        hy = 0;
        if (heroFloat) heroFloat.style.transform = "";
      },
      { passive: true }
    );
  }


  /* ——— Media mill: scroll-driven 3D camera + per-tile video play/pause ——— */
  const mediaMill = document.querySelector("[data-media-mill]");
  const millLattice = document.querySelector("[data-mill-lattice]");
  if (mediaMill && millLattice && hero) {
    let millTick = false;

    function renderMill() {
      millTick = false;
      if (reduceMotion) return;
      const r = hero.getBoundingClientRect();
      const heroH = hero.offsetHeight || window.innerHeight || 1;
      const raw = -r.top / heroH;
      const p = Math.max(0, Math.min(1.15, raw));
      millLattice.style.setProperty("--mill-z", (p * 620).toFixed(1) + "px");
      millLattice.style.setProperty("--mill-shift-y", (p * -56).toFixed(1) + "px");
    }

    function queueMill() {
      if (!millTick) {
        millTick = true;
        window.requestAnimationFrame(renderMill);
      }
    }

    renderMill();
    window.addEventListener("scroll", queueMill, { passive: true });
    window.addEventListener("resize", queueMill, { passive: true });

    if ("IntersectionObserver" in window) {
      const tilesIo = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            const v = entry.target.querySelector("video");
            if (!v) return;
            if (entry.isIntersecting && !reduceMotion) {
              const playPromise = v.play();
              if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(function () {
                  /* autoplay blocked — ignore */
                });
              }
            } else {
              v.pause();
            }
          });
        },
        { threshold: 0 }
      );
      document.querySelectorAll(".media-mill__tile").forEach(function (tile) {
        tilesIo.observe(tile);
      });
    }
  }

  /* ——— Scroll reveals ——— */
  const revealEls = document.querySelectorAll("[data-reveal], .hero__title-line");
  if (revealEls.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ——— Magnetic buttons ——— */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll("[data-magnetic]").forEach(function (wrap) {
      const node = wrap.querySelector(".btn, a");
      if (!node) return;
      wrap.addEventListener(
        "mousemove",
        function (e) {
          const r = wrap.getBoundingClientRect();
          const mx = e.clientX - r.left - r.width / 2;
          const my = e.clientY - r.top - r.height / 2;
          node.style.transform =
            "translate3d(" + (mx * 0.08).toFixed(2) + "px," + (my * 0.08).toFixed(2) + "px,0)";
        },
        { passive: true }
      );
      wrap.addEventListener(
        "mouseleave",
        function () {
          node.style.transform = "";
        },
        { passive: true }
      );
    });
  }

  /* ——— Work tile tilt ——— */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll("[data-tilt]").forEach(function (tile) {
      const link = tile.querySelector(".work-tile__link");
      const media = tile.querySelector(".work-tile__media");
      if (!link) return;

      tile.addEventListener(
        "mousemove",
        function (e) {
          const r = tile.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          const ry = px * -4.2;
          const rx = py * 4.2;
          link.style.transform =
            "perspective(1200px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateZ(3px)";
          if (media) {
            media.style.transform =
              "translate3d(" + px * -5 + "px," + py * -5 + "px,0) scale(1.008)";
          }
          if (media && media.hasAttribute("data-specular")) {
            const pctX = ((e.clientX - r.left) / r.width) * 100;
            const pctY = ((e.clientY - r.top) / r.height) * 100;
            media.style.setProperty("--spec-x", pctX.toFixed(1) + "%");
            media.style.setProperty("--spec-y", pctY.toFixed(1) + "%");
          }
        },
        { passive: true }
      );

      tile.addEventListener(
        "mouseleave",
        function () {
          link.style.transform = "";
          if (media) {
            media.style.transform = "";
            if (media.hasAttribute("data-specular")) {
              media.style.setProperty("--spec-x", "50%");
              media.style.setProperty("--spec-y", "42%");
            }
          }
        },
        { passive: true }
      );
    });
  }

  /* ——— Footer watermark parallax (light) ——— */
  const wm = document.querySelector(".footer__watermark");
  if (wm && !reduceMotion) {
    let wmTick = false;
    window.addEventListener(
      "scroll",
      function () {
        if (wmTick) return;
        wmTick = true;
        window.requestAnimationFrame(function () {
          const r = wm.getBoundingClientRect();
          const c = 1 - Math.min(1, Math.max(0, r.top / window.innerHeight));
          wm.style.transform =
            "translate3d(-50%, " + (c * 8 - 4).toFixed(1) + "px,0)";
          wmTick = false;
        });
      },
      { passive: true }
    );
  }

  /* ——— Pause marquee when off-screen ——— */
  const marqueeRoot = document.querySelector("[data-marquee]");
  const marqueeTrack = marqueeRoot?.querySelector(".work-marquee__track");
  if (marqueeTrack && marqueeRoot && "IntersectionObserver" in window) {
    const mo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          marqueeTrack.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
        });
      },
      { threshold: 0 }
    );
    mo.observe(marqueeRoot);
  }

  const headerTilt = document.querySelector("[data-header-tilt]");
  if (headerTilt && header && finePointer && !reduceMotion) {
    header.addEventListener(
      "mousemove",
      function (e) {
        const r = header.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        headerTilt.style.transform =
          "perspective(800px) rotateX(" +
          (py * -2).toFixed(3) +
          "deg) rotateY(" +
          (px * 2.5).toFixed(3) +
          "deg)";
      },
      { passive: true }
    );
    header.addEventListener(
      "mouseleave",
      function () {
        headerTilt.style.transform = "";
      },
      { passive: true }
    );
  }

  /* ——— Service panels (3D) ——— */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll("[data-tilt-panel]").forEach(function (panel) {
      panel.addEventListener(
        "mousemove",
        function (e) {
          const r = panel.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          panel.style.transform =
            "perspective(1200px) rotateX(" +
            py * -3 +
            "deg) rotateY(" +
            px * 3.5 +
            "deg) translateZ(2px)";
        },
        { passive: true }
      );
      panel.addEventListener(
        "mouseleave",
        function () {
          panel.style.transform = "";
        },
        { passive: true }
      );
    });
  }

  /* ——— Reel frame tilt ——— */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll("[data-reel-frame]").forEach(function (card) {
      card.addEventListener(
        "mousemove",
        function (e) {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            "perspective(1400px) rotateX(" +
            py * -3.2 +
            "deg) rotateY(" +
            px * 3.8 +
            "deg) translateZ(3px)";
        },
        { passive: true }
      );
      card.addEventListener(
        "mouseleave",
        function () {
          card.style.transform = "";
        },
        { passive: true }
      );
    });
  }

  /* ——— Capability lanes: hover switches full-bleed background plate ——— */
  const lanesRoot = document.querySelector("[data-lanes]");
  if (lanesRoot) {
    const laneItems = Array.from(lanesRoot.querySelectorAll("[data-lane]"));
    const lanePlates = Array.from(lanesRoot.querySelectorAll("[data-lane-media]"));
    const lanesMedia = lanesRoot.querySelector("[data-lanes-media]");
    const lanesStage = lanesRoot.querySelector("[data-lanes-stage]") || lanesRoot.querySelector(".lanes");
    const launchRoot = lanesRoot.querySelector("[data-lanes-launch]");
    let activeLane = "spotlights";
    let switchTimer = null;
    let launching = false;

    function syncLaneVideos(laneId) {
      lanesRoot.querySelectorAll("[data-lane-video]").forEach(function (video) {
        const isActive = video.getAttribute("data-lane-video") === laneId;
        if (isActive && !reduceMotion) {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {});
          }
        } else {
          video.pause();
          /* Keep currentTime — resume where the visitor left off until refresh. */
        }
      });
    }

    function setActiveLane(laneId, force) {
      if (!laneId) return;
      if (!force && laneId === activeLane) return;
      activeLane = laneId;

      laneItems.forEach(function (item) {
        const isActive = item.getAttribute("data-lane") === laneId;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      lanePlates.forEach(function (plate) {
        plate.classList.toggle("is-active", plate.getAttribute("data-lane-media") === laneId);
      });

      syncLaneVideos(laneId);

      if (lanesMedia) {
        lanesMedia.classList.add("is-switching");
        if (switchTimer) window.clearTimeout(switchTimer);
        switchTimer = window.setTimeout(function () {
          lanesMedia.classList.remove("is-switching");
        }, 600);
      }
    }

    function launchToPortfolio(item) {
      if (launching) return;
      const href = item.getAttribute("data-portfolio-href");
      const laneId = item.getAttribute("data-lane");
      if (!href || !laneId) return;

      launching = true;
      setActiveLane(laneId, true);
      item.classList.add("is-launching");
      if (lanesStage) lanesStage.classList.add("is-portfolio-launch");

      if (launchRoot) {
        launchRoot.style.setProperty("--lane-glow", getComputedStyle(item).getPropertyValue("--lane-glow"));
        launchRoot.style.setProperty("--lane-glow-soft", getComputedStyle(item).getPropertyValue("--lane-glow-soft"));
        launchRoot.classList.add("is-active");
        launchRoot.setAttribute("aria-hidden", "false");
      }

      const delayMs = reduceMotion ? 0 : 480;
      window.setTimeout(function () {
        window.location.href = href;
      }, delayMs);
    }

    laneItems.forEach(function (item) {
      const laneId = item.getAttribute("data-lane");
      if (!laneId) return;

      item.addEventListener("mouseenter", function () {
        if (!launching) setActiveLane(laneId);
      });

      item.addEventListener("focus", function () {
        if (!launching) setActiveLane(laneId);
      });

      item.addEventListener("click", function () {
        launchToPortfolio(item);
      });
    });

    lanesRoot.addEventListener("keydown", function (e) {
      const idx = laneItems.findIndex(function (item) {
        return item.getAttribute("data-lane") === activeLane;
      });
      if (idx < 0) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        launchToPortfolio(laneItems[idx]);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = laneItems[(idx + 1) % laneItems.length];
        next.focus();
        setActiveLane(next.getAttribute("data-lane"));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = laneItems[(idx - 1 + laneItems.length) % laneItems.length];
        prev.focus();
        setActiveLane(prev.getAttribute("data-lane"));
      }
    });

    setActiveLane(activeLane, true);
  }

  /* ——— Portfolio page: category tabs + horizontal slide ——— */
  const portfolioRoot = document.querySelector("[data-portfolio-root]");
  if (portfolioRoot) {
    const tabs = Array.from(document.querySelectorAll("[data-portfolio-cat]"));
    const panels = Array.from(document.querySelectorAll("[data-portfolio-panel]"));
    const track = document.querySelector("[data-portfolio-track]");
    const indicator = document.querySelector("[data-portfolio-indicator]");
    const cats = ["spotlights", "narratives", "immersions"];
    let activeCat = "spotlights";

    function readCatFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("cat");
      if (cat && cats.includes(cat)) return cat;
      return "spotlights";
    }

    function positionIndicator(btn) {
      if (!indicator || !btn) return;
      indicator.style.width = btn.offsetWidth + "px";
      indicator.style.left = btn.offsetLeft + "px";
    }

    const hoverMediaBlocks = Array.from(portfolioRoot.querySelectorAll("[data-portfolio-hover]"));
    let activePreviewBlock = null;

    function stopPortfolioPreview(block) {
      if (!block) return;
      const video = block.querySelector(".portfolio-card__video");
      if (block._previewAbort) {
        block._previewAbort.abort();
        block._previewAbort = null;
      }
      block.classList.remove("is-previewing", "is-video-ready");
      if (video) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch (err) {
          /* ignore seek errors while metadata loads */
        }
      }
      if (activePreviewBlock === block) activePreviewBlock = null;
    }

    function stopAllPortfolioPreviews() {
      hoverMediaBlocks.forEach(stopPortfolioPreview);
    }

    hoverMediaBlocks.forEach(function (block) {
      const posterSrc = block.getAttribute("data-poster");
      const videoSrc = block.getAttribute("data-video");
      if (!posterSrc && !videoSrc) return;

      const poster = document.createElement("img");
      poster.className = "portfolio-card__poster";
      poster.alt = "";
      poster.decoding = "async";
      poster.loading = "lazy";
      if (posterSrc) poster.src = posterSrc;
      poster.addEventListener("error", function () {
        poster.classList.add("is-missing");
      });
      block.appendChild(poster);

      const video = document.createElement("video");
      video.className = "portfolio-card__video";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-hidden", "true");
      if (videoSrc) video.src = videoSrc;
      block.appendChild(video);

      function revealVideo() {
        if (activePreviewBlock !== block) return;
        block.classList.add("is-video-ready");
      }

      function startPreview() {
        if (reduceMotion || !videoSrc) return;
        if (activePreviewBlock && activePreviewBlock !== block) {
          stopPortfolioPreview(activePreviewBlock);
        }
        activePreviewBlock = block;
        block.classList.add("is-previewing");
        block.classList.remove("is-video-ready");

        if (block._previewAbort) block._previewAbort.abort();
        const abort = new AbortController();
        block._previewAbort = abort;
        const signal = abort.signal;

        function attemptPlay() {
          if (signal.aborted || activePreviewBlock !== block) return;
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
              if (!signal.aborted) stopPortfolioPreview(block);
            });
          }
        }

        video.addEventListener(
          "playing",
          function () {
            revealVideo();
          },
          { signal, once: true }
        );

        if (video.readyState >= 2) {
          attemptPlay();
        } else {
          video.addEventListener(
            "loadeddata",
            function () {
              attemptPlay();
            },
            { signal, once: true }
          );
          if (video.readyState === 0) video.load();
        }
      }

      block.addEventListener("pointerenter", startPreview);
      block.addEventListener("pointerleave", function () {
        stopPortfolioPreview(block);
      });
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAllPortfolioPreviews();
    });

    function setPortfolioCat(cat, updateUrl) {
      stopAllPortfolioPreviews();
      if (!cats.includes(cat)) cat = "spotlights";
      activeCat = cat;
      const idx = cats.indexOf(cat);

      tabs.forEach(function (tab) {
        const isActive = tab.getAttribute("data-portfolio-cat") === cat;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
        tab.tabIndex = isActive ? 0 : -1;
      });

      panels.forEach(function (panel) {
        const isActive = panel.getAttribute("data-portfolio-panel") === cat;
        panel.classList.toggle("is-active", isActive);
        panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      });

      if (track) {
        track.style.transform = "translate3d(-" + idx * 33.333 + "%, 0, 0)";
      }

      const activeTab = tabs.find(function (t) {
        return t.getAttribute("data-portfolio-cat") === cat;
      });
      positionIndicator(activeTab);

      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set("cat", cat);
        window.history.replaceState({}, "", url);
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        setPortfolioCat(tab.getAttribute("data-portfolio-cat"), true);
      });
      tab.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setPortfolioCat(cats[(i + 1) % cats.length], true);
          tabs[(i + 1) % cats.length].focus();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPortfolioCat(cats[(i - 1 + cats.length) % cats.length], true);
          tabs[(i - 1 + cats.length) % cats.length].focus();
        }
      });
    });

    window.addEventListener("resize", function () {
      const activeTab = tabs.find(function (t) {
        return t.getAttribute("data-portfolio-cat") === activeCat;
      });
      positionIndicator(activeTab);
    });

    setPortfolioCat(readCatFromUrl(), false);
    window.requestAnimationFrame(function () {
      const activeTab = tabs.find(function (t) {
        return t.getAttribute("data-portfolio-cat") === activeCat;
      });
      positionIndicator(activeTab);
    });
  }

  /* ——— Project inquiry — hands off to the visitor's email client (no silent loss) ——— */
  const inquiryRoot = document.querySelector("[data-inquiry-root]");
  const inquiryForm = document.querySelector("[data-inquiry-form]");
  const inquirySuccess = document.querySelector("[data-inquiry-success]");
  const INQUIRY_TO = "jack@wileyworx.com";
  if (inquiryForm && inquiryRoot && inquirySuccess) {
    inquiryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!inquiryForm.reportValidity()) return;
      const submitBtn = inquiryForm.querySelector(".inquiry-form__submit");
      const val = function (name) {
        const el = inquiryForm.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : "";
      };
      const name = val("name");
      const subject = "Project inquiry" + (name ? " — " + name : "");
      const lines = [
        "Name: " + name,
        "Email: " + val("email"),
        "Phone: " + val("phone"),
        "Website: " + (val("website") || "—"),
        "Project type: " + (val("project_type") || "—"),
        "",
        "Message:",
        val("project_brief"),
      ];
      const mailto =
        "mailto:" +
        INQUIRY_TO +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(lines.join("\n"));

      if (submitBtn) submitBtn.disabled = true;
      const delayMs = reduceMotion ? 0 : 480;
      window.setTimeout(function () {
        inquiryForm.hidden = true;
        inquirySuccess.hidden = false;
        inquiryRoot.classList.add("is-complete");
        inquirySuccess.focus();
        if (submitBtn) submitBtn.disabled = false;
        // Open the visitor's email client with the inquiry pre-filled.
        window.location.href = mailto;
      }, delayMs);
    });
  }

  /* ——— Contractor roster — posts to a spreadsheet endpoint when set; otherwise email ——— */
  const rosterRoot = document.querySelector("[data-roster-root]");
  const rosterForm = document.querySelector("[data-roster-form]");
  const rosterSuccess = document.querySelector("[data-roster-success]");
  const ROSTER_TO = "jack@wileyworx.com";
  if (rosterForm && rosterRoot && rosterSuccess) {
    rosterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!rosterForm.reportValidity()) return;

      const company = rosterForm.querySelector('[name="company"]');
      if (company && company.value.trim()) return;

      const val = function (name) {
        const el = rosterForm.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : "";
      };
      const roles = Array.from(rosterForm.querySelectorAll('input[name="roles"]:checked')).map(function (el) {
        return el.value;
      });
      const rolesOther = val("roles_other");
      if (!roles.length && !rolesOther) {
        const other = rosterForm.querySelector('[name="roles_other"]');
        if (other) {
          other.setCustomValidity("Pick at least one role, or describe what you do.");
          other.reportValidity();
          other.setCustomValidity("");
        }
        return;
      }

      const payload = {
        timestamp: new Date().toISOString(),
        name: val("name"),
        email: val("email"),
        phone: val("phone"),
        location: val("location"),
        roles: roles.join(", "),
        roles_other: rolesOther,
        bio: val("bio"),
        reel_url: val("reel_url"),
        website: val("website"),
        instagram: val("instagram"),
        availability: val("availability"),
        day_rate: val("day_rate"),
        notes: val("notes"),
      };

      const submitBtn = rosterForm.querySelector(".inquiry-form__submit");
      if (submitBtn) submitBtn.disabled = true;

      const finish = function (openMail) {
        rosterForm.hidden = true;
        rosterSuccess.hidden = false;
        rosterRoot.classList.add("is-complete");
        rosterSuccess.focus();
        if (submitBtn) submitBtn.disabled = false;
        if (openMail) window.location.href = openMail;
      };

      const subject = "Contractor roster" + (payload.name ? " — " + payload.name : "");
      const lines = [
        "Name: " + payload.name,
        "Email: " + payload.email,
        "Phone: " + payload.phone,
        "Location: " + payload.location,
        "Roles: " + (payload.roles || "—"),
        "Other: " + (payload.roles_other || "—"),
        "Availability: " + payload.availability,
        "Day rate: " + (payload.day_rate || "—"),
        "Reel: " + payload.reel_url,
        "Website: " + (payload.website || "—"),
        "Instagram: " + (payload.instagram || "—"),
        "",
        "About:",
        payload.bio,
        "",
        "Notes:",
        payload.notes || "—",
      ];
      const mailto =
        "mailto:" +
        ROSTER_TO +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(lines.join("\n"));

      const endpoint = (rosterRoot.getAttribute("data-roster-endpoint") || "").trim();
      const delayMs = reduceMotion ? 0 : 420;

      if (!endpoint) {
        window.setTimeout(function () {
          finish(mailto);
        }, delayMs);
        return;
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("roster-post-failed");
        })
        .then(function () {
          window.setTimeout(function () {
            finish(null);
          }, delayMs);
        })
        .catch(function () {
          window.setTimeout(function () {
            finish(mailto);
          }, delayMs);
        });
    });
  }
})();
