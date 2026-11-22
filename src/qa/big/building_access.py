"""Check both directions between a real outdoor road and every exterior door in the built game."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

from road_network import REGISTER


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html", type=Path)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--stock-crates", action="store_true", help="Occupy every eligible field-crate site near a building")
    parser.add_argument("--interiors", action="store_true", help="Check paths inside each ground floor, loft and bunker")
    parser.add_argument("--npcs", action="store_true", help="Walk the doors and simulate NPC evacuation and return")
    args = parser.parse_args()
    marker = "function bigPath(pts, rad, tile) {"
    html = args.html.read_text()
    assert html.count(marker) == 1, "Cannot register the built world’s road centrelines"
    html = html.replace(marker, marker + REGISTER)
    head, tail = html.rsplit("boot();", 1)
    script = "npc_routes.js" if args.npcs else "interior_access.js" if args.interiors else "building_access.js"
    check = Path(__file__).with_name(script).read_text()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("BROWSER_EXECUTABLE"),
                                     args=["--single-process", "--disable-gpu"])
        page = browser.new_page(viewport={"width": 960, "height": 500}, has_touch=True)
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.route("https://fonts.**/*", lambda route: route.abort())
        page.route("**/access.html", lambda route: route.fulfill(content_type="text/html", body=head+check+"boot();"+tail))
        page.goto(f"https://zona.test/access.html#qa-seed={args.seed}")
        page.get_by_role("button", name="Новая игра").tap()
        page.get_by_role("button", name="Пропустить").tap()
        result = (page.evaluate("checkNPCRoutes()") if args.npcs else page.evaluate("checkInteriors()") if args.interiors else
                  page.evaluate("flag => checkBuildingAccess(flag)", args.stock_crates))
        if args.report:
            args.report.write_text(json.dumps(result), encoding="utf-8")
        result.pop("results", None)
        print(json.dumps(result, ensure_ascii=False))
        assert (result["residents"] if args.npcs else result["entries"] if args.interiors else result["openings"]) and not result["failures"] and not errors, errors


if __name__ == "__main__":
    main()
