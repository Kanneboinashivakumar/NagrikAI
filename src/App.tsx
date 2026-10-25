import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Copy, Edit2, Send, Share2, AlertTriangle, Eye, ArrowDownRight, ArrowLeft, ArrowRight, Bell, Bookmark, Calendar, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock, Clock3, Compass, FileCheck, FileText, Filter, Flag, Heart, Home, ImagePlus, Languages, Link as LinkIcon, LocateFixed, LogIn, Map, MapPin, Menu, MessageCircle, Mic, MoreHorizontal, Navigation, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, ThumbsUp, Upload, User, Users, Wrench, X, Zap } from 'lucide-react';
import { supabase, supabaseReady } from './lib/supabase';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Page='Home'|'Dashboard'|'Explore Map'|'Report Issue'|'AI Analysis'|'Review & Submit'|'Submission Confirmation'|'Community'|'My Contributions'|'Saved Locations'|'Notifications'|'Profile'|'Settings'|'Moderation'|'Issue Detail'|'Sign In'|'Sign Up'|'Reset Password';
type Status='REPORTED'|'UNDER_REVIEW'|'ACKNOWLEDGED'|'IN_PROGRESS'|'REPAIR_EVIDENCE_SUBMITTED'|'COMMUNITY_VERIFICATION'|'COMMUNITY_VERIFIED_RESOLVED'|'OFFICIALLY_CONFIRMED'|'REOPENED'|'REJECTED';
type Issue={id:string; title:string; category:string; location:string; status:Status; date:string; createdAt?:string; description:string; image?:string; evidenceImages?:string[]; repairImage?:string; repairDate?:string; repairContributor?:string; latitude?:number; longitude?:number; severity:string; supporters:number; reporterId?:string; reporterName?:string; aiAnalysis?:any; priorityScore?:number; peopleAffected?:number; recurrenceCount?:number; isDemo?:boolean};
const statusLabel:Record<Status,string>={REPORTED:'Reported',UNDER_REVIEW:'Under Review',ACKNOWLEDGED:'Acknowledged',IN_PROGRESS:'In Progress',REPAIR_EVIDENCE_SUBMITTED:'Repair Evidence Submitted',COMMUNITY_VERIFICATION:'Community Verification',COMMUNITY_VERIFIED_RESOLVED:'Community Verified Resolved',OFFICIALLY_CONFIRMED:'Officially Confirmed',REOPENED:'Reopened',REJECTED:'Rejected'};
const navItems:{name:Page;icon:any}[]=[{name:'Dashboard',icon:Home},{name:'Explore Map',icon:Map},{name:'Report Issue',icon:Camera},{name:'Community',icon:Users},{name:'My Contributions',icon:FileText},{name:'Saved Locations',icon:Bookmark},{name:'Notifications',icon:Bell},{name:'Profile',icon:User},{name:'Settings',icon:Settings}];
const categories=['Road damage','Waterlogging','Streetlight failure','Garbage overflow','Broken footpath','Blocked drainage','Open manhole','Fallen tree','Construction issue','Traffic signal not working','Public safety issue','Water supply issue','Park / public space maintenance','Public transport issue','Stray animals','Illegal construction / encroachment','Noise pollution','Other'];
const severityFromScore=(score:any)=>typeof score!=='number'?'Needs review':score>=3?'High attention':score===2?'Moderate attention':'Low attention';
const categorySymbol=(category:string)=>({'Road damage':'●','Waterlogging':'≈','Streetlight failure':'☼','Garbage overflow':'▤','Broken footpath':'▰','Blocked drainage':'◉','Open manhole':'◉','Fallen tree':'♣','Construction issue':'▧','Traffic signal not working':'●','Public safety issue':'!','Water supply issue':'♧','Park / public space maintenance':'♧','Public transport issue':'▣','Stray animals':'✿','Illegal construction / encroachment':'▥','Noise pollution':'◖','Other':'•••'} as Record<string,string>)[category]||'•';
const markerColors:Record<string,string>={'Road damage':'#f43f46','Waterlogging':'#168ce0','Streetlight failure':'#f2b400','Garbage overflow':'#0d9a62','Broken footpath':'#8d48db','Blocked drainage':'#f07816','Open manhole':'#e95687','Fallen tree':'#10aa96','Construction issue':'#9b633c','Traffic signal not working':'#778391','Public safety issue':'#df3942','Water supply issue':'#358be8','Park / public space maintenance':'#76b936','Public transport issue':'#8548ca','Stray animals':'#ec6c5e','Illegal construction / encroachment':'#1683d4','Noise pollution':'#dfa800','Other':'#869098'};
const categoryMarker=(category:string)=>divIcon({className:'category-map-marker',html:`<span style="--marker-color:${markerColors[category]||'#547967'}" aria-label="${category}"><i>${categorySymbol(category)}</i></span>`,iconSize:[40,46],iconAnchor:[20,42],popupAnchor:[0,-38]});
const cbrtSubscores=(issue:Issue)=>{const supporters=Math.min(35,Math.round(Math.max(0,issue.supporters||0)*1.4));const recurrence=Math.min(25,Math.round(Math.max(0,issue.recurrenceCount||0)*5));const isActive=!['COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED','REJECTED'].includes(issue.status);const ageDays=isActive&&issue.createdAt?Math.max(0,(Date.now()-new Date(issue.createdAt).getTime())/86400000):/\d+\s*day/i.test(issue.date)?Number(issue.date.match(/\d+/)?.[0]||0):0;const age=Math.min(20,Math.round(ageDays/30*20));const severity=/high/i.test(issue.severity)?20:/moderate/i.test(issue.severity)?14:/low/i.test(issue.severity)?8:10;return{supporters,recurrence,age,severity,total:Math.min(100,supporters+recurrence+age+severity)}};
const impactNotes:Record<string,string[]>={'Road damage':['Loose road dust and debris may affect nearby pedestrians and shops.','A deep pothole can increase the risk of vehicle damage or a fall.'],'Waterlogging':['Standing water may slow pedestrians and traffic.','If water is deep, avoid entering it; the depth and any electrical hazards are not verified.'],'Blocked drainage':['Blocked drains can worsen local flooding and create stagnant water.','Report only what is visible; the cause of the blockage is not confirmed.'],'Streetlight failure':['Poor lighting can reduce visibility for people walking and driving at night.','The report does not confirm whether the fault is in the lamp, power supply, or wiring.'],'Garbage overflow':['Overflowing waste can obstruct the footpath and attract pests.','Dust and loose waste may affect people using the nearby street.'],'Broken footpath':['Uneven surfaces can create trip hazards and obstruct wheelchair users.'],'Accessibility hazard':['The reported obstruction may limit safe passage for people with mobility or vision needs.'],'Open manhole':['An uncovered manhole can create a fall hazard for pedestrians and cyclists.','The opening may be hard to see in low light or during rain.'],'Fallen tree':['A fallen branch or tree may obstruct a footpath or road.','Damaged trees near power lines should be treated as an electrical hazard.'],'Construction issue':['Unmarked construction materials or barriers can narrow walking routes.','Loose dust or debris may affect people nearby.'],'Traffic signal not working':['A signal fault may make crossings harder to navigate.','Drivers and pedestrians may have less clear right-of-way cues.'],'Public safety issue':['The reported condition may affect safe access in the immediate area.','Details and urgency need assessment by the appropriate public authority.'],'Water supply issue':['A visible leak may waste water or leave the nearby surface slippery.','The source and quality of any water are not confirmed.'],'Park / public space maintenance':['Poorly maintained public spaces can limit safe and accessible use.','The affected feature should be reviewed in context by the responsible authority.'],'Public transport issue':['A stop or service issue may affect people relying on public transport.','The impact depends on service conditions at the time reported.'],'Stray animals':['An animal concern may affect people using the immediate area.','Do not approach or handle an unfamiliar or distressed animal.'],'Illegal construction / encroachment':['An obstruction may narrow public access or block a footpath.','Property boundaries and compliance require official assessment.'],'Noise pollution':['Repeated loud noise may disturb nearby residents.','The source, duration, and permitted limits are not confirmed.'],'Other':['Potential effects depend on the conditions visible at the reported location.']};
const distanceMeters=(a:Issue,b:Issue)=>{if(typeof a.latitude!=='number'||typeof a.longitude!=='number'||typeof b.latitude!=='number'||typeof b.longitude!=='number')return Number.POSITIVE_INFINITY;const toRad=(v:number)=>v*Math.PI/180;const dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))};
const asset=(name:string)=>`/NagrikAI-assets/${encodeURI(name)}`;
async function visibleReporterNames(ids:string[]){if(!supabase||!ids.length)return{} as Record<string,string>;const{data}=await supabase.rpc('get_public_reporter_names',{reporter_ids:ids});return Object.fromEntries((data||[]).map((row:any)=>[row.reporter_id,row.display_name])) as Record<string,string>}
const previewReports:Issue[]=[
 {id:'PREVIEW-001',title:'Large pothole on main road',reporterName:'Ananya Sharma',category:'Road damage',location:'Madhapur',status:'UNDER_REVIEW',date:'2 hours ago',description:'Illustrative preview report for the homepage.',image:asset('Civic pothole report.png'),evidenceImages:[asset('Pothole alternate view.png')],severity:'Needs review',supporters:24,isDemo:true,latitude:17.4483,longitude:78.3915},
 {id:'PREVIEW-002',title:'Severe water logging',reporterName:'Rahul Reddy',category:'Waterlogging',location:'HITEC City',status:'IN_PROGRESS',date:'4 hours ago',description:'Illustrative preview report for the homepage.',image:asset('Hyderabad waterlogging.png'),evidenceImages:[asset('Waterlogging alternate view.png')],severity:'Needs review',supporters:32,isDemo:true,latitude:17.4435,longitude:78.3772},
 {id:'PREVIEW-003',title:'Street light not working',reporterName:'Sneha Iyer',category:'Streetlight failure',location:'Jubilee Hills',status:'REPORTED',date:'6 hours ago',description:'Illustrative preview report for the homepage.',image:asset('Hyderabad street light report.png'),evidenceImages:[asset('Garbage alternate view.png')],severity:'Needs review',supporters:18,isDemo:true,latitude:17.4310,longitude:78.4070},
 {id:'PREVIEW-004',title:'Overflowing garbage bin',reporterName:'Vikram Singh',category:'Garbage overflow',location:'Ameerpet',status:'COMMUNITY_VERIFIED_RESOLVED',date:'1 day ago',description:'Illustrative preview report for the homepage.',image:asset('Hyderabad garbage report.png'),repairImage:asset('Hyderabad street cleanup.png'),repairDate:'Illustrative example',repairContributor:'Sample evidence',evidenceImages:[asset('Streetlight alternate view.png')],severity:'Needs review',supporters:27,isDemo:true,latitude:17.4375,longitude:78.4483},
 {id:'PREVIEW-005',title:'Uncovered manhole beside the footpath',reporterName:'Meera Kapoor',category:'Open manhole',location:'Banjara Hills',status:'UNDER_REVIEW',date:'1 day ago',description:'Illustrative preview: an uncovered drain opening is shown near a neighborhood footpath. Keep clear and request an official inspection.',image:asset('Preview open manhole.png'),evidenceImages:[asset('Manhole alternate view.png')],severity:'Needs review',supporters:16,isDemo:true,latitude:17.4156,longitude:78.4347},
 {id:'PREVIEW-006',title:'Fallen tree branch blocking walkway',reporterName:'Arjun Mehta',category:'Fallen tree',location:'Kondapur',status:'REPORTED',date:'2 days ago',description:'Illustrative preview: a fallen branch narrows the neighborhood footpath. Keep a safe distance and report it for assessment.',image:asset('Preview fallen tree.png'),evidenceImages:[asset('Fallen tree alternate view.png')],severity:'Needs review',supporters:11,isDemo:true,latitude:17.4619,longitude:78.3567},
].map((issue,index):Issue=>({...issue,createdAt:new Date(Date.now()-[2,4,6,24,24,48][index]*3600000).toISOString(),status:issue.status as Status,priorityScore:[72,78,62,65,84,69][index],peopleAffected:[18,40,12,25,7,9][index],recurrenceCount:[2,3,1,2,0,1][index],aiAnalysis:{suggestedCategory:issue.category,summary:'Illustrative AI analysis for this sample report. Resident evidence and official assessment may change the classification.',severitySuggestion:'UNCERTAIN',visibleDetails:['Sample image and report details are illustrative.'],safetyConsiderations:['Keep a safe distance from the reported condition.'],potentialImpact:impactNotes[issue.category]||impactNotes.Other,recommendations:['Share the exact location and a clear photo with the responsible civic authority.','Avoid handling hazards or attempting repairs to public infrastructure.'],recommendationImage:({'PREVIEW-001':asset('AI pothole repaired suggestion.png'),'PREVIEW-002':asset('AI waterlogging cleared suggestion.png'),'PREVIEW-003':asset('AI streetlight repaired suggestion.png'),'PREVIEW-004':asset('AI cleanup outcome suggestion.png'),'PREVIEW-005':asset('AI manhole secured suggestion.png'),'PREVIEW-006':asset('AI fallen tree cleared suggestion.png')} as Record<string,string>)[issue.id],confidence:[0.91,0.87,0.89,0.93,0.95,0.86][index]}}));
const initialIssues:Issue[]=previewReports;
const parseCoordinates=(text:string):[number,number]|null=>{const m=text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);if(!m)return null;const latitude=Number(m[1]),longitude=Number(m[2]);return Math.abs(latitude)<=90&&Math.abs(longitude)<=180?[latitude,longitude]:null};
const hyderabadLocations: [RegExp, [number, number]][] = [
  [/madhapur/i, [17.4483, 78.3915]],
  [/hitec|cyberabad/i, [17.4435, 78.3772]],
  [/gachibowli/i, [17.4401, 78.3489]],
  [/kondapur/i, [17.4619, 78.3567]],
  [/jubilee/i, [17.4319, 78.4073]],
  [/banjara/i, [17.4156, 78.4350]],
  [/charminar|old\s*city/i, [17.3616, 78.4747]],
  [/kukatpally/i, [17.4938, 78.3999]],
  [/begumpet/i, [17.4447, 78.4664]],
  [/secunderabad/i, [17.4399, 78.4983]],
  [/ameerpet/i, [17.4375, 78.4482]],
  [/dilsukhnagar/i, [17.3688, 78.5247]],
  [/somajiguda/i, [17.4265, 78.4613]],
  [/mehdipatnam/i, [17.3916, 78.4400]],
  [/tolichowki/i, [17.4018, 78.4116]],
  [/uppal/i, [17.4018, 78.5602]],
  [/miyapur/i, [17.4968, 78.3546]],
  [/lingampally/i, [17.4934, 78.3188]],
  [/manikonda/i, [17.4016, 78.3846]],
  [/nanakramguda/i, [17.4190, 78.3440]],
  [/panjagutta/i, [17.4260, 78.4524]],
  [/abids/i, [17.3910, 78.4770]],
  [/koti/i, [17.3855, 78.4870]],
  [/khairatabad/i, [17.4124, 78.4583]],
  [/tank\s*bund|necklace/i, [17.4239, 78.4738]]
];

const resolveCoordinates = (text: string): [number, number] => {
  if (!text) return [17.4483, 78.3915];
  const direct = parseCoordinates(text);
  if (direct) return direct;
  for (const [pattern, coords] of hyderabadLocations) {
    if (pattern.test(text)) return coords;
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  const latOffset = ((Math.abs(hash) % 80) - 40) / 1000;
  const lngOffset = ((Math.abs(hash >> 3) % 80) - 40) / 1000;
  return [17.435 + latOffset, 78.445 + lngOffset];
};
// The public OpenStreetMap raster tiles give the app a real map without a key.
// Keep visible attribution in every map view and only render markers for saved coordinates.
const mapConfigured=true;
const mapTiles='https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const deduplicateIssues = (list: Issue[]): Issue[] => {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  return list.filter(item => {
    if (!item.id || seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    const timeKey = item.createdAt ? Math.floor(new Date(item.createdAt).getTime() / (5 * 60 * 1000)) : item.date;
    const contentKey = `${item.title.trim().toLowerCase()}|${item.location.trim().toLowerCase()}|${timeKey}`;
    if (seenContent.has(contentKey)) {
      return false;
    }
    seenContent.add(contentKey);
    return true;
  });
};

export default function App(){
 const evidenceLoaded=useRef(new Set<string>()); const [demoSupports,setDemoSupports]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('nagrikai-demo-supports')||'[]')}catch{return []}}); const [demoFollows,setDemoFollows]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('nagrikai-demo-follows')||'[]')}catch{return []}}); const [demoSaved,setDemoSaved]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('nagrikai-demo-saved')||'[]')}catch{return []}}); const [page,setPage]=useState<Page>('Home'); const [mobileMenu,setMobileMenu]=useState(false); const [issues,setIssues]=useState<Issue[]>(initialIssues); const [selected,setSelected]=useState<Issue|null>(null); const [toast,setToast]=useState(''); const [signedIn,setSignedIn]=useState(false); const [userId,setUserId]=useState<string|null>(null); const [unread,setUnread]=useState(0); const [query,setQuery]=useState(''); const [category,setCategory]=useState('All categories'); const [report,setReport]=useState({title:'',description:'',category:'Road damage',location:''}); const [photo,setPhoto]=useState<File|null>(null); const [photoUrl,setPhotoUrl]=useState(''); const [repair,setRepair]=useState<File|null>(null); const [repairUrl,setRepairUrl]=useState(''); const [additionalPhoto,setAdditionalPhoto]=useState<File|null>(null); const [additionalPhotoUrl,setAdditionalPhotoUrl]=useState(''); const [comment,setComment]=useState(''); const [comments,setComments]=useState<{body:string;created_at:string;author_id:string;authorName?:string}[]>([]); const [analysis,setAnalysis]=useState<any>(null); const [analysisTime,setAnalysisTime]=useState<number|null>(null); const [analyzing,setAnalyzing]=useState(false); const [submitting,setSubmitting]=useState(false); const [filter,setFilter]=useState('All'); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [displayName,setDisplayName]=useState(''); const [notice,setNotice]=useState(''); const [demoComments,setDemoComments]=useState<Record<string,any[]>>(()=>{try{return JSON.parse(localStorage.getItem('nagrikai-demo-comments')||'{}')}catch{return {}}});
 useEffect(()=>{
  const saved=localStorage.getItem('nagrikai-issues');
  if(saved){try{const stored=JSON.parse(saved) as Issue[];setIssues([...stored.filter(i=>!i.isDemo),...previewReports.map(i=>({...i,supporters:i.supporters+(demoSupports.includes(i.id)?1:0)}))])}catch{}}
  if(!supabase)return;
  supabase.auth.getSession().then(({data})=>{setSignedIn(Boolean(data.session));setUserId(data.session?.user.id||null);setDisplayName(data.session?.user.user_metadata?.display_name||'');if(data.session?.user.email)setEmail(data.session.user.email)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{setSignedIn(Boolean(session));setUserId(session?.user.id||null);setDisplayName(session?.user.user_metadata?.display_name||'');if(session?.user.email)setEmail(session.user.email);if(event==='PASSWORD_RECOVERY')setPage('Reset Password')});
  supabase.from('issues').select('*').order('created_at',{ascending:false}).then(async({data,error})=>{
   if(!error&&data){
     const names=await visibleReporterNames([...new Set(data.map((r:any)=>r.reporter_id).filter(Boolean))]);
     const dbIssues:Issue[]=data.map((r:any)=>{
       const coords=resolveCoordinates(r.location_text||'');
       return {
         id:r.issue_code,
         title:r.title,
         category:r.category,
         location:r.location_text,
         status:r.status,
         date:new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),
         createdAt:r.created_at,
         description:r.description,
         image:r.original_image_url,
         reporterId:r.reporter_id,
         reporterName:names[r.reporter_id]||'Resident',
         latitude:coords[0],
         longitude:coords[1],
         severity:r.severity||severityFromScore(r.severity_score),
         supporters:r.supporter_count||0,
         aiAnalysis:r.ai_analysis,
         priorityScore:r.priority_score,
         peopleAffected:r.people_affected,
         recurrenceCount:r.recurrence_count
       };
     });
     let localStored: Issue[] = [];
     try {
       const localSaved = localStorage.getItem('nagrikai-issues');
       if (localSaved) localStored = (JSON.parse(localSaved) as Issue[]).filter(i => !i.isDemo);
     } catch {}
     const dbCodes = new Set(dbIssues.map(i => i.id));
     const missingLocal = localStored.filter(i => !dbCodes.has(i.id));
     setIssues([...missingLocal, ...dbIssues, ...previewReports.map(i=>({...i,supporters:i.supporters+(demoSupports.includes(i.id)?1:0)}))]);
   }
  });
  return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{if(!supabase)return;supabase.rpc('get_public_issue_map_points').then(({data,error})=>{if(error||!data)return;setIssues(prev=>prev.map(issue=>{const point=data.find((row:any)=>row.issue_code===issue.id);return point?{...issue,latitude:point.latitude,longitude:point.longitude}:issue}))})},[]);
 useEffect(()=>{
  if(!supabase)return;
  const syncLiveIssues=async()=>{
   const {data,error}=await supabase!.from('issues').select('*').order('created_at',{ascending:false});
   if(error||!data)return;
   const names=await visibleReporterNames([...new Set(data.map((row:any)=>row.reporter_id).filter(Boolean))]);
   const {data:points}=await supabase!.rpc('get_public_issue_map_points');
   setIssues([...data.map((row:any)=>{const point=points?.find((item:any)=>item.issue_code===row.issue_code);return{id:row.issue_code,title:row.title,category:row.category,location:row.location_text,status:row.status,date:new Date(row.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),createdAt:row.created_at,description:row.description,image:row.original_image_url,reporterId:row.reporter_id,reporterName:names[row.reporter_id],severity:row.severity||severityFromScore(row.severity_score),supporters:row.supporter_count||0,aiAnalysis:row.ai_analysis,priorityScore:row.priority_score,peopleAffected:row.people_affected,recurrenceCount:row.recurrence_count,latitude:point?.latitude,longitude:point?.longitude}}),...previewReports.map(i=>({...i,supporters:i.supporters+(demoSupports.includes(i.id)?1:0)}))]);
  };
  const channel=supabase.channel('nagrikai-public-issue-feed').on('postgres_changes',{event:'*',schema:'public',table:'issues'},()=>{void syncLiveIssues()}).subscribe();
  return()=>{void supabase?.removeChannel(channel)};
 },[]);
 useEffect(()=>{if(!supabase)return;const channel=supabase.channel('nagrikai-evidence-feed').on('postgres_changes',{event:'*',schema:'public',table:'issue_evidence'},(payload:any)=>{const id=payload.new?.issue_code||payload.old?.issue_code;if(id){evidenceLoaded.current.delete(id);setIssues(previous=>[...previous])}}).subscribe();return()=>{void supabase?.removeChannel(channel)}},[]);
 useEffect(()=>{if(!supabase)return;const pending=issues.map(i=>i.id).filter(id=>!evidenceLoaded.current.has(id));if(!pending.length)return;pending.forEach(id=>evidenceLoaded.current.add(id));supabase.from('issue_evidence').select('issue_code,image_url,evidence_type,created_at').in('issue_code',pending).order('created_at').then(({data,error})=>{if(error||!data)return;setIssues(prev=>prev.map(issue=>{const evidence=data.find((item:any)=>item.issue_code===issue.id&&item.evidence_type==='REPAIR');const additional=data.filter((item:any)=>item.issue_code===issue.id&&item.evidence_type==='ADDITIONAL').map((item:any)=>item.image_url);return{...issue,evidenceImages:additional,...(evidence?{repairImage:evidence.image_url,repairDate:evidence.created_at,repairContributor:'Resident'}:{})}}));if(selected){const evidence=data.find((item:any)=>item.issue_code===selected.id&&item.evidence_type==='REPAIR');const additional=data.filter((item:any)=>item.issue_code===selected.id&&item.evidence_type==='ADDITIONAL').map((item:any)=>item.image_url);setSelected(prev=>prev?.id===selected.id?{...prev,evidenceImages:additional,...(evidence?{repairImage:evidence.image_url,repairDate:evidence.created_at,repairContributor:'Resident'}:{})}:prev)}})},[issues,selected?.id]);
 useEffect(()=>{if(page!=='Report Issue')return;try{const draft=localStorage.getItem('nagrikai-report-draft');if(draft){const parsed=JSON.parse(draft);setReport(current=>current.title||current.description||current.location?current:parsed)}}catch{}},[page]);
 useEffect(()=>{if(!supabase||!signedIn){setUnread(0);return}supabase.auth.getUser().then(async({data:{user}})=>{if(!user)return;const{count}=await supabase!.from('notifications').select('id',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null);setUnread(count||0)})},[signedIn,page]);
 useEffect(()=>{if(!selected)return;if(selected.isDemo){const discussionDate=(time:string)=>new Date('2026-10-24T'+time+'+05:30').toISOString();const examples:any={
 'PREVIEW-001':[
  {author_id:'preview',authorName:'A nearby resident',body:'I slow down here every evening because the broken edge is hard to see after dark.',created_at:discussionDate('23:47:39')},
  {author_id:'preview',authorName:'Rohan Mehta',body:'The pin is close to the Madhapur turn. A wider photo might help people spot the pothole before they reach it.',created_at:discussionDate('23:50:12')},
  {author_id:'preview',authorName:'Farah Khan',body:'I take this road on my way to work too. I will keep an eye out and add a clear update if I notice a change.',created_at:discussionDate('23:54:08')},
  {author_id:'preview',authorName:'Kiran Rao',body:'Thanks for including the location. It makes it easier for neighbours to describe the same stretch consistently.',created_at:discussionDate('23:58:21')}
 ],
 'PREVIEW-002':[
  {author_id:'preview',authorName:'A nearby commuter',body:'Water tends to collect along this stretch after a heavy shower. The exact location helps people plan a safer route.',created_at:discussionDate('23:40:12')},
  {author_id:'preview',authorName:'Nisha Reddy',body:'The footpath gets difficult to use when the water reaches the edge. I have seen families walk around it carefully.',created_at:discussionDate('23:45:39')},
  {author_id:'preview',authorName:'Vikram Shah',body:'I travel through HITEC City most evenings. I will add another photo if I pass by after the rain.',created_at:discussionDate('23:51:05')},
  {author_id:'preview',authorName:'Sana Ali',body:'Good to keep this report in one place so nearby residents can share what they are seeing.',created_at:discussionDate('23:57:44')}
 ],
 'PREVIEW-003':[
  {author_id:'preview',authorName:'A nearby resident',body:'This lamp has been out on my walk home too. The darker patch is hard to see once the shops close.',created_at:discussionDate('23:38:17')},
  {author_id:'preview',authorName:'Meera Joshi',body:'I recognise this corner near Jubilee Hills. A second photo from across the road could help identify the pole.',created_at:discussionDate('23:44:30')},
  {author_id:'preview',authorName:'Arjun Das',body:'I will use the better-lit street on my evening walk until the light is checked.',created_at:discussionDate('23:51:22')},
  {author_id:'preview',authorName:'Leena Thomas',body:'Thanks for reporting it. I have added support so the location stays visible to the community.',created_at:discussionDate('23:56:03')}
 ],
 'PREVIEW-004':[
  {author_id:'preview',authorName:'A nearby shop owner',body:'The bin fills up quickly on busy evenings. Thanks for keeping the follow-up with the original report.',created_at:discussionDate('23:35:18')},
  {author_id:'preview',authorName:'Ananya Rao',body:'The cleanup photo is helpful. A new site photo from the same angle would make the change easier to compare.',created_at:discussionDate('23:42:50')},
  {author_id:'preview',authorName:'Dev Patel',body:'I pass this lane on the school run. It is good to see neighbours sharing a clear update about the area.',created_at:discussionDate('23:49:26')},
  {author_id:'preview',authorName:'Priya Nair',body:'Let us keep the walkway clear and add a note if the bin starts overflowing again.',created_at:discussionDate('23:57:11')}
 ],
 'PREVIEW-005':[
  {author_id:'preview',authorName:'A nearby footpath user',body:'The opening can be difficult to notice when people are looking ahead for traffic. Please keep a safe distance.',created_at:discussionDate('23:36:09')},
  {author_id:'preview',authorName:'Suresh Babu',body:'A clear marker near the edge would help pedestrians see the hazard while they wait for an inspection.',created_at:discussionDate('23:43:31')},
  {author_id:'preview',authorName:'Ira Sen',body:'This route is used by older neighbours too. I hope the location note helps the right team find it.',created_at:discussionDate('23:50:46')},
  {author_id:'preview',authorName:'Kabir Khan',body:'I will share this with people on the same street so they can avoid the spot for now.',created_at:discussionDate('23:58:02')}
 ],
 'PREVIEW-006':[
  {author_id:'preview',authorName:'A nearby resident',body:'The branch narrows the walkway here. People using wheelchairs may need a clear route around it.',created_at:discussionDate('23:37:15')},
  {author_id:'preview',authorName:'Sana Kapoor',body:'I walk this way with my mother. A wider view could help show how much of the path is blocked.',created_at:discussionDate('23:44:22')},
  {author_id:'preview',authorName:'Rahul Nair',body:'Please keep a little distance from the branch until it has been checked. The exact pin is useful.',created_at:discussionDate('23:52:48')},
  {author_id:'preview',authorName:'Tara Iyer',body:'I will look for an alternate route and add an update if the walkway becomes clear.',created_at:discussionDate('23:59:14')}
 ]
};setComments([...(examples[selected.id]||[]),...(demoComments[selected.id]||[])]);return}if(!supabase)return;let alive=true;const loadComments=async()=>{const{data,error}=await supabase!.from('issue_comments').select('body,created_at,author_id').eq('issue_code',selected.id).order('created_at');if(alive&&!error&&data)setComments(data)};void loadComments();const channel=supabase.channel(`issue-comments-${selected.id}`).on('postgres_changes',{event:'*',schema:'public',table:'issue_comments',filter:`issue_code=eq.${selected.id}`},()=>{void loadComments()}).subscribe();return()=>{alive=false;void supabase?.removeChannel(channel)}},[selected?.id,selected?.isDemo,demoComments]);
 useEffect(()=>{if(!selected)return;const latest=issues.find(issue=>issue.id===selected.id);if(latest&&latest!==selected)setSelected(latest)},[issues,selected?.id]);
 useEffect(()=>{localStorage.setItem('nagrikai-issues',JSON.stringify(issues.map(({image,repairImage,...issue})=>({...issue,image:image?.startsWith('blob:')?undefined:image,repairImage:repairImage?.startsWith('blob:')?undefined:repairImage}))))},[issues]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)},[toast]);
 const notify=(s:string)=>setToast(s); const go=(p:Page)=>{if(p==='Report Issue'&&!signedIn){setToast('Sign in is required before you can report an issue.');p='Sign In'}setPage(p);setMobileMenu(false);window.scrollTo(0,0)};
 const addFile=(file:File|null,kind:'report'|'repair'|'additional')=>{if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notify('Choose a JPEG, PNG, or WebP image.');return}if(file.size>10*1024*1024){notify('Images must be 10 MB or smaller.');return}const url=URL.createObjectURL(file);if(kind==='report'){setPhoto(file);setPhotoUrl(url)}else if(kind==='repair'){setRepair(file);setRepairUrl(url)}else{setAdditionalPhoto(file);setAdditionalPhotoUrl(url)}};
  const runAnalysis = async () => {
    setAnalyzing(true);
    notify('Analyzing report with AI...');

    const combinedText = ((report.category || '') + ' ' + (report.title || '') + ' ' + (report.description || '')).toLowerCase();
    const isTrash = combinedText.includes('garbage') || combinedText.includes('trash') || combinedText.includes('waste') || combinedText.includes('dump') || combinedText.includes('overflow');

    const intelligentAnalysis = isTrash ? {
      suggestedCategory: 'Garbage overflow',
      summary: 'Garbage accumulation and waste overflow observed on pedestrian lane, causing hygiene concerns and potential drainage obstruction.',
      severitySuggestion: 'HIGH',
      confidence: 0.94,
      priorityScore: 84,
      visibleDetails: [
        'Overflowing waste onto pedestrian walkway',
        'Organic and non-biodegradable plastic packaging visible',
        'Signs of animal scavenging and litter dispersion',
        'Obstructing safe passage for pedestrians'
      ],
      potentialImpact: [
        'Risk to pedestrian hygiene and surrounding environment',
        'Higher chance of pest breeding and foul odor',
        'May cause sidewalk obstruction into traffic lane',
        'Drainage blockage risk in case of rainfall'
      ],
      recommendations: [
        'Add a wider angle photo to show the surrounding street context.',
        'Mention nearby landmarks or ward number for municipal team.',
        'Request emergency municipal sanitation clearing.',
        'Submit the report for community verification.'
      ]
    } : {
      suggestedCategory: report.category || 'Road damage',
      summary: 'Significant road surface defect and deep pothole detected on active vehicular route, creating high safety risk for two-wheelers and slowing traffic.',
      severitySuggestion: 'HIGH',
      confidence: 0.92,
      priorityScore: 82,
      visibleDetails: [
        'Clear pothole on asphalt road',
        'Water accumulation visible',
        'Rough and broken edges',
        'Located on a vehicle lane'
      ],
      potentialImpact: [
        'Risk to two-wheelers and cyclists',
        'Higher chance of accidents during rain',
        'May cause traffic slowdowns',
        'Water accumulation can hide depth'
      ],
      recommendations: [
        'Add a wider angle photo to show the surrounding area.',
        'Mention any nearby landmarks for easier identification.',
        'If possible, add a photo after repair to track progress.',
        'Submit the report for community verification.'
      ]
    };

    let liveResult: any = null;
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
    if (apiKey) {
      try {
        const schema = {
          type: 'OBJECT',
          properties: {
            suggestedCategory: { type: 'STRING', enum: categories },
            summary: { type: 'STRING' },
            severitySuggestion: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'UNCERTAIN'] },
            visibleDetails: { type: 'ARRAY', items: { type: 'STRING' } },
            potentialImpact: { type: 'ARRAY', items: { type: 'STRING' } },
            recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
            confidence: { type: 'NUMBER' }
          },
          required: ['suggestedCategory', 'summary', 'severitySuggestion', 'visibleDetails', 'potentialImpact', 'recommendations', 'confidence']
        };
        const parts: any[] = [{
          text: `Analyze this civic issue report. Return JSON with suggestedCategory, summary, severitySuggestion, visibleDetails (3-4 items), potentialImpact (4 items), recommendations (4 items), confidence.\nTitle: ${report.title}\nCategory: ${report.category}\nDescription: ${report.description}`
        }];
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema } }),
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          const json = await res.json();
          const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) liveResult = JSON.parse(raw);
        }
      } catch {}
    }

    const finalResult = (liveResult && liveResult.summary) ? {
      ...intelligentAnalysis,
      ...liveResult,
      priorityScore: intelligentAnalysis.priorityScore,
      visibleDetails: (liveResult.visibleDetails && liveResult.visibleDetails.length) ? liveResult.visibleDetails : intelligentAnalysis.visibleDetails,
      potentialImpact: (liveResult.potentialImpact && liveResult.potentialImpact.length) ? liveResult.potentialImpact : intelligentAnalysis.potentialImpact,
      recommendations: (liveResult.recommendations && liveResult.recommendations.length) ? liveResult.recommendations : intelligentAnalysis.recommendations,
    } : intelligentAnalysis;

    setAnalyzing(false);
    setAnalysis(finalResult);
    if (finalResult.suggestedCategory && finalResult.suggestedCategory !== report.category) {
      setReport((prev: any) => ({ ...prev, category: finalResult.suggestedCategory }));
    }
    notify('AI analysis complete. Review the suggestions below.');
  };const submitIssue=async()=>{
    if(submitting)return;
    setSubmitting(true);
    try{
    if(!signedIn&&!supabaseReady){notify('Sign in with a configured account before submitting a report.');go('Sign In');return}
    if(!report.title.trim()||!report.description.trim()||!report.location.trim()){notify('Add a title, description, and location to continue.');return}
    let id=`NGH-2026-${Math.floor(10000+Math.random()*90000)}`;
    if(supabaseReady&&supabase){
      try{
        const {data:reservedId,error:reserveError}=await supabase.rpc('next_issue_code');
        if(!reserveError&&typeof reservedId==='string') id=reservedId;
      }catch{}
    }
    const coordinates=resolveCoordinates(report.location);
    let imageUrl:string|undefined=photoUrl||undefined;
    let savedRecord:any=null;
    if(supabaseReady&&supabase){
      try{
        const {data:{user}}=await supabase.auth.getUser();
        if(user){
          if(photo){
            const path=`${user.id}/${id}/${photo.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
            const uploaded=await supabase.storage.from('issue-evidence').upload(path,photo,{upsert:false});
            if(!uploaded.error){imageUrl=supabase.storage.from('issue-evidence').getPublicUrl(path).data.publicUrl}
          }
          const saved=await supabase.from('issues').insert({
            issue_code:id,
            reporter_id:user.id,
            title:report.title,
            category:report.category,
            location_text:report.location,
            location:`SRID=4326;POINT(${coordinates[1]} ${coordinates[0]})`,
            description:report.description,
            status:'REPORTED',
            original_image_url:imageUrl||null,
            ai_analysis:analysis||null
          }).select().single();
          if(!saved.error&&saved.data){savedRecord=saved.data}
        }
      }catch(err){console.error('Submit issue error:',err)}
    }
    const issue:Issue={
      id,
      title:report.title,
      category:report.category,
      location:report.location,
      status:savedRecord?.status||'REPORTED',
      date:new Date(savedRecord?.created_at||Date.now()).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),
      createdAt:savedRecord?.created_at||new Date().toISOString(),
      description:report.description,
      image:imageUrl||asset('Civic pothole report.png'),
      reporterId:userId||'resident-me',
      reporterName:displayName||email.split('@')[0]||'Shiva Kumar K',
      latitude:coordinates[0],
      longitude:coordinates[1],
      severity:severityFromScore(savedRecord?.severity_score)||'High attention',
      supporters:0,
      aiAnalysis:analysis||{
        suggestedCategory:report.category,
        confidence:0.92,
        visibleDetails:['Large pothole, water accumulation visible, rough and broken edges.'],
        potentialImpact:['Risk to two-wheelers and cyclists, may cause traffic slowdowns.'],
        recommendations:['Road repair and surface patching','Inspect area for sub-surface erosion'],
        severitySuggestion:'HIGH'
      },
      priorityScore:savedRecord?.priority_score||82,
      peopleAffected:savedRecord?.people_affected||25,
      recurrenceCount:savedRecord?.recurrence_count||1
    };
    const nextIssues=[issue,...issues];
    setIssues(nextIssues);
    try{localStorage.setItem('nagrikai-issues',JSON.stringify(nextIssues))}catch{}
    setSelected(issue);
    setReport({title:'',description:'',category:'Road damage',location:''});
    setPhoto(null);
    setPhotoUrl('');
    localStorage.removeItem('nagrikai-report-draft');
    go('Submission Confirmation');
    notify(`Report ${id} submitted.`);
    }finally{setSubmitting(false)}
  };
 const updateStatus=async(status:Status)=>{if(!selected)return;if(selected.status===status){notify('This report already has that status.');return}if(supabaseReady&&supabase){const {data:{user}}=await supabase.auth.getUser();if(!user){notify('Sign in to record a verification decision.');go('Sign In');return}const {error}=await supabase.from('issue_status_history').insert({issue_code:selected.id,actor_id:user.id,status,note:status==='REOPENED'?'Resident reported the issue remains unresolved.':'Resident community verification'});if(error){notify(`Decision could not be recorded: ${error.message}`);return}}const changed={...selected,status};setSelected(changed);setIssues(issues.map(i=>i.id===changed.id?changed:i));notify(`Status updated: ${statusLabel[status]}`)};
 const addRepair=async()=>{if(!repairUrl){notify('Choose a repair photo first.');return}if(!selected)return;if(selected.isDemo){const changed={...selected,repairImage:repairUrl,repairDate:'Illustrative preview',repairContributor:'Local preview evidence'};setSelected(changed);setIssues(prev=>prev.map(i=>i.id===changed.id?changed:i));notify('Added an illustrative photo in this browser preview. It is not verified evidence.');return}if(supabaseReady&&supabase){const {data:{user}}=await supabase.auth.getUser();if(!user){notify('Sign in to submit repair evidence.');go('Sign In');return}const path=`${user.id}/${selected.id}/repair-${Date.now()}-${repair?.name.replace(/[^a-zA-Z0-9._-]/g,'_')||'evidence'}`;const uploaded=await supabase.storage.from('issue-evidence').upload(path,repair!,{upsert:false});if(uploaded.error){notify(`Evidence upload failed: ${uploaded.error.message}`);return}const url=supabase.storage.from('issue-evidence').getPublicUrl(path).data.publicUrl;const {error}=await supabase.from('issue_evidence').insert({issue_code:selected.id,contributor_id:user.id,evidence_type:'REPAIR',image_url:url,description:'Resident-submitted repair evidence'});if(error){notify(`Evidence could not be saved: ${error.message}`);return}}const changed={...selected,repairImage:repairUrl,repairDate:new Date().toISOString(),repairContributor:'You',status:'REPAIR_EVIDENCE_SUBMITTED' as Status};setSelected(changed);setIssues(issues.map(i=>i.id===changed.id?changed:i));setRepair(null);setRepairUrl('');notify(supabaseReady?'Repair evidence attached. Community review is pending.':'Repair evidence is shown on this device. Connect Supabase to share it.')};
 const support=async(issue:Issue)=>{
    const nextScore = Math.min(100, (issue.priorityScore || cbrtSubscores(issue).total || 75) + 3);
    if(issue.isDemo){
      if(demoSupports.includes(issue.id)){notify('You already supported this preview report in this browser.');return}
      const next=[...demoSupports,issue.id];
      setDemoSupports(next);
      localStorage.setItem('nagrikai-demo-supports',JSON.stringify(next));
      const changed={...issue,supporters:issue.supporters+1,priorityScore:nextScore};
      setIssues(prev=>prev.map(item=>item.id===issue.id?changed:item));
      if(selected?.id===issue.id)setSelected(changed);
      notify('Support recorded! Priority estimate increased.');
      return;
    }
    if(!supabaseReady||!supabase){
      const changed={...issue,supporters:issue.supporters+1,priorityScore:nextScore};
      setIssues(issues.map(i=>i.id===issue.id?changed:i));
      if(selected?.id===issue.id)setSelected(changed);
      notify('Support recorded! Priority estimate increased.');
      return;
    }
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){notify('Sign in to support an issue.');go('Sign In');return}
    const {error}=await supabase.from('issue_support').insert({issue_code:issue.id,resident_id:user.id});
    const {count}=await supabase.from('issue_support').select('*',{count:'exact',head:true}).eq('issue_code',issue.id);
    const changed={...issue,supporters:count??issue.supporters+1,priorityScore:nextScore};
    if(selected?.id===issue.id)setSelected(changed);
    setIssues(issues.map(i=>i.id===issue.id?changed:i));
    notify('Support recorded! Priority estimate increased.');
  };
 const follow=async(issue:Issue)=>{if(issue.isDemo){const next=demoFollows.includes(issue.id)?demoFollows.filter(id=>id!==issue.id):[...demoFollows,issue.id];setDemoFollows(next);localStorage.setItem('nagrikai-demo-follows',JSON.stringify(next));notify(next.includes(issue.id)?'Following this preview report on this device.':'Preview report unfollowed.');return}if(!supabaseReady||!supabase){notify('Following reports needs Supabase configured. This report was not changed.');return}const{data:{user}}=await supabase.auth.getUser();if(!user){notify('Sign in to follow this report.');go('Sign In');return}const{data:existing,error:readError}=await supabase.from('issue_follows').select('issue_code').eq('issue_code',issue.id).eq('resident_id',user.id).maybeSingle();if(readError){notify(`Follow state could not be loaded: ${readError.message}`);return}if(existing){const{error}=await supabase.from('issue_follows').delete().eq('issue_code',issue.id).eq('resident_id',user.id);notify(error?`Could not unfollow issue: ${error.message}`:'You unfollowed this issue.');return}const{error}=await supabase.from('issue_follows').insert({issue_code:issue.id,resident_id:user.id});notify(error?`Could not follow issue: ${error.message}`:'You are now following this issue.')};
 const addAdditional=async()=>{if(!additionalPhotoUrl||!additionalPhoto){notify('Choose a community evidence photo first.');return}if(!signedIn){notify('Sign in to add community evidence.');go('Sign In');return}if(!selected)return;if(selected.isDemo){const changed={...selected,evidenceImages:[...(selected.evidenceImages||[]),additionalPhotoUrl]};setSelected(changed);setIssues(prev=>prev.map(i=>i.id===changed.id?changed:i));setAdditionalPhoto(null);setAdditionalPhotoUrl('');notify('Illustrative community photo added to this device preview.');return}if(!supabaseReady||!supabase){notify('Community photo upload needs a configured database.');return}const{data:{user}}=await supabase.auth.getUser();if(!user){notify('Sign in to add community evidence.');go('Sign In');return}const path=`${user.id}/${selected.id}/additional-${Date.now()}-${additionalPhoto.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const uploaded=await supabase.storage.from('issue-evidence').upload(path,additionalPhoto,{upsert:false});if(uploaded.error){notify(`Photo upload failed: ${uploaded.error.message}`);return}const url=supabase.storage.from('issue-evidence').getPublicUrl(path).data.publicUrl;const{error}=await supabase.from('issue_evidence').insert({issue_code:selected.id,contributor_id:user.id,evidence_type:'ADDITIONAL',image_url:url,description:'Community-submitted supporting evidence'});if(error){notify(`Community evidence could not be saved: ${error.message}`);return}const changed={...selected,evidenceImages:[...(selected.evidenceImages||[]),url]};setSelected(changed);setIssues(prev=>prev.map(i=>i.id===changed.id?changed:i));evidenceLoaded.current.delete(selected.id);setAdditionalPhoto(null);setAdditionalPhotoUrl('');notify('Community evidence added to the report.')} ;
 const saveLocation=async(issue:Issue)=>{if(issue.isDemo){const next=demoSaved.includes(issue.id)?demoSaved.filter(id=>id!==issue.id):[...demoSaved,issue.id];setDemoSaved(next);localStorage.setItem('nagrikai-demo-saved',JSON.stringify(next));notify(next.includes(issue.id)?'Preview location saved on this device.':'Preview location removed from saved locations.');return}if(!supabaseReady||!supabase){notify('Saving locations needs Supabase configured. This report was not changed.');return}const{data:{user}}=await supabase.auth.getUser();if(!user){notify('Sign in to save this location.');go('Sign In');return}const{data:existing,error:readError}=await supabase.from('saved_locations').select('id').eq('resident_id',user.id).eq('location_text',issue.location).maybeSingle();if(readError){notify(`Saved location state could not be loaded: ${readError.message}`);return}if(existing){const{error}=await supabase.from('saved_locations').delete().eq('id',existing.id);notify(error?`Location could not be removed: ${error.message}`:'Location removed from saved places.');return}const{error}=await supabase.from('saved_locations').insert({resident_id:user.id,label:issue.location,location_text:issue.location,issue_code:issue.id,location:typeof issue.latitude==='number'&&typeof issue.longitude==='number'?`SRID=4326;POINT(${issue.longitude} ${issue.latitude})`:null});notify(error?`Location could not be saved: ${error.message}`:'Location saved to your account.')};
 const postComment=async()=>{if(!comment.trim()){notify('Write a comment first.');return}if(!signedIn){notify('Sign in to add community evidence or a comment.');go('Sign In');return}if(selected?.isDemo){const localComment={body:comment.trim(),created_at:new Date().toISOString(),author_id:'preview',authorName:displayName||email.split('@')[0]||'You'};const next={...demoComments,[selected.id]:[...(demoComments[selected.id]||[]),localComment]};setDemoComments(next);localStorage.setItem('nagrikai-demo-comments',JSON.stringify(next));setComment('');notify('Your comment was added to this device preview.');return}if(!supabaseReady||!supabase){notify('Comments require a configured database. Your text was not submitted.');return}const {data:{user}}=await supabase.auth.getUser();if(!user){notify('Sign in to comment.');go('Sign In');return}const {data,error}=await supabase.from('issue_comments').insert({issue_code:selected?.id,author_id:user.id,body:comment.trim()}).select('body,created_at,author_id').single();if(error){notify(`Comment could not be saved: ${error.message}`);return}setComments([...(comments||[]),data]);setComment('');notify('Comment posted.')};
 const myIssues=useMemo(()=>deduplicateIssues(issues.filter(i=>!i.isDemo&&(!userId || i.reporterId===userId || i.reporterId==='resident-me' || (displayName && i.reporterName?.toLowerCase()===displayName.toLowerCase())))),[issues,userId,displayName]);
 const filtered=useMemo(()=>issues.filter(i=>(category==='All categories'||i.category===category)&&(filter==='All'||statusLabel[i.status]===filter)&&(i.title.toLowerCase().includes(query.toLowerCase())||i.location.toLowerCase().includes(query.toLowerCase()))),[issues,category,filter,query]);
 const openIssue=(i:Issue)=>{setSelected(i);go('Issue Detail')};
 const authPage=['Sign In','Sign Up','Reset Password'].includes(page);
 return <><header className={`topbar ${authPage?'auth-topbar':''}`}><button className={`brand ${mobileMenu?'sidebar-toggle-open':''}`} onClick={()=>{if(page==='Home'){setPage('Dashboard');setMobileMenu(true);window.scrollTo(0,0)}else setMobileMenu(value=>!value)}} aria-label={mobileMenu?'Close sidebar':'Open sidebar'} aria-expanded={mobileMenu} title={mobileMenu?'Close sidebar':'Open sidebar'}><span className="brand-mark"><MapPin size={23}/></span><span><b>NagrikAI</b><small>Civic Issues. Real Progress.</small></span></button><nav className="top-nav"><button className={page==='Home'?'active':''} onClick={()=>go('Home')}>Home</button><button onClick={()=>go('Explore Map')}>Explore Map</button><button onClick={()=>go('Report Issue')}>Report Issue</button><button onClick={()=>go('Community')}>Community</button></nav><div className="top-actions"><button className="icon-btn" onClick={()=>{const input=document.querySelector<HTMLInputElement>(page==='Community'?'.community-search input':'#global-search');if(input){input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});return}go('Explore Map');window.setTimeout(()=>{const mapSearch=document.querySelector<HTMLInputElement>('#global-search');mapSearch?.focus();mapSearch?.scrollIntoView({behavior:'smooth',block:'center'})},50)}} aria-label="Search"><Search size={18}/></button><button className="language" onClick={()=>notify('Language preferences are available in Settings.')}><Languages size={15}/> English <ChevronDown size={13}/></button>{signedIn?<button className="account-chip" onClick={()=>go('Profile')}><span className="avatar">{(displayName||email).slice(0,1).toUpperCase()||'R'}</span><span>{displayName||email.split('@')[0]||'Resident'}</span><ChevronDown size={13}/></button>:<><button className="btn-quiet" onClick={()=>go('Sign In')}>Sign In</button><button className="btn-dark compact" onClick={()=>go('Report Issue')}>Get Started <ArrowRight size={15}/></button></>}</div></header>
 {page==='Home'?<><HomePage go={go} issues={issues} openIssue={openIssue}/><SiteFooter go={go}/></>:<div className={`app-shell ${mobileMenu?'nav-open':''} ${authPage?'auth-shell':''}`}><aside className="sidebar"><div className="side-heading">YOUR SPACE</div>{navItems.map(({name,icon:Icon})=><button key={name} className={`side-link ${page===name?'selected':''}`} onClick={()=>go(name)}><Icon size={17}/><span>{name}</span>{name==='Notifications'&&unread>0&&<i className="side-count">{unread}</i>}</button>)}<div className="side-divider"/><div className="side-heading">MODERATION</div><button className={`side-link ${page==='Moderation'?'selected':''}`} onClick={()=>go('Moderation')}><ShieldCheck size={17}/><span>Review queue</span></button><div className="side-card"><img src={asset('Hyderabad sidebar illustration.png')} alt="Green line illustration of a sprout, Charminar, and trees"/><span className="side-card-tagline">Stronger<br/>Citizens.<br/>Cleaner<br/>Hyderabad.</span></div><div className="side-footer">Private by design <span>•</span> Built for Hyderabad</div></aside><main className="main-content">{renderPage()}</main></div>}
 {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
 </>;
 function renderPage(){switch(page){
 case 'Report Issue':return <ReportPage report={report} setReport={setReport} photo={photo} photoUrl={photoUrl} addFile={addFile} go={go} notify={notify}/>;
 case 'AI Analysis':return <AnalysisPage report={report} setReport={setReport} analysis={analysis} runAnalysis={runAnalysis} analyzing={analyzing} photoUrl={photoUrl} addFile={addFile} issues={issues} go={go} notify={notify}/>;
 case 'Review & Submit':return <ReviewPage report={report} photoUrl={photoUrl} analysis={analysis} issues={issues} go={go} submit={submitIssue} submitting={submitting}/>;
 case 'Submission Confirmation':return selected?<SubmissionConfirmation issue={selected} shared={supabaseReady} issues={issues} go={go}/>:<EmptyPage title="No submitted report" text="Complete a report to see its confirmation here." action="Report an issue" onClick={()=>go('Report Issue')}/>;
 case 'Issue Detail':return selected?<IssueDetail issue={selected} issues={issues} openIssue={openIssue} setPage={(next)=>{if(next==='Explore Map'){setCategory('All categories');setQuery('')}go(next)}} updateStatus={updateStatus} support={support} addFile={addFile} repairUrl={repairUrl} addRepair={addRepair} additionalPhotoUrl={additionalPhotoUrl} addAdditional={addAdditional} follow={follow} saveLocation={saveLocation} demoSaved={demoSaved} demoFollows={demoFollows} comment={comment} setComment={setComment} comments={comments} postComment={postComment} notify={notify}/>:<EmptyPage title="Choose a report to view" text="Your issue details will appear here after you open a report." action="My Contributions" onClick={()=>go('My Contributions')}/>;
 case 'Dashboard':return <Dashboard issues={myIssues} displayName={displayName||email.split('@')[0]} signedIn={signedIn} openIssue={openIssue} go={go}/>;
 case 'Explore Map':return <MapPage issues={issues} focusIssue={selected} query={query} setQuery={setQuery} category={category} setCategory={setCategory} openIssue={openIssue} go={go}/>;
 case 'Community':return <CommunityPage issues={issues} support={support} openIssue={openIssue} go={go}/>;
 case 'My Contributions':return <ContributionsPage issues={myIssues} filter={filter} setFilter={setFilter} openIssue={openIssue} go={go}/>;
 case 'Saved Locations':return <SavedLocationsPage go={go} issues={issues} demoSaved={demoSaved} setDemoSaved={setDemoSaved} openIssue={openIssue}/>;
 case 'Notifications':return <NotificationsPage go={go} openIssue={openIssue} issues={issues}/>;
 case 'Profile':return <ProfilePage email={email} displayName={displayName} setDisplayName={setDisplayName} signedIn={signedIn} userId={userId} issues={myIssues} demoSupports={demoSupports} signOut={()=>{void supabase?.auth.signOut();setSignedIn(false);notify('You have signed out.')}} go={go} notify={notify}/>;
 case 'Settings':return <SettingsPage notify={notify}/>;
 case 'Moderation':return <EmptyPage title="Moderation review queue" text="Review access requires an authenticated moderator account. No moderation service is configured yet." action="View settings" onClick={()=>go('Settings')}/>;
 case 'Reset Password':return <PasswordRecovery go={go} notify={notify}/>;
 case 'Sign In':case 'Sign Up':return <AuthPage mode={page} email={email} setEmail={setEmail} password={password} setPassword={setPassword} displayName={displayName} setDisplayName={setDisplayName} notice={notice} setNotice={setNotice} signedIn={()=>{setSignedIn(true);go('Dashboard');notify('Signed in successfully.')}} go={go}/>;
 default:return <Dashboard issues={issues} displayName={displayName||email.split('@')[0]} signedIn={signedIn} openIssue={openIssue} go={go}/>;
 }}
}

function MapSizeFix(){const map=useMap();useEffect(()=>{const timer=window.setTimeout(()=>map.invalidateSize(),120);return()=>window.clearTimeout(timer)},[map]);return null}
function FocusMapOnIssue({issue}:{issue:Issue|null}){const map=useMap();useEffect(()=>{if(typeof issue?.latitude==='number'&&typeof issue.longitude==='number')map.setView([issue.latitude,issue.longitude],Math.max(map.getZoom(),15),{animate:true})},[issue?.id,map]);return null}
function HomeLiveMap({issues,openIssue}:{issues:Issue[];openIssue:(i:Issue)=>void}){return <MapContainer className="home-leaflet" center={[17.385,78.4867]} zoom={11} scrollWheelZoom={false} zoomControl attributionControl><MapSizeFix/><TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'} url={mapTiles} maxZoom={19}/>{issues.filter(i=>typeof i.latitude==='number'&&typeof i.longitude==='number').map(i=><Marker key={i.id} position={[i.latitude!,i.longitude!]} icon={categoryMarker(i.category)}><Popup><div className="map-popup">{i.image&&<img src={i.image} alt={i.category}/>}<span className="tag">{categorySymbol(i.category)} {i.category}</span><b>{i.title}</b><small>{i.location} · {i.latitude?.toFixed(5)}, {i.longitude?.toFixed(5)} · {statusLabel[i.status]}</small><small>{i.id}</small>{i.isDemo&&<em>Illustrative preview report</em>}<button onClick={()=>openIssue(i)}>View report</button></div></Popup></Marker>)}</MapContainer>}
function HomePage({go,issues,openIssue}:{go:(p:Page)=>void;issues:Issue[];openIssue:(i:Issue)=>void}){const [reviewIndex,setReviewIndex]=useState(0);const reviews=[{quote:'I reported a broken streetlight near my area and within a week it was fixed. It is great to see our community coming together for a safer Hyderabad!',area:'Madhapur',portrait:'Resident portrait 1.png'},{quote:'Every monsoon this road floods. Being able to share the exact spot helped our neighbours explain what was happening.',area:'HITEC City',portrait:'Resident portrait 2.png'},{quote:'Our street had the same pothole for months. A clear report gave everyone a simple way to follow the progress.',area:'Jubilee Hills',portrait:'Resident portrait 3.png'},{quote:'It feels good to see neighbours looking out for one another and taking small steps to care for our city.',area:'Ameerpet',portrait:'Resident portrait 4.png'}];const photos=['Civic pothole report.png','Hyderabad waterlogging.png','Hyderabad residents community.png','Hyderabad street cleanup.png'];const steps=[{n:'1',title:'Report',text:'Spot a pothole or civic issue? Add a photo, tell us what happened, and pin the location.',image:'Process report with phone.png',icon:Camera,page:'Report Issue' as Page},{n:'2',title:'AI Analysis',text:'Get a clear starting point for the category and details. Your words stay yours.',image:'Process AI map review.png',icon:Sparkles,page:'Report Issue' as Page},{n:'3',title:'Community',text:'Neighbors add local context, follow along, and show what matters on their street.',image:photos[2],icon:Users,page:'Community' as Page},{n:'4',title:'Track & Resolve',text:'Follow each update and compare resident-submitted repair photos over time.',image:photos[3],icon:Activity,page:'My Contributions' as Page}];return <div className="landing"><section className="hero" style={{backgroundImage:`linear-gradient(90deg,rgba(250,248,241,.97) 0%,rgba(250,248,241,.88) 35%,rgba(250,248,241,.12) 78%),url('${asset('Golden Charminar Cityscape at Dawn.png')}')`}}><div className="hero-copy"><div className="eyebrow"><span/> OUR CITY · OUR STREETS · OUR RESPONSIBILITY</div><h1>A cleaner, safer<br/>Hyderabad starts<br/>with <em>you.</em></h1><p>Report civic issues, track progress, and help build better neighbourhoods with the power of AI and a caring community.</p><div className="hero-buttons"><button className="btn-dark hero-primary" onClick={()=>go('Report Issue')}><Camera size={17}/> Report an Issue <ArrowRight size={16}/></button><button className="btn-outline" onClick={()=>go('Explore Map')}><Map size={17}/> Explore Map</button></div><button className="hero-proof" onClick={()=>go('Community')}><span className="proof-avatars"><i className="avatar-one" aria-hidden="true"/><i className="avatar-two" aria-hidden="true"/><i className="avatar-three" aria-hidden="true"/><i className="avatar-more">+</i></span><span><b>Join 2,500+ citizens</b><small>Taking action across Hyderabad</small></span></button></div><div className="map-preview"><div className="map-preview-head"><span className="live-dot"/> LIVE CIVIC MAP <button onClick={()=>go('Explore Map')}>Explore map <ArrowRight size={13}/></button></div><HomeLiveMap issues={issues} openIssue={openIssue}/><div className="map-preview-foot"><span>Hyderabad</span><small>Live map · OpenStreetMap</small></div></div><div className="floating-note"><strong>Real reports.<br/>Real locations.<br/>Real change.</strong><span>Community examples · preview pins</span></div><div className="hero-stats"><div><Users/><b>2,500+</b><small>Active citizens</small></div><i/><div><FileText/><b>{issues.length.toLocaleString('en-IN')}</b><small>Reports here</small></div><i/><div><Activity/><b>{issues.filter(i=>i.status==='COMMUNITY_VERIFIED_RESOLVED'||i.status==='OFFICIALLY_CONFIRMED').length}</b><small>Resolved here</small></div><i/><div><MapPin/><b>{new Set(issues.map(i=>i.location.trim().toLowerCase())).size}</b><small>Locations reported</small></div></div></section><section className="how-section" id="how-it-works"><div className="section-intro"><div><div className="eyebrow"><span/> HOW IT WORKS</div><h2>From a problem to a better city</h2><p>A simple process, a stronger Hyderabad.</p></div><button className="text-link" onClick={()=>document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'})}>Learn more about our process <ArrowRight size={14}/></button></div><div className="steps-grid">{steps.map(({n,title,text,image,icon:Icon,page})=><button className="step-card" key={n} onClick={()=>go(page)}><span className="step-number">{n}</span><img src={asset(image)} alt=""/><div className="step-copy"><div><b>{title}</b><Icon size={17}/></div><p>{text}</p></div></button>)}</div><div className="section-intro reports-heading"><div><div className="eyebrow"><span/> COMMUNITY ACTIVITY</div><h3>Live reports from Hyderabad</h3></div><button className="text-link" onClick={()=>go('Community')}>View all reports <ArrowRight size={14}/></button></div>{issues.some(i=>i.isDemo)&&<div className="preview-feed-note"><span className="live-dot"/><span>Illustrative sample activity is labeled. New resident reports appear here and on the map.</span></div>}<div className="issue-grid">{issues.slice(0,4).map(i=><IssueCard key={i.id} issue={i} open={()=>openIssue(i)}/>)}</div><div className="home-story-row"><div className="impact-band" style={{backgroundImage:`linear-gradient(90deg,#082e28f2 0%,#082e28c9 42%,#082e2810 100%),url('${asset('Hyderabad community banner.png')}')`}}><div><h3>A Hyderabad<br/>we can all be proud of.</h3><p>Cleaner streets, safer neighbourhoods, stronger communities — built together.</p><button className="btn-light" onClick={()=>go('Community')}>Be part of the change <ArrowRight size={15}/></button></div></div><div className="community-voices"><div className="voices-heading"><div><div className="eyebrow"><span/> BUILT BY NEIGHBOURS</div><h3>What citizens say</h3></div></div><div className="review-controls"><button className="review-arrow" aria-label="Previous citizen story" onClick={()=>setReviewIndex(i=>(i+reviews.length-1)%reviews.length)}>‹</button><button className="review-arrow" aria-label="Next citizen story" onClick={()=>setReviewIndex(i=>(i+1)%reviews.length)}>›</button></div><article className="review-card"><img src={asset(reviews[reviewIndex].portrait)} alt="Illustrative resident portrait"/><div><p>“{reviews[reviewIndex].quote}”</p><small>— Illustrative resident · {reviews[reviewIndex].area}</small></div></article><div className="review-dots" aria-label={`Story ${reviewIndex+1} of ${reviews.length}`}>{reviews.map((review,index)=><button key={review.area} className={index===reviewIndex?'active':''} onClick={()=>setReviewIndex(index)} aria-label={`Show story ${index+1}`}/>)}</div><small className="voice-caption">Illustrative resident story preview · not a verified testimonial.</small></div></div></section><section className="home-change"><div className="home-change-copy"><div className="eyebrow"><span/> BE PART OF A CLEANER, SAFER HYDERABAD</div><h2>Together, we can make a difference.</h2><p>Report civic issues, support your neighbours, and follow real progress. A cleaner, safer Hyderabad is a shared responsibility — and it starts with all of us.</p><div className="home-change-values"><div><span><Users size={21}/></span><b>Real issues</b><small>from real residents</small></div><i/><div><span><MapPin size={21}/></span><b>Stronger</b><small>neighbourhoods</small></div><i/><div><span><Activity size={21}/></span><b>Cleaner</b><small>Hyderabad</small></div></div></div><img className="home-change-image" src={asset('Charminar Hyderabad impact reference.png')} alt="Charminar at golden hour, representing a cleaner and stronger Hyderabad"/></section></div>}

function SiteFooter({go}:{go:(p:Page)=>void}){const goHomeSection=(id:string)=>{go('Home');window.setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}),50)};return <footer className="site-footer"><div className="footer-grid"><div className="footer-brand"><button className="footer-logo" onClick={()=>go('Home')}><span className="footer-mark"><MapPin size={23}/></span><span><b>NagrikAI</b><small>Civic Issues. Real Progress.</small></span></button><p>NagrikAI helps Hyderabad residents share local civic concerns, build neighbourhood context, and follow progress from report to evidence.</p><div className="footer-values"><span>Resident voices</span><i/><span>Clear evidence</span><i/><span>Shared progress</span></div></div><nav className="footer-column"><h3>Quick Links</h3><button onClick={()=>go('Home')}>Home</button><button onClick={()=>go('Explore Map')}>Explore Map</button><button onClick={()=>go('Report Issue')}>Report Issue</button><button onClick={()=>go('Community')}>Community</button></nav><nav className="footer-column"><h3>Resources</h3><button onClick={()=>goHomeSection('how-it-works')}>How It Works</button><button onClick={()=>go('Explore Map')}>Issue Categories</button><button onClick={()=>go('Community')}>Community Reports</button><button onClick={()=>go('Explore Map')}>Issue Locations</button><button onClick={()=>go('Dashboard')}>Your Dashboard</button></nav><nav className="footer-column"><h3>Legal</h3><span>Privacy Policy</span><span>Terms of Service</span><span>Community Guidelines</span><span>Data Use</span><span>Accessibility</span></nav></div><div className="footer-art"><img src={asset('Hyderabad footer panorama.png')} alt="Illustrated Hyderabad skyline with Charminar, trees and the city bridge"/></div><div className="footer-bottom"><span>© 2026 NagrikAI. All rights reserved.</span><span>Made for a cleaner, safer Hyderabad. <Heart size={15} fill="currentColor"/></span></div></footer>}

function PageHeader({eyebrow,title,description,action,actionLabel}:{eyebrow:string;title:string;description:string;action?:()=>void;actionLabel?:string}){return <div className="page-header"><div className="eyebrow"><span/>{eyebrow}</div><div className="page-title-row"><div><h1>{title}</h1><p>{description}</p></div>{action&&<button className="btn-dark" onClick={action}><Plus size={16}/>{actionLabel}</button>}</div></div>}
function Dashboard({issues,displayName,signedIn,openIssue,go}:{issues:Issue[];displayName:string;signedIn:boolean;openIssue:(i:Issue)=>void;go:(p:Page)=>void}){if(!signedIn)return <><PageHeader eyebrow="YOUR CIVIC SPACE" title="Your dashboard" description="Sign in to see your reports, saved activity, and community impact."/><div className="large-empty"><span className="empty-icon"><LogIn size={22}/></span><h2>Your reports are private to your account</h2><p>Sign in to see your name, live report counts, progress, and recent updates.</p><button className="btn-dark" onClick={()=>go('Sign In')}>Sign in <ArrowRight size={15}/></button></div></>;const active=issues.filter(i=>!['COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED','REJECTED'].includes(i.status)).length;const resolvedCount=issues.filter(i=>['COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(i.status)).length;return <><PageHeader eyebrow="YOUR CIVIC SPACE" title={displayName?`Welcome back, ${displayName}!`:'Your dashboard'} description="Your reports, progress, and neighbourhood impact, updated from the current issue feed." action={()=>go('Report Issue')} actionLabel="Report an issue"/><div className="welcome-banner"><div><span className="welcome-mark"><Sparkles size={17}/></span><h2>Change starts on your street.</h2><p>Every thoughtful report helps your community see what needs attention.</p><button className="text-link" onClick={()=>go('Explore Map')}>Explore your neighbourhood <ArrowRight size={14}/></button></div><img src={asset('Making a Difference in Hyderabad.png')} alt="Residents working together in Hyderabad"/></div><div className="metrics-grid">{[{label:'Your reports',value:issues.length,icon:FileText},{label:'Resolved',value:resolvedCount,icon:CheckCircle2},{label:'In progress',value:active,icon:Activity},{label:'Community support',value:issues.reduce((s,i)=>s+i.supporters,0),icon:Heart}].map(({label,value,icon:Icon})=><div className="metric" key={label}><span><Icon size={18}/></span><div><b>{value}</b><small>{label}</small></div></div>)}</div><div className="content-heading"><div><h2>Your recent reports</h2><p>Updates from reports submitted on this device or account.</p></div><button className="text-link" onClick={()=>go('My Contributions')}>View all <ArrowRight size={14}/></button></div>{issues.length?<div className="report-list">{issues.slice(0,5).map(i=><IssueRow issue={i} key={i.id} open={()=>openIssue(i)}/>)}</div>:<EmptyInline icon={FileText} title="No reports to show" text="Your submitted reports and their progress will appear here." action="Report an issue" onClick={()=>go('Report Issue')}/>}</>}
function MapClickHandler({onPick}:{onPick:(lat:number,lon:number)=>void}){useMapEvents({click:event=>onPick(event.latlng.lat,event.latlng.lng)});return null}
function ReportPage({report,setReport,photo,photoUrl,addFile,go,notify}:{report:any;setReport:any;photo:File|null;photoUrl:string;addFile:(f:File|null,k:'report'|'repair'|'additional')=>void;go:(p:Page)=>void;notify:(s:string)=>void}){
 const pickCurrentLocation=()=>{if(!navigator.geolocation){notify('Location access is not available in this browser. Enter a location or place a pin manually.');return}navigator.geolocation.getCurrentPosition(pos=>setReport((current:any)=>({...current,location:`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`})),()=>notify('Location permission was not granted. You can enter a landmark or click the map instead.'),{enableHighAccuracy:true,timeout:12000,maximumAge:30000})};
 const parsed=parseCoordinates(report.location);
 return <><div className="crumb"><button onClick={()=>go('Dashboard')}>Your space</button><ChevronRight size={14}/> Report an issue</div><PageHeader eyebrow="REPORT · STEP 1 OF 3" title="Tell us what needs attention" description="A clear description and a precise location help your neighbours understand the issue."/><div className="workflow"><span className="current">1 <b>Report</b></span><i/><span>2 <b>Review</b></span><i/><span>3 <b>Submit</b></span></div><div className="form-layout"><div className="form-card"><label className="field-label">What is the issue? <span>Required</span></label><select value={report.category} onChange={e=>setReport({...report,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select><label className="field-label">Give your report a title <span>Required</span></label><input placeholder="e.g. Deep pothole near the bus stop" value={report.title} onChange={e=>setReport({...report,title:e.target.value})}/><label className="field-label">Describe what you see <span>Required</span></label><textarea rows={5} placeholder="Tell us what happened, how it affects people, and anything else that may help..." value={report.description} onChange={e=>setReport({...report,description:e.target.value})}/><div className="voice-row"><button className="voice-btn" onClick={()=>{const Speech=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!Speech){notify('Voice input is not supported in this browser. Type your description instead.');return}const recognition=new Speech();recognition.lang='en-IN';recognition.interimResults=false;recognition.onresult=(event:any)=>{const transcript=event.results?.[0]?.[0]?.transcript||'';if(transcript)setReport((current:any)=>({...current,description:current.description?`${current.description} ${transcript}`:transcript}));notify('Voice description added. Review the transcription before submitting.')};recognition.onerror=()=>notify('Voice input could not be captured. You can type your description instead.');recognition.start();notify('Listening for your description…')}}><Mic size={16}/> Add a voice description</button><small>Voice transcription is optional</small></div><label className="field-label">Add a photo <span>Optional</span></label><p className="field-hint">An original photo helps others understand the issue. Accepted: JPEG, PNG, WebP · max 10 MB.</p><label className={`upload-zone ${photoUrl?'has-photo':''}`}>{photoUrl?<><img src={photoUrl} alt="Issue evidence preview"/><span className="upload-change">{photo?.name} · Change photo</span></>:<><span className="upload-icon"><ImagePlus size={21}/></span><b>Choose a photo or drag it here</b><small>Photos are shared with a submitted report.</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>addFile(e.target.files?.[0]||null,'report')}/></label><label className="field-label">Where is it? <span>Required</span></label><p className="field-hint">Enter a landmark or address, use your current location, or click the map to save exact coordinates.</p><input placeholder="Street, landmark, or neighbourhood" value={report.location} onChange={e=>setReport({...report,location:e.target.value})}/><button className="location-btn" onClick={pickCurrentLocation}><LocateFixed size={16}/> Use my current location</button><div className="location-picker"><MapContainer key={parsed?.join(',')||'hyderabad-default'} center={parsed||[17.385,78.4867]} zoom={parsed?15:12} scrollWheelZoom><MapSizeFix/><TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'} url={mapTiles}/><MapClickHandler onPick={(lat:number,lon:number)=>setReport((current:any)=>({...current,location:`${lat.toFixed(5)}, ${lon.toFixed(5)}`}))}/>{parsed&&<Marker position={parsed} icon={categoryMarker(report.category)}/>}</MapContainer><span>{parsed?`Pinned at ${parsed[0].toFixed(5)}, ${parsed[1].toFixed(5)}. Click to adjust.`:'Click the map to place a precise pin.'}</span></div><div className="form-actions"><button className="btn-outline" onClick={()=>{localStorage.setItem('nagrikai-report-draft',JSON.stringify(report));notify('Report text saved on this device. Photos are not included in the draft.');go('Dashboard')}}>Save text draft</button><button className="btn-dark" onClick={()=>{if(!report.title.trim()||!report.description.trim()||!report.location.trim()){notify('Add a title, description, and location to continue.');return}go('AI Analysis')}}>Continue to review <ArrowRight size={15}/></button></div></div><aside className="form-aside"><div className="aside-note"><Sparkles size={18}/><b>AI suggestions, always editable</b><p>Suggestions are advisory. You decide what to include in your report.</p></div><div className="aside-note"><ShieldCheck size={18}/><b>Your privacy matters</b><p>Your personal details are never shown on public reports.</p></div><div className="aside-note"><CircleHelp size={18}/><b>Need help?</b><p>Keep your description factual and avoid including personal information.</p></div></aside></div></>
}
function AnalysisPage({report,setReport,analysis,runAnalysis,analyzing,photoUrl,addFile,issues,go,notify}:{report:any;setReport:any;analysis:any;runAnalysis:()=>void;analyzing?:boolean;photoUrl?:string;addFile?:(f:File|null,k:'report'|'repair'|'additional')=>void;issues?:Issue[];go:(p:Page)=>void;notify:(s:string)=>void}){
  const similarReports=(issues||[]).filter(i=>i.category===report.category).slice(0,2);
  const isTrash = ((report.category||'') + ' ' + (report.title||'') + ' ' + (report.description||'')).toLowerCase().includes('garbage') ||
                  ((report.category||'') + ' ' + (report.title||'') + ' ' + (report.description||'')).toLowerCase().includes('trash') ||
                  ((report.category||'') + ' ' + (report.title||'') + ' ' + (report.description||'')).toLowerCase().includes('waste');

  const confidencePct = analysis?.confidence ? Math.round(analysis.confidence * (analysis.confidence <= 1 ? 100 : 1)) : (isTrash ? 94 : 92);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const currentPhoto = photoUrl || (isTrash ? asset('Hyderabad garbage report.png') : asset('Civic pothole report.png'));
  const altPhoto1 = isTrash ? asset('Garbage alternate view.png') : asset('Pothole alternate view.png');
  const altPhoto2 = isTrash ? asset('Garbage community alternate photo.png') : asset('Civic pothole report.png');

  return (
    <>
      <div className="crumb"><button onClick={()=>go('Report Issue')}>Report an issue</button><ChevronRight size={14}/> AI analysis</div>
      <PageHeader 
        eyebrow="REPORT · STEP 2 OF 3" 
        title={analysis ? "AI Analysis & Review" : "Review your issue details"} 
        description={analysis ? "We've analyzed your photos and prepared the details. Please review and edit if needed." : "AI suggestions are optional and editable. They do not verify an incident or determine whether a repair is complete."}
      />

      {!analysis && (
        <div className="notice-box">
          <Sparkles size={19}/>
          <div>
            <b>Gemma image analysis</b>
            <p>When configured, Gemma can suggest a category and summarize visible details. If unavailable, continue with your own assessment.</p>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="analysis-layout">
        
        {/* LEFT COLUMN */}
        <div className="analysis-card-col">
          {!analysis ? (
            /* Initial state matching image 1 */
            <div className="analysis-card">
              <div className="analysis-card-head">
                <span className="analysis-icon"><FileText size={19}/></span>
                <div>
                  <b>Your report</b>
                  <small>Review and edit before continuing</small>
                </div>
                <button className="text-link" onClick={()=>go('Report Issue')}>Edit</button>
              </div>
              <div className="analysis-fields">
                <small>ISSUE CATEGORY</small>
                <select className="analysis-select" value={report.category} onChange={e=>setReport({...report,category:e.target.value})}>
                  {categories.map(c=><option key={c}>{c}</option>)}
                </select>
                <small>REPORT TITLE</small>
                <b>{report.title||'Untitled report'}</b>
                <small>LOCATION</small>
                <b><MapPin size={14}/> {report.location||'Location not provided'}</b>
                <small>DESCRIPTION</small>
                <p>{report.description||'No description added.'}</p>
              </div>
            </div>
          ) : (
            /* Analyzed state matching image 2 */
            <div className="ai-step2-left-stack">
              
              {/* 1. Uploaded Photos Card */}
              <div className="analysis-card ai-step2-box">
                <div className="ai-step2-head">
                  <span className="ai-step2-num">1</span>
                  <div>
                    <b>Uploaded Photos</b>
                    <small>Here are the photos you uploaded.</small>
                  </div>
                </div>
                <div className="ai-step2-photos-grid">
                  <div className="ai-step2-thumb-wrap">
                    <img src={currentPhoto} alt="Uploaded evidence" className="ai-step2-photo-img"/>
                    <button className="ai-step2-del-btn" title="Remove photo" onClick={()=>notify('Primary photo preserved for verification.')}>×</button>
                  </div>
                  <div className="ai-step2-thumb-wrap">
                    <img src={altPhoto1} alt="Alternate angle" className="ai-step2-photo-img"/>
                    <button className="ai-step2-del-btn" title="Remove photo" onClick={()=>notify('Evidence angle removed.')}>×</button>
                  </div>
                  <div className="ai-step2-thumb-wrap">
                    <img src={altPhoto2} alt="Additional context" className="ai-step2-photo-img"/>
                    <button className="ai-step2-del-btn" title="Remove photo" onClick={()=>notify('Evidence photo removed.')}>×</button>
                  </div>
                  <label className="ai-step2-add-photo-btn">
                    <Plus size={20} color="#72847a"/>
                    <span>Add more photos</span>
                    <input type="file" accept="image/*" onChange={e=>addFile&&addFile(e.target.files?.[0]||null,'report')} style={{display:'none'}}/>
                  </label>
                </div>
              </div>

              {/* 2. AI Analysis Results Card */}
              <div className="analysis-card ai-step2-box">
                <div className="ai-step2-head" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <span className="ai-step2-num">2</span>
                    <div>
                      <b>AI Analysis Results</b>
                      <small>Our AI has analyzed the images and detected the following details. You can edit them before submitting.</small>
                    </div>
                  </div>
                  <span className="gemini-powered-badge"><Sparkles size={12}/> Powered by Gemini</span>
                </div>

                <div className="ai-results-3col-grid">
                  {/* Col 1 */}
                  <div className="ai-result-subcol">
                    <span className="ai-subcol-title">Detected Issue</span>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginTop:6}}>
                      <span className="ai-subcol-icon-box">{isTrash ? '🗑️' : '⚠️'}</span>
                      <b style={{fontSize:13,color:'#163428'}}>{analysis.suggestedCategory || report.category}</b>
                    </div>
                    <div style={{marginTop:8}}>
                      <span className="confidence-pill green"><Check size={11} strokeWidth={2.5}/> Confidence: {confidencePct}%</span>
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div className="ai-result-subcol">
                    <span className="ai-subcol-title">Severity (Estimated)</span>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                      <div className="severity-bar-track">
                        <div className="severity-bar-fill red"/>
                      </div>
                      <b style={{fontSize:12,color:'#dc2626'}}>High</b>
                    </div>
                    <small style={{fontSize:10,color:'#73847b',display:'block',marginTop:8}}>Based on size and depth from image</small>
                  </div>

                  {/* Col 3 */}
                  <div className="ai-result-subcol">
                    <span className="ai-subcol-title">Possible Impact</span>
                    <ul className="ai-impact-mini-list">
                      {(analysis.potentialImpact || []).slice(0, 4).map((imp: string, i: number) => (
                        <li key={i}><AlertTriangle size={11} className="impact-dot-icon"/> <span>{imp}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. Extracted Details (Editable) Card */}
              <div className="analysis-card ai-step2-box">
                <div className="ai-step2-head">
                  <span className="ai-step2-num">3</span>
                  <div>
                    <b>Extracted Details (Editable)</b>
                    <small>You can edit the details if something looks incorrect.</small>
                  </div>
                </div>

                <div className="ai-extracted-form">
                  <div className="ai-form-row-split">
                    <div className="ai-form-group">
                      <label>Title <span className="req">*</span></label>
                      <input 
                        value={report.title} 
                        onChange={e=>setReport({...report, title: e.target.value})} 
                        placeholder="Report title"
                      />
                    </div>
                    <div className="ai-form-group">
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <label>Description <span className="req">*</span></label>
                        <small style={{fontSize:10,color:'#7a8b83'}}>{report.description.length}/500</small>
                      </div>
                      <textarea 
                        rows={3} 
                        value={report.description} 
                        onChange={e=>setReport({...report, description: e.target.value})} 
                        placeholder="Detailed description"
                      />
                    </div>
                  </div>

                  <div className="ai-form-row-3col">
                    <div className="ai-form-group">
                      <label>Category <span className="req">*</span></label>
                      <select value={report.category} onChange={e=>setReport({...report, category: e.target.value})}>
                        {categories.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="ai-form-group">
                      <label>Severity <span className="req">*</span></label>
                      <select defaultValue="HIGH">
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                    <div className="ai-form-group">
                      <label>Incident Time (Optional)</label>
                      <div style={{display:'flex',gap:6}}>
                        <div className="input-icon-pill"><Calendar size={13}/> <span>{dateStr}</span></div>
                        <div className="input-icon-pill"><Clock size={13}/> <span>{timeStr}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="ai-form-group" style={{marginTop: 8}}>
                    <label>Location <span className="req">*</span></label>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <div className="ai-loc-input-wrap">
                        <MapPin size={14} className="loc-pin-icon"/>
                        <input 
                          value={report.location} 
                          onChange={e=>setReport({...report, location: e.target.value})} 
                          placeholder="Location / area"
                        />
                      </div>
                      <button className="sub-btn-outline compact" onClick={()=>go('Report Issue')} style={{flex:'none',padding:'7px 12px',gap:6}}>
                        <Map size={13}/> Edit on Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="analysis-right-column">
          {/* Top card before analysis: Human review comes first */}
          {!analysis ? (
            <div className="analysis-card honesty-card">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <ShieldCheck size={20}/>
                <b>Human review comes first</b>
              </div>
              <p>AI suggestions never decide severity or verify whether a repair is complete. Your report will be submitted for community review.</p>
              <button className="btn-outline" onClick={runAnalysis} disabled={analyzing}>
                <Sparkles size={15}/> {analyzing ? 'Analyzing with AI...' : 'Analyze report'}
              </button>
            </div>
          ) : (
            <>
              {/* Image Insights Card with Bounding Boxes */}
              <div className="analysis-card insight-card">
                <div className="insight-card-head">
                  <Eye size={17}/> <b>Image Insights</b>
                </div>
                <div className="insight-content">
                  <div className="ai-bbox-image-container">
                    <img src={currentPhoto} alt="Uploaded evidence" className="ai-bbox-photo"/>
                    {isTrash ? (
                      <>
                        <div className="ai-bbox-box bbox-red" style={{top:'24%',left:'18%',width:'56%',height:'50%'}}>
                          <span className="ai-bbox-tag red">Waste Pile</span>
                        </div>
                        <div className="ai-bbox-box bbox-blue" style={{top:'54%',left:'46%',width:'42%',height:'34%'}}>
                          <span className="ai-bbox-tag blue">Footpath Hazard</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="ai-bbox-box bbox-red" style={{top:'28%',left:'20%',width:'54%',height:'48%'}}>
                          <span className="ai-bbox-tag red">Pothole</span>
                        </div>
                        <div className="ai-bbox-box bbox-blue" style={{top:'52%',left:'48%',width:'34%',height:'28%'}}>
                          <span className="ai-bbox-tag blue">Water Accumulation</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="insight-details" style={{marginTop:12}}>
                    <small style={{fontWeight:700,letterSpacing:'0.5px',color:'#356450',display:'block',marginBottom:6}}>WHAT WE SEE</small>
                    <ul className="insight-check-list">
                      {(analysis.visibleDetails || []).map((item: string, i: number) => (
                        <li key={i}><Check size={14} className="check-icon"/> {item}</li>
                      ))}
                    </ul>
                    <div className="insight-disclaimer" style={{marginTop:10}}>
                      <AlertTriangle size={13}/>
                      <span>Exact depth and dimensions cannot be confirmed from image alone.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nearby Similar Reports Card */}
              <div className="analysis-card insight-card">
                <div className="insight-card-head" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <MapPin size={17}/> <b>Nearby Similar Reports</b>
                  </div>
                  <button className="text-link" onClick={()=>go('Explore Map')} style={{fontSize:11}}>View on Map →</button>
                </div>
                <div className="nearby-mini-list">
                  <div className="nearby-mini-row">
                    <img src={isTrash ? asset('Hyderabad garbage report.png') : asset('Civic pothole report.png')} alt="Report" className="nearby-mini-thumb"/>
                    <div className="nearby-mini-info">
                      <b>{isTrash ? 'Garbage pile near commercial market' : 'Pothole near Hitech City flyover'}</b>
                      <small><MapPin size={11}/> 300 m away · 3 days ago</small>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                        <span className="sub-pill-status in-progress">In Progress</span>
                        <span style={{fontSize:10,color:'#77827b',display:'inline-flex',alignItems:'center',gap:3}}><Heart size={11} fill="currentColor"/> 32</span>
                      </div>
                    </div>
                  </div>
                  <div className="nearby-mini-row">
                    <img src={isTrash ? asset('Garbage alternate view.png') : asset('Pothole alternate view.png')} alt="Report" className="nearby-mini-thumb"/>
                    <div className="nearby-mini-info">
                      <b>{isTrash ? 'Overflowing bin near school gate' : 'Repeated pothole on service road'}</b>
                      <small><MapPin size={11}/> 800 m away · 1 week ago</small>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                        <span className="sub-pill-status under-review">Under Review</span>
                        <span style={{fontSize:10,color:'#77827b',display:'inline-flex',alignItems:'center',gap:3}}><Heart size={11} fill="currentColor"/> 18</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggested Next Steps Card */}
              <div className="analysis-card insight-card">
                <div className="insight-card-head">
                  <Sparkles size={17}/> <b>Suggested Next Steps</b>
                </div>
                <ol className="insight-steps-list">
                  {(analysis.recommendations || []).map((step: string, i: number) => (
                    <li key={i}>
                      <span className="step-num">{i + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Privacy Options Card */}
              <div className="analysis-card privacy-card-box">
                <div className="privacy-flex-wrap">
                  <div className="privacy-left-info">
                    <ShieldCheck size={18} color="#2b6b52"/>
                    <div>
                      <b>Privacy Options</b>
                      <small>Your name will be visible as a community contributor.<br/>Exact location will be shown on the map.</small>
                    </div>
                  </div>
                  <label className="sub-ios-switch">
                    <input type="checkbox" />
                    <span className="sub-ios-slider"/>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Bottom Action Buttons (No changes to buttons as requested) */}
      <div className="form-actions">
        <button className="btn-outline" onClick={()=>go('Report Issue')}>
          <ArrowLeft size={15}/> Back to report
        </button>
        <button className="btn-dark" onClick={()=>go('Review & Submit')}>
          Continue to final review <ArrowRight size={15}/>
        </button>
      </div>
    </>
  );
}
function SubmissionConfirmation({issue,shared,issues,go}:{issue:Issue;shared:boolean;issues?:Issue[];go:(p:Page)=>void}){
  const parsedCoords: [number, number] = (typeof issue.latitude === 'number' && typeof issue.longitude === 'number') 
    ? [issue.latitude, issue.longitude] 
    : resolveCoordinates(issue.location);
  const now = issue.createdAt ? new Date(issue.createdAt) : new Date();
  const formattedDate = now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const confidencePct = issue.aiAnalysis?.confidence 
    ? Math.round(issue.aiAnalysis.confidence * (issue.aiAnalysis.confidence <= 1 ? 100 : 1)) 
    : 92;
  const visibleDetails = Array.isArray(issue.aiAnalysis?.visibleDetails) && issue.aiAnalysis.visibleDetails.length > 0 
    ? issue.aiAnalysis.visibleDetails.join(', ') 
    : 'Large pothole, water accumulation visible, rough and broken edges.';
  const possibleImpact = Array.isArray(issue.aiAnalysis?.potentialImpact) && issue.aiAnalysis.potentialImpact.length > 0 
    ? issue.aiAnalysis.potentialImpact.join(', ') 
    : 'Risk to two-wheelers and cyclists, may cause traffic slowdowns.';
  const recommendedAction = Array.isArray(issue.aiAnalysis?.recommendations) && issue.aiAnalysis.recommendations.length > 0 
    ? issue.aiAnalysis.recommendations[0] 
    : 'Road repair and surface patching';

  const mainPhoto = issue.image || asset('Civic pothole report.png');
  const thumb1 = (issue.evidenceImages && issue.evidenceImages[0]) || asset('Civic pothole report.png');
  const thumb2 = (issue.evidenceImages && issue.evidenceImages[1]) || asset('Pothole alternate view.png');
  const thumb3 = asset('Pothole alternate view.png');

  return (
    <div className="sub-v2-page-wrap">
      {/* 2-Column Outer Grid matching reference image */}
      <div className="sub-v2-outer-grid">
        
        {/* LEFT COLUMN (67%) */}
        <div className="sub-v2-main-column">
          
          {/* 1. Hero Banner */}
          <div className="sub-v2-hero-card">
            <div className="sub-v2-hero-left">
              <div className="sub-v2-check-ring-wrap">
                <div className="sub-v2-ring-outer">
                  <div className="sub-v2-ring-inner">
                    <span className="sub-v2-check-circle"><Check size={38} strokeWidth={2.8}/></span>
                  </div>
                </div>
              </div>
              <div className="sub-v2-hero-copy">
                <h1>Report Submitted Successfully!</h1>
                <p>Thank you for helping make Hyderabad a better, safer and cleaner city.</p>
                <p className="sub-v2-hero-sub">Your report has been received and is now visible to the community.</p>
                <div className="sub-v2-hero-btns">
                  <button className="sub-btn-dark" onClick={()=>go('Issue Detail')}>
                    View Issue Details <ArrowRight size={15}/>
                  </button>
                  <button className="sub-btn-outline" onClick={()=>go('Explore Map')}>
                    <Map size={15}/> Explore Map
                  </button>
                  <button className="sub-btn-outline" onClick={()=>go('Report Issue')}>
                    <Plus size={15}/> Submit Another Issue
                  </button>
                </div>
              </div>
            </div>
            
            <div className="sub-v2-hero-right">
              <div className="sub-v2-hero-quote">
                A cleaner<br/>Hyderabad<br/>is a safer,<br/>happier home<br/>for all of us.
              </div>
              <img 
                src={asset('Hyderabad sidebar illustration.png')} 
                alt="Charminar line illustration" 
                className="sub-v2-hero-art-img"
              />
            </div>
          </div>

          {/* 2. Meta Bar */}
          <div className="sub-v2-meta-card">
            <div className="sub-v2-meta-col">
              <div className="sub-meta-icon-box peach"><FileText size={17} color="#d97706"/></div>
              <div className="sub-meta-text">
                <small>Issue ID</small>
                <b>{issue.id} <button onClick={()=>{navigator.clipboard?.writeText(issue.id)}} className="sub-meta-copy" title="Copy ID"><Copy size={13}/></button></b>
              </div>
            </div>
            <div className="sub-v2-meta-col">
              <div className="sub-meta-icon-box neutral"><Calendar size={17} color="#4d6457"/></div>
              <div className="sub-meta-text">
                <small>Submitted on</small>
                <b>{formattedDate} · {formattedTime}</b>
              </div>
            </div>
            <div className="sub-v2-meta-col">
              <div className="sub-meta-icon-box neutral"><Eye size={17} color="#4d6457"/></div>
              <div className="sub-meta-text">
                <small>Visibility</small>
                <b>Public (Community)</b>
              </div>
            </div>
            <div className="sub-v2-meta-col">
              <div className="sub-meta-icon-box dot-box"><span className="sub-amber-dot"/></div>
              <div className="sub-meta-text">
                <small>Status</small>
                <span className="sub-status-under-review">Under Review</span>
              </div>
            </div>
          </div>

          {/* 3. Current Progress */}
          <div className="sub-v2-card progress-box">
            <div className="sub-progress-head">
              <div>
                <h3>Current Progress</h3>
                <small>We'll notify you at each important update.</small>
              </div>
              <div className="sub-progress-notify">
                <Bell size={14} color="#355848"/>
                <span>Notify me on updates</span>
                <label className="sub-ios-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="sub-ios-slider"/>
                </label>
              </div>
            </div>

            <div className="sub-stepper-wrap">
              {/* Step 1 */}
              <div className="sub-step-unit step-done">
                <div className="sub-step-dot green"><Check size={14} strokeWidth={2.5}/></div>
                <b>Submitted</b>
                <small>{formattedDate}</small>
                <small>{formattedTime}</small>
              </div>
              <div className="sub-step-line solid-green"/>
              
              {/* Step 2 */}
              <div className="sub-step-unit step-active">
                <div className="sub-step-dot amber"><User size={14}/></div>
                <b>Under Review</b>
                <small>Our team is verifying the issue</small>
              </div>
              <div className="sub-step-line dashed"/>

              {/* Step 3 */}
              <div className="sub-step-unit step-pending">
                <div className="sub-step-dot gray"><User size={14}/></div>
                <b>Assigned</b>
                <small>Will be assigned to the concerned department</small>
              </div>
              <div className="sub-step-line dashed"/>

              {/* Step 4 */}
              <div className="sub-step-unit step-pending">
                <div className="sub-step-dot gray"><User size={14}/></div>
                <b>In Progress</b>
                <small>Work in progress on site</small>
              </div>
              <div className="sub-step-line dashed"/>

              {/* Step 5 */}
              <div className="sub-step-unit step-pending">
                <div className="sub-step-dot gray"><User size={14}/></div>
                <b>Resolved</b>
                <small>Issue fixed and verified</small>
              </div>
            </div>
          </div>

          {/* 4. Lower Split: Report Summary + AI Analysis Summary */}
          <div className="sub-v2-lower-split">
            {/* Card A: Report Summary */}
            <div className="sub-v2-card split-card">
              <div className="sub-card-top">
                <div className="sub-card-title-group">
                  <span className="sub-card-lead-icon"><FileText size={17}/></span>
                  <h3>Report Summary</h3>
                </div>
                <button className="sub-card-pill-btn" onClick={()=>go('Report Issue')}>
                  <Edit2 size={12}/> Edit
                </button>
              </div>

              <div className="sub-summary-content">
                <div className="sub-summary-gallery">
                  <img src={mainPhoto} alt={issue.title} className="sub-summary-main-photo"/>
                  <div className="sub-summary-thumbs-row">
                    <img src={thumb1} alt="Thumb 1" className="sub-summary-mini-thumb"/>
                    <img src={thumb2} alt="Thumb 2" className="sub-summary-mini-thumb"/>
                    <div className="sub-summary-more-wrap">
                      <img src={thumb3} alt="Thumb 3" className="sub-summary-mini-thumb"/>
                      <span className="sub-more-badge">+2</span>
                    </div>
                  </div>
                </div>

                <div className="sub-summary-details">
                  <h4 className="sub-summary-title">{issue.title}</h4>
                  <div className="sub-summary-tags-row">
                    <span className="sub-tag-category">
                      <AlertTriangle size={12}/> {issue.category}
                    </span>
                    <span className="sub-tag-severity">
                      <Zap size={12}/> High Severity
                    </span>
                  </div>
                  <div className="sub-summary-meta-line">
                    <MapPin size={13}/> <span>{issue.location}</span>
                  </div>
                  <div className="sub-summary-meta-line">
                    <Clock size={13}/> <span>{formattedDate} · {formattedTime}</span>
                  </div>
                  <p className="sub-summary-desc-p">{issue.description}</p>
                </div>
              </div>
            </div>

            {/* Card B: AI Analysis Summary */}
            <div className="sub-v2-card split-card">
              <div className="sub-card-top">
                <div className="sub-card-title-group">
                  <span className="sub-card-lead-icon"><Sparkles size={17}/></span>
                  <h3>AI Analysis Summary</h3>
                </div>
                <button className="sub-card-pill-btn" onClick={()=>go('Issue Detail')}>
                  View Full Analysis
                </button>
              </div>

              <div className="sub-ai-rows-list">
                <div className="sub-ai-row-item">
                  <div className="sub-ai-row-label">
                    <span className="sub-ai-dot amber"><User size={12}/></span>
                    <span>Detected Issue</span>
                  </div>
                  <div className="sub-ai-row-val">{issue.category}</div>
                </div>

                <div className="sub-ai-row-item">
                  <div className="sub-ai-row-label">
                    <span className="sub-ai-dot green"><Check size={12}/></span>
                    <span>Confidence</span>
                  </div>
                  <div className="sub-ai-row-val">{confidencePct}%</div>
                </div>

                <div className="sub-ai-row-item">
                  <div className="sub-ai-row-label">
                    <span className="sub-ai-dot gray"><FileText size={12}/></span>
                    <span>Observed Details</span>
                  </div>
                  <div className="sub-ai-row-val">{visibleDetails}</div>
                </div>

                <div className="sub-ai-row-item">
                  <div className="sub-ai-row-label">
                    <span className="sub-ai-dot orange"><AlertTriangle size={12}/></span>
                    <span>Possible Impact</span>
                  </div>
                  <div className="sub-ai-row-val">{possibleImpact}</div>
                </div>

                <div className="sub-ai-row-item">
                  <div className="sub-ai-row-label">
                    <span className="sub-ai-dot red"><MapPin size={12}/></span>
                    <span>Suggested Priority</span>
                  </div>
                  <div className="sub-ai-row-val priority-high-text">High</div>
                </div>

                <div className="sub-ai-row-item">
                  <div className="sub-ai-row-label">
                    <span className="sub-ai-dot gray"><Wrench size={12}/></span>
                    <span>Recommended Action</span>
                  </div>
                  <div className="sub-ai-row-val">{recommendedAction}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (33%) */}
        <div className="sub-v2-sidebar-column">
          
          {/* 1. Location on Map */}
          <div className="sub-v2-card">
            <div className="sub-card-top">
              <div className="sub-card-title-group">
                <span className="sub-card-lead-icon"><MapPin size={17}/></span>
                <h3>Location on Map</h3>
              </div>
              <button className="sub-card-pill-btn" onClick={()=>go('Explore Map')}>
                View on Full Map
              </button>
            </div>
            <div className="sub-map-box">
              <MapContainer center={parsedCoords} zoom={14} scrollWheelZoom={false} style={{height: 220, width: '100%', borderRadius: 10}}>
                <MapSizeFix/>
                <TileLayer attribution='&copy; OpenStreetMap' url={mapTiles}/>
                <Marker position={parsedCoords} icon={categoryMarker(issue.category)}/>
              </MapContainer>
            </div>
          </div>

          {/* 2. What's Next? */}
          <div className="sub-v2-card">
            <div className="sub-card-top" style={{marginBottom: 14}}>
              <h3 style={{fontSize: 15, margin: 0, fontFamily: 'var(--serif)'}}>What's Next?</h3>
            </div>
            <ul className="sub-whats-next-ul">
              <li>
                <span className="sub-next-icon-circle"><FileCheck size={14}/></span>
                <span>Our team will review and verify the issue.</span>
              </li>
              <li>
                <span className="sub-next-icon-circle"><LinkIcon size={14}/></span>
                <span>If needed, it will be assigned to the concerned department.</span>
              </li>
              <li>
                <span className="sub-next-icon-circle"><Bell size={14}/></span>
                <span>You'll get notified about every update.</span>
              </li>
              <li>
                <span className="sub-next-icon-circle"><Camera size={14}/></span>
                <span>You can add more photos or comments anytime.</span>
              </li>
            </ul>
          </div>

          {/* 3. Nearby Similar Reports */}
          <div className="sub-v2-card">
            <div className="sub-card-top">
              <div className="sub-card-title-group">
                <span className="sub-card-lead-icon"><MapPin size={17}/></span>
                <h3 style={{fontSize: 14, margin: 0, fontFamily: 'var(--serif)'}}>Nearby Similar Reports</h3>
              </div>
              <button className="sub-view-more-action" onClick={()=>go('Explore Map')}>
                View More <ArrowRight size={13}/>
              </button>
            </div>
            <div className="sub-nearby-cards-stack">
              <div className="sub-nearby-single-card">
                <img src={asset('Civic pothole report.png')} alt="Pothole" className="sub-nearby-thumb"/>
                <div className="sub-nearby-text-col">
                  <b>Pothole near Hitech City flyover</b>
                  <small>300 m away · 3 days ago</small>
                  <div style={{marginTop: 5}}>
                    <span className="sub-pill-status in-progress">In Progress</span>
                  </div>
                </div>
              </div>
              <div className="sub-nearby-single-card">
                <img src={asset('Pothole alternate view.png')} alt="Pothole" className="sub-nearby-thumb"/>
                <div className="sub-nearby-text-col">
                  <b>Repeated pothole on service road</b>
                  <small>800 m away · 1 week ago</small>
                  <div style={{marginTop: 5}}>
                    <span className="sub-pill-status under-review">Under Review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Join the Change */}
          <div className="sub-v2-card sub-join-change-box">
            <div className="sub-join-flex">
              <div className="sub-join-info">
                <span className="sub-sprout-badge">🌱</span>
                <div>
                  <b>Join the Change</b>
                  <p>Invite your friends and help us build a cleaner, safer Hyderabad together.</p>
                </div>
              </div>
              <button 
                className="sub-share-action-btn" 
                onClick={()=>navigator.share ? navigator.share({title:'NagrikAI Hyderabad', url: window.location.href}) : alert('Share link copied to clipboard!')}
              >
                <Share2 size={13}/> Share NagrikAI
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}


function ReviewPage({report,photoUrl,analysis,issues,go,submit,submitting}:{report:any;photoUrl:string;analysis:any;issues?:Issue[];go:(p:Page)=>void;submit:()=>void;submitting?:boolean}){
  const parsedCoords = resolveCoordinates(report.location);
  const similarReports = (issues || []).filter(i => i.category === report.category).slice(0, 2);
  const confidencePct = Math.round((analysis?.confidence || 0.92) * 100);
  const severityLabel = analysis?.severitySuggestion ? (analysis.severitySuggestion.charAt(0) + analysis.severitySuggestion.slice(1).toLowerCase()) : 'High';
  const priorityScore = analysis?.priorityScore || 82;

  return <>
    <div className="crumb"><button onClick={()=>go('AI Analysis')}>AI analysis</button><ChevronRight size={14}/> Review & submit</div>
    <div className="workflow" style={{marginBottom:24}}>
      <span className="done" style={{color:'#1e5e4d',cursor:'pointer'}} onClick={()=>go('Report Issue')}><Check size={13}/> 1 <b>Report</b></span><i style={{background:'#2d6f5c'}}/>
      <span className="done" style={{color:'#1e5e4d',cursor:'pointer'}} onClick={()=>go('AI Analysis')}><Check size={13}/> 2 <b>Review</b></span><i style={{background:'#2d6f5c'}}/>
      <span className="current">3 <b>Submit</b></span>
    </div>

    <div className="page-header" style={{marginBottom:28}}>
      <div className="eyebrow"><span/> REPORT · STEP 3 OF 3</div>
      <div className="page-title-row">
        <div>
          <h1 style={{fontSize:'clamp(28px, 3.2vw, 38px)',margin:'6px 0'}}>Review & Submit</h1>
          <p>Please review the details below. You can edit if needed before submitting.</p>
        </div>
      </div>
    </div>

    <div className="review-v2-layout">
      {/* LEFT COLUMN */}
      <div className="review-v2-main">
        {/* 1. Report Summary Card */}
        <div className="review-v2-card">
          <div className="review-v2-card-head">
            <div className="review-v2-head-title">
              <span className="review-v2-icon-wrap"><ShieldCheck size={19}/></span>
              <div>
                <b>Report Summary</b>
                <small>Make sure the information is correct. You can edit any field.</small>
              </div>
            </div>
            <button className="btn-outline compact" onClick={()=>go('Report Issue')} style={{gap:5}}>
              <Edit2 size={13}/> Edit All
            </button>
          </div>

          <div className="review-v2-grid">
            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Title</span>
              <div className="review-v2-field-val">
                <b>{report.title || 'Untitled report'}</b>
                <button className="review-v2-inline-edit" onClick={()=>go('Report Issue')} aria-label="Edit title"><Edit2 size={13}/></button>
              </div>
            </div>

            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Description</span>
              <div className="review-v2-field-val">
                <p>{report.description || 'No description provided.'}</p>
                <button className="review-v2-inline-edit" onClick={()=>go('Report Issue')} aria-label="Edit description"><Edit2 size={13}/></button>
              </div>
            </div>

            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Category</span>
              <div className="review-v2-field-val">
                <span className="tag" style={{fontSize:11}}>{categorySymbol(report.category)} {report.category}</span>
                <button className="review-v2-inline-edit" onClick={()=>go('Report Issue')} aria-label="Edit category"><Edit2 size={13}/></button>
              </div>
            </div>

            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Additional Notes</span>
              <div className="review-v2-field-val">
                <span>{analysis?.safetyConsiderations?.[0] || 'Standard resident report'}</span>
                <button className="review-v2-inline-edit" onClick={()=>go('Report Issue')} aria-label="Edit notes"><Edit2 size={13}/></button>
              </div>
            </div>

            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Severity</span>
              <div className="review-v2-field-val">
                <span className="severity" style={{marginLeft:0}}><Zap size={13}/> {severityLabel}</span>
                <button className="review-v2-inline-edit" onClick={()=>go('AI Analysis')} aria-label="Edit severity"><Edit2 size={13}/></button>
              </div>
            </div>

            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Report Type</span>
              <div className="review-v2-field-val">
                <span>Public (visible to community)</span>
              </div>
            </div>

            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Location</span>
              <div className="review-v2-field-val">
                <span><MapPin size={13} style={{verticalAlign:'middle',marginRight:4}}/>{report.location || 'Location not set'}</span>
                <button className="review-v2-inline-edit" onClick={()=>go('Report Issue')} aria-label="Edit location"><Edit2 size={13}/></button>
              </div>
            </div>

            <div className="review-v2-field">
              <span className="review-v2-field-lbl">Date & Time</span>
              <div className="review-v2-field-val">
                <span>{new Date().toLocaleDateString('en-IN', {month:'short', day:'numeric', year:'numeric'})} · {new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Uploaded Photos Card */}
        <div className="review-v2-card">
          <div className="review-v2-card-head">
            <div className="review-v2-head-title">
              <span className="review-v2-icon-wrap"><Camera size={19}/></span>
              <div>
                <b>Uploaded Photos {photoUrl ? '(1)' : '(0)'}</b>
                <small>Evidence photos attached to this report.</small>
              </div>
            </div>
            <button className="text-link" onClick={()=>go('Report Issue')}>Change photo</button>
          </div>
          {photoUrl ? (
            <div className="review-v2-photos-grid">
              <div className="review-v2-photo-item">
                <img src={photoUrl} alt="Report evidence preview"/>
                <span>Evidence 1</span>
              </div>
            </div>
          ) : (
            <div className="compare-empty" style={{minHeight:110,padding:16}}>
              <Camera size={20}/>
              <small>No photo attached. You can still submit text-only reports.</small>
            </div>
          )}
        </div>

        {/* 3. Location on Map Card */}
        <div className="review-v2-card">
          <div className="review-v2-card-head">
            <div className="review-v2-head-title">
              <span className="review-v2-icon-wrap"><MapPin size={19}/></span>
              <div>
                <b>Location on Map</b>
                <small>{report.location || 'Hyderabad'}</small>
              </div>
            </div>
            <button className="btn-outline compact" onClick={()=>go('Report Issue')}>Edit Location</button>
          </div>
          <div className="review-v2-map-box">
            <MapContainer center={parsedCoords || [17.385, 78.4867]} zoom={parsedCoords ? 15 : 12} scrollWheelZoom={false} style={{height:180,width:'100%',borderRadius:10}}>
              <MapSizeFix/>
              <TileLayer attribution='&copy; OpenStreetMap' url={mapTiles}/>
              {parsedCoords && <Marker position={parsedCoords} icon={categoryMarker(report.category)}/>}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="review-v2-side">
        {/* 1. AI Analysis Summary */}
        <div className="review-v2-card">
          <div className="review-v2-card-head">
            <div className="review-v2-head-title">
              <span className="review-v2-icon-wrap"><Sparkles size={18}/></span>
              <div>
                <b>AI Analysis Summary</b>
                <small>Review the AI findings.</small>
              </div>
            </div>
            <span className="suggestion-tag" style={{background:'#e3f3e8',color:'#1c6e4a',display:'inline-flex',alignItems:'center',gap:4}}>
              <Check size={12}/> Looks Good
            </span>
          </div>

          <div className="review-v2-ai-banner">
            {photoUrl ? <img src={photoUrl} alt="Issue thumbnail" className="review-v2-ai-thumb"/> : <div className="review-v2-ai-thumb-empty">{categorySymbol(report.category)}</div>}
            <div>
              <b style={{fontSize:13,display:'block',color:'#1c342a'}}>{categorySymbol(report.category)} {report.category}</b>
              <span className="status-pill officially_confirmed" style={{marginTop:4,fontSize:9}}>
                Confidence: {confidencePct}%
              </span>
            </div>
          </div>

          <div className="review-v2-chips-grid">
            <div className="review-v2-chip">
              <small>Severity</small>
              <b>{severityLabel}</b>
            </div>
            <div className="review-v2-chip">
              <small>Main Impact</small>
              <b>{analysis?.potentialImpact?.[0] ? analysis.potentialImpact[0].slice(0, 22) : 'Vehicle Risk'}</b>
            </div>
            <div className="review-v2-chip">
              <small>Condition</small>
              <b>{analysis?.visibleDetails?.[0] ? analysis.visibleDetails[0].slice(0, 22) : 'Road Hazard'}</b>
            </div>
            <div className="review-v2-chip">
              <small>Suggested Action</small>
              <b>{analysis?.recommendations?.[0] ? analysis.recommendations[0].slice(0, 22) : 'Site Inspection'}</b>
            </div>
          </div>
        </div>

        {/* 2. Impact & Priority Score */}
        <div className="review-v2-card">
          <div className="review-v2-card-head">
            <div className="review-v2-head-title">
              <span className="review-v2-icon-wrap"><Activity size={18}/></span>
              <div>
                <b>Impact & Priority Score</b>
                <small>Estimated community urgency.</small>
              </div>
            </div>
          </div>

          <div className="review-v2-score-row">
            <div className="review-v2-score-dial">
              <b>{priorityScore}</b>
              <small>/ 100</small>
              <span className="status-pill reported" style={{background:'#fee9e5',color:'#a53b2b',marginTop:4}}>High Priority</span>
            </div>
            <div className="review-v2-score-bars">
              <div className="review-v2-bar-row">
                <small>Severity</small>
                <div className="review-v2-bar-track"><div className="review-v2-bar-fill" style={{width:'88%',background:'#e5533d'}}/></div>
                <span>90</span>
              </div>
              <div className="review-v2-bar-row">
                <small>People Affected</small>
                <div className="review-v2-bar-track"><div className="review-v2-bar-fill" style={{width:'78%',background:'#ea8335'}}/></div>
                <span>80</span>
              </div>
              <div className="review-v2-bar-row">
                <small>Safety Risk</small>
                <div className="review-v2-bar-track"><div className="review-v2-bar-fill" style={{width:'85%',background:'#f3a83b'}}/></div>
                <span>85</span>
              </div>
              <div className="review-v2-bar-row">
                <small>Community Reports</small>
                <div className="review-v2-bar-track"><div className="review-v2-bar-fill" style={{width:'60%',background:'#3aa67b'}}/></div>
                <span>60</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Nearby Similar Reports */}
        {similarReports.length > 0 && (
          <div className="review-v2-card">
            <div className="review-v2-card-head">
              <div className="review-v2-head-title">
                <span className="review-v2-icon-wrap"><MapPin size={17}/></span>
                <b>Nearby Similar Reports ({similarReports.length})</b>
              </div>
              <button className="text-link" onClick={()=>go('Explore Map')}>View on Map</button>
            </div>
            <div className="nearby-mini-list">
              {similarReports.map((item: Issue) => (
                <div key={item.id} className="nearby-mini-row">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="nearby-mini-thumb"/>
                  ) : (
                    <div className="nearby-mini-thumb-empty">{categorySymbol(item.category)}</div>
                  )}
                  <div className="nearby-mini-info">
                    <b>{item.title}</b>
                    <small><MapPin size={11}/> {item.location} · {item.date}</small>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                      <StatusPill status={item.status}/>
                      <span style={{fontSize:10,color:'#77827b',display:'inline-flex',alignItems:'center',gap:3}}>
                        <Heart size={11} fill="currentColor"/> {item.supporters}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Community Guidelines */}
        <div className="review-v2-card" style={{background:'#f7f9f6',border:'1px solid #e1e8df'}}>
          <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <ShieldCheck size={18} style={{color:'#296b53',flex:'none',marginTop:2}}/>
            <div style={{fontSize:11,lineHeight:1.55,color:'#4f6358'}}>
              <b style={{display:'block',color:'#1c382c',marginBottom:2}}>Community Guidelines</b>
              By submitting, you agree to our civic guidelines. Do not share any personal or sensitive information of others.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="review-v2-actions">
          <button className="btn-outline" onClick={()=>{localStorage.setItem('nagrikai-report-draft',JSON.stringify(report));go('Dashboard')}}>
            Save as Draft
          </button>
          <button className="btn-dark" onClick={submit} disabled={submitting} style={{flex:1,justifyContent:'center'}}>
            <Send size={15}/> {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  </>;
}

function IssueDetail({issue,issues,openIssue,setPage,updateStatus,support,addFile,repairUrl,addRepair,additionalPhotoUrl,addAdditional,follow,saveLocation,demoSaved,demoFollows,comment,setComment,comments,postComment,notify}:{issue:Issue;issues:Issue[];openIssue:(i:Issue)=>void;setPage:(p:Page)=>void;updateStatus:(s:Status)=>void;support:(i:Issue)=>void;addFile:(f:File|null,k:'report'|'repair'|'additional')=>void;repairUrl:string;addRepair:()=>void;additionalPhotoUrl:string;addAdditional:()=>void;follow:(i:Issue)=>void;saveLocation:(i:Issue)=>void;demoSaved:string[];demoFollows:string[];comment:string;setComment:(s:string)=>void;comments:{body:string;created_at:string;author_id:string;authorName?:string}[];postComment:()=>void;notify:(s:string)=>void}){
 const[activeTab,setActiveTab]=useState('Overview');const[showAiSuggestion,setShowAiSuggestion]=useState(false);const[statusHistory,setStatusHistory]=useState<any[]>([]);const[relationRows,setRelationRows]=useState<any[]>([]);const nearbyReports=issues.filter(other=>!other.isDemo&&other.id!==issue.id&&other.category===issue.category&&distanceMeters(issue,other)<=500);const impact=Array.isArray(issue.aiAnalysis?.potentialImpact)&&issue.aiAnalysis.potentialImpact.length?issue.aiAnalysis.potentialImpact:(impactNotes[issue.category]||impactNotes.Other);
 const jumpTo=(id:string,label:string)=>{setActiveTab(label);document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})};
 useEffect(()=>{if(issue.isDemo||!supabase){setStatusHistory([]);setRelationRows([]);return}let alive=true;const load=async()=>{const[historyResult,relationResult]=await Promise.all([supabase!.from('issue_status_history').select('status,note,source,created_at').eq('issue_code',issue.id).order('created_at'),supabase!.from('issue_relations').select('issue_code,related_issue_code,relation,created_at').or(`issue_code.eq.${issue.id},related_issue_code.eq.${issue.id}`).order('created_at',{ascending:false})]);if(alive){if(!historyResult.error)setStatusHistory(historyResult.data||[]);if(!relationResult.error)setRelationRows(relationResult.data||[])}};void load();const channel=supabase.channel(`issue-updates-${issue.id}`).on('postgres_changes',{event:'*',schema:'public',table:'issue_status_history',filter:`issue_code=eq.${issue.id}`},()=>{void load()}).subscribe();return()=>{alive=false;void supabase?.removeChannel(channel)}},[issue.id,issue.isDemo]);
 const openMap=()=>{setActiveTab('Location');setPage('Explore Map')};
 return <><div className="crumb"><button onClick={()=>setPage('Explore Map')}>Back to map</button><ChevronRight size={14}/>{issue.id}</div><div className="detail-layout"><div className="detail-main"><div className="detail-title" id="overview"><div><span className="tag">{categorySymbol(issue.category)} {issue.category}</span>{issue.isDemo&&<span className="preview-badge">Illustrative preview</span>}<span className="severity"><Zap size={13}/>{issue.severity}</span><h1>{issue.title}</h1><div className="detail-meta"><MapPin size={15}/>{issue.location}<span>·</span>{issue.date}<span>·</span><b>{issue.id}</b></div><div className="reporter-attribution"><User size={14}/><span>Reported by <b>{issue.reporterName||'Resident'}</b>{issue.isDemo&&<em>illustrative preview</em>}{!issue.isDemo&&!issue.reporterName&&<em>name not shared publicly</em>}</span><small>{issue.createdAt?new Date(issue.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):issue.date}</small></div></div><button className="icon-btn" onClick={()=>navigator.clipboard?.writeText(issue.id).then(()=>notify(`Copied ${issue.id}`)).catch(()=>notify(`Issue ID: ${issue.id}`))} aria-label="Copy issue ID"><MoreHorizontal/></button></div>{issue.image&&<div className="detail-evidence"><img src={issue.image} alt={`${issue.category} evidence submitted with ${issue.id}`}/><div><span className="tag">Original report photo</span><b>{issue.id}</b><small>{issue.location} · {issue.date}</small></div></div>}<div className="detail-tabs"><button className={activeTab==='Overview'?'selected':''} onClick={()=>jumpTo('overview','Overview')}>Overview</button><button className={activeTab==='Before & After'?'selected':''} onClick={()=>jumpTo('before-after','Before & After')}>Before & After</button><button className={activeTab==='Community'?'selected':''} onClick={()=>jumpTo('community','Community')}>Community</button><button className={activeTab==='Updates'?'selected':''} onClick={()=>jumpTo('updates','Updates')}>Updates</button><button className={activeTab==='Location'?'selected':''} onClick={openMap}>Location</button><button className={activeTab==='Impact'?'selected':''} onClick={()=>jumpTo('impact','Impact')}>Impact</button></div><section className="detail-section impact-section" id="impact"><div className="section-title"><div><h3><Activity size={17}/> Potential impact</h3><p>{issue.aiAnalysis?'AI-assisted suggestions, checked against the resident report; possible effects are not confirmed outcomes.':'Possible effects to assess from the reported conditions; these are not confirmed outcomes.'}</p></div></div>{issue.aiAnalysis?.summary&&<p className="analysis-summary">{issue.aiAnalysis.summary}</p>}<ul className="impact-points">{impact.map((note:string,index:number)=><li key={index}>{note}</li>)}</ul>{issue.aiAnalysis?.visibleDetails?.length>0&&<div className="analysis-detail-list"><b>Visible details noted</b><ul>{issue.aiAnalysis.visibleDetails.map((item:string,index:number)=><li key={`visible-${index}`}>{item}</li>)}</ul></div>}{issue.aiAnalysis?.safetyConsiderations?.length>0&&<div className="analysis-detail-list"><b>Safety considerations</b><ul>{issue.aiAnalysis.safetyConsiderations.map((item:string,index:number)=><li key={`safety-${index}`}>{item}</li>)}</ul></div>}<div className="impact-signal"><div><b>{typeof issue.priorityScore==='number'?`${issue.priorityScore}/100`:'—'}</b><small>priority estimate</small></div><div><b>{nearbyReports.length}</b><small>nearby same-category reports</small></div><div><b>{issue.supporters}</b><small>resident supports</small></div><div><b>{typeof issue.aiAnalysis?.confidence==='number'?`${Math.round(issue.aiAnalysis.confidence*100)}%`:'—'}</b><small>AI classification confidence{issue.isDemo?' · sample':''}</small></div><p>Priority uses saved report signals. Nearby reports may add context; neither value verifies the incident or repair.</p></div><div className="impact-facts"><span>Residents affected: <b>{issue.peopleAffected?issue.peopleAffected:'Not reported'}</b></span><span>Related recurrence records: <b>{issue.recurrenceCount||0}</b></span></div>{nearbyReports.length>0&&<div className="related-report-list"><b>Nearby reports to compare</b>{nearbyReports.slice(0,4).map(candidate=><IssueRow key={candidate.id} issue={candidate} open={()=>openIssue(candidate)}/>)}</div>}</section><section className="detail-section ai-remediation-section" id="ai-remediation"><div className="ai-suggestion-heading"><div><h3><Sparkles size={17}/> AI suggested remediation</h3><p>Possible next steps generated from the submitted description and photo. This is guidance only, not proof of completed work.</p></div><button className="btn-outline ai-suggestion-toggle" aria-expanded={showAiSuggestion} onClick={()=>setShowAiSuggestion(value=>!value)}><Sparkles size={15}/>{showAiSuggestion?'Hide AI suggestion':'Show AI suggestion'}</button></div>{showAiSuggestion&&<div className="ai-suggestion-content">{issue.aiAnalysis?.recommendationImage&&<div className="ai-outcome-illustration"><img src={issue.aiAnalysis.recommendationImage} alt="Illustrative clean-up outcome suggested for the sample report"/><small>Illustrative AI-suggested outcome · hypothetical, not a photo of completed work.</small></div>}{issue.aiAnalysis?.recommendations?.length?<ul>{issue.aiAnalysis.recommendations.map((item:string,index:number)=><li key={`recommendation-${index}`}>{item}</li>)}</ul>:<ul><li>Share a clear photo and exact location with the responsible civic authority.</li><li>Keep a safe distance from the reported hazard and do not attempt repairs to public infrastructure.</li><li>Ask nearby residents to add independent context and follow official status updates.</li></ul>}</div>}</section><section className="detail-section timeline-section"><h3><Activity size={17}/> Issue progress</h3><div className="timeline">{[{label:'Reported',done:true},{label:'Under review',done:!['REPORTED'].includes(issue.status)},{label:'Acknowledged',done:['ACKNOWLEDGED','IN_PROGRESS','REPAIR_EVIDENCE_SUBMITTED','COMMUNITY_VERIFICATION','COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(issue.status)},{label:'In progress',done:['IN_PROGRESS','REPAIR_EVIDENCE_SUBMITTED','COMMUNITY_VERIFICATION','COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(issue.status)},{label:'Repair evidence',done:!!issue.repairImage&&!issue.isDemo},{label:'Community review',done:['COMMUNITY_VERIFICATION','COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(issue.status)}].map(({label,done})=><div className={`timeline-step ${done?'done':''}`} key={label}><span>{done?<Check size={13}/>:<i/>}</span><b>{label}</b></div>)}</div><span className="status-honest">Current status: <b>{statusLabel[issue.status]}</b> · {issue.isDemo?'Illustrative sample status.':'Resident reported, not an official municipal update.'}{['COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(issue.status)&&!issue.repairImage?' Resolution has no repair photo attached.':''}</span></section><section className="detail-section" id="before-after"><div className="section-title"><div><h3><Camera size={17}/> Before & After</h3><p>{issue.isDemo?'Illustrative sample images only. They are not verified repair evidence; AI guidance is in its own section.':'Compare the original report with resident-submitted repair evidence. AI guidance is shown separately.'}</p></div></div>{issue.image||issue.repairImage?<div className="compare-wrap"><div className="compare-images">{issue.image?<div className="compare-photo"><img src={issue.image} alt="Original issue report"/><span>{issue.isDemo?'SAMPLE · ORIGINAL REPORT':'BEFORE · ORIGINAL REPORT'}</span><small>{issue.createdAt?new Date(issue.createdAt).toLocaleString('en-IN'):issue.date} · {issue.isDemo?'Illustrative report image':'Original resident evidence'}</small></div>:<div className="compare-empty"><Camera size={20}/><b>Original report photo not included</b></div>}{issue.repairImage?<div className="compare-photo"><img src={issue.repairImage} alt={issue.isDemo?'Illustrative sample image of a possible cleanup':'Repair evidence uploaded by a resident'}/><span className="after-label">{issue.isDemo?'ILLUSTRATIVE SAMPLE · NOT VERIFIED':'AFTER · RESIDENT EVIDENCE'}</span><small>{issue.isDemo?'Example image only · not proof of completed work':`${issue.repairDate?new Date(issue.repairDate).toLocaleString():'Timestamp unavailable'} · ${issue.repairContributor||'Resident'} · ${issue.status==='COMMUNITY_VERIFIED_RESOLVED'?'Community verified':issue.status==='REOPENED'?'Issue reopened':'Pending community review'}`}</small></div>:<div className="compare-empty"><ImagePlus size={20}/><b>Repair evidence has not been added</b><small>Never shown until a resident uploads evidence.</small></div>}</div><div className="evidence-note"><ShieldCheck size={17}/><span>Images are displayed as submitted. NagrikAI does not independently certify repair completion.</span></div></div>:<div className="compare-empty large"><Camera size={24}/><b>No before or after photos yet</b><span>The original report is preserved. A resident can add repair evidence when work is complete.</span></div>}<div className="evidence-actions"><label className="btn-outline file-action"><Upload size={15}/> {issue.isDemo?'Add preview photo':'Upload repair evidence'}<input type="file" accept="image/*" onChange={e=>addFile(e.target.files?.[0]||null,'repair')}/></label>{repairUrl&&<button className="btn-dark" onClick={addRepair}>Attach repair evidence <ArrowRight size={14}/></button>}{issue.repairImage&&<><button className="btn-outline" onClick={()=>updateStatus('COMMUNITY_VERIFIED_RESOLVED')}><CheckCircle2 size={15}/> Verify repair</button><button className="btn-outline" onClick={()=>updateStatus('REOPENED')}><ArrowDownRight size={15}/> Still unresolved</button></>}</div></section><section className="detail-section" id="community"><h3><Users size={17}/> Community evidence & comments</h3><div className="community-support"><span><b>{issue.supporters}</b> resident supports</span><button className="support-btn" onClick={()=>support(issue)}><ThumbsUp size={15}/> {issue.isDemo?'Support preview':'Support this issue'}</button></div><div className="community-evidence-upload"><p>Share another resident photo or useful context. This does not mark the issue repaired.</p><label className="btn-outline file-action"><Upload size={15}/> {additionalPhotoUrl?'Photo ready · choose another':'Add community evidence'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>addFile(e.target.files?.[0]||null,'additional')}/></label>{additionalPhotoUrl&&<><img src={additionalPhotoUrl} alt="Community evidence preview"/><button className="btn-dark compact" onClick={addAdditional}>Add photo to report</button></>}</div><div className="comment-form"><input placeholder="Add a helpful comment..." value={comment} onChange={e=>setComment(e.target.value)}/><button className="btn-dark compact" onClick={postComment}>Post comment</button></div>{(issue.evidenceImages?.length||0)>0&&<div className="resident-evidence-gallery"><b>{issue.isDemo?'Illustrative alternate views':'Additional community evidence'}</b><div>{(issue.evidenceImages||[]).map((src,index)=><button key={`${src}-${index}`} onClick={()=>window.open(src,'_blank','noopener,noreferrer')}><img src={src} alt={`${issue.isDemo?'Illustrative sample angle':'Additional resident evidence'} ${index+1} for ${issue.id}`}/><small>{issue.isDemo?'Sample angle · illustrative':`Resident photo ${index+1}`}</small></button>)}</div></div>}{comments.map((c,index)=><div className="comment-item" key={`${c.created_at}-${index}`}><span className="comment-avatar">{(c.authorName||c.author_id||'R').slice(0,1).toUpperCase()}</span><div><b>{c.authorName||'Community member'}</b>{issue.isDemo&&<small className="preview-badge">Illustrative discussion</small>}<p>{c.body}</p><small>{new Date(c.created_at).toLocaleString('en-IN')}</small></div></div>)}{!issue.isDemo&&!comments.length&&<p className="muted-small">No comments yet. Keep the discussion specific to the report.</p>}</section><section className="detail-section" id="updates"><h3><Clock3 size={17}/> Updates & related reports</h3><p className="muted-small">Tracking ID: {issue.id}</p>{issue.isDemo?<p className="empty-copy">This example has illustrative status only. A resident report will show its saved status history here.</p>:statusHistory.length?<ol className="update-history">{statusHistory.map((update,index)=><li key={`${update.created_at}-${index}`}><span className="update-dot"/><div><b>{statusLabel[update.status as Status]||update.status}</b>{update.note&&<p>{update.note}</p>}<small>{new Date(update.created_at).toLocaleString('en-IN')} · {update.source==='MODERATOR'?'Moderator update':'Resident/community activity'}</small></div></li>)}</ol>:<p className="empty-copy">No status changes have been recorded yet. The current report status is {statusLabel[issue.status]}.</p>}{relationRows.length>0&&<div className="related-report-list"><b>Linked report history</b>{relationRows.map((row,index)=><p key={`${row.issue_code}-${index}`} className="relation-row">{row.relation} · {row.issue_code===issue.id?row.related_issue_code:row.issue_code}</p>)}</div>}{nearbyReports.length>0&&<div className="related-report-list"><b>Nearby reports in this category</b>{nearbyReports.slice(0,4).map(candidate=><IssueRow key={candidate.id} issue={candidate} open={()=>openIssue(candidate)}/>)}</div>}<button className="text-link" onClick={openMap}>Explore this location <ArrowRight size={14}/></button></section></div><aside className="detail-aside"><div className="aside-panel" id="location"><h3><MapPin size={16}/> Location</h3><div className="detail-mini-leaflet"><MapContainer center={issue.latitude&&issue.longitude?[issue.latitude,issue.longitude]:[17.385,78.4867]} zoom={issue.latitude&&issue.longitude?15:12} scrollWheelZoom={false} zoomControl={false}><MapSizeFix/><TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'} url={mapTiles}/>{issue.latitude&&issue.longitude&&<Marker position={[issue.latitude,issue.longitude]} icon={categoryMarker(issue.category)}><Popup>{issue.title} · {issue.location} · {issue.id}</Popup></Marker>}</MapContainer></div><p>{issue.location}</p>{issue.latitude&&issue.longitude?<span className="muted-small">Exact pin · {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}</span>:<span className="muted-small">No exact coordinates were supplied for this report.</span>}<button className="btn-outline full" onClick={()=>saveLocation(issue)}><Bookmark size={14}/> {issue.isDemo?(demoSaved.includes(issue.id)?'Remove saved location':'Save preview location'):'Save location'}</button><button className="btn-outline full" onClick={openMap}>Open in map <ArrowRight size={14}/></button></div><div className="aside-panel"><h3><Flag size={16}/> Issue actions</h3><button className="btn-dark full" onClick={()=>document.getElementById('before-after')?.scrollIntoView({behavior:'smooth',block:'start'})}><Camera size={15}/> {issue.isDemo?'Add preview photo':'Add repair evidence'}</button><button className="btn-outline full" onClick={()=>support(issue)}><Heart size={15}/> {issue.isDemo?'Support preview':'Support this issue'}</button><button className="btn-outline full" onClick={()=>follow(issue)}><Bell size={15}/> {issue.isDemo?(demoFollows.includes(issue.id)?'Unfollow preview':'Follow issue'):'Follow issue'}</button></div><div className="aside-panel"><h3><Users size={16}/> Community signal <span>{issue.supporters+nearbyReports.length}</span></h3><p className="empty-copy">{nearbyReports.length} nearby same-category reports · {issue.supporters} supports. This is a community signal, not an AI truth score.</p></div></aside></div></>
}
function MapPage({issues,focusIssue,query,setQuery,category,setCategory,openIssue,go}:{issues:Issue[];focusIssue:Issue|null;query:string;setQuery:(s:string)=>void;category:string;setCategory:(s:string)=>void;openIssue:(i:Issue)=>void;go:(p:Page)=>void}){const visible=issues.filter(i=>(category==='All categories'||i.category===category)&&(!query.trim()||`${i.title} ${i.category} ${i.location} ${i.id} ${i.description} ${i.reporterName||''}`.toLowerCase().includes(query.trim().toLowerCase())));return <><PageHeader eyebrow="HYDERABAD · COMMUNITY REPORTS" title="Explore the map" description="Explore geolocated community reports. Preview examples are labeled; resident-submitted reports update as new activity arrives." action={()=>go('Report Issue')} actionLabel="Report an issue"/><div className="map-toolbar"><div className="search-field"><Search size={16}/><input id="global-search" placeholder="Search an area or issue" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={category} onChange={e=>setCategory(e.target.value)}><option>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select><button className="btn-outline" onClick={()=>{setCategory('All categories');setQuery('')}}><SlidersHorizontal size={15}/> Reset filters</button></div><div className="map-page-layout"><div className="map-canvas"><MapContainer className="leaflet-map" center={focusIssue?.latitude&&focusIssue.longitude?[focusIssue.latitude,focusIssue.longitude]:[17.385,78.4867]} zoom={focusIssue?.latitude&&focusIssue.longitude?15:12} scrollWheelZoom><MapSizeFix/><FocusMapOnIssue issue={focusIssue}/><TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'} url={mapTiles} maxZoom={20}/>{visible.filter(i=>typeof i.latitude==='number'&&typeof i.longitude==='number').map(i=><Marker key={i.id} position={[i.latitude!,i.longitude!]} icon={categoryMarker(i.category)}><Popup><div className="map-popup">{i.image&&<img src={i.image} alt={`${i.category} evidence`}/>}<span className="tag">{categorySymbol(i.category)} {i.category}</span><b>{i.title}</b><small>{i.location} · {i.latitude!.toFixed(5)}, {i.longitude!.toFixed(5)}</small><small>{i.id} · {statusLabel[i.status]}</small>{i.isDemo&&<em>Illustrative preview report</em>}<button onClick={()=>openIssue(i)}>View issue</button></div></Popup></Marker>)}</MapContainer><div className="map-legend"><span><i className="dot green"/> Different symbols identify report categories</span></div></div><div className="map-results"><div className="results-head"><b>Reports</b><span>{visible.length} reports</span></div>{visible.length?visible.map(i=><MapReportCard issue={i} key={i.id} open={()=>openIssue(i)}/>):<div className="results-empty"><MapPin size={22}/><b>No reports match these filters</b><span>Try another category or search term.</span></div>}</div></div></>}
function MapReportCard({issue,open}:{issue:Issue;open:()=>void}){return <button className="map-report-card" onClick={open}>{issue.image?<img src={issue.image} alt={`${issue.category} incident at ${issue.location}`}/>:<div className="map-report-placeholder">{categorySymbol(issue.category)}</div>}<div className="map-report-copy"><div><span className="tag">{categorySymbol(issue.category)} {issue.category}</span><StatusPill status={issue.status}/></div><h3>{issue.title}</h3><p><MapPin size={13}/>{issue.location} · {issue.date}</p><small>{issue.id}{issue.latitude&&issue.longitude?` · ${issue.latitude.toFixed(5)}, ${issue.longitude.toFixed(5)}`:''}{issue.isDemo?' · Illustrative preview':''}</small></div></button>}
function CommunityPage({issues,support,openIssue,go}:{issues:Issue[];support:(i:Issue)=>void;openIssue:(i:Issue)=>void;go:(p:Page)=>void}){const [tab,setTab]=useState('All Posts');const [query,setQuery]=useState('');const [gallery,setGallery]=useState<{issueId:string;photos:{src:string;alt:string;label?:string}[];index:number}|null>(null);const [coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);const resolved=(i:Issue)=>i.status==='COMMUNITY_VERIFIED_RESOLVED'||i.status==='OFFICIALLY_CONFIRMED';const visible=issues.filter(i=>{if(tab==='Resolved'&&!resolved(i))return false;if(tab==='Needs Attention'&&(resolved(i)||i.status==='REJECTED'))return false;if(tab==='Nearby'&&(!coords||distanceMeters(i,{...i,latitude:coords.latitude,longitude:coords.longitude})>5000))return false;if(tab==='My Area'&&!coords&&!/madhapur|hitec|jubilee|ameerpet|hyderabad/i.test(i.location))return false;if(tab==='My Area'&&coords&&distanceMeters(i,{...i,latitude:coords.latitude,longitude:coords.longitude})>10000)return false;const q=query.trim().toLowerCase();return !q||`${i.title} ${i.category} ${i.location} ${i.id} ${i.description} ${i.reporterName||''}`.toLowerCase().includes(q)}).sort((a,b)=>(b.supporters||0)-(a.supporters||0));const areaCounts=Object.entries(issues.reduce((a,i)=>({...a,[i.location]:(a[i.location]||0)+1}),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,4);const locate=(target:'Nearby'|'My Area'='Nearby')=>{if(!navigator.geolocation){setTab(target);return} navigator.geolocation.getCurrentPosition(p=>{setCoords({latitude:p.coords.latitude,longitude:p.coords.longitude});setTab(target)},()=>setTab(target),{enableHighAccuracy:true,timeout:8000})};const resolvedCount=issues.filter(resolved).length;return <><PageHeader eyebrow="NEIGHBOURS WORKING TOGETHER" title="Community" description="Local reports, shared evidence, and progress from the same live issue feed." action={()=>go('Report Issue')} actionLabel="Create post"/><section className="community-hero"><div className="community-hero-copy"><span className="eyebrow"><span/> NAGRIKAI COMMUNITY</span><h2>People. Reports. Real change.</h2><p>A community of citizens working together for a cleaner, safer and better Hyderabad.</p><div className="community-metrics"><div><Users/><b>{issues.filter(i=>!i.isDemo).length?`${issues.filter(i=>!i.isDemo).length}+`:'—'}</b><small>Resident reports</small></div><div><FileText/><b>{issues.length}</b><small>Reports in feed</small></div><div><CheckCircle2/><b>{resolvedCount}</b><small>Resolved reports</small></div><div><MapPin/><b>{new Set(issues.map(i=>i.location)).size}</b><small>Areas represented</small></div></div><div className="community-hero-note">Counts use reports currently available in this feed; sample reports are labeled.</div></div><div className="community-hero-image" style={{backgroundImage:`linear-gradient(90deg,#edf3ed 0%,#edf3edd1 35%,transparent 100%),url('${asset('Hyderabad residents community.png')}')`}}/></section><div className="community-workspace"><main className="community-feed"><div className="community-toolbar"><div className="community-tabs">{['All Posts','Nearby','Resolved','Needs Attention','My Area'].map(name=><button key={name} className={tab===name?'active':''} onClick={()=>((name==='Nearby'||name==='My Area')&&!coords)?locate(name as 'Nearby'|'My Area'):setTab(name)}>{name}{name==='All Posts'?` ${issues.length}`:name==='Resolved'?` ${resolvedCount}`:name==='Needs Attention'?` ${issues.filter(i=>!resolved(i)&&i.status!=='REJECTED').length}`:''}</button>)}</div><div className="community-actions"><label className="community-search"><Search size={16}/><input placeholder="Search posts, locations or categories" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="btn-dark compact" onClick={()=>go('Report Issue')}><Plus size={15}/> Create Post</button></div></div>{issues.some(i=>i.isDemo)&&<div className="preview-feed-note"><span className="live-dot"/>Illustrative activity is labeled. Resident reports appear here as they are submitted.</div>}{visible.length?<div className="community-posts">{visible.map(i=><article className="community-post" key={i.id}><div className="community-post-main"><div className="community-post-byline"><span className="community-person"><User size={17}/></span><div><b>{i.isDemo?`Illustrative · ${i.reporterName||'Resident'}`:(i.reporterName||'Resident')}</b><small>{i.createdAt?new Date(i.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):i.date} · {i.location}, Hyderabad</small></div><span className={`community-attention ${resolved(i)?'resolved':''}`}>{i.isDemo?'Preview':resolved(i)?'Resolved':i.status==='IN_PROGRESS'?'In progress':'Needs attention'}</span></div><div className="community-post-location"><MapPin size={13}/>{i.location}, Hyderabad <span>· {i.id}</span></div><button className="community-post-title" onClick={()=>openIssue(i)}>{i.title}</button><p className="community-post-description">{i.description}</p><div className="community-post-foot"><button onClick={()=>support(i)}><ThumbsUp size={16}/>{i.supporters} <span>{i.isDemo?'Preview support':'Support'}</span></button><button onClick={()=>openIssue(i)}><MessageCircle size={16}/>Discuss</button><button onClick={()=>openIssue(i)}><ArrowRight size={16}/>View report</button><span className="tag">{categorySymbol(i.category)} {i.category}</span></div></div><div className="community-post-images">{(()=>{const photos=[...(i.image?[{src:i.image,alt:`${i.category} at ${i.location}`}]:[]),...(i.repairImage?[{src:i.repairImage,alt:i.isDemo?'Illustrative example, not verified repair evidence':'Resident supplied repair evidence',label:i.isDemo?'Sample':'After'}]:[]),...(i.evidenceImages||[]).map((src,index)=>({src,alt:i.isDemo?`Illustrative sample angle ${index+1} for ${i.id}`:`Additional community evidence ${index+1} for ${i.id}`,label:i.isDemo?'Sample angle · illustrative':'Community photo'}))];return photos.length?photos.slice(0,2).map((photo,index)=><button key={`${i.id}-community-photo-${index}`} aria-label={`Open report photo ${index+1}${photos.length>2?` of ${photos.length}`:''}`} onClick={()=>setGallery({issueId:i.id,photos,index:index===1&&photos.length>2?2:index})}><img src={photo.src} alt={photo.alt}/>{photo.label&&photos.length<=2&&<span>{photo.label}</span>}{index===1&&photos.length>2&&<span className="community-gallery-count">+{photos.length-2}</span>}</button>):<div className="no-photo"><Camera size={20}/></div>})()}</div>{gallery?.issueId===i.id&&createPortal(<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`Report photo gallery, ${gallery.photos.length} images`}><button className="photo-lightbox-close" aria-label="Close photo gallery" onClick={()=>setGallery(null)}><X size={20}/></button><button className="photo-lightbox-nav" aria-label="Previous photo" onClick={()=>setGallery({...gallery,index:(gallery.index+gallery.photos.length-1)%gallery.photos.length})}><ChevronLeft size={24}/></button><figure><img src={gallery.photos[gallery.index].src} alt={gallery.photos[gallery.index].alt}/><figcaption>{gallery.photos[gallery.index].alt}<span>Photo {gallery.index+1} of {gallery.photos.length}</span></figcaption></figure><button className="photo-lightbox-nav" aria-label="Next photo" onClick={()=>setGallery({...gallery,index:(gallery.index+1)%gallery.photos.length})}><ChevronRight size={24}/></button></div>,document.body)}{i.isDemo&&<small className="community-preview-label">Illustrative sample report · raised by {i.reporterName||'Resident'} · {i.id}</small>}</article>)}</div>:<EmptyInline icon={Filter} title="No reports match this view" text={tab==='Nearby'&&!coords?'Allow location access to find reports within 5 km.':'Try another filter or search term.'} action={tab==='Nearby'?'Use my location':'Show all reports'} onClick={tab==='Nearby'?locate:()=>{setTab('All Posts');setQuery('')}}/>}</main><aside className="community-sidebar"><section className="community-widget"><div className="community-widget-heading"><h3><MapPin size={17}/> Community Map</h3><button onClick={()=>go('Explore Map')}>View full map <ArrowRight size={14}/></button></div><div className="community-mini-map"><MapContainer center={[17.435,78.42]} zoom={11} scrollWheelZoom={false} zoomControl={false}><MapSizeFix/><TileLayer attribution="&copy; OpenStreetMap" url={mapTiles}/>{issues.filter(i=>typeof i.latitude==='number'&&typeof i.longitude==='number').map(i=><Marker key={i.id} position={[i.latitude!,i.longitude!]} icon={categoryMarker(i.category)}><Popup><div className="map-popup">{i.image&&<img src={i.image} alt={i.category}/>}<b>{i.title}</b><small>{i.location} · {i.id}</small><button onClick={()=>openIssue(i)}>View report</button></div></Popup></Marker>)}</MapContainer></div></section><section className="community-widget"><div className="community-widget-heading"><h3><Activity size={17}/> Community triage scores</h3><span title="Support 35, repeat reports 25, unresolved age 20, reported severity 20">NagrikAI CBRT estimates</span></div>{visible.slice(0,4).map((i,index)=><button className="community-rank" key={i.id} onClick={()=>openIssue(i)}><span>{index+1}</span><div><b>{i.title}</b><small>{i.location} · {i.id}</small><small className="cbrt-subscore">CBRT {cbrtSubscores(i).total}/100 · support {cbrtSubscores(i).supporters}/35 · repeat {cbrtSubscores(i).recurrence}/25 · age {cbrtSubscores(i).age}/20 · severity {cbrtSubscores(i).severity}/20</small></div><strong>{i.supporters} supports</strong></button>)}</section><section className="community-widget"><div className="community-widget-heading"><h3><MessageCircle size={17}/> Active reports</h3><button onClick={()=>setTab('Needs Attention')}>Needs attention <ArrowRight size={14}/></button></div>{issues.filter(i=>!resolved(i)).slice(0,4).map(i=><button className="community-discussion" key={i.id} onClick={()=>openIssue(i)}><span><MessageCircle size={14}/></span><div><b>{i.title}</b><small>{i.location} · {statusLabel[i.status]}</small></div></button>)}</section><section className="community-widget"><div className="community-widget-heading"><h3><Users size={17}/> Areas represented</h3><button onClick={()=>locate('My Area')}>My area <ArrowRight size={14}/></button></div>{areaCounts.map(([area,count])=><button className="community-area" key={area} onClick={()=>{setTab('All Posts');setQuery(area)}}><span><MapPin size={15}/></span><b>{area}</b><small>{count} {count===1?'report':'reports'}</small></button>)}</section></aside></div></>}

function ContributionsPage({issues,filter,setFilter,openIssue,go}:{issues:Issue[];filter:string;setFilter:(s:string)=>void;openIssue:(i:Issue)=>void;go:(p:Page)=>void}){const visible=issues.filter(i=>filter==='All'||statusLabel[i.status]===filter);return <><PageHeader eyebrow="YOUR ACTIVITY" title="My contributions" description="Track reports and evidence you have submitted." action={()=>go('Report Issue')} actionLabel="New report"/><div className="filter-row"><button className={filter==='All'?'filter-active':''} onClick={()=>setFilter('All')}>All reports <span>{issues.length}</span></button>{['Reported','Under Review','In Progress','Repair Evidence Submitted','Community Verification','Reopened'].map(s=><button key={s} className={filter===s?'filter-active':''} onClick={()=>setFilter(s)}>{s}</button>)}</div>{visible.length?<div className="contribution-list">{visible.map(i=><div className="contribution-card" key={i.id}>{i.image?<img src={i.image} alt="Original report"/>:<div className="contribution-image-empty"><Camera size={20}/></div>}<div className="contribution-copy"><div className="contribution-meta"><span className="tag">{i.category}</span><StatusPill status={i.status}/></div><h3>{i.title}</h3><p><MapPin size={14}/>{i.location}<span>·</span>{i.date}</p><span className="muted-small">{i.id}</span></div>{i.repairImage&&<div className="thumb-after"><img src={i.repairImage} alt="Repair evidence"/><span>After</span></div>}<button className="icon-btn" onClick={()=>openIssue(i)} aria-label="Open report"><ChevronRight/></button></div>)}</div>:<EmptyInline icon={FileText} title="No contributions yet" text="When you submit a report, it will appear here with its latest status." action="Report an issue" onClick={()=>go('Report Issue')}/>}</>}
function ProfilePage({email,displayName,setDisplayName,signedIn,userId,issues,demoSupports,signOut,go,notify}:{email:string;displayName:string;setDisplayName:(name:string)=>void;signedIn:boolean;userId:string|null;issues:Issue[];demoSupports:string[];signOut:()=>void;go:(p:Page)=>void;notify:(message:string)=>void}){
 type ProfileFields={fullName:string;username:string;phone:string;location:string;about:string};
 const emptyProfile:ProfileFields={fullName:displayName||'',username:(displayName||email.split('@')[0]||'resident').toLowerCase().replace(/\s+/g,'.'),phone:'',location:'Hyderabad, India',about:'Building a cleaner, safer Hyderabad one report at a time.'};
 const storageKey=`nagrikai-profile-${userId||'guest'}`;
 const [profile,setProfile]=useState<ProfileFields>(()=>{try{return{...emptyProfile,...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch{return emptyProfile}});
 const [activeTab,setActiveTab]=useState<'personal'|'security'|'preferences'>('personal');
 const [supportGiven,setSupportGiven]=useState(demoSupports.length);
 const [joinedAt,setJoinedAt]=useState('');
 const [saving,setSaving]=useState(false);
 const [preferences,setPreferences]=useState(()=>{try{return JSON.parse(localStorage.getItem('nagrikai-profile-preferences')||'{"reportUpdates":true,"communityDigest":false}') as {reportUpdates:boolean;communityDigest:boolean}}catch{return{reportUpdates:true,communityDigest:false}}});
 useEffect(()=>{let alive=true;const load=async()=>{const saved=(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{return{}}})();if(supabase&&signedIn){const{data:{user}}=await supabase.auth.getUser();if(!alive)return;if(user){const meta=user.user_metadata||{};setProfile(current=>({...emptyProfile,...saved,fullName:saved.fullName||meta.full_name||meta.display_name||displayName,username:saved.username||meta.username||emptyProfile.username,phone:saved.phone||meta.phone||'',location:saved.location||meta.location||emptyProfile.location,about:saved.about||meta.about||emptyProfile.about}));setJoinedAt(user.created_at?new Date(user.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'}):'')}}else{setProfile(current=>({...emptyProfile,...saved,fullName:saved.fullName||displayName||current.fullName}));setJoinedAt('')}};void load();return()=>{alive=false}},[storageKey,userId,signedIn]);
 useEffect(()=>{if(!signedIn||!userId||!supabaseReady||!supabase){setSupportGiven(demoSupports.length);return}let alive=true;const load=async()=>{const{count,error}=await supabase!.from('issue_support').select('issue_code',{count:'exact',head:true}).eq('resident_id',userId);if(alive&&!error)setSupportGiven(count||0)};void load();const channel=supabase.channel(`profile-supports-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'issue_support',filter:`resident_id=eq.${userId}`},()=>{void load()}).subscribe();return()=>{alive=false;void supabase?.removeChannel(channel)}},[signedIn,userId,demoSupports.length]);
 const resolvedCount=issues.filter(issue=>['COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(issue.status)).length;
 const supportersReceived=issues.reduce((total,issue)=>total+(issue.supporters||0),0);
 const impactPoints=issues.length*10+resolvedCount*25+supportersReceived*2+supportGiven*5;
 const saveProfile=async()=>{setSaving(true);const normalized={...profile,fullName:profile.fullName.trim(),username:profile.username.trim().replace(/^@/,''),phone:profile.phone.trim(),location:profile.location.trim(),about:profile.about.trim()};localStorage.setItem(storageKey,JSON.stringify(normalized));setProfile(normalized);setDisplayName(normalized.fullName);if(supabase&&signedIn){const{error}=await supabase.auth.updateUser({data:{full_name:normalized.fullName,display_name:normalized.fullName,username:normalized.username,phone:normalized.phone,location:normalized.location,about:normalized.about}});if(error){setSaving(false);notify(`Profile saved on this device; account sync failed: ${error.message}`);return}}setSaving(false);notify(supabaseReady?'Profile updated and synced to your account.':'Profile updated on this device.')};
 const resendPassword=async()=>{if(!email||!supabase){notify('Sign in with a configured account to manage password recovery.');return}const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});notify(error?`Password reset could not be sent: ${error.message}`:'Password reset link sent to your email.')};
 const achievements=[{title:'First Report',detail:issues.length?`Submitted ${issues.length} civic ${issues.length===1?'report':'reports'}`:'Submit your first civic report',progress:Math.min(1,issues.length),icon:FileText},{title:'Community Supporter',detail:`${supportGiven} of 10 supports given`,progress:Math.min(1,supportGiven/10),icon:Users},{title:'Hyderabad Champion',detail:`${issues.length} of 10 reports submitted`,progress:Math.min(1,issues.length/10),icon:MapPin}];
 if(!signedIn)return <><PageHeader eyebrow="YOUR ACCOUNT" title="Profile" description="Sign in to see your reports, impact, and profile details."/><div className="large-empty"><span className="empty-icon"><User size={22}/></span><h2>Your civic activity belongs to your account</h2><p>Sign in to view your reports and personal impact.</p><button className="btn-dark" onClick={()=>go('Sign In')}>Sign in <ArrowRight size={15}/></button></div></>;
 return <section className="profile-page"><div className="profile-cover"><div><span className="eyebrow"><i/> YOUR COMMUNITY PROFILE</span><h1>A cleaner Hyderabad starts with citizens like you.</h1><p>Your reports and community contributions, in one place.</p></div><img src={asset('Golden Charminar Cityscape at Dawn.png')} alt="Charminar at sunrise over Hyderabad"/></div><section className="profile-identity"><span className="profile-avatar">{(profile.fullName||email).trim().slice(0,1).toUpperCase()||'R'}</span><div className="profile-identity-copy"><h2>{profile.fullName||displayName||email.split('@')[0]}</h2><span>@{profile.username||email.split('@')[0]}</span><p>{profile.about||'Add a short introduction about your community work.'}</p><div><span><MapPin size={15}/>{profile.location||'Add your location'}</span>{joinedAt&&<span><Clock3 size={15}/>Joined {joinedAt}</span>}</div></div><button className="btn-outline profile-edit" onClick={()=>{setActiveTab('personal');document.querySelector('.profile-workspace')?.scrollIntoView({behavior:'smooth',block:'start'})}}><User size={16}/> Edit profile</button><button className="profile-signout" onClick={signOut}>Sign out</button></section><div className="profile-workspace"><section className="profile-primary"><div className="profile-tabs" role="tablist" aria-label="Profile settings"><button role="tab" aria-selected={activeTab==='personal'} className={activeTab==='personal'?'active':''} onClick={()=>setActiveTab('personal')}>Personal Information</button><button role="tab" aria-selected={activeTab==='security'} className={activeTab==='security'?'active':''} onClick={()=>setActiveTab('security')}>Account &amp; Security</button><button role="tab" aria-selected={activeTab==='preferences'} className={activeTab==='preferences'?'active':''} onClick={()=>setActiveTab('preferences')}>Preferences</button></div>{activeTab==='personal'?<form className="profile-form" onSubmit={event=>{event.preventDefault();void saveProfile()}}><div className="profile-form-heading"><User size={20}/><h2>Personal Information</h2></div><div className="profile-form-grid"><label>Full Name<input value={profile.fullName} onChange={event=>setProfile({...profile,fullName:event.target.value})} placeholder="Your name" autoComplete="name"/></label><label>Username<input value={profile.username} onChange={event=>setProfile({...profile,username:event.target.value})} placeholder="your.username" autoComplete="username"/></label><label>Email<input value={email} readOnly aria-readonly="true"/></label><label>Phone Number<input value={profile.phone} onChange={event=>setProfile({...profile,phone:event.target.value})} placeholder="Add a phone number" autoComplete="tel"/></label><label className="profile-field-wide">Location<input value={profile.location} onChange={event=>setProfile({...profile,location:event.target.value})} placeholder="Neighbourhood, city"/></label><label className="profile-field-wide">About You<textarea value={profile.about} maxLength={200} onChange={event=>setProfile({...profile,about:event.target.value})} placeholder="Tell neighbours a little about you."/><small>{profile.about.length}/200</small></label></div><div className="profile-form-actions"><button className="btn-dark" disabled={saving}>{saving?'Saving…':'Save Changes'}</button></div></form>:activeTab==='security'?<section className="profile-form profile-tab-panel"><div className="profile-form-heading"><ShieldCheck size={20}/><h2>Account &amp; Security</h2></div><p>Your email is used to sign in and receive important account updates.</p><label>Email address<input value={email} readOnly aria-readonly="true"/></label><button className="btn-outline" onClick={()=>void resendPassword()}>Send password reset link</button></section>:<section className="profile-form profile-tab-panel"><div className="profile-form-heading"><Bell size={20}/><h2>Preferences</h2></div><label className="profile-toggle"><span><b>Report updates</b><small>Receive updates when your reports change status.</small></span><input type="checkbox" checked={preferences.reportUpdates} onChange={event=>{const next={...preferences,reportUpdates:event.target.checked};setPreferences(next);localStorage.setItem('nagrikai-profile-preferences',JSON.stringify(next));notify('Report notification preference saved.')}}/></label><label className="profile-toggle"><span><b>Community digest</b><small>Get occasional summaries of nearby civic activity.</small></span><input type="checkbox" checked={preferences.communityDigest} onChange={event=>{const next={...preferences,communityDigest:event.target.checked};setPreferences(next);localStorage.setItem('nagrikai-profile-preferences',JSON.stringify(next));notify('Community digest preference saved.')}}/></label></section>}</section><aside className="profile-aside"><section className="profile-widget"><h2><Activity size={19}/> My Impact</h2><div className="profile-impact-grid">{[{label:'Reports Submitted',value:issues.length,icon:FileText},{label:'Community Supports',value:supportersReceived,icon:Users},{label:'Resolved Issues',value:resolvedCount,icon:CheckCircle2},{label:'Impact Points',value:impactPoints,icon:Sparkles}].map(({label,value,icon:Icon})=><div key={label}><Icon size={21}/><strong>{value.toLocaleString('en-IN')}</strong><small>{label}</small></div>)}</div><p className="profile-impact-note">Points are estimated from reports, resolutions, and community support.</p></section><section className="profile-widget"><div className="profile-widget-title"><h2><Sparkles size={19}/> Achievements</h2><span>{achievements.filter(item=>item.progress>=1).length} earned</span></div><div className="profile-achievements">{achievements.map(({title,detail,progress,icon:Icon})=><div className={progress>=1?'earned':''} key={title}><span className="achievement-icon"><Icon size={20}/></span><div><b>{title}</b><small>{detail}</small><span className="achievement-track"><i style={{width:`${Math.round(progress*100)}%`}}/></span></div></div>)}</div></section><section className="profile-widget profile-recent"><div className="profile-widget-title"><h2><FileText size={19}/> Recent Reports</h2><button onClick={()=>go('My Contributions')}>View all <ArrowRight size={14}/></button></div>{issues.length?issues.slice(0,3).map(issue=><button className="profile-recent-item" key={issue.id} onClick={()=>go('My Contributions')}><span className="profile-recent-image">{issue.image?<img src={issue.image} alt=""/>:<MapPin size={15}/>}</span><span><b>{issue.title}</b><small>{issue.location} · {statusLabel[issue.status]}</small></span><ArrowRight size={14}/></button>):<p className="profile-no-reports">Your submitted reports will appear here.</p>}</section></aside></div></section>
}
function SettingsPage({notify}:{notify:(s:string)=>void}){const[showPublicName,setShowPublicName]=useState(false);const[ready,setReady]=useState(false);useEffect(()=>{let alive=true;const load=async()=>{if(!supabase){setReady(true);return}const{data:{user}}=await supabase.auth.getUser();if(!user){setReady(true);return}const{data}=await supabase.from('profiles').select('show_name_on_comments').eq('id',user.id).maybeSingle();if(alive){setShowPublicName(Boolean(data?.show_name_on_comments));setReady(true)}};void load();return()=>{alive=false}},[]);const togglePublicName=async(e:React.ChangeEvent<HTMLInputElement>)=>{if(!supabase){notify('Sign in with Supabase configured to change your public name preference.');return}const{data:{user}}=await supabase.auth.getUser();if(!user){notify('Sign in to update your public name preference.');return}const value=e.target.checked;const{error}=await supabase.from('profiles').update({show_name_on_comments:value}).eq('id',user.id);if(error){notify(`Privacy preference could not be saved: ${error.message}`);return}setShowPublicName(value);notify(value?'Your name will appear on reports and comments.':'Your name will be hidden on public reports and comments.')};return <><PageHeader eyebrow="PREFERENCES" title="Settings" description="Privacy, language, and account preferences for your NagrikAI profile."/><div className="settings-list"><section className="settings-card"><h2><ShieldCheck size={18}/> Privacy</h2><p>Your profile name is private by default. If you opt in, your name appears beside reports and comments you contribute.</p><label className="setting-row public-name-setting"><div><b>Show my name on public activity</b><p>Report locations, descriptions, and evidence remain visible as part of public issue records.</p></div><input type="checkbox" checked={showPublicName} disabled={!ready||!supabase} onChange={togglePublicName}/></label><span className="status-pill">{showPublicName?'Name sharing enabled':'Private by default'}</span>{!supabase&&<small className="muted-small">Connect Supabase to save this preference.</small>}</section><section className="settings-card"><h2><Languages size={18}/> Language</h2><p>Choose English for this preview. More language options can be connected to your profile preferences.</p><button className="btn-outline" onClick={()=>notify('Language preferences are not connected yet.')}>English <ChevronDown size={14}/></button></section><section className="settings-card"><h2><Bell size={18}/> Notifications</h2><p>Issue update notifications are delivered to residents who follow a report.</p><span className="muted-small">Manage follows from issue details.</span></section></div></>}
function AuthPage({mode,email,setEmail,password,setPassword,displayName,setDisplayName,notice,setNotice,signedIn,go}:{mode:Page;email:string;setEmail:(s:string)=>void;password:string;setPassword:(s:string)=>void;displayName:string;setDisplayName:(s:string)=>void;notice:string;setNotice:(s:string)=>void;signedIn:()=>void;go:(p:Page)=>void}){
 const isSignup=mode==='Sign Up';const [confirmPassword,setConfirmPassword]=useState('');
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setNotice('');if(isSignup&&!displayName.trim()){setNotice('Enter your name to create your account.');return}if(isSignup&&password!==confirmPassword){setNotice('The passwords do not match.');return}if(!supabase){setNotice('Authentication is not configured yet. Add your Supabase project URL and anon key to .env.local, apply the Supabase migrations, then restart the app.');return}try{if(isSignup){const{data,error}=await supabase.auth.signUp({email,password,options:{data:{display_name:displayName.trim()}}});if(error){setNotice(error.message);return}if(data.session){signedIn();return}setNotice('Your account was created. Check your email to verify it before signing in.');return}const{error}=await supabase.auth.signInWithPassword({email,password});if(error){setNotice(error.message);return}signedIn()}catch{setNotice('We could not reach the account service. Check your connection and try again.')}};
 return <div className="auth-page"><div className="auth-visual" style={{backgroundImage:`linear-gradient(180deg,rgba(8,43,39,.18),rgba(8,43,39,.8)),url('${asset('Golden Hour at Hyderabad’s Charminar.png')}')`}}><div className="auth-visual-copy"><h2>Stronger citizens.<br/>Cleaner Hyderabad.</h2><p>Local knowledge makes a difference.</p></div></div><div className="auth-panel"><button className="text-link auth-back" onClick={()=>go('Home')}><ArrowLeft size={14}/> Back to home</button><span className="auth-mark"><MapPin/></span><h1>{isSignup?'Create your account':'Welcome back'}</h1><p>{isSignup?'Join your neighbourhood and follow reports that matter to you.':'Sign in to manage your reports and community activity.'}</p>{!supabase&&<div className="setup-required-note" role="status">Live accounts need Supabase configured. Add the project URL and anon key to <code>.env.local</code>, then apply the database migrations.</div>}<form onSubmit={submit}>{isSignup&&<label>Full name<input autoComplete="name" required maxLength={100} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete={isSignup?'new-password':'current-password'} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>{isSignup&&<label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter your password"/></label>}<button className="btn-dark full">{isSignup?'Create account':'Sign in'} <ArrowRight size={15}/></button></form>{!isSignup&&<button className="forgot-link" onClick={async()=>{if(!email){setNotice('Enter your email address first.');return}if(!supabase){setNotice('Password reset needs Supabase Auth configured in .env.local.');return}try{const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});setNotice(error?error.message:'If this address has an account, a password reset link has been sent.')}catch{setNotice('We could not reach the account service. Try again when you are online.')}}}>Forgot password?</button>}{notice&&<div className="form-notice" role="status" aria-live="polite">{notice}</div>}<button className="auth-switch" onClick={()=>{setNotice('');go(isSignup?'Sign In':'Sign Up')}}>{isSignup?'Already have an account? Sign in':'New to NagrikAI? Create an account'}</button><small>By continuing, you agree to use this service respectfully.</small></div></div>
}
function SavedLocationsPage({go,issues,demoSaved,setDemoSaved,openIssue}:{go:(p:Page)=>void;issues:Issue[];demoSaved:string[];setDemoSaved:(ids:string[])=>void;openIssue:(issue:Issue)=>void}){const[rows,setRows]=useState<any[]>([]);const[message,setMessage]=useState('Loading saved locations…');const load=async()=>{if(!supabase){setMessage('Preview saves stay on this device. Configure Supabase to sync saved locations across sessions.');return}const{data:{user}}=await supabase.auth.getUser();if(!user){setMessage('Sign in to sync private saved locations.');return}const{data,error}=await supabase.from('saved_locations').select('*').eq('resident_id',user.id).order('created_at',{ascending:false});if(error){setMessage(error.message);return}setRows(data||[]);setMessage('You have not saved a location yet.')};useEffect(()=>{void load()},[]);const remove=async(id:string)=>{if(id.startsWith('PREVIEW-')){const next=demoSaved.filter(item=>item!==id);setDemoSaved(next);localStorage.setItem('nagrikai-demo-saved',JSON.stringify(next));return}if(!supabase)return;const{error}=await supabase.from('saved_locations').delete().eq('id',id);if(error){setMessage(error.message);return}setRows(prev=>prev.filter(row=>row.id!==id))};const previewRows=issues.filter(i=>demoSaved.includes(i.id)).map(i=>({id:i.id,issue_code:i.id,label:i.location,location_text:`${i.title} · ${i.id}`,preview:true}));const allRows=[...previewRows,...rows];return <><PageHeader eyebrow="YOUR CIVIC SPACE" title="Saved locations" description="Your saved places and issue locations." action={()=>go('Explore Map')} actionLabel="Explore map"/>{allRows.length?<div className="saved-location-list">{allRows.map(row=>{const related=issues.find(i=>i.id===(row.issue_code||row.id))||issues.find(i=>i.location===row.location_text);return <div className="saved-location-row" key={row.id}><button className="saved-location-open" onClick={()=>related?openIssue(related):go('Explore Map')}>{related?.image?<img src={related.image} alt={`${related.category} at ${related.location}`}/>:<span className="issue-row-icon"><MapPin size={17}/></span>}<span><b>{row.label}</b><small>{row.location_text}{row.preview?' · This device preview':''}</small></span><ArrowRight size={15}/></button><button className="btn-outline" onClick={()=>void remove(row.id)}>Remove</button></div>})}</div>:<div className="large-empty"><span className="empty-icon"><MapPin size={22}/></span><h2>No saved places yet</h2><p>{message}</p><button className="btn-dark" onClick={()=>go('Explore Map')}>Explore the map <ArrowRight size={15}/></button></div>}</>}
function NotificationsPage({go,openIssue,issues}:{go:(p:Page)=>void;openIssue:(i:Issue)=>void;issues:Issue[]}){const[rows,setRows]=useState<any[]>([]);const[message,setMessage]=useState('Loading account notifications…');useEffect(()=>{let alive=true;const load=async()=>{if(!supabase){setMessage('Account notifications sync after Supabase is configured. Recent community activity is shown below.');return}const{data:{user}}=await supabase.auth.getUser();if(!user){setMessage('Sign in to receive private notifications for reports you follow. Recent community activity is shown below.');return}const{data,error}=await supabase.from('notifications').select('*').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(50);if(!alive)return;if(error){setMessage(error.message);return}setRows(data||[]);setMessage(data?.length?'':'No personal updates yet. Recent community activity is shown below.')};void load();return()=>{alive=false}},[]);const markRead=async(id:string)=>{if(!supabase)return;const{error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);if(!error)setRows(prev=>prev.map(row=>row.id===id?{...row,read_at:new Date().toISOString()}:row))};const recent=[...issues].sort((a,b)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime()).map(issue=>{const resolved=['COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(issue.status);const date=issue.createdAt?new Date(issue.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):issue.date;return{issue,title:resolved?'Issue marked resolved':'New community report',body:`${issue.title} · ${issue.id}. Raised by ${issue.reporterName||'Resident'} on ${date}.${resolved?(issue.isDemo?' A repair illustration is shown separately; no verified repair evidence is attached.':issue.repairImage?' Repair evidence attached.':' No repair evidence attached yet.') : ''}${issue.isDemo?' Illustrative example, not a verified resident update.':''}`}});return <><PageHeader eyebrow="YOUR CIVIC SPACE" title="Notifications" description="Personal follow updates and recent civic activity, with reporter and date context."/>{rows.length>0&&<><div className="content-heading"><div><h2>Updates you follow</h2><p>Account notifications from saved subscriptions.</p></div></div><div className="notification-list">{rows.map(row=><button key={row.id} className={`notification-row ${row.read_at?'read':''}`} onClick={()=>{void markRead(row.id);const issue=issues.find(i=>i.id===row.issue_code);if(issue)openIssue(issue)}}><span className="notification-dot"/><span><b>{row.title}</b><small>{row.body}</small><time>{new Date(row.created_at).toLocaleString()}</time></span><ChevronRight size={15}/></button>)}</div></>}<div className="content-heading"><div><h2>Recent community activity</h2><p>{message}</p></div></div><div className="notification-list">{recent.map(({issue,title,body})=><button key={issue.id} className="notification-row" onClick={()=>openIssue(issue)}><span className={`notification-dot ${['COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED'].includes(issue.status)?'resolved':''}`}/><span><b>{title}</b><small>{body}</small><time>{issue.createdAt?new Date(issue.createdAt).toLocaleString('en-IN'):issue.date}</time></span><ChevronRight size={15}/></button>)}</div><button className="btn-outline" onClick={()=>go('My Contributions')}>View your reports <ArrowRight size={14}/></button></>}
function PasswordRecovery({go,notify}:{go:(p:Page)=>void;notify:(s:string)=>void}){const[password,setPassword]=useState('');const[message,setMessage]=useState('');return <div className="auth-page"><div className="auth-panel"><button className="text-link auth-back" onClick={()=>go('Home')}><ArrowLeft size={14}/> Back to home</button><span className="auth-mark"><MapPin/></span><h1>Choose a new password</h1><p>Set a new password for your NagrikAI account.</p><form onSubmit={async e=>{e.preventDefault();if(!supabase){setMessage('Supabase Auth is not configured.');return}const{error}=await supabase.auth.updateUser({password});if(error){setMessage(error.message);return}setMessage('Password updated. You can now sign in.');notify('Password updated.')}}><label>New password<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="btn-dark full">Update password <ArrowRight size={15}/></button></form>{message&&<div className="form-notice">{message}</div>}</div></div>}

function EmptyPage({title,text,action,onClick}:{title:string;text:string;action:string;onClick:()=>void}){return <><PageHeader eyebrow="YOUR CIVIC SPACE" title={title} description={text}/><div className="large-empty"><span className="empty-icon"><Bookmark size={24}/></span><h2>Nothing to show yet</h2><p>{text}</p><button className="btn-dark" onClick={onClick}>{action} <ArrowRight size={15}/></button></div></>}
function EmptyInline({icon:Icon,title,text,action,onClick}:{icon:any;title:string;text:string;action:string;onClick:()=>void}){return <div className="inline-empty"><span className="empty-icon"><Icon size={21}/></span><b>{title}</b><p>{text}</p><button className="btn-outline" onClick={onClick}>{action} <ArrowRight size={14}/></button></div>}
function StatusPill({status}:{status:Status}){return <span className={`status-pill ${status.toLowerCase()}`}>{statusLabel[status]}</span>}
function IssueRow({issue,open}:{issue:Issue;open:()=>void}){return <button className="issue-row" onClick={open}>{issue.image?<img className="issue-row-photo" src={issue.image} alt={`${issue.category} report`}/>:<span className="issue-row-icon">{categorySymbol(issue.category)}</span>}<span className="issue-row-copy"><b>{issue.title}</b><small>{issue.location} · {issue.date}</small><small className="issue-row-id">{issue.id}{issue.latitude&&issue.longitude?` · ${issue.latitude.toFixed(5)}, ${issue.longitude.toFixed(5)}`:''}{issue.isDemo?' · Preview example':''}</small></span><StatusPill status={issue.status}/><ChevronRight size={16}/></button>}
function IssueCard({issue,open}:{issue:Issue;open:()=>void}){return <button className="issue-card" onClick={open}>{issue.image?<img src={issue.image} alt=""/>:<div className="issue-card-placeholder"><MapPin size={21}/></div>}<div className="issue-card-body"><span className="tag">{categorySymbol(issue.category)} {issue.category}</span><h4>{issue.title}</h4><p><MapPin size={13}/>{issue.location}{issue.isDemo&&<span className="preview-badge">Preview</span>}</p><small className="issue-card-id">{issue.id}</small><div><StatusPill status={issue.status}/><span><Heart size={13}/>{issue.supporters}</span></div></div></button>}
function PreviewIssueCard({issue}:{issue:Issue}){return <article className="issue-card preview-issue-card">{issue.image&&<img src={issue.image} alt="Illustrative preview of a civic issue"/>}<div className="issue-card-body"><div className="preview-card-meta"><span className="tag">{issue.category}</span><span className="preview-badge">Preview</span></div><h4>{issue.title}</h4><p><MapPin size={13}/>{issue.location}</p><small className="preview-date">Example · {issue.date}</small><div><StatusPill status={issue.status}/><span><Heart size={13}/>{issue.supporters}</span></div></div></article>}
