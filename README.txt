ECO SOLITARIO — CAPITOLO I CORRETTO — 7 SETTEMBRE 2026

AVVIO UNICO: index.html, che carica game.js?v=chapter1-20260907.
Le pagine alter-motion-v2/v3/v4.html rimandano ora al Capitolo I.
capitolo-2.html resta una pagina separata, non è il punto di avvio.

Su iPhone: apri l’URL HTTPS del sito in Safari e tocca Inizia.
Usa più dita per movimento + salto/arma. Pausa/Riprendi è in alto.
La vista orizzontale offre più spazio; i comandi funzionano anche in verticale.
Non aprire l’anteprima dello ZIP o del file HTML nell’app File per giocare.

Tastiera: Invio avvia; A/D o frecce muovono; W, freccia su o Spazio saltano;
La corsa è automatica tenendo una direzione; J spara; K usa la mazza; E radio; P/Esc pausa; R riavvia a fine partita.

INSTALLAZIONE NEL REPOSITORY
Carica i file estratti nella root del repository, sostituendo gli omonimi.
Non caricare soltanto lo ZIP: GitHub Pages non ne estrae il contenuto.
Mantieni gli asset PNG e gli altri file del repository.
Per GitHub Pages, la cartella pubblicata deve contenere questo index.html.
Non è necessario npm o un processo di compilazione.

Le vecchie istruzioni v0.9.6/v0.9.8 e eco-motion-fix.patch sono superate.
Non applicare vecchie patch dopo questa versione.
Anche chapter-one-iphone.patch è storico: non applicarlo sulla versione del 7 settembre.
Usa i file correnti di main insieme ai PNG originali.

TEST LOCALI
  node --check game.js
  node --check sw.js
  node --test motion.test.cjs
I test esercitano il codice effettivo in un ambiente DOM/canvas simulato.
Non equivalgono a una prova fisica su iPhone/Safari.

OFFLINE / AGGIORNAMENTI
Il nuovo service worker usa una cache dedicata e strategie network-first.
Apri una volta online per installare la cache. Se la vecchia app era rimasta
aperta, chiudila e riaprila online. Il caricamento offline è disponibile dopo
l’installazione riuscita del service worker; richiede HTTPS (o localhost).

PATCH 7 SETTEMBRE — CANDIDATA ALLA PROVA
Due pulsanti direzionali, corsa automatica; ad esaurimento stamina Alter cammina
fino al recupero del 35%, evitando alternanze rapide corsa/cammino.
Pulizia delle componenti laterali dello sprite durante il caricamento e piedi
allineati. Gli originali non vengono sovrascritti. Le pose originariamente
troncate non possono essere ricostruite dalla pulizia automatica.
Banditi con animazione derivata da Alter e colori diversi.
Jack e Dexter hanno ritratti procedurali provvisori, con bocca animata;
non sono riproduzioni delle immagini di riferimento delle conversazioni.
Dialoghi automatici a soglie di avanzamento, senza interrompere quelli dei pickup.
15 test simulati includono un attraversamento completo con comandi, senza teletrasporto.
La verifica su iPhone fisico resta da eseguire.

Verifica dell'atlante con canvas reale: escluse dalla corsa le celle 15–19,
che contengono figure troncate; usate le tre pose complete 12–14.
Escluse dalla mazza le pose 45 e 49 incoerenti o frammentate.
Per una corsa più ricca serviranno nuovi frame completi, non soltanto pulizia.
Il browser remoto non raggiunge localhost; nessun collaudo browser viene dichiarato.
