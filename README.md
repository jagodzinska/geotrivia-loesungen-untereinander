# Geotrivia Lösungen untereinander

Tampermonkey-Userscript: `geotrivia-loesungen-untereinander.user.js` — für <https://geotrivia.com/>

Am Spielende zeigt geotrivia die Lösungen in einem Blätterer („‹ 1 / 8 ›“), in
dem man jede Box einzeln durchklicken muss. Das Skript stellt stattdessen alle
Lösungsboxen untereinander auf eine Seite und blendet die Pfeile aus. Es gilt
für jedes Spiel mit diesem Blätterer, z. B. GeoRankle, GeoPaint, GeoDecide und
GeoConnections.

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

Zwei Dinge gehen nicht per CSS und laufen deshalb über JavaScript:

- Die Seite sperrt auf dem Desktop das Mausrad außerhalb von
  `[data-allow-wheel]`; das Skript setzt das Attribut am Scrollbereich des
  Ergebnis-Screens.
- Nicht aktuelle Boxen sind `inert`; da jetzt alle sichtbar sind, wird das
  Attribut entfernt.

Ein `MutationObserver` wendet das bei jedem Neuaufbau des Ergebnis-Screens
erneut an.
