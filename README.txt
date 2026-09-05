ECO SOLITARIO v0.9.6 — ALTER PERFECT MOTION

FOCUS: chiudere il movimento di Alter prima di espandere il mondo.

FIX PRINCIPALI
- idle realmente fermo: un solo frame, nessun respiro/oscillazione automatica
- eliminato il cambio walk/run che poteva produrre salti di posa durante l'accelerazione
- camminata sincronizzata alla distanza percorsa, non al refresh rate dello schermo
- joystick orizzontale analogico con dead-zone e accelerazione/decelerazione progressive
- inversione di marcia più rapida ma senza flip mentre il corpo sta ancora scivolando
- posizione agganciata ai pixel fisici del display per ridurre micro-jitter su iPhone
- rendering di Alter su canvas: viene ritagliata una sola cella 96x128 per volta
- il canvas impedisce che i frame vicini dello sprite sheet compaiano ai bordi durante i transform GPU
- fisica invariata a passo fisso 120 Hz con rendering interpolato
- salto, atterraggio, sparo, mazza e radio restano disponibili
- cache PWA aggiornata a eco-v096-alter-perfect-motion

NOTA
Questa patch non espande ancora il mondo e non aggiunge Dexter a schermo.
Il prossimo passaggio, dopo la verifica visiva di Alter, sarà camera/world scrolling e poi radio con Dexter.

STAY ON THE AIR.
