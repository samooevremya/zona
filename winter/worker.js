/* Animated railway worker. All geometry is in metres, in (right, forward, up) coordinates. */
(() => {
  'use strict';
  const TAU = 2 * Math.PI;
  const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
  const blend = (a, b, t) => a + (b - a) * t;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const times = (v, scale) => v.map(n => n * scale);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = v => times(v, 1 / (Math.hypot(...v) || 1));
  const colours = {
    coat: [111, 114, 85], folds: [91, 96, 75], shoulder: [124, 124, 91],
    pocket: [106, 106, 78], strap: [131, 112, 81], bag: [117, 103, 79],
    pants: [81, 79, 72], knee: [93, 88, 77], boot: [58, 54, 48], sole: [48, 47, 46],
    cap: [76, 80, 78], rib: [63, 67, 66], scarf: [87, 78, 66],
    skin: [175, 137, 110], glove: [90, 78, 62], steel: [144, 154, 153],
    iron: [61, 64, 63], wood: [118, 84, 63]
  };
  const pigment = new Map();
  function tint(rgb, k) {
    const level = Math.round(clamp(k, .55, 1.35) * 32);
    const index = ((rgb[0] * 256 + rgb[1]) * 256 + rgb[2]) * 64 + level;
    if (!pigment.has(index)) pigment.set(index, `rgb(${rgb.map(v => Math.round(v * level / 32)).join(',')})`);
    return pigment.get(index);
  }
  const circles = {};
  function ringAngles(count) {
    return circles[count] ||= Array.from({length:count}, (_,i) => [Math.cos(TAU*i/count), Math.sin(TAU*i/count)]);
  }
  // Two equal limb segments, with the bend constrained towards the supplied pole.
  function elbowOrKnee(root, target, pole, length) {
    const delta = sub(target,root), axis = unit(delta);
    const bend = unit(sub(pole, times(axis, dot(pole,axis))));
    const offset = Math.sqrt(Math.max(.00002, length*length - dot(delta,delta)/4));
    return add(add(root,times(delta,.5)),times(bend,offset));
  }

  function drawWorker(ctx,x,y,scale,state = {}) {
    if (!(scale > 0)) return;
    const heading=state.heading || 0, phase=state.phase || 0, time=state.time || 0;
    const speed=Math.max(0,state.speed || 0), jump=Math.max(0,state.jump || 0);
    const legs=state.legHeading??heading, travelAngle=(state.travelHeading??legs)-legs;
    let cs, sn, view, light;
    const moving=clamp(speed/.7,0,1), run=clamp((speed-1.7)/1.9,0,1);
    const airborne=clamp(jump/.27,0,1), stride=blend(.32,.52,run);
    const bob=moving*(.017+run*.02)*Math.cos(phase*2) + .004*Math.sin(time*2.3);
    const sway=moving*.018*Math.sin(phase), lean=.018+run*.08;
    const faces=[];
    function orient(angle){
      cs=Math.cos(angle);sn=Math.sin(angle);
      view=[.75*cs,.75*sn,.70];light=[.52*sn-.30*cs,-.52*cs-.30*sn,.80];
    }
    orient(legs);
    function project(p) {
      const wy=cs*p[0]+sn*p[1];
      return [cs*p[1]-sn*p[0],.70*wy-.75*p[2],.75*wy+.70*p[2]];
    }
    function face(points,colour) {
      const n=cross(sub(points[1],points[0]),sub(points[2],points[0]));
      if(dot(n,view)<=0) return;
      const screen=points.map(project);
      const shade=.87+.34*dot(n,light)/(Math.hypot(...n)||1);
      faces.push({points:screen,depth:screen.reduce((total,p)=>total+p[2],0)/screen.length,fill:tint(colour,shade)});
    }
    function loft(rings,colour,caps=true) {
      const count=rings[0].length;
      for(let i=1;i<rings.length;i++) for(let j=0;j<count;j++) {
        const k=(j+1)%count;
        face([rings[i-1][j],rings[i-1][k],rings[i][k],rings[i][j]],colour);
      }
      if(caps) {face(rings[0].slice().reverse(),colour);face(rings.at(-1),colour);}
    }
    function body(origin,profile,colour,count=10) {
      loft(profile.map(([z,wr,df,forward=0])=>ringAngles(count).map(([cr,sf])=>[
        origin[0]+wr*cr,origin[1]+forward+df*sf,origin[2]+z
      ])),colour);
    }
    function limb(a,b,startRadius,endRadius,colour,count=7) {
      const axis=unit(sub(b,a));
      const u=unit(cross(Math.abs(axis[0])<.90?[1,0,0]:[0,1,0],axis));
      const v=cross(axis,u);
      function ring(p,r){return ringAngles(count).map(([co,si])=>add(p,times(add(times(u,co),times(v,si)),r)));}
      loft([ring(a,startRadius),ring(b,endRadius)],colour);
    }
    function ribbon(a,b,w,colour) {
      const pts=[[a[0]-w,a[1],a[2]],[a[0]+w,a[1],a[2]],[b[0]+w,b[1],b[2]],[b[0]-w,b[1],b[2]]];
      face(pts,colour);face(pts.reverse(),colour);
    }
    const relaxed=.055*(1-moving);
    const hips=[sway,0,.88+relaxed+bob-airborne*.055];
    const shoulders=[sway,lean,1.41+relaxed+bob-airborne*.035];
    for(const side of [-1,1]) {
      const cycle=((phase/TAU+(side<0?.5:0))%1+1)%1;
      const swing=clamp((cycle-.5)*2,0,1);
      const travel=cycle<.5 ? 1-4*cycle : -Math.cos(Math.PI*swing);
      const swingLift=Math.sin(Math.PI*swing);
      const step=travel*stride*moving;
      const ankle=[side*.123+Math.sin(travelAngle)*step,side*.037*(1-moving)+Math.cos(travelAngle)*step+airborne*(side<0?.12:-.09),.105+swingLift*(.14+run*.12)*moving+airborne*(side<0?.17:.09)];
      const hip=add(hips,[side*.112,0,0]);
      const knee=elbowOrKnee(hip,ankle,[side*.09,1,0],.428);
      limb(hip,knee,.126,.108,colours.pants);
      body(knee,[[-.045,.094,.092],[.008,.109,.110],[.052,.095,.092]],colours.pants,8);
      limb(knee,ankle,.109,.074,colours.knee);
      const roll=swingLift*.04*moving;
      body(ankle,[[-.103,.086,.151,.06],[-.067,.094,.164,.06]],colours.sole,8);
      body(ankle,[[-.068,.096,.157,.058],[-.005,.089,.135,.048],[.055+roll,.079,.087],[.14,.082,.076,-.011]],colours.boot,8);
    }
    orient(heading);
    // Layered sill, quilting, shoulder yoke and crossed canvas webbing keep the figure legible from above.
    const coat=[sway,0,hips[2]-.13];
    body(coat,[[0,.195,.154],[.055,.235,.177],[.21,.230,.166,.012],[.44,.25,.178,lean*.55],[.60,.262,.145,lean],[.66,.127,.122,lean]],colours.coat,12);
    for(const [z,w,d,f] of [[.07,.235,.177,.003],[.22,.232,.168,.014],[.36,.245,.177,lean*.45]])
      body(coat,[[z,w,d,f],[z+.012,w+.003,d+.002,f]],colours.folds,12);
    body(add(shoulders,[0,0,-.107]),[[0,.251,.152],[.085,.255,.145],[.134,.153,.115]],colours.shoulder,12);
    for(const side of [-1,1]) {
      const p=add(coat,[side*.12,.13,.18]);
      body(p,[[0,.071,.044],[.092,.074,.049]],colours.pocket,6);
      body(p,[[.067,.077,.051],[.1,.079,.050]],colours.folds,6);
    }
    const bag=add(coat,[.211,-.041,.02]);
    body(bag,[[0,.085,.112],[.05,.106,.135],[.212,.095,.128]],colours.bag,8);
    body(bag,[[.15,.105,.138],[.225,.106,.136]],colours.strap,8);
    for(const front of [-1,1]) {
      const a=add(coat,[-.13,lean+front*.092,.65]);
      const b=add(coat,[-.032,lean*.63+front*.188,.44]);
      const c=add(coat,[.178,front*.124,.20]);
      ribbon(a,b,.028,colours.strap);ribbon(b,c,.028,colours.strap);
    }
    const head=add(shoulders,[0,.037,.099]);
    body(head,[[-.062,.113,.11],[.006,.133,.119]],colours.scarf);
    body(head,[[-.005,.078,.095,.017],[.062,.101,.115,.014],[.169,.109,.107]],colours.skin);
    body(add(head,[0,.105,.079]),[[0,.030,.027],[.046,.023,.035]],colours.skin,6);
    for(const side of [-1,1]) {
      body(add(head,[side*.102,.008,.064]),[[0,.018,.028],[.052,.022,.031]],colours.skin,6);
      limb(add(head,[side*.031,.122,.106]),add(head,[side*.066,.102,.103]),.008,.006,colours.scarf,5);
    }
    body(head,[[.113,.111,.119],[.176,.119,.127],[.230,.104,.110,-.009],[.253,.057,.071,-.016]],colours.cap,12);
    body(head,[[.107,.116,.124],[.121,.125,.132],[.156,.121,.129]],colours.rib,12);
    const grip=state.gear || 'empty';
    let knifeHand;
    for(const side of [-1,1]) {
      const phaseSide=phase+(side<0?Math.PI:0);
      const swing=-Math.cos(phaseSide)*(.18+.12*run)*moving;
      const shoulder=add(shoulders,[side*.208,swing*.14,-.028]);
      let hand=add(shoulder,[side*(.062+.045*airborne),.055+swing+airborne*.09,-.514+.10*run+Math.max(0,swing)*.22+airborne*.08]);
      if(grip==='rifle') hand=add(shoulders,side>0 ? [.122,.17,-.245] : [-.125,.330,-.243]);
      if(grip==='knife' && side>0) hand=add(shoulder,[.092,.20+swing*.32,-.40+.045*run]);
      const elbow=elbowOrKnee(shoulder,hand,[side*.7,-1,-.27],.286);
      limb(shoulder,elbow,.105,.089,colours.coat);
      body(elbow,[[-.051,.076,.076],[.002,.092,.089],[.051,.075,.076]],colours.coat,7);
      limb(elbow,hand,.093,.070,colours.folds);
      body(hand,[[-.06,.052,.062],[.014,.060,.068],[.049,.047,.045]],colours.glove,8);
      if(side>0) knifeHand=hand;
    }
    if(grip==='knife') {
      const h=knifeHand;
      limb(add(h,[0,-.035,.034]),add(h,[0,.055,-.053]),.022,.019,colours.wood);
      limb(add(h,[0,.055,-.053]),add(h,[.012,.18,-.17]),.028,.002,colours.steel,5);
    } else if(grip==='rifle') {
      const p=(r,f,z)=>add(shoulders,[r,f,z]);
      limb(p(.258,.040,-.185),p(.128,.172,-.2),.049,.032,colours.wood);
      limb(p(.13,.17,-.2),p(-.137,.344,-.2),.042,.032,colours.iron);
      limb(p(-.006,.266,-.195),p(-.132,.344,-.20),.043,.038,colours.wood);
      limb(p(-.137,.344,-.2),p(-.401,.521,-.199),.021,.014,colours.iron);
      limb(p(.047,.222,-.225),p(.05,.235,-.329),.038,.028,colours.iron,5);
    }
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.fillStyle=`rgba(40,47,54,${.12-.035*airborne})`;
    ctx.beginPath();ctx.ellipse(.045,.018,.39,.157,-.17,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(.012,.008,.251,.111,-.17,0,TAU);ctx.fill();
    const sink=clamp(state.sink||0,0,.6);
    if(sink>.025){
      const ripple=.5+.5*Math.sin(phase*2);
      ctx.beginPath();ctx.ellipse(0,0,.25+.18*ripple,.09+.07*ripple,0,0,TAU);
      ctx.lineWidth=.022;ctx.strokeStyle='rgba(66,76,70,'+(.55*sink)+')';ctx.stroke();
      ctx.beginPath();ctx.rect(-2,-4,4,4.05);ctx.clip();
    }
    ctx.translate(0,(sink-jump)*.75);
    faces.sort((a,b)=>a.depth-b.depth);
    ctx.lineJoin='round';ctx.lineWidth=.003;
    for(const {points,fill} of faces) {
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      // Shared-colour hairlines seal antialiasing cracks between adjacent facets.
      ctx.strokeStyle=fill;ctx.stroke();
    }
    ctx.restore();
  }
  globalThis.drawWorker=drawWorker;
})();
