"""Run against a built HTML file with Python Playwright and Chromium."""
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

game = Path(sys.argv[1]).resolve().as_uri()
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'),
                                 args=['--disable-gpu','--single-process'])
    page = browser.new_page(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('https://fonts.**/*', lambda route: route.abort())
    page.goto(game+'#qa-seed=7')

    def click(name):
        page.get_by_role('button', name=name, exact=True).click()

    def drag(control, x, y):
        button = page.locator('.layout-hit[data-id="'+control+'"]').bounding_box()
        world = page.locator('#field-world').bounding_box()
        page.mouse.move(button['x']+button['width']/2,button['y']+button['height']/2)
        page.mouse.down()
        page.mouse.move(world['x']+world['width']*x,world['y']+world['height']*y,steps=6)
        page.mouse.up()

    def fixed_hud():
        return page.evaluate("""()=>['#mini','#wpnbox','#t-menu','.zh-bars','#quest'].map(sel=>{
          const r=document.querySelector(sel).getBoundingClientRect();return [r.x,r.y,r.width,r.height];
        })""")

    def set_size(value):
        page.locator('#layout-size').evaluate("(s,v)=>{s.value=v;s.dispatchEvent(new Event('input'))}",value)

    click('Управление')
    assert page.locator('.layout-hit').count()==9
    drag('joy', .69, .50)
    set_size(92)
    drag('b-med', .40, .68)
    click('Сохранить')
    saved = page.evaluate("JSON.parse(localStorage.getItem('zona-touch-layout-v1'))")
    assert saved['landscape']['joy']['size']==92 and not saved['portrait']
    click('Управление')
    click('Сброс')
    click('Отмена')
    assert page.locator('#joy').get_attribute('data-layout')=='custom'
    page.reload()
    click('Новая игра')
    page.evaluate("__z.closePanel();__z.save(true)")
    hud=fixed_hud()
    joy=page.locator('#joy').bounding_box()
    assert abs(joy['width']-92)<1 and abs(joy['x']+46-844*.69)<2
    touch=page.context.new_cdp_session(page)
    def event(kind,points):
        touch.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
    x,y=joy['x']+46, joy['y']+46
    event('touchStart',[{'x':x,'y':y,'id':1}])
    event('touchMove',[{'x':x+28,'y':y,'id':1}])
    assert page.evaluate("__z.IN.moveX > .4 && !!__z.IN.left")
    event('touchEnd',[])
    assert page.evaluate("!__z.IN.left && __z.IN.moveX===0")
    page.locator('#b-med').tap()
    assert page.locator('#medpick').is_visible()
    click('Меню')
    click('Настроить управление')
    drag('b-fire', .40, .52)
    click('Сохранить')
    assert page.locator('#ov.open').is_visible()
    click('Закрыть')
    assert fixed_hud()==hud
    page.evaluate('async()=>{if(document.fullscreenElement) await document.exitFullscreen()}')
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function("!document.getElementById('joy').dataset.layout")
    page.reload()
    click('Управление')
    drag('b-run',.48,.61)
    click('Сохранить')
    page.set_viewport_size({'width':844,'height':390})
    page.wait_for_function("document.getElementById('joy').dataset.layout==='custom'")
    click('Управление')
    click('Сброс')
    click('Сохранить')
    state=page.evaluate("JSON.parse(localStorage.getItem('zona-touch-layout-v1'))")
    assert not state['landscape'] and 'b-run' in state['portrait']
    click('Продолжить')
    assert page.evaluate("__z.P.alive && !document.getElementById('title').classList.contains('open')")
    assert not errors, errors
    browser.close()
    print('Menu, save/continue, drag, sizing, joystick input, HUD, orientations, reset and cancel passed.')
