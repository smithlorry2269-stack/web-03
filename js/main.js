/* ============================================================
   Crumb — main.js  (vanilla JS, no jQuery)
   One function per feature. Guard clauses. Reduced-motion aware.
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Shared bag/order state ---------- */
  var bag = [];               // { id, name, price, qty }
  var bagListeners = [];

  function bagCount() { return bag.reduce(function (n, i) { return n + i.qty; }, 0); }
  function bagTotal() { return bag.reduce(function (s, i) { return s + i.price * i.qty; }, 0); }

  function addToBag(id, name, price) {
    var found = bag.find(function (i) { return i.id === id; });
    if (found) { found.qty += 1; } else { bag.push({ id: id, name: name, price: price, qty: 1 }); }
    bagListeners.forEach(function (fn) { fn(); });
  }
  function removeFromBag(id) {
    bag = bag.filter(function (i) { return i.id !== id; });
    bagListeners.forEach(function (fn) { fn(); });
  }
  function onBagChange(fn) { bagListeners.push(fn); }

  /* ---------- Mobile navigation ---------- */
  function initMobileNav() {
    var toggler = document.querySelector(".navbar-toggler");
    var collapse = document.getElementById("primary-nav");
    if (!toggler || !collapse) return;

    function close() {
      collapse.classList.remove("show");
      toggler.setAttribute("aria-expanded", "false");
    }
    // Bootstrap handles the collapse; keep aria + close-on-click in sync.
    toggler.addEventListener("click", function () {
      var open = toggler.getAttribute("aria-expanded") === "true";
      toggler.setAttribute("aria-expanded", String(!open));
    });
    collapse.querySelectorAll("a.nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth < 992) {
          collapse.classList.remove("show");
          toggler.setAttribute("aria-expanded", "false");
        }
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && collapse.classList.contains("show")) { close(); toggler.focus(); }
    });
  }

  /* ---------- Sticky nav shadow ---------- */
  function initNavScroll() {
    var nav = document.querySelector(".site-nav");
    if (!nav) return;
    function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 12); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Scrollspy for nav active state ---------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav .nav-link[href^="#"]'));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (l) {
      var id = l.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = l;
    });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          if (map[en.target.id]) map[en.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    Object.keys(map).forEach(function (id) { obs.observe(document.getElementById(id)); });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (prefersReduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); o.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---------- Count-up stats ---------- */
  function initCountUp() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    if (prefersReduced || !("IntersectionObserver" in window)) {
      nums.forEach(function (n) { n.textContent = n.getAttribute("data-count") + (n.getAttribute("data-suffix") || ""); });
      return;
    }
    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 1400, start = null;
        function tick(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = target * eased;
          el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(0)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target + suffix;
        }
        requestAnimationFrame(tick);
        o.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { obs.observe(n); });
  }

  /* ---------- Menu tabs ---------- */
  function initMenuTabs() {
    var tabs = document.querySelectorAll(".menu-tab");
    if (!tabs.length) return;
    var panels = document.querySelectorAll(".menu-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { activate(tab); });
      tab.addEventListener("keydown", function (e) {
        var list = Array.prototype.slice.call(tabs);
        var idx = list.indexOf(tab);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); activate(list[(idx + 1) % list.length], true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); activate(list[(idx - 1 + list.length) % list.length], true); }
      });
    });
    function activate(tab, focus) {
      var target = tab.getAttribute("data-menu");
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        var show = p.getAttribute("data-panel") === target;
        p.hidden = !show;
      });
      if (focus) tab.focus();
    }
  }

  /* ---------- Bag pill (header) + toast ---------- */
  function initBagPill() {
    var pills = document.querySelectorAll(".bag-pill");
    if (!pills.length) return;
    function render() {
      var c = bagCount();
      pills.forEach(function (pill) {
        var badge = pill.querySelector(".bag-count");
        if (badge) badge.textContent = c;
        pill.classList.add("bump");
        setTimeout(function () { pill.classList.remove("bump"); }, 220);
      });
    }
    onBagChange(render);
    // initial (no bump)
    pills.forEach(function (pill) { var b = pill.querySelector(".bag-count"); if (b) b.textContent = bagCount(); });
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = "🥐 " + msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ---------- Add-to-order buttons (featured grid) ---------- */
  function initAddButtons() {
    var btns = document.querySelectorAll(".add-btn[data-id]");
    if (!btns.length) return;
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var name = btn.getAttribute("data-name");
        var price = parseFloat(btn.getAttribute("data-price"));
        addToBag(id, name, price);
        var label = btn.querySelector(".add-label");
        var original = label ? label.textContent : null;
        btn.classList.add("added");
        if (label) label.textContent = "Added!";
        toast(name + " added to your bag");
        setTimeout(function () {
          btn.classList.remove("added");
          if (label && original) label.textContent = original;
        }, 1400);
      });
    });
  }

  /* ---------- Gallery lightbox ---------- */
  function initLightbox() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".g-item[data-full]"));
    var box = document.getElementById("lightbox");
    if (!items.length || !box) return;
    var img = box.querySelector("img");
    var cap = box.querySelector(".lightbox-cap");
    var btnClose = box.querySelector(".lightbox-close");
    var btnPrev = box.querySelector(".prev");
    var btnNext = box.querySelector(".next");
    var current = 0;
    var lastFocus = null;

    function show(i) {
      current = (i + items.length) % items.length;
      var el = items[current];
      img.src = el.getAttribute("data-full");
      img.alt = el.getAttribute("data-alt") || "";
      if (cap) cap.textContent = el.getAttribute("data-alt") || "";
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add("open");
      box.setAttribute("aria-hidden", "false");
      btnClose.focus();
      document.body.style.overflow = "hidden";
    }
    function close() {
      box.classList.remove("open");
      box.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    items.forEach(function (el, i) {
      el.addEventListener("click", function () { open(i); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });
    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", function () { show(current - 1); });
    btnNext.addEventListener("click", function () { show(current + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* ---------- Newsletter validation ---------- */
  function initNewsletter() {
    var form = document.getElementById("news-form");
    if (!form) return;
    var input = form.querySelector("input[type=email]");
    var msg = document.getElementById("news-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = (input.value || "").trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      msg.className = "news-msg " + (ok ? "ok" : "err");
      if (!ok) {
        input.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
        msg.textContent = "Please enter a valid email address.";
        input.focus();
        return;
      }
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
      msg.textContent = "Thanks! Warm-from-the-oven news is on its way. 🍞";
      form.reset();
    });
    input.addEventListener("input", function () {
      if (input.classList.contains("invalid")) { input.classList.remove("invalid"); if (msg) msg.textContent = ""; }
    });
  }

  /* ---------- Today's-hours highlight ---------- */
  function initHoursToday() {
    var lists = document.querySelectorAll("[data-hours]");
    if (!lists.length) return;
    var day = new Date().getDay(); // 0 Sun … 6 Sat
    lists.forEach(function (list) {
      list.querySelectorAll("li[data-days]").forEach(function (li) {
        var days = li.getAttribute("data-days").split(",").map(Number);
        if (days.indexOf(day) !== -1) {
          li.classList.add("today");
          var tag = li.querySelector("[data-today-tag]");
          if (tag) tag.textContent = tag.textContent + " · Open today";
        }
      });
    });
  }

  /* ---------- Order builder (menu page) ---------- */
  function initOrderBuilder() {
    var form = document.getElementById("order-form");
    if (!form) return;
    var linesEl = document.getElementById("order-lines");
    var totalEl = document.getElementById("order-total-val");

    function renderSummary() {
      if (!linesEl) return;
      linesEl.innerHTML = "";
      if (!bag.length) {
        var li = document.createElement("li");
        li.className = "empty";
        li.textContent = "Your bag is empty — add something delicious below.";
        linesEl.appendChild(li);
      } else {
        bag.forEach(function (item) {
          var li = document.createElement("li");
          var label = document.createElement("span");
          label.textContent = item.qty + " × " + item.name;
          var right = document.createElement("span");
          right.textContent = "$" + (item.price * item.qty).toFixed(2);
          var rm = document.createElement("button");
          rm.type = "button";
          rm.setAttribute("aria-label", "Remove " + item.name);
          rm.textContent = "Remove";
          rm.addEventListener("click", function () { removeFromBag(item.id); });
          right.appendChild(rm);
          li.appendChild(label); li.appendChild(right);
          linesEl.appendChild(li);
        });
      }
      if (totalEl) totalEl.textContent = "$" + bagTotal().toFixed(2);
    }
    onBagChange(renderSummary);
    renderSummary();

    // "Add to order" buttons inside the menu page product list
    document.querySelectorAll(".menu-add[data-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        addToBag(btn.getAttribute("data-id"), btn.getAttribute("data-name"), parseFloat(btn.getAttribute("data-price")));
        toast(btn.getAttribute("data-name") + " added");
      });
    });

    // Validation
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll("[required]").forEach(function (field) {
        var ok = field.value.trim() !== "";
        if (field.type === "email") ok = ok && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
        field.classList.toggle("is-invalid", !ok);
        if (!ok && valid) { field.focus(); valid = false; }
      });
      var out = document.getElementById("order-result");
      if (!valid) {
        if (out) { out.className = "news-msg err"; out.textContent = "Please complete the highlighted fields."; }
        return;
      }
      if (!bag.length) {
        if (out) { out.className = "news-msg err"; out.textContent = "Add at least one item to your bag first."; }
        return;
      }
      if (out) {
        out.className = "news-msg ok";
        out.textContent = "Thank you! Your order request for " + bagCount() + " item(s) — $" + bagTotal().toFixed(2) + " — has been received. We'll confirm your pickup time by email.";
      }
      form.reset();
      bag = [];
      bagListeners.forEach(function (fn) { fn(); });
    });
    form.querySelectorAll("[required]").forEach(function (field) {
      field.addEventListener("input", function () { field.classList.remove("is-invalid"); });
    });
  }

  /* ---------- Footer year (durable, no hardcoded shift) ---------- */
  function initYear() {
    // Copyright is fixed at © 2026 in markup for durability; nothing to do.
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initNavScroll();
    initScrollSpy();
    initCountUp();
    initMenuTabs();
    initBagPill();
    initAddButtons();
    initLightbox();
    initNewsletter();
    initHoursToday();
    initOrderBuilder();
    initYear();
  });

  // Reveal initialized outside DOMContentLoaded (scripts at body end)
  initReveal();
})();
