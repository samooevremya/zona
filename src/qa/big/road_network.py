"""Walk the built world's road centrelines, then verify their connection to the northern post."""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


REGISTER = """
  if (!sidings.includes(pts)) {
    const dx = map===BIGW.map ? WEST : 0, dy = map===BIGW.map ? NORTH_ROWS : 0;
    (window.testRoads ??= []).push(pts.map(([x,y])=>[x+dx+.5,y+dy+.5]));
  }
"""
CHECK = """
window.testRoadNetwork = () => {
  const road = (x,y)=>[DI,AS,FL,CF].includes(tAt(Math.floor(x),Math.floor(y)));
  // The toll gate is intentionally closed before payment.
  S.flags.bridgePaid = true;
  if (bridgeBarrier) bridgeBarrier.solid = 0;
  const highway = [];
  for(let y=NORTH_ROWS; y<MH-2; y++) highway.push([roadX[y]+.5,y+.5]);
  const routes = [...testRoads, highway], failures = [];
  let samples = 0;
  function walk(points, route) {
    const e = {x:points[0][0]*T,y:points[0][1]*T,r:P.r};
    for(let i=1; i<points.length; i++) {
      const [x,y] = points[i-1], [xx,yy] = points[i];
      const steps = Math.max(1,Math.ceil(Math.hypot(xx-x,yy-y)*8));
      const dx=(xx-x)/steps, dy=(yy-y)/steps;
      for(let step=1; step<=steps; step++) {
        const tx=x+step*dx, ty=y+step*dy;
        moveE(e,dx*T,dy*T);
        samples++;
        if (!road(tx,ty) || Math.hypot(e.x/T-tx,e.y/T-ty)>.02) {
          failures.push({route,x:tx,y:ty,surface:tAt(Math.floor(tx),Math.floor(ty)),displacement:Math.hypot(e.x/T-tx,e.y/T-ty)});
          return;
        }
      }
    }
  }
  for(const [i,line] of routes.entries()) {
    walk(line,i);
    walk([...line].reverse(),i);
  }
  // Flood from the Cordon/Garbage seam using only contiguous road or paved
  // interior tiles. A gap surrounded by traversable grass must still fail.
  const queue=[NORTH_ROWS*MW+roadX[NORTH_ROWS]], reached=new Uint8Array(MW*MH);
  reached[queue[0]]=1;
  for(let i=0; i<queue.length; i++) for(const d of [-1,1,-MW,MW]){
    const next=queue[i]+d;
    if(next>=0 && next<reached.length && !reached[next] && [DI,AS,FL,CF].includes(map[next])){
      reached[next]=1; queue.push(next);
    }
  }
  for(const [i,line] of routes.entries()) for(const [x,y] of line) {
    if(!reached[Math.floor(y)*MW+Math.floor(x)]){
      failures.push({route:i,x,y,disconnected:true});break;
    }
  }
  return {routes:routes.length, directions:routes.length*2, samples, failures};
};
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html", type=Path)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    html = args.html.read_text()
    marker = "function bigPath(pts, rad, tile) {"
    assert html.count(marker) == 1
    prefix, suffix = html.replace(marker, marker + REGISTER).rsplit("boot();", 1)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=os.environ.get("BROWSER_EXECUTABLE"),
            args=["--single-process", "--disable-gpu"])
        page = browser.new_page(viewport={"width": 960, "height": 500}, has_touch=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.route("https://fonts.**/*", lambda route: route.abort())
        page.route("**/roads.html", lambda route: route.fulfill(
            content_type="text/html", body=prefix + CHECK + "boot();" + suffix))
        page.goto(f"https://zona.test/roads.html#qa-seed={args.seed}")
        page.get_by_role("button", name="Новая игра").tap()
        page.get_by_role("button", name="Пропустить").tap()
        result = page.evaluate("testRoadNetwork()")
        print(json.dumps(result, ensure_ascii=False))
        assert result["routes"] > 60 and not result["failures"] and not errors, errors


if __name__ == "__main__":
    main()
