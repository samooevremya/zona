/* Same resolver for dialogue, trade, inventory and PDA. No random selection. */
(function(g){
const named={Меченый:'marked',Волк:'wolf',Сидорович:'sid',Петруха:'petr',Хомяк:'petr2',Шустрый:'shust',Толик:'tolik',Лис:'fox',Сиплый:'boss',Прапорщик:'a3'};
const ids=new Set(Object.values(named));const pools={loner:['loner_01','loner_02','loner_03'],bandit:['bandit_01','bandit_02'],army:['army_01'],trader:['loner_03']};
function portraitKey(e={},isPlayer=false){if(isPlayer)return'marked';if(ids.has(e.sid))return e.sid;if(named[e.name])return named[e.name];const pool=pools[e.fac]||pools.loner;const stable=String(e.sid??e.id??e.name??'unknown');let h=2166136261;for(const c of stable){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return pool[h%pool.length];}
function portraitElement(e,isPlayer=false,pack=g.CORDON_G31){const key=portraitKey(e,isPlayer),a=pack?.manifest.portraits[key];if(!a)return null;const im=document.createElement('img');im.className='g3-portrait';im.width=64;im.height=64;im.alt=e?.name||'Сталкер';im.src=pack.images[a.file]||a.file;return im;}
g.CordonPortraits={portraitKey,portraitElement};if(typeof module!=='undefined')module.exports=g.CordonPortraits;
})(globalThis);
