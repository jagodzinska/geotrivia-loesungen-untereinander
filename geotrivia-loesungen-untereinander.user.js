// ==UserScript==
// @name         Geotrivia Lösungen untereinander
// @namespace    jago/geotrivia-loesungen-untereinander
// @version      1.1.1
// @description  Zeigt auf geotrivia.com am Spielende alle Lösungsboxen auf einmal statt im Blätterer "‹ 1 / 8 ›": auf breiten Fenstern als Spalte rechts neben dem Ergebnis, sonst untereinander. Gilt für alle Spiele mit diesem Blätterer, z. B. GeoRankle, GeoPaint, GeoDecide und GeoConnections.
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
  // `.daily-result-screen` (500 px breit, zentriert); die Lösungen zeigt ein
  // Blätterer: ein Track mit ALLEN Lösungsboxen nebeneinander
  // (style="width: 800%"), per transform verschoben, darunter "‹ 1 / 8 ›".
  //
  // Je nach Spiel steckt der Blätterer direkt in der Ergebnisansicht
  // (GeoConnections) oder in einer eigenen Lösungsansicht, die per
  // "Lösung ansehen" / "Zurück zum Ergebnis" umgeschaltet wird. Beide Ansichten
  // liegen in DERSELBEN Grid-Zelle übereinander, die verborgene ist nur
  // `invisible` + aria-hidden – sie bestimmt die Höhe also mit.
  //
  // Breites Fenster: Der Track wird absolut neben den Ergebnis-Screen gesetzt
  // (Platz des QR-Codes), mit eigenem Scrollbereich. Im Grid bleibt nichts
  // Hohes zurück, der Umschalter ist überflüssig und wird ausgeblendet.
  // Schmales Fenster: Track als Spalte im Fluss; solange seine Ansicht
  // verborgen ist, wird er ausgeblendet, sonst bliebe ein großes Loch.
  //
  // Wir bauen kein DOM um, sondern setzen nur Klassen; React verwaltet das DOM
  // weiter. Mausrad-Freigabe und Entfernen von `inert` brauchen JS.
  const STYLE_ID = 'glu-style';
  if (document.getElementById(STYLE_ID)) return;

  const TRACK_CLASS = 'glu-track';
  const FRAME_CLASS = 'glu-frame';
  const NAV_CLASS = 'glu-nav';
  const TOGGLE_CLASS = 'glu-toggle';
  const UNCLIP_CLASS = 'glu-unclip';
  const SCREEN_CLASS = 'glu-screen';
  const GRID_CLASS = 'glu-grid';
  const WIDE = '(min-width: 1100px)';

  const css = `
    /* Blätterer -> vertikale Liste: alle Boxen untereinander */
    .${TRACK_CLASS} {
      transform: none !important;
      flex-direction: column !important;
      gap: 1.25rem;
    }
    .${TRACK_CLASS} > * { width: 100% !important; }
    .${NAV_CLASS} { display: none !important; }

    /* Fehler der Seite (GeoRoute): Die Kartenbeschriftung "Russland / Ziel"
       hat inline visibility: visible und scheint so aus der verborgenen
       Lösungsansicht ins Ergebnis durch. */
    .daily-result-screen [aria-hidden="true"].invisible [style*="visibility"] {
      visibility: hidden !important;
    }

    @media ${WIDE} {
      /* Spalte rechts neben dem 500 px breiten Ergebnis-Screen. Rahmen und
         Ansichten sind nicht positioniert, also bezieht sich "absolute" auf
         .daily-result-screen und entkommt deren overflow-Beschnitt. */
      .${FRAME_CLASS} {
        position: static !important;
        min-height: 0 !important;
      }
      .${TRACK_CLASS} {
        position: absolute !important;
        left: 100%;
        top: 4.5rem;          /* unter dem Spielkopf (h-18) */
        bottom: 0;
        margin-left: 1.5rem;
        width: min(22rem, calc(50vw - 250px - 2.5rem)) !important;
        height: auto !important;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 0.5rem 0.25rem 1.5rem;
        justify-content: flex-start;
        /* liegt evtl. in der verborgenen Lösungsansicht */
        visibility: visible !important;
        pointer-events: auto !important;
      }
      .${TRACK_CLASS} > * { flex: none !important; }
      .${TOGGLE_CLASS} { display: none !important; }
      /* übrige Buttons der Zeile (Teilen) füllen die Lücke */
      .${TOGGLE_CLASS} ~ * { flex: 1 1 0 !important; }
      /* Mindesthöhe war für den Blätterer gedacht, der jetzt daneben steht */
      .${GRID_CLASS} { min-height: 0 !important; }
      .${SCREEN_CLASS} > aside { display: none !important; } /* QR-Code */
    }

    @media not ${WIDE} {
      .${TRACK_CLASS} { width: 100% !important; }
      [aria-hidden="true"] .${TRACK_CLASS} { display: none !important; }
      /* feste Höhe/eigener Scrollbereich der Lösungsansicht aufheben, damit
         der äußere Ergebnis-Screen alles am Stück scrollt */
      .${UNCLIP_CLASS} {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
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

    const tracks = findTracks(screen);
    // QR-Code nur weichen lassen, wenn es eine Lösungsspalte gibt
    screen.classList.toggle(SCREEN_CLASS, tracks.length > 0);
    for (const track of tracks) {
      const frame = track.parentElement;
      track.classList.add(TRACK_CLASS);
      frame.classList.add(FRAME_CLASS);
      // Nicht aktuelle Boxen sind inert (kein Hover/Markieren) – sie sind
      // jetzt alle sichtbar, also freigeben.
      for (const slide of track.children) slide.removeAttribute('inert');
      // "‹ 1 / 8 ›" direkt unter dem Rahmen
      const nav = frame.nextElementSibling;
      if (nav && nav.querySelectorAll('button').length === 2) nav.classList.add(NAV_CLASS);

      // Ansicht (Grid-Zelle), in der der Blätterer steckt. Ist es nicht die
      // erste, gibt es eine eigene Lösungsansicht; deren Umschalter
      // ("Lösung ansehen" / "Zurück zum Ergebnis") ist der erste Button mit
      // Text in der Zeile direkt unter dem Grid.
      let view = frame;
      while (view.parentElement && !view.parentElement.classList.contains('grid')) view = view.parentElement;
      const grid = view.parentElement;
      if (grid) grid.classList.add(GRID_CLASS);
      if (grid && view !== grid.firstElementChild) {
        const toggle = [...(grid.nextElementSibling?.querySelectorAll('button') ?? [])].find(
          (b) => b.textContent.trim(),
        );
        if (toggle) toggle.classList.add(TOGGLE_CLASS);
        // Auf breitem Fenster immer die Ergebnisansicht zeigen (falls die
        // Seite bei schmalem Fenster schon auf "Lösung" umgeschaltet war).
        if (toggle && matchMedia(WIDE).matches && view.getAttribute('aria-hidden') === 'false') toggle.click();
      }

      // Nur fürs schmale Layout (CSS greift dort): Höhe/Scroll der sichtbaren
      // Lösungsansicht aufheben.
      const visible = !track.closest('[aria-hidden="true"]');
      for (let el = frame; el && el !== scroll && el !== screen; el = el.parentElement) {
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
  matchMedia(WIDE).addEventListener('change', schedule);
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
