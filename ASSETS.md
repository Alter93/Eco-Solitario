# Asset attivi — Capitolo I 07.09.4

L'entry point `index.html` carica soltanto `game.js`.

| File | Uso effettivo |
| --- | --- |
| alter_master_sheet.png | Camminata, salto e armi; pose originali di riserva |
| alter-idle-v4.png | Nuova posa da fermo, una sagoma connessa |
| alter-crouch-v4.png | Accovacciamento, stessa linea dei piedi |
| city-v4.png | Sfondo cittadino pixel art con scorrimento lento |
| alter-run-v3.png | Otto pose di corsa, normalizzate in celle 128×128 con ancoraggio al busto |
| bandits-v2.png | 18 pose di tre nemici distinti; rimozione magenta e componenti connesse |
| radio-hosts-v2.png | Jack e Dexter, espressioni neutre e parlanti |
| style-board.jpeg | Tavola originale di direzione artistica, non caricata dal gioco |
| radio-studio.jpeg | Riferimento conservato, non caricato dal gioco |

`characters.js` è un esperimento storico non importato. Le precedenti indicazioni su `assets/alter-actions.png` e `assets/radio-hosts.png` non descrivevano il runtime presente e sono superate.
Le nuove immagini non richiedono librerie nel browser. Vite è facoltativo per sviluppo. Per i test raster installare separatamente `@napi-rs/canvas@0.1.100`, quindi eseguire `node --test sprite.test.cjs`.
