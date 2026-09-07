const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const context=vm.createContext({document:{createElement:()=>createCanvas(1,1)}});
vm.runInContext(source.slice(source.indexOf('function prepareBandits'),source.indexOf('banditSheet.onload'))+source.slice(source.indexOf('function prepareFrames'),source.indexOf('master.onerror')),context);
test('18 actual enemy poses have transparent backgrounds and intact feet',async()=>{
 const sheet=await loadImage(__dirname+'/assets/bandits-v2.png');sheet.naturalWidth=sheet.width;sheet.naturalHeight=sheet.height;
 const frames=context.prepareBandits(sheet);assert.equal(frames.length,18);
 const preview=createCanvas(768,384),ctx=preview.getContext('2d');ctx.fillStyle='#243039';ctx.fillRect(0,0,768,384);
 frames.forEach((frame,n)=>{
  const data=frame.getContext('2d').getImageData(0,0,128,128).data;let opaque=0,magenta=0,bottom=0;
  for(let i=0;i<data.length;i+=4)if(data[i+3]>=128){opaque++;if(data[i]>85&&data[i+2]>70&&data[i]>data[i+1]+45&&data[i+2]>data[i+1]+40)magenta++;bottom=Math.max(bottom,Math.floor(i/4/128));}
  assert.ok(opaque>1000&&opaque<10000,'sensible silhouette '+n);assert.equal(magenta,0);assert.ok(bottom>=126);assert.equal(data[3],0);
  ctx.drawImage(frame,(n%6)*128,Math.floor(n/6)*128);
 });
 if(process.env.ECO_QA_OUTPUT)fs.writeFileSync(process.env.ECO_QA_OUTPUT+'/bandits-check.png',preview.toBuffer('image/png'));
});
test('Alter used animation cells keep a shared floor and nonempty silhouettes',async()=>{
 const sheet=await loadImage(__dirname+'/alter_master_sheet.png'),atlas=context.prepareFrames(sheet);
 const frames=[0,6,7,8,9,10,11,12,13,14,22,25,29,38,39,40,41,42,43,44,46,47,48];
 const preview=createCanvas(768,384),ctx=preview.getContext('2d');ctx.fillStyle='#243039';ctx.fillRect(0,0,768,384);
 frames.forEach((n,k)=>{
  const data=atlas.getContext('2d').getImageData(n*96,0,96,128).data;let count=0,bottom=0;
  for(let i=0;i<data.length;i+=4)if(data[i+3]>=80){count++;bottom=Math.max(bottom,Math.floor(i/4/96));}
  assert.ok(count>300,'body present '+n);assert.equal(bottom,122,'common floor '+n);
  ctx.drawImage(atlas,n*96,0,96,128,(k%8)*96,Math.floor(k/8)*128,96,128);
 });
 if(process.env.ECO_QA_OUTPUT)fs.writeFileSync(process.env.ECO_QA_OUTPUT+'/alter-check-v2.png',preview.toBuffer('image/png'));
});
