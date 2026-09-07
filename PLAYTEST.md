# Verifica 07.09.2 — 7 settembre 2026

Candidata alla prova, preparata sulla base main d9e1083. Non dichiarata pubblicata.

## Risultati

21 test automatici superati: 18 di logica/input, 2 sugli asset raster reali, 1 sul service worker. I test includono movimento a 30/60/120 Hz, stamina, multitouch, salto singolo, pausa/background, collisioni, armi, munizioni, salute, tutti i pickup, morte, riavvio, radio e attraversamento simulato fino alla torre senza teletrasporto. Il test offline verifica cache e versioni con rete simulata, non una vera installazione Safari.

Rendering del codice effettivo con canvas reale controllato visivamente: 18 sagome nemiche, celle usate da Alter e scena con HUD, dialogo e ritratti. Magenta assente nelle pose estratte; piedi allineati. Questi rendering non sono screenshot di una partita browser.

Correzioni: pulizia dei frammenti fuori sagoma di Alter, ancoraggio al busto, banditi indipendenti, ritratti derivati dalla tavola, separazione barre/contatori, radio una battuta per pressione, morte terminale prima di pickup/completamento nello stesso aggiornamento. Velocità e fisica conservate.

## Blocchi ancora aperti

- Prova interattiva della nuova versione nel browser e su iPhone/Safari: l'anteprima è avviata ma il browser remoto restituisce ERR_BLOCKED_BY_CLIENT. Non è un difetto del gioco dimostrato. Da verificare tocco prolungato, rotazione, audio se aggiunto in futuro, cache offline e comfort di lettura su dispositivo.
- Pubblicazione della patch: il connettore GitHub aveva rifiutato la scrittura con 403 Resource not accessible by integration. Lo ZIP deve essere applicato al repository prima che il link pubblico mostri questi cambiamenti.
- Rifinitura artistica di Alter: le celle originali 15–19 sono troncate. La corsa usa tre pose complete; le azioni armate mantengono un'animazione essenziale. Servono nuovi frame coerenti per una qualità finale, non ulteriori filtri.

Giudizio: base funzionale promettente, identità dei nemici e dei radiofonici più chiara. Buona candidata per una prova privata; non ancora collaudata per una condivisione come versione definitiva.

## Ripetere i controlli

`node --test motion.test.cjs offline.test.cjs`

Con @napi-rs/canvas 0.1.100 disponibile: `node --test sprite.test.cjs`.

`node --check game.js` e `node --check sw.js`.
