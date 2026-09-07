ECO SOLITARIO — CAPITOLO I — v1.1 — 6 SETTEMBRE 2026

AVVIO
Apri index.html attraverso un server web HTTPS (GitHub Pages).
Mantieni insieme index.html, game.js, characters.js, sw.js, manifest.json,
le icone e la cartella assets/ con alter-actions.png e radio-hosts.png.
Non serve npm o una compilazione per giocare.

CONTROLLI
Tieni premuto sinistra/destra per correre; rilascia per frenare.
Non esiste più un comando separato per la corsa.
Salto, pistola e bastone funzionano anche mentre corri, con più dita.
Tastiera: A/D o frecce; Spazio/W/su salto; J pistola; K bastone;
E radio; P/Esc pausa; R per ricominciare dopo il finale.
La corsa è libera. L'energia viene usata dal bastone, poi si rigenera.

NOVITÀ
32 pose di Alter: corsa, corsa con pistola, corsa con bastone, idle,
salto, caduta, atterraggio, tre fasi del colpo e reazione al danno.
Le figure sono estratte per connessione dei pixel, anche quando un'arma
supera la griglia, ripulite dai residui trasparenti e allineate al corpo.
Banditi animati con lo stesso atlante e tre palette distinte.
Attacchi anticipati visivamente; banditi con pistola sparano proiettili.
Ritratti di Jack e Dexter in alto e dialoghi automatici lungo il percorso.
Le battute entrano in coda e non si ripetono tornando indietro.

AGGIORNAMENTO
Carica i file della stessa versione, inclusa la cartella assets/.
La nuova cache è eco-v110-chapter1-20260906b. Riapri online dopo l'upload.
NON applicare eco-motion-fix.patch o chapter-one-iphone.patch: sono storiche.
Gli asset originali e il Capitolo II sono conservati.

VERIFICHE
node --check game.js
node --check characters.js
node --check sw.js
node --test motion.test.cjs
17 test sul codice effettivo con DOM/canvas simulati; controllo separato
con canvas reale delle 32 pose importate e dei bordi trasparenti.
Nessuna prova dichiarata su iPhone fisico.
