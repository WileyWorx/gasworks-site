/**
 * Render homepage credit groups from window.GASWORKS_CREDITS.
 * TODO attributions are excluded from both groups and warned in the console.
 */
(function () {
  "use strict";

  var credits = window.GASWORKS_CREDITS || [];
  var section = document.querySelector("[data-credits-section]");
  if (!section) return;

  var groupLed = section.querySelector('[data-credits-group="gasworks-led"]');
  var groupTeam = section.querySelector('[data-credits-group="team-credit"]');
  var ringLed = groupLed && groupLed.querySelector("[data-credits-ring]");
  var ringTeam = groupTeam && groupTeam.querySelector("[data-credits-ring]");

  var led = [];
  var team = [];
  var unassigned = [];

  credits.forEach(function (entry) {
    if (entry.attribution === "gasworks-led") led.push(entry);
    else if (entry.attribution === "team-credit") team.push(entry);
    else unassigned.push(entry.name || entry.slug);
  });

  if (unassigned.length) {
    console.warn(
      "[Gasworks credits] Unassigned brands (attribution still TODO). They will not appear on the page:",
      unassigned.join(", ")
    );
  }

  function openProject(slug) {
    if (typeof window.GASWORKS_OPEN_PROJECT === "function") {
      window.GASWORKS_OPEN_PROJECT(slug);
      return;
    }
    location.hash = "#work/" + slug;
  }

  function buildFace(entry, index) {
    var li = document.createElement("li");
    li.className = "logo-carousel__face";
    li.setAttribute("role", "listitem");
    li.style.setProperty("--i", String(index));

    var panel = document.createElement(entry.projectSlug ? "button" : "div");
    panel.className = "logo-carousel__panel";
    panel.setAttribute("data-brand", entry.slug);

    if (entry.projectSlug) {
      panel.type = "button";
      panel.classList.add("logo-carousel__panel--link");
      panel.setAttribute("aria-haspopup", "dialog");
      panel.setAttribute("aria-label", "Open " + entry.name + " project");
      panel.addEventListener("click", function () {
        openProject(entry.projectSlug);
      });
    }

    var img = document.createElement("img");
    img.src = entry.logoSrc;
    img.alt = entry.name;
    img.loading = "lazy";
    panel.appendChild(img);
    li.appendChild(panel);
    return li;
  }

  function fillGroup(groupEl, ringEl, items) {
    if (!groupEl || !ringEl) return false;
    ringEl.innerHTML = "";
    if (!items.length) {
      groupEl.hidden = true;
      return false;
    }
    ringEl.style.setProperty("--n", String(items.length));
    items.forEach(function (entry, i) {
      ringEl.appendChild(buildFace(entry, i));
    });
    groupEl.hidden = false;
    return true;
  }

  var showLed = fillGroup(groupLed, ringLed, led);
  var showTeam = fillGroup(groupTeam, ringTeam, team);

  if (!showLed && !showTeam) {
    section.hidden = true;
  } else {
    section.hidden = false;
  }
})();
