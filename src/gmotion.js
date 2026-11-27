/* South-facing local coordinates. Gameplay owns position, aim and action timers.
   This layer only samples those values and keeps disposable animation state. */
const humanMotionOn = G3.on && window.CORDON_G8_ON && !G7.rigOn && !/motion-off|rig-off/.test(location.hash);
const motionSkins = new Map();
const motionIdle = {cycle:0,drive:0,side:0,forward:1,run:0,low:0,ready:0,look:0,swap:0,pack:0,hips:0};
function motionSkin(e) {
  if (!humanMotionOn || !e.alive || e.sit || e.campRise != null || e.captive || e.wounded || e.sid==='sid') return null;
  const skin=rigSkin(e);
  if(!skin)return null;
  const color=skin==='loner' && e!==P ? JACKET_COLORS[jacketIndex(e)] : '';
  const winterTone=BEREZKI?winterCoatTone(e):null;
  const key=skin+(winterTone||color);
  if(!motionSkins.has(key)){
    motionSkins.set(key,null);
    const files=CORDON_RIG.manifest.skins[skin];
    Promise.all(Object.entries(files).map(async ([name,file])=>{
      const img=new Image();img.src=CORDON_RIG.images[file];await img.decode();
      if(winterTone)return [name,winterCloth(img,name,winterTone)];
      if(!color)return [name,img];
      const c=frameCanvas(img),g=c.getContext('2d');
      g.filter={white:'saturate(.58) brightness(1.32)',beige:'saturate(.81) brightness(1.07)',brown:'sepia(.25) brightness(.83)'}[color];
      g.drawImage(img,0,0);return [name,c];
    })).then(entries=>{
      const art=Object.fromEntries(entries),core=art.core;
      // The hood and the bedroll come from the same raster as the shoulders.
      const head=frameCanvas(core),g=head.getContext('2d');
      const hood=skin==='army'?[.5,.293,.34,.263]:skin==='bandit'?[.49,.35,.27,.30]:[.5,.52,.221,.232];
      g.scale(core.width,core.height);g.beginPath();g.ellipse(...hood,0,0,Math.PI*2);
      art.neckY=-13.4+hood[1]*26;
      g.clip();g.drawImage(core,0,0,1,1);art.head=head;
      motionSkins.set(key,art);
    }).catch(()=>{}); // Keep the complete painted actor available if decoding fails.
  }
  return motionSkins.get(key);
}
function updateHumanMotion(e,g,dx,dy,d,dt,tele){
  if(g.cycle==null)Object.assign(g,motionIdle,{angle:e.ang,weapon:e===P?S.weapon:e.wpn});
  const fixed=e.sit || e.campRise!=null || e.captive || e.wounded || e.sid==='sid';
  const speed=d/Math.max(dt,.001),walk=!fixed && !tele && speed>6;
  const turn=tele||fixed?0:angD(g.angle,e.ang);
  g.angle=e.ang;
  const mix=1-Math.exp(-12*dt),running=walk && (e===P ? e.sprinting : speed>100);
  g.run=lerp(g.run,running?1:0,mix);
  g.low=lerp(g.low,e.crouch?1:0,mix);
  if(walk){
    g.side=(dx*Math.sin(e.ang)-dy*Math.cos(e.ang))/d;
    g.forward=(dx*Math.cos(e.ang)+dy*Math.sin(e.ang))/d;
  }
  // A desktop pointer can turn through 180 degrees in one tick. Let the feet
  // finish that pivot while the weapon already follows the aim direction.
  g.pivot=walk||fixed||tele?0:clamp((g.pivot||0)+turn,-Math.PI,Math.PI);
  const pivot=clamp(g.pivot,-dt*7,dt*7);
  g.pivot-=pivot;
  if(!walk && Math.abs(pivot)>.001){g.side=Math.sign(pivot);g.forward=0;}
  // The pelvis follows travel partway. Backpedalling keeps toes forward.
  const travel=Math.atan2(-g.side,g.forward);
  const hips=walk?clamp(Math.cos(travel)<0?angD(Math.PI,travel):travel,-.84,.84):0;
  g.hips=lerp(g.hips||0,hips,mix);
  const stride=e.crouch?23:running?44:36;
  const old=Math.floor(g.cycle/Math.PI);
  const advance=walk?d*Math.PI/stride:Math.abs(pivot)*2.7;
  g.cycle+=advance;
  g.drive=lerp(g.drive,advance>.003?1:0,mix);
  g.pack=lerp(g.pack,g.run*Math.cos(g.cycle),1-Math.exp(-6*dt));
  const id=e===P?S.weapon:e.wpn;
  g.swap=id!==g.weapon?1:Math.max(0,g.swap-dt*3.6);g.weapon=id;
  const engaged=e===P?(!IN.touch || IN.tapShot || IN.fire || IN.btnFire || IN.aimStick?.active || P.cool>.01):e.tgt?.alive;
  g.ready=lerp(g.ready,engaged?1:0,1-Math.exp(-dt*(engaged?20:5)));
  const interest=e.listen || (e!==P && (e.talkT>0 || panel?.e===e) ? P : null);
  const look=interest?clamp(angD(e.ang,Math.atan2(interest.y-e.y,interest.x-e.x)),-.55,.55):0;
  g.look=lerp(g.look,look,1-Math.exp(-16*dt));
  if(tele || fixed){g.drive=0;g.pack=0;}
  const step=Math.floor(g.cycle/Math.PI);
  if(walk && step!==old && !(e.jumpT>0)){
    const side=step%2?-1:1,foot=motionFoot(g,side),point=localToWorld(e,e.ang,...foot);
    point.a=e.ang+g.hips;
    if(BEREZKI && swampAt(point.x,point.y))marshContact(e,point,step);
    if(livingZone && (e===P || inhabited && dE(e,P)<320))leaveBootMark(e,point);
    if(e===P){
      const surface=surf(point.x,point.y);emitFootfall(surface);
      play(surface,undefined,undefined,e.crouch?.36:running?1.3:1);
      if(surface==='stepWood' && loftAt(e) && step%4===1)play('creak');
    }else if(dE(e,P)<380)play(surf(point.x,point.y),point.x,point.y,.6);
  }
}
function motionFoot(g,sign){
  const step=Math.cos(g.cycle)*sign*g.drive*(5.3+g.run*3.7-g.low*1.4);
  const a=g.hips||0,lat=sign*(5.2+g.low*3.4),front=13+g.low*2.5;
  return [lat*Math.cos(a)-front*Math.sin(a)+step*g.side,
    lat*Math.sin(a)+front*Math.cos(a)+step*g.forward];
}
function motionReload(e,id){
  if(!(e.reload>0) || !WP[id]?.reload)return 0;
  const duration=WP[id].reload*(e===P?1:1.2);
  return Math.sin(Math.PI*clamp(e.reload/duration,0,1));
}
function motionWeapon(e,id,W,grip){
  const g=GAIT.get(e) || motionIdle, re=motionReload(e,id);
  const draw=g.swap||0,ready=g.ready||0;
  const x=(BEREZKI && id==='w_obrez'?-3.7:0)+(grip==='two'?-2.2:-3)+(grip==='two'?.6:0)*ready-2*draw;
  const y=(BEREZKI && id==='w_obrez'?4:0)+(grip==='two'?4.5:8)+ready*2.4-re*2.5-draw*5+(DETECTORS[id]?3:0);
  const support=HELD_POSES[id]?.support||6;
  return {mode:'g3',articulated:true,id,W,grip,main:[x,y],support:[x,y+support],muzzle:[x,y+W.len]};
}
function motionSegment(g,im,ax,ay,bx,by,width,buried=0){
  g.save();g.translate(ax,ay);g.rotate(-Math.atan2(bx-ax,by-ay));
  const length=Math.hypot(bx-ax,by-ay)+2,visible=Math.max(.25,1-buried/length);
  if(buried>0)g.drawImage(im,0,0,im.width,im.height*visible,-width/2,-1,width,length*visible);
  else g.drawImage(im,-width/2,-1,width,length);
  g.restore();
}
function paintMotionHuman(target,e,opacity){
  const art=motionSkin(e);if(!art)return false;
  const g=GAIT.get(e) || motionIdle;
  const w=weaponLocal(e),swing=Math.cos(g.cycle||0)*(g.drive||0);
  const sway=actorFrameMotion(e,gaitOf(e).moving);
  const base=window.__g7tap?target.getTransform():null;
  target.save();target.globalAlpha*=opacity;
  target.translate(e.x+(sway?.dx||0),e.y+(sway?.dy||0));target.scale(sway?.k||1,sway?.k||1);
  target.rotate(e.ang-Math.PI/2);
  const weightShift=idleWeight(e)*(1-(g.drive||0));target.translate(weightShift,0);
  const low=g.low||0,lean=(g.run||0)*2-low*2.1;
  const reload=w?motionReload(e,w.id):0;
  const breath=Math.sin(G7.vt*1.85+(e.seed||0))*.21*(1-(g.drive||0));
  const torsoTurn=(w?.grip==='two' ? .31 : 0)+swing*.075;
  const hands=[],guitar=holdsGuitar(e)?guitarHands(e):null;
  const buried=BEREZKI && !e.jumpT?Math.max(snowAtBoots(e),marshDepth(e.x,e.y)*1.8):0;
  for(const [index,sign] of [['l',-1],['r',1]]){
    const foot=motionFoot(g.cycle==null?motionIdle:g,sign);
    const spread=sign*(4.6+low);
    motionSegment(target,art['leg_'+index],spread,.8,foot[0],foot[1],6+low*.6,7*buried);
    const ax=sign*8.4,ay=-1+lean+ax*Math.sin(torsoTurn);
    let hx=sign*(8.6+low),hy=7-sign*swing*(2.1+1.2*(g.run||0))*(g.forward??1)+lean;
    if(w && sign<0){[hx,hy]=w.main;}
    if(w && sign>0 && (w.grip==='two'||reload>.02)){
      const grip=w.grip==='two'?w.support:w.main;
      hx=lerp(grip[0],5.8,reload);hy=lerp(grip[1],2.5,reload);
    }
    if(BEREZKI && !e.tgt && e.shoreAction==='net'){
      const pull=(1-Math.cos(G7.vt*2.7))*.5;
      hx=sign*(sign<0?4+pull*3:5.2);hy=sign<0?15-6*pull:14+.8*pull;
    }else if(BEREZKI && e.shoreAction==='sweep'){
      const side=3.6*Math.sin(G7.vt*2.2);hx=side+sign*2.2;hy=sign<0?12:7;
    }
    if(guitar)[hx,hy]=guitar[sign<0?0:1];
    const dx=hx-ax,dy=hy-ay,len=Math.max(.01,Math.hypot(dx,dy));
    const bend=Math.min(4,Math.sqrt(Math.max(0,6.7*6.7-len*len*.25)));
    const ex=(ax+hx)*.5+sign*dy*bend/len,ey=(ay+hy)*.5-sign*dx*bend/len;
    motionSegment(target,art['arm_'+index+'_upper'],ax,ay,ex,ey,6.4);
    hands.push({index,hx,hy,ex,ey});
  }
  target.save();target.translate(0,lean+breath);target.rotate(torsoTurn);
  const packShift=(g.pack||0)*1.3;
  if(Math.abs(packShift)>.08 && (rigSkin(e)==='loner'||rigSkin(e)==='zarya')){
    const shoulder=art.core.height*.31;
    target.drawImage(art.core,0,shoulder,art.core.width,art.core.height-shoulder,-11.7,-5.34,23.4,17.94);
    target.drawImage(art.core,0,0,art.core.width,shoulder,-11.7,-13.4+packShift,23.4,8.2-packShift);
  }else target.drawImage(art.core,-11.7,-13.4,23.4,26);
  if(g.look && Math.abs(g.look)>.02){
    target.save();target.translate(0,art.neckY);target.rotate(g.look);
    target.drawImage(art.head,-11.7,-13.4-art.neckY,23.4,26);target.restore();
  }
  if(e===P || e.sid==='wolf'){
    const roll=packImage('assets/g8/player_bedroll.webp');
    if(roll){
      target.save();
      if(e.sid==='wolf'){target.translate(1,-.6);target.rotate(-.24);}
      target.drawImage(roll,-9,-14+(g.pack||0)*1.4,18,5.5);target.restore();
    }
  }
  if(e.flash>0){
    target.globalCompositeOperation='lighter';target.globalAlpha*=Math.min(.55,e.flash*4);
    target.drawImage(art.core,-11.7,-13.4,23.4,26);
  }
  target.restore();
  for(const {index,hx,hy,ex,ey} of hands)
    motionSegment(target,art['arm_'+index+'_lower'],ex,ey,hx,hy,5.2);
  if(base)window.__g7tap(e,base,target.getTransform(),w);
  if(BEREZKI && !e.tgt && e.shoreAction==='net'){
    const hand=hands[0];
    beam(target,hand.hx,hand.hy,hand.hx+1,hand.hy+4,1.7,'#96805b');
    target.strokeStyle='#897e67';target.lineWidth=.75;target.beginPath();
    target.moveTo(hand.hx+1,hand.hy+4);target.quadraticCurveTo(0,21,5,24);target.stroke();
  }else if(BEREZKI && e.shoreAction==='sweep'){
    const side=hands[0].hx;
    beam(target,side+4,4,side-4,20,1.7,'#7e6950');
    for(let i=-3;i<=3;i++)beam(target,side-4,18,side-5+i,24-Math.abs(i)*.45,.9,'#8e816b');
  }
  if(guitar)paintGuitar(target);
  else if(w)drawWeaponLocal(target,w);
  for(const {index,hx:x,hy:y,ex,ey} of hands){
    const im=art['arm_'+index+'_hand'],r=-Math.atan2(x-ex,y-ey);
    target.save();target.translate(x,y);target.rotate(r);target.drawImage(im,-2.35,-1.9,4.7,4.6);target.restore();
  }
  if(BEREZKI && w?.id==='w_obrez'){
    // The stock can cross the hood during a turn or reload. The hood is above the hands.
    target.save();target.translate(0,lean+breath);target.rotate(torsoTurn);
    target.translate(0,art.neckY);target.rotate(g.look||0);
    target.drawImage(art.head,-11.7,-13.4-art.neckY,23.4,26);target.restore();
  }
  target.restore();return true;
}

function woundedAttention(e){
  const near=e!==P?clamp(1-(dE(e,P)-22)/65,0,1):0;
  return (panel?.e===e?1:near*.65)+.12*Math.sin(G7.vt*1.9+(e.seed||0));
}
function campMotion(e){
  const talking=panel?.e===e || e.bub || e.talkT>0;
  if(talking){
    const turn=angD(e.ang,Math.atan2(P.y-e.y,P.x-e.x));
    return {lean:.55,turn:clamp(turn,-.19,.19)};
  }
  const drink=inhabited && e.sid?.startsWith('lz_guest')?tavernSip(e):0;
  if(drink)return {lean:drink*1.2,turn:.1*drink};
  const phase=(G7.vt+(e.seed||0)%37)%15;
  const warm=fireLit(e.fireRef) && dE(e,e.fireRef)<76 && phase<3.3?Math.sin(Math.PI*phase/3.3):0;
  return {lean:warm*1.4,turn:warm*((e.seed||0)%2?.08:-.08)};
}
