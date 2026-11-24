/* The seam is mixed in sample space, so ambience never restarts on a timer. */
'use strict';
(() => {
  function loopBuffer(ctx,input,overlapSeconds) {
    const overlap=Math.min(Math.floor(input.length/4),Math.round(input.sampleRate*overlapSeconds));
    const length=input.length-overlap;
    const output=ctx.createBuffer(input.numberOfChannels,length,input.sampleRate);
    for(let ch=0;ch<input.numberOfChannels;ch++){
      const raw=input.getChannelData(ch),out=output.getChannelData(ch);
      out.set(raw.subarray(overlap));
      for(let i=0;i<overlap;i++){
        const angle=i/(overlap-1)*Math.PI/2;
        out[length-overlap+i]=raw[length+i]*Math.cos(angle)+raw[i]*Math.sin(angle);
      }
    }
    return output;
  }
  function createFieldSound(){
    let ctx,master,windFilter,loading,active=false,clips={},wind,fire;
    let nextTruck=0,nextStation=0,foot=0;
    const range=(lo,hi)=>lo+(hi-lo)*Math.random();
    const audible=(distance,radius)=>Math.max(0,1-distance/radius)**1.5;
    function smooth(param,value,seconds=.18){param.setTargetAtTime(value,ctx.currentTime,seconds);}
    function channel(destination){
      const volume=ctx.createGain();volume.gain.value=0;
      const pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
      if(pan){volume.connect(pan);pan.connect(destination);}else volume.connect(destination);
      return {volume,pan};
    }
    function bed(input,crossfade,destination,rate){
      const mix=channel(destination),source=ctx.createBufferSource();
      source.buffer=loopBuffer(ctx,input,crossfade);source.loop=true;source.playbackRate.value=rate;
      source.connect(mix.volume);source.start(0,range(0,source.buffer.duration));
      return mix;
    }
    async function fetchClip(name){
      const formats=new Audio().canPlayType('audio/ogg; codecs="vorbis"')?['ogg','m4a']:['m4a','ogg'];
      for(const ext of formats){
        try{
          const res=await fetch('audio/'+name+'.'+ext);
          if(res.ok)return await ctx.decodeAudioData(await res.arrayBuffer());
        }catch{/* Try the alternate encoding if this decoder rejects the recording. */}
      }
      throw Error('Missing recording: '+name);
    }
    async function prepare(){
      const names=['wind','fire','snow1','snow2','wood1','ice1'];
      const buffers=await Promise.all(names.map(fetchClip));
      clips=Object.fromEntries(names.map((name,i)=>[name,buffers[i]]));
      wind=bed(clips.wind,2.5,windFilter,.987);fire=bed(clips.fire,.85,master,1.012);
    }
    async function enable(){
      try{
        active=true;
        if(!ctx){
          ctx=new (window.AudioContext||window.webkitAudioContext)();
          master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
          windFilter=ctx.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=4600;windFilter.connect(master);
        }
        const resumed=ctx.resume();
        if(!loading)loading=prepare().catch(e=>{loading=null;throw e;});
        await Promise.all([resumed,loading]);
        if(active)smooth(master.gain,.78,.1);
        return true;
      }catch{return false;}
    }
    function mute(){active=false;if(ctx)smooth(master.gain,0,.025);}
    function metal(frequency,decay,level,pan){
      const t=ctx.currentTime,mix=channel(master);
      if(mix.pan)mix.pan.pan.value=pan;
      mix.volume.gain.setValueAtTime(0,t);
      mix.volume.gain.linearRampToValueAtTime(level,t+.007);
      mix.volume.gain.exponentialRampToValueAtTime(.00001,t+decay);
      const osc=ctx.createOscillator();osc.type='triangle';osc.frequency.value=frequency;
      osc.connect(mix.volume);osc.start(t);osc.stop(t+decay+.02);
      osc.onended=()=>{osc.disconnect();mix.volume.disconnect();mix.pan?.disconnect();};
    }
    function tick(state){
      if(!active||!wind||!fire)return;
      const t=ctx.currentTime,windSpeed=state.wind,cover=state.shelter;
      const gust=.92+.05*Math.sin(t*.37)+.03*Math.sin(t*.89);
      smooth(wind.volume.gain,(state.indoor?.085:(.28+.54*windSpeed)*(1-.56*cover))*gust,.35);
      smooth(windFilter.frequency,state.indoor?580:2200+3900*windSpeed-850*cover,.4);
      smooth(fire.volume.gain,audible(state.fireDistance,13)*.9,.20);
      if(fire.pan)smooth(fire.pan.pan,state.firePan||0);
      const truck=audible(state.truckDistance,17),station=audible(state.stationDistance,24);
      if(!state.indoor&&truck>0&&t>=nextTruck){
        nextTruck=t+range(4.5,9.5);
        metal(range(274,304),.32,(.024+.03*windSpeed)*truck,state.truckPan||0);
      }
      if(station>0&&t>=nextStation){
        nextStation=t+range(8,15);
        metal(584,1.1,.027*station,state.stationPan||0);
        metal(866,.80,.008*station,state.stationPan||0);
      }
    }
    function step(surface,speed){
      if(!active||!wind||ctx.state!=='running')return;
      const t=ctx.currentTime,wet=surface==='marsh';
      const snow=foot++%2?'snow1':'snow2';
      const clip=clips[surface==='wood'?'wood1':surface==='ice'?'ice1':snow];
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=clip;source.playbackRate.value=range(.91,1.10)*(wet?.77:1);
      filter.type='lowpass';filter.frequency.value=wet?830:7800;
      gain.gain.value=(.42+Math.min(speed,3.5)*.08)*range(.80,1);
      source.connect(filter);filter.connect(gain);gain.connect(master);source.start(t);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }
    return {enable,mute,tick,step};
  }
  window.createFieldSound=createFieldSound;
})();
