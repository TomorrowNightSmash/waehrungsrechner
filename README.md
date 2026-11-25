# Währungsrechner

Das Projekt entstand als Gruppenarbeit an der HFT Stuttgart. Ziel war es, Wechselkurse über REST-Schnittstellen abzurufen, Währungen umzurechnen und Kursverläufe darzustellen. Über `postMessage` kann der Rechner auch in eine andere Webseite eingebunden werden.

- [Währungsrechner](index.html)
- [PostMessage-Testseite](test.html)

Die Veröffentlichungsversion verwendet die [Frankfurter API](https://frankfurter.dev/) (EZB-Referenzkurse). Dafür ist kein API-Schlüssel nötig. Die ursprüngliche Version nutzte zwei API-Anbieter und ein Candlestick-Diagramm; die öffentliche Version zeigt stattdessen tägliche Referenzkurse als Linie. Das sind keine Echtzeit-Börsenkurse. Bei fehlender Internetverbindung lässt sich der Rechner mit ausdrücklich gekennzeichneten Beispieldaten testen.

Live-Demo nach Aktivierung von GitHub Pages: [Währungsrechner](https://tomorrownightsmash.github.io/waehrungsrechner/).

## Lokal starten

```bash
python -m http.server 8000
```

Danach `http://localhost:8000` öffnen. Ein Build-Schritt ist nicht nötig. Die Testseite ist unter `/test.html` erreichbar.

## Einbindung per postMessage

Die Elternseite sendet z. B.:

```js
iframe.contentWindow.postMessage({
  type: 'getFxRates',
  requestId: 1,
  payload: { from: 'EUR', to: 'USD', period: 30 }
}, location.origin);
```

Die Antwort `fxData` enthält u. a. `base`, `quote`, `rate`, `rates`, `date`, `history` (Datum und Kurs), `sample` und `timestamp`. Bei Fehlern kommt `fxError`. `setCurrency` unterstützt dieselben Parameter. Die Antwort hat dieselbe `requestId`. Der Rechner akzeptiert standardmäßig nur Nachrichten von seiner gleichnamigen Origin und seinem Elternfenster. Für eine andere Eltern-Origin ist `?parentOrigin=https%3A%2F%2Fexample.org` explizit anzugeben; der Sender muss auch die Ziel-Origin exakt setzen.

## Tests

```bash
npm test
```

Die Node-Tests prüfen Umrechnung, Eingaben, Beispielkurse und REST-Antworten mit simuliertem Netzwerk. Die Originaldateien ohne Schlüssel liegen zu Vergleichszwecken als Text im Ordner `archive/` (nicht als ausführbare Demo).

Technik: HTML, CSS, JavaScript, Fetch API, REST, SVG, postMessage.
