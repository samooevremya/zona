"""Compare local builds on the same moving camera route with a throttled touch profile.
Usage: python3 qa/android_perf.py before.html after.html
Set CHROME_BIN to use an installed Chromium instead of Playwright's bundled browser.
"""
import argparse
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

SCENES = {"village": (299, 290), "depot": (281, 40)}
ROUTE = """async ([x, y]) => {
  const z = window.__z;
  z.S.flags.intro = 1;
  z.S.min = 580;
  const start = x * 32;
  Object.assign(z.P, {x: start, y: y * 32});
  Object.assign(z.cam, {x: start, y: y * 32});
  await new Promise(r => requestAnimationFrame(r));
  const times = [];
  let last, first;
  await new Promise(end => {
    function sample(t) {
      if (first === undefined) first = t;
      else times.push(t - last);
      last = t;
      const elapsed = t - first;
      z.P.x = start + 480 * Math.min(1, elapsed / 6000);
      z.P.y = y * 32;
      if (elapsed < 6000) requestAnimationFrame(sample);
      else end();
    }
    requestAnimationFrame(sample);
  });
  times.sort((a,b) => a-b);
  return {fps: Math.round(1000*times.length/(last-first)),
          p95_ms: Math.round(times[Math.ceil(times.length*.95)-1]),
          canvas: [cv.width,cv.height]};
}"""


def measure(browser, build):
    context = browser.new_context(viewport={"width": 844, "height": 390},
                                  device_scale_factor=3, is_mobile=True, has_touch=True)
    try:
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.route("https://fonts.**/*", lambda route: route.abort())
        cdp = context.new_cdp_session(page)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        start = time.monotonic()
        page.goto(build.resolve().as_uri() + "#qa-seed=7", wait_until="domcontentloaded")
        button = page.get_by_role("button", name="Новая игра")
        button.wait_for(timeout=120000)
        result = {"menu_seconds": round(time.monotonic()-start, 2)}
        button.tap()
        for name, xy in SCENES.items():
            result[name] = page.evaluate(ROUTE, xy)
        if errors:
            raise RuntimeError(errors)
        return result
    finally:
        context.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("builds", nargs="+", type=Path)
    args = parser.parse_args()
    with sync_playwright() as playwright:
        for build in args.builds:
            browser = playwright.chromium.launch(executable_path=os.getenv("CHROME_BIN"),
                                                 args=["--disable-gpu", "--single-process"])
            try:
                print(build, json.dumps(measure(browser, build)), flush=True)
            finally:
                browser.close()
