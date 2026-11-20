/* Measured glove centres in the 48 × 56 south-facing G8 animation frames.
   The first glove is the character's right hand (left in the image). */
const GLOVE_FRAMES = {
  idle:            [-4.2,10.8, 4.1,10.8],
  walk_left:       [-6.0, 9.6, 5.7,10.1],
  walk_pass_left:  [-6.0,10.4, 5.4,10.1],
  walk_right:      [-5.6,10.6, 4.0,11.6],
  walk_pass_right: [-4.2,11.0, 3.7,11.3],
  crouch:          [-5.2,12.1, 5.1,12.1]
};
const G8_WALK = ['walk_left','walk_pass_left','walk_right','walk_pass_right'];
// Move the dominant hand, then place the supporting palm along the item.
const HELD_POSES = {
  knife:   { side:-1.0, forward:0.6 },
  w_pm:    { side:0.7, forward:2.6 },
  w_obrez: { side:0.4, forward:0.0, support:6.2, turn:0.44 },
  w_aksu:  { side:0.2, forward:-0.6, support:8.0, turn:0.51 },
  grenade: { side:-0.4, forward:-0.3 }
};
const HELD_SPRITES = {
  knife:   {file:'assets/g8/hand_knife.webp',   width:2.35, grip:.32},
  w_pm:    {file:'assets/g8/hand_w_pm.webp',     width:3.9,  grip:.23},
  w_obrez: {file:'assets/g8/hand_w_obrez.webp',  width:4.5,  grip:.32},
  w_aksu:  {file:'assets/g8/hand_w_aksu.webp',  width:3.65, grip:.36},
  grenade: {file:'assets/g8/hand_grenade.webp', width:4.3,  grip:.25}
};
function frameWeapon(e, id, W, grip) {
  const gait = gaitOf(e);
  const pose = e.campRise != null ? 'idle' : e.crouch ? 'crouch' : gait.moving ? G8_WALK[gait.phase] : 'idle';
  const skin = g3Skin(e), mount = HELD_POSES[id], coords = GLOVE_FRAMES[pose];
  const dy = skin === 'bandit' ? -1.5 : skin === 'army' ? -0.8 : 0;
  const right = [coords[0],coords[1]+dy], left = [coords[2],coords[3]+dy];
  const turn = mount.turn || 0, cos = Math.cos(turn), sin = Math.sin(turn);
  const rear = [right[0]+mount.side,right[1]+mount.forward];
  const front = mount.support ? [rear[0]+sin*mount.support,rear[1]+cos*mount.support] : left;
  // The torso turns across a long weapon. The barrel stays on the aim axis.
  const main = [cos*rear[0]-sin*rear[1],sin*rear[0]+cos*rear[1]];
  const support = mount.support ? [main[0],main[1]+mount.support] : left;
  return {mode:'g3', id, W, grip, pose, right, left, rear, front, turn, main, support, muzzle:[main[0],main[1]+W.len]};
}

const heldFrames = new WeakMap();
function frameCanvas(source) {
  const c = document.createElement('canvas');
  c.width = source.width; c.height = source.height;
  return c;
}
// Separate each forearm along the inside of its sleeve, keeping knees and boots
// on the body layer. Move the cuff and glove together, tapering back to the elbow.
function poseSleeve(body, source, from, to, side, crouch) {
  const arm = frameCanvas(source), g = arm.getContext('2d');
  const scale = arm.width / 48, x = from[0], y = from[1];
  const palm = crouch ? 2.65 : 2.25;
  g.setTransform(scale,0,0,scale,arm.width/2,arm.height/2);
  const cut = new Path2D();
  cut.moveTo(x+side*2.1,y-10.5);
  cut.lineTo(x-side*.15,y-4.2);
  cut.lineTo(x-side*(palm+.6),y-1.5);
  cut.lineTo(x-side*(palm+.6),y+palm+.4);
  cut.lineTo(side*24,y+palm+.4);
  cut.lineTo(side*24,y-10.5);
  cut.closePath(); g.clip(cut); g.drawImage(source,-24,-28,48,56);
  body.save();
  body.setTransform(scale,0,0,scale,arm.width/2,arm.height/2);
  body.clip(cut); body.clearRect(-24,-28,48,56); body.restore();
  const start = Math.floor((28+y-10.5)*scale), end = Math.ceil((28+y+palm+.4)*scale);
  const dx=(to[0]-x)*scale, dy=(to[1]-y)*scale;
  let lastY=start;
  for (let row=start; row<end; row++) {
    const t=clamp((row+1-start)/(8.4*scale),0,1);
    const blend=t*t*(3-2*t);
    const nextY=Math.round(row+1+dy*blend);
    if (nextY>lastY) body.drawImage(arm,0,row,arm.width,1,Math.round(dx*blend),lastY,arm.width,nextY-lastY);
    lastY=nextY;
  }
}
function equippedFrame(images, asset, w) {
  const source = asset && images[asset.file];
  if (!source) return null;
  let models = heldFrames.get(source);
  if (!models) { models=new Map(); heldFrames.set(source,models); }
  const sprite=packImage(HELD_SPRITES[w.id].file), cached=models.get(w.id);
  if (cached && cached.sprite === sprite) return cached;
  const body=frameCanvas(source), b=body.getContext('2d');
  b.drawImage(source,0,0);
  const crouch=w.pose==='crouch';
  poseSleeve(b,source,w.right,w.rear,-1,crouch);
  if (w.grip==='two') poseSleeve(b,source,w.left,w.front,1,crouch);
  const scale=source.width/48;
  const image=frameCanvas(source);
  const height=Math.max(56,Math.ceil(30+w.muzzle[1]));
  image.height=height*scale;
  const g=image.getContext('2d');
  g.setTransform(scale,0,0,scale,source.width/2,source.height/2);
  g.save(); g.rotate(w.turn); g.drawImage(body,-24,-28,48,56); g.restore();
  drawWeaponLocal(g,w);
  g.rotate(w.turn);
  // Use the actor's own glove pixels to cover the grip; the stock sits under the shoulder.
  const cover = new Path2D();
  for (const hand of w.grip==='two' ? [w.rear,w.front] : [w.rear]) {
    cover.moveTo(hand[0]+2.5, hand[1]);
    cover.ellipse(hand[0],hand[1],crouch?2.45:1.95,crouch?2.15:1.65,0,0,Math.PI*2);
  }
  if (w.turn) {
    cover.moveTo(7,-3); cover.ellipse(0,-3,7,6.5,0,0,Math.PI*2);
    cover.moveTo(-4,-4); cover.ellipse(-8,-4,4,4.5,0,0,Math.PI*2);
  }
  g.clip(cover); g.drawImage(body,-24,-28,48,56);
  const model={image,height,sprite};
  models.set(w.id,model);
  return model;
}
