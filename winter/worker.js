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
    coat: [88,98,103], folds: [72,82,88], stitch: [117,118,110],
    waxed: [98,105,108], pocket: [83,91,95], button: [78,69,58], patch: [111,99,88],
    fur: [132,100,73], furTip: [157,119,84], furShade: [100,76,60],
    pants: [76,75,71], knee: [81,79,74], boot: [53,54,51], sole: [43,43,41],
    bootRim: [78,76,68], cap: [64,63,64], rib: [81,80,81], scarf: [83,73,64],
    skin: [168,134,110], glove: [88,76,65], steel: [144,154,153],
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

  const clothAtlas=new Image();
  clothAtlas.src='art/worker-materials.webp';
  // Map a reference swatch to a projected triangle. UV coordinates are in atlas pixels.
  function textureTriangle(ctx,a,b,c,u,v,w){
    const ux=v[0]-u[0],uy=v[1]-u[1],vx=w[0]-u[0],vy=w[1]-u[1];
    const det=ux*vy-uy*vx;
    if(Math.abs(det)<.0001)return;
    const dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1];
    const xx=(dx*vy-ex*uy)/det,xy=(ex*ux-dx*vx)/det;
    const yx=(dy*vy-ey*uy)/det,yy=(ey*ux-dy*vx)/det;
    ctx.save();ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.closePath();ctx.clip();
    ctx.transform(xx,yx,xy,yy,a[0]-xx*u[0]-xy*u[1],a[1]-yx*u[0]-yy*u[1]);
    ctx.drawImage(clothAtlas,0,0);ctx.restore();
  }

  function drawWorker(ctx,x,y,scale,state = {}) {
    if (!(scale > 0)) return;
    const insulated=state.jacket==='insulated';
    const padding=insulated?.039:0;
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
    let fabric=null;
    function face(points,colour,swatch=null) {
      const n=cross(sub(points[1],points[0]),sub(points[2],points[0]));
      if(dot(n,view)<=0) return;
      const screen=points.map(project);
      const shade=.87+.34*dot(n,light)/(Math.hypot(...n)||1);
      let uv=swatch;
      if(fabric && clothAtlas.naturalWidth && points.length===4 && Math.abs(n[2])<Math.hypot(n[0],n[1])*2.3){
        const tile=n[1]>0?fabric.front:fabric.back;
        if(tile>=0){
          uv=points.map(pt=>[(tile%3)*128+2+124*clamp(.5+(pt[0]-fabric.x)/(fabric.width*2),0,1),
            Math.floor(tile/3)*128+2+124*clamp(1-(pt[2]-fabric.z)/fabric.height,0,1)]);
        }
      }
      faces.push({points:screen,uv,shade,depth:screen.reduce((total,p)=>total+p[2],0)/screen.length,fill:tint(colour,shade)});
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
      fabric={front:7,back:7,x:hip[0],width:.123,z:knee[2],height:hip[2]-knee[2]};
      limb(hip,knee,.126,.108,colours.pants);
      body(knee,[[-.045,.094,.092],[.008,.109,.110],[.052,.095,.092]],colours.pants,8);
      limb(knee,ankle,.109,.074,colours.knee);
      const bootTop=add(ankle,times(sub(knee,ankle),.69));
      fabric={front:8,back:8,x:ankle[0],width:.10,z:ankle[2],height:Math.max(.15,bootTop[2]-ankle[2])};
      limb(ankle,bootTop,.087,.102,colours.boot,9);
      limb(bootTop,add(bootTop,times(sub(knee,ankle),.045)),.104,.105,colours.bootRim,9);
      const roll=swingLift*.04*moving;
      body(ankle,[[-.103,.086,.151,.06],[-.067,.094,.164,.06]],colours.sole,8);
      body(ankle,[[-.068,.096,.157,.058],[-.005,.089,.135,.048],[.055+roll,.079,.087],[.14,.082,.076,-.011]],colours.boot,8);
      fabric=null;
    }
    orient(heading);
    const coat=[sway,0,hips[2]-.14];
    const shell=[[0,.228,.158],[.045,.235,.166],[.25,.226,.160,.008],
      [.46,.239+padding,.167+padding*.55,lean*.55],[.58,.25+padding,.143+padding*.65,lean],
      [.655,.125,.104,lean]];
    fabric={front:insulated?2:0,back:insulated?3:1,x:coat[0],width:.25+padding,z:coat[2],height:.62};
    body(coat,shell,colours.coat,16);
    fabric=null;
    body(coat,[[.024,.233,.165],[.035,.237,.169]],colours.waxed,16);
    for(const side of [-1,1]){
      const pocket=add(coat,[side*.125,.135,.078]);
      body(pocket,[[0,.070,.04],[.14,.074,.043]],colours.pocket,6);
      ribbon(add(pocket,[0,.041,.126]),add(pocket,[0,.041,.14]),.061,colours.stitch);
    }
    if(insulated){
      for(const x of [-.144,-.073,0,.073,.144]){
        // Rear quilting follows the taper and lean of the torso.
        const contour=shell.slice(1,-1).map(([z,w,d,f=0])=>
          add(coat,[x,f-d*Math.sqrt(1-(x/w)**2)-.002,z]));
        for(let i=1;i<contour.length;i++)ribbon(contour[i-1],contour[i],.003,colours.folds);
      }
    }
    for(const z of [.16,.31,.46,.56]){
      const y=.172+lean*(z/.60);
      body(add(coat,[.011,y,z]),[[0,.014,.009],[.018,.014,.009]],colours.button,6);
    }
    const head=add(shoulders,[0,.037,.099]);
    body(head,[[-.14,.093,.087],[-.055,.10,.093],[.017,.09,.085]],colours.skin,12);
    // Open collar spreads over the nape and tapers into two points at the chest.
    const collarCentre=add(shoulders,[0,0,.015]);
    const count=22;
    function collarPoint(i,edge){
      const angle=.24+(TAU-.48)*i/count;
      const right=Math.sin(angle),front=Math.cos(angle);
      const width=edge?(insulated?.222:.155):.108;
      const depth=edge?(insulated?.178:.137):.091;
      const z=edge?(insulated?.017:-.006)-Math.max(0,front)*.094:
        (insulated?.107:.055)-Math.max(0,front)*.045;
      return add(collarCentre,[width*right,depth*front,z+(insulated&&edge?.007*Math.sin(i*2.17):0)]);
    }
    for(let i=0;i<count;i++){
      const a=collarPoint(i,false),b=collarPoint(i+1,false);
      const c=collarPoint(i+1,true),d=collarPoint(i,true);
      const base=insulated?colours.fur:colours.waxed;
      const u=130+(i%5)*24;
      const pile=insulated&&clothAtlas.naturalWidth?[[u,132],[u+24,132],[u+24,249],[u,249]]:null;
      face([a,b,c,d],base,pile);face([d,c,b,a],base,pile?.slice().reverse());
      if(insulated){
        const middle=times(add(a,c),.5);
        const tip=add(times(add(c,d),.5),[0,0,-.009]);
        const tuft=[middle,d,tip];
        const tone=i%3===0?colours.furShade:colours.furTip;
        face(tuft,tone);face(tuft.reverse(),tone);
      }
    }
    fabric={front:6,back:-1,x:head[0],width:.107,z:head[2]+.008,height:.115};
    body(head,[[-.005,.078,.095,.017],[.062,.101,.115,.014],[.169,.109,.107]],colours.skin);
    fabric=null;
    body(add(head,[0,.105,.079]),[[0,.030,.027],[.046,.023,.035]],colours.skin,6);
    for(const side of [-1,1]) {
      body(add(head,[side*.102,.008,.064]),[[0,.018,.028],[.052,.022,.031]],colours.skin,6);
      limb(add(head,[side*.031,.122,.106]),add(head,[side*.066,.102,.103]),.008,.006,colours.scarf,5);
    }
    fabric={front:5,back:5,x:head[0],width:.12,z:head[2]+.115,height:.135};
    body(head,[[.113,.111,.119],[.176,.119,.127],[.230,.104,.110,-.009],[.253,.057,.071,-.016]],colours.cap,12);
    body(head,[[.107,.116,.124],[.121,.125,.132],[.156,.121,.129]],colours.rib,12);
    fabric=null;
    for(let i=0;i<14;i++){
      const angle=i*TAU/14;
      const capPoint=(r,d,z)=>add(head,[r*Math.cos(angle),d*Math.sin(angle),z]);
      limb(capPoint(.115,.125,.137),capPoint(.104,.112,.205),.004,.003,colours.rib,4);
    }
    const grip=state.gear || 'empty';
    let knifeHand;
    for(const side of [-1,1]) {
      const phaseSide=phase+(side<0?Math.PI:0);
      const swing=-Math.cos(phaseSide)*(.18+.12*run)*moving;
      const shoulder=add(shoulders,[side*(.206+padding*.6),swing*.14,-.028]);
      let hand=add(shoulder,[side*(.062+.045*airborne),.055+swing+airborne*.09,-.514+.10*run+Math.max(0,swing)*.22+airborne*.08]);
      if(grip==='rifle') hand=add(shoulders,side>0 ? [.122,.17,-.245] : [-.125,.330,-.243]);
      if(grip==='knife' && side>0) hand=add(shoulder,[.092,.20+swing*.32,-.40+.045*run]);
      const elbow=elbowOrKnee(shoulder,hand,[side*.7,-1,-.27],.286);
      fabric={front:1,back:1,x:shoulder[0],width:.11,z:elbow[2],height:Math.max(.09,shoulder[2]-elbow[2])};
      limb(shoulder,elbow,.099+padding*.55,.087+padding*.36,colours.coat);
      body(elbow,[[-.051,.076,.076],[.002,.092,.089],[.051,.075,.076]],colours.coat,7);
      limb(elbow,hand,.089+padding*.35,.069,colours.coat);
      fabric=null;
      if(side>0){
        const patch=add(elbow,[.081+padding*.30,-.015,-.013]);
        body(patch,[[-.052,.022,.048],[0,.028,.057],[.058,.020,.044]],colours.patch,6);
      }
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
    for(const {points,fill,uv,shade} of faces) {
      ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      if(uv){
        ctx.globalAlpha=clamp(.74+.22*(shade-.85),.60,.88);
        textureTriangle(ctx,points[0],points[1],points[2],uv[0],uv[1],uv[2]);
        textureTriangle(ctx,points[0],points[2],points[3],uv[0],uv[2],uv[3]);
        ctx.globalAlpha=1;
      }
      // Shared-colour hairlines seal antialiasing cracks between adjacent facets.
      if(!uv){ctx.strokeStyle=fill;ctx.stroke();}
    }
    ctx.restore();
  }
  globalThis.drawWorker=drawWorker;
})();
