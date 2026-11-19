/* Independent Canvas2D helper. Does not change game state. */
window.VillageArt=class VillageArt{
 constructor(manifest=window.VILLAGE_MANIFEST){this.m=manifest;this.images={};this.patterns=new Map();}
 async load(base=''){await Promise.all(Object.entries(this.m.images).map(([key,v])=>new Promise((ok,fail)=>{const im=new Image();im.onload=()=>{this.images[key]=im;ok();};im.onerror=()=>fail(new Error('Cannot load '+v.file));im.src=base+v.file;})));return this;}
 draw(ctx,id,x,y,w,h,angle=0,alpha=1){const s=this.m.sprites[id];if(!s)throw Error('Unknown asset '+id);w??=s.logicalSize[0];h??=s.logicalSize[1];ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;ctx.drawImage(this.images[s.atlas],...s.rect,-w/2,-h/2,w,h);ctx.restore();}
 /* Shared material patch. Mirrored 2x2 repeats remove hard repeat-edge seams.
    The artwork itself is not claimed to be mathematically seamless. */
 pattern(ctx,id,size=256){const key=id+':'+size;if(!this.patterns.has(key)){
   const s=this.m.sprites[id],c=document.createElement('canvas');c.width=c.height=size*4;const g=c.getContext('2d');
   for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.save();g.translate(x?size*4:0,y?size*4:0);g.scale(x?-1:1,y?-1:1);g.drawImage(this.images[s.atlas],...s.rect,0,0,size*2,size*2);g.restore();}
   this.patterns.set(key,c);
  }const p=ctx.createPattern(this.patterns.get(key),'repeat');p.setTransform(new DOMMatrix().scale(.5));return p;
 }
 fill(ctx,id,x,y,w,h,size=256){ctx.save();ctx.fillStyle=this.pattern(ctx,id,size);ctx.fillRect(x,y,w,h);ctx.restore();}
 /* Soft organic dirt edge overlay. World x/y guarantee deterministic texture phase.
    Call at grass/dirt boundary and only within the GR side, never over house walls. */
 edge(ctx,id,x,y,w,h,side='left',size=256){const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);const g=c.getContext('2d');g.scale(2,2);g.translate(-x,-y);this.fill(g,id,x,y,w,h,size);g.setTransform(2,0,0,2,0,0);g.globalCompositeOperation='destination-in';const pts={left:[0,0,w,0],right:[w,0,0,0],top:[0,0,0,h],bottom:[0,h,0,0]}[side];if(!pts)throw Error('Invalid side');const grad=g.createLinearGradient(...pts);grad.addColorStop(0,'rgba(0,0,0,.95)');grad.addColorStop(.35,'rgba(0,0,0,.55)');grad.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=grad;g.fillRect(0,0,w,h);ctx.drawImage(c,x,y,w,h);}
};
