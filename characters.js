/* Sprite import and drawing. Source artwork stays intact; each pose is cached once.
   Shared animation atlas: 0..7 run, 8..15 run + pistol, 16..23 run + baton,
   24 idle, 25 jump, 26 fall, 27 land, 28..30 swing, 31 hurt. */
(()=>{
'use strict';
const FRAMES=32,CELL=128,HEIGHT=128,FOOT=120;
const bank={ready:false,error:false,frames:[],bandits:[],portraitsReady:false};
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function importAtlas(img){
 const source=canvas(img.naturalWidth,img.naturalHeight),sc=source.getContext('2d',{willReadFrequently:true});
 sc.drawImage(img,0,0);const data=sc.getImageData(0,0,source.width,source.height).data;
 const w=source.width,h=source.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];
 // Flood-fill the complete atlas: a gun crossing a grid line still belongs to its owner.
 for(let seed=0;seed<w*h;seed++){
  if(seen[seed]||data[seed*4+3]<128)continue;
  let head=0,tail=1,left=w,right=0,top=h,bottom=0;queue[0]=seed;seen[seed]=1;
  const members=[];
  while(head<tail){
   const at=queue[head++],x=at%w,y=Math.floor(at/w);members.push(at);
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;
    const next=ny*w+nx;if(!seen[next]&&data[next*4+3]>=128){seen[next]=1;queue[tail++]=next}
   }
  }
  if(members.length>500)components.push({left,right,top,bottom,members});
 }
 if(components.length!==FRAMES)throw new Error('Expected 32 isolated poses, got '+components.length);
 components.sort((a,b)=>a.bottom-b.bottom);
 const ordered=[];for(let row=0;row<4;row++)ordered.push(...components.slice(row*8,row*8+8).sort((a,b)=>a.left-b.left));
 const standing=ordered.slice(0,8).map(c=>c.bottom-c.top+1).sort((a,b)=>a-b);
 const scale=84/standing[4];
 for(let frame=0;frame<FRAMES;frame++){
  const component=ordered[frame];
  const raw=canvas(component.right-component.left+1,component.bottom-component.top+1),r=raw.getContext('2d');
  const pixels=r.createImageData(raw.width,raw.height),d=pixels.data;
  for(const at of component.members){
   const dest=((Math.floor(at/w)-component.top)*raw.width+at%w-component.left)*4;
   d[dest]=data[at*4];d[dest+1]=data[at*4+1];d[dest+2]=data[at*4+2];d[dest+3]=255;
  }
  const left=0,right=raw.width-1,top=0,bottom=raw.height-1;
  // Align the lower hoodie, not the overall box (which includes a moving weapon).
  const hips=[];
  for(let y=Math.round(top+(bottom-top)*.45);y<=top+(bottom-top)*.58;y++)for(let x=left;x<=right;x++){
   const i=(y*raw.width+x)*4;
   if(d[i+3]&&d[i]>55&&d[i]>d[i+1]*1.7&&d[i]>d[i+2]*1.5)hips.push(x);
  }
  hips.sort((a,b)=>a-b);
  const anchor=hips.length?hips[Math.floor(hips.length/2)]:(left+right)/2;
  r.putImageData(pixels,0,0);
  const c=canvas(CELL,HEIGHT),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.drawImage(raw,left,top,right-left+1,bottom-top+1,
   Math.round(CELL/2+(left-anchor)*scale),Math.round(FOOT-(bottom-top+1)*scale),
   Math.round((right-left+1)*scale),Math.round((bottom-top+1)*scale));
  bank.frames.push(c);
 }
 // The same silhouettes/poses, recoloured once to distinguish the three bandits.
 const palettes=[[57,94,102],[124,79,49],[93,75,122]];
 for(const palette of palettes)bank.bandits.push(bank.frames.map(src=>{
  const c=canvas(CELL,HEIGHT),ctx=c.getContext('2d');ctx.drawImage(src,0,0);
  const p=ctx.getImageData(0,0,CELL,HEIGHT),d=p.data;
  for(let i=0;i<d.length;i+=4)if(d[i+3]&&d[i]>d[i+1]*1.65&&d[i]>d[i+2]*1.45&&d[i]>45){
   const light=d[i]/180;d[i]=Math.min(255,palette[0]*light);d[i+1]=Math.min(255,palette[1]*light);d[i+2]=Math.min(255,palette[2]*light);
  }
  ctx.putImageData(p,0,0);return c;
 }));
 bank.ready=true;
}
const atlas=new Image();atlas.onload=()=>{try{importAtlas(atlas)}catch(e){bank.error=true;console.error(e)}};atlas.onerror=()=>{bank.error=true};atlas.src='./assets/alter-actions.png';
const portraits=new Image();portraits.onload=()=>{bank.portraitsReady=true;drawPortraits()};portraits.src='./assets/radio-hosts.png';
function drawPortraits(){
 if(!bank.portraitsReady)return;
 ['jack','dexter'].forEach((name,i)=>{
  const c=document.getElementById('face-'+name);if(!c)return;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,c.width,c.height);
  ctx.drawImage(portraits,i*portraits.naturalWidth/2,0,portraits.naturalWidth/2,portraits.naturalHeight,0,0,c.width,c.height);
 });
}
bank.draw=function(ctx,frame,x,feet,dir=1,type=-1,scale=1){
 if(!bank.ready)return false;
 const image=type<0?bank.frames[frame]:bank.bandits[type%3][frame];if(!image)return false;
 ctx.save();ctx.translate(Math.round(x),Math.round(feet));ctx.scale(dir*scale,scale);
 ctx.drawImage(image,-CELL/2,-FOOT);ctx.restore();return true;
};
window.EcoCharacters=bank;
})();
