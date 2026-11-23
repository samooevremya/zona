// The original key remains the rolling autosave. Manual snapshots have independent keys.
const MANUAL_SLOTS=[1,2,3];
function slotKey(slot){return slot?KEY+'-slot-'+slot:KEY;}
function slotPicker(nav,writing,back){
  nav.replaceChildren();
  const status=el('p','pause-note',writing?'Выберите слот для записи':'Выберите сохранение');
  status.setAttribute('role','status');nav.appendChild(status);
  function write(slot){
    if(ents.some(e=>e.alive && e!==P && hostile(e,P) && dE(e,P)<450)){status.textContent='Рядом враги, сохраниться нельзя.';return;}
    if(save(false,slot)){back();msg('Игра сохранена в слот '+slot+'.','good');}else status.textContent='Не удалось записать сохранение.';
  }
  for(const slot of writing?MANUAL_SLOTS:[0,...MANUAL_SLOTS]){
    const d=loadSave(slot),label=slot?'Слот '+slot:'Автосохранение';
    const chapterName=d?.campaign?CHAPTERS[Math.min(8,STORY[d.campaign.stage]?.[0]??0)]:'Кордон';
    const place=d && (inBunker(d.x,d.y)?'Бункер':locAt(d.x/T,d.y/T)?.name);
    const text=d?label+' · '+clockStr(d.min)+(place?' · '+place:'')+' · '+chapterName+' · '+DIFFICULTIES[difficultyKey(d.difficulty)].name:label+' · пусто';
    nav.appendChild(btn('',text,()=>{
      if(!writing){if(panel)closePanel();applyState(d);if(title.open)hideTitle();return;}
      if(!d){write(slot);return;}
      nav.replaceChildren(status);status.textContent='Заменить сохранение «'+text+'»?';
      nav.append(btn('','Заменить',()=>write(slot)),btn('','Отмена',()=>slotPicker(nav,true,back)));
    },!writing && !d));
  }
  nav.appendChild(btn('','Назад',back));
}
