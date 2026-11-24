// Adapt the original HUD editor to the winter game's input and element IDs.
const editWinterControls = (() => {
  const ids=__CONTROL_IDS__, $=id=>document.getElementById(ids[id]||id);
  const el=(tag,cls)=>Object.assign(document.createElement(tag),{className:cls||''});
  const HUDZ=1, IN={get touch(){return document.body.classList.contains('is-touch');}};
  const setTouch=on=>document.body.classList.toggle('is-touch',on);
  const hideMedPick=()=>{$('medpick').hidden=true;};
  const resetInput=()=>{keys.clear();releaseStick();touchRun=false;aim.active=aim.fire=false;};
  /* ORIGINAL_EDITOR */
  setupControlEditor();
  return openControlEditor;
})();
