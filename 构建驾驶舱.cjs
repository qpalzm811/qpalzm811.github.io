// 使用线框备份作为方案选择器模板，将驾驶舱样式、图形与省级地图内联。
// 生成后的 HTML 可独立打开；构建过程和页面均不需要 Figma。
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const geo=JSON.parse(read('assets/china.json'));
const project=([lon,lat])=>[(lon-70)*9.6,(56-lat)*10];
const map=geo.features.map(f=>{
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 const d=polygons.map(poly=>poly.map(ring=>ring.filter((p,i)=>i%2===0||i===ring.length-1).map((p,i)=>{const[x,y]=project(p);return(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)}).join('')+'Z').join('')).join('');
 return {name:f.properties.name||'',d};
});
const css=read('assets/驾驶舱.css')+'\n'+read('assets/关注联动.css')+'\n'+read('assets/多样布局.css');
const js=read('assets/驾驶舱.js').replace('__MAP_DATA__',JSON.stringify(map)).replace('class="screen" data-screen="${s.id}"','class="screen ${s.skin||\'\'}" data-screen="${s.id}"')+'\n'+read('assets/关注联动.js')+'\n'+read('assets/多样布局.js');
let html=read('界面布局方案_线框备份.html');
html=html.replace('</head>','<style>\n'+css+'\n</style>\n</head>');
const a=html.indexOf('function bars()');
const b=html.indexOf('let activeIndex=');
if(a<0||b<a)throw new Error('未找到模板替换位置');
html=html.slice(0,a)+js+'\n'+html.slice(b);
html=html.replace('界面布局提案 / 结构讨论稿','深蓝驾驶舱 / 视觉设计方案');
html=html.replace('先选布局，再定视觉。<br>所有方框均为内容占位，<br>不代表真实数据或已实现功能。','深蓝驾驶舱视觉提案。<br>所有数值以横线占位，<br>图表与场景仅作形态示意。');
html=html.replace('16:9 布局示意 · 点击区块查看用途','16:9 驾驶舱视觉稿 · 点击模块查看说明');
html=html.replace(/^[ \t]*<div class="(?:level-map|bottom-nav|cover-note)"[^\r\n]*\r?\n/gm,'');
html=html.replace("$('prevBtn').onclick=()=>select(activeIndex-1);$('nextBtn').onclick=()=>select(activeIndex+1);",'');
html=html.replace('此处仅说明结构，不填数据、不执行实际业务操作。','此处说明业务模块用途；图表形态、空间点位与数值均非真实业务数据。');
html=html.replace("'本页取舍','一级只放少量摘要；完整业务内容在对应专题与明细中承接。'","'视觉口径','深蓝驾驶舱风格；业务模块完整命名，数值以横线占位。'");
html=html.replace('select(initial<0?0:initial)',"select(initial<0?screens.findIndex(s=>s.id==='P01-C'):initial)");
html=html.replace('共 9 张','共 15 张').replace(' / 09</div>',' / <span id="totalNumber">15</span></div>');
html=html.replace(/function initNav\(\)\{[^\r\n]*/,"function initNav(){renderSchemeNav();$('schemeNav').addEventListener('click',handleSchemeNavClick)}");
html=html.replace(/function select\(i\)\{[^\r\n]*/,"function select(i){selectSchemeIndex(i)}");
html=html.replace('<p>此处说明业务模块用途；图表形态、空间点位与数值均非真实业务数据。</p>', '<button class="drawer-action" id="drawerAction" hidden>查看对应业务</button><p>此处说明业务模块用途；图表形态、空间点位与数值均非真实业务数据。</p>');
html=html.replace("if(e.key==='Tab'){e.preventDefault();$('drawerClose').focus()}","if(e.key==='Tab'){e.preventDefault();const a=$('drawerAction');if(!a.hidden&&document.activeElement===$('drawerClose'))a.focus();else $('drawerClose').focus()}");
// 各方案的原始描述继续保留在画面之外，驾驶舱内呈现业务标题。
fs.writeFileSync(path.join(root,'界面布局方案.html'),html,'utf8');
console.log('已构建驾驶舱 HTML：'+Buffer.byteLength(html)+' bytes');
