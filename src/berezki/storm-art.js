// Airborne snow moves with the wind. Ice on the screen stays fixed when the camera turns.
let stormArt;
function stormMaterials(){
  if(stormArt)return stormArt;
  const random=mulberry32(72513);
  const flakes=Array.from({length:8},(_,i)=>{
    const c=winterCanvas(32,24),g=c.getContext('2d');
    g.translate(16,12);g.rotate((random()-.5)*.6);
    for(let j=0;j<10;j++){
      const x=(random()-.5)*13,y=(random()-.5)*8,r=2+random()*4;
      const grad=g.createRadialGradient(x,y,0,x,y,r);
      grad.addColorStop(0,i<3?'#e0e8ecd9':'#ecf1f2ad');grad.addColorStop(.48,'#e4ecef76');grad.addColorStop(1,'#d0dce400');
      g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
    }
    return c;
  });
  const particles=Array.from({length:260},(_,i)=>({u:random(),v:random(),z:.25+.75*random(),phase:random()*6.28,flake:flakes[i%flakes.length]}));
  const fog=winterCanvas(256,128),fg=fog.getContext('2d');
  // Repeat the translucent wisps across both seams of the wind texture.
  for(let i=0;i<64;i++){
    const x=random()*256,y=random()*128,rx=18+random()*66,ry=3+random()*11;
    for(const dx of [-256,0,256])for(const dy of [-128,0,128]){
      fg.save();fg.translate(x+dx,y+dy);fg.scale(rx,ry);
      const g=fg.createRadialGradient(0,0,0,0,0,1);
      g.addColorStop(0,'#ecf1f347');g.addColorStop(.5,'#dce6e91c');g.addColorStop(1,'#dce6e900');
      fg.fillStyle=g;fg.fillRect(-1,-1,2,2);fg.restore();
    }
  }
  const ice=winterCanvas(768,432),ig=ice.getContext('2d'),pixels=ig.createImageData(768,432);
  for(let y=0;y<432;y++)for(let x=0;x<768;x++){
    const n=.56*vnoise(x+13,y,43)+.3*vnoise(x,y+81,14)+.14*random(),k=(y*768+x)*4;
    pixels.data[k]=156+81*n;pixels.data[k+1]=174+69*n;pixels.data[k+2]=184+62*n;pixels.data[k+3]=255;
  }
  ig.putImageData(pixels,0,0);
  for(let i=0;i<1150;i++){
    const x=random()*768,y=random()*432,a=vnoise(x,y,74)*7+random()*.75,r=3+random()**2*21;
    const dx=Math.cos(a),dy=Math.sin(a);
    ig.strokeStyle='rgba(241,247,248,'+(.14+.46*random())+')';ig.lineWidth=.45+random()*.7;
    ig.beginPath();ig.moveTo(x,y);ig.lineTo(x+dx*r,y+dy*r);
    for(let j=1;j<8;j++){
      const u=j/8,px=x+dx*r*u,py=y+dy*r*u,twig=(1-u)*r*.44;
      for(const side of [-1,1]){ig.moveTo(px,py);ig.lineTo(px+twig*(dx-dy*side),py+twig*(dy+dx*side));}
    }
    ig.stroke();
  }
  for(let i=0;i<4300;i++){
    const x=random()*768,y=random()*432,z=vnoise(x,y,32),w=3+random()**2*18;
    ig.globalAlpha=.14+z*.68;ig.drawImage(flakes[i%8],x,y,w,w*.71);
  }
  // A second layer freezes at the margins first, leaving the centre readable during warning.
  const rim=winterCanvas(768,432),rg=rim.getContext('2d');
  rg.drawImage(ice,0,0);rg.globalCompositeOperation='destination-in';
  const mask=winterCanvas(192,108),mg=mask.getContext('2d'),m=mg.createImageData(192,108);
  for(let y=0;y<108;y++)for(let x=0;x<192;x++){
    const edge=Math.min(x/192,(191-x)/192,y/108,(107-y)/108);
    m.data[(y*192+x)*4+3]=255*clamp(1-edge/(.09+.17*vnoise(x,y,11)),0,1)**1.6;
  }
  mg.putImageData(m,0,0);rg.drawImage(mask,0,0,768,432);
  return stormArt={fog,ice,rim,particles};
}
function winterSkySnow(level,wx,wy,storm){
  const {particles}=stormMaterials(),t=environmentTime;
  const release=storm&&S.flags.blizzard.stage==='calm'?level:1;
  const count=Math.min(particles.length,Math.round((storm?65+185*level:59)*clamp(VW*VH/340000,.7,1.5)));
  ctx.save();
  for(let i=0;i<count;i++){
    const p=particles[i],z=p.z,speed=(storm?180:43)*z,twist=Math.sin(t*(.85+z)+p.phase);
    const spanX=VW+40,spanY=VH+40;
    const dx=t*speed*wx+twist*(storm?8:17)-cam.x*z*.035;
    const dy=t*speed*wy+Math.cos(t*.8+p.phase)*(storm?7:4)-cam.y*z*.035;
    const x=((p.u*spanX+dx)%spanX+spanX)%spanX-20,y=((p.v*spanY+dy)%spanY+spanY)%spanY-20;
    const w=3+(storm?22:19)*z*z,h=w*(.61+.24*twist);
    ctx.globalAlpha=release*(.35+.5*z)*(storm?.55+.45*level:1);
    ctx.drawImage(p.flake,x-w/2,y-h/2,w,h);
  }
  ctx.restore();
}
function drawBlowingSnow(s,power){
  const [wx,wy]=windVectors[s.dir],t=environmentTime,fade=s.stage==='calm'?power:1;
  ctx.save();
  // The bank arrives from upwind. Long, travelling bands cross towards the lee.
  ctx.translate(VW/2,VH/2);ctx.rotate(Math.atan2(wy,wx));
  const w=wx?VW:VH,h=wx?VH:VW,left=-w/2,top=-h/2;
  const sky=ctx.createLinearGradient(left,0,w/2,0);
  sky.addColorStop(0,'#647784');sky.addColorStop(.38,'#a7b6c0');sky.addColorStop(1,'#d4dde000');
  ctx.globalAlpha=fade*(.22+.61*power);ctx.fillStyle=sky;ctx.fillRect(left,top,w,h);
  const tex=stormMaterials().fog;
  for(let i=0;i<2;i++){
    const width=w*(.7+i*.28),height=h*(.53+i*.2),offset=(t*(55+i*37))%width;
    ctx.globalAlpha=fade*(.23+.6*power)*(i?.74:1);
    for(let x=left+offset-width;x<w/2;x+=width)for(let y=top-height*i*.35;y<h/2;y+=height)
      ctx.drawImage(tex,x,y,width+.6,height+.6);
  }
  ctx.restore();
  winterSkySnow(power,wx,wy,true);
}
function stormGlass(cover){
  const {ice,rim}=stormMaterials();ctx.save();
  ctx.globalAlpha=Math.min(1,cover*1.65);ctx.drawImage(rim,0,0,VW,VH);
  ctx.globalAlpha=cover**2.65*.985;ctx.drawImage(ice,0,0,VW,VH);ctx.restore();
}
