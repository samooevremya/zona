/* Skinned GLB actor, composited at the same ground anchor as the world props. */
(() => {
  'use strict';
  const fallback=window.drawWorker;
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:true});
  if(!gl)return;
  const tau=Math.PI*2,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function mul(a,b){
    const out=new Float32Array(16);
    for(let k=0;k<4;k++)for(let j=0;j<4;j++)for(let i=0;i<4;i++)out[4*k+j]+=a[4*i+j]*b[4*k+i];
    return out;
  }
  function rot(axis,angle){
    const m=identity(),a=(axis+1)%3,b=(axis+2)%3,c=Math.cos(angle),s=Math.sin(angle);
    m[a*5]=m[b*5]=c;m[a*4+b]=s;m[b*4+a]=-s;return m;
  }
  function shader(type,src){
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(){
    const p=gl.createProgram();
    gl.attachShader(p,shader(gl.VERTEX_SHADER,`#version 300 es
      layout(location=0) in vec3 position;layout(location=1) in vec3 normal;
      layout(location=2) in vec2 texcoord;layout(location=3) in vec4 joints;layout(location=4) in vec4 weights;
      uniform mat4 bones[17];uniform vec2 direction;
      out vec2 uv;out float light;
      void main(){
        mat4 skin=bones[int(joints.x)]*weights.x+bones[int(joints.y)]*weights.y+
          bones[int(joints.z)]*weights.z+bones[int(joints.w)]*weights.w;
        vec3 p=(skin*vec4(position,1.)).xyz;
        // Model +Z faces forward. Actor yaw follows the map's clockwise heading.
        vec2 ground=vec2(direction.x*p.z-direction.y*p.x,direction.y*p.z+direction.x*p.x);
        float screenY=.70*ground.y-.75*p.y;
        gl_Position=vec4(ground.x/1.16,-(screenY+.64)/1.16,-(.75*ground.y+.70*p.y)/3.,1.);
        vec3 n=normalize(mat3(skin)*normal);
        vec2 ng=vec2(direction.x*n.z-direction.y*n.x,direction.y*n.z+direction.x*n.x);
        light=.87+.24*max(dot(vec3(ng,n.y),normalize(vec3(-.38,-.43,.81))),0.);
        uv=texcoord;
      }`));
    gl.attachShader(p,shader(gl.FRAGMENT_SHADER,`#version 300 es
      precision mediump float;uniform sampler2D cloth;uniform vec4 pigment;in vec2 uv;in float light;out vec4 colour;
      void main(){colour=vec4(mix(texture(cloth,uv).rgb,pigment.rgb,pigment.a)*light,1.);}`));
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  function geometry(values,indices,material){
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    values.forEach((v,i)=>{
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);
      gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,[3,3,2,4,4][i],v instanceof Uint16Array?gl.UNSIGNED_SHORT:gl.FLOAT,false,0,0);
    });
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    gl.bindVertexArray(null);return {vao,count:indices.length,material};
  }
  // Rigid props share the right-hand joint with the glove.
  function prop(joint,origin,boxes){
    return boxes.map(([centre,dimensions,colour])=>{
      const p=[],n=[],uv=[],j=[],w=[],idx=[];
      for(let axis=0;axis<3;axis++)for(const side of [-1,1]){
        const start=p.length/3;
        for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
          const pt=origin.map((x,k)=>x+centre[k]),nn=[0,0,0];nn[axis]=side;
          pt[axis]+=side*dimensions[axis]/2;pt[(axis+1)%3]+=u*dimensions[(axis+1)%3]/2;pt[(axis+2)%3]+=v*dimensions[(axis+2)%3]/2;
          p.push(...pt);n.push(...nn);uv.push(0,0);j.push(joint,0,0,0);w.push(1,0,0,0);
        }
        idx.push(start,start+1,start+2,start,start+2,start+3);
      }
      return geometry([p,n,uv,j,w].map(x=>new Float32Array(x)),new Uint16Array(idx),[...colour,1]);
    });
  }
  async function load(){
    const response=await fetch('art/worker.glb');if(!response.ok)throw Error('worker.glb '+response.status);
    const raw=await response.arrayBuffer(),dv=new DataView(raw),length=dv.getUint32(12,true),base=28+length;
    const spec=JSON.parse(new TextDecoder().decode(new Uint8Array(raw,20,length)));
    function accessor(i){
      const a=spec.accessors[i],v=spec.bufferViews[a.bufferView],T=a.componentType===5123?Uint16Array:Float32Array;
      const size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type];
      return new T(raw,base+(v.byteOffset||0)+(a.byteOffset||0),a.count*size);
    }
    const img=spec.images[0],v=spec.bufferViews[img.bufferView],url=URL.createObjectURL(new Blob([raw.slice(base+v.byteOffset,base+v.byteOffset+v.byteLength)],{type:img.mimeType}));
    const photo=new Image();photo.src=url;
    try{await photo.decode();}finally{URL.revokeObjectURL(url);}
    const p=program();gl.useProgram(p);const uniform=name=>gl.getUniformLocation(p,name);
    const loc={bones:uniform('bones[0]'),direction:uniform('direction'),pigment:uniform('pigment')};
    const atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,atlas);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,photo);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    const meshes=spec.meshes.map(m=>{const prim=m.primitives[0];return geometry(['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'].map(k=>accessor(prim.attributes[k])),accessor(prim.indices),[0,0,0,0]);});
    const sets=spec.scenes.map(sc=>sc.nodes.filter(i=>spec.nodes[i].mesh!==undefined).map(i=>meshes[spec.nodes[i].mesh]));
    const skin=spec.skins[0],ib=accessor(skin.inverseBindMatrices),parent=new Map();
    spec.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parent.set(c,i)));
    const joints=skin.joints.map((id,i)=>({name:spec.nodes[id].name,t:spec.nodes[id].translation,
      inverse:ib.subarray(i*16,i*16+16),parent:skin.joints.indexOf(parent.get(id))}));
    const tracks=new Map(),clip=spec.animations.find(a=>a.name==='Walk');
    for(const ch of clip.channels){
      const sampler=clip.samplers[ch.sampler];tracks.set(spec.nodes[ch.target.node].name,{times:accessor(sampler.input),q:accessor(sampler.output)});
    }
    const hand=joints.findIndex(j=>j.name==='hand.R'),m=joints[hand].inverse;
    const origin=[-m[12],-m[13]-.062,-m[14]+.015];
    const tools={knife:prop(hand,origin,[[[0,-.02,.10],[.020,.034,.19],[.55,.59,.60]]]),
      rifle:prop(hand,origin,[[[0,0,-.095],[.057,.091,.22],[.34,.24,.17]],[[0,0,.13],[.055,.061,.27],[.25,.26,.25]],[[0,.005,.32],[.024,.026,.22],[.24,.25,.25]]])};
    gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
    const legs=['L','R'].map(side=>{
      const ids=['thigh','shin','foot'].map(name=>joints.findIndex(j=>j.name===name+'.'+side));
      const [hipJoint,shin,ankle]=ids.map(id=>joints[id]);
      const hip=[12,13,14].map(k=>-hipJoint.inverse[k]);
      return {ids,hip,upper:shin.t,lower:ankle.t,upperLength:Math.hypot(...shin.t),
        lowerLength:Math.hypot(...ankle.t),sole:-ankle.inverse[13]};
    });
    return {p,loc,sets,joints,tracks,tools,hand,origin,legs};
  }
  let model=null,loading=0;
  function init(){const generation=++loading;load().then(m=>{if(generation===loading)model=m;}).catch(e=>console.warn('Worker GLB:',e.message));}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();model=null;loading++;});
  canvas.addEventListener('webglcontextrestored',init);init();
  // Shortest rotation from a segment's bind direction to its solved direction.
  function aimSegment(bind, delta) {
    const d=Math.hypot(...bind)*Math.hypot(...delta);
    const x=(bind[1]*delta[2]-bind[2]*delta[1])/d;
    const y=(bind[2]*delta[0]-bind[0]*delta[2])/d;
    const z=(bind[0]*delta[1]-bind[1]*delta[0])/d;
    const k=1/(1+clamp((bind[0]*delta[0]+bind[1]*delta[1]+bind[2]*delta[2])/d,-.9999,1));
    return new Float32Array([1-k*(y*y+z*z),z+k*x*y,-y+k*x*z,0,
      -z+k*x*y,1-k*(x*x+z*z),x+k*y*z,0,y+k*x*z,-x+k*y*z,1-k*(x*x+y*y),0,0,0,0,1]);
  }
  function plantedLegs(state,heading) {
    const feet=state.gait?.feet;
    if(!feet || state.jump>0)return null;
    const sin=Math.sin(heading),cos=Math.cos(heading),phase=state.phase||0;
    const effort=clamp((state.speed||0)/1.6,0,1);
    const sway=-Math.sin(phase)*.032*effort;
    const shift=[sway,-.024-.024*Math.sin(phase)**2*effort,0];
    const targets=feet.map((f,i)=>{
      const dx=f.x-state.x,dy=f.y-state.y,leg=model.legs[i];
      const target=[-sin*dx+cos*dy,leg.sole+f.height,cos*dx+sin*dy];
      const lateral=target[0]-leg.hip[0]-sway,forward=target[2]-leg.hip[2];
      const reach=leg.upperLength+leg.lowerLength-.001;
      shift[1]=Math.min(shift[1],target[1]+Math.sqrt(Math.max(0,reach*reach-lateral*lateral-forward*forward))-leg.hip[1]);
      return target;
    });
    const solved=new Map();
    model.legs.forEach((leg,i)=>{
      const hip=leg.hip.map((n,k)=>n+shift[k]),ankle=targets[i];
      const delta=ankle.map((n,k)=>n-hip[k]);
      const distance=Math.hypot(...delta),axis=delta.map(n=>n/distance);
      const along=(leg.upperLength**2-leg.lowerLength**2+distance**2)/(2*distance);
      const bend=Math.sqrt(Math.max(0,leg.upperLength**2-along**2));
      // Project +Z onto the knee plane so both knees bend toward the toes.
      const pole=[-axis[0]*axis[2],-axis[1]*axis[2],1-axis[2]**2],norm=Math.hypot(...pole);
      const knee=hip.map((n,k)=>n+axis[k]*along+pole[k]/norm*bend);
      const thigh=aimSegment(leg.upper,knee.map((n,k)=>n-hip[k]));
      const shin=aimSegment(leg.lower,ankle.map((n,k)=>n-knee[k]));
      thigh.set(hip,12);shin.set(knee,12);
      const sole=identity();sole.set(ankle,12);
      solved.set(leg.ids[0],thigh);solved.set(leg.ids[1],shin);solved.set(leg.ids[2],sole);
    });
    return {shift,solved};
  }
  function pose(state){
    const stance=plantedLegs(state,state.legHeading??state.heading??0);
    const phase=state.phase||0,speed=state.speed||0,move=clamp(speed/.95,0,1),run=clamp((speed-1.6)/1.9,0,1);
    const relative=(state.travelHeading??state.heading??0)-(state.legHeading??state.heading??0);
    const time=((phase/tau*(Math.cos(relative)<0?-1:1))%1+1)%1,world=[],matrices=new Float32Array(16*model.joints.length);
    const jump=clamp((state.jump||0)/.32,0,1);
    for(const [i,j] of model.joints.entries()){
      const solved=stance?.solved.get(i);
      if(solved){world.push(solved);matrices.set(mul(solved,j.inverse),16*i);continue;}
      const track=model.tracks.get(j.name);let a=0,b=0,c=0;
      if(track){
        const at=time*(track.times.length-1),lo=Math.floor(at)*4,hi=Math.min(lo+4,track.q.length-4),f=at%1;
        a=2*Math.atan2(track.q[lo]*(1-f)+track.q[hi]*f,track.q[lo+3]*(1-f)+track.q[hi+3]*f)*move*(1+run*.27);
      }
      const side=j.name.endsWith('.L')?1:-1;
      if(j.name==='chest'){
        b=(state.heading??0)-(state.legHeading??state.heading??0)+.085*Math.cos(phase)*move;
        c=.037*Math.sin(phase)*move;
      }
      if(j.name==='spine')a=.055*move+.085*run;
      if(j.name.startsWith('thigh')){
        c=side*.01+Math.sin(relative)*Math.sin(phase)*move*.29*side;
        a-=jump*(side>0?.35:.15);
      }
      if(j.name.startsWith('shin'))a+=jump*.55;
      if(j.name.startsWith('upper_arm')){
        if(state.gear==='rifle'){a=-.74;c=-side*.40;}
        if(state.gear==='knife'&&side<0)a=a*.4-.36;
      }
      if(j.name.startsWith('forearm')){
        if(state.gear==='rifle')a=side<0?-1.02:-.67;
        if(state.gear==='knife'&&side<0)a-=.48;
      }
      let local=mul(rot(1,b),mul(rot(2,c),rot(0,a)));local.set(j.t,12);
      if(j.parent<0&&stance)for(let k=0;k<3;k++)local[12+k]+=stance.shift[k];
      const g=j.parent<0?local:mul(world[j.parent],local);world.push(g);matrices.set(mul(g,j.inverse),16*i);
    }
    return matrices;
  }
  window.drawWorker=function(ctx,x,y,scale,state={}){
    if(!model)return fallback(ctx,x,y,scale,state);
    const side=clamp(Math.ceil(scale*2.32*Math.min(2,devicePixelRatio||1)),80,512);
    if(canvas.width!==side||canvas.height!==side){canvas.width=canvas.height=side;gl.viewport(0,0,side,side);}
    const heading=state.legHeading??state.heading??0;
    gl.useProgram(model.p);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const palette=pose(state);
    gl.uniformMatrix4fv(model.loc.bones,false,palette);gl.uniform2f(model.loc.direction,Math.cos(heading),Math.sin(heading));
    const draw=m=>{gl.bindVertexArray(m.vao);gl.uniform4fv(model.loc.pigment,m.material);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);};
    model.sets[state.jacket==='insulated'?1:0].forEach(draw);const held=model.tools[state.gear];
    if(held){
      // Follow the animated glove with a separate grip angle for the held prop.
      const matrix=palette.subarray(16*model.hand,16*model.hand+16),o=model.origin;
      const grip=Array.from({length:3},(_,k)=>matrix[k]*o[0]+matrix[4+k]*o[1]+matrix[8+k]*o[2]+matrix[12+k]);
      const yaw=(state.heading??heading)-heading;
      const gripAxes=mul(rot(1,yaw),rot(0,state.gear==='knife'?.65:.12));
      for(let k=0;k<3;k++)gripAxes[12+k]=grip[k]-gripAxes[k]*o[0]-gripAxes[4+k]*o[1]-gripAxes[8+k]*o[2];
      matrix.set(gripAxes);gl.uniformMatrix4fv(model.loc.bones,false,palette);held.forEach(draw);
    }
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const jump=state.jump||0;
    function shade(dx,dy,rx,ry,opacity){
      ctx.save();ctx.translate(dx,dy);ctx.rotate(heading);ctx.scale(rx,ry);
      const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
      gradient.addColorStop(0,'rgba(39,50,56,'+opacity+')');gradient.addColorStop(1,'rgba(39,50,56,0)');
      ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);ctx.restore();
    }
    // Use the same map projection as the footprints. Shadows remain on the surface during jumps.
    ctx.save();ctx.scale(1,.70);
    shade(.105,-.06,.49+jump*.17,.34+jump*.14,.38/(1+jump));
    for(const foot of state.gait?.feet||[]){
      const separation=foot.height+jump;
      shade(foot.x-state.x+.045*Math.cos(heading),foot.y-state.y+.045*Math.sin(heading),
        .19+separation*.20,.105+separation*.12,.56/(1+12*separation));
    }
    ctx.restore();
    const sink=state.sink||0;if(sink>.025){ctx.beginPath();ctx.rect(-1.16,-2.5,2.32,2.55);ctx.clip();}
    ctx.imageSmoothingEnabled=true;ctx.drawImage(canvas,-1.16,-1.80+(sink-(state.jump||0))*.75,2.32,2.32);ctx.restore();
    window.drawWorker.glbReady=true;
  };
})();
