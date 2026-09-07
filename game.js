
(()=> {
"use strict";

const C = document.getElementById("game");
const X = C.getContext("2d");
X.imageSmoothingEnabled = false;

const W=1280,H=720,FLOOR=575,WORLD=6200;
let scaleX=1,scaleY=1,rect=null,last=null,started=false,paused=false,gameOver=false,complete=false;
let cam=0,t=0,radioCooldown=0,dialogT=0,dialogSpeaker="",dialogText="",screenShake=0;

const keys=Object.create(null);
const pointers=new Map();
let jumpQueued=false, jumpHeld=false, accumulator=0;
let weapon="none",landing=0,wasGround=false,storyIndex=0,furthestX=210;
let radioQueue=[],radioTime=0,radioSpeaker="",radioLine="",finalRadio=false;
const STEP=1/120;
let previousX=210,previousY=430,previousCam=0,renderAlpha=1,gait=0;
const touch={left:false,right:false,jump:false,shoot:false,bat:false,radio:false};

const P={
 x:210,y:430,w:34,h:64,vx:0,vy:0,dir:1,onGround:false,
 hp:100,stamina:100,ammo:12,maxAmmo:12,shootCd:0,batCd:0,hurt:0,
 radioParts:0,docs:0
};

let bullets=[],particles=[],enemies=[],pickups=[],platforms=[];

const RADIO=[
 ["JACK","...C'è qualcuno? Questa volta ho sentito qualcosa."],
 ["DEXTER","Non è il vento, Jack. Quella è una persona."],
 ["JACK","Alter, se ci senti, segui la frequenza 17.8."],
 ["DEXTER","E se trovi del caffè, segnala anche quello."],
 ["JACK","La torre è a est. Le luci rosse sono ancora accese."],
 ["DEXTER","Questa è la parte dove diciamo: non morire."],
 ["JACK","C'è un segnale che entra ogni tredici secondi. Non è nostro."],
 ["DEXTER","Perfetto. Anche l'apocalisse ha lo spam."]
];
let radioIdx=0;
// Distance milestones are visited once, even if Alter doubles back.
const STORY=[
 [240,'JACK','Alter, ci sei. La torre è a est.'],
 [850,'DEXTER','Ottimo. Il comitato di benvenuto è armato.'],
 [1550,'JACK','Non fermarti. Ti teniamo compagnia.'],
 [2250,'DEXTER','È il nostro servizio premium: ansia inclusa.'],
 [3050,'JACK','Le finestre sono buie. La radio è ancora qui.'],
 [3850,'DEXTER','Come noi. Con meno caffè del previsto.'],
 [4650,'JACK','La luce rossa! Quella è la nostra torre.'],
 [5500,'DEXTER','Ancora pochi passi. Poi ti offriamo il silenzio.']
];
function queueRadio(speaker,text){radioQueue.push({speaker,text})}
function radioStep(dt){
 radioTime=Math.max(0,radioTime-dt);
 if(!radioTime&&radioQueue.length){
  const next=radioQueue.shift();radioSpeaker=next.speaker;radioLine=next.text;
  radioTime=Math.max(2.6,Math.min(4.5,radioLine.length/19));
  document.getElementById('radio-text').textContent=radioLine;
 }
 for(const name of ['jack','dexter'])document.getElementById('host-'+name).classList.toggle('speaking',radioTime>0&&radioSpeaker.toLowerCase()===name);
}


function resize(){
  clearInput();
  const bounds=document.getElementById("stage").getBoundingClientRect();
  const width=bounds.width,height=bounds.height;
  const a=width/height,b=W/H;
  if(a>b){
    C.style.height=height+"px";
    C.style.width=(height*b)+"px";
  }else{
    C.style.width=width+"px";
    C.style.height=(width/b)+"px";
  }
  rect=C.getBoundingClientRect();
  scaleX=W/rect.width; scaleY=H/rect.height;
}
addEventListener("resize",resize,{passive:true});

function box(x,y,w,h,fill,stroke){
  X.fillStyle=fill; X.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  if(stroke){X.strokeStyle=stroke;X.lineWidth=1;X.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(w)-1,Math.round(h)-1)}
}
function txt(s,x,y,size=18,color="#f1dfbd",align="left"){
  X.font=`${size}px Menlo,Consolas,monospace`; X.fillStyle=color; X.textAlign=align; X.textBaseline="alphabetic"; X.fillText(s,x,y);
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function near(v,a,b){return v>=a&&v<=b}
function lineWrap(str,max){
  const words=str.split(" "); let lines=[],line="";
  for(const w of words){
    const test=line?line+" "+w:w;
    if(test.length>max){if(line)lines.push(line);line=w}else line=test;
  }
  if(line)lines.push(line); return lines;
}
function say(speaker,text,secs=5){
  if(speaker==='JACK'||speaker==='DEXTER'){queueRadio(speaker,text);return}
  dialogSpeaker=speaker;dialogText=text;dialogT=secs;
}
function burst(x,y,color="#e76958",n=12){
  for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*280,vy:-50-Math.random()*240,life:.25+Math.random()*.35,color});
}

function seed(){
 enemies=[
  mob(950,0),mob(1390,1),mob(1950,0),mob(2520,1),mob(3200,2),
  mob(3780,0),mob(4300,1),mob(4920,0),mob(5480,2)
 ];
 pickups=[
  item(700,"med"),item(1180,"ammo"),item(1720,"doc"),item(2270,"radio"),
  item(2900,"med"),item(3520,"ammo"),item(4050,"doc"),item(4660,"radio"),
  item(5230,"med"),item(5750,"doc")
 ];
 platforms=[
  {x:1280,y:470,w:210,h:18},{x:2120,y:450,w:190,h:18},{x:2860,y:500,w:220,h:18},
  {x:3970,y:455,w:220,h:18},{x:5100,y:480,w:230,h:18}
 ];
}
function mob(x,type){
 return {x,y:FLOOR-(type===2?76:62),w:type===2?50:40,h:type===2?76:62,hp:type===2?120:type===1?70:50,maxHp:type===2?120:type===1?70:50,vx:0,dir:-1,cd:0,type,dead:false,previousX:x,gait:0,attack:0,attackDone:false,hurt:0,fade:.35};
}
function item(x,type){return{x,y:FLOOR-40,w:34,h:34,type,taken:false,phase:Math.random()*6.28}}
seed();

function reset(){
 Object.assign(P,{x:210,y:430,vx:0,vy:0,dir:1,onGround:false,hp:100,stamina:100,ammo:12,shootCd:0,batCd:0,hurt:0,radioParts:0,docs:0});
 clearInput();gait=0;radioCooldown=0;t=0;weapon="none";landing=0;wasGround=false;storyIndex=0;furthestX=210;radioQueue=[];radioTime=0;radioSpeaker="";radioLine="";finalRadio=false;last=null;accumulator=0;previousX=P.x;previousY=P.y;previousCam=0;
 bullets=[];particles=[];radioIdx=0;cam=0;gameOver=false;complete=false;paused=false;screenShake=0;seed();
}

function shoot(){
 if(P.shootCd>0||P.ammo<=0||gameOver||complete)return;
 P.shootCd=.19;P.ammo--;weapon="pistol";
 const bx=P.x+P.w/2+P.dir*44,by=P.y+P.h-60;
 bullets.push({x:bx,y:by,w:12,h:4,vx:P.dir*850,life:1.1});
 burst(bx,by+1,"#ffd58a",5); screenShake=2;
}
function bat(){
 if(P.batCd>0||P.stamina<12||gameOver||complete)return;
 P.batCd=.42;P.stamina-=12;weapon="baton";
 const hb={x:P.dir>0?P.x+P.w:P.x-52,y:P.y+8,w:52,h:52};
 for(const e of enemies){
   if(!e.dead&&hit(hb,e)){e.hp-=34;e.hurt=.18;e.vx=P.dir*260;burst(e.x+e.w/2,e.y+25);screenShake=5;if(e.hp<=0)e.dead=true}
 }
}
function damage(n,fromDir){
 if(P.hurt>0||gameOver)return;
 P.hp=Math.max(0,P.hp-n);P.hurt=.7;P.vx=fromDir*240;P.vy=-230;burst(P.x+17,P.y+25,"#f45d5d",14);screenShake=8;
 if(P.hp<=0){gameOver=true;say("SYSTEM","ALTER È CADUTO. Tocca lo schermo per ricominciare.",999)}
}
function radio(){
 if(radioCooldown>0)return;
 radioCooldown=.45;
 if(radioQueue.length||radioTime>0)return;
 const [s,l]=RADIO[radioIdx++%RADIO.length];queueRadio(s,l);
}

function approach(value,target,amount){
 return value<target?Math.min(value+amount,target):Math.max(value-amount,target);
}
function input(dt){
 const L=keys.a||keys.arrowleft||touch.left;
 const R=keys.d||keys.arrowright||touch.right;
 const axis=Number(!!R)-Number(!!L);
 const speed=285;
 const reversing=axis&&P.vx&&Math.sign(axis)!==Math.sign(P.vx);
 P.vx=approach(P.vx,axis*speed,(axis?(reversing?2600:1500):2100)*dt);
 if(Math.abs(P.vx)>7)P.dir=Math.sign(P.vx);
 if(P.batCd<=0)P.stamina=Math.min(100,P.stamina+18*dt);
 if(jumpQueued&&P.onGround){P.vy=-620;P.onGround=false}
 jumpQueued=false;
 if(keys.j||touch.shoot)shoot();
 if(keys.k||touch.bat)bat();
 if(keys.e||touch.radio)radio();
}

function update(dt){
 if(!started||paused)return;
 t+=dt;radioStep(dt);radioCooldown=Math.max(0,radioCooldown-dt);dialogT=Math.max(0,dialogT-dt);
 P.shootCd=Math.max(0,P.shootCd-dt);P.batCd=Math.max(0,P.batCd-dt);P.hurt=Math.max(0,P.hurt-dt);
 if(gameOver||complete){particlesStep(dt);screenShake*=Math.pow(.82,dt*60);return}

 previousX=P.x;previousY=P.y;previousCam=cam;wasGround=P.onGround;landing=Math.max(0,landing-dt);
 input(dt);
 const prevBottom=P.y+P.h;

 P.vy+=1900*dt;
 P.x+=P.vx*dt;P.y+=P.vy*dt;
 P.onGround=false;

 // floor
 if(P.y+P.h>=FLOOR){P.y=FLOOR-P.h;P.vy=0;P.onGround=true}

 // platforms, land only from above
 for(const pl of platforms){
   if(P.vy>=0 && prevBottom<=pl.y+4 && P.y+P.h>=pl.y && P.x+P.w>pl.x && P.x<pl.x+pl.w){
      P.y=pl.y-P.h;P.vy=0;P.onGround=true;
   }
 }
 if(P.onGround&&!wasGround)landing=.1;
 P.x=clamp(P.x,0,WORLD-P.w);
 if(P.x===0||P.x===WORLD-P.w)P.vx=0;
 if(P.onGround&&Math.abs(P.x-previousX)>0.001)gait=(gait+Math.abs(P.x-previousX)/132)%1;
 else if(Math.abs(P.vx)<1)gait=0;

 furthestX=Math.max(furthestX,P.x);
 while(storyIndex<STORY.length&&furthestX>=STORY[storyIndex][0]){
  const cue=STORY[storyIndex++];queueRadio(cue[1],cue[2]);
 }
 // bullets
 bullets.forEach(b=>{b.x+=b.vx*dt;b.life-=dt});
 bullets=bullets.filter(b=>{
   if(b.hostile){if(hit(b,P)){damage(9,Math.sign(b.vx));return false}return b.life>0}
   for(const e of enemies){
     if(!e.dead&&hit(b,e)){e.hp-=26;e.hurt=.18;burst(b.x,b.y,"#ffcf79",7);screenShake=3;if(e.hp<=0)e.dead=true;return false}
   }
   return b.life>0;
 });

 // Bandits share the complete actor atlas and distance-driven gait.
 for(const e of enemies){
   e.previousX=e.x;e.hurt=Math.max(0,e.hurt-dt);
   if(e.dead){e.fade=Math.max(0,e.fade-dt);continue}
   e.cd=Math.max(0,e.cd-dt);e.attack=Math.max(0,e.attack-dt);
   const dx=P.x-e.x,dist=Math.abs(dx),sameLevel=Math.abs((P.y+P.h)-(e.y+e.h))<75;
   const ranged=e.type===1,range=ranged?330:58;
   e.dir=dx>=0?1:-1;
   const pursuing=dist<480&&(!ranged||dist>220||!sameLevel);
   const target=pursuing?e.dir*(e.type===2?135:105):0;
   e.vx=approach(e.vx,target,(e.hurt>0?220:650)*dt);
   e.x=clamp(e.x+e.vx*dt,0,WORLD-e.w);
   if(Math.abs(e.x-e.previousX)>.001)e.gait=(e.gait+Math.abs(e.x-e.previousX)/132)%1;
   if(dist<range&&sameLevel&&e.cd<=0){e.cd=ranged?1.5:1.0;e.attack=.42;e.attackDone=false}
   // Telegraph before damage: movement can dodge both the baton and the bullet.
   if(e.attack>0&&e.attack<=.22&&!e.attackDone){
    e.attackDone=true;
    if(ranged){bullets.push({x:e.x+e.w/2+e.dir*44,y:e.y+e.h-60,w:10,h:4,vx:e.dir*440,life:1.3,hostile:true});burst(e.x+e.w/2+e.dir*44,e.y+e.h-60,'#ffd58a',3)}
    else if(Math.abs(P.x-e.x)<62&&sameLevel)damage(e.type===2?22:13,e.dir);
   }
 }

 // pickups
 for(const p of pickups){
   if(p.taken)continue;
   if(hit(P,p)){
     p.taken=true;
     if(p.type==="med"){P.hp=Math.min(100,P.hp+35);say("SYSTEM","MEDIKIT +35",2)}
     if(p.type==="ammo"){P.ammo=P.maxAmmo;say("SYSTEM","MUNIZIONI RIPRISTINATE",2)}
     if(p.type==="doc"){P.docs++;say("DOCUMENTO",`Pagina ${P.docs}: "La frequenza 17.8 non dovrebbe esistere."`,4)}
     if(p.type==="radio"){P.radioParts++;say("JACK",`Hai trovato un modulo radio. ${P.radioParts}/2`,3)}
   }
 }

 if(P.x>5920){
   complete=true;
   if(!finalRadio){finalRadio=true;queueRadio('JACK','Ti vediamo, Alter. Sei arrivato.');queueRadio('DEXTER','Resta in ascolto. Questa storia è appena iniziata.')}
   say("SYSTEM","CAPITOLO I · LA FREQUENZA",999);
 }

 cam+=(P.x-W*.40-cam)*Math.min(1,dt*5);
 cam=clamp(cam,0,WORLD-W);
 particlesStep(dt);
 screenShake*=Math.pow(.82,dt*60);
}
function particlesStep(dt){
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.life-=dt}
 particles=particles.filter(p=>p.life>0);
}

function skyline(layer,base,ratio,fill){
 X.save();X.globalAlpha=layer===0?.48:.72;
 const off=(cam*ratio)%280;
 for(let i=-2;i<7;i++){
   const seed=(i+20)*71+layer*99;
   const x=i*280-off;
   const h=100+(seed%170);
   const w=130+((seed*3)%90);
   box(x,base-h,w,h,fill);
   for(let yy=base-h+20;yy<base-18;yy+=26)
     for(let xx=x+16;xx<x+w-12;xx+=24)
       if(((xx+yy+seed)>>4)%7===0)box(xx,yy,4,7,"#cf6b42");
 }
 X.restore();
}

function worldDraw(){
 // sunset
 const g=X.createLinearGradient(0,0,0,H);
 g.addColorStop(0,"#201931");g.addColorStop(.36,"#703646");g.addColorStop(.62,"#d56b4f");g.addColorStop(.83,"#f0a060");g.addColorStop(1,"#14232b");
 X.fillStyle=g;X.fillRect(0,0,W,H);

 X.globalAlpha=.68;X.fillStyle="#ffd892";X.beginPath();X.arc(810-cam*.08,260,52,0,Math.PI*2);X.fill();X.globalAlpha=1;
 skyline(0,465,.08,"#1e2430");skyline(1,520,.2,"#20232a");

 X.save();X.translate(-(previousCam+(cam-previousCam)*renderAlpha),0);

 // distant cables
 X.strokeStyle="#1b1a1e";X.lineWidth=3;
 for(let x=300;x<WORLD;x+=780){
   X.beginPath();X.moveTo(x,165);X.quadraticCurveTo(x+250,210,x+520,170);X.stroke();
 }

 // ruins
 box(0,FLOOR,WORLD,H-FLOOR,"#0a1217");
 for(let x=0;x<WORLD;x+=120){
   box(x,FLOOR-13,82+(x%70),13,"#273438");
   if((x/120|0)%2===0){box(x+15,FLOOR-34,6,21,"#426249");box(x+22,FLOOR-27,5,14,"#31523b")}
 }

 // structures
 for(let x=560;x<WORLD;x+=910){
   box(x,255,12,FLOOR-255,"#273036");
   box(x+88,220,12,FLOOR-220,"#273036");
   X.strokeStyle="#6b4940";X.lineWidth=3;
   for(let y=260;y<FLOOR;y+=42){
     X.beginPath();X.moveTo(x,y);X.lineTo(x+96,y+38);X.moveTo(x+96,y);X.lineTo(x,y+38);X.stroke();
   }
 }
 // neon/signs
 for(let x=1080;x<WORLD;x+=1370){
   box(x,390,140,72,"#131a1f","#6b5544");
   txt(x%2===0?"KEEP LISTENING":"STILL HUMAN?",x+70,420,15,"#c9bca7","center");
   txt("17.8",x+70,446,20,"#e28e62","center");
 }
 // radio tower
 box(5790,160,18,415,"#49343a");box(5890,125,16,450,"#49343a");
 X.strokeStyle="#9d5148";X.lineWidth=4;
 for(let y=170;y<550;y+=36){X.beginPath();X.moveTo(5798,y);X.lineTo(5898,y+30);X.moveTo(5898,y);X.lineTo(5798,y+30);X.stroke()}
 txt("17.8",5848,106,30,"#f0c17e","center");

 // platforms
 for(const p of platforms){
   box(p.x,p.y,p.w,p.h,"#253238","#795b47");
   for(let xx=p.x+8;xx<p.x+p.w;xx+=24)box(xx,p.y-7,5,7,"#416548");
 }

 // pickups
 for(const p of pickups){
   if(p.taken)continue;
   const yy=p.y+Math.sin(t*3+p.phase)*5;
   const col=p.type==="med"?"#cf4e4b":p.type==="ammo"?"#d6a55e":p.type==="doc"?"#d7c6a4":"#77b8ad";
   box(p.x,yy,34,34,col,"#171717");
   txt(p.type==="med"?"+":p.type==="ammo"?"A":p.type==="doc"?"?":"R",p.x+17,yy+25,20,"#10161a","center");
 }

 // bullets
 for(const b of bullets)box(b.x,b.y,b.w,b.h,b.hostile?"#ff8e79":"#ffdf8d");

 // enemies
 for(const e of enemies) if(!e.dead||e.fade>0) drawEnemy(e);

 drawPlayer();

 for(const p of particles){X.globalAlpha=Math.max(0,p.life*2);box(p.x,p.y,4,4,p.color);X.globalAlpha=1}

 X.restore();
}

function drawEnemy(e){
 const moving=Math.abs(e.x-e.previousX)>.001,phase=Math.floor(e.gait*8)%8;
 let frame=e.dead||e.hurt>0?31:e.attack>0?(e.type===1?8+phase:28+Math.min(2,Math.floor((.42-e.attack)*8))):moving?(e.type===1?8:16)+phase:24;
 const x=e.previousX+(e.x-e.previousX)*renderAlpha;
 X.save();if(e.dead)X.globalAlpha=e.fade/.35;
 const bank=window.EcoCharacters;
 if(!bank||!bank.draw(X,frame,x+e.w/2,e.y+e.h,e.dir,e.type,e.type===2?1.12:1)){
  // No unrelated sprite-sheet fallback: missing artwork cannot reintroduce ghosts.
  box(x,e.y+18,e.w,e.h-18,e.type===1?'#77553c':'#36575f');box(x+6,e.y,e.w-12,22,'#b98563');
 }
 X.restore();
 if(!e.dead){box(x,e.y-25,e.w,4,'#3b1e20');box(x,e.y-25,e.w*e.hp/e.maxHp,4,'#d95355');
 if(e.attack>.22)txt('!',x+e.w/2,e.y-30,17,'#f0bd73','center')}
}
function spriteFrame(){
 const phase=Math.floor(gait*8)%8,moving=Math.abs(P.vx)>1&&Math.abs(P.x-previousX)>.001;
 if(P.hurt>.52)return {frame:31};
 if(!P.onGround)return {frame:P.vy<0?25:26,upper:weapon==='pistol'?8+phase:undefined};
 if(P.batCd>0){const swing=28+Math.min(2,Math.floor((.42-P.batCd)*8));return moving?{frame:16+phase,upper:swing}:{frame:swing}}
 if(landing>0&&!moving)return {frame:27};
 if(moving)return {frame:(weapon==='pistol'?8:weapon==='baton'?16:0)+phase};
 if(weapon==='pistol')return {frame:24,upper:8};
 if(weapon==='baton')return {frame:24,upper:16};
 return {frame:24};
}
function drawPlayer(){
 const x=previousX+(P.x-previousX)*renderAlpha,y=previousY+(P.y-previousY)*renderAlpha;
 const sprite=spriteFrame(),bank=window.EcoCharacters;
 X.save();if(P.hurt>0&&Math.floor(t*18)%2)X.globalAlpha=.45;
 if(bank&&bank.ready){
  if(sprite.upper===undefined)bank.draw(X,sprite.frame,x+P.w/2,y+P.h,P.dir);
  else{
   // Keep the running/jumping legs beneath the independently animated armed torso.
   const cx=Math.round(x+P.w/2),feet=Math.round(y+P.h),split=82;
   X.save();X.translate(cx,feet);X.scale(P.dir,1);
   X.drawImage(bank.frames[sprite.frame],0,split,128,128-split,-64,split-120,128,128-split);
   X.drawImage(bank.frames[sprite.upper],0,0,128,split,-64,-120,128,split);X.restore();
  }
 }else{
  // A small animated procedural fallback keeps controls usable during image load.
  const step=P.onGround?Math.sin(gait*Math.PI*2)*5:0;
  box(x+4,y+18,26,29,'#a83339');box(x+8,y,20,20,'#d6a072');
  box(x+5,y+45+step,9,18,'#d8b487');box(x+21,y+45-step,9,18,'#d8b487');
 }
 X.restore();
}

function hud(){
 // top-left card
 box(18,18,310,92,"rgba(5,12,18,.84)","#7c5f48");
 txt("ALTER",34,44,18,"#e4aa67");
 txt("SALUTE",34,67,12,"#cbbfa9");box(96,57,172,12,"#302228");box(96,57,172*P.hp/100,12,"#d84c51");
 txt("ENERGIA",34,91,12,"#cbbfa9");box(96,81,172,10,"#1f3035");box(96,81,172*P.stamina/100,10,"#6db8ae");
 txt(`${P.ammo}/${P.maxAmmo}`,292,67,16,"#f1d7a5","center");
 txt(`DOC ${P.docs}/3`,292,92,12,"#9bbfc0","center");

 // objective
 box(W/2-170,118,340,36,"rgba(6,12,18,.72)","#6d5748");
 txt("OBIETTIVO: RAGGIUNGI LA TORRE",W/2,142,14,"#ecd8b5","center");

 if(dialogT>0){
   box(175,H-132,W-350,96,"rgba(4,9,13,.92)","#8a684d");
   txt(dialogSpeaker,198,H-102,15,"#e2a360");
   const lines=lineWrap(dialogText,72);
   lines.slice(0,2).forEach((l,i)=>txt(l,198,H-77+i*23,17,"#f0e4cb"));
 }



 if(complete){
   box(370,205,540,220,"rgba(4,8,12,.95)","#a37753");
   txt("CAPITOLO I COMPLETATO",640,265,30,"#f0c984","center");
   txt("La torre trasmette ancora.",640,310,19,"#f0e4cb","center");
   txt(`Documenti trovati: ${P.docs}/3`,640,347,16,"#9fc5c1","center");
   txt("Tocca per ricominciare",640,393,14,"#cabca7","center");
 }
}

function syncTouch(){
 const wasJump=jumpHeld;
 for(const key in touch)touch[key]=false;
 for(const action of pointers.values())if(action)touch[action]=true;
 jumpHeld=!!(touch.jump||keys.w||keys.arrowup||keys[' ']);
 if(jumpHeld&&!wasJump)jumpQueued=true;
 for(const button of document.querySelectorAll('[data-action]'))button.classList.toggle('held',!!touch[button.dataset.action]);
}
function clearInput(){
 pointers.clear();for(const key in keys)delete keys[key];
 for(const key in touch)touch[key]=false;
 jumpQueued=false;jumpHeld=false;
 for(const button of document.querySelectorAll('[data-action]'))button.classList.remove('held');
}
function start(){
 if(gameOver||complete)reset();
 started=true;paused=false;last=null;accumulator=0;
 document.getElementById('welcome').hidden=true;
 document.getElementById('pause').textContent='Pausa';
 document.getElementById('note').textContent='Capitolo I · La frequenza';

}
function togglePause(){
 if(!started)return;
 paused=!paused;clearInput();last=null;accumulator=0;
 previousX=P.x;previousY=P.y;previousCam=cam;
 document.getElementById('pause').textContent=paused?'Riprendi':'Pausa';
 document.getElementById('note').textContent=paused?'In pausa · tocca Riprendi':'Capitolo I · La frequenza';
}
for(const button of document.querySelectorAll('[data-action]')){
 button.addEventListener('pointerdown',e=>{
  e.preventDefault();if(!started||gameOver||complete)start();if(paused)return;
  pointers.set(e.pointerId,button.dataset.action);syncTouch();
  try{button.setPointerCapture(e.pointerId)}catch{}
 },{passive:false});
 const release=e=>{pointers.delete(e.pointerId);syncTouch()};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
 button.addEventListener('contextmenu',e=>e.preventDefault());
}
addEventListener('pointerup',e=>{pointers.delete(e.pointerId);syncTouch()});
addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);syncTouch()});
C.addEventListener('pointerdown',e=>{e.preventDefault();if(!started||gameOver||complete)start()},{passive:false});
document.getElementById('start').addEventListener('click',start);
document.getElementById('pause').addEventListener('click',togglePause);
const handled=['a','d','w','arrowleft','arrowright','arrowup',' ','j','k','e','p','escape','enter','r'];
addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(!handled.includes(k))return;
 e.preventDefault();if(e.repeat)return;
 if(!started){start();if(k==='enter'||k===' ')return}
 if(gameOver||complete){if(k==='r'||k==='enter'||k===' ')start();return}
 if(k==='p'||k==='escape'){togglePause();return}
 if(paused)return;
 keys[k]=true;syncTouch();
});
addEventListener('keyup',e=>{delete keys[e.key.toLowerCase()];syncTouch()});
function suspend(){
 clearInput();last=null;accumulator=0;
 if(started&&!paused&&!gameOver&&!complete)togglePause();
}
addEventListener('blur',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else{last=null;accumulator=0}});
resize();

function draw(){
 X.save();
 const sx=screenShake?(Math.random()-.5)*screenShake:0,sy=screenShake?(Math.random()-.5)*screenShake:0;
 X.translate(sx,sy);
 worldDraw();hud();
 X.restore();
}

function loop(now){
 if(last===null)last=now;
 const elapsed=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
 if(!document.hidden&&started&&!paused){
  accumulator+=elapsed;
  while(accumulator+1e-9>=STEP){update(STEP);accumulator=Math.max(0,accumulator-STEP)}
 }else accumulator=0;
 renderAlpha=gameOver||complete||paused?1:accumulator/STEP;
 draw();
 requestAnimationFrame(loop);
}
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
}
requestAnimationFrame(loop);
})();
