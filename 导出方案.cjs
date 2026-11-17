// 重新导出方案图：node 导出方案.cjs
// 依赖当前电脑附带的 Playwright 与 Edge；HTML 本身没有这些依赖。
const { chromium } = require('C:/Users/w/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({headless: true, channel: 'msedge'});
  try {
    const page = await browser.newPage({viewport: {width:1600, height:1000}, deviceScaleFactor:1});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname,'界面布局方案.html')).href);
    await page.waitForLoadState('networkidle');
    await page.locator('#canvasArea .screen').waitFor();
    if(await page.locator('#levelMap, .bottom-nav, .cover-note').count())throw new Error('底部说明区尚未删除');
    if(await page.locator('#canvasArea .screen').getAttribute('data-screen')!=='P01-C')throw new Error('默认入口不是新增 C 方案');
    const ids = await page.locator('.scheme-button').evaluateAll(bs=>bs.map(b=>b.dataset.id));
    if(ids.length!==15)throw new Error('应有十五张方案');
    const overflow = [];
    for (const id of ids) {
      await page.locator(`.scheme-button[data-id="${id}"]`).click();
      await page.waitForFunction(id=>document.querySelector('#canvasArea .screen').dataset.screen===id,id);
      const issues = await page.locator('#canvasArea .panel, #canvasArea .panel-body').evaluateAll(ps=>ps.filter(p=>p.scrollHeight>p.clientHeight+3).map(p=>({title:(p.closest('.panel')?.querySelector('h3')||p.querySelector('h3'))?.textContent, overflow:p.scrollHeight-p.clientHeight})));
      if(issues.length) overflow.push({id,issues});
    }
    // 预警状态跨页面共享；阅读页面不能误清除提醒，演示开关同步影响导航和新总览。
    await page.locator('.scheme-button[data-id="P01-C"]').click();
    if(await page.locator('#schemeNav .nav-alert').count()!==2)throw new Error('预期陆地港和空港两类演示提醒');
    await page.locator('.scheme-button[data-id="P03-A"]').click();
    if(await page.locator('#schemeNav .nav-alert').count()!==2)throw new Error('查看页面意外清除了提醒');
    await page.locator('#schemeNav [data-warning-group="3"]').click();
    await page.locator('#drawerAction:not([hidden])').waitFor();
    await page.locator('#drawerAction').click();
    if(await page.locator('#canvasArea .screen').getAttribute('data-screen')!=='P04-B')throw new Error('提醒跳转业务页面失败');
    await page.locator('.scheme-button[data-id="P01-C"]').click();
    await page.locator('#alertDemoBtn').click();
    if(await page.locator('#schemeNav .nav-alert, #canvasArea .has-warning').count())throw new Error('演示关闭后仍残留提醒状态');
    await page.locator('#alertDemoBtn').click();
    if(await page.locator('#canvasArea .has-warning').count()!==2)throw new Error('演示开启后首页提醒不同步');
    await page.locator('#compareBtn').click();
    if(await page.locator('#canvasArea .screen').count()!==2)throw new Error('对比模式未展示两张方案');
    await page.locator('#compareTarget').selectOption('P01-B');
    if(await page.locator('#canvasArea [data-screen="P01-B"]').count()!==1)throw new Error('第三套总览的对比参考切换失败');
    await page.locator('#compareBtn').click();
    // 新增版本均可与同类旧方案比较；专题和中枢入口可操作。
    for(const id of ['P01-D','P02-C','P03-C','P04-C','P05-B']){
      await page.locator(`.scheme-button[data-id="${id}"]`).click();
      await page.locator('#compareBtn').click();
      if(await page.locator('#canvasArea .screen').count()!==2)throw new Error(id+' 未显示同类对比');
      await page.locator('#compareBtn').click();
    }
    await page.locator('.scheme-button[data-id="P01-D"]').click();
    await page.locator('[data-topic="税收入库"]').click();
    if(await page.locator('#drawerTitle').textContent()!=='税收入库')throw new Error('专题导航无效');
    await page.keyboard.press('Escape');
    await page.locator('.scheme-button[data-id="P05-B"]').click();
    await page.locator('.network-hub [data-cockpit="P04-C"]').click();
    if(await page.locator('#canvasArea .screen').getAttribute('data-screen')!=='P04-C')throw new Error('四域联动跳转失败');
    await page.locator('.scheme-button[data-id="P01-C"]').click();
    await page.locator('#canvasArea .panel-link').first().click();
    await page.locator('#drawerShade:not([hidden])').waitFor();
    await page.keyboard.press('Escape');
    if(!await page.locator('#drawerShade').evaluate(n=>n.hidden))throw new Error('说明面板未关闭');
    const out = path.join(__dirname,'方案图');
    fs.mkdirSync(out,{recursive:true});
    await page.locator('#schemeTitle').click();
    await page.screenshot({path:path.join(out,'方案板预览.png'),fullPage:true});
    await page.screenshot({path:path.join(out,'关注联动_带侧栏.png'),fullPage:false});
    await page.locator('#presentBtn').click();
    await page.locator('#exitPresentation').evaluate(n=>n.style.visibility='hidden');
    await page.setViewportSize({width:1600,height:900});
    for (const id of ids) {
      await page.evaluate(id=>select(screens.findIndex(s=>s.id===id)),id);
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      await page.locator('#canvasArea .screen').screenshot({path:path.join(out,`${id}.png`)});
    }
    await page.keyboard.press('Escape');
    await page.locator('#exitPresentation').evaluate(n=>n.style.visibility='');
    await page.evaluate(()=>buildPrint());
    await page.pdf({path:path.join(__dirname,'界面布局方案_全部方案.pdf'),preferCSSPageSize:true,printBackground:true});
    await page.setViewportSize({width:390,height:844});
    await page.locator('.scheme-button[data-id="P01-A"]').click();
    const mobileOverflow = await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    if(mobileOverflow)throw new Error('手机宽度出现横向溢出');
    if(errors.length)throw new Error(errors.join('\n'));
    console.log(JSON.stringify({screens:ids.length,overflow,interaction:'通过',crossPageAlerts:'通过',threeWayComparison:'通过',mobile:'通过',runtimeErrors:errors.length,output:out},null,2));
    if(overflow.length)process.exitCode=1;
  } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1});
