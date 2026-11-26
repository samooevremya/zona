// Each building owns its staircase. Detached upper floors use stable save coordinates.
function makeApartments() {
  for(const abandoned of [false,true]){
    const last=abandoned?5:3;
    for(let n=1;n<=last;n++){
      const x=n===1?506:n%2===0?770:810;
      const y=n===1?(abandoned?375:349):abandoned?(n<=3?100:140):12;
      const r={x,y,w:22,h:11,n,abandoned,block:abandoned?'empty':'living',name:(abandoned?'Заброшенный корпус':'Жилой корпус')+' · этаж '+n};
      house(x,y,r.w,r.h,n===1?[[11,10],[12,10]]:[],CO,0,n===1?'conc':'none');
      if(n===1){const h=HOUSES.at(-1);h.storeys=5;h.flat=r;buildEntrances(h);}
      district.levels.push(r);
      const wall=(u,v,w,d)=>partition(x+u,y+v,w,d,'concrete');
      const fit=(type,u,v,angle=0)=>putFurniture(type,(x+u)*T,(y+v)*T,angle,'flat-'+r.block+n);
      const stove=(u,v)=>{fit('stove',u,v);district.heaters.push(tilePoint(x+u,y+v));};
      // Bays 1–16 are apartments. The corridor leads to a separate stairwell at the east gable.
      if(n===1 && !abandoned){
        wall(9,1,.22,4.5);wall(9,7.8,.22,2.2);stove(5,6);
        fit('supper',3,3.5);fit('bench',3,2.4);fit('supper',6.9,8);fit('bench',7,9);
        fit('desk',14.8,8.6);fit('cabinet',15.5,2);fit('rack',2.1,7.35);
      }else{
        r.drifts=[];
        for(const [bay,u] of [1,6,11].entries()){
          if(bay){wall(u,1,.22,3.55);wall(u,6.6,.22,3.4);}
          for(const [side,v] of [[0,4.45],[1,6.55]]){
            if(abandoned && n===1 && bay===2 && side===1){
              // Former vestibule connects the street doorway straight to the corridor.
              wall(13.5,6.55,.24,3.45);fit('pallet',15.15,8.9);continue;
            }
            wall(u,v,2.75,.24);wall(u+4.35,v,.65,.24);
            const z=side?8.65:2.3;
            if(abandoned && (n+bay*2+side)%4===0){
              const d={u:u+3.55,v:v+.12,w:1.8,h:1.12};r.drifts.push(d);
              interiorObject('snowBank',(x+d.u)*T,(y+d.v)*T,d.w*T,d.h*T);
            }
            if(!abandoned || (bay+side+n)%3!==0)fit(abandoned && (n+bay)%3===1?(side?'pallet':'rack'):(side?'supper':'bedroll'),u+1.1,z,side?0:Math.PI/2);
            if(!side)fit('cupboard',u+3.8,1.85);
          }
        }
        if(!abandoned){stove(12.05,3.45);const c=fit('cabinet',2,9.2);c.stash='cupboard_'+Math.round((x+3)*T)+'_'+Math.round((y+9.3)*T);}
      }
      wall(16.1,1,.24,3.6);wall(16.1,6.65,.24,3.35);
      // Parallel half-flights reach the shared north landing. The player walks on the treads.
      r.stairX=18.55;r.stairY=2.25;
      for(const offset of [-1.52,0,1.52])wall(r.stairX+offset,r.stairY,.10,2.85);
      for(const up of [false,true]){
        if(up?n===last:n===1)continue;
        district.stairs.push({room:r,up,...tilePoint(x+r.stairX+(up?.8:-.72),y+r.stairY+.35)});
      }
      if(n===3 && !abandoned){
        fit('cupboard',r.stairX+.82,3.95,Math.PI/2);
        fit('cabinet',r.stairX+.78,3.12);fit('pallet',r.stairX+.74,2.45);
      }
    }
  }
}
function stairwellFloor(g,r){
  const x=(r.x+r.stairX-1.52)*T,y=(r.y+r.stairY)*T,w=3.14*T,len=2.86*T;
  artFill(g,'floor_concrete',x,y-21,w,len+26);
  for(const side of [0,1]){
    const u=x+side*w/2+3,sw=w/2-6;
    g.fillStyle='#3d4242';g.fillRect(u,y,sw,len);
    for(let i=0;i<11;i++){
      const v=y+i*len/11,c=(side?116:79)+(side?-1:1)*i*3;
      artFill(g,'floor_concrete',u,v,sw,len/11);
      g.fillStyle='rgba('+c+','+c+','+(c-5)+',.64)';g.fillRect(u,v,sw,len/11);
      beam(g,u,v+1,u+sw,v+1,1.6,'#b2afa3');beam(g,u,v+3,u+sw,v+3,1.5,'#5a5953');
    }
  }
  for(const u of [x+1,x+w/2,x+w-1]){
    for(let v=0;v<=len;v+=19)beam(g,u,y+v,u,y+v-7,2,'#585949');
    beam(g,u,y-7,u,y+len-7,3,'#796854');
  }
}
function abandonedFloor(g,r){
  const rand=mulberry32(732+r.n);
  g.save();g.translate(r.x*T,r.y*T);
  const pattern=g.createPattern(district.snow,'repeat');
  pattern.setTransform(new DOMMatrix().scale(.45));
  function drift(cx,cy,rx,ry,phase){
    g.save();g.translate(cx,cy);
    const border=new Path2D();
    for(let i=0;i<44;i++){
      const a=i*Math.PI/22,irregular=1+.14*Math.sin(3*a+phase)+.07*Math.cos(7*a-phase);
      border.lineTo(Math.cos(a)*rx*irregular,Math.sin(a)*ry*irregular);
    }
    border.closePath();g.clip(border);
    g.fillStyle=pattern;g.globalAlpha=.76;g.fillRect(-rx*1.4,-ry*1.4,rx*2.8,ry*2.8);
    const lip=g.createLinearGradient(0,-ry,rx*.25,ry);
    lip.addColorStop(0,'#dfe6e8a8');lip.addColorStop(.78,'#bdc8ce52');lip.addColorStop(1,'#6575818c');
    g.fillStyle=lip;g.fillRect(-rx*1.4,-ry*1.4,rx*2.8,ry*2.8);g.restore();
  }
  for(const u of [2.6,8.1,14,18.65])for(const side of [0,1]){
    const v=side?9.65:1.31;
    drift(u*T,v*T,27+rand()*29,13+rand()*18,rand()*7);
    for(let j=0;j<24;j++){
      const x=(u+(rand()-.5)*2.8)*T,y=(v+(side?-1:1)*rand()*.95)*T;
      shoreEllipse(g,x,y,1+rand()*3,1,'#cdd4d066',-.3);
    }
  }
  for(const d of r.drifts){
    drift(d.u*T,d.v*T,d.w*T*.67,d.h*T*.77,rand()*7);
    drift(d.u*T-5,d.v*T-4,d.w*T*.36,d.h*T*.46,rand()*7);
  }
  for(let i=0;i<34;i++){
    const u=(1.6+rand()*14.2)*T,v=(i%2?1.5+rand()*2.5:7.1+rand()*2.4)*T;
    beam(g,u,v,u+5+rand()*17,v+rand()*8,1+rand()*2,i%3?'#948777':'#b6bbaf');
  }
  g.restore();
}
