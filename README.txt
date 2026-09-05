ECO SOLITARIO v0.9.8 — ALTER MOTION LOCK

FOCUS: chiudere il movimento di Alter al 100% prima di riaprire il mondo.

PATCH PRINCIPALI
- idle bloccato su un solo frame: nessuna oscillazione quando Alter è fermo
- rendering su canvas 96x128: viene disegnata una sola cella dello sprite sheet alla volta
- eliminato il bleed dei frame laterali tipico del background-position durante i transform GPU
- fisica a passo fisso 120 Hz con rendering interpolato
- movimento indipendente da 30/60/120 Hz
- camminata e corsa sincronizzate alla distanza percorsa, non al tempo dello schermo
- fase del passo conservata nel passaggio walk/run, così le gambe non saltano posa
- joystick realmente analogico con dead-zone 12%
- accelerazione, frenata e inversione separate per ridurre scatti e slittamenti
- direzione grafica cambia solo quando la velocità reale ha davvero invertito segno
- posizione agganciata ai pixel fisici del display per ridurre shimmer su iPhone
- stop finale a velocità esattamente zero
- salto, aria, caduta e atterraggio restano separati
- sparo, mazza e danno mantengono le sequenze complete
- cache PWA aggiornata a eco-v098-alter-motion-lock
- build attiva ripulita: index.html usa game.js?v=098, senza doppia logica inline

ORDINE DI SVILUPPO
1. Alter fluido e stabile
2. camera e world scrolling
3. radio con Dexter / Jack e ritratti

STAY ON THE AIR.
