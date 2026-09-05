ECO SOLITARIO v0.9.5 — ALTER MOTION FIX

Correzioni:
- rimosso l'errore di sintassi che impediva l'avvio del gioco
- logica di gioco in game.js, verificabile con node --check game.js
- riproduzione di tutti i 54 frame, comprese mazza e danno
- azioni con durata ricavata dalla sequenza completa
- fase del passo conservata tra camminata e corsa
- fisica a passo fisso e posizione interpolata per schermi a 30/60/120 Hz
- joystick con Pointer Events, multitocco e gestione delle interruzioni
- ripartenza su una piattaforma sicura dopo il ridimensionamento/rotazione
- proiettili con direzione fissata al momento dello sparo
- cache offline aggiornata, inclusa la nuova logica game.js

Comandi desktop: frecce o A/D, spazio salto, J sparo, K mazza, R radio.
Su telefono: ruotare in orizzontale e usare i comandi sullo schermo.

Verifica automatica: node --test tests/motion.test.cjs
I test simulano tempo e input; non sostituiscono una prova visiva su iPhone.
Le immagini originali sono conservate: le differenze disegnate fra le pose
richiedono un eventuale intervento grafico separato. Il mondo e le piattaforme
mantengono il comportamento precedente.

CACHE: eco-v095-alter-motion-fix
STAY ON THE AIR.
