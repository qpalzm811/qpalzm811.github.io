// 新增的总览方案与跨页面提醒均为离线设计演示，不推断真实业务预警。
screens.splice(2,0,{
 id:'P01-C',group:0,variant:'C',name:'重点关注与业务联动',
 desc:'先看其他业务现场的待关注事项，再看关区核心业务。重点指标为设计建议，待业务方确认。',
 focus:'左侧突出现场关注，中间保留进出口、税收、加贸保税，右侧区分统计数据与现场提醒的口径。',
 difference:'与 A、B 相比，本版围绕“先发现事项，再进入对应业务”组织总览，左侧导航同步显示跨页面提醒。',
 level:['关区总览与关注事项','对应业务专题','具体事项 / 指标明细'],layout:'focus'
});

let alertDemoEnabled=true;
let compareReference=null;
const warningExamples={
 2:{name:'陆地港非贸业务',target:'P03-B',title:'查验与积压事项待关注',items:['15天未过机','待查验','查验异常']},
 3:{name:'空港旅检业务',target:'P04-B',title:'旅检预警事项待关注',items:['今日提示','旅检预警','设备情况']}
};
function hasDemoWarning(group){return alertDemoEnabled&&Object.hasOwn(warningExamples,group)}
function warningDot(){return '<span class="warning-dot" aria-hidden="true"></span>'}
function sourceLabel(group){return hasDemoWarning(group)?'有待关注事项（演示）':'提醒状态未接入'}
function focusPanel(title,body,cls='',tag=''){
 return `<section class="d-panel panel ${cls}"><div class="panel-heading"><h3>${ESC(title)}</h3>${tag?`<span class="panel-tag">${ESC(tag)}</span>`:''}</div><div class="panel-body">${body}</div></section>`;
}
function focusWatchCard(group){
 const w=warningExamples[group];const active=hasDemoWarning(group);
 return `<article class="focus-watch-card ${active?'has-warning':''}" data-watch-group="${group}"><div class="watch-card-top"><span>${active?warningDot():'<span class="watch-idle-dot" aria-hidden="true"></span>'}${ESC(w.name)}</span><small>${active?'待关注 · 演示':'状态待接入'}</small></div><p>${ESC(w.items.join(' / '))}</p><button class="watch-link" data-cockpit="${w.target}">查看对应业务<span aria-hidden="true">›</span></button></article>`;
}
layouts.focus=()=>`<div class="dash-layout layout-focus">
 <div class="focus-brief"><div><span class="focus-eyebrow">建议阅读顺序</span><strong>先看现场关注，再看关区业务</strong></div><div class="focus-read-path"><span><b>关注事项</b><small>发现异常与积压</small></span><i aria-hidden="true">›</i><span><b>业务概览</b><small>了解关区运行情况</small></span><i aria-hidden="true">›</i><span><b>专题明细</b><small>进入对应页面查看</small></span></div><span class="focus-proposal">指标优先级建议稿</span></div>
 ${focusPanel('现场重点关注',focusWatchCard(2)+focusWatchCard(3)+`<article class="focus-watch-card"><div class="watch-card-top"><span><span class="watch-idle-dot" aria-hidden="true"></span>石化业务</span><small>关注口径待确认</small></div><p>船舶靠港情况 / 码头作业日历</p><button class="watch-link" data-cockpit="P02-B">查看作业情况<span aria-hidden="true">›</span></button></article><div class="focus-demo-note">红点为演示；查看页面不代表事项已处理。</div>`,'focus-watch','跨页面提醒')}
 ${focusPanel('关区核心业务概览',metricRow([['进出口业务','box'],['税收入库','tax'],['加贸保税','file']],true)+`<div class="focus-chart-heading"><span>进出口业务趋势</span><small>月度 / 季度统计口径</small></div>`+linesChart(['进口业务','出口业务'])+`<div class="focus-core-note">核心业务先看总体变化，完整指标进入对应专题。</div>`,'focus-core','定期统计数据')}
 ${focusPanel('数据口径与更新',`<div class="focus-source-card"><div><span class="source-marker"></span><strong>关区统计数据</strong><span class="source-tag">月度 / 季度</span></div><p>进出口、税收入库、加贸保税等七大业务模块。</p><dl><dt>统计周期</dt><dd>—</dd><dt>更新时间</dt><dd>—</dd></dl></div><div class="focus-source-card"><div><span class="source-marker onsite"></span><strong>现场关注事项</strong><span class="source-tag">单独标注</span></div><p>石化、陆地港与空港现场数据，分别显示更新说明。</p><dl><dt>更新状态</dt><dd>待接入</dd><dt>更新时间</dt><dd>—</dd></dl></div><div class="focus-scope-note"><b>重点强调什么？</b><span>先把异常、积压和待查验作为候选关注项；统计指标的具体优先级由业务方确认。</span></div>`,'focus-source')}
 ${panel('新兴业态',submetrics(['跨境电商','快件','邮件'])+legend(['跨境电商','快件','邮件']))}
 ${panel('旅客、运输工具及报关备案',submetrics(['进出境旅客','运输工具','报关单位备案'])+legend(['进境','出境','备案情况']))}
 ${panel('各县区外贸数据',horizontalBars(['县区一','县区二','县区三']),'县区名称和核心外贸指标待业务方确认。')}
 </div>`;

function renderSchemeNav(){
 $('schemeNav').innerHTML=`<div class="nav-alert-demo"><span>${warningDot()} 有待关注事项</span><button type="button" id="alertDemoBtn" aria-pressed="${alertDemoEnabled}" title="切换预警红点演示">演示${alertDemoEnabled?'开':'关'}</button></div>`+
 groups.map((g,gi)=>`<div class="group"><div class="group-title"><span>P0${gi+1}</span><strong>${ESC(g)}</strong>${hasDemoWarning(gi)?`<button class="nav-alert" data-warning-group="${gi}" aria-label="查看${ESC(warningExamples[gi].name)}的演示提醒" title="${ESC(warningExamples[gi].title)}（演示）">${warningDot()}</button>`:''}</div>${screens.filter(s=>s.group===gi).map(s=>`<button class="scheme-button" data-id="${s.id}" aria-current="false" ${hasDemoWarning(gi)?`title="${ESC(warningExamples[gi].title)}（演示）" aria-label="${ESC(s.name)}，有待关注事项（演示）"`:''}><b>${s.variant||'合'}</b><span class="scheme-name">${ESC(s.name)}</span>${hasDemoWarning(gi)?`<span class="scheme-status">${warningDot()}</span>`:''}</button>`).join('')}</div>`).join('');
 const allInOne=$('schemeNav').querySelector('.scheme-button[data-id="P05"]');
 allInOne.insertAdjacentHTML('afterend','<a class="finished-dashboard-link" href="业务运行监控中心_方案7_三列全局滚动条.html" target="_blank" rel="noopener">查看四合一成品<span aria-hidden="true">↗</span></a>');
}
function handleSchemeNavClick(e){
 const source=e.target.closest('[data-warning-group]');
 if(source){showWarningExplanation(Number(source.dataset.warningGroup),source);return}
 if(e.target.closest('#alertDemoBtn')){alertDemoEnabled=!alertDemoEnabled;select(activeIndex);$('alertDemoBtn').focus();return}
 const b=e.target.closest('.scheme-button[data-id]');if(b)select(screens.findIndex(s=>s.id===b.dataset.id));
}
function showWarningExplanation(group,trigger){
 const w=warningExamples[group];if(!w)return;
 lastFocus=trigger;
 $('drawerTitle').textContent=w.name+' · 演示提醒';
 $('drawerText').textContent=w.title+'。红点只表示本设计稿中的待关注提示，不代表真实预警。';
 $('drawerDetails').innerHTML=w.items.map(t=>`<li>${ESC(t)}</li>`).join('');
 $('drawerAction').hidden=false;$('drawerAction').dataset.cockpit=w.target;
 $('drawerShade').hidden=false;$('drawerClose').focus();
}
function refreshNavigationAlerts(){
 document.querySelectorAll('#canvasArea .cockpit-tab[data-cockpit]').forEach(b=>{
   const s=screens.find(s=>s.id===b.dataset.cockpit);
   if(s&&hasDemoWarning(s.group)){
    b.insertAdjacentHTML('beforeend',warningDot());
    b.title=warningExamples[s.group].title+'（演示）';
    b.setAttribute('aria-label',b.textContent.trim()+'，有待关注事项（演示）');
   }
 });
}
function selectSchemeIndex(i){
 activeIndex=Math.max(0,Math.min(screens.length-1,i));const s=screens[activeIndex];
 renderSchemeNav();
 document.title=s.id+' '+s.name+'｜海关界面布局方案';
 $('pageLabel').textContent='P0'+(s.group+1)+' / '+groups[s.group];
 $('schemeTitle').textContent=s.name;$('schemeDescription').textContent=s.desc;
 $('currentNumber').textContent=String(activeIndex+1).padStart(2,'0');
 $('totalNumber').textContent=String(screens.length).padStart(2,'0');
 document.querySelectorAll('.scheme-button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.id===s.id)));
 const peers=screens.filter(p=>p.group===s.group);const paired=compare&&peers.length>=2;
 const alternate=peers.find(p=>p.id===compareReference&&p.id!==s.id)||peers.find(p=>p.id!==s.id);
 $('variantTabs').innerHTML=peers.map(p=>`<button class="variant" data-id="${p.id}" aria-pressed="${s.id===p.id}">${p.variant?'方案 '+p.variant+' · ':''}${ESC(p.name)}</button>`).join('')+(paired&&peers.length>2?`<label class="compare-picker">对比参考<select id="compareTarget" aria-label="选择对比参考方案">${peers.filter(p=>p.id!==s.id).map(p=>`<option value="${p.id}" ${p.id===alternate.id?'selected':''}>${p.variant} · ${ESC(p.name)}</option>`).join('')}</select></label>`:'');
 $('canvasArea').className=paired?'comparison':'';
 $('canvasArea').innerHTML=paired?[s,alternate].map(p=>`<div><div class="compare-label">方案 ${p.variant} / ${ESC(p.name)}</div>${frame(p)}</div>`).join(''):frame(s);
 $('compareBtn').disabled=peers.length<2;$('compareBtn').setAttribute('aria-pressed',String(paired));$('compareBtn').textContent=paired?'退出对比':'并排对比';
 $('notes').innerHTML=[['布局重点',s.focus],['方案差异',s.difference],['视觉口径',s.id==='P01-C'?'关注重点属于设计建议，红点属于演示；预警规则与重点指标尚未确认。':'深蓝驾驶舱风格；业务模块完整命名，数值以横线占位。']].map(([a,b])=>`<div><div class="note-label">${a}</div><p class="note-content">${ESC(b)}</p></div>`).join('');
 refreshNavigationAlerts();history.replaceState(null,'','#'+s.id);requestAnimationFrame(fit);
}
document.addEventListener('change',e=>{if(e.target.id==='compareTarget'){compareReference=e.target.value;select(activeIndex)}});
document.addEventListener('click',e=>{
 if(e.target.closest('#canvasArea .panel-link'))$('drawerAction').hidden=true;
 if(e.target.closest('#drawerAction'))closeDrawer();
});
