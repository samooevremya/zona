// All points are in ground pixels plus physical height. The same structure casts the shadow.
const yardEquipment=new Set(['swing','slide','seesaw','roundabout']);
function paintEquipment(g,p,mapView,shadow=false){
  const project=([x,y,z=0])=>{
    if(shadow)return [p.x+x+z*.42,p.y+y+z*.27];
    const [u,v]=raisedOffset(p.x+x,p.y+y,z,mapView);
    return [p.x+x+u,p.y+y+v];
  };
  const pipe=(a,b,w,color)=>{
    const [x,y]=project(a),[u,v]=project(b);
    beam(g,x,y,u,v,w,shadow?'#4b58602f':'#494b42');
    if(!shadow){
      beam(g,x,y-.5,u,v-.5,Math.max(.65,w-1.35),color);
      if(w>2){
        const n=Math.ceil(Math.hypot(u-x,v-y)/8);
        for(let i=1;i<n;i++){
          const f=i/n,chip=hash2(Math.floor(a[0]+i*7),Math.floor(b[1]+i));
          if(chip>.52)continue;
          const xx=x+(u-x)*f,yy=y+(v-y)*f;
          beam(g,xx,yy,xx+(u-x)/n*.43,yy+(v-y)/n*.43,.85,chip>.24?'#8a6550':'#c1c0b0');
        }
      }
    }
  };
  const face=(points,color)=>{
    g.beginPath();for(const [i,a] of points.entries()){const [x,y]=project(a);if(i)g.lineTo(x,y);else g.moveTo(x,y);}
    g.closePath();g.fillStyle=shadow?'#48576330':color;g.fill();
    if(!shadow){
      const pts=points.map(project),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
      const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      g.save();g.clip();g.globalAlpha=.80;
      artFill(g,p.key==='slide'?'wall_concrete':'floor_wood',x,y,w,h);
      g.fillStyle=color;g.globalAlpha=.35;g.fillRect(x,y,w,h);
      const frost=g.createLinearGradient(x,y,x+w*.3,y+h);frost.addColorStop(0,'#e5e6debf');frost.addColorStop(.62,'#cbcdc65c');frost.addColorStop(1,'#53574340');
      g.globalAlpha=1;g.fillStyle=frost;g.fillRect(x,y,w,h);
      const rand=mulberry32(177+Math.round(points[0][0]));
      for(let i=0;i<w*h*.063;i++){
        const xx=x+rand()*w,yy=y+rand()*h;g.fillStyle=i%4?'#dbded554':'#715e4e84';g.fillRect(xx,yy,.7+rand()*2,.8);
      }
      g.restore();
      g.beginPath();for(const [i,v] of pts.entries()){if(i)g.lineTo(...v);else g.moveTo(...v);}g.closePath();g.strokeStyle='#645e53';g.lineWidth=1;g.stroke();
    }
  };
  const rust='#937052',green='#71806d',snow='#d2d5cc',metal='#a2a6a0';
  if(p.key==='swing'){
    for(const x of [-44,44]){
      for(const y of [-15,15]){pipe([x,y],[x,0,75],4.3,green);if(!shadow)shoreEllipse(g,p.x+x,p.y+y,4.8,2.3,'#aab4b9',.15);}
    }
    pipe([-45,0,75],[45,0,75],5,rust);pipe([-44,0,77],[44,0,77],1.4,snow);
    for(const u of [-20,20]){
      for(const side of [-10,10]){pipe([u+side,0,73],[u+side,1,16],1.6,metal);}
      face([[u-11,-4,15],[u+11,-4,15],[u+11,6,15],[u-11,6,15]],'#958573');
      pipe([u-11,5,15],[u+11,5,15],2.4,rust);
    }
  }else if(p.key==='slide'){
    for(const x of [-12,12]){
      pipe([x,-25],[x,-11,49],3,green);pipe([x,-10],[x,-11,49],3,rust);
      pipe([x,-16,57],[x,-4,57],2.8,green);pipe([x,-3,57],[x,-2,45],2,green);
    }
    for(let i=0;i<=5;i++)pipe([-12,-25+i*2.3,i*8],[12,-25+i*2.3,i*8],2.6,rust);
    face([[-12,-12,47],[12,-12,47],[12,-2,46],[-12,-2,46]],'#969588');
    face([[-12,-2,46],[12,-2,46],[12,25,6],[-12,25,6]],'#adb2ad');
    for(const x of [-12,12])pipe([x,-2,48],[x,25,8],2.6,metal);
  }else if(p.key==='seesaw'){
    for(const y of [-6,6]){pipe([-7,y],[0,y,18],3,green);pipe([7,y],[0,y,18],3,green);}
    pipe([-49,0,8],[49,0,30],6,rust);
    for(const side of [-1,1]){
      const x=side*38,z=19+side*9;
      face([[x-9,-7,z],[x+9,-7,z],[x+9,7,z],[x-9,7,z]],'#827767');
      pipe([x-side*9,0,z],[x-side*9,0,z+10],2.7,green);
    }
  }else{
    const ring=Array.from({length:32},(_,i)=>[35*Math.cos(i*Math.PI/16),29*Math.sin(i*Math.PI/16),11]);
    for(let i=0;i<16;i++){
      const a=ring[i],b=ring[i+1];pipe([a[0],a[1],7],[b[0],b[1],7],3,rust);
    }
    face(ring,'#88877a');
    for(let i=-24;i<=24;i+=8){const end=29*Math.sqrt(1-i*i/(35*35));pipe([i,-end,11],[i,end,11],1,'#736c60');}
    pipe([0,0],[0,0,32],5,green);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,x=29*Math.cos(a),y=24*Math.sin(a);
      pipe([x,y,11],[x,y,30],3,green);pipe([0,0,32],[x,y,30],2.6,rust);
    }
  }
}
