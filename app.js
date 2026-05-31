/**
 * app.js — LA UI Style Guide
 * ─────────────────────────────────────────────────────────────────────────
 * Single script for every guide page. Handles two things:
 *
 *  1. SHELL INJECTION
 *     When a page declares window.SHELL_PAGE, this script fetches base.html
 *     and injects .la-sidebar and .la-topbar into the host page. After
 *     injection it builds the in-page section nav and activates scroll
 *     tracking. (This is what shell.js used to do — it lives here now.)
 *
 *     Each guide page sets this before the script loads:
 *       window.SHELL_PAGE = { active: 'pagename', breadcrumb: 'Label', nav: 'page', base: '' }
 *
 *       active     — data-key of the nav link to mark active in the sidebar
 *       breadcrumb — label shown in the topbar after "LA UI /"
 *       nav        — 'page' shows the in-page section nav;
 *                    anything else (e.g. 'site') shows the full site nav
 *       base       — relative prefix for subdirectory pages, e.g. '../'
 *
 *  2. SHOWCASE INTERACTIONS
 *     Component demos that need JS: token theme preview, notice dismiss,
 *     password field toggle.
 *
 * Requires VS Code Live Server or any local HTTP server.
 * fetch() does not work over file:// URLs.
 */
(function () {
  'use strict';

  // PAGE is null on the monolithic showcase (no window.SHELL_PAGE).
  // On every individual guide page it is the object set by the page.
  var PAGE = window.SHELL_PAGE || null;
  var B    = PAGE ? (PAGE.base || '') : '';


  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVE NAV STATE
  // Marks the sidebar nav link whose data-key matches the current page.
  // Called immediately after the sidebar HTML is inserted into the DOM.
  // ─────────────────────────────────────────────────────────────────────────

  function setActive(key) {
    document.querySelectorAll('.la-nav-link').forEach(function (link) {
      link.classList.toggle('is-active', link.dataset.key === key);
    });
  }


  // ─────────────────────────────────────────────────────────────────────────
  // DATA-SECTION SCROLL SPY
  // Watches elements that carry [data-section] and keeps the matching
  // sidebar nav link active as the user scrolls. The "current" section is
  // the last one whose top edge has reached the scroll threshold — this
  // handles tall sections whose headings can never reach the viewport center.
  // ─────────────────────────────────────────────────────────────────────────

  function initScrollSpy() {
    var sections = Array.from(document.querySelectorAll('[data-section]'));
    if (!sections.length) return;

    var THRESHOLD = 120;

    function update() {
      var current = sections[0].dataset.section;
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top <= THRESHOLD) {
          current = s.dataset.section;
        }
      });
      setActive(current);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // PATH REWRITING
  // base.html uses root-relative paths (href="tokens.html", src="app.css").
  // Pages in subdirectories set PAGE.base = '../' so every relative href
  // and src in the injected HTML is prefixed to resolve correctly.
  // ─────────────────────────────────────────────────────────────────────────

  function rewritePaths(fragment, base) {
    if (!base) return;
    fragment.querySelectorAll('[href]').forEach(function (el) {
      var val = el.getAttribute('href');
      if (val && !val.startsWith('http') && !val.startsWith('#')) {
        el.setAttribute('href', base + val);
      }
    });
    fragment.querySelectorAll('[src]').forEach(function (el) {
      var val = el.getAttribute('src');
      if (val && !val.startsWith('http') && !val.startsWith('data:')) {
        el.setAttribute('src', base + val);
      }
    });
  }


  // ─────────────────────────────────────────────────────────────────────────
  // SHELL INJECTION
  // Called with the raw HTML text of base.html once the fetch resolves.
  // Parses it, extracts .la-sidebar, .la-topbar, and .la-site-footer, inserts
  // them into the host page. Also handles:
  //   - Breadcrumb label from PAGE.breadcrumb
  //   - Hiding the parent crumb on non-topic pages (e.g. overview)
  //   - Switching between site nav and in-page section nav
  //   - Marking the active nav link and starting scroll tracking
  // ─────────────────────────────────────────────────────────────────────────

  function injectShell(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // Fix relative paths if the page lives in a subdirectory
    rewritePaths(doc, B);

    // Write the page label into the topbar breadcrumb slot
    var bc = doc.querySelector('[data-breadcrumb]');
    if (bc) bc.textContent = PAGE.breadcrumb;

    // Non-topic pages (nav: 'site') omit the parent crumb and separator
    if (PAGE.nav !== 'page') {
      var bcParent = doc.querySelector('[data-breadcrumb-parent]');
      var bcSep    = doc.querySelector('[data-breadcrumb-sep]');
      if (bcParent) bcParent.remove();
      if (bcSep)    bcSep.remove();
    }

    var app     = document.querySelector('.la-app');
    var main    = document.querySelector('.la-main');
    var content = document.querySelector('.la-content');

    // Sidebar goes before <main>, topbar as first child of <main>
    var sidebar = doc.querySelector('.la-sidebar');
    if (sidebar && app) app.insertBefore(sidebar, main);

    var topbar = doc.querySelector('.la-topbar');
    if (topbar && main) main.insertBefore(topbar, content);

    // Footer appended as last child of <main>
    var footer = doc.querySelector('.la-site-footer');
    if (footer && main) main.appendChild(footer);

    // 'page' nav = in-page section links; anything else = full site nav
    var siteNav = document.getElementById('sg-site-nav');
    var pageNav = document.getElementById('page-categories');
    if (PAGE.nav === 'page') {
      if (siteNav) siteNav.hidden = true;
      if (pageNav) { pageNav.hidden = false; pageNav.removeAttribute('hidden'); }
    } else {
      if (siteNav) siteNav.hidden = false;
      if (pageNav) pageNav.hidden = true;
    }

    // Mark the current page active, then start the data-section scroll spy
    setActive(PAGE.active);
    initScrollSpy();

    // Sidebar is now in the DOM — run setup that depends on it
    initPageSetup();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // PAGE CATEGORIES  (in-page section nav)
  // Scans direct h3 children of .sg-section and builds a nav block inside
  // #page-categories. Uses :scope > h3 to exclude h3 elements nested inside
  // component demos (card titles, modal headings, etc.) from appearing here.
  // Each h3 gets an auto-generated id from its text if it does not have one.
  // ─────────────────────────────────────────────────────────────────────────

  function setupPageCategories() {
    var container = document.getElementById('page-categories');
    if (!container) return;

    var contentRoot = document.querySelector('.la-content .sg-section');
    if (!contentRoot) return;

    // :scope > h3 — direct children only, excludes nested demo headings
    var headings = Array.prototype.slice.call(contentRoot.querySelectorAll(':scope > h3'));
    if (!headings.length) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'la-nav-section';

    // Page label above the nav links — pulled from SHELL_PAGE.breadcrumb
    if (PAGE && PAGE.breadcrumb) {
      var title = document.createElement('p');
      title.className = 'la-nav-title';
      title.textContent = PAGE.breadcrumb;
      wrapper.appendChild(title);
    }

    var nav = document.createElement('nav');
    nav.className = 'la-nav';
    nav.setAttribute('aria-label', 'Page sections');

    headings.forEach(function (h) {
      var text = h.textContent.trim();
      if (!text) return;

      // Auto-generate a stable id from the heading text
      if (!h.id) {
        h.id = text
          .toLowerCase()
          .replace(/[^a-z0-9\s\-]/g, '')
          .replace(/\s+/g, '-');
      }

      var a = document.createElement('a');
      a.className = 'la-nav-link la-nav-link--plain';
      a.href = '#' + h.id;

      var label = document.createElement('span');
      label.className = 'la-nav-label';
      label.textContent = text;

      a.appendChild(label);
      nav.appendChild(a);
    });

    wrapper.appendChild(nav);
    container.innerHTML = '';
    container.appendChild(wrapper);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // HASH SCROLL SPY  (section nav links)
  // After setupPageCategories builds the in-page nav, this spy watches the
  // corresponding heading elements and keeps the matching nav link active
  // as the user scrolls. Same "last section above threshold" logic as
  // initScrollSpy, but driven by the anchor href list rather than
  // [data-section] attributes.
  // ─────────────────────────────────────────────────────────────────────────

  function setupScrollSpy() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.la-sidebar .la-nav-link[href^="#"]')
    );

    var sections = links
      .map(function (link) {
        var id = link.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        return el ? { link: link, el: el } : null;
      })
      .filter(Boolean);

    if (!sections.length) return;

    var THRESHOLD = 120;

    function update() {
      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].el.getBoundingClientRect().top <= THRESHOLD) {
          current = sections[i];
        }
      }
      sections.forEach(function (item) {
        var active = item === current;
        item.link.classList.toggle('is-active', active);
        if (active) {
          item.link.setAttribute('aria-current', 'page');
        } else {
          item.link.removeAttribute('aria-current');
        }
      });
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // SIDEBAR TOGGLE
  // The collapse button (#sg-sidebar-toggle) lives inside the injected
  // sidebar. It toggles .sidebar-collapsed on .la-app and persists the
  // state in localStorage so the preference survives page navigation.
  // ─────────────────────────────────────────────────────────────────────────

  function setupSidebarToggle() {
    var btn = document.getElementById('sg-sidebar-toggle');
    var app = document.querySelector('.la-app');
    if (!btn || !app) return;

    function applyState(collapsed) {
      app.classList.toggle('sidebar-collapsed', collapsed);
      btn.classList.toggle('is-active', collapsed);
      btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
      try { localStorage.setItem('sgSidebarCollapsed', collapsed ? '1' : '0'); } catch (e) {}
    }

    btn.addEventListener('click', function () {
      applyState(!app.classList.contains('sidebar-collapsed'));
    });

    // Restore the previous state on page load
    try {
      if (localStorage.getItem('sgSidebarCollapsed') === '1') applyState(true);
    } catch (e) {}
  }


  // ─────────────────────────────────────────────────────────────────────────
  // PAGE SETUP
  // Groups the three sidebar-dependent setup functions. In multi-page mode,
  // injectShell calls this once the sidebar has been inserted. On the
  // monolithic showcase, DOMContentLoaded calls it directly because the
  // sidebar is already in the HTML.
  // ─────────────────────────────────────────────────────────────────────────

  function initPageSetup() {
    setupPageCategories();
    setupScrollSpy();
    setupSidebarToggle();
    setupThemeToggle();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // TOKEN THEME PREVIEW
  // The tokens page has a color preview block (#sg-token-color-preview).
  // Theme toggle buttons switch its data-theme attribute on demand. After
  // each switch the live CSS custom property values are re-read and written
  // into [data-sg-token-value] spans so the resolved values update in real
  // time without a page reload.
  // ─────────────────────────────────────────────────────────────────────────

  function refreshTokenValues(preview) {
    var styles = window.getComputedStyle(preview);

    preview.querySelectorAll('[data-sg-token-value]').forEach(function (item) {
      var tokenName = item.getAttribute('data-sg-token-value');
      var tokenValue = styles.getPropertyValue(tokenName).trim();

      if (tokenValue) {
        item.textContent = tokenValue;
      }
    });
  }

  function setupTokenThemeToggle() {
    var preview = document.getElementById('sg-token-color-preview');
    if (!preview) return;

    document.querySelectorAll('[data-sg-theme-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.getAttribute('data-sg-theme-btn');
        preview.setAttribute('data-theme', theme);

        // Mark the clicked button active and deactivate all others
        document.querySelectorAll('[data-sg-theme-btn]').forEach(function (other) {
          other.classList.toggle('is-active', other === btn);
        });

        refreshTokenValues(preview);
      });
    });

    refreshTokenValues(preview);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // NOTICE DISMISS
  // Dismissible notice demo on the feedback page. Clicking × fades the
  // notice and hides it from assistive tech. The element stays in the DOM
  // so it remains inspectable in devtools after dismissal.
  // ─────────────────────────────────────────────────────────────────────────

  function setupNoticeDismiss() {
    document.querySelectorAll('.la-notice-dismiss').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var notice = btn.closest('.la-notice');
        if (!notice) return;
        notice.style.opacity = '0.45';
        notice.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEMO TOASTS
  // Live demo buttons on the feedback page trigger these. They create a
  // notice element, append it to the stack container, and set a timer to
  // auto-dismiss after 4 seconds. Clicks on the dismiss button clear the
  // timer and remove the notice immediately.
  // ──

  window.demoToast = function (type, message) {
    var stack = document.getElementById('la-demo-toasts');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'la-toast-stack';
      stack.id = 'la-demo-toasts';
      document.body.appendChild(stack);
    }
    var el = document.createElement('div');
    el.className = 'la-notice la-notice-' + type;
    el.innerHTML = '<span>' + message + '</span><button class="la-notice-dismiss" type="button" aria-label="Dismiss">\u00d7</button>';
    stack.appendChild(el);

    function dismiss() {
      el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(function () { el.remove(); }, 200);
    }

    var timer = setTimeout(dismiss, 4000);
    el.querySelector('.la-notice-dismiss').addEventListener('click', function () {
      clearTimeout(timer);
      dismiss();
    });
  };


  // ─────────────────────────────────────────────────────────────────────────
  // THEME TOGGLE
  // Reads the saved preference from localStorage on boot and keeps the
  // toggle button in sync with the current data-theme on <html>. The
  // early-boot inline script in each page's <head> applies the saved theme
  // before first paint, so there is no flash of the wrong theme.
  // ─────────────────────────────────────────────────────────────────────────

  function setupThemeToggle() {
    var btn = document.getElementById('sg-theme-toggle');
    if (!btn) return;

    var MOON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    var SUN  = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

    function apply(isDark) {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      btn.innerHTML = isDark ? SUN : MOON;
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      try { localStorage.setItem('la-theme', isDark ? 'dark' : 'light'); } catch (e) {}
    }

    btn.addEventListener('click', function () {
      apply(document.documentElement.getAttribute('data-theme') !== 'dark');
    });

    // Sync button state with whatever the early-boot script already applied
    apply(document.documentElement.getAttribute('data-theme') === 'dark');
  }


  // ─────────────────────────────────────────────────────────────────────────
  // PASSWORD TOGGLE
  // Toggles the input type between 'password' and 'text'. Keeps aria-pressed
  // and aria-label in sync on the toggle button so screen readers announce
  // the current visibility state.
  // ─────────────────────────────────────────────────────────────────────────

  function setupPasswordToggle() {
    document.querySelectorAll('.la-password-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = btn.parentElement ? btn.parentElement.querySelector('input') : null;
        if (!input) return;

        var shouldShow = input.type === 'password';
        input.type = shouldShow ? 'text' : 'password';
        btn.setAttribute('aria-pressed', shouldShow ? 'true' : 'false');
        btn.setAttribute('aria-label',   shouldShow ? 'Hide password' : 'Show password');
      });
    });
  }


  // ─────────────────────────────────────────────────────────────────────────
  // BOOT
  // Runs on DOMContentLoaded. Showcase interactions fire on every page.
  // Shell injection fires only when window.SHELL_PAGE is set (multi-page
  // mode). On the monolithic showcase, initPageSetup runs directly since
  // the sidebar is already present in the HTML.
  // ─────────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {

    // These run on every page regardless of mode
    setupTokenThemeToggle();
    setupNoticeDismiss();
    setupPasswordToggle();

    if (PAGE) {
      // Multi-page mode: fetch the shell template, inject sidebar and topbar.
      // injectShell calls initPageSetup once the DOM is ready.
      fetch(B + 'base.html')
        .then(function (r) { return r.text(); })
        .then(injectShell)
        .catch(function (err) {
          console.warn('LA UI: could not load base.html.', err);
        });
    } else {
      // Monolithic showcase: sidebar is already in the HTML. Run page setup
      // immediately without waiting for a fetch.
      initPageSetup();
    }

  });

}());
