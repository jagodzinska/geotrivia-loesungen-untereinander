// ==UserScript==
// @name         Geotrivia Lösungen untereinander
// @namespace    jago/geotrivia-loesungen-untereinander
// @version      1.0.0
// @description  Zeigt auf geotrivia.com am Spielende alle Lösungsboxen untereinander auf einer Seite statt im Blätterer "‹ 1 / 8 ›" (Pfeile weg). Gilt für alle Spiele mit diesem Blätterer, z. B. GeoRankle, GeoPaint, GeoDecide und GeoConnections.
// @author       jago/claude
// @license      MIT
// @homepageURL  https://github.com/jagodzinska/geotrivia-loesungen-untereinander
// @supportURL   https://github.com/jagodzinska/geotrivia-loesungen-untereinander/issues
// @downloadURL  https://raw.githubusercontent.com/jagodzinska/geotrivia-loesungen-untereinander/main/geotrivia-loesungen-untereinander.user.js
// @updateURL    https://raw.githubusercontent.com/jagodzinska/geotrivia-loesungen-untereinander/main/geotrivia-loesungen-untereinander.user.js
// @match        https://geotrivia.com/*
// @icon         https://geotrivia.com/favicon.ico
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  if (window.top !== window.self) return; // nicht in Ad-iframes laufen

  // Seit dem Umbau (Sept. 2026) steht das Spielende aller Daily-Spiele in
  // `.daily-result-screen`; die Lösungen zeigt ein Blätterer: ein Track mit
  // ALLEN Lösungsboxen nebeneinander (style="width: 800%"), per transform
  // verschoben, darunter die Zeile "‹ 1 / 8 ›". Statt DOM umzubauen, markieren
  // wir Track, Navigation und die höhenbegrenzten Vorfahren mit eigenen Klassen
  // und kippen den Track per CSS in eine vertikale Spalte; React verwaltet das
  // DOM weiter. Rein per CSS geht es nicht ganz: das Mausrad-Freigeben und das
  // Entfernen von `inert` brauchen JS.
  const STYLE_ID = 'glu-style';
  if (document.getElementById(STYLE_ID)) return;

  const TRACK_CLASS = 'glu-track';
  const NAV_CLASS = 'glu-nav';
  const UNCLIP_CLASS = 'glu-unclip';

  const css = `
    /* Blätterer -> vertikale Liste: alle Boxen untereinander */
    .${TRACK_CLASS} {
      width: 100% !important;
      transform: none !important;
      flex-direction: column !important;
      gap: 1.25rem;
    }
    .${TRACK_CLASS} > * { width: 100% !important; }
    .${NAV_CLASS} { display: none !important; }
    /* feste Höhe/eigener Scrollbereich der Lösungsansicht aufheben, damit
       der äußere Ergebnis-Screen alles am Stück scrollt */
    .${UNCLIP_CLASS} {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
  `;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // Track = Kind des Blätterer-Rahmens (overflow-hidden + touch-pan-y) mit
  // prozentualer Inline-Breite; seine Kinder sind die einzelnen Boxen.
  function findTracks(screen) {
    return [
      ...screen.querySelectorAll('div.overflow-hidden.touch-pan-y > div[style*="width"]'),
    ].filter((t) => t.children.length > 0);
  }

  function stack() {
    const screen = document.querySelector('.daily-result-screen');
    if (!screen) return; // Spiel läuft noch
    // äußerer Scrollbereich des Ergebnis-Screens
    const scroll = [...screen.children].find(
      (el) => getComputedStyle(el).overflowY === 'auto',
    );

    for (const track of findTracks(screen)) {
      track.classList.add(TRACK_CLASS);
      // Nicht aktuelle Boxen sind inert (kein Hover/Markieren) – sie sind
      // jetzt alle sichtbar, also freigeben.
      for (const slide of track.children) slide.removeAttribute('inert');
      // "‹ 1 / 8 ›" direkt unter dem Rahmen
      const nav = track.parentElement.nextElementSibling;
      if (nav && nav.querySelectorAll('button').length === 2) nav.classList.add(NAV_CLASS);

      // Lösungsansicht und Ergebnis-Übersicht liegen teils übereinander in
      // einer Grid-Zelle fester Höhe; die gerade verborgene hat
      // aria-hidden="true". Nur solange die Lösung sichtbar ist, Höhe/Scroll
      // aufheben – sonst bliebe beim Zurückschalten ein großes Loch.
      const visible = !track.closest('[aria-hidden="true"]');
      for (let el = track.parentElement; el && el !== scroll && el !== screen; el = el.parentElement) {
        el.classList.toggle(UNCLIP_CLASS, visible);
      }
    }
    // Die Seite blockiert auf dem Desktop je nach Zustand das Mausrad außerhalb
    // von [data-allow-wheel] – ohne das Attribut wäre unten nichts erreichbar.
    if (scroll) scroll.setAttribute('data-allow-wheel', 'true');
  }

  let pending = 0;
  const schedule = () => {
    clearTimeout(pending);
    pending = setTimeout(stack, 200);
  };

  schedule();
  // React baut den Endscreen nach; deshalb bei DOM-Änderungen neu auswerten.
  // Wir beobachten childList und aria-hidden (Wechsel zwischen Ergebnis und
  // Lösung); unsere eigenen Klassen- und inert-Änderungen lösen also keine
  // Endlosschleife aus.
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-hidden'],
  });
})();
