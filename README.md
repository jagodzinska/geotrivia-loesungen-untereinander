# Geotrivia Lösungen untereinander

Tampermonkey-Userscript: `geotrivia-loesungen-untereinander.user.js` — für <https://geotrivia.com/>

Am Spielende zeigt geotrivia die Lösungen in einem Blätterer („‹ 1 / 8 ›“), in
dem man jede Box einzeln durchklicken muss. Das Skript zeigt stattdessen alle
Lösungsboxen auf einmal und blendet die Pfeile aus:

- **Breites Fenster (ab 1100 px):** als Spalte rechts neben dem Ergebnis (statt
  des QR-Codes), mit eigenem Scrollbereich. Ergebnis, Lösungen und „Weiter:
  …“ sind ohne Scrollen sichtbar; „Lösung ansehen“ entfällt.
- **Schmales Fenster:** untereinander in der Lösungsansicht, wie gehabt.

Es gilt für jedes Spiel mit diesem Blätterer, z. B. GeoRankle, GeoPaint,
GeoDecide und GeoConnections.

## Installation

Bei installiertem Tampermonkey diese URL im Browser öffnen — der Installations-
Dialog geht dann von selbst auf:

<https://raw.githubusercontent.com/jagodzinska/geotrivia-loesungen-untereinander/main/geotrivia-loesungen-untereinander.user.js>

`@updateURL`/`@downloadURL` zeigen auf dieselbe Datei, Tampermonkey holt sich
Updates also automatisch von `main`. Dafür muss die `@version` im Header bei
jeder Änderung hochgezählt werden.

## Wie es funktioniert

Der Blätterer ist ein Rahmen (`overflow-hidden touch-pan-y`) mit einem Track,
der alle Boxen nebeneinander enthält (`style="width: 800%"`) und per
`transform` verschoben wird. Das Skript baut kein DOM um, sondern markiert
Track, Navigation und die höhenbegrenzten Vorfahren mit eigenen Klassen und
kippt den Track per CSS in eine Spalte; React verwaltet das DOM weiter.

Ergebnis- und Lösungsansicht liegen in derselben Grid-Zelle übereinander; die
verborgene ist nur `invisible` und bestimmt die Höhe mit. Bis 1.0.0 machte die
lange Lösungsspalte deshalb auch die Ergebnisansicht hoch (viel Leerraum,
Scrollen bis zum „Weiter“). Seit 1.1.0 steht der Track auf breiten Fenstern
`position: absolute` neben `.daily-result-screen` (Rahmen auf `static`, damit
er dem `overflow` entkommt); auf schmalen ist er ausgeblendet, solange seine
Ansicht `aria-hidden` ist.

Zwei Dinge gehen nicht per CSS und laufen deshalb über JavaScript:

- Die Seite sperrt auf dem Desktop das Mausrad außerhalb von
  `[data-allow-wheel]`; das Skript setzt das Attribut am Scrollbereich des
  Ergebnis-Screens.
- Nicht aktuelle Boxen sind `inert`; da jetzt alle sichtbar sind, wird das
  Attribut entfernt.

Ein `MutationObserver` wendet das bei jedem Neuaufbau des Ergebnis-Screens
erneut an.
