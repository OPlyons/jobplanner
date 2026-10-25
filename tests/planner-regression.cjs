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
function element(id='') {return {id,innerHTML:'',textContent:'',value:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},removeAttribute(){},getAttribute(){return null},closest(){return null},querySelector(){return null},querySelectorAll(){return []},addEventListener(){},focus(){},scrollIntoView(){},contains(){return false},appendChild(){},remove(){},click(){},setCustomValidity(){},reportValidity(){return true},close(){this.open=false},showModal(){this.open=true},getBoundingClientRect(){return {x:0,y:0,width:104,height:104}},insertAdjacentHTML(){}};}
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
check('Busy compact rows keep all activities and handles within their allocated space',()=>{
 const before=run('JSON.stringify(state)');
 try{
  run(`state.entries=Array.from({length:12},(_,i)=>({id:'compact-'+i,title:'Overlapping activity '+i,category:'dcc-ip',date:'2026-10-26',start:'09:00',end:i%3===0?'09:15':i%3===1?'09:30':'10:00',repeat:'none',until:'2026-10-26',days:[],excluded:[],notes:''}));categoryFilter='all';`);
  const output=run(`renderHorizontalWeek('2026-10-26',corePlanOccurrences('2026-10-26','2026-11-01'),[],new Set())`);
  const first=output.slice(output.indexOf('class="horizontal-day '),output.indexOf('<section class="horizontal-day ',output.indexOf('class="horizontal-day ')));
  const height=Number(first.match(/class="horizontal-track" style="height:(\d+)px/)[1]);
  const block=Number(output.match(/--timeline-block-height:(\d+)px/)[1]);
  const bars=[...first.matchAll(/data-lane="\d+"[^>]*top:(\d+)px/g)];assert.equal(bars.length,12);
  for(const m of bars)assert.ok(Number(m[1])+block<=height,'A block would be clipped');
  const handles=[...first.matchAll(/class="horizontal-resize-handle ([^"]*)"[^>]*top:(\d+)px/g)];assert.equal(handles.length,24);
  for(const m of handles)assert.ok(Number(m[2])+(m[1].includes('resize-short')?24:block)<=height,'A handle would be clipped');
  for(let i=0;i<12;i++)assert.ok(first.includes(`Overlapping activity ${i}`));
 }finally{run(`state=JSON.parse(${JSON.stringify(before)});`);}
});
check('Compact overnight fragments keep true endpoints and count the work once',()=>{
 const before=run('JSON.stringify(state)');
 try{
  run(`state.entries=[{id:'compact-night',title:'Night work',category:'dcc-ip',date:'2026-10-26',start:'22:00',end:'06:00',overnight:true,repeat:'none',until:'2026-10-26',days:[],excluded:[],notes:''}];categoryFilter='all';`);
  const output=run(`renderHorizontalWeek('2026-10-26',corePlanOccurrences('2026-10-26','2026-11-01'),[],new Set())`);
  assert.equal((output.match(/data-resize-id="compact-night"/g)||[]).length,2);
  assert.ok(output.includes('Continues from the previous day'));assert.equal(run("totals(corePlanOccurrences('2026-10-26','2026-11-01')).work"),480);
 }finally{run(`state=JSON.parse(${JSON.stringify(before)});`);}
});
// Exercise calendar boundaries, data recovery and repeated-work operations with
// independent fixtures rather than relying on the UI smoke tests above.
function freshPlan(){
 storage.clear();
 run(`state=defaults();state.review=reviewDefaults();state.flex=[];state.profile.configured=true;state.profile.name='Synthetic test';state.review.from='2026-10-01';state.review.to='2026-11-30';anchor='2026-10-26';view='plan';period='week';categoryFilter='all';dayDialStart='';mainFormDirty=false;storageError='';tabConflict=false;blockedLoad=false;lastSavedRaw=null;activityDraftSession=null;dialogContext=null;`);
}
const entrySource=`({id:'weekly',title:'Support',category:'dcc-ip',timeType:'standard',date:'2026-10-26',start:'09:00',end:'10:00',repeat:'weekly',until:'2026-11-30',days:[0],excluded:[],notes:''})`;
check('Repeats handle leap years, missing month dates and excluded dates',()=>{
 freshPlan();run(`state.entries=[${entrySource}];`);
 assert.deepEqual([...run(`occurrences('2026-10-01','2026-11-30').map(e=>e.date)`)],['2026-10-26','2026-11-02','2026-11-09','2026-11-16','2026-11-23','2026-11-30']);
 assert.deepEqual([...run(`occurrences('2026-01-01','2026-05-31',[{...state.entries[0],date:'2026-01-31',repeat:'monthly',until:'2026-05-31',excluded:['2026-03-31']}]).map(e=>e.date)`)],['2026-01-31','2026-05-31']);
 assert.deepEqual([...run(`occurrences('2024-01-01','2030-12-31',[{...state.entries[0],date:'2024-02-29',repeat:'yearly',until:'2030-12-31'}]).map(e=>e.date)`)],['2024-02-29','2028-02-29']);
});
check('Fortnightly and four-weekly repeats retain their original cycle after a split',()=>{
 freshPlan();
 for(const [repeat,expected] of [['fortnightly',['2026-11-09','2026-11-23']],['fourweekly',['2026-11-23']]]){
  const actual=run(`occurrences('2026-11-01','2026-11-30',[{...${entrySource},date:'2026-11-02',repeatAnchor:'2026-10-26',repeat:'${repeat}'}]).map(e=>e.date)`);
  assert.deepEqual([...actual],expected);
 }
});
check('Capacity remains correct across clock changes and leap days',()=>{
 freshPlan();assert.equal(run(`capacity('2026-10-19','2026-11-01')`),4500);
 assert.equal(run(`capacity('2028-02-28','2028-03-03')`),2250);
 assert.equal(run(`capacity('2026-10-26','2026-10-25')`),0);
});
check('Annual leave and bank holiday allowances are deducted only once',()=>{
 freshPlan();run(`state.review.leave=15;state.review.bank=7.5;state.entries=[{...${entrySource},id:'leave',category:'leave',repeat:'none',start:'09:00',end:'16:30'}];`);
 assert.equal(run('annualStats().deductions'),1350);
 run(`state.entries.push({...state.entries[0],id:'leave-2',date:'2026-10-27'},{...state.entries[0],id:'leave-3',date:'2026-10-28'},{...state.entries[0],id:'leave-4',date:'2026-10-29'});`);
 assert.equal(run('annualStats().deductions'),1800);
});
check('Adding leave skips nonworking days and existing leave',()=>{
 freshPlan();run(`state.entries=[{...${entrySource},id:'leave',category:'leave',repeat:'none',start:'09:00',end:'16:30'}];`);
 const p=run(`buildAnnualLeaveProposal({from:'2026-10-23',to:'2026-10-27',mode:'full'})`);
 assert.deepEqual([...p.entries.map(e=>e.date)],['2026-10-23','2026-10-27']);assert.equal(p.nonWorking.length,2);assert.equal(p.alreadyLeave.length,1);assert.equal(p.totalMinutes,900);
});
check('Removing work for leave affects only the chosen occurrence and keeps recorded time',()=>{
 freshPlan();run(`state.entries=[${entrySource}];state.actual=[{...${entrySource},id:'record',planKey:'weekly@2026-10-26'}];`);
 const result=run(`(()=>{const p=buildAnnualLeaveProposal({from:'2026-10-26',to:'2026-10-26',mode:'full'}),n=annualLeaveCandidate(p,'remove');return {before:occurrences('2026-10-26','2026-10-26',n.entries).filter(isWork).length,next:occurrences('2026-11-02','2026-11-02',n.entries).filter(isWork).length,actual:JSON.stringify(n.actual),original:JSON.stringify(state.actual)};})()`);
 assert.equal(result.before,0);assert.equal(result.next,1);assert.equal(result.actual,result.original);
 assert.throws(()=>run(`annualLeaveCandidate(buildAnnualLeaveProposal({from:'2026-10-26',to:'2026-10-26',mode:'full'}),'')`),/Choose whether/);
});
check('Moving repeating work preserves other dates and recorded history',()=>{
 freshPlan();run(`state.entries=[${entrySource}];state.actual=[{...${entrySource},id:'record',planKey:'weekly@2026-10-26'}];`);
 const p=run(`buildDiaryMoveProposal('weekly','2026-10-26','2026-10-27')`);
 assert.equal(p.hasRecorded,true);assert.equal(p.repeating,true);
 assert.equal(run(`occurrences('2026-10-26','2026-10-26',buildDiaryMoveProposal('weekly','2026-10-26','2026-10-27').candidate.entries).length`),0);
 assert.deepEqual([...p.candidate.actual.map(a=>a.planKey)],['weekly@2026-10-26']);
 assert.equal(p.candidate.entries.find(e=>e.id==='weekly').excluded[0],'2026-10-26');
});
check('Copying a period excludes leave, overtime and exact duplicates',()=>{
 freshPlan();run(`state.entries=[{...${entrySource},repeat:'none'},{...${entrySource},id:'leave',category:'leave',repeat:'none',date:'2026-10-27'},{...${entrySource},id:'extra',timeType:'paid_overtime',repeat:'none',date:'2026-10-28'}];`);
 const first=run(`buildPeriodCopyProposal({from:'2026-10-26',to:'2026-11-01',target:'2026-11-02'})`);assert.equal(first.added.length,1);assert.equal(first.skipped,2);
 run(`state.entries.push(...buildPeriodCopyProposal({from:'2026-10-26',to:'2026-11-01',target:'2026-11-02'}).entries);`);
 const second=run(`buildPeriodCopyProposal({from:'2026-10-26',to:'2026-11-01',target:'2026-11-02'})`);assert.equal(second.added.length,0);assert.equal(second.duplicates,1);
});
check('Day dials stop at leave and preserve named timed activities',()=>{
 freshPlan();run(`state.entries=[{...${entrySource},repeat:'none'},{...${entrySource},id:'leave',category:'leave',repeat:'none',start:'10:00',end:'16:30'}];`);
 assert.throws(()=>run(`buildDayDialChange('dcc-ip',75)`),/exceed your usual hours/);
 assert.equal(run(`buildDayDialChange('dcc-ip',30).entries.find(e=>e.id==='weekly').title`),'Support');
});
check('Time in motion cannot reduce timed work or exceed 24 hours',()=>{
 freshPlan();run(`state.actual=[{...${entrySource},id:'actual',date:'2026-10-23'}];`);
 assert.throws(()=>run(`buildMotionDialChange('dcc-ip',30,state,'2026-10-23','standard')`),/timed activities/);
 assert.throws(()=>run(`buildMotionDialChange('spa-cpd',1440,state,'2026-10-23','standard')`),/24 hours/);
 assert.throws(()=>run(`buildMotionDialChange('spa-cpd',60,state,addDays(today(),1),'standard')`),/today or an earlier date/);
 assert.equal(run(`buildMotionDialChange('dcc-ip',90,state,'2026-10-23','standard').actual.filter(e=>e.durationOnly).reduce((n,e)=>n+mins(e),0)`),30);
});
check('Malformed backups are rejected before replacing saved work',()=>{
 freshPlan();const original=run('JSON.stringify(state)');
 for(const mutate of [`x.profile.hours=[8]`,`x.entries=[${entrySource},{...${entrySource}}]`,`x.entries=[{...${entrySource},start:'25:00'}]`,`x.entries=[{...${entrySource},category:'unknown'}]`,`x.entries=[{...${entrySource},repeat:'weekly',days:[]}]`,`x.review.from='2026-02-30'`,`x.flex=[{id:'x',title:'Bad',category:'spa-cpd',hours:Infinity,sessions:1}]`])assert.throws(()=>run(`(()=>{const x=structuredClone(state);${mutate};validateData(x)})()`));
 assert.equal(run('JSON.stringify(state)'),original);
});
check('Storage write failure rolls back the attempted change',()=>{
 freshPlan();run('save()');const before=storage.get('cnwl-job-planner-v1'),stateBefore=run('JSON.stringify(state)'),writer=context.localStorage.setItem;
 context.localStorage.setItem=()=>{throw Error('Quota exceeded')};
 try{assert.equal(run(`commitWorkChange({...structuredClone(state),entries:[${entrySource}]},'Test')`),false);assert.equal(run('JSON.stringify(state)'),stateBefore);assert.equal(storage.get('cnwl-job-planner-v1'),before);assert.ok(run('storageError').includes('could not save'));}finally{context.localStorage.setItem=writer;}
});
check('A newer browser tab cannot be overwritten by an older plan',()=>{
 freshPlan();run('save()');const newer=JSON.parse(storage.get('cnwl-job-planner-v1'));newer.profile.name='Newer tab';storage.set('cnwl-job-planner-v1',JSON.stringify(newer));
 assert.equal(run(`commitWorkChange({...structuredClone(state),entries:[${entrySource}]},'Test')`),false);assert.equal(JSON.parse(storage.get('cnwl-job-planner-v1')).profile.name,'Newer tab');assert.equal(run('tabConflict'),true);
});
check('Changing agreed planned work requires renewed sign-off',()=>{
 freshPlan();run(`state.review.status='Agreement recorded';state.review.reviewer='Test manager';state.review.date=today();state.review.managerSignedOff=true;save();`);assert.equal(run('planIsApproved()'),true);
 assert.equal(run(`commitWorkChange({...structuredClone(state),entries:[${entrySource}]},'Updated')`),true);assert.equal(run('planIsApproved()'),false);assert.equal(run('state.review.status'),'Draft');
});
check('Recording actual time does not invalidate an agreed prospective plan',()=>{
 freshPlan();run(`state.review.status='Agreement recorded';state.review.reviewer='Test manager';state.review.date=today();state.review.managerSignedOff=true;save();`);
 assert.equal(run(`motionCommit(buildMotionDialChange('dcc-ip',60,state,'2026-10-23','standard'),'Recorded')`),true);assert.equal(run('planIsApproved()'),true);
});
check('Large recurrence expansion fails safely without deleting activities',()=>{
 freshPlan();run(`state.entries=Array.from({length:60},(_,i)=>({...${entrySource},id:'large-'+i,date:'2020-01-01',until:'2030-12-31',days:[0,1,2,3,4,5,6]}));`);const before=run('JSON.stringify(state)');
 assert.throws(()=>run(`occurrences('2020-01-01','2030-12-31')`),/100,000/);assert.equal(run('JSON.stringify(state)'),before);freshPlan();
});
class TestFormData{
 constructor(form){this.data=form.data;}
 get(key){return this.data[key]??null;}
 has(key){return Object.hasOwn(this.data,key);}
 getAll(key){return Array.isArray(this.data[key])?this.data[key]:this.has(key)?[this.data[key]]:[];}
}
check('Starting a fresh plan retains the explicitly chosen diary layout',()=>{
 freshPlan();const originalFormData=context.FormData;context.FormData=TestFormData;
 try{
  for(const layout of ['timeline','week','day']){
   run(`chooseDiaryLayout('${layout}');openRestart();`);context.testForm={data:{resetMode:'work'}};run('confirmRestart(testForm)');
   assert.equal(run('diaryLayout'),layout);assert.equal(run('preferredDiaryLayout'),layout);assert.equal(run('state.profile.name'),'Synthetic test');
  }
 }finally{context.FormData=originalFormData;freshPlan();}
});
async function checkExportCancellation(){
 const originalFormData=context.FormData,originalPDF=run('exportPDF'),originalDownload=run('download');context.FormData=TestFormData;
 try{
  for(const output of ['pdf','pack']){
   for(const outcome of ['resolve','reject']){
    freshPlan();run(`state.profile.division='Corporate';state.profile.borough='Trust-wide';state.profile.team='Synthetic team';state.profile.profession='Lived experience / peer support';save();openExport();`);
    const form=element('export-form');form.elements=[];form.data={output,format:'summary',from:'2026-10-01',to:'2026-11-30'};nodes.set('export-form',form);context.testForm=form;document.getElementById('pdf-download').disabled=false;
    run(`var debugDownloads=0;var finishDebugPDF,rejectDebugPDF;var debugPDFStartedResolve;var debugPDFStarted=new Promise(resolve=>debugPDFStartedResolve=resolve);exportPDF=()=>{debugPDFStartedResolve();return new Promise((resolve,reject)=>{finishDebugPDF=resolve;rejectDebugPDF=reject})};download=()=>{debugDownloads++};var debugPending=submitPDFExport(testForm);`);
    await run('debugPDFStarted');
    run(`closeModal();openFlex();`);const before=nodes.get('modal-body').innerHTML;
    run(outcome==='resolve'?`finishDebugPDF(new Uint8Array([1,2,3]));`:`rejectDebugPDF(Error('Simulated PDF failure'));`);await run('debugPending');
    check(`Cancelled ${output} export (${outcome}) preserves a newly opened form`,()=>{
     assert.equal(run("$('modal').open"),true);assert.equal(nodes.get('modal-title').textContent,'Add work across the year');assert.equal(nodes.get('modal-body').innerHTML,before);assert.equal(run('debugDownloads'),0);assert.ok(run('dialogContext')!==null);
    });
   }
  }
  freshPlan();run(`state.profile.division='Corporate';state.profile.borough='Trust-wide';state.profile.team='Synthetic team';state.profile.profession='Lived experience / peer support';save();`);
  const before=storage.get('cnwl-job-planner-v1');
  await assert.rejects(run('prepareReportPack(false,()=>false)'),/cancelled/i);
  check('Cancelling report preparation does not write a reporting reference',()=>assert.equal(storage.get('cnwl-job-planner-v1'),before));
 }finally{context.FormData=originalFormData;context.restorePDF=originalPDF;context.restoreDownload=originalDownload;run('exportPDF=restorePDF;download=restoreDownload;');freshPlan();}
}
// Run the embedded export engines too: this catches missing fonts/libraries or
// incompatible summary rows even when a remote browser cannot capture downloads.
async function checkExports(){
 freshPlan();
 context.atob=atob;context.btoa=btoa;context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;
 for(const [,attributes,script] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(!attributes.includes('app-script'))vm.runInContext(script,context,{timeout:10000});
 }
 const result=await run(`(async()=>{
  state.entries=[{id:'export-fixture',title:'Synthetic support',category:'dcc-ip',timeType:'standard',date:'2026-10-26',start:'09:00',end:'11:00',repeat:'weekly',until:'2026-11-09',days:[0],excluded:[],notes:''}];
  state.flex=[{id:'flex-fixture',title:'Synthetic supervision',category:'supervision',hours:1.5,sessions:6,timeType:'standard',notes:''}];
  state.profile.notes='Private export test note';validateData(state);
  const row=buildSummaryRow(state,{personId:'TEST001',sequence:1},true);
  const xlsx=JobPlanXlsx.build(row);
  const pdf=await exportPDF(state.review.from,state.review.to,false,false,structuredClone(state),row);
  const reopened=await PDFLib.PDFDocument.load(pdf);
  return {row,pdfPrefix:String.fromCharCode(...pdf.slice(0,5)),pages:reopened.getPageCount(),pdfBytes:pdf.length,xlsxPrefix:Array.from(xlsx.slice(0,4)),xlsxBytes:xlsx.length};
 })()`);
 check('Embedded PDF engine creates a readable five-page report',()=>{assert.equal(result.pdfPrefix,'%PDF-');assert.equal(result.pages,5);assert.ok(result.pdfBytes>10000);});
 check('Embedded Excel engine creates an XLSX archive with consistent planned totals',()=>{assert.deepEqual(Array.from(result.xlsxPrefix),[80,75,3,4]);assert.ok(result.xlsxBytes>10000);assert.equal(result.row.scheduled_work_hours,6);assert.equal(result.row.flexible_work_hours,9);assert.equal(result.row.total_work_hours,15);assert.ok(!JSON.stringify(result.row).includes('Private export test note'));});
 await checkExportCancellation();
 console.log(`Completed ${checked} planner regression checks.`);
}
checkExports().catch(error=>{console.error(error);process.exitCode=1;});
