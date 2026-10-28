"""Generate a reviewable list design. This script makes no network calls."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
def field(name,type='Text',**kwargs):return dict(name=name,type=type,**kwargs)
def key(name):return field(name,required=True,indexed=True,unique=True)
def link(name,target):return field(name,required=True,indexed=True,references=target)
def number(name,**kwargs):return field(name,'Number',minimum=0,**kwargs)
def minutes(name,**kwargs):return number(name,integer=True,unit='minutes',**kwargs)
def date(name,**kwargs):return field(name,'DateOnly',**kwargs)
def choice(name,values,**kwargs):return field(name,'Choice',choices=values,**kwargs)
def text(name,**kwargs):return field(name,'Note',plainText=True,**kwargs)
plan=lambda:link('PlanGuid','JP_Plans.PlanGuid')
types=['standard','paid_overtime','unpaid_overtime']
stores=[]
def add(name,purpose,access,columns,**extra):
    stores.append(dict(name=name,purpose=purpose,accessBoundary=access,columns=columns,versioning=True,**extra))

add('JP_Plans','Identity and editable draft metadata','Plan owner and assigned reviewers; owner/assignment changes through protected process',[
    key('PlanGuid'),field('ReferenceCode',required=True,indexed=True),field('StaffObjectId',required=True,indexed=True),
    field('StaffPerson','Person',required=True),field('DisplayName'),field('RoleTitle'),field('TeamKey',indexed=True),
    field('DivisionKey',indexed=True),field('SubdivisionKey',indexed=True),field('BoroughKey',indexed=True),field('ProfessionKey',indexed=True),
    date('PeriodStart',required=True,indexed=True),date('PeriodEnd',required=True,indexed=True),
    date('NextReview'),number('DraftRevision',integer=True),field('HoursConfirmed','Boolean'),
    minutes('AnnualLeaveAllowance'),minutes('BankHolidayAllowance'),minutes('OtherAbsenceAllowance'),
    choice('DisplayedState',['Draft','Submitted','Changes requested','Agreed'],authority='advisory only; reconcile against protected approvals'),
    field('SchemaVersion'),field('LastSavedAt','DateTimeUTC')])

add('JP_Assignments','Authoritative plan ownership and reviewer assignment','Nominated administrator or protected process writes; participants read only their applicable assignments',[
    key('AssignmentGuid'),plan(),field('ParticipantObjectId',required=True,indexed=True),
    choice('ParticipantRole',['Owner','Manager','Second reviewer'],required=True),
    date('EffectiveFrom',required=True),date('EffectiveTo'),field('Active','Boolean'),
    field('AssignedByObjectId',required=True),field('AssignedAt','DateTimeUTC',required=True)],
    trustRule='Staff cannot appoint themselves as a reviewer or reassign plan ownership through a draft edit')

add('JP_WorkingPatterns','Date-effective paid hours for all seven weekdays','Inherit the plan permission boundary',[
    key('PatternGuid'),plan(),date('EffectiveFrom',required=True),date('EffectiveTo',required=True),
    *[minutes(day+'Minutes',maximum=1440,required=True) for day in ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']]])

add('JP_Activities','Dated planned work or a repeat series','Inherit the plan permission boundary',[
    key('ActivityGuid'),plan(),field('ActivityTitle',required=True,maxLength=160),
    link('CategoryId','JP_Categories.CategoryId'),choice('TimeType',types,required=True),
    date('AnchorDate',required=True,indexed=True),minutes('StartMinute',maximum=1439),minutes('EndMinute',maximum=1439),
    field('Overnight','Boolean'),minutes('BreakMinutes',maximum=1439),
    field('DurationOnly','Boolean'),minutes('DurationMinutes',maximum=1440),
    choice('RepeatType',['none','daily','weekly','fortnightly','monthly'],note='Confirm exact legacy values during stage 2 migration mapping'),
    date('RepeatUntil'),date('RepeatCutoff'),field('Location',maxLength=200),text('ActivityNotes',maxLength=5000),
    field('IsExample','Boolean')])

add('JP_Exceptions','Occurrence exclusion or replacement','Inherit the plan permission boundary',[
    key('ExceptionKey'),plan(),link('SeriesGuid','JP_Activities.ActivityGuid'),date('OccurrenceDate',required=True),
    choice('Action',['Skip','Replace'],required=True),field('ReplacementActivityGuid',references='JP_Activities.ActivityGuid')],
    uniqueRule='ExceptionKey = SeriesGuid + civil occurrence date; one active exception per occurrence')

add('JP_AnnualWork','Undated annual commitments','Inherit the plan permission boundary',[
    key('CommitmentGuid'),plan(),field('ActivityTitle',required=True,maxLength=160),link('CategoryId','JP_Categories.CategoryId'),
    choice('TimeType',types,required=True),minutes('MinutesPerSession',required=True),number('SessionCount',integer=True,required=True),
    field('CheckedForDiaryDuplication','Boolean')])

add('JP_Discussions','Private review conversation and support needs','Plan owner and assigned reviewers; no default access for reporting editors',[
    key('DiscussionGuid'),plan(),*[text(x,maxLength=5000) for x in ['Needs','Objectives','Resources','Adjustments','Supervision','Discussion']],
    date('DiscussionDate'),field('LastSavedAt','DateTimeUTC')])

add('JP_RecordedTime','Retrospective actual work and personal reflections','Owner only by default; further access explicitly agreed',[
    key('ActualGuid'),plan(),date('WorkDate',required=True,indexed=True),link('CategoryId','JP_Categories.CategoryId'),
    choice('TimeType',types,required=True),minutes('StartMinute',maximum=1439),minutes('EndMinute',maximum=1439),
    field('Overnight','Boolean'),minutes('BreakMinutes',maximum=1439),minutes('DurationMinutes',maximum=1440),
    field('PlannedOccurrenceKey',note='Unique when populated; matches series ID and civil date'),
    *[text(x,maxLength=5000) for x in ['WhatHelped','WhatMadeWorkHarder','OneChangeToTry','BenefitForServiceUsers','HowWeWillKnow']]])

add('JP_Approvals','Authoritative decisions tied to an immutable version','Protected service-owned store; users submit authenticated requests, not direct writes',[
    key('ApprovalGuid'),plan(),field('VersionGuid',required=True,indexed=True),field('SnapshotFingerprint',required=True),
    field('ReviewerObjectId',required=True),choice('ReviewerRole',['Manager','Second reviewer'],required=True),
    choice('Decision',['Submitted','Approved','Changes requested','Withdrawn'],required=True),field('DecisionAt','DateTimeUTC',required=True),
    field('WorkflowRequestKey',indexed=True,unique=True),text('DecisionComment',maxLength=5000)],
    trustRule='Resolve reviewer assignment and caller identity in a protected process; do not trust email/status supplied by a canvas client')

add('JP_ApprovedSummaries','Reporting-safe output for exact approved versions','Protected process writes; authorised reporting readers',[
    key('SummaryKey'),field('ReferenceCode',required=True,indexed=True),field('VersionGuid',required=True,indexed=True),
    field('SnapshotFingerprint',required=True),date('PeriodStart',required=True,indexed=True),date('PeriodEnd',required=True,indexed=True),
    *[field(x,indexed=True) for x in ['DivisionKey','SubdivisionKey','BoroughKey','TeamKey','ProfessionKey']],
    *[minutes(x) for x in ['GrossMinutes','AbsenceDeductionMinutes','AvailableMinutes','ScheduledUsualMinutes','AnnualUsualMinutes','PaidOvertimeMinutes','UnpaidOvertimeMinutes']],
    text('CategoryTotalsJson',note='Generated totals by stable category ID, dated/undated and time type; complete sums must be independently checked'),
    field('Eligible','Boolean',indexed=True),field('CalculationVersion',required=True),field('GeneratedAt','DateTimeUTC')],
    uniqueRule='One current counted summary per reference + exact period, with a retained immutable version history',
    excluded=['staff names','private discussion','sickness detail','actual time','personal reflections'])

add('JP_Directory','Controlled organisational and profession choices','Nominated editor writes; authorised app users read',[
    key('DirectoryKey'),choice('EntryType',['Team','Division','Subdivision','Borough','Profession'],required=True),
    field('DisplayName',required=True),field('ParentKey'),text('AliasesJson'),field('Active','Boolean'),date('EffectiveFrom'),date('EffectiveTo')])

add('JP_Categories','Original planner category taxonomy and visual tokens','Nominated editor writes; authorised app users read',[
    key('CategoryId'),field('DisplayName',required=True),field('ShortName'),field('ReportingCode'),field('CategoryGroup'),
    field('Tint'),field('Accent'),field('IsWork','Boolean'),field('IsPaid','Boolean'),number('SortOrder',integer=True),field('Active','Boolean')])

spec={'schemaVersion':1,'status':'DESIGN ONLY — NOT PROVISIONED','baselinePlannerVersion':'2.1.5',
      'timeUnit':'integer minutes','planningDates':'date-only civil dates','auditTimestamps':'UTC',
      'securityGate':'Do not load real staff data until data-source isolation and protected approval writes pass the two-account tests.',
      'permissionImplementation':'Pending feasibility test; logical accessBoundary values are not SharePoint permissions.',
      'stores':stores,'documentLibrary':{'name':'JobPlannerVersions','purpose':'Immutable submitted/approved snapshots and generated reports','creationStatus':'not created','access':'Authorised plan participants; generated exports scoped separately','versioning':True}}
(ROOT/'data'/'list-definitions.json').write_text(json.dumps(spec,indent=2,ensure_ascii=False)+'\n')
print(f'Wrote {len(stores)} proposed list definitions; no external changes.')
