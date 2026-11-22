"""Compare the actual outdoor material pixels on both sides of every 512px cache seam."""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

HOOK = """
window.testTerrainType=(x,y)=>surfaceTiles()[y*MW+x];
window.testTerrainScale=GS;
window.testSurfaceIds=[DI,AS,SW];
window.testTerrainWindow=(x,y,w,h,materials=true)=>{
  const oldWindow=GW, oldPixels=GWP, c=document.createElement('canvas');
  c.width=w*GS; c.height=h*GS;
  const g=c.getContext('2d',{willReadFrequently:true});
  try {
    GW={x0:Math.max(0,Math.floor(x/T)-2),y0:Math.max(0,Math.floor(y/T)-2),
        x1:Math.min(MW-1,Math.ceil((x+w)/T)+2),y1:Math.min(MH-1,Math.ceil((y+h)/T)+2)};
    GWP={x0:x,y0:y,x1:x+w,y1:y+h};
    g.scale(GS,GS); g.translate(-x,-y);
    const it=materials?paintGroundMaterials(g):paintSurfaceLayers(g,surfaceTiles(),BIG && C1);
    while(!it.next().done){}
    return g;
  }finally{GW=oldWindow;GWP=oldPixels;}
};"""
CHECK_ROW = """
row=>{
  const scale=testTerrainScale, size=512, rim=4, W=__zBig.PW()*32, H=__zBig.MH()*32;
  let pixels=0, largeDifferences=0, examples=[], meadow=0, cores=0, wrongCover=0;
  for(let x=0;x<W;x+=size){
    const y=row*size,w=Math.min(size,W-x),h=Math.min(size,H-y);
    const full=testTerrainWindow(x,y,w,h);
    const overlay=testTerrainWindow(x,y,w,h,false).getImageData(0,0,w*scale,h*scale).data;
    for(let py=16;py<h;py+=32)for(let px=16;px<w;px+=32){
      const tx=(x+px)>>5,ty=(y+py)>>5, type=testTerrainType(tx,ty);
      if(tx<2 || ty<2 || tx>=W/32-2 || ty>=H/32-2)continue;
      let outside=true,inside=testSurfaceIds.includes(type);
      for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
        const other=testTerrainType(tx+i,ty+j);
        if(testSurfaceIds.includes(other))outside=false;
        if(other!==type)inside=false;
      }
      const a=overlay[(py*w*scale+px)*scale*4+3];
      if(outside){meadow++;if(a)wrongCover++;}
      if(inside){cores++;if(a<225)wrongCover++;}
    }
    function edge(dx,dy,bw,bh,rx,ry,rw,rh){
      const ref=testTerrainWindow(rx,ry,rw,rh);
      const a=full.getImageData(dx*scale,dy*scale,bw*scale,bh*scale).data;
      const b=ref.getImageData((x+dx-rx)*scale,(y+dy-ry)*scale,bw*scale,bh*scale).data;
      for(let i=0;i<a.length;i+=4){
        pixels++;
        if(Math.max(...[0,1,2,3].map(k=>Math.abs(a[i+k]-b[i+k])))>8){
          largeDifferences++;
          if(examples.length<3)examples.push([x+dx+((i/4)%(bw*scale))/scale,y+dy+Math.floor((i/4)/(bw*scale))/scale]);
        }
      }
    }
    if(x>0)edge(0,0,rim,h,x-rim,y,2*rim,h);
    if(x+w<W)edge(w-rim,0,rim,h,x+w-rim,y,2*rim,h);
    if(y>0)edge(0,0,w,rim,x,y-rim,w,2*rim);
    if(y+h<H)edge(0,h-rim,w,rim,x,y+h-rim,w,2*rim);
  }
  return {pixels,largeDifferences,examples,meadow,cores,wrongCover};
}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html", type=Path)
    parser.add_argument("--engine", choices=["chromium", "webkit"], default="chromium")
    parser.add_argument("--desktop", action="store_true")
    args = parser.parse_args()
    html = args.html.read_text()
    prefix, suffix = html.rsplit("boot();", 1)
    with sync_playwright() as pw:
        options = {}
        if os.environ.get("BROWSER_EXECUTABLE"):
            options["executable_path"] = os.environ["BROWSER_EXECUTABLE"]
        if args.engine == "chromium":
            options["args"] = ["--single-process", "--disable-gpu"]
        browser = getattr(pw, args.engine).launch(**options)
        page = browser.new_page(viewport={"width": 844, "height": 390},
                                has_touch=not args.desktop, is_mobile=not args.desktop)
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.route("https://fonts.**/*", lambda route: route.abort())
        page.route("**/terrain-test.html", lambda route: route.fulfill(
            content_type="text/html", body=prefix + HOOK + "boot();" + suffix))
        page.goto("https://zona.test/terrain-test.html#qa")
        page.get_by_role("button", name="Новая игра").wait_for()
        assert page.evaluate("__z.art"), "Raster materials must be loaded"
        # Under the fallen log on the reported screenshot the surface overlay must be clear.
        grass = page.evaluate("""()=>{const g=testTerrainWindow(356*32,271*32,64,64,false);
            return g.getImageData(0,0,64*testTerrainScale,64*testTerrainScale).data.every((v,i)=>i%4!==3 || v===0);}""")
        assert grass, "A road layer leaked into the meadow near Tolik"
        rows = page.evaluate("Math.ceil(__zBig.MH()*32/512)")
        results = [page.evaluate(CHECK_ROW, row) for row in range(rows)]
        issues = [r for r in results if r["largeDifferences"] or r["wrongCover"]]
        print(json.dumps({"pixels": sum(r["pixels"] for r in results),
                          "clearCellCentres":sum(r["meadow"] for r in results),
                          "coveredCellCentres":sum(r["cores"] for r in results),
                          "rowsWithDifferences": issues, "errors": errors}), flush=True)
        assert not issues and not errors
        browser.close()


if __name__ == "__main__":
    main()
