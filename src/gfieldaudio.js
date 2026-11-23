// Field recordings are embedded by build.py so saved offline copies sound the same as Pages.
const fieldBuffers=new Map(),fieldVoices=new Set(),lastTake=new Map();
const recordings={
  p:[.85,'pistol'],s:[1,'shotgun'],r:[.88,'rifle'],thunder:[.88,'thunder'],
  stepDirt:[.32,'SandL1','SandR2'],stepGrass:[.30,'leaves01','leaves02'],
  stepHard:[.32,'StoneL1','StoneR2'],stepWet:[.37,'mud02','waterStep'],stepGravel:[.29,'gravel','gravelStep'],
  stepWood:[.32,'wood01','wood02'],stepMetal:[.35,'impactMetal_heavy_002','impactMetal_medium_001'],
  stepDog:[.15,'leaves01','leaves02'],shell:[.21,'impactMetal_light_000'],bolt:[.29,'impactMetal_medium_001'],
  reload:[.46,'metalLatch'],jam:[.36,'metalClick'],click:[.27,'metalClick'],pick:[.32,'clothBelt'],creak:[.15,'creak1']
};
let fieldReady=false,windGain=null,rainFilter=null,rainRoof=null,hearthGain=null;
function loadFieldAudio(){
  if(!window.ZONE_AUDIO || fieldReady)return;
  fieldReady=true;
  for(const [name,encoded] of Object.entries(window.ZONE_AUDIO)){
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    AC.decodeAudioData(bytes.buffer).then(buffer=>fieldBuffers.set(name,buffer)).catch(()=>{});
  }
}
function playRecording(name,volume,x,y){
  const entry=recordings[name];
  if(!entry)return false;
  const index=(lastTake.get(name)||0)%(entry.length-1)+1;
  const buffer=fieldBuffers.get(entry[index]);if(!buffer)return false;
  lastTake.set(name,index);
  if(fieldVoices.size>=30){
    const oldest=fieldVoices.values().next().value;fieldVoices.delete(oldest);oldest.stop();
  }
  const src=AC.createBufferSource(),gain=AC.createGain(),filter=AC.createBiquadFilter();
  src.buffer=buffer;src.playbackRate.value=name==='thunder'?1:.97+Math.random()*.06;
  const distance=x===undefined?0:Math.min(1,dst(P.x,P.y,x,y)/950);
  filter.type='lowpass';filter.frequency.value=16000-13500*distance;
  gain.gain.value=entry[0]*volume;
  src.connect(filter);filter.connect(gain);
  const stereo=AC.createStereoPanner?.();
  if(stereo){stereo.pan.value=x===undefined?0:clamp((x-P.x)/480,-.9,.9);gain.connect(stereo);stereo.connect(master);}
  else gain.connect(master);
  fieldVoices.add(src);src.onended=()=>{fieldVoices.delete(src);src.disconnect();filter.disconnect();gain.disconnect();stereo?.disconnect();};
  src.start(AC.currentTime+(name==='shell' ? .21 : 0));
  return true;
}
function roomAcoustics(){
  if(inBunker(P.x,P.y))return {enclosure:1,metal:0,underground:true};
  const loft=loftAt(P);if(loft)return {enclosure:1,metal:loft.id==='depot'?1:.55};
  for(const h of HOUSES){
    if(h.ruin)continue;
    const depth=Math.min(P.x-h.x*T,(h.x+h.w)*T-P.x,P.y-h.y*T,(h.y+h.h)*T-P.y);
    if(depth< -10)continue;
    return {enclosure:clamp((depth+10)/48,0,1),metal:['conc','depot','tin','rust'].includes(h.mat)?1:.5};
  }
  return {enclosure:0,metal:0};
}
function mixRecordedRain(){
  if(!AC)return;
  const room=roomAcoustics(),now=AC.currentTime;
  let nearest=290;
  for(const f of WORLD_FIRES)nearest=Math.min(nearest,dst(f.x,f.y,P.x,P.y));
  const fireVolume=room.underground?0:.32*(1-nearest/290)**2*(1-.8*room.enclosure);
  if(!hearthGain && fireVolume>0 && fieldBuffers.has('hearth')){
    const fire=AC.createBufferSource();fire.buffer=fieldBuffers.get('hearth');fire.loop=true;
    hearthGain=AC.createGain();hearthGain.gain.value=0;fire.connect(hearthGain);hearthGain.connect(master);fire.start();
  }
  hearthGain?.gain.setTargetAtTime(fireVolume,now,.22);
  windGain?.gain.setTargetAtTime(.048*(1-room.enclosure*.89),now,.27);
  const buffer=fieldBuffers.get('rain');if(!buffer)return;
  if(!rainG){
    const src=AC.createBufferSource();src.buffer=buffer;src.loop=true;
    rainFilter=AC.createBiquadFilter();rainFilter.type='lowpass';
    rainG=AC.createGain();rainG.gain.value=0;
    src.connect(rainFilter);rainFilter.connect(rainG);rainG.connect(master);
    const sheet=AC.createBiquadFilter();sheet.type='bandpass';sheet.frequency.value=2140;sheet.Q.value=1.65;
    rainRoof=AC.createGain();rainRoof.gain.value=0;
    src.connect(sheet);sheet.connect(rainRoof);rainRoof.connect(master);src.start();
  }
  const wet=WX.rain*(room.underground?0:1);
  rainFilter.frequency.setTargetAtTime(14400-12600*room.enclosure,now,.18);
  rainG.gain.setTargetAtTime(wet*(.56-.26*room.enclosure),now,.18);
  rainRoof.gain.setTargetAtTime(wet*room.enclosure*room.metal*.78,now,.18);
}
