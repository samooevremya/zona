/* Optional authored key poses. Timing is visual only; never delay damage/death. */
(function(g){
function sample(skin,state,seconds){const human=['loner','zarya','bandit','army'].includes(skin),mutant=['dog','boar','sucker'].includes(skin);if(human&&state==='captive')return'captive';if(human&&state==='death_transition')return seconds<.14?'fall_start':seconds<.34?'fall_mid':'dead';if(mutant&&state==='death_transition')return seconds<.18?'collapse':'dead';if(mutant&&state==='attack_anticipation')return'anticipation';if(mutant&&state==='recoil')return'recoil';return null;}
function draw(ctx,manifest,images,o){const pose=sample(o.skin,o.state,Math.max(0,o.age||0)),a=pose&&manifest.actors[o.skin]?.[pose],im=a&&images[a.file];if(!im)return false;ctx.save();try{ctx.translate(o.x,o.y);ctx.rotate((o.angle??Math.PI/2)-Math.PI/2);ctx.globalAlpha*=o.opacity??1;ctx.drawImage(im,-a.width*a.pivot[0],-a.height*a.pivot[1],a.width,a.height);return true;}finally{ctx.restore();}}
const api={sample,draw};g.CordonPoseKeys=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
