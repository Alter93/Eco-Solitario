ECO SOLITARIO — CAPITOLO I CORRETTO — 7 SETTEMBRE 2026

AVVIO UNICO: index.html, che carica game.js?v=chapter1-20260907d.
Le pagine alter-motion-v2/v3/v4.html rimandano ora al Capitolo I.
capitolo-2.html resta una pagina separata, non è il punto di avvio.

Su iPhone: apri l’URL HTTPS del sito in Safari e tocca Inizia.
Usa più dita per movimento + salto/arma. Pausa/Riprendi è in alto.
La vista orizzontale offre più spazio; i comandi funzionano anche in verticale.
Non aprire l’anteprima dello ZIP o del file HTML nell’app File per giocare.

Tastiera: Invio avvia; A/D o frecce muovono; W, freccia su o Spazio saltano;
La corsa è automatica tenendo una direzione; J spara; K usa pugni e calci; E radio; P/Esc pausa; R riavvia a fine partita.

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

REVISIONE 07.09.5
Banditi con sagome indipendenti; ritratti Jack/Dexter dalla tavola recuperata.
Pulizia di Alter e radio una battuta per pressione. Fisica invariata.
Consulta ART-DIRECTION.md per i riferimenti permanenti e PLAYTEST.md per risultati e limiti.

Corsa di Alter: otto pose nuove in alter-run-v3.png, con recupero delle tre pose originali se il file non è disponibile.
Tutte le immagini attive sono ora nella root insieme a index.html.

REVISIONE 07.09.5: posa da fermo integra; città pixel art; tieni Freccia giù (o ▼ sul touch) per accovacciarti. Al rilascio Alter si rialza. Il salto rialza Alter prima dello stacco. Mentre è accovacciato resta sul posto e può usare le armi.

La città panoramica mantiene il rapporto originale e scorre lentamente con la camera.
I colpi riusciti caricano l'aura di Alter: a carica piena il colpo seguente attiva
OVERDRIVE, distorce la scena e mette KO il nemico in un colpo.
La mazza è stata sostituita dal tasto K / Pugno: il ciclo comprende pugni, ginocchio e calci.
Il danno arriva sul fotogramma d'impatto, così l'animazione e la hitbox restano sincronizzate.
