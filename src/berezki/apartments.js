// Each building owns its staircase. Detached upper floors use stable save coordinates.
function makeApartments() {
  for(const abandoned of [false,true]){
    const last=abandoned?5:3;
    for(let n=1;n<=last;n++){
      const x=n===1?407:n%2===0?770:810;
      const y=n===1?(abandoned?302:276):abandoned?(n<=3?100:140):12;
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
        fit('desk',14.8,8.6);fit('cabinet',15.5,2);fit('rack',1.48,7.35,Math.PI/2);
      }else{
        r.drifts=[];
        for(const [bay,u] of [1,6,11].entries()){
          if(bay){wall(u,1,.22,3.55);wall(abandoned && n===1 && bay===2?u-.22:u,6.6,.22,3.4);}
          for(const [side,v] of [[0,4.45],[1,6.55]]){
            if(abandoned && n===1 && bay===2 && side===1){
              // Former vestibule connects the street doorway straight to the corridor.
              wall(13,6.55,.24,3.45);fit('pallet',15.15,8.9);continue;
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
      r.stairX=18.55;r.stairY=1.04;
      r.flights=[];
      const edges=new Set();
      for(const up of [false,true]){
        const blocked=up && !abandoned && n===last;
        if(up?n===last && !blocked:n===1)continue;
        const flight={room:r,up,blocked,...tilePoint(x+r.stairX+(up?.81:-.71),y+r.stairY+.35)};
        r.flights.push(flight);
        if(!blocked)district.stairs.push(flight);
        edges.add(up?1.52:-1.52);edges.add(0);
      }
      for(const offset of edges)wall(r.stairX+offset,r.stairY,.10,2.86);
      if(n===3 && !abandoned){
        fit('cupboard',r.stairX+.82,r.stairY+1.70,Math.PI/2);
        fit('cabinet',r.stairX+.78,r.stairY+.87);fit('pallet',r.stairX+.74,r.stairY+.20);
      }
    }
  }
}
function stairRise(f,y){
  const start=(f.room.y+f.room.stairY)*T;
  return (f.up?45:-45)*clamp(1-(y-start)/(2.86*T),0,1);
}
function stairwellFloor(g,r,mapView=false){
  const y=(r.y+r.stairY)*T,len=2.86*T,w=1.42*T;
  for(const f of r.flights){
    const x=f.x-w/2;
    function offset(v,extra=0){return raisedOffset(f.x,y+len/2,stairRise(f,y+v)+extra,mapView);}
    const [dx,dy]=offset(0);
    g.save();g.translate(x+dx,y+dy);g.transform(1,0,-dx/len,1-dy/len,0,0);
    artFill(g,'floor_concrete',0,0,w,len);
    for(let i=0;i<12;i++){
      const v=i*len/12,depth=1-i/12;
      g.fillStyle=f.up?'rgba(181,177,158,.15)':'rgba(28,32,34,'+(.14+.66*depth)+')';
      g.fillRect(0,v,w,len/12+.25);
      beam(g,0,v+1,w,v+1,1.8,f.up?'#bcb8a6':'#807e72');
      beam(g,0,v+3,w,v+3,2.4,f.up?'#615e54':'#45453f');
    }
    g.restore();
    for(const u of [x,x+w]){
      for(let i=0;i<=4;i++){
        const v=len*i/4,[ax,ay]=offset(v),[bx,by]=offset(v,15);
        beam(g,u+ax,y+v+ay,u+bx,y+v+by,2,'#5c574a');
      }
      const [ax,ay]=offset(0,15),[bx,by]=offset(len,15);
      beam(g,u+ax,y+ay,u+bx,y+len+by,3,'#84735a');
    }
  }
}
function abandonedFloor(g,r){
  const rand=mulberry32(732+r.n);
  g.save();g.translate(r.x*T,r.y*T);
  const pattern=district.surface.powder;
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

// Align the backs of tall storage units to a solid wall. Leave the original
// stash identity intact and keep doorways, the stair blockade and other fittings clear.
function alignWinterStorage(){
  for(const o of objs){
    if(!['rack','cupboard','cabinet','bedroll','desk'].includes(o.fitting) || o.workbench)continue;
    const cx=o.x+o.w/2,cy=o.y+o.h/2,r=winterFloor(cx,cy);
    if(!r || r.block && cx>(r.x+16)*T)continue;
    const wide=Math.max(o.w,o.h),thin=Math.min(o.w,o.h),options=[];
    const left=(r.x+1)*T,right=(r.x+r.w-1)*T,top=(r.y+1)*T,bottom=(r.y+r.h-1)*T;
    for(const [axis,boundary,sign] of [['x',left,1],['x',right,-1],['y',top,1],['y',bottom,-1]]){
      const vertical=axis==='x',w=vertical?thin:wide,h=vertical?wide:thin;
      const x=vertical?boundary+(sign>0?1:-1-w):clamp(cx-w/2,left+1,right-1-w);
      const y=vertical?clamp(cy-h/2,top+1,bottom-1-h):boundary+(sign>0?1:-1-h);
      const distance=Math.hypot(x+w/2-cx,y+h/2-cy);
      if(distance>2.35*T)continue;
      const rect={x,y,w,h};
      // Check both back corners against the actual wall tiles (entrances have gaps).
      const backed=[.02,.98].every(t=>{
        const bx=vertical?boundary-sign*2:x+w*t,by=vertical?y+h*t:boundary-sign*2;
        return [CO,BR].includes(tAt(Math.floor(bx/T),Math.floor(by/T)));
      });
      if(!backed || objs.some(other=>other!==o && other.solid && x<other.x+other.w+1 && x+w>other.x-1 && y<other.y+other.h+1 && y+h>other.y-1))continue;
      const [,aw,ah]=roomFittings[o.fitting];
      options.push({...rect,distance,angle:(aw>ah)===vertical?Math.PI/2:0});
    }
    options.sort((a,b)=>a.distance-b.distance);
    if(options.length){const {x,y,w,h,angle}=options[0];Object.assign(o,{x,y,w,h,angle});}
  }
}
