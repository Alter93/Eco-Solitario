# Verifica 07.09.3 — 7 settembre 2026

Base remota verificata: main d40a6c9, integrata nella revisione locale. Su quel commit il codice 07.09.2 era presente, ma mancavano bandits-v2.png e radio-hosts-v2.png nei percorsi assets dichiarati dal gioco, e i riferimenti grafici nella cartella references. La nuova distribuzione contiene tutti i file nella root: non richiede il caricamento di sottocartelle.

## Risultati

23 test superati: 19 di logica/input, 3 con raster reali e 1 sul service worker. Eseguiti con `node --test motion.test.cjs offline.test.cjs sprite.test.cjs` (il test raster richiede @napi-rs/canvas 0.1.100).

La corsa usa otto immagini distinte estratte dalla nuova tavola, con sfondo magenta rimosso, scala comune e ancoraggio del busto. Le celle di 128×128 conservano tutta l'estensione delle gambe. Ritmo legato alla distanza percorsa; velocità 285 e fisica invariate. Le pose originali restano disponibili se la nuova immagine non si carica.

Verificati corsa → sparo → corsa, corsa → mazza, corsa → salto → corsa, selezione delle otto fasi e mantenimento della velocità. Restano superati i controlli precedenti su stamina, multitouch, pausa, background, collisioni, pickup, salute, armi, morte, reset e attraversamento completo simulato senza teletrasporto. Il controllo della cache usa una rete simulata.

La sequenza estratta è stata renderizzata con canvas reale e controllata visivamente. Il file run-check-v3.png è un rendering tecnico, non uno screenshot browser. Otto immagini diverse non garantiscono da sole una perfetta biomeccanica: valutare il ciclo in movimento sul dispositivo.

## Blocchi ancora aperti

- Partita manuale completa della nuova versione e prova su iPhone/Safari. L'accesso browser all'anteprima era bloccato da ERR_BLOCKED_BY_CLIENT; questa verifica non è dichiarata eseguita. I test simulati non la sostituiscono.
- Pubblicazione: applicare i file estratti dello ZIP nella root del repository e verificare la versione 07.09.3. Il precedente errore 403 di scrittura GitHub impedisce di dichiarare una pubblicazione automatica.
- Coerenza delle animazioni: corsa più articolata, ma salto, camminata e armi usano ancora la tavola precedente. Le azioni armate non hanno ancora un ciclo completo di gambe durante la corsa. La transizione funzionale passa i test; l'uniformità artistica resta da valutare nel playtest.

Giudizio: candidata alla prova, con un miglioramento concreto del ciclo di corsa e una correzione necessaria alla distribuzione degli asset. Non certificata come versione definitiva.
