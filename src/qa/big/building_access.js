// Executed by the QA runner inside the built game's closure, after world and save initialisation.
window.checkBuildingAccess = stockCrates => {
  const outdoor = HOUSES.filter(h=>h.x<PW);
  // This test runs in a disposable browser. Ordinary saves occupy only a subset of these sites.
  const sites = stockCrates ? fieldCrateSites.filter(tile=>{
    const x=tile%MW+.5,y=Math.floor(tile/MW)+.5;
    return outdoor.some(h=>x>h.x-16 && x<h.x+h.w+16 && y>h.y-16 && y<h.y+h.h+16);
  }) : [];
  for(const tile of sites)objs.push(fieldBox(tile,{},false));
  const stride = PW*2, id = (x,y)=>Math.round(y*2)*stride+Math.round(x*2);
  const position = k=>[(k%stride)/2, Math.floor(k/stride)/2];
  const buildings = new Uint8Array(MW*MH), roads = new Set(), edgeCache = new Map();
  for (const h of outdoor) for(let y=h.y;y<h.y+h.h;y++)
    buildings.fill(1,y*MW+h.x,y*MW+h.x+h.w);
  const routes = [...window.testRoads, Array.from({length:MH-NORTH_ROWS-2},(_,i)=>
    [roadX[i+NORTH_ROWS]+.5,i+NORTH_ROWS+.5])];
  for(const pts of routes) for(let i=1;i<pts.length;i++){
    const [x,y]=pts[i-1], [xx,yy]=pts[i], n=Math.ceil(Math.hypot(xx-x,yy-y)*4);
    for(let j=0;j<=n;j++) roads.add(id(x+(xx-x)*j/n,y+(yy-y)*j/n));
  }
  function outside(x,y) {
    const c=Math.floor(x),r=Math.floor(y);
    return c>=0 && c<PW && r>=0 && r<MH && !buildings[r*MW+c] && tAt(c,r)!==SW;
  }
  function walk(a,b) {
    const e={x:a[0]*T,y:a[1]*T,r:P.r}, dx=(b[0]-a[0])*T,dy=(b[1]-a[1])*T;
    const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
    for(let j=0;j<=n;j++){
      moveE(e,j?dx/n:0,j?dy/n:0);
      if(Math.hypot(e.x-a[0]*T-dx*j/n,e.y-a[1]*T-dy*j/n)>.05) return false;
    }
    return true;
  }
  function edge(a,b) {
    const key=Math.min(a,b)*stride*MH*2+Math.max(a,b);
    if(!edgeCache.has(key)){
      const p=position(a),q=position(b);
      edgeCache.set(key,walk(p,q)&&walk(q,p));
    }
    return edgeCache.get(key);
  }
  function approach(start) {
    const root=id(...start),queue=[root],parent=new Map([[root,-1]]);
    for(let i=0;i<queue.length;i++){
      const k=queue[i],p=position(k);
      if(roads.has(k) && [DI,AS].includes(tAt(Math.floor(p[0]),Math.floor(p[1])))){
        const path=[];
        for(let j=k;j!==-1;j=parent.get(j))path.push(position(j));
        return path;
      }
      for(const step of [1,-1,stride,-stride]){
        const j=k+step, [x,y]=position(j);
        if(!parent.has(j) && Math.abs(x-p[0])<=.5 && outside(x,y) && edge(k,j)){
          parent.set(j,k);queue.push(j);
        }
      }
    }
    return null;
  }
  const results=[], failures=[];
  let count=0;
  function check(h,x,y,nx,ny,width,label) {
    count++;
    const offsets=[0];
    for(let n=.5;n<width/2;n+=.5)offsets.push(n,-n);
    let threshold=false;
    for(const u of offsets){
      const cx=x-ny*u,cy=y+nx*u;
      const start=[cx+nx*1.5,cy+ny*1.5],inside=[cx-nx*1.5,cy-ny*1.5];
      if(!outside(...start)||!walk(start,inside)||!walk(inside,start))continue;
      threshold=true;
      const path=approach(start);
      if(path){results.push([h,label,x,y,path.length]);return;}
    }
    failures.push({home:h,label,x,y,nx,ny,width,issue:threshold?'courtyard':'threshold'});
  }
  for(const h of outdoor){
    for(const d of h.entrances)check(h.ok,d.x/T+h.x,d.y/T+h.y,d.nx,d.ny,(d.width+4)/T,d.approach);
    // A tree can cause buildEntrances to silently omit a declared doorway.
    for(const [i,j] of h.doors){
      const nx=i===0?-1:i===h.w-1?1:0,ny=j===0?-1:j===h.h-1?1:0;
      const x=i+.5+nx*.5,y=j+.5+ny*.5;
      if(!h.entrances.some(d=>nx===d.nx&&ny===d.ny&&Math.hypot(x-d.x/T,y-d.y/T)<(d.width+4)/(2*T)))
        failures.push({home:h.ok,x:x+h.x,y:y+h.y,nx,ny,label:'declared',issue:'missing'});
    }
  }
  const bunker=[HATCH.x/T,Math.round((HATCH.y+27)/T*2)/2];
  if(!approach(bunker)||!walk(bunker,[HATCH.x/T,HATCH.y/T])) failures.push({label:'bunker',x:bunker[0],y:bunker[1]});
  return {houses:outdoor.length,openings:count,stocked:sites.length,failures,results};
};
