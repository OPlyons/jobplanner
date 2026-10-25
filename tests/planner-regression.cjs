// Exercise the real packaged application with synthetic plans, without a browser
// or npm dependencies. DOM stubs support bootstrap only: these tests check data,
// actions and generated markup. Visual checks remain a separate browser task.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const path=require('node:path'),{gunzipSync}=require('node:zlib');
const sourceDirectory=path.join(__dirname,'..','source');
const manifest=JSON.parse(fs.readFileSync(path.join(sourceDirectory,'manifest.json'),'utf8'));
const html=process.argv[2]
 ?fs.readFileSync(process.argv[2],'utf8')
 :gunzipSync(Buffer.concat(manifest.parts.map(part=>fs.readFileSync(path.join(sourceDirectory,part))))).toString('utf8');
const app=html.match(/<script id="app-script">([\s\S]*?)<\/script>/)[1];
const nodes=new Map(),storage=new Map(),documentEvents=new Map();
function element(id='') {return {id,innerHTML:'',textContent:'',value:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},removeAttribute(){},getAttribute(){return null},closest(){return null},querySelector(){return null},querySelectorAll(){return []},addEventListener(){},focus(){},scrollIntoView(){},contains(){return false},appendChild(){},remove(){},click(){},setCustomValidity(){},reportValidity(){return true},close(){},showModal(){},getBoundingClientRect(){return {x:0,y:0,width:104,height:104}},insertAdjacentHTML(){}};}
const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},querySelector(){return null},querySelectorAll(){return []},addEventListener(name,handler){if(!documentEvents.has(name))documentEvents.set(name,[]);documentEvents.get(name).push(handler);},createElement(){return element()},body:element('body'),documentElement:element('html'),title:'Planner',activeElement:null};
const context={console,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},crypto:crypto.webcrypto,structuredClone,TextEncoder,TextDecoder,URL,Blob,Uint8Array,ArrayBuffer,DataView,Date,Intl,FormData,requestAnimationFrame:f=>f(),setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},scrollTo(){},navigator:{userAgent:'node regression check'},location:{protocol:'file:'}};
context.window=context;context.globalThis=context;
vm.createContext(context);vm.runInContext(app,context,{timeout:10000});
function run(code){return vm.runInContext(code,context,{timeout:10000});}
let checked=0;
function check(name,fn){fn();checked++;console.log('PASS',name);}
run(`state=defaults();state.review=reviewDefaults();state.flex=[];state.profile.configured=true;state.profile.name='Test only';state.profile.notes='Private notes';state.review.from='2026-10-26';state.review.to='2026-11-08';anchor='2026-10-26';view='plan';lastSavedRaw=null;`);
check('Fresh version accepts the existing backup schema',()=>assert.equal(run('validateData(JSON.parse(JSON.stringify(state)));state.schema'),1));
check('Saved plan text is escaped on new screens',()=>{run(`state.entries=[{id:'escape-test',title:'<script>alert(1)</script>',category:'dcc-ip',timeType:'standard',date:anchor,start:'09:00',end:'10:00',repeat:'none',until:anchor,days:[],excluded:[],notes:''}];`);assert.ok(run('renderPlan()').includes('&lt;script&gt;alert(1)&lt;/script&gt;'));run('state.entries=[];');});
check('15-minute actions persist additions and reductions',()=>{run(`view='visual';handleDayDialAction({action:'day-dial-step',category:'dcc-ip',delta:'15'});handleDayDialAction({action:'day-dial-step',category:'dcc-ip',delta:'15'});handleDayDialAction({action:'day-dial-step',category:'dcc-ip',delta:'-15'});`);assert.equal(run("dayDialData().byCat['dcc-ip']"),15);assert.equal(JSON.parse(storage.get('cnwl-job-planner-v1')).entries.length,1);});
check('Dial changes keep reports and the weekly diary in agreement',()=>{const amounts=run(`state=buildDayDialChange('dcc-ip',120);state=buildDayDialChange('dcc-nip',90);({dial:dayDialData().total,diary:totals(corePlanOccurrences(anchor,anchor)).work,report:buildSummaryRow(state,{personId:'TEST001',sequence:1},true).planned_standard_work_hours*60})`);assert.equal(amounts.dial,210);assert.equal(amounts.diary,210);assert.equal(amounts.report,210);});
check('Homepage combines related work categories without double counting',()=>{const output=run('figmaWeekSummary()');assert.equal((output.match(/Care &amp; support/g)||[]).length,1);assert.ok(output.includes('<strong>3 h 30 min</strong>'));});
check('Dials cannot add beyond available paid time',()=>assert.throws(()=>run("buildDayDialChange('spa-csm',300)"),/exceed your usual hours/));
check('Unpaid breaks and overtime are kept separate',()=>{run(`state.entries.push({id:'break-test',title:'Break',category:'break',date:anchor,start:'12:30',end:'13:00',repeat:'none',until:anchor,days:[],excluded:[],notes:''},{id:'overtime-test',title:'Extra work',category:'dcc-ip',timeType:'paid_overtime',date:anchor,start:'17:00',end:'18:00',repeat:'none',until:anchor,days:[],excluded:[],notes:''});`);assert.equal(run('dayDialData().total'),210);assert.equal(run('workTimeSummary(occurrences(anchor,anchor)).paid_overtime'),60);assert.ok(run('figmaWeekSummary()').includes('1 h anticipated'));});
check('A daily edit changes only its occurrence in a repeat',()=>{run(`state.entries=[{id:'repeat-test',title:'Weekly support',category:'dcc-ip',timeType:'standard',date:anchor,start:'09:00',end:'10:00',repeat:'weekly',until:'2026-11-08',days:[0],excluded:[],notes:''}];state=buildDayDialChange('dcc-ip',30);`);assert.equal(run("dayDialData('2026-10-26').total"),30);assert.equal(run("dayDialData('2026-11-02').total"),60);});
check('All work categories remain available in the dials',()=>{const output=run('renderLiveDials()');for(const id of run('VISUAL_PLANNER_CATEGORIES.map(c=>c.id)'))assert.ok(output.includes('live-label-'+id),id);});
check('Whole plan switches out of daily dials',()=>{run("view='visual';performAction({action:'period',period:'plan'})");assert.equal(run('view'),'plan');assert.equal(run('period'),'plan');});
check('Weekly cards show more than the old three-activity limit',()=>{run(`view='plan';period='week';diaryLayout='week';state.entries=Array.from({length:5},(_,i)=>({id:'many-'+i,title:'Activity '+i,category:'dcc-ip',date:anchor,start:String(9+i).padStart(2,'0')+':00',end:String(10+i).padStart(2,'0')+':00',repeat:'none',until:anchor,days:[],excluded:[],notes:''}));`);assert.ok(run('renderPlan()').includes('Activity 4'));});
check('Overnight work is visible on the following day',()=>{run(`state.entries=[{id:'night',title:'Overnight shift',category:'dcc-ip',date:anchor,start:'22:00',end:'06:00',overnight:true,repeat:'none',until:anchor,days:[],excluded:[],notes:''}];`);assert.ok(run('renderPlan()').includes('From the previous day'));});
check('Backup round-trip keeps fields and planned work',()=>{const a=run('JSON.stringify(state)');run(`validateData(JSON.parse(JSON.stringify(state)));state=JSON.parse(JSON.stringify(state));`);assert.equal(run('JSON.stringify(state)'),a);});
check('Share screen keeps separate report, backup and sign-off actions',()=>{const output=run('renderFinish()');for(const action of ['export','draft-pdf','backup','annual-section','reporting-details'])assert.ok(output.includes(`data-action="${action}"`),action);assert.ok(output.includes('data-section="agreement"'));});
check('Excel summary excludes names and private notes',()=>{const row=run(`buildSummaryRow(state,{personId:'TEST001',sequence:1},true)`);assert.ok(!JSON.stringify(row).includes('Private notes'));assert.ok(!JSON.stringify(row).includes('Test only'));assert.equal(row.person_id,'TEST001');});
check('Options opens from the weekly diary and daily dials',()=>{for(const target of ['plan','visual']){run(`view='${target}';visualPlannerMode='day';period='week';performAction({action:'calm-plan-options'});`);const output=nodes.get('modal-body').innerHTML;assert.equal(nodes.get('modal-title').textContent,'Plan options');for(const command of ['navigate','annual-leave-open','day-dial-pattern','plan-dates','overtime'])assert.ok(output.includes(`data-command="${command}"`),command);}});
check('Options can open the real annual planning workspace',()=>{run("performAction({action:'calm-plan-command',command:'navigate',view:'review'})");assert.equal(run('view'),'review');assert.ok(nodes.get('content').innerHTML.includes('Annual job plan'));});
check('Annual planning is directly available from both planning views',()=>{for(const active of ['plan','visual']){const output=run(`compactPlanningViews('${active}')`);assert.ok(output.includes('data-view="review"'));assert.ok(output.includes('Annual plan'));}});
check('Annual sections retain all fields for saving the complete plan',()=>{const output=run('renderReview()');for(const name of ['from','to','leave','bank','other','discussion','needs','objectives','resources','adjustments','supervision','status','reviewer','date','managerSignedOff','secondSignoffRequired','secondReviewer','secondDate','nextReview'])assert.ok(output.includes(`name="${name}"`),name);assert.equal((output.match(/<form /g)||[]).length,1);assert.equal((output.match(/data-annual-panel=/g)||[]).length,5);});
check('Switching annual sections preserves unsaved work and rejects invalid targets',()=>{run("view='review';mainFormDirty=true;performAction({action:'annual-section',section:'dates'});");assert.equal(run('annualSection'),'dates');assert.equal(run('mainFormDirty'),true);run("performAction({action:'annual-section',section:'bad-section'});");assert.equal(run('annualSection'),'dates');run('mainFormDirty=false;');});
check('Generic care-related activity labels use sentence case without changing stored titles',()=>{run("state.entries[0].title='care related work';state.entries[0].category='icc-ip';");assert.equal(run('displayActivityTitle(state.entries[0])'),'Care-related work');assert.equal(run('state.entries[0].title'),'care related work');assert.equal(run("displayActivityTitle({title:'a personal activity title',category:'icc-ip'})"),'a personal activity title');});
check('Activity sections keep the original save fields in one form',()=>{run("openEntryFormContent('new');");const output=nodes.get('modal-body').innerHTML;assert.equal((output.match(/<form /g)||[]).length,1);assert.equal((output.match(/data-activity-step=/g)||[]).length,3);for(const name of ['title','category','date','start','end','overnight','breakMinutes','timeType','repeat','until','day','location','notes'])assert.ok(output.includes(`name="${name}"`),name);assert.ok(!output.includes('</button>,<button'));});
check('Activity form opens for recorded time without repeat controls',()=>{run("openEntryFormContent('actual');");const output=nodes.get('modal-body').innerHTML;assert.ok(output.includes('3. Notes'));assert.ok(output.includes('Save recorded time'));assert.ok(!output.includes('name="repeat"'));assert.equal(run("selectActivitySection('unavailable')"),false);});
check('Main screens render with an existing plan',()=>{run("period='week';anchor=state.review.from;annualSection='overview';");for(const fn of ['renderHome','renderDetails','renderPlan','renderLiveDials','renderDashboard','renderReview','renderFinish','renderHelp','renderCategories','renderMotion']){const output=run(`${fn}()`);assert.ok(typeof output==='string'&&output.length>100,fn);assert.ok(!output.includes('undefined'),fn);}});
check('Annual work suggestions retain all existing eligible activities',()=>{const expected=run("ROLE_TASKS.filter(t=>!t.category||isWork(t)).map(t=>t.id).sort()");const actual=run("commonActivityTasks('flex').map(t=>t.id).sort()");assert.deepEqual([...actual],[...expected]);assert.equal(run("commonActivityTasks('flex')[0].id"),'supervision-received');for(const id of run('ANNUAL_WORK_GROUPS.flatMap(g=>g.tasks)'))assert.ok(run(`ROLE_TASKS.some(t=>t.id===${JSON.stringify(id)})`),id);});
check('Annual starter opens a form without adding work',()=>{const before=run('JSON.stringify(state)');run("view='review';mainFormDirty=false;performAction({action:'annual-work-group',group:'supervision'});");assert.equal(nodes.get('modal-title').textContent,'Supervision & reflection');assert.equal(run('JSON.stringify(state)'),before);const output=nodes.get('modal-body').innerHTML;for(const name of ['title','category','hours','sessions','timeType'])assert.ok(output.includes(`name="${name}"`),name);assert.equal((output.match(/data-flex-step=/g)||[]).length,2);assert.ok(output.includes('data-flex-show="2" hidden>Save commitment'));assert.ok(output.indexOf('Supervision &amp; reflection')<output.indexOf('Care and practical support'));});
check('Annual time preview handles fractional hours and incomplete input',()=>{assert.ok(run("flexTotalText('1.5','10')").includes('15 h'));for(const pair of [[0,10],[1.3,4],[1,1.5],['',5]])assert.ok(run(`flexTotalText(${JSON.stringify(pair[0])},${JSON.stringify(pair[1])})`).startsWith('Enter hours'));});
check('Simplified homepage retains optional summaries and recovery routes',()=>{const output=run('renderHome()');assert.ok(output.includes('<h1 id="welcome-main-title">Your job plan</h1>'));assert.ok(output.includes('<details class="calm-home-extra">'));for(const action of ['backup','restart','preparation-open','workflow'])assert.ok(output.includes(`data-action="${action}"`),action);assert.ok(!output.includes('fg-support-grid'));});
check('Horizontal, vertical and day layouts retain the same plan and totals',()=>{
 const before=run('JSON.stringify(state)'),total=run('totals(corePlanOccurrences(state.review.from,state.review.to)).work');
 for(const [layout,marker] of [['timeline','horizontal-board'],['week','fg-week-grid'],['day','diary-day-picker']]){
  run(`performAction({action:'diary-layout',layout:'${layout}'});`);
  assert.ok(nodes.get('content').innerHTML.includes(marker),layout);
  assert.ok(nodes.get('content').innerHTML.includes('aria-labelledby="diary-layout-label"'));
  assert.equal(run('JSON.stringify(state)'),before);
  assert.equal(run('totals(corePlanOccurrences(state.review.from,state.review.to)).work'),total);
 }
});
check('An explicit layout choice is remembered without writing plan data',()=>{
 const before=storage.get('cnwl-job-planner-v1');
 run("performAction({action:'diary-layout',layout:'timeline'});");
 assert.equal(run('readDiaryLayout()'),'timeline');
 assert.equal(storage.get('cnwl-job-planner-v1-diary-layout'),'timeline');
 assert.equal(storage.get('cnwl-job-planner-v1'),before);
 assert.ok(run("compactPlanningViews('visual')").includes('data-layout="timeline"'));
 run("performAction({action:'diary-day',date:'2026-10-26'});");
 assert.equal(run('diaryLayout'),'day');
 assert.ok(run("compactPlanningViews('plan')").includes('data-layout="timeline"'));
 run("performAction({action:'diary-layout',layout:preferredDiaryLayout});");
 assert.equal(run('diaryLayout'),'timeline');
});
check('Bad layout preferences and unavailable preference storage have safe fallbacks',()=>{
 storage.set('cnwl-job-planner-v1-diary-layout','invalid');assert.equal(run('readDiaryLayout()'),'timeline');
 const media=context.matchMedia;context.matchMedia=()=>({matches:true});assert.equal(run('readDiaryLayout()'),'day');context.matchMedia=media;
 const writer=context.localStorage.setItem;context.localStorage.setItem=()=>{throw Error('Storage unavailable')};
 try{assert.equal(run("chooseDiaryLayout('week')"),true);assert.equal(run('diaryLayout'),'week');assert.equal(run("chooseDiaryLayout('invalid')"),false);assert.equal(run('diaryLayout'),'week');}finally{context.localStorage.setItem=writer;run("chooseDiaryLayout('timeline')");}
});
check('Timeline exposes both time sliders and uses consistent activity labels',()=>{
 const output=run('renderPlan()');assert.ok(output.includes('role="slider"'));assert.ok(output.includes('data-resize-edge="start"'));assert.ok(output.includes('data-resize-edge="end"'));assert.ok(output.includes('Care-related work'));assert.ok(!output.includes('>care related work<'));
});
const resizeState=run('JSON.stringify(state)');
run(`state.entries=[{id:'resize-repeat',title:'Support session',category:'dcc-ip',date:'2026-10-26',start:'09:00',end:'10:00',repeat:'weekly',until:'2026-11-08',days:[0],excluded:[],notes:''}];state.flex=[];`);
check('Sliding an edge changes only that occurrence of repeating work',()=>{
 const before=run('JSON.stringify(state)');const result=run(`(()=>{const p=buildHorizontalResizeProposal('resize-repeat','2026-10-26',540,615);return {first:dayDialData('2026-10-26',p.candidate).total,next:dayDialData('2026-11-02',p.candidate).total,repeating:p.repeating,capacityError:p.capacityError};})()`);
 assert.equal(result.first,75);assert.equal(result.next,60);assert.equal(result.repeating,true);assert.equal(result.capacityError,'');assert.equal(run('JSON.stringify(state)'),before);
});
check('Time sliders protect working-hour limits and detect new overlaps',()=>{
 assert.ok(run("buildHorizontalResizeProposal('resize-repeat','2026-10-26',540,1080).capacityError"));
 assert.throws(()=>run("buildHorizontalResizeProposal('resize-repeat','2026-10-26',540,540)"),/finish must be after/);
 assert.throws(()=>run("buildHorizontalResizeProposal('resize-repeat','2026-10-26',-15,600)"),/Keep the start/);
 run(`state.entries.push({id:'overlap-for-resize',title:'Meeting',category:'spa-csm',date:'2026-10-26',start:'10:00',end:'11:00',repeat:'none',until:'2026-10-26',days:[],excluded:[],notes:''});`);
 assert.equal(run("buildHorizontalResizeProposal('resize-repeat','2026-10-26',540,615).overlaps.length"),1);
});
check('The keyboard slider handler saves time and keeps the diary and report consistent',()=>{
 run(`state.entries=state.entries.filter(e=>e.id==='resize-repeat');lastSavedRaw=JSON.stringify(state);localStorage.setItem(KEY,lastSavedRaw);view='plan';period='week';diaryLayout='timeline';anchor='2026-10-26';mainFormDirty=false;activityDraftSession=null;dialogContext=null;$('modal').open=false;`);
 const handle=element();handle.dataset={resizeId:'resize-repeat',resizeDate:'2026-10-26',resizeEdge:'end'};handle.closest=selector=>selector==='.horizontal-resize-handle'?handle:null;
 let stopped=false;const event={target:handle,key:'ArrowRight',shiftKey:false,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){stopped=true;}};
 for(const listener of documentEvents.get('keydown')){listener(event);if(stopped)break;}
 assert.equal(run("dayDialData('2026-10-26').total"),75);assert.equal(run("dayDialData('2026-11-02').total"),60);
 assert.equal(JSON.parse(storage.get('cnwl-job-planner-v1')).entries.reduce((n,e)=>n+(e.date==='2026-10-26'&&e.repeat==='none'?1:0),0),1);
 assert.equal(run('totals(corePlanOccurrences(state.review.from,state.review.to)).work'),135);
 assert.equal(run("buildSummaryRow(state,{personId:'TEST001',sequence:1},true).planned_standard_work_hours*60"),135);
});
run(`state=JSON.parse(${JSON.stringify(resizeState)});`);
// Run the embedded export engines too: this catches missing fonts/libraries or
// incompatible summary rows even when a remote browser cannot capture downloads.
async function checkExports(){
 context.atob=atob;context.btoa=btoa;context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;
 for(const [,attributes,script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(!attributes.includes('app-script'))vm.runInContext(script,context,{timeout:10000});
 }
 const result=await run(`(async()=>{
  const row=buildSummaryRow(state,{personId:'TEST001',sequence:1},true);
  const xlsx=JobPlanXlsx.build(row);
  const pdf=await exportPDF(state.review.from,state.review.to,false,false,structuredClone(state),row);
  const reopened=await PDFLib.PDFDocument.load(pdf);
  return {pdfPrefix:String.fromCharCode(...pdf.slice(0,5)),pages:reopened.getPageCount(),pdfBytes:pdf.length,xlsxPrefix:Array.from(xlsx.slice(0,4)),xlsxBytes:xlsx.length};
 })()`);
 check('Embedded PDF engine creates a readable five-page report',()=>{assert.equal(result.pdfPrefix,'%PDF-');assert.equal(result.pages,5);assert.ok(result.pdfBytes>10000);});
 check('Embedded Excel engine creates an XLSX archive',()=>{assert.deepEqual(Array.from(result.xlsxPrefix),[80,75,3,4]);assert.ok(result.xlsxBytes>10000);});
 console.log(`Completed ${checked} planner regression checks.`);
}
checkExports().catch(error=>{console.error(error);process.exitCode=1;});
