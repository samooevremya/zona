// Mirror adjoining edges to keep the source material continuous across repeats.
const surfaceTiles=[];
function fillMaterial(ctx,id,x,y,w,h,scale,opacity){
  if(!surfaceTiles[id])return;
  const pattern=ctx.createPattern(surfaceTiles[id],'repeat');
  pattern.setTransform(new DOMMatrix().scale(scale/surfaceTiles[id].width));
  ctx.save();ctx.globalAlpha*=opacity;ctx.fillStyle=pattern;ctx.fillRect(x,y,w,h);ctx.restore();
}
async function loadMaterials(){
  await objectsImage.decode().catch(()=>{});
  const img=new Image();img.src='__MATERIAL_ATLAS__';await img.decode();
  for(let i=0;i<4;i++){
    const c=document.createElement('canvas');c.width=c.height=512;
    const ctx=c.getContext('2d'),half=img.width/2;
    for(const mx of [0,1])for(const my of [0,1]){
      ctx.save();ctx.translate(mx?512:0,my?512:0);ctx.scale(mx?-1:1,my?-1:1);
      ctx.drawImage(img,(i%2)*half+2,Math.floor(i/2)*half+2,half-4,half-4,0,0,256,256);ctx.restore();
    }
    surfaceTiles.push(c);
  }
}
const clips=__WINTER_AUDIO__;
let lastFoot=0,footCount=0;
function effect(id,volume=.25){
  if(!soundEnabled||!clips[id])return;
  const a=new Audio(clips[id]);a.volume=volume*(state.controls?.sound??75)/75; a.volume=Math.min(1,a.volume);a.play().catch(()=>{});
}
const objectsImage=new Image();
objectsImage.src='__OBJECT_ATLAS__';
function stamp(ctx,id,x,y,w,h,start=0,end=1){
  if(!objectsImage.complete||!objectsImage.naturalWidth)return false;
  ctx.drawImage(objectsImage,id%3*256+1,Math.floor(id/3)*256+1+start*254,254,(end-start)*254,x,y,w,h);
  return true;
}
