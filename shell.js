/**
 * shell.js — Vantage shell behavior
 *
 * Fetches base.html, injects the sidebar and topbar into the page,
 * sets the active nav link, and runs the scroll spy.
 *
 * Each page sets window.SHELL_PAGE before this script loads:
 *   window.SHELL_PAGE = { active: 'home', breadcrumb: 'Home', base: '' }
 *
 * active     — data-key value of the nav link to mark active
 * breadcrumb — label shown in the topbar after "Vantage /"
 * base       — relative path to root, e.g. '../' for pages in demo/
 *
 * Note: requires a local HTTP server (e.g. VS Code Live Server).
 * fetch() does not work over file:// due to browser security policy.
 */
(function () {
  'use strict';

  var PAGE = window.SHELL_PAGE || { active: 'home', breadcrumb: 'Home', base: '' };
  var B = PAGE.base || '';

  // ── Active state ──────────────────────────────────────────────────────────

  function setActive(key) {
    document.querySelectorAll('.la-nav-link').forEach(function (link) {
      link.classList.toggle('is-active', link.dataset.key === key);
    });
  }

  // ── Scroll spy ────────────────────────────────────────────────────────────
  // Watches [data-section] elements and updates the active nav link as the
  // user scrolls. The "current" section is the last one whose top edge is
  // at or above the threshold from the top of the viewport.

  function initScrollSpy() {
    var sections = Array.from(document.querySelectorAll('[data-section]'));
    if (!sections.length) return;

    function update() {
      var current = sections[0].dataset.section;
      var threshold = 120;
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top <= threshold) {
          current = s.dataset.section;
        }
      });
      setActive(current);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ── Path rewriting ────────────────────────────────────────────────────────
  // base.html uses root-relative paths. For pages in subdirectories,
  // prepend the base prefix so links and assets resolve correctly.

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

  // ── Shell injection ───────────────────────────────────────────────────────

  function injectShell(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');

    rewritePaths(doc, B);

    var bc = doc.querySelector('[data-breadcrumb]');
    if (bc) bc.textContent = PAGE.breadcrumb;

    // On non-topic pages (e.g. overview, nav: 'site'), hide the parent crumb and separator
    if (PAGE.nav !== 'page') {
      var bcParent = doc.querySelector('[data-breadcrumb-parent]');
      var bcSep    = doc.querySelector('[data-breadcrumb-sep]');
      if (bcParent) bcParent.remove();
      if (bcSep)    bcSep.remove();
    }

    var app     = document.querySelector('.la-app');
    var main    = document.querySelector('.la-main');
    var content = document.querySelector('.la-content');

    var sidebar = doc.querySelector('.la-sidebar');
    if (sidebar && app) app.insertBefore(sidebar, main);

    var topbar = doc.querySelector('.la-topbar');
    if (topbar && main) main.insertBefore(topbar, content);

    // Switch between full site nav (overview) and page section nav (topic pages)
    var siteNav  = document.getElementById('sg-site-nav');
    var pageNav  = document.getElementById('page-categories');
    if (PAGE.nav === 'page') {
      if (siteNav) siteNav.hidden = true;
      if (pageNav) { pageNav.hidden = false; pageNav.removeAttribute('hidden'); }
    } else {
      if (siteNav) siteNav.hidden = false;
      if (pageNav) pageNav.hidden = true;
    }

    setActive(PAGE.active);
    initScrollSpy();

    // Let app.js re-run sidebar-dependent setup now that the sidebar is in the DOM
    if (typeof window.sgInitShellFeatures === 'function') {
      window.sgInitShellFeatures();
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    fetch(B + 'base.html')
      .then(function (r) { return r.text(); })
      .then(injectShell)
      .catch(function (err) {
        console.warn('Vantage: could not load base.html.', err);
      });
  });
}());
