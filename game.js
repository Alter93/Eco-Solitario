
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
let jumpQueued=false, jumpHeld=false, radioQueued=false, radioHeld=false, accumulator=0;
const STEP=1/120;
let previousX=210,previousY=430,previousCam=0,renderAlpha=1,gait=0;
const touch={left:false,right:false,jump:false,shoot:false,bat:false,run:false,radio:false,crouch:false};

const P={
 x:210,y:430,w:34,h:64,crouching:false,vx:0,vy:0,dir:1,onGround:false,
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
let radioIdx=0, nextRadioX=620, exhausted=false;

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
 return {x,y:FLOOR-(type===2?76:62),w:type===2?50:40,h:type===2?76:62,hp:type===2?120:type===1?70:50,maxHp:type===2?120:type===1?70:50,vx:0,dir:-1,cd:0,type,dead:false};
}
function item(x,type){return{x,y:FLOOR-40,w:34,h:34,type,taken:false,phase:Math.random()*6.28}}
seed();

function reset(){
 Object.assign(P,{x:210,y:430,h:64,crouching:false,vx:0,vy:0,dir:1,onGround:false,hp:100,stamina:100,ammo:12,shootCd:0,batCd:0,hurt:0,radioParts:0,docs:0});
 clearInput();gait=0;nextRadioX=620;exhausted=false;radioCooldown=0;t=0;last=null;accumulator=0;previousX=P.x;previousY=P.y;previousCam=0;
 bullets=[];particles=[];radioIdx=0;cam=0;gameOver=false;complete=false;paused=false;screenShake=0;seed();say("JACK","Alter? Se ci senti, muoviti verso la torre.",4);
}

function shoot(){
 if(P.shootCd>0||P.ammo<=0||gameOver||complete)return;
 P.shootCd=.19;P.ammo--;
 const bx=P.x+P.w/2+(P.dir>0?23:-23);
 const muzzle=P.y+(P.crouching?19:25);
 bullets.push({x:bx,y:muzzle,w:12,h:4,vx:P.dir*850,life:1.1});
 burst(bx,muzzle+1,"#ffd58a",5); screenShake=2;
}
function bat(){
 if(P.batCd>0||gameOver||complete)return;
 P.batCd=.42;
 const hb={x:P.dir>0?P.x+P.w:P.x-52,y:P.y+8,w:52,h:P.crouching?32:52};
 for(const e of enemies){
   if(!e.dead&&hit(hb,e)){e.hp-=34;e.vx=P.dir*260;burst(e.x+e.w/2,e.y+25);screenShake=5;if(e.hp<=0)e.dead=true}
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
 const [s,l]=RADIO[radioIdx++%RADIO.length];say(s,l,5);
}

function approach(value,target,amount){
 return value<target?Math.min(value+amount,target):Math.max(value-amount,target);
}
function setCrouch(value){
 if(P.crouching===value)return;
 const oldH=P.h;P.crouching=value;P.h=value?40:64;
 const shift=oldH-P.h;P.y+=shift;previousY+=shift;
}
function input(dt){
 setCrouch(!!((keys.arrowdown||touch.crouch)&&P.onGround&&!jumpQueued));
 const L=keys.a||keys.arrowleft||touch.left;
 const R=keys.d||keys.arrowright||touch.right;
 const axis=P.crouching?0:Number(!!R)-Number(!!L);
 if(P.crouching)P.vx=0;
 if(P.stamina<=0)exhausted=true;
 if(exhausted&&P.stamina>=35)exhausted=false;
 const run=!!axis&&!exhausted;
 const speed=run?285:185;
 const reversing=axis&&P.vx&&Math.sign(axis)!==Math.sign(P.vx);
 P.vx=approach(P.vx,axis*speed,(axis?(reversing?2600:1500):2100)*dt);
 if(Math.abs(P.vx)>7)P.dir=Math.sign(P.vx);
 if(run&&axis)P.stamina=Math.max(0,P.stamina-24*dt);
 else P.stamina=Math.min(100,P.stamina+18*dt);
 if(jumpQueued&&P.onGround){P.vy=-620;P.onGround=false}
 jumpQueued=false;
 if(keys.j||touch.shoot)shoot();
 if(keys.k||touch.bat)bat();
 if(radioQueued){radioQueued=false;radio();}
}

function update(dt){
 if(!started||paused)return;
 t+=dt;radioCooldown=Math.max(0,radioCooldown-dt);dialogT=Math.max(0,dialogT-dt);
 P.shootCd=Math.max(0,P.shootCd-dt);P.batCd=Math.max(0,P.batCd-dt);P.hurt=Math.max(0,P.hurt-dt);
 if(gameOver||complete){particlesStep(dt);return}

 previousX=P.x;previousY=P.y;previousCam=cam;
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
 P.x=clamp(P.x,0,WORLD-P.w);
 if(P.x===0||P.x===WORLD-P.w)P.vx=0;
 if(P.onGround&&Math.abs(P.x-previousX)>0.001)gait=(gait+Math.abs(P.x-previousX)/132)%1;
 else if(Math.abs(P.vx)<1)gait=0;

 // bullets
 bullets.forEach(b=>{b.x+=b.vx*dt;b.life-=dt});
 bullets=bullets.filter(b=>{
   for(const e of enemies){
     if(!e.dead&&hit(b,e)){e.hp-=26;burst(b.x,b.y,"#ffcf79",7);screenShake=3;if(e.hp<=0)e.dead=true;return false}
   }
   return b.life>0;
 });

 // enemies
 for(const e of enemies){
   if(e.dead)continue;
   e.cd=Math.max(0,e.cd-dt);
   const dx=P.x-e.x,dist=Math.abs(dx);
   if(dist<480){e.dir=dx>=0?1:-1;e.vx=approach(e.vx,e.dir*(e.type===2?135:105),650*dt)}
   else e.vx=approach(e.vx,0,850*dt);
   const max=e.type===2?135:105;e.vx=clamp(e.vx,-max,max);e.x+=e.vx*dt;
   if(dist<55 && Math.abs((P.y+30)-(e.y+30))<58 && e.cd<=0){e.cd=e.type===2?1.0:.85;damage(e.type===2?22:13,-e.dir)}
 }

 // Death is terminal for this step: no pickup or tower completion after it.
 if(gameOver){particlesStep(dt);return;}

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

 // Deliver one radio line at a time; pickups keep priority over chatter.
 if(P.x>=nextRadioX&&dialogT<=0){radio();nextRadioX+=650;}
 if(P.x>5920){
   complete=true;
   say("JACK","Ti vediamo, Alter. Sei arrivato alla torre.",999);
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

 if(cityReady){
  const width=FLOOR*citySheet.naturalWidth/citySheet.naturalHeight;
  const camera=previousCam+(cam-previousCam)*renderAlpha;
  const offset=Math.min(Math.max(0,width-W),Math.max(0,camera*.08));
  X.drawImage(citySheet,-Math.round(offset),0,Math.ceil(width),FLOOR);
 }else{
 X.globalAlpha=.68;X.fillStyle="#ffd892";X.beginPath();X.arc(810-cam*.08,260,52,0,Math.PI*2);X.fill();X.globalAlpha=1;
 skyline(0,465,.08,"#1e2430");skyline(1,520,.2,"#20232a");
 }

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
 for(const b of bullets)box(b.x,b.y,b.w,b.h,"#ffdf8d");

 // enemies
 for(const e of enemies) if(!e.dead) drawEnemy(e);

 drawPlayer();

 for(const p of particles){X.globalAlpha=Math.max(0,p.life*2);box(p.x,p.y,4,4,p.color);X.globalAlpha=1}

 X.restore();
}

function drawEnemy(e){
 if(banditFrames.length===18){
  const attacking=e.cd>(e.type===2?.8:.65);
  const frame=attacking?5:Math.abs(e.vx)>1?Math.floor(Math.abs(e.x)/132*4)%4:4;
  const height=e.type===2?102:88;
  X.save();X.translate(e.x+e.w/2,e.y+e.h);X.scale(e.dir,1);
  X.drawImage(banditFrames[e.type*6+frame],-height/2,-height,height,height);
  X.restore();
  box(e.x,e.y-9,e.w,4,'#3b1e20');box(e.x,e.y-9,e.w*e.hp/e.maxHp,4,'#d95355');return;
 }

 const body=e.type===2?"#4c4a4a":e.type===1?"#654139":"#34484d";
 box(e.x,e.y+18,e.w,e.h-18,body,"#111");
 box(e.x+6,e.y,e.w-12,22,"#b98563","#111");
 box(e.x+(e.dir>0?e.w-3:-17),e.y+28,20,6,"#989b9a","#111");
 box(e.x+5,e.y+e.h-16,10,16,"#1d2328");box(e.x+e.w-15,e.y+e.h-16,10,16,"#1d2328");
 box(e.x,e.y-9,e.w,4,"#3b1e20");
 box(e.x,e.y-9,e.w*(e.hp/e.maxHp),4,e.type===2?"#e07b55":"#d95355");
}

let banditFrames=[];
const banditSheet=new Image(),hostSheet=new Image();
let hostsReady=false;
function prepareBandits(sheet){
 const canvas=document.createElement('canvas');canvas.width=sheet.naturalWidth;canvas.height=sheet.naturalHeight;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet,0,0);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height),pixels=data.data,bounds=[];
 const width=canvas.width,height=canvas.height,seen=new Uint8Array(width*height);
 for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(r>85&&b>70&&r>g+45&&b>g+40)pixels[i+3]=0;}
 ctx.putImageData(data,0,0);
 for(let seed=0;seed<seen.length;seed++){
  if(seen[seed]||pixels[seed*4+3]<128)continue;
  const queue=[seed];seen[seed]=1;let left=width,top=height,right=0,bottom=0;
  for(let k=0;k<queue.length;k++){
   const n=queue[k],x=n%width,y=Math.floor(n/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const xx=x+dx,yy=y+dy,q=yy*width+xx;
    if(xx>=0&&xx<width&&yy>=0&&yy<height&&!seen[q]&&pixels[q*4+3]>=128){seen[q]=1;queue.push(q);}
   }
  }
  if(queue.length<500)continue;
  const hips=queue.filter(n=>Math.floor(n/width)>=top+(bottom-top)*.3&&Math.floor(n/width)<=top+(bottom-top)*.62).map(n=>n%width).sort((a,b)=>a-b);
  bounds.push({left,top,right,bottom,anchor:hips[Math.floor(hips.length/2)]??(left+right)/2});
 }
 if(bounds.length!==18)throw new Error('Expected 18 distinct enemy poses, found '+bounds.length);
 bounds.sort((a,b)=>a.bottom-b.bottom);
 for(let row=0;row<3;row++)bounds.splice(row*6,6,...bounds.slice(row*6,row*6+6).sort((a,b)=>a.left-b.left));
 const frames=[];
 for(let row=0;row<3;row++){
  const heights=bounds.slice(row*6,row*6+5).map(b=>b.bottom-b.top+1).sort((a,b)=>a-b);
  const scale=94/heights[2];
  for(let col=0;col<6;col++){
   const b=bounds[row*6+col],c=document.createElement('canvas');c.width=128;c.height=128;
   const x=c.getContext('2d');x.imageSmoothingEnabled=false;
   x.drawImage(canvas,b.left,b.top,b.right-b.left+1,b.bottom-b.top+1,
    Math.round(64+(b.left-b.anchor)*scale),Math.round(128-(b.bottom-b.top+1)*scale),
    Math.round((b.right-b.left+1)*scale),Math.round((b.bottom-b.top+1)*scale));frames.push(c);
  }
 }
 return frames;
}
banditSheet.onload=()=>{if(document.createElement){try{banditFrames=prepareBandits(banditSheet)}catch(e){console.warn('Enemy artwork unavailable',e)}}};
banditSheet.onerror=()=>{};banditSheet.src='./bandits-v2.png';
hostSheet.onload=()=>{hostsReady=hostSheet.naturalWidth>0&&hostSheet.naturalWidth===hostSheet.naturalHeight};
hostSheet.onerror=()=>{};hostSheet.src='./radio-hosts-v2.png';

const master=new Image();
let masterReady=false;
let cleanMaster=null;
master.onload=()=>{
 masterReady=master.naturalWidth===5184&&master.naturalHeight===128;
 if(masterReady&&document.createElement){
  try{cleanMaster=prepareFrames(master)}catch(error){console.warn('Sprite cleanup unavailable',error)}
 }
};
// Work on the alpha mask, retaining the central character and nearby details.
// This removes neighbouring characters already embedded inside source cells.
function prepareFrames(sheet){
 const atlas=document.createElement('canvas');atlas.width=5184;atlas.height=128;
 const ctx=atlas.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet,0,0);
 const source=ctx.getImageData(0,0,5184,128),dest=ctx.createImageData(5184,128);
 for(let frame=0;frame<54;frame++){
  const seen=new Uint8Array(96*128),groups=[];
  for(let pos=0;pos<seen.length;pos++){
   if(seen[pos]||source.data[((pos/96|0)*5184+frame*96+pos%96)*4+3]<80)continue;
   const queue=[pos];seen[pos]=1;let minX=96,maxX=0,minY=128,maxY=0;
   for(let q=0;q<queue.length;q++){
    const v=queue[q],x=v%96,y=v/96|0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=x+dx,ny=y+dy,n=ny*96+nx;
     if(nx<0||nx>=96||ny<0||ny>=128||seen[n])continue;
     if(source.data[(ny*5184+frame*96+nx)*4+3]>=80){seen[n]=1;queue.push(n)}
    }
   }
   groups.push({pixels:queue,minX,maxX,minY,maxY});
  }
  groups.sort((a,b)=>b.pixels.length-a.pixels.length);
  const body=groups[0];if(!body)continue;
  // Retain anatomy overlapping the body, the hair cluster, and the weapon.
  // Olive dust outside the silhouette is not a limb or a ponytail.
  const selected=groups.filter(g=>{
   if(g===body)return true;
   const overlap=Math.min(g.maxX,body.maxX)-Math.max(g.minX,body.minX)+1;
   const hair=g.pixels.length>=40&&g.maxY<=body.minY+3&&g.minY>=body.minY-15&&overlap>0;
   const limb=g.pixels.length>=100&&overlap>=5&&g.minY>=body.minY&&g.maxY<=body.maxY+6;
   const weapon=(frame>=38&&frame<=43&&g.pixels.length>=24&&g.minX>=body.maxX-5&&g.minY>=body.minY&&g.maxY<=body.maxY-12)||
    (frame>=44&&frame<=48&&g.pixels.length>=100&&overlap>=2&&g.minY>=body.minY-52&&g.maxY<=body.maxY-12);
   return hair||limb||weapon;
  });
  const feet=Math.max(...selected.map(g=>g.maxY));
  // Torso anchor remains stable when an arm or weapon extends sideways.
  const hips=[];
  for(const pos of body.pixels){
   const x=pos%96,y=pos/96|0,i=(y*5184+frame*96+x)*4;
   if(y>=body.minY+(body.maxY-body.minY)*.28&&y<=body.minY+(body.maxY-body.minY)*.6&&source.data[i]>70&&source.data[i]>source.data[i+1]*1.8&&source.data[i]>source.data[i+2]*1.6)hips.push(x);
  }
  hips.sort((a,b)=>a-b);
  const anchor=hips.length?hips[Math.floor(hips.length/2)]:(body.minX+body.maxX)/2;
  const offsetX=Math.round(48-anchor),offsetY=122-feet;
  for(const g of selected)for(const pos of g.pixels){
   const x=pos%96,y=pos/96|0,nx=x+offsetX,ny=y+offsetY;
   if(nx<0||nx>=96||ny<0||ny>=128)continue;
   const src=(y*5184+frame*96+x)*4,dst=(ny*5184+frame*96+nx)*4;
   dest.data.set(source.data.subarray(src,src+4),dst);
  }
 }
 ctx.putImageData(dest,0,0);return atlas;
}
master.onerror=()=>{document.getElementById('note').textContent='Grafica ridotta: puoi continuare a giocare.'};
master.src='./alter_master_sheet.png';
let runAtlas=null;
const runSheet=new Image();
function prepareRun(sheet){
 const width=sheet.naturalWidth,height=sheet.naturalHeight;
 if(width<400||height<200)throw new Error('Run sheet dimensions invalid');
 const source=document.createElement('canvas');source.width=width;source.height=height;
 const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet,0,0);
 const data=ctx.getImageData(0,0,width,height),pixels=data.data,bounds=[];
 for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(r>85&&b>70&&r>g+45&&b>g+40)pixels[i+3]=0;}
 for(let frame=0;frame<8;frame++){
  const x0=Math.round(frame%4*width/4),x1=Math.round((frame%4+1)*width/4),y0=Math.round(Math.floor(frame/4)*height/2),y1=Math.round((Math.floor(frame/4)+1)*height/2);
  let left=x1,right=x0,top=y1,bottom=y0,count=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*width+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
  if(count<500||left<=x0||right>=x1-1||top<=y0||bottom>=y1-1)throw new Error('Run pose missing or clipped: '+frame);
  const xs=[],ys=[];
  for(let y=Math.round(top+(bottom-top)*.25);y<top+(bottom-top)*.55;y++)for(let x=left;x<=right;x++){
   const i=(y*width+x)*4;if(pixels[i+3]>=128&&pixels[i]>70&&pixels[i]>pixels[i+1]*1.8&&pixels[i]>pixels[i+2]*1.6){xs.push(x);ys.push(y);}
  }
  if(xs.length<20)throw new Error('Run torso anchor missing: '+frame);
  xs.sort((a,b)=>a-b);ys.sort((a,b)=>a-b);bounds.push({left,right,top,bottom,x:xs[Math.floor(xs.length/2)],y:ys[Math.floor(ys.length/2)]});
 }
 ctx.putImageData(data,0,0);
 const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const scale=100/median(bounds.map(b=>b.bottom-b.top+1));
 const floorOffset=median([0,1,2,4,5,6].map(n=>bounds[n].bottom-bounds[n].y));
 const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=128;
 const out=atlas.getContext('2d');out.imageSmoothingEnabled=false;
 for(let n=0;n<8;n++){
  const b=bounds[n],w=b.right-b.left+1,h=b.bottom-b.top+1;
  const dx=Math.round(64+(b.left-b.x)*scale),dy=Math.round(122-floorOffset*scale+(b.top-b.y)*scale+[0,1,0,-2,0,1,0,-2][n]);
  const dw=Math.round(w*scale),dh=Math.round(h*scale);
  if(dx<0||dx+dw>128||dy<0||dy+dh>128)throw new Error('Run pose exceeds normalized cell: '+n);
  out.drawImage(source,b.left,b.top,w,h,n*128+dx,dy,dw,dh);
 }
 return atlas;
}
runSheet.onload=()=>{if(document.createElement){try{runAtlas=prepareRun(runSheet)}catch(error){console.warn('Run artwork unavailable; using original poses',error)}}};
runSheet.onerror=()=>{};runSheet.src='./alter-run-v3.png';
// Single coherent poses: keep only the connected character, never loose debris.
let idleAtlas=null,crouchAtlas=null,cityReady=false;
const idleSheet=new Image(),crouchSheet=new Image(),citySheet=new Image();
function preparePose(sheet,targetHeight){
 const width=sheet.naturalWidth,height=sheet.naturalHeight;
 if(width<100||height<100)throw new Error('Pose image too small');
 const source=document.createElement('canvas');source.width=width;source.height=height;
 const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet,0,0);
 const data=ctx.getImageData(0,0,width,height),pixels=data.data,seen=new Uint8Array(width*height);let body=[];
 for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(r>85&&b>70&&r>g+45&&b>g+40)pixels[i+3]=0;}
 for(let seed=0;seed<seen.length;seed++){
  if(seen[seed]||pixels[seed*4+3]<128)continue;
  const group=[seed];seen[seed]=1;
  for(let k=0;k<group.length;k++){
   const n=group[k],x=n%width,y=Math.floor(n/width);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const xx=x+dx,yy=y+dy,q=yy*width+xx;
    if(xx>=0&&xx<width&&yy>=0&&yy<height&&!seen[q]&&pixels[q*4+3]>=128){seen[q]=1;group.push(q);}
   }
  }
  if(group.length>body.length)body=group;
 }
 if(body.length<500)throw new Error('Connected pose missing');
 let left=width,right=0,top=height,bottom=0;const clean=ctx.createImageData(width,height),anchors=[];
 for(const n of body){const x=n%width,y=Math.floor(n/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);clean.data.set(pixels.subarray(n*4,n*4+4),n*4);}
 for(const n of body){const i=n*4,y=Math.floor(n/width);if(y>top+(bottom-top)*.25&&y<top+(bottom-top)*.55&&pixels[i]>70&&pixels[i]>pixels[i+1]*1.8&&pixels[i]>pixels[i+2]*1.6)anchors.push(n%width);}
 anchors.sort((a,b)=>a-b);const anchor=anchors[Math.floor(anchors.length/2)]??(left+right)/2;
 ctx.putImageData(clean,0,0);const scale=targetHeight/(bottom-top+1),w=Math.round((right-left+1)*scale);
 const atlas=document.createElement('canvas');atlas.width=128;atlas.height=128;const out=atlas.getContext('2d');out.imageSmoothingEnabled=false;
 const x=Math.round(64+(left-anchor)*scale);if(x<0||x+w>128)throw new Error('Pose exceeds cell');
 out.drawImage(source,left,top,right-left+1,bottom-top+1,x,123-targetHeight,w,targetHeight);
 return atlas;
}
idleSheet.onload=()=>{if(document.createElement){try{idleAtlas=preparePose(idleSheet,100)}catch(e){console.warn('Idle artwork unavailable',e)}}};
idleSheet.onerror=()=>{};idleSheet.src='./alter-idle-v4.png';
crouchSheet.onload=()=>{if(document.createElement){try{crouchAtlas=preparePose(crouchSheet,66)}catch(e){console.warn('Crouch artwork unavailable',e)}}};
crouchSheet.onerror=()=>{};crouchSheet.src='./alter-crouch-v4.png';
citySheet.onload=()=>{cityReady=citySheet.naturalWidth>=1024&&citySheet.naturalHeight>=256};citySheet.onerror=()=>{};citySheet.src='./city-v4.png';
function spriteFrame(){
 if(P.crouching)return {sheet:crouchAtlas,ready:!!crouchAtlas,width:128,frame:0};
 if(P.batCd>0)return {sheet:cleanMaster||master,ready:masterReady,frame:[44,46,47,48,48,44][Math.min(5,Math.floor((.42-P.batCd)/.42*6))]};
 if(P.shootCd>0)return {sheet:cleanMaster||master,ready:masterReady,frame:38+Math.min(5,Math.floor((.19-P.shootCd)/.19*6))};
 if(!P.onGround)return {sheet:cleanMaster||master,ready:masterReady,frame:P.vy<-150?22:P.vy<110?25:29};
 if(Math.abs(P.vx)>1&&Math.abs(P.x-previousX)>.001){
   const running=Math.abs(P.vx)>220;
   if(running&&runAtlas)return {sheet:runAtlas,ready:true,width:128,frame:Math.floor(gait*8)%8};
   return {sheet:cleanMaster||master,ready:masterReady,frame:running?[12,13,14][Math.floor(gait*3)%3]:6+Math.floor(gait*6)%6};
 }
 if(idleAtlas)return {sheet:idleAtlas,ready:true,width:128,frame:0};
 return {sheet:cleanMaster||master,ready:masterReady,frame:0};
}
function drawPlayer(){
 const x=previousX+(P.x-previousX)*renderAlpha,y=previousY+(P.y-previousY)*renderAlpha;
 const sprite=spriteFrame();
 if(sprite.ready){
   X.save();X.translate(x+P.w/2,y+P.h);X.scale(P.dir,1);
   if(P.hurt>0&&Math.floor(t*18)%2)X.globalAlpha=.45;
   // Exact 96x128 source cell. All existing sheets have feet at row 122.
   const cellW=sprite.width||96;
   X.drawImage(sprite.sheet,sprite.frame*cellW,0,cellW,128,-cellW*.375,-92.25,cellW*.75,96);
   if(P.crouching&&P.shootCd>0){box(12,-25,20,5,"#a7acab","#111");box(13,-20,5,7,"#55493b");}
   if(P.crouching&&P.batCd>0){X.strokeStyle="#ba8550";X.lineWidth=4;X.beginPath();X.moveTo(12,-20);X.lineTo(P.batCd>.2?32:48,P.batCd>.2?-48:-18);X.stroke();}
   X.restore();return;
 }
 X.save();X.translate(x+P.w/2,y);X.scale(P.dir,1);X.translate(-P.w/2,0);if(P.crouching)X.scale(1,40/64);
 // backpack
 box(-8,20,14,31,"#55493b","#151515");box(-11,26,5,20,"#87704c");
 // Procedural fallback still animates if the image is unavailable.
 const step=P.onGround&&Math.abs(P.vx)>1?Math.sin(gait*Math.PI*2)*5:0;
 X.save();X.translate(0,step);
 box(7,44,9,18,"#d8b487");box(21,44,9,18,"#d8b487");
 box(5,60,13,5,"#ece9df");box(20,60,13,5,"#ece9df");
 X.restore();
 // hoodie
 const red=P.hurt>0&&Math.floor(t*18)%2?"#f2b7ad":"#a83339";
 box(5,18,25,30,red,"#151515");box(0,23,9,21,red);
 // head
 box(9,3,18,18,"#d6a072","#151515");box(8,-2,21,8,"#513326");box(24,1,9,10,"#513326");box(25,8,7,6,"#513326");
 // weapon pose
 if(P.batCd>.20){X.strokeStyle="#b47a45";X.lineWidth=6;X.beginPath();X.moveTo(28,27);X.lineTo(52,5);X.stroke()}
 else box(28,24,17,6,"#a7acab","#111");
 X.restore();
}

function radioPortrait(name,x,y){
 const speaking=dialogT>0&&dialogSpeaker===name;
 box(x,y,70,72,'#172730',speaking?'#ebbd71':'#536269');
 if(hostsReady){
  const cell=hostSheet.naturalWidth/2,col=name==='DEXTER'?1:0;
  // A stable expression per turn avoids moving the head on each syllable.
  X.drawImage(hostSheet,col*cell,speaking?cell:0,cell,cell,x+1,y+1,68,70);
  txt(name,x+35,y+88,12,speaking?'#ffdc94':'#c4c7bd','center');return;
 }
 const dex=name==='DEXTER';
 box(x+16,y+15,38,40,dex?'#bd896b':'#d5a582');
 box(x+13,y+10,44,15,dex?'#333036':'#805331');
 box(x+20,y+31,7,4,'#151820');box(x+43,y+31,7,4,'#151820');
 if(dex){box(x+17,y+28,16,11,'#293340');box(x+37,y+28,16,11,'#293340');box(x+33,y+31,4,3,'#293340');}
 box(x+29,y+46,14,speaking&&Math.sin(t*17)>0?6:2,'#492f30');
 box(x+10,y+23,6,23,'#85979d');box(x+55,y+23,6,23,'#85979d');
 box(x+16,y+57,40,15,dex?'#465b71':'#88634d');
 txt(name,x+35,y+88,12,speaking?'#ffdc94':'#c4c7bd','center');
}
function hud(){
 // top-left card
 box(18,18,310,92,"rgba(5,12,18,.84)","#7c5f48");
 txt("ALTER",34,44,18,"#e4aa67");
 txt("SALUTE",34,67,12,"#cbbfa9");box(96,57,140,12,"#302228");box(96,57,140*P.hp/100,12,"#d84c51");
 txt("STAMINA",34,91,12,"#cbbfa9");box(96,81,140,10,"#1f3035");box(96,81,140*P.stamina/100,10,"#6db8ae");
 txt(`${P.ammo}/${P.maxAmmo}`,292,67,16,"#f1d7a5","center");
 txt(`DOC ${P.docs}/3`,292,92,12,"#9bbfc0","center");

 // Radio hosts: original procedural portraits, animated while speaking.
 box(W-330,18,312,104,'rgba(5,12,18,.84)','#7c5f48');
 radioPortrait('JACK',W-320,24);radioPortrait('DEXTER',W-240,24);
 txt('RADIO 17.8',W-153,48,14,'#e4aa67');
 txt(`MODULI ${P.radioParts}/2`,W-153,74,12,'#9fc5c1');
 txt('IN ASCOLTO',W-153,99,11,'#c9bda7');

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
 const wasJump=jumpHeld,wasRadio=radioHeld;
 for(const key in touch)touch[key]=false;
 for(const action of pointers.values())if(action)touch[action]=true;
 jumpHeld=!!(touch.jump||keys.w||keys.arrowup||keys[' ']);
 if(jumpHeld&&!wasJump)jumpQueued=true;
 radioHeld=!!(touch.radio||keys.e);if(radioHeld&&!wasRadio)radioQueued=true;
 for(const button of document.querySelectorAll('[data-action]'))button.classList.toggle('held',!!touch[button.dataset.action]);
}
function clearInput(){
 setCrouch(false);
 pointers.clear();for(const key in keys)delete keys[key];
 for(const key in touch)touch[key]=false;
 jumpQueued=false;jumpHeld=false;radioQueued=false;radioHeld=false;
 for(const button of document.querySelectorAll('[data-action]'))button.classList.remove('held');
}
function start(){
 if(gameOver||complete)reset();
 started=true;paused=false;last=null;accumulator=0;
 document.getElementById('welcome').hidden=true;
 document.getElementById('pause').textContent='Pausa';
 document.getElementById('note').textContent='Capitolo I · 07.09.4 · La frequenza';
 say('JACK','Alter? Se ci senti, muoviti verso la torre.',4);
}
function togglePause(){
 if(!started)return;
 paused=!paused;clearInput();last=null;accumulator=0;
 previousX=P.x;previousY=P.y;previousCam=cam;
 document.getElementById('pause').textContent=paused?'Riprendi':'Pausa';
 document.getElementById('note').textContent=paused?'In pausa · tocca Riprendi':'Capitolo I · 07.09.4 · La frequenza';
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
const handled=['a','d','w','arrowleft','arrowright','arrowup','arrowdown',' ','shift','j','k','e','p','escape','enter','r'];
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
