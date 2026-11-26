// The photographed fittings keep their grain, welds and chipped enamel. Height is
// measured from the feet in each image. Only elevated parts move against the snow.
const equipmentProfile={
  swing:{rise:75,front:14},slide:{rise:56,front:26},
  roundabout:{rise:29,front:26},seesaw:{rise:33,front:6}
};
const yardEquipment=new Set(Object.keys(equipmentProfile));
// Contact points measured on each sprite, in normalized image coordinates.
const yardFeet={
  swing:[[.035,.96,9],[.96,.96,9],[.17,.52,5],[.83,.52,5]],
  slide:[[.06,.49,5],[.94,.49,5],[.50,.98,12]],
  roundabout:[[.5,.96,15],[.28,.87,8],[.73,.87,9]],
  seesaw:[[.42,.94,6],[.58,.94,6]]
};
function paintYardFooting(g,p,foreground){
  const top=p.y-p.foot*p.height;
  for(const [u,v,r] of yardFeet[p.key]){
    const x=p.x+(u-.5)*p.width,y=top+v*p.height;
    if(foreground){
      g.save();g.globalAlpha*=.74;
      snowDrift(g,x+.8,y+.5,r*.83,2.2,-.12,Math.round(u*80));g.restore();
    }else{
      packedSnow(g,x,y,r*1.4,4,.38);
      shoreEllipse(g,x+1,y,r*.6,2.4,'#424b4f68',-.12);
    }
  }
}
function paintWornYardSnow(g,p){
  const patches=p.key==='swing'?[[-20,5,14,22],[20,5,14,22]]:
    p.key==='slide'?[[0,32,17,14]]:p.key==='seesaw'?[[-41,0,12,9],[41,0,12,9]]:
    Array.from({length:12},(_,i)=>[49*Math.cos(i*Math.PI/6),2+31*Math.sin(i*Math.PI/6),15,9]);
  const worn=p.workBed??=workingSurface(p);
  for(const [u,v,rx,ry] of patches){
    const x=p.x+u,y=p.y+v;
    g.drawImage(worn,x-rx,y-ry,2*rx,2*ry);
  }
  paintYardFooting(g,p,false);
}
function equipmentHeight(key,u,v){
  if(key==='swing'){
    const bay=u>.19 && u<.82;
    if(bay)return clamp(1-v*.97,.19,1); // seat boards hang above ground
    const backFoot=(u>.12 && u<.19)||(u>.82 && u<.89);
    return clamp(1-v/(backFoot?.58:.96),0,1);
  }
  if(key==='slide')return clamp(1-v/.97,0,1);
  if(key==='roundabout'){
    const rim=Math.hypot((u-.5)/.49,(v-.54)/.44);
    return clamp(.2+.75*(1-v)-.17*rim,.08,1);
  }
  const plank=.59-.31*u;
  if(v<=plank+.09)return .35+.58*u;
  return clamp((1-v)*1.3,0,.67);
}
function prepareYardEquipment(p,source){
  const cfg=equipmentProfile[p.key],scale=2;
  const w=Math.round(p.width*scale),h=Math.round(p.height*scale),pad=32;
  const c=winterCanvas(w,h),g=c.getContext('2d',{willReadFrequently:true});
  g.imageSmoothingQuality='high';g.drawImage(source,0,0,w,h);
  const pixels=g.getImageData(0,0,w,h),rgba=pixels.data,z=new Float32Array(w*h);
  // Embed only ground contacts in the crust. Hanging seats and the raised plank stay clear.
  for(const [u,v,r] of yardFeet[p.key]){
    const cx=u*w,cy=v*h,radius=r*scale,lip=scale*(p.key==='roundabout'?4:3);
    for(let x=Math.max(0,Math.floor(cx-radius));x<Math.min(w,cx+radius);x++){
      const edge=Math.sqrt(Math.max(0,1-((x-cx)/radius)**2));
      const surface=cy-lip*edge+scale*(vnoise(x+p.x,cy+p.y,6)-.5);
      for(let y=Math.max(0,Math.floor(surface)-3);y<Math.min(h,cy+lip);y++){
        const i=4*(y*w+x),cover=edge*clamp((y-surface+2)/3,0,1);
        rgba[i+3]=Math.round(rgba[i+3]*(1-cover));
      }
    }
  }
  g.putImageData(pixels,0,0);
  const shadow=winterCanvas(w+pad*2,h+pad*2),sg=shadow.getContext('2d');
  const mask=sg.createImageData(shadow.width,shadow.height);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,rel=equipmentHeight(p.key,x/w,y/h);
    z[i]=rel;
    if(rgba[i*4+3]<18)continue;
    // Project the point down onto the snow, then away from the winter sun.
    const px=pad+x+Math.round(rel*cfg.rise*.34*scale);
    const py=pad+y+Math.round(rel*cfg.rise*.64*scale);
    if(px>=shadow.width || py>=shadow.height)continue;
    const j=(py*shadow.width+px)*4;
    mask.data[j]=52;mask.data[j+1]=63;mask.data[j+2]=74;mask.data[j+3]=rgba[i*4+3];
  }
  sg.putImageData(mask,0,0);
  const out=winterCanvas(w+pad*2,h+pad*2),og=out.getContext('2d');
  p.yard={w,h,pad,scale,rgba,z,grounded:c,shadow,out,og,pixels:og.createImageData(out.width,out.height)};
  p.foot=1-cfg.front/p.height;p.depth=p.y+cfg.front;
}
function paintEquipment(g,p,mapView,shadow=false){
  const a=p.yard,cfg=equipmentProfile[p.key];
  const x=p.x-p.width/2-a.pad/a.scale,y=p.y-p.foot*p.height-a.pad/a.scale;
  if(shadow){
    g.save();g.globalAlpha*=.25;g.filter='blur(1.6px)';
    g.drawImage(a.shadow,x,y,a.shadow.width/a.scale,a.shadow.height/a.scale);g.restore();return;
  }
  if(mapView || !perspective){
    g.drawImage(a.grounded,p.x-p.width/2,p.y-p.foot*p.height,p.width,p.height);return;
  }
  // The camera changes relief only by a few pixels. Cache the warped raster until
  // a half-pixel boundary is crossed. Absolute world position remains continuous.
  const dx=Math.round(clamp((p.x-cam.x)*.001,-.15,.15)*cfg.rise*a.scale);
  const dy=Math.round(clamp((p.y-cam.y)*.00075,-.085,.085)*cfg.rise*a.scale);
  if(a.dx!==dx || a.dy!==dy){
    a.dx=dx;a.dy=dy;
    const {w,h,pad,z,rgba,pixels}=a,dst=pixels.data,stride=pixels.width;
    dst.fill(0);
    for(let v=Math.min(0,dy);v<h+Math.max(0,dy);v++)for(let u=Math.min(0,dx);u<w+Math.max(0,dx);u++){
      let sx=u,sy=v;
      for(let it=0;it<2;it++){
        const f=z[clamp(Math.round(sy),0,h-1)*w+clamp(Math.round(sx),0,w-1)];
        sx=u-f*dx;sy=v-f*dy;
      }
      sx=Math.round(sx);sy=Math.round(sy);
      if(sx<0||sx>=w||sy<0||sy>=h)continue;
      const src=(sy*w+sx)*4,at=((v+pad)*stride+u+pad)*4;
      dst[at]=rgba[src];dst[at+1]=rgba[src+1];dst[at+2]=rgba[src+2];dst[at+3]=rgba[src+3];
    }
    a.og.putImageData(pixels,0,0);
  }
  g.drawImage(a.out,x,y,a.out.width/a.scale,a.out.height/a.scale);
}
