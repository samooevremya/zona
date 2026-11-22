/* Сенсорная раскладка принадлежит устройству, отдельно от сохранения кампании. */
const CONTROL_NAMES = {
  joy:'Джойстик', 'b-fire':'Огонь', 'b-run':'Бег', 'b-rel':'Перезарядка',
  'b-med':'Аптечка', 'b-bolt':'Болт', 'b-crouch':'Присесть', 'b-jump':'Прыжок', det:'Фонарь'
};
const CONTROL_KEY = 'zona-touch-layout-v1';
const FIRE_KEY='zona-touch-fire-v1';
const firePrefs={mode:'stick',strength:45};
function showFireSettings(nav,back) {
  const mode=el('select'), slider=el('input'), value=el('output');
  const modeLabel=el('label','fire-setting','Способ стрельбы'), assistLabel=el('label','fire-setting','Автоприцел');
  const hint=el('p','fire-hint');
  for (const [id,name] of [['stick','Отклонение стика'],['tap','Касание врага']]) {
    const option=el('option','',name); option.value=id; mode.appendChild(option);
  }
  mode.value=firePrefs.mode;
  slider.type='range';slider.min=0;slider.max=100;slider.step=5;slider.value=firePrefs.strength;
  function describe() {
    value.textContent=slider.value+'%';
    hint.textContent=mode.value==='stick'
      ? 'Слегка отклони правый стик, чтобы прицелиться. Доведи его до края, чтобы открыть огонь.'
      : 'Коснись видимого врага для одного выстрела. Правым стиком можно прицелиться. Нож и граната действуют у края стика.';
  }
  function storePrefs() {
    firePrefs.mode=mode.value; firePrefs.strength=Number(slider.value);
    try { localStorage.setItem(FIRE_KEY,JSON.stringify(firePrefs)); } catch (_) {}
    describe();
  }
  mode.onchange=storePrefs; slider.oninput=storePrefs;describe();
  modeLabel.append(mode);assistLabel.append(value,slider);
  nav.replaceChildren(modeLabel,hint,assistLabel,btn('','Назад',back));
  mode.focus();
}
const controlEditor = document.getElementById('control-editor');
let layouts = {landscape:{},portrait:{}}, draftLayout = null, priorTouch = false;
let selectedControl = 'joy', padDrag = null;
const layoutMode = () => innerWidth >= innerHeight ? 'landscape' : 'portrait';

function readControls() {
  try {
    const f=JSON.parse(localStorage.getItem(FIRE_KEY));
    if (f?.mode==='tap' || f?.mode==='stick') firePrefs.mode=f.mode;
    if (Number.isFinite(f?.strength)) firePrefs.strength=clamp(f.strength,0,100);
  } catch (_) {}
  try {
    const data = JSON.parse(localStorage.getItem(CONTROL_KEY));
    for (const mode of Object.keys(layouts)) for (const id of Object.keys(CONTROL_NAMES)) {
      const p=data?.[mode]?.[id];
      if (p && [p.x,p.y,p.size].every(Number.isFinite)) {
        layouts[mode][id]={x:clamp(p.x,0,1),y:clamp(p.y,0,1),size:clamp(p.size,44,164)};
      }
    }
  } catch (_) { /* Storage may be unavailable or contain an older layout. */ }
}
function placeControls() {
  const profile=(draftLayout || layouts)[layoutMode()];
  const zoom=HUDZ || 1;
  const edges=getComputedStyle($('layout-insets'));
  const left=parseFloat(edges.paddingLeft)||0, right=parseFloat(edges.paddingRight)||0;
  const top=parseFloat(edges.paddingTop)||0, bottom=parseFloat(edges.paddingBottom)||0;
  for (const id of Object.keys(CONTROL_NAMES)) {
    const node=$(id), p=profile[id];
    if (!p) { delete node.dataset.layout; continue; }
    const x=clamp(p.x*innerWidth-p.size/2,left,innerWidth-right-p.size);
    const y=clamp(p.y*innerHeight-p.size/2,top,innerHeight-bottom-p.size);
    node.style.setProperty('--pad-x',x/zoom+'px');
    node.style.setProperty('--pad-y',y/zoom+'px');
    node.style.setProperty('--pad-size',p.size/zoom+'px');
    node.dataset.layout='custom';
  }
  positionMedicinePicker();
}
function positionMedicinePicker() {
  const picker=$('medpick'), med=$('b-med');
  if (!med.dataset.layout) { delete picker.dataset.anchor; return; }
  if (picker.hidden || controlEditor.open) return;
  const r=med.getBoundingClientRect(), box=picker.getBoundingClientRect();
  const left=clamp(r.x+(r.width-box.width)/2,4,innerWidth-box.width-4);
  const top=r.top>box.height+8 ? r.top-box.height-6 : clamp(r.bottom+6,4,innerHeight-box.height-4);
  picker.dataset.anchor='custom';
  picker.style.setProperty('--pick-x',left/(HUDZ||1)+'px');
  picker.style.setProperty('--pick-y',top/(HUDZ||1)+'px');
}
function updateLayoutPreview() {
  if (!controlEditor.open) return;
  const view=$('layout-view'), bounds=view.getBoundingClientRect(), world=$('field-world');
  const scale=Math.min(bounds.width/innerWidth,bounds.height/innerHeight);
  const x=(bounds.width-innerWidth*scale)/2, y=(bounds.height-innerHeight*scale)/2;
  world.style.transform='translate('+(bounds.x+x)+'px,'+(bounds.y+y)+'px) scale('+scale+')';
  for (const hit of view.children) {
    const rect=$(hit.dataset.id).getBoundingClientRect();
    hit.style.left=(rect.x-bounds.x)+'px'; hit.style.top=(rect.y-bounds.y)+'px';
    hit.style.width=rect.width+'px'; hit.style.height=rect.height+'px';
    const chosen=hit.dataset.id===selectedControl;
    hit.setAttribute('aria-pressed',String(chosen));
    if (chosen) {
      const size=Math.round(rect.width/scale);
      $('layout-size').value=String(size);
      $('layout-size-value').value=size+' px';
    }
  }
  $('layout-choice').value=selectedControl;
}
function layoutPosition(id) {
  const world=$('field-world').getBoundingClientRect(), r=$(id).getBoundingClientRect();
  return {x:(r.x+r.width/2-world.x)/world.width,y:(r.y+r.height/2-world.y)/world.height,
    size:clamp(Math.round(r.width/world.width*innerWidth),44,164)};
}
function changePad(position) {
  draftLayout[layoutMode()][selectedControl]=position;
  placeControls(); updateLayoutPreview();
}
function openControlEditor() {
  if (controlEditor.open) return;
  draftLayout=JSON.parse(JSON.stringify(layouts));
  priorTouch=IN.touch; resetInput(); hideMedPick(); setTouch(true);
  document.body.classList.add('layout-edit');
  controlEditor.showModal(); selectedControl='joy';
  $('layout-hint').textContent='Перетащи кнопку на экране';
  placeControls(); updateLayoutPreview();
}
function closeControlEditor(saveLayout) {
  if (saveLayout) {
    try { localStorage.setItem(CONTROL_KEY,JSON.stringify(draftLayout)); }
    catch (_) { $('layout-hint').textContent='Браузер не разрешил сохранить раскладку'; return; }
    layouts=draftLayout;
  }
  padDrag=null; draftLayout=null; controlEditor.close();
  document.body.classList.remove('layout-edit'); $('field-world').style.transform='';
  resetInput(); setTouch(priorTouch); placeControls();
}
function setupControlEditor() {
  const view=$('layout-view');
  readControls(); placeControls();
  for (const [id,name] of Object.entries(CONTROL_NAMES)) {
    $('layout-choice').add(new Option(name,id));
    const hit=el('button','layout-hit');
    hit.type='button';hit.dataset.id=id;hit.setAttribute('aria-label',name);
    hit.addEventListener('click',()=>{selectedControl=id;updateLayoutPreview();});
    hit.addEventListener('pointerdown',e=>{
      if (padDrag || e.button!==0) return;
      e.preventDefault(); selectedControl=id; updateLayoutPreview();
      const p=layoutPosition(id);
      padDrag={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,position:p,mode:layoutMode()};
      hit.setPointerCapture(e.pointerId);
    });
    hit.addEventListener('pointermove',e=>{
      if (padDrag?.pointer!==e.pointerId || padDrag.mode!==layoutMode()) return;
      const world=$('field-world').getBoundingClientRect(), p=padDrag.position;
      changePad({x:clamp(p.x+(e.clientX-padDrag.startX)/world.width,0,1),
        y:clamp(p.y+(e.clientY-padDrag.startY)/world.height,0,1),size:p.size});
    });
    hit.addEventListener('lostpointercapture',e=>{if(padDrag?.pointer===e.pointerId) padDrag=null;});
    hit.addEventListener('keydown',e=>{
      const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      const delta=moves[e.key]; if (!delta) return;
      e.preventDefault();selectedControl=id;
      const p=layoutPosition(id), step=e.shiftKey?12:3;
      changePad({...p,x:clamp(p.x+delta[0]*step/innerWidth,0,1),y:clamp(p.y+delta[1]*step/innerHeight,0,1)});
    });
    view.appendChild(hit);
  }
  $('layout-choice').onchange=e=>{selectedControl=e.target.value;updateLayoutPreview();};
  $('layout-size').oninput=e=>changePad({...layoutPosition(selectedControl),size:Number(e.target.value)});
  $('layout-default').onclick=()=>{draftLayout[layoutMode()]={};placeControls();updateLayoutPreview();};
  $('layout-save').onclick=()=>closeControlEditor(true);
  $('layout-cancel').onclick=()=>closeControlEditor(false);
  controlEditor.oncancel=e=>{e.preventDefault();closeControlEditor(false);};
  addEventListener('resize',()=>{padDrag=null;placeControls();updateLayoutPreview();});
  new ResizeObserver(updateLayoutPreview).observe(view);
}
