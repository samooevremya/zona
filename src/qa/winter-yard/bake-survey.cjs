// Run against a built berezki.html after changing outdoor geometry or art.
// PLAYWRIGHT_MODULE and CHROMIUM_BIN optionally select an existing browser installation.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function bake() {
  const root=path.resolve(__dirname,'../../..');
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BIN, args:['--no-sandbox','--single-process','--in-process-gpu','--disable-gpu','--use-gl=disabled','--disable-software-rasterizer']});
  try {
    const page=await browser.newPage();
    // Inject only into this offline bake, so no large terrain render runs on a phone.
    const html=fs.readFileSync(path.join(root,'berezki.html'),'utf8').replace('bootBerezki();','window.bakeSurvey=bakeSurvey;bootBerezki();');
    await page.route('http://survey.local/', route=>route.fulfill({contentType:'text/html',body:html}));
    await page.goto('http://survey.local/');
    await page.getByRole('button',{name:'Новая игра',exact:true}).waitFor();
    const data=await page.evaluate(()=>bakeSurvey().toDataURL('image/webp',.85).split(',')[1]);
    fs.writeFileSync(path.join(root,'src/berezki/survey.webp'),Buffer.from(data,'base64'));
  } finally {await browser.close();}
}
bake().catch(e=>{console.error(e);process.exitCode=1;});
