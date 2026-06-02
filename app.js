/*
 * app.js - shared JS for the LA UI docs.
 *
 * There are two modes here:
 * - multi-page docs set window.SHELL_PAGE, then we pull in base.html
 * - the old one-page showcase skips that and already has the shell in HTML
 *
 * Needs a local server. fetch() will not load base.html from file://.
 */
(function () {
  'use strict';

  // Set by guide pages before this file loads. Null means standalone showcase.
  // active: sidebar key, breadcrumb: topbar label, nav: page or site, base: ../ etc.
  var PAGE = window.SHELL_PAGE || null;
  var B    = PAGE ? (PAGE.base || '') : '';

  // Start the shell fetch (or sessionStorage read) immediately — defer guarantees
  // the DOM is already parsed here, so the sooner this runs the less visible flash.
  var shellPromise = null;
  if (PAGE) {
    var shellKey     = 'la-shell:' + B;
    var cachedShell  = sessionStorage.getItem(shellKey);
    if (cachedShell) {
      shellPromise = Promise.resolve(cachedShell);
    } else {
      shellPromise = fetch(B + 'base.html')
        .then(function (r) { return r.text(); })
        .then(function (html) {
          try { sessionStorage.setItem(shellKey, html); } catch (e) {}
          return html;
        });
    }
  }


  // Marks the matching sidebar link as active.
  function setActive(key) {
    document.querySelectorAll('.la-nav-link').forEach(function (link) {
      link.classList.toggle('is-active', link.dataset.key === key);
    });
  }


  // Old data-section scroll spy. Last section above the top offset wins.
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


  // base.html uses local paths. Nested pages need those paths prefixed.
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


  // Pull shared shell pieces from base.html and drop them into the page.
  function injectShell(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    // Fix links/scripts if this page is inside a folder.
    rewritePaths(doc, B);

    // Topbar crumb text for the current page.
    var bc = doc.querySelector('[data-breadcrumb]');
    if (bc) bc.textContent = PAGE.breadcrumb;

    // Site-level pages do not need the parent crumb.
    if (PAGE.nav !== 'page') {
      var bcParent = doc.querySelector('[data-breadcrumb-parent]');
      var bcSep    = doc.querySelector('[data-breadcrumb-sep]');
      if (bcParent) bcParent.remove();
      if (bcSep)    bcSep.remove();
    }

    var app     = document.querySelector('.la-app');
    var main    = document.querySelector('.la-main');
    var content = document.querySelector('.la-content');

    // Insert shell around the page content — atomically replace skeleton
    // placeholders so the layout never shifts.
    var sidebar = doc.querySelector('.la-sidebar');
    if (sidebar && app) {
      var skelSidebar = app.querySelector('.la-sidebar.la-shell-skeleton');
      if (skelSidebar) {
        app.replaceChild(sidebar, skelSidebar);
      } else {
        app.insertBefore(sidebar, main);
      }
    }

    var topbar = doc.querySelector('.la-topbar');
    if (topbar && main) {
      var skelTopbar = main.querySelector('.la-topbar.la-shell-skeleton');
      if (skelTopbar) {
        main.replaceChild(topbar, skelTopbar);
      } else {
        main.insertBefore(topbar, content);
      }
    }

    var footer = doc.querySelector('.la-site-footer');
    if (footer && main) main.appendChild(footer);

    // Topic pages show section links. Overview-style pages show site nav.
    var siteNav = document.getElementById('sg-site-nav');
    var pageNav = document.getElementById('page-categories');
    if (PAGE.nav === 'page') {
      if (siteNav) siteNav.hidden = true;
      if (pageNav) { pageNav.hidden = false; pageNav.removeAttribute('hidden'); }
    } else {
      if (siteNav) siteNav.hidden = false;
      if (pageNav) pageNav.hidden = true;
    }

    setActive(PAGE.active);
    initScrollSpy();

    // Anything that needs the injected sidebar runs after this.
    initPageSetup();
  }


  // Builds the small in-page nav from direct h3 headings only.
  function setupPageCategories() {
    var container = document.getElementById('page-categories');
    if (!container) return;

    var contentRoot = document.querySelector('.la-content .sg-section');
    if (!contentRoot) return;

    // Direct h3 only, otherwise demo card titles would get pulled in too.
    var headings = Array.prototype.slice.call(contentRoot.querySelectorAll(':scope > h3'));
    if (!headings.length) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'la-nav-section';

    // Small label above the section list.
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

      // Make a simple id if the heading does not already have one.
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

    // Manual back link, kept separate so it does not join the scroll spy list.
    var backSection = document.createElement('div');
    backSection.className = 'la-nav-section';
    var backNav = document.createElement('nav');
    backNav.className = 'la-nav';
    backNav.setAttribute('aria-label', 'Back');
    var backLink = document.createElement('a');
    backLink.className = 'la-nav-link la-nav-link--plain la-nav-link--back';
    backLink.href = B + 'overview.html';
    var backLabel = document.createElement('span');
    backLabel.className = 'la-nav-label';
    backLabel.textContent = '\u2190 Back to Overview';
    backLink.appendChild(backLabel);
    backNav.appendChild(backLink);
    backSection.appendChild(backNav);
    container.appendChild(backSection);

    container.appendChild(wrapper);
  }


  // Scroll spy for the generated hash links in the sidebar.
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


  // Sidebar collapse button. Saves the state because it is annoying otherwise.
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

    // Put it back the way the user left it.
    try {
      if (localStorage.getItem('sgSidebarCollapsed') === '1') applyState(true);
    } catch (e) {}
  }


  // Stuff that needs the sidebar to already exist.
  function initPageSetup() {
    setupPageCategories();
    setupScrollSpy();
    setupSidebarToggle();
    setupThemeToggle();
  }


  // Reads the live CSS token values from the token preview box.
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

  // Light/dark preview for the tokens page only.
  function setupTokenThemeToggle() {
    var preview = document.getElementById('sg-token-color-preview');
    if (!preview) return;

    document.querySelectorAll('[data-sg-theme-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.getAttribute('data-sg-theme-btn');
        preview.setAttribute('data-theme', theme);

        // Only the clicked theme button should look selected.
        document.querySelectorAll('[data-sg-theme-btn]').forEach(function (other) {
          other.classList.toggle('is-active', other === btn);
        });

        refreshTokenValues(preview);
      });
    });

    refreshTokenValues(preview);
  }


  // Simple dismiss behavior for static notice demos.
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

  // Demo toast helper used by buttons on the feedback page.
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


  // Main site theme toggle. Head script applies the saved theme before paint.
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

    // Match the button to whatever the head script already picked.
    apply(document.documentElement.getAttribute('data-theme') === 'dark');
  }


  // Password visibility button for form demos.
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


  // Boot. Demo bits run everywhere. Shell setup depends on the mode.
  document.addEventListener('DOMContentLoaded', function () {

    // Safe to run on every page. They bail if their markup is missing.
    setupTokenThemeToggle();
    setupNoticeDismiss();
    setupPasswordToggle();

    if (PAGE) {
      // shellPromise was started at script-load time to minimise the flash window.
      shellPromise
        .then(injectShell)
        .catch(function (err) {
          console.warn('LA UI: could not load base.html.', err);
        });
    } else {
      // One-page showcase already has the shell in the document.
      initPageSetup();
    }

  });

}());
