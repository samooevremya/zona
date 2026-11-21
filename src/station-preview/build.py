"""Build the isolated station playtest from the self-contained release at the root."""
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[1]
# Keep the approved single-station comparison reproducible after the campaign renderer changes.
import subprocess
page = subprocess.check_output(
    ["git", "show", "38bc09cbffd26b6cffc57979ff65e19dc687340f:index.html"], cwd=ROOT
).decode()


def replace(old, new):
    global page
    if page.count(old) != 1:
        raise ValueError(f"Expected exactly one preview integration point: {old[:100]}")
    page = page.replace(old, new)


replace("<title>Зона: Кордон 2D</title>", "<title>Свалка · Сортировочная станция</title>")
replace('class="start-region">КОРДОН', 'class="start-region">СОРТИРОВОЧНАЯ')
replace("'Новая игра',()=>{", "'Войти на станцию',()=>{")
replace("x: locPt('sid', 'spawn').x, y: locPt('sid', 'spawn').y", "x: 226.5*T, y: 61.5*T")
replace("news: [], flags: {}, dead: {}, min: 420", "news: [], flags: {intro:1,visitedDump:1}, dead: {}, min: 625")
replace("Ты очнулся в бункере у торговца. Подойди к прилавку и поговори с Сидоровичем.",
        "Здесь весовая. Иди по колее на запад — увидишь пакгауз и вагоны.")
replace("'zona2d-kordon-qa' : 'zona2d-kordon-v2'", "'zona-station-qa' : 'zona-station-preview-v1'")
replace("'zona-touch-layout-v1'", "'zona-station-touch-layout-v1'")
replace("'zona-broken-save'", "'zona-station-broken-save'")

anchor = "function drawHouseRoof(g, h, i, scale) {"
replace(anchor, (SOURCE / "renderer.js").read_text() + "\n" + anchor)
replace("ctx.globalAlpha = h.a; drawHouseRoof(ctx, h, i, 1); ctx.globalAlpha = 1;", """
    ctx.globalAlpha=h.a;
    if(C1 && ART && stationContains(h.x*T,h.y*T)) drawStationHouse(h,i);
    else drawHouseRoof(ctx,h,i,1);
    ctx.globalAlpha=1;""")
replace("else drawGround(vx, vy, vw, vh);", """else {
    drawGround(vx,vy,vw,vh);
    if(ART && C1 && vx<246*T && vx+vw>155*T && vy<80*T && vy+vh>36*T) drawStationFixtures();
  }""")
replace("    if (pick[v] === 'c1_yard_tree')",
        "    if(C1) cacheStationCrown(c,g.getTransform(),pick[v],v,w);\n    if (pick[v] === 'c1_yard_tree')")
replace("drawAutumnCrown(crown, cx + sw, cy, width, height);",
        "(stationContains(cx,cy)?leaves:drawAutumnCrown)(crown,cx+sw,cy,width,height);")

# The baked wheels and shadow are registered to the rails. Draw the body once at render time.
replace("g.save();spriteShadow(g,3,2);g.drawImage(lesserSprites[o.sprite],o.x,o.y,o.w,o.h);g.restore();return;",
        """g.save();spriteShadow(g,3,2);
    const image=lesserSprites[o.sprite];
    if(C1 && ART && o.sprite==='wagon' && stationContains(o.x,o.y)){
      g.shadowOffsetX+=3000*g.getTransform().a;
      g.drawImage(image,o.x-3000,o.y,o.w,o.h);
      g.shadowColor='transparent';g.shadowOffsetX=0;
      for(const [u,v,w,h] of [[0,.9,1,.1],[0,.32,.049,.32],[.951,.32,.049,.32]])
        g.drawImage(image,u*image.width,v*image.height,w*image.width,h*image.height,
          o.x+u*o.w,o.y+v*o.h,w*o.w,h*o.h);
    }else g.drawImage(image,o.x,o.y,o.w,o.h);
    g.restore();return;""")
output = ROOT / "station-preview" / "index.html"
output.parent.mkdir(exist_ok=True)
output.write_text(page)
