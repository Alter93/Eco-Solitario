# Diagnosi e correzione del Capitolo I

Analizzato il branch main al commit `2efc209`, upload del 6 settembre 2026,
oltre agli upload del 5 settembre. Non è stato possibile scrivere su GitHub:
l’integrazione restituisce 403 Resource not accessible by integration.

| File | Stato trovato | Risultato della correzione |
| --- | --- | --- |
| index.html | Gioco completo incorporato, senza riferimento a game.js | Unico ingresso, carica il motore condiviso |
| game.js | Demo con DOM player/joy assente nel Capitolo I | Motore del Capitolo I con mondo, radio e combattimento |
| alter-motion-v2/v3/v4.html | Demo indipendenti, movimento limitato allo schermo | Collegamenti alla build canonica |
| INSTALLA.txt / APPLICA_PATCH.txt | Istruzioni per versioni diverse dall’index corrente | Istruzioni coerenti con la nuova build |
| sw.js | Cache v098, asset e script della vecchia demo | Cache del Capitolo I, script versionato, niente ignoreSearch sul codice |

## Problemi confermati nel codice

- La tastiera non impostava started=true nel Capitolo I.
- pointerup cercava il comando dalla posizione finale del dito, non dal pointerId.
- Nessuna pulizia dell’input su blur/visibilitychange nel Capitolo I.
- Accelerazione, frenata, consumo stamina e inseguimento nemici dipendevano dal frame rate.
- drawPlayer disegnava sempre la stessa posa: lo sprite non veniva usato.
- Tenere premuto salto provocava nuovi salti a ogni atterraggio.
- Le demo e la patch game.js non condividevano il motore del gioco principale.

## Intervento

Avvio da pulsante, tocco o tastiera; controlli DOM da almeno 48 px con safe area;
multitocco indipendente, rilascio/cancellazione/capture loss; pausa dopo cambio app;
passo fisso a 120 Hz con interpolazione del personaggio e della camera;
camminata/corsa legate alla distanza, idle fermo, salto e armi separati.
Ritaglio preciso di una cella 96x128 dello sprite originale con piedi ancorati.
Nessuna nuova immagine generata o fotogramma miscelato.
In caso di immagine mancante resta il personaggio procedurale giocabile.
Conservati mappa, piattaforme, salute, stamina, munizioni, nemici, pickup e dialoghi.

## Verifica e limiti

13 test automatici sul codice effettivo, inclusi boot/contratto HTML, asset,
30/60/120 fps, multitocco, perdita capture, salto, sospensione, rotazione,
ritaglio sprite, immagini mancanti, collisioni, armi e completamento/riavvio.
Controllo sintattico JavaScript e controllo whitespace Git.
Il browser remoto non può raggiungere il server locale di prova: nessuna verifica
visiva nel browser o su un iPhone fisico viene dichiarata.
La fluidità artistica resta limitata ai fotogrammi originali disponibili.
