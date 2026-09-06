ECO SOLITARIO — CAPITOLO I CORRETTO — 6 SETTEMBRE 2026

AVVIO UNICO: index.html, che carica game.js?v=chapter1-20260906.
Le pagine alter-motion-v2/v3/v4.html rimandano ora al Capitolo I.
capitolo-2.html resta una pagina separata, non è il punto di avvio.

Su iPhone: apri l’URL HTTPS del sito in Safari e tocca Inizia.
Usa più dita per movimento + salto/arma/corsa. Pausa/Riprendi è in alto.
La vista orizzontale offre più spazio; i comandi funzionano anche in verticale.
Non aprire l’anteprima dello ZIP o del file HTML nell’app File per giocare.

Tastiera: Invio avvia; A/D o frecce muovono; W, freccia su o Spazio saltano;
Shift corre; J spara; K usa la mazza; E radio; P/Esc pausa; R riavvia a fine partita.

INSTALLAZIONE NEL REPOSITORY
Carica i file estratti nella root del repository, sostituendo gli omonimi.
Non caricare soltanto lo ZIP: GitHub Pages non ne estrae il contenuto.
Mantieni gli asset PNG e gli altri file del repository.
Per GitHub Pages, la cartella pubblicata deve contenere questo index.html.
Non è necessario npm o un processo di compilazione.

Le vecchie istruzioni v0.9.6/v0.9.8 e eco-motion-fix.patch sono superate.
Non applicare vecchie patch dopo questa versione.
Per un checkout Git, il pacchetto contiene anche chapter-one-iphone.patch:
  git apply --check chapter-one-iphone.patch
  git apply chapter-one-iphone.patch
Usare la patch OPPURE sostituire i file, non entrambi.

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
