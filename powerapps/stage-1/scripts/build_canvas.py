"""Build the native Power Apps Studio code-paste prototype (not an .msapp)."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'canvas' / 'JobPlanner.pa.yaml'
INK = 'ColorValue("#18324B")'
BLUE = 'ColorValue("#275D82")'
MUTED = 'ColorValue("#52677A")'
WHITE = 'Color.White'

def node(name, control, props, children=None, variant=None):
    value = {'Control': control}
    if variant: value['Variant'] = variant
    value['Properties'] = {k: '=' + str(v) for k,v in props.items()}
    if children is not None: value['Children'] = children
    return {name: value}

def label(name, text, x, y, w, h=32, size=14, color=INK, bold=False, formula=False, **extra):
    return node(name, 'Label', dict(Text=text if formula else json.dumps(text, ensure_ascii=False), X=x,Y=y,Width=w,Height=h,Size=size,Color=color,Font="Font.'Segoe UI'",FontWeight='FontWeight.Semibold' if bold else 'FontWeight.Normal',PaddingLeft=0,PaddingRight=0,**extra))

def button(name, text, action, x, y, w=180, h=44, fill=BLUE, color=WHITE, **extra):
    return node(name, 'Classic/Button',dict(Text=json.dumps(text,ensure_ascii=False),OnSelect=action,X=x,Y=y,Width=w,Height=h,Fill=fill,Color=color,BorderThickness=0,Size=14,Font="Font.'Segoe UI'",RadiusTopLeft=8,RadiusTopRight=8,RadiusBottomLeft=8,RadiusBottomRight=8,FocusedBorderThickness=3,TabIndex=0,**extra))

def input_(name, text, default, field, x,y,w=300):
    return [label(name+'Label',text,x,y,w),node(name,'Classic/TextInput',dict(Default=default,X=x,Y=y+34,Width=w,Height=42,Size=14,Font="Font.'Segoe UI'",Color=INK,Fill=WHITE,BorderColor='ColorValue("#A9B9C6")',BorderThickness=1,AccessibleLabel=json.dumps(text),TabIndex=0,MaxLength=120,OnChange=f'If(Self.Text <> First(colJPFProfile).{field}, Patch(colJPFProfile, First(colJPFProfile), {{{field}: Self.Text}}); Set(varJPFDirty, true))'))]

def panel(name, page, children):
    return node(name,'GroupContainer',dict(X=32,Y=156,Width='Parent.Width-64',Height='Parent.Height-208',Fill='RGBA(0,0,0,0)',Visible=f'varJPFPage="{page}"'),children,variant='ManualLayout')

samples = [
    (1,'Mon','One-to-one support','dcc-ip','Direct care / support',120,'#E5EEFC'),
    (2,'Mon','Care planning and follow-up','icc-ip','Care-related work',75,'#E9F4E6'),
    (3,'Tue','Peer support group','dcc-nip','Group care / support',90,'#E2F4F2'),
    (4,'Tue','Team meeting','spa-csm','Team / management',60,'#FCEEE2'),
    (5,'Wed','Supervision and reflection','supervision','Supervision / reflection',60,'#EEE8F9'),
    (6,'Wed','Learning and development','spa-cpd','Learning / development',120,'#FAE6E5'),
    (7,'Thu','Co-production workshop','coproduction','Co-production',120,'#E1F3F7'),
    (8,'Thu','Service improvement','research','Research / improvement',60,'#FAEAEF'),
    (9,'Fri','One-to-one support','dcc-ip','Direct care / support',120,'#E5EEFC'),
    (10,'Fri','Travel for work','travel','Travel',60,'#EDEBF3'),
]
records = ',\n'.join('{RowId:%d,DayLabel:%s,ActivityTitle:%s,CategoryId:%s,CategoryLabel:%s,DurationMinutes:%d,Tint:%s}'%(a,json.dumps(b),json.dumps(c),json.dumps(d),json.dumps(e),f,json.dumps(g)) for a,b,c,d,e,f,g in samples)
init = '''If(!varJPFReady,
    Set(varJPFPage, "home"); Set(varJPFLayout, "Horizontal"); Set(varJPFDirty, false);
    ClearCollect(colJPFProfile, {DisplayName:"Alex Example", RoleTitle:"Peer Support Worker (example)", TeamName:"Example team", WeeklyHours:37.5});
    ClearCollect(colJPFActivities, %s);
    ClearCollect(colJPFDisplayRows, colJPFActivities);
    ClearCollect(colJPFSavedProfile, colJPFProfile); ClearCollect(colJPFSavedActivities, colJPFActivities);
    Set(varJPFSaveMessage, "Fictional sample loaded. Shared storage is not connected.");
    Set(varJPFReady, true)
)''' % records

save = '''ClearCollect(colJPFSavedProfile, colJPFProfile); ClearCollect(colJPFSavedActivities, colJPFActivities);
Set(varJPFDirty, false); Set(varJPFSaveMessage, "Test draft saved for this open session. Shared storage is not connected.");
Notify("Test draft saved in this session.", NotificationType.Success)'''
reopen = '''ClearCollect(colJPFProfile, colJPFSavedProfile); ClearCollect(colJPFActivities, colJPFSavedActivities);
Reset(JPFName); Reset(JPFRole); Reset(JPFTeam); Reset(JPFWeeklyHours);
Set(varJPFDirty, false); Set(varJPFSaveMessage, "Saved session draft reopened.");
Notify("Saved session draft reopened.", NotificationType.Success)'''

children = [
    node('JPFHeader','Rectangle',dict(X=0,Y=0,Width='Parent.Width',Height=72,Fill=INK)),
    label('JPFBrand','CNWL  /  Job Planner',32,12,'Parent.Width-340',46,24,WHITE,True),
    label('JPFStage','STAGE 1 · DEVELOPMENT', 'Parent.Width-290',20,260,32,12,'ColorValue("#D9E9F5")',True),
]
for i,(key,title) in enumerate([('home','Home'),('details','My details'),('planner','Weekly planner'),('foundation','Build progress')]):
    children.append(button('JPFNav'+key,title,f'Set(varJPFPage,"{key}")',f'32+{i}*(Parent.Width-64)/4',86,'(Parent.Width-88)/4',44,fill=f'If(varJPFPage="{key}", {BLUE}, ColorValue("#E6EEF4"))',color=f'If(varJPFPage="{key}", Color.White, {INK})'))
children += [
    label('JPFFooter','"TEST DATA ONLY · " & If(varJPFDirty,"Unsaved session changes",varJPFSaveMessage)',32,'Parent.Height-46','Parent.Width-64',38,11,MUTED,formula=True),
]
home=[
    label('JPFWelcome','Plan time for your whole role',0,0,'Parent.Width',48,28,bold=True),
    label('JPFWelcomeHelp','A clear plan for work, learning and support. Start with your details, then try the hours sliders.',0,52,'Parent.Width',48,15,MUTED),
]
cards=[('Annual','▦   Annual Job Plan','Working hours, leave and annual commitments','details','#E5EEFC'),('Diary','◷   Weekly planner','Compact rows, clear categories and hours sliders','planner','#E2F4F2'),('Insight','▥   Insights','Individual insights: stage 3. Master reporting: stage 4.','foundation','#EEE8F9'),('Review','✓   Review and agree','Discussion, manager review and version history: stage 3.','foundation','#FCEEE2')]
for i,(key,title,desc,page,tint) in enumerate(cards):
    x='0' if i%2==0 else '(Parent.Width+20)/2'
    y=120+(i//2)*136
    w='(Parent.Width-20)/2'
    home += [button('JPFCard'+key,title,f'Set(varJPFPage,"{page}")',x,y,w,72,fill=f'ColorValue("{tint}")',color=INK),label('JPFCardHint'+key,desc,x,y+76,w,48,12,MUTED)]
home += [label('JPFHomeScope','This prototype tests the screen layout and hours controls. Annual calculations, approvals and shared reporting come in the next stages.',0,404,'Parent.Width',60,13,MUTED)]
children.append(panel('JPFHomePanel','home',home))

details=[label('JPFDetailsHeading','Your details and working time',0,0,'Parent.Width',46,26,bold=True),label('JPFDetailsHelp','Use fictional details while we connect and test shared storage.',0,50,'Parent.Width',32,14,MUTED)]
details += input_('JPFName','Example name','First(colJPFProfile).DisplayName','DisplayName',0,100,'(Parent.Width-24)/2')
details += input_('JPFRole','Role','First(colJPFProfile).RoleTitle','RoleTitle','(Parent.Width+24)/2',100,'(Parent.Width-24)/2')
details += input_('JPFTeam','Team or service','First(colJPFProfile).TeamName','TeamName',0,200,'(Parent.Width-24)/2')
details += [label('JPFWeeklyLabel','Usual paid hours each week','(Parent.Width+24)/2',200,'(Parent.Width-24)/2'),node('JPFWeeklyHours','Classic/TextInput',dict(Default='Text(First(colJPFProfile).WeeklyHours)',X='(Parent.Width+24)/2',Y=234,Width='(Parent.Width-24)/2',Height=42,Size=14,AccessibleLabel='"Usual paid hours each week, between 0 and 168"',Format='TextFormat.Number',BorderColor='ColorValue("#A9B9C6")',OnChange='If(IsNumeric(Self.Text) && Value(Self.Text)>=0 && Value(Self.Text)<=168, If(Value(Self.Text)<>First(colJPFProfile).WeeklyHours,Patch(colJPFProfile,First(colJPFProfile),{WeeklyHours:Value(Self.Text)});Set(varJPFDirty,true)), Notify("Enter a number between 0 and 168 hours.",NotificationType.Error);Reset(Self))'))]
details += [label('JPFAnnualNext','Annual planning is part of the main app',0,314,'Parent.Width',34,18,bold=True),label('JPFAnnualScope','Stage 2 adds plan dates, daily working patterns, leave allowances and undated annual work. Supervision, learning and co-production count as work.',0,352,'Parent.Width',60,14,MUTED),button('JPFSaveDetails','Save test draft',save,0,434),button('JPFReopenDetails','Reopen saved draft',reopen,196,434,210,fill='ColorValue("#E6EEF4")',color=INK)]
children.append(panel('JPFDetailsPanel','details',details))

planner=[label('JPFPlannerHeading','Your week at a glance',0,0,'Parent.Width-300',46,26,bold=True),label('JPFPlannerSummary','Text(Sum(colJPFActivities,DurationMinutes)/60) & " h planned  /  " & Text(First(colJPFProfile).WeeklyHours) & " h available"','Parent.Width-300',4,300,40,15,BLUE,True,True),label('JPFPlannerHelp','Adjust each activity in 15-minute steps. Compact rows show more of your plan.',0,50,'Parent.Width',32,14,MUTED)]
planner += [button('JPFHorizontal','Horizontal','Set(varJPFLayout,"Horizontal")',0,92,160,38,fill='If(varJPFLayout="Horizontal",ColorValue("#275D82"),ColorValue("#E6EEF4"))',color='If(varJPFLayout="Horizontal",Color.White,ColorValue("#18324B"))'),button('JPFVertical','Vertical','Set(varJPFLayout,"Vertical")',172,92,148,38,fill='If(varJPFLayout="Vertical",ColorValue("#275D82"),ColorValue("#E6EEF4"))',color='If(varJPFLayout="Vertical",Color.White,ColorValue("#18324B"))'),label('JPFUnallocated','If(First(colJPFProfile).WeeklyHours*60>=Sum(colJPFActivities,DurationMinutes),Text(First(colJPFProfile).WeeklyHours-Sum(colJPFActivities,DurationMinutes)/60) & " h left to plan", Text(Sum(colJPFActivities,DurationMinutes)/60-First(colJPFProfile).WeeklyHours) & " h above weekly hours")',340,92,'Parent.Width-340',38,14,MUTED,formula=True)]
row=[node('JPFRowBackground','Rectangle',dict(X=0,Y=0,Width='Parent.TemplateWidth',Height='If(varJPFLayout="Horizontal",46,98)',Fill='ColorValue(ThisItem.Tint)')),
label('JPFDay','ThisItem.DayLabel',8,7,44,38,13,bold=True,formula=True),
label('JPFActivity','ThisItem.ActivityTitle',60,0,'If(varJPFLayout="Horizontal",Parent.TemplateWidth*0.35,Parent.TemplateWidth-170)',26,13,bold=True,formula=True),
label('JPFCategory','ThisItem.CategoryLabel',60,24,'If(varJPFLayout="Horizontal",Parent.TemplateWidth*0.35,Parent.TemplateWidth-170)',20,11,MUTED,formula=True),
node('JPFDuration','Classic/Slider',dict(X='If(varJPFLayout="Horizontal",Parent.TemplateWidth*0.44,60)',Y='If(varJPFLayout="Horizontal",8,54)',Width='If(varJPFLayout="Horizontal",Parent.TemplateWidth*0.4,Parent.TemplateWidth-160)',Height=36,Min=1,Max=32,Default='LookUp(colJPFActivities,RowId=ThisItem.RowId).DurationMinutes/15',OnChange='If(Round(Self.Value,0)*15<>LookUp(colJPFActivities,RowId=ThisItem.RowId).DurationMinutes,Patch(colJPFActivities,LookUp(colJPFActivities,RowId=ThisItem.RowId),{DurationMinutes:Round(Self.Value,0)*15});Set(varJPFDirty,true))',ShowValue='false',AccessibleLabel='ThisItem.DayLabel & " " & ThisItem.ActivityTitle & "; each step is 15 minutes"',TabIndex=0,FocusedBorderThickness=3,ValueFill=BLUE,RailFill='ColorValue("#9AADB9")')),
label('JPFHours','Text(LookUp(colJPFActivities,RowId=ThisItem.RowId).DurationMinutes/60) & " h"','Parent.TemplateWidth-82',8,72,34,15,BLUE,True,True)]
planner += [node('JPFActivityGallery','Gallery',dict(X=0,Y=136,Width='Parent.Width',Height='Parent.Height-200',Items='colJPFDisplayRows',TemplateSize='If(varJPFLayout="Horizontal",46,98)',TemplatePadding=4,AccessibleLabel='"Example weekly activities and duration sliders"',ShowScrollbar='true'),row,variant='Vertical'),button('JPFSavePlanner','Save test draft',save,0,'Parent.Height-52'),button('JPFReopenPlanner','Reopen saved draft',reopen,196,'Parent.Height-52',210,fill='ColorValue("#E6EEF4")',color=INK)]
children.append(panel('JPFPlannerPanel','planner',planner))

foundation=[label('JPFFoundationHeading','Building the complete planning tool',0,0,'Parent.Width',46,26,bold=True),label('JPFFoundationIntro','Stage 1 establishes the screens, calculations to preserve and the shared data design.',0,52,'Parent.Width',42,14,MUTED)]
for i,(title,desc) in enumerate([
('1  Foundations · in progress','Native Power Apps prototype. Shared storage and two-user access checks are pending.'),
('2  Complete planning','Daily patterns, annual commitments, leave, repeating activities and timetable editing.'),
('3  Review and individual insights','Discussion, sign-off, retained versions, work mix and time-in-motion tools.'),
('4  Master reporting','Approved summaries, entry checks, team directory and management dashboard.'),
('5  Migration and launch','Checked imports, PDF and Excel outputs, pilot testing and handover.')]):
    foundation.extend([label('JPFStageTitle'+str(i),title,0,110+i*72,'Parent.Width',30,16,bold=True),label('JPFStageDesc'+str(i),desc,0,142+i*72,'Parent.Width',34,12,MUTED)])
children.append(panel('JPFFoundationPanel','foundation',foundation))

document={'Screens':{'JPFHome':{'Properties':{'Fill':'=ColorValue("#F5F8FB")','OnVisible':'='+init,'Width':'=Max(App.Width, 760)','Height':'=Max(App.Height, 768)'},'Children':children}}}

def yaml_lines(obj, indent=0):
    pad=' '*indent
    if isinstance(obj,dict):
        for k,v in obj.items():
            if isinstance(v,(dict,list)):
                yield pad+k+':'
                yield from yaml_lines(v,indent+2)
            else:
                # JSON strings are valid YAML quoted scalars; block style for multiline formulas.
                if '\n' in str(v):
                    yield pad+k+': |-'
                    for line in str(v).splitlines():yield ' '*(indent+2)+line
                else: yield pad+k+': '+json.dumps(v,ensure_ascii=False)
    elif isinstance(obj,list):
        for item in obj:
            lines=list(yaml_lines(item,indent+2))
            yield pad+'- '+lines[0][indent+2:]
            yield from lines[1:]

OUT.write_text('\n'.join(yaml_lines(document))+'\n')
(ROOT/'data'/'prototype-fixtures.json').write_text(json.dumps({'profile':{'DisplayName':'Alex Example','RoleTitle':'Peer Support Worker (example)','TeamName':'Example team','WeeklyHours':37.5},'activities':[{'RowId':a,'DayLabel':b,'ActivityTitle':c,'CategoryId':d,'CategoryLabel':e,'DurationMinutes':f,'Tint':g} for a,b,c,d,e,f,g in samples]},indent=2)+'\n')
print(str(OUT))
