"""Run from any directory after building the big map. Requires Playwright Chromium."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

folder = Path(__file__).resolve().parent
url = "http://zona.test/index.html"
script = (folder / "check.js").read_text() + (folder.parent / "camp-interactions" / "check.js").read_text()
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH") or None, args=["--single-process", "--disable-gpu"])
    page = browser.new_page(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("https://fonts.**/*", lambda route: route.abort())
    build = (folder.parents[2] / "index.html").read_text()
    page.route(url, lambda route: route.fulfill(content_type="text/html",
        body=build.replace("window.__zRender = render;", script + ";window.__zRender = render;")))
    page.goto(url + "#qa-seed=7")
    page.get_by_role("button", name="Новая игра").tap()
    page.get_by_role("button", name="Пропустить").tap()
    print(page.evaluate("inhabitedWorldCheck()"))
    print(page.evaluate("campChecks()"))
    assert not errors, errors
    browser.close()
