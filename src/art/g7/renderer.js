/* G3 rendering helper. Physics and game state are owned by the host. */
(function(root){'use strict';
const cycle=['walk_left','walk_pass_left','walk_right','walk_pass_right'];
function selectPose(a){if(a.dead)return'dead';if(a.wounded)return'wounded';if(a.captive||a.seated)return'seated';if(a.crouch)return'crouch';if(a.attack)return'attack';if(a.moving)return cycle[Math.floor((a.time||0)*7)%4];return'idle';}
function resolve(manifest,a){const poses=manifest.actors[a.skin];if(!poses)return null;const pose=selectPose(a);return{pose,asset:poses[pose]||(pose==='walk_pass_left'||pose==='walk_pass_right'?poses.idle:null)||poses.idle};}
function draw(ctx,manifest,images,a,equipment){const r=resolve(manifest,a);if(!r||!images[r.asset.file])return false;const f=r.asset,im=images[f.file];ctx.save();try{ctx.translate(a.x,a.y);if(a.shadow!==false){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(2,3,a.skin==='boar'?13:10,7,0,0,Math.PI*2);ctx.fill();}ctx.rotate((a.angle||0)-Math.PI/2);ctx.globalAlpha*=a.opacity??1;const model=a.equipped;ctx.drawImage(model ? model.image : im,-f.width*f.pivot[0],-f.height*f.pivot[1],f.width,model ? model.height : f.height);
// Host callback receives south-facing local coordinates, no second rotation needed.
if(equipment&&!['dead','wounded','seated'].includes(r.pose))equipment(ctx,{socket:f.equipmentSocket,pose:r.pose,weapon:a.weapon});
}finally{ctx.restore();}return true;}
async function load(manifest,base='',data){const images={};const paths=new Set(Object.values(manifest.actors).flatMap(p=>Object.values(p).map(a=>a.file)));await Promise.all([...paths].map(file=>new Promise(resolve=>{let im=new Image();im.onload=()=>{images[file]=im;resolve();};im.onerror=()=>resolve();im.src=data?.[file]||base+file;})));return images;}
const api={selectPose,resolve,draw,load};if(typeof module!=='undefined')module.exports=api;root.CordonG3=api;
})(typeof globalThis!=='undefined'?globalThis:this);
