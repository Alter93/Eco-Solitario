# Verifica 07.09.4 — 7 settembre 2026

Base: main ec51b3a, caricamento della 07.09.3 integrato nel branch locale. La corsa approvata (alter-run-v3.png e preparazione delle sue otto pose) è conservata.

## Modifiche e risultati

- Alter fermo: immagine dedicata, rimossa la dipendenza dalla cella frammentata originale. Durante l'importazione viene conservata la componente connessa principale. La posa non cambia quando Alter resta fermo.
- Accovacciamento: tenere Freccia giù o il pulsante touch ▼; al rilascio Alter si rialza. Altezza di collisione da 64 a 40, piedi alla stessa quota. Alter resta sul posto mentre è accovacciato, recupera stamina e può sparare/usare la mazza. Il salto lo rialza prima dello stacco; premere giù in volo non restringe la sagoma. Pausa, perdita di focus e annullamento del tocco liberano il comando.
- Città: nuova immagine pixel art dalla tavola originale, dietro terreno, strutture e piattaforme esistenti. Scorrimento lento proporzionale alla camera, senza giunte ripetute. Lo sfondo precedente resta disponibile se l'immagine manca.

27 test superati: 22 su logica/input, 4 sugli asset raster effettivi, 1 sul service worker. Comando: node --test motion.test.cjs offline.test.cjs sprite.test.cjs. I test raster richiedono @napi-rs/canvas 0.1.100; gli altri richiedono solo Node.

Verificati piedi alla stessa quota, pressione/rilascio, arresto del movimento, salto da accovacciato, sparo e quota del proiettile, ritorno alla posa da fermo, touch cancel, blur e reset. Continuano a passare le verifiche su corsa, stamina, salute, armi, pickup, dialoghi, pausa e attraversamento simulato completo del capitolo.

Rendering con canvas reale controllati visivamente: posa da fermo e accovacciata, città, HUD e dialogo. Le anteprime sono rendering tecnici del motore, non screenshot di una partita browser. La verifica della cache usa una rete simulata.

## Verifiche ancora aperte

Partita manuale completa su PC e iPhone/Safari, comfort della nuova composizione grafica e dei comandi touch, aggiornamento reale della cache dopo pubblicazione. L'anteprima browser era bloccata dall'ambiente; non viene dichiarata una prova interattiva completa.

La camminata, il salto e le azioni armate in piedi usano ancora il vecchio atlante. La postura accovacciata ha armi sovrapposte essenziali, non nuove sequenze disegnate per ogni attacco. Questi aspetti restano oggetto di rifinitura artistica, senza bloccare la prova della patch richiesta.

La patch va caricata nella root del repository prima che il link pubblico mostri 07.09.4. Non è dichiarata una pubblicazione automatica.
