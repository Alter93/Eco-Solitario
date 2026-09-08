# Verifica 08.09.1 — combattimento semplice

Rimossi carica aura, barra, effetti e finisher OVERDRIVE. Danno costante: 26 pistola, 34 corpo a corpo.
Il danno corpo a corpo viene aggiornato dalla simulazione al momento d’impatto, anche dopo il rilascio del pulsante. Tenendo premuto, gli attacchi continuano a ripetersi. La posa accovacciata ha priorità sull’atlante corpo a corpo in piedi.

Verifica eseguita: node --test motion.test.cjs offline.test.cjs — 27 test superati.
Superati anche node --check game.js, node --check sw.js e git diff --check.
Nuove coperture: sei colpi consecutivi senza finisher; tocchi brevi ripetuti per pugni/calci, un solo impatto per attacco; attacco accovacciato con posa bassa.
Non eseguiti playtest fisico su iPhone/Safari né verifica artistica raster in questa revisione. I test simulati non certificano il risultato sul dispositivo.

---
## Resoconto storico della revisione precedente (aura ora rimossa)

# Verifica 07.09.5 — 7 settembre 2026

La revisione successiva aggiunge una carica d'impatto: i colpi riusciti costruiscono l'aura, con effetti di distorsione crescenti; a carica completa il colpo seguente mette KO il nemico e azzera la carica. La nuova interfaccia mostra la barra AURA e OVERDRIVE.

La carica cresce di 0,25 per ogni colpo che raggiunge un nemico, quindi servono quattro colpi riusciti. I colpi a vuoto non modificano la carica. Il finisher vale sia per pistola sia per pugni/calci e produce un impulso visivo e uno scuotimento più forte.

La mazza è stata rimossa. K e il pulsante Pugno usano otto pose dedicate: guardia, jab, diretto, recupero, ginocchio e tre fasi di calcio. Pistola e corpo a corpo condividono la stessa carica aura e possono attivare OVERDRIVE.

Il corpo a corpo applica il danno sul fotogramma d'impatto, dopo la guardia iniziale. Le attivazioni alternano la sequenza pugni e la sequenza ginocchio/calci.

Base: main ec51b3a, caricamento della 07.09.3 integrato nel branch locale. La corsa approvata (alter-run-v3.png e preparazione delle sue otto pose) è conservata.

## Modifiche e risultati

- Alter fermo: immagine dedicata, rimossa la dipendenza dalla cella frammentata originale. Durante l'importazione viene conservata la componente connessa principale. La posa non cambia quando Alter resta fermo.
- Accovacciamento: tenere Freccia giù o il pulsante touch ▼; al rilascio Alter si rialza. Altezza di collisione da 64 a 40, piedi alla stessa quota. Alter resta sul posto mentre è accovacciato, recupera stamina e può sparare o colpire. Il salto lo rialza prima dello stacco; premere giù in volo non restringe la sagoma. Pausa, perdita di focus e annullamento del tocco liberano il comando.
- Città: nuova immagine pixel art dalla tavola originale, dietro terreno, strutture e piattaforme esistenti. Scorrimento lento proporzionale alla camera, senza giunte ripetute. Lo sfondo precedente resta disponibile se l'immagine manca.

27 test superati: 22 su logica/input, 4 sugli asset raster effettivi, 1 sul service worker. Comando: node --test motion.test.cjs offline.test.cjs sprite.test.cjs. I test raster richiedono @napi-rs/canvas 0.1.100; gli altri richiedono solo Node.

Verificati piedi alla stessa quota, pressione/rilascio, arresto del movimento, salto da accovacciato, sparo e quota del proiettile, ritorno alla posa da fermo, touch cancel, blur e reset. Continuano a passare le verifiche su corsa, stamina, salute, armi, pickup, dialoghi, pausa e attraversamento simulato completo del capitolo.

Rendering con canvas reale controllati visivamente: posa da fermo e accovacciata, città, HUD e dialogo. Le anteprime sono rendering tecnici del motore, non screenshot di una partita browser. La verifica della cache usa una rete simulata.

## Verifiche ancora aperte

Partita manuale completa su PC e iPhone/Safari, comfort della nuova composizione grafica e dei comandi touch, aggiornamento reale della cache dopo pubblicazione. L'anteprima browser era bloccata dall'ambiente; non viene dichiarata una prova interattiva completa.

La camminata, il salto e le azioni armate in piedi usano ancora il vecchio atlante. La postura accovacciata ha armi sovrapposte essenziali, non nuove sequenze disegnate per ogni attacco. Questi aspetti restano oggetto di rifinitura artistica, senza bloccare la prova della patch richiesta.

La patch va caricata nella root del repository prima che il link pubblico mostri 07.09.5. Non è dichiarata una pubblicazione automatica.

Check-up completo: corretto il dimensionamento dello sfondo city-v4, che prima risultava più stretto del viewport e non seguiva la camera. Ora mantiene il rapporto panoramico e scorre lentamente durante l’esplorazione.
