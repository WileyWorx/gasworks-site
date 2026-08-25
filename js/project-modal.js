/**
 * Media mill project modals: open in-page, deep-link #work/<slug>, never leave the site.
 */
(function () {
  "use strict";

  var projects = window.GASWORKS_PROJECTS || [];
  if (!projects.length) return;

  var bySlug = {};
  projects.forEach(function (p) {
    bySlug[p.slug] = p;
  });

  var root = document.querySelector("[data-project-modal]");
  if (!root) return;

  var dialog = root.querySelector("[data-project-dialog]");
  var backdrop = root.querySelector("[data-project-backdrop]");
  var closeBtn = root.querySelector("[data-project-close]");
  var mediaMount = root.querySelector("[data-project-media]");
  var titleEl = root.querySelector("[data-project-title]");
  var metaEl = root.querySelector("[data-project-meta]");
  var roleEl = root.querySelector("[data-project-role]");
  var agencyEl = root.querySelector("[data-project-agency]");
  var summaryEl = root.querySelector("[data-project-summary]");
  var creditsEl = root.querySelector("[data-project-credits]");

  var open = false;
  var activeSlug = null;
  var lastTrigger = null;
  var lockedScrollY = 0;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function displayTitle(project) {
    if (!project) return "Project";
    if (project.title && project.title !== "TODO") return project.title;
    return "Project";
  }

  function displayOrHide(el, value) {
    if (!el) return;
    if (!value || value === "TODO") {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = value;
  }

  function pauseSiteMedia() {
    document.querySelectorAll(".media-mill__tile video, [data-lane-video]").forEach(function (video) {
      try {
        video.pause();
      } catch (err) {
        /* ignore */
      }
    });
  }

  function resumeMillMedia() {
    if (typeof window.GASWORKS_SYNC_MILL === "function") {
      window.GASWORKS_SYNC_MILL();
      return;
    }
    if (reduceMotion) return;
    if (!document.querySelector("[data-media-mill]")) return;
    document.querySelectorAll(".media-mill__tile video").forEach(function (video) {
      var tile = video.closest(".media-mill__tile");
      if (!tile) return;
      var rect = tile.getBoundingClientRect();
      var inView =
        rect.bottom > 0 &&
        rect.top < (window.innerHeight || document.documentElement.clientHeight);
      if (!inView) return;
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {});
      }
    });
  }

  function lockBodyScroll() {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add("is-project-modal-open");
    document.body.style.top = "-" + lockedScrollY + "px";
  }

  function unlockBodyScroll() {
    document.body.classList.remove("is-project-modal-open");
    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
  }

  function getFocusable(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, video[controls], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
    });
  }

  function renderMedia(project) {
    mediaMount.innerHTML = "";
    if (project.fullSrc) {
      var video = document.createElement("video");
      video.className = "project-modal__player";
      video.setAttribute("controls", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("preload", "metadata");
      video.poster = project.posterSrc || "";
      video.src = project.fullSrc;
      mediaMount.appendChild(video);
      return;
    }

    var figure = document.createElement("div");
    figure.className = "project-modal__poster-wrap";
    var img = document.createElement("img");
    img.className = "project-modal__poster";
    img.src = project.posterSrc || "";
    img.alt = "";
    figure.appendChild(img);

    if (project.externalUrl) {
      var link = document.createElement("a");
      link.className = "btn btn--primary project-modal__watch";
      link.href = project.externalUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Watch the film";
      figure.appendChild(link);
    }

    mediaMount.appendChild(figure);
  }

  function renderCredits(project) {
    creditsEl.innerHTML = "";
    if (!project.credits || !project.credits.length) {
      creditsEl.hidden = true;
      return;
    }
    creditsEl.hidden = false;
    var heading = document.createElement("h3");
    heading.className = "project-modal__credits-title";
    heading.textContent = "Credits";
    creditsEl.appendChild(heading);
    var list = document.createElement("ul");
    list.className = "project-modal__credits-list";
    project.credits.forEach(function (item) {
      var li = document.createElement("li");
      var role = item.role && item.role !== "TODO" ? item.role : "";
      var name = item.name && item.name !== "TODO" ? item.name : "";
      if (!role && !name) return;
      li.textContent = role && name ? role + ": " + name : role || name;
      list.appendChild(li);
    });
    if (!list.children.length) {
      creditsEl.hidden = true;
      creditsEl.innerHTML = "";
      return;
    }
    creditsEl.appendChild(list);
  }

  function fillMeta(project) {
    var bits = [];
    if (project.client && project.client !== "TODO") bits.push(project.client);
    if (project.year && project.year !== "TODO") bits.push(String(project.year));
    if (project.lane && project.lane !== "TODO") bits.push(project.lane);
    if (!bits.length) {
      metaEl.hidden = true;
      metaEl.textContent = "";
    } else {
      metaEl.hidden = false;
      metaEl.textContent = bits.join(" · ");
    }
  }

  function setHash(slug, fromPop) {
    if (fromPop) return;
    var next = "#work/" + slug;
    if (location.hash === next) return;
    history.pushState({ millProject: slug }, "", next);
  }

  function clearHash(fromPop) {
    if (fromPop) return;
    if (location.hash.indexOf("#work/") !== 0) return;
    history.pushState({ millProject: null }, "", location.pathname + location.search);
  }

  function openProject(slug, opts) {
    opts = opts || {};
    var project = bySlug[slug];
    if (!project) return;

    if (!opts.fromPop && document.activeElement && document.activeElement.closest("[data-project-open]")) {
      lastTrigger = document.activeElement.closest("[data-project-open]");
    } else if (!opts.fromPop) {
      lastTrigger = document.querySelector('[data-project-open="' + slug + '"]');
    }

    activeSlug = slug;
    titleEl.textContent = displayTitle(project);
    fillMeta(project);
    displayOrHide(roleEl, project.role);
    displayOrHide(
      agencyEl,
      project.agency && project.agency !== "TODO" ? "Agency: " + project.agency : ""
    );
    displayOrHide(summaryEl, project.summary);
    renderCredits(project);
    renderMedia(project);

    pauseSiteMedia();
    if (!open) lockBodyScroll();
    open = true;
    root.hidden = false;
    root.classList.add("is-open");
    if (reduceMotion) root.classList.add("is-reduced-motion");
    else root.classList.remove("is-reduced-motion");
    document.documentElement.classList.add("is-project-modal-open");

    setHash(slug, opts.fromPop);

    window.requestAnimationFrame(function () {
      (closeBtn || dialog).focus();
    });
  }

  function closeProject(opts) {
    opts = opts || {};
    if (!open) return;

    var player = mediaMount.querySelector("video");
    if (player) {
      try {
        player.pause();
      } catch (err) {
        /* ignore */
      }
    }

    open = false;
    activeSlug = null;
    root.classList.remove("is-open");
    root.hidden = true;
    mediaMount.innerHTML = "";
    document.documentElement.classList.remove("is-project-modal-open");
    unlockBodyScroll();
    clearHash(opts.fromPop);
    resumeMillMedia();

    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  function onKeydown(e) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeProject();
      return;
    }
    if (e.key !== "Tab") return;
    var focusable = getFocusable(dialog);
    if (!focusable.length) {
      e.preventDefault();
      dialog.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.querySelectorAll("[data-project-open]").forEach(function (btn) {
    var pointerOrigin = null;
    var suppressClick = false;

    btn.addEventListener(
      "pointerdown",
      function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pointerOrigin = { x: e.clientX, y: e.clientY };
        suppressClick = false;
      },
      { passive: true }
    );

    btn.addEventListener(
      "pointermove",
      function (e) {
        if (!pointerOrigin) return;
        var dx = e.clientX - pointerOrigin.x;
        var dy = e.clientY - pointerOrigin.y;
        if (dx * dx + dy * dy > 144) {
          suppressClick = true;
        }
      },
      { passive: true }
    );

    btn.addEventListener(
      "pointerup",
      function () {
        pointerOrigin = null;
      },
      { passive: true }
    );

    btn.addEventListener(
      "pointercancel",
      function () {
        pointerOrigin = null;
        suppressClick = true;
      },
      { passive: true }
    );

    btn.addEventListener("click", function (e) {
      if (suppressClick) {
        e.preventDefault();
        suppressClick = false;
        return;
      }
      openProject(btn.getAttribute("data-project-open"));
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", function () {
    closeProject();
  });
  if (backdrop) backdrop.addEventListener("click", function () {
    closeProject();
  });
  document.addEventListener("keydown", onKeydown);

  window.addEventListener("popstate", function () {
    var match = (location.hash || "").match(/^#work\/([a-z0-9-]+)/i);
    if (match) openProject(match[1], { fromPop: true });
    else closeProject({ fromPop: true });
  });

  var boot = (location.hash || "").match(/^#work\/([a-z0-9-]+)/i);
  if (boot) {
    openProject(boot[1], { fromPop: true });
  }

  window.GASWORKS_OPEN_PROJECT = openProject;
  window.GASWORKS_CLOSE_PROJECT = closeProject;
})();
