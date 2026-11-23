// Original overhead sequence, using the same truck, verge textures and trees as the world.
function intro(){
  resetInput(); title.open=true;
  const scene=el('section','prologue'),canvas=document.createElement('canvas');
  const caption=el('p','prologue-caption','Последний пассажир');
  const skip=btn('','Пропустить',finish);scene.setAttribute('aria-label','Пролог');
  scene.append(canvas,caption,skip);document.body.append(scene);skip.focus();
  const g=canvas.getContext('2d'), strip=document.createElement('canvas');
  strip.width=1440;strip.height=520;
  const b=strip.getContext('2d'),rng=mulberry32(397);
  b.fillStyle='#4d4939';b.fillRect(0,0,1440,520);
  if(ART)artFill(b,'grass_dry',0,0,1440,520);
  b.save();b.beginPath();b.moveTo(0,198);b.bezierCurveTo(420,218,900,169,1440,204);b.lineTo(1440,326);b.bezierCurveTo(900,293,420,337,0,311);b.closePath();b.clip();
  b.fillStyle='#59564b';b.fillRect(0,0,1440,520);if(ART)artFill(b,'dirt',0,0,1440,520);
  for(let i=0;i<6500;i++){b.fillStyle=i%2?'#c4bea417':'#16161219';b.fillRect(rng()*1440,195+rng()*140,2+rng()*8,1+rng()*2);}b.restore();
  if(ART && C1)for(let i=0;i<100;i++){
    const x=rng()*1440,y=i%2?rng()*165:362+rng()*158;
    c1Draw(b,'c1_bush'+(i%4),x,y,22+rng()*70,rng()*6);
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fox={...byS('fox'),captive:0,wounded:0,sit:0,wpn:'hands'};
  const speech=CORDON_SCRIPT.crash;
  const beats=[], arrival=8;
  let clock=arrival;
  for(const [speaker,text] of speech){
    const end=clock+Math.max(2,text.length/17);
    beats.push({end,caption:speaker+' · '+text});clock=end;
  }
  const bunker=clock+.7, duration=bunker+3.6;
  let raf,lastStamp,elapsed=0,thunder=false,ended=false;
  function finish(){
    if(ended)return;ended=true;cancelAnimationFrame(raf);scene.remove();title.open=false;
    P.y=SID_SPAWN_Y*T;P.ang=-Math.PI/2;resetInput();save(true);msg('Ты очнулся в бункере. Поговори с Сидоровичем.','say');
  }
  function draw(now){
    if(ended)return;
    if(lastStamp && !document.hidden)elapsed+=Math.min(.1,(now-lastStamp)/1000);lastStamp=now;
    const t=elapsed, seconds=duration;
    if(t>=seconds){finish();return;}
    const w=Math.max(1,Math.min(1200,scene.clientWidth)),h=Math.max(1,Math.round(w*scene.clientHeight/scene.clientWidth));
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
    const s=Math.max(w/840,h/510),time=t,drive=Math.min(time,6.5),roll=clamp((time-5)/1.5,0,1);
    g.setTransform(s,0,0,s,w/2,h/2);g.fillStyle='#211f1c';g.fillRect(-w/s/2,-h/s/2,w/s,h/s);
    g.drawImage(strip,-465-drive*59,-254);
    const x=-83+drive*13,y=5+roll*46;
    g.fillStyle='rgba(9,18,25,.59)';g.fillRect(-w/s/2,-h/s/2,w/s,h/s);
    // A cold ripple bends the verge just before the front wheels reach it.
    if(time>3.65 && time<5.55){
      const phase=(time-3.65)/1.9, bend=Math.sin(phase*Math.PI);
      g.save();g.translate(x+123-phase*86,y-5);g.scale(.64,1);g.lineWidth=1.7;
      for(let i=0;i<3;i++){g.strokeStyle='rgba(177,215,221,'+bend*(.35-i*.075)+')';
        g.beginPath();g.ellipse(0,0,13+i*7+phase*8,29+i*9,phase*.6,0,Math.PI*2);g.stroke();}
      g.restore();
    }
    g.save();g.translate(x,y);g.rotate(.02+roll*.69);
    const beam=g.createLinearGradient(38,0,219,0);beam.addColorStop(0,'rgba(255,227,153,.46)');beam.addColorStop(1,'rgba(245,234,180,0)');
    g.fillStyle=beam;g.beginPath();g.moveTo(37,-12);g.lineTo(220,-72);g.lineTo(220,73);g.lineTo(37,12);g.fill();
    g.scale(1,Math.cos(roll*Math.PI)*.79+.06);
    if(ART && C1)c1Draw(g,'c1_army0',0,0,116,0);else {g.fillStyle='#625d46';g.fillRect(-51,-19,102,38);}
    if(roll>.6){g.fillStyle='#302d29';g.fillRect(-42,-9,80,18);g.fillStyle='#181917';for(const dx of [-36,30])for(const dy of [-14,7])g.fillRect(dx,dy,12,7);}
    g.restore();
    if(time>6.6){
      const approach=clamp((time-6.6)/2.2,0,1);
      fox.x=x+94-approach*66;fox.y=y+55-approach*22;fox.ang=-2.6;
      fox.step=approach*60;fox.crouch=approach===1;drawHuman(fox,g);
    }
    g.setTransform(1,0,0,1,0,0);g.strokeStyle='rgba(199,210,216,.22)';g.beginPath();
    for(let i=0;i<55;i++){const xx=(i*151+t*63)%w, yy=(i*71+t*340)%h;g.moveTo(xx,yy);g.lineTo(xx-4,yy+11);}g.stroke();
    if(time>=5 && !thunder){thunder=true;play('thunder');}
    if(!reduced && time>4.9 && time<5.45){g.fillStyle='rgba(205,218,224,'+(.41*(1-(time-4.9)/.55))+')';g.fillRect(0,0,w,h);}
    if(time>=bunker){
      const u=clamp((time-bunker)/2.7,0,1);
      P.y=(SID_SPAWN_Y+(1-u)*.85)*T;P.ang=-Math.PI/2;P.step=u*28;
      render();g.drawImage(cv,0,0,w,h);
      g.fillStyle='rgba(8,9,8,'+(1-u)+')';g.fillRect(0,0,w,h);
      caption.textContent='Четыре часа спустя · Бункер Сидоровича';
    }else{
      const shade=clamp((time-clock+.6)/1.3,0,1);
      g.fillStyle='rgba(8,9,8,'+shade+')';g.fillRect(0,0,w,h);
      caption.textContent=time<3?'Последний пассажир':time<arrival?'':beats.find(b=>time<b.end)?.caption || '';
    }
    raf=requestAnimationFrame(draw);
  }
  raf=requestAnimationFrame(draw);
}
