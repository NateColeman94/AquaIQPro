var state={facility:"Gandy Pool Demo",weather:{temp:94,rain:18},demand:{base:230,adjusted:0},water:{chlorine:2.1,ph:7.4,alk:95},callouts:1,staff:[{name:"Alex",shift:"6 AM–2 PM",area:"Lap Pool",status:"Scheduled"},{name:"Brianna",shift:"8 AM–4 PM",area:"Recreation Pool",status:"Scheduled"},{name:"Carlos",shift:"10 AM–6 PM",area:"Deck Supervisor",status:"Scheduled"},{name:"Dana",shift:"11 AM–5 PM",area:"Lessons",status:"Scheduled"},{name:"Eli",shift:"12 PM–6 PM",area:"Recreation Pool",status:"Scheduled"}],programs:{lessons:[{name:"Beginner Lessons",time:"9:00 AM",count:18},{name:"Intermediate Lessons",time:"10:30 AM",count:14}],parties:[{name:"Birthday Party A",time:"1:00 PM",count:25}],team:[{name:"Swim Team Practice",time:"4:00 PM",lanes:5}]},inventory:[{item:"Liquid Chlorine",onHand:42,min:25,unit:"gal",dailyUse:4.5},{item:"Muriatic Acid",onHand:9,min:10,unit:"gal",dailyUse:1.2},{item:"Test Reagents",onHand:6,min:4,unit:"kits",dailyUse:.35},{item:"Rescue Tubes",onHand:11,min:8,unit:"units",dailyUse:.03}],workOrders:[{asset:"Main Pump",priority:"Medium",status:"Open",desc:"Routine vibration check before weekend peak."},{asset:"Diving Board",priority:"High",status:"Open",desc:"Pre-opening safety inspection required."}],tasks:[{name:"Opening water test",priority:"High",owner:"Pool Manager",done:false},{name:"Confirm lifeguard coverage",priority:"High",owner:"Lifeguard Supervisor",done:false},{name:"Inspect deck and rescue equipment",priority:"Medium",owner:"Lifeguard Supervisor",done:false}],incidents:[],decisions:{},audit:["System initialized with v3.0 master build."]};
var DEFAULT_STATE_JSON=JSON.stringify(state), STORAGE_KEY="AquaIQProV3Master", days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], forecastWeather=[{t:92,r:15},{t:94,r:18},{t:91,r:34},{t:88,r:55},{t:93,r:20},{t:96,r:12},{t:95,r:25}];
function q(id){return document.getElementById(id)}function tag(level){var cls=level==="High"?"high":level==="Medium"?"med":level==="Low"?"low":"info";return '<span class="tag '+cls+'">'+level+'</span>'}
function programDemand(){return state.programs.lessons.reduce((s,x)=>s+x.count,0)*.35+state.programs.parties.reduce((s,x)=>s+x.count,0)*.8+state.programs.team.reduce((s,x)=>s+x.lanes,0)*7+(state.programs.aquaticClass||[]).reduce((s,x)=>s+x.count,0)*.4}
function demandFor(temp,rain){var d=state.demand.base;if(temp>=92)d*=1.28;else if(temp>=86)d*=1.14;if(rain>=60)d*=.58;else if(rain>=35)d*=.78;else if(rain<=20)d*=1.08;return Math.round(d+programDemand())}
function calcDemand(){state.demand.adjusted=demandFor(state.weather.temp,state.weather.rain)}function staffAvailable(){return state.staff.filter(s=>s.status==="Scheduled").length-state.callouts}function staffNeeded(d){d=d||state.demand.adjusted;return Math.max(4,Math.ceil(d/55)+state.programs.parties.length+Math.ceil(state.programs.lessons.length/2))}function waterStatus(){var c=state.water.chlorine,p=state.water.ph;if(c<1||c>4||p<7.2||p>7.8)return"Action";if(c<1.5||c>3.5||p<7.3||p>7.7)return"Watch";return"Good"}function inventoryCalculated(){return state.inventory.map(i=>Object.assign({},i,{days:Math.round(i.onHand/(i.dailyUse*(state.demand.adjusted/250)))}))}function inventoryAlerts(){return inventoryCalculated().filter(i=>i.onHand<=i.min||i.days<=7)}function highOpenWorkOrders(){return state.workOrders.filter(w=>w.priority==="High"&&w.status!=="Completed")}function incompleteHighTasks(){return state.tasks.filter(t=>!t.done&&t.priority==="High")}
function healthScore(){var score=100;if(waterStatus()==="Watch")score-=8;if(waterStatus()==="Action")score-=22;var gap=staffNeeded()-staffAvailable();if(gap>0)score-=gap*10;if(state.weather.rain>50)score-=7;score-=inventoryAlerts().length*6;score-=state.incidents.length*3;score-=highOpenWorkOrders().length*7;score-=incompleteHighTasks().length*4;return Math.max(45,Math.min(100,score))}
function recommendations(){var rec=[],gap=staffNeeded()-staffAvailable();if(gap>0)rec.push({id:"staff-gap",p:"High",t:"Schedule "+gap+" additional lifeguard(s) for peak demand.",why:"Forecast attendance and program load exceed available coverage."});if(waterStatus()==="Action")rec.push({id:"water-action",p:"High",t:"Correct water chemistry before peak swim periods and document retest.",why:"Current chlorine or pH is outside configured range."});if(waterStatus()==="Watch")rec.push({id:"water-watch",p:"Medium",t:"Increase water chemistry testing frequency during afternoon peak.",why:"Readings are near the edge of target range."});if(state.weather.temp>=92&&state.weather.rain<30)rec.push({id:"heat-demand",p:"Medium",t:"Prepare for high open-swim demand with hydration, shade, and extra deck coverage.",why:"High temperature and low rain probability increase demand."});inventoryAlerts().forEach(i=>rec.push({id:"buy-"+i.item,p:i.onHand<=i.min?"High":"Medium",t:"Purchase "+i.item+"; projected supply is "+i.days+" day(s).",why:"Inventory is below minimum or projected below safety stock."}));highOpenWorkOrders().forEach(w=>rec.push({id:"wo-"+w.asset,p:"High",t:"Prioritize "+w.asset+" work order before peak operations.",why:w.desc}));if(incompleteHighTasks().length)rec.push({id:"tasks-high",p:"High",t:"Complete "+incompleteHighTasks().length+" high-priority daily task(s).",why:"Incomplete high-priority tasks reduce readiness."});if(state.programs.team.reduce((s,x)=>s+x.lanes,0)>=5)rec.push({id:"lane-pressure",p:"Medium",t:"Manage swim team lane capacity pressure and update public lane messaging.",why:"Swim team reserved five or more lanes."});if(!rec.length)rec.push({id:"normal",p:"Low",t:"No critical issues. Continue routine monitoring.",why:"All major indicators are within configured limits."});return rec}
function showToast(msg){var t=q("toast");if(!t)return;t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1700)}function updateSaveIndicator(msg){var el=q("saveIndicator");if(el)el.textContent=msg||("Last saved: "+new Date().toLocaleTimeString())}function saveState(show){persistFacilityOperationsState();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));updateSaveIndicator();if(show)showToast("AquaIQPro data saved")}catch(e){showToast("Save failed")}}function loadState(){try{var saved=localStorage.getItem(STORAGE_KEY);if(saved){var parsed=JSON.parse(saved);if(parsed&&parsed.facility)state=parsed}}catch(e){}}function exportData(){saveState(false);var payload=JSON.stringify({exportedAt:new Date().toISOString(),app:"AquaIQPro",version:"v5.3.1 Facility Rosters & Programs Hotfix",state:state},null,2),blob=new Blob([payload],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="AquaIQPro_Backup_"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Backup exported")}function importData(event){var file=event.target.files&&event.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var parsed=JSON.parse(e.target.result),imported=parsed.state||parsed;if(!imported.facility)throw new Error("Invalid file");state=imported;saveState(false);hydrateInputs();render();renderCapacity();generateReport("Daily Operations Report");showToast("Backup imported")}catch(err){showToast("Import failed")}};reader.readAsText(file)}function resetDemoData(){if(!confirm("Reset AquaIQPro to default demo data?"))return;state=JSON.parse(DEFAULT_STATE_JSON);localStorage.removeItem(STORAGE_KEY);hydrateInputs();render();renderCapacity();generateReport("Daily Operations Report");showToast("Demo data reset");updateSaveIndicator("Autosave ready")}
function hydrateInputs(){if(q("tempInput"))q("tempInput").value=state.weather.temp;if(q("rainInput"))q("rainInput").value=state.weather.rain;if(q("baseDemandInput"))q("baseDemandInput").value=state.demand.base;if(q("calloutInput"))q("calloutInput").value=state.callouts;if(q("chlorineInput"))q("chlorineInput").value=state.water.chlorine;if(q("phInput"))q("phInput").value=state.water.ph;if(q("alkInput"))q("alkInput").value=state.water.alk;if(q("scenarioTemp")){q("scenarioTemp").value=state.weather.temp;q("scenarioRain").value=state.weather.rain;q("scenarioExtraDemand").value=0;q("scenarioCallouts").value=0}}
function updateInputs(reason){state.weather.temp=Number(q("tempInput").value||state.weather.temp);state.weather.rain=Number(q("rainInput").value||state.weather.rain);state.demand.base=Number(q("baseDemandInput").value||state.demand.base);state.callouts=Number(q("calloutInput").value||state.callouts);state.water.chlorine=Number(q("chlorineInput").value||state.water.chlorine);state.water.ph=Number(q("phInput").value||state.water.ph);state.water.alk=Number(q("alkInput").value||state.water.alk);state.audit.unshift(new Date().toLocaleString()+": "+reason);render();saveState(false)}


function readinessComponents(){
  var available=staffAvailable(),needed=staffNeeded();
  var staffing=Math.max(0,Math.min(100,Math.round((available/Math.max(1,needed))*100)));
  var water=waterStatus()==="Good"?100:waterStatus()==="Watch"?75:45;
  var invAlerts=inventoryAlerts().length;
  var inventory=Math.max(45,100-invAlerts*15);
  var openWork=state.workOrders.filter(function(w){return w.status!=="Completed";}).length;
  var highWork=state.workOrders.filter(function(w){return w.status!=="Completed"&&w.priority==="High";}).length;
  var maintenance=Math.max(40,100-openWork*8-highWork*12);
  var programCount=state.programs.lessons.length+state.programs.parties.length+state.programs.team.length;
  var programLoad=programCount>0?92:100;
  var weather=state.weather.rain>=70?55:state.weather.rain>=45?75:state.weather.temp>=98?70:95;
  return {staffing:staffing,water:water,inventory:inventory,maintenance:maintenance,programs:programLoad,weather:weather};
}
function renderShiftOperationsCenter(){
  var score=healthScore(),parts=readinessComponents();
  var available=staffAvailable(),needed=staffNeeded();
  var invAlerts=inventoryAlerts().length;
  var openWork=state.workOrders.filter(function(w){return w.status!=="Completed";}).length;
  if(q("readinessGauge"))q("readinessGauge").style.setProperty("--score",score);
  var values={readinessStaffing:parts.staffing+"%",readinessWater:parts.water+"%",readinessInventory:parts.inventory+"%",readinessMaintenance:parts.maintenance+"%",readinessPrograms:parts.programs+"%",readinessWeather:parts.weather+"%"};
  Object.keys(values).forEach(function(id){if(q(id))q(id).textContent=values[id]});
  function setStatus(cardId,valueId,noteId,value,note,color){
    var card=q(cardId),val=q(valueId),noteEl=q(noteId);
    if(card)card.style.setProperty("--status-color",color);
    if(val)val.textContent=value;
    if(noteEl)noteEl.textContent=note;
  }
  setStatus("statusWeather","statusWeatherValue","statusWeatherNote",Math.round(state.weather.temp)+"°F",state.weather.rain+"% rain",state.weather.rain>=60?"#ef4444":state.weather.rain>=35?"#f59e0b":"#10b981");
  setStatus("statusStaffing","statusStaffingValue","statusStaffingNote",available>=needed?"Ready":"Needs action",available+" available / "+needed+" needed",available>=needed?"#10b981":"#ef4444");
  var waterLabel=waterStatus();
  setStatus("statusWater","statusWaterValue","statusWaterNote",waterLabel,"Cl "+state.water.chlorine+" • pH "+state.water.ph,waterLabel==="Good"?"#10b981":waterLabel==="Watch"?"#f59e0b":"#ef4444");
  setStatus("statusInventory","statusInventoryValue","statusInventoryNote",invAlerts?invAlerts+" alert"+(invAlerts===1?"":"s"):"Healthy",invAlerts?"Review low-stock items":"Par levels acceptable",invAlerts?"#f59e0b":"#10b981");
  setStatus("statusMaintenance","statusMaintenanceValue","statusMaintenanceNote",openWork?openWork+" open":"Clear",openWork?"Review due work orders":"No open work orders",openWork?"#f59e0b":"#10b981");
  if(q("homePriorities")){
    q("homePriorities").innerHTML=recommendations().slice(0,6).map(function(r){
      var cls=r.p==="High"?"high":r.p==="Medium"?"medium":"low";
      return '<div class="priority-row"><span class="priority-dot '+cls+'"></span><div><h4>'+r.t+'</h4><p>'+r.why+'</p></div><span class="tag '+(r.p==="High"?"high":r.p==="Medium"?"med":"low")+'">'+r.p+'</span></div>';
    }).join("");
  }
}
function bindShiftQuickActions(){
  document.querySelectorAll("[data-quick-page]").forEach(function(btn){
    if(btn.dataset.bound==="1")return;
    btn.dataset.bound="1";
    btn.addEventListener("click",function(){showPage(btn.dataset.quickPage)});
  });
}

function renderOperationsHome(){
  var score=healthScore(), needed=staffNeeded(), avail=staffAvailable(), recs=recommendations();
  var cap=typeof capacityMetrics==="function"?capacityMetrics():null;
  var capacity=cap?cap.operatingCapacity:Math.max(25,avail*25);
  var pct=capacity?Math.round(state.demand.adjusted/capacity*100):0;
  var openWork=state.workOrders.filter(function(w){return w.status!=="Completed";}).length;
  var invFlags=inventoryAlerts().length;
  var rotationRelief=cap?cap.requiredRelief:(needed>=2?1:0);

  if(q("homeSummaryLine")) q("homeSummaryLine").textContent =
    score>=90 ? "Operations are ready with routine manager review." :
    score>=75 ? "Several items need review before peak demand." :
    "Immediate manager action is recommended before opening.";

  if(q("readinessRing")) q("readinessRing").style.setProperty("--ready-angle",Math.max(0,Math.min(100,score))+"%");
  if(q("homePeak")) q("homePeak").textContent = state.weather.temp>=92 && state.weather.rain<35 ? "2–4 PM" : "12–3 PM";
  if(q("homeCapacity")) q("homeCapacity").textContent = Math.min(999,pct)+"%";
  if(q("homeCapacityDetail")) q("homeCapacityDetail").textContent = state.demand.adjusted+" of "+capacity+" operating capacity";
  if(q("homeRotation")) q("homeRotation").textContent = rotationRelief+" relief";
  if(q("homeInventoryFlags")) q("homeInventoryFlags").textContent = invFlags;
  if(q("homeMaintenance")) q("homeMaintenance").textContent = openWork;
  if(q("homeRiskBadge")){
    var risk=score<75 || pct>=100 ? "High" : score<90 || pct>=85 ? "Moderate" : "Low";
    q("homeRiskBadge").textContent=risk+" risk";
    q("homeRiskBadge").className="tag "+(risk==="High"?"high":risk==="Moderate"?"med":"low");
  }

  if(q("homePriorities")){
    q("homePriorities").innerHTML=recs.slice(0,5).map(function(r,i){
      return '<div class="priority-item"><div class="priority-number">'+(i+1)+'</div><div><h4>'+r.t+'</h4><p>'+r.why+'</p></div></div>';
    }).join("");
  }

  if(q("homeTimeline")){
    var total=Math.max(1,cap?cap.requiredSurveillance:Math.ceil(state.demand.adjusted/25));
    var steps=["Open","10:30","12:30","2:30","4:30"];
    q("homeTimeline").innerHTML=steps.map(function(time,i){
      var text=i===0?"Opening checks":i===1?"First rotations":i===2?"Program transition":i===3?"Peak coverage":"Closeout review";
      return '<div class="timeline-step"><b>'+time+'</b><span>'+text+'</span></div>';
    }).join("");
  }
}
function beginDayReview(){
  var btn=q("beginDayButton");
  if(btn){btn.textContent="Day Review Started";btn.classList.add("good");}
  state.audit.unshift(new Date().toLocaleString()+": Manager began daily operating review");
  saveState(false);
  showToast("Daily review started");
}

function render(){syncFacilityOperationsState();calcDemand();var score=healthScore(),needed=staffNeeded(),avail=staffAvailable(),ws=waterStatus(),recs=recommendations();q("healthMetric").textContent=score+"%";q("healthTrend").textContent=score>=90?"Strong operating posture":score>=75?"Manageable with attention":"Needs manager action";q("healthBar").style.width=score+"%";q("demandMetric").textContent=state.demand.adjusted;q("demandTrend").textContent="Base "+state.demand.base+", adjusted for weather and programs.";q("staffMetric").textContent=avail+"/"+needed;q("staffTrend").textContent=avail>=needed?"Coverage meets forecast need":"Coverage gap detected";q("waterMetric").textContent=ws;q("waterTrend").textContent="Chlorine "+state.water.chlorine+" ppm, pH "+state.water.ph;q("aiSummary").innerHTML="<p><b>Today's outlook:</b> "+(score>=85?"Ready with routine monitoring.":"Manager attention recommended.")+"</p><p>Forecast demand is <b>"+state.demand.adjusted+"</b>. Recommended lifeguards: <b>"+needed+"</b>.</p><p><b>Explainability:</b> weather, programs, staffing, water, inventory, maintenance, tasks, and incidents feed the score.</p>";q("priorityActions").innerHTML=recs.map(r=>"<p>"+tag(r.p)+" "+r.t+"<br><span class='small'>Why: "+r.why+"</span></p>").join("");q("programLoad").innerHTML="<p>Lessons: <b>"+state.programs.lessons.length+"</b></p><p>Pool parties: <b>"+state.programs.parties.length+"</b></p><p>Swim team reserved lanes: <b>"+state.programs.team.reduce((s,x)=>s+x.lanes,0)+"</b></p>";q("inventoryRisk").innerHTML=inventoryAlerts().length?inventoryAlerts().map(i=>"<p>"+tag("High")+" "+i.item+": "+i.days+" days left</p>").join(""):"<p>"+tag("Low")+" No urgent purchase alerts.</p>";q("decisionStatus").innerHTML="<p>Approved: <b>"+Object.values(state.decisions).filter(x=>x==="Approved").length+"</b></p><p>Deferred: <b>"+Object.values(state.decisions).filter(x=>x==="Deferred").length+"</b></p><p>Overridden: <b>"+Object.values(state.decisions).filter(x=>x==="Overridden").length+"</b></p>";renderOperations();renderForecast();renderWater();renderStaff();renderPrograms();renderInventory();renderMaintenance();renderTasks();renderDecisions();renderDataSummary();renderAIOps();renderOperationsHome();renderShiftOperationsCenter();renderCapacity()}
function renderOperations(){q("checklist").innerHTML=["Water chemistry checked","Staffing coverage reviewed","Programs confirmed","Inventory reviewed","Maintenance reviewed"].map(x=>"<p>☑ "+x+"</p>").join("");q("incidents").innerHTML=state.incidents.length?state.incidents.map(i=>"<p>⚠ "+i+"</p>").join(""):"<p class='small'>No incidents logged.</p>"}
function renderForecast(){var weatherSource=liveForecastWeatherArray();var vals=weatherSource.map((w,i)=>{var d=demandFor(w.t,w.r);return{day:w.date?weatherDayLabel(w.date):days[i],temp:w.t,rain:w.r,d:d,staff:staffNeeded(d)}}),max=Math.max(...vals.map(x=>x.d));q("demandChart").innerHTML=vals.map(x=>"<div style='height:"+Math.max(20,x.d/max*160)+"px'><b>"+x.d+"</b><span>"+x.day+"</span></div>").join("");q("forecastTable").innerHTML=vals.map((x,i)=>"<tr><td>"+x.day+"</td><td>"+x.temp+"°F</td><td>"+x.rain+"%</td><td>"+(i>=4?"Weekend/event load":"Standard")+"</td><td>"+x.d+"</td><td>"+x.staff+"</td></tr>").join("");var high=vals.slice().sort((a,b)=>b.d-a.d)[0];q("forecastExplanation").innerHTML="<p>AquaIQPro increases demand when heat is high and rain is low. It lowers demand when rain risk is high. Program load adds demand from lessons, parties, and swim team.</p><p><b>Highest projected day:</b> "+high.day+" with "+high.d+" visitors.</p>"}
function renderWater(){var rows=[["Free Chlorine","1.0–4.0 ppm",state.water.chlorine,state.water.chlorine>=1&&state.water.chlorine<=4?"Low":"High"],["pH","7.2–7.8",state.water.ph,state.water.ph>=7.2&&state.water.ph<=7.8?"Low":"High"],["Alkalinity","80–120 ppm",state.water.alk,state.water.alk>=80&&state.water.alk<=120?"Low":"Medium"]];q("chemicalRanges").innerHTML=rows.map(r=>"<tr><td>"+r[0]+"</td><td>"+r[1]+"</td><td>"+r[2]+"</td><td>"+tag(r[3])+"</td></tr>").join("");var wr=recommendations().filter(r=>r.id.indexOf("water")>=0);q("waterGuidance").innerHTML=wr.length?wr.map(r=>"<p>"+tag(r.p)+" "+r.t+"<br><span class='small'>"+r.why+"</span></p>").join(""):"<p>Water readings are within target range. Continue scheduled testing.</p>"}
function renderStaff(){q("staffTable").innerHTML=state.staff.map((s,i)=>"<tr><td>"+s.name+"</td><td>"+s.shift+"</td><td>"+s.area+"</td><td><select onchange='state.staff["+i+"].status=this.value;updateInputs(\"Staff status changed\")'><option "+(s.status==="Scheduled"?"selected":"")+">Scheduled</option><option "+(s.status==="No Show"?"selected":"")+">No Show</option><option "+(s.status==="Called Out"?"selected":"")+">Called Out</option></select></td><td><button class='btn bad' onclick='removeStaff("+i+")'>Remove</button></td></tr>").join("")}
function renderPrograms(){
  q("lessonList").innerHTML=state.programs.lessons.map((x,i)=>"<p><b>"+x.name+"</b><br>"+x.time+" • "+x.count+" swimmers <button onclick='removeProgram(\"lessons\","+i+")'>Remove</button></p>").join("");
  q("partyList").innerHTML=state.programs.parties.map((x,i)=>"<p><b>"+x.name+"</b><br>"+x.time+" • "+x.count+" guests <button onclick='removeProgram(\"parties\","+i+")'>Remove</button></p>").join("");
  q("teamList").innerHTML=state.programs.team.map((x,i)=>"<p><b>"+x.name+"</b><br>"+x.time+" • "+x.lanes+" lanes <button onclick='removeProgram(\"team\","+i+")'>Remove</button></p>").join("");
  q("aquaticClassList").innerHTML=(state.programs.aquaticClass||[]).map((x,i)=>"<p><b>"+x.name+"</b><br>"+x.time+" • "+x.count+" participants <button onclick='removeProgram(\"aquaticClass\","+i+")'>Remove</button></p>").join("");

  var isGandy=activeFacilityId==="gandy";
  q("swimTeamProgramCard").classList.toggle("program-card-hidden",!isGandy);
  q("aquaticClassProgramCard").classList.toggle("program-card-hidden",!isGandy);
  q("laneCapacityCard").classList.toggle("program-card-hidden",!isGandy);

  var lanes=state.programs.team.reduce((s,x)=>s+x.lanes,0);
  q("lanePressure").innerHTML="Current reserved swim team lanes: <b>"+lanes+"</b>. "+(lanes>=5?"Pressure is high.":"Pressure is manageable.");

  if(q("facilityProgramNote")){
    q("facilityProgramNote").innerHTML=isGandy
      ?"<b>Gandy Pool program profile</b><br><span class='small'>Swim Lessons, Pool Parties, Swim Team, and Aquatic Class affect demand and staffing.</span>"
      :"<b>Simpson Park Pool program profile</b><br><span class='small'>Swim Lessons and Pool Parties affect demand and staffing. Swim Team and Aquatic Class are not scheduled at this facility.</span>";
  }
}
function renderInventory(){q("inventoryTable").innerHTML=inventoryCalculated().map(i=>{var rec=i.onHand<=i.min?"Order now: below minimum.":i.days<=7?"Order within 48 hours.":"Monitor; no immediate purchase needed.";return"<tr><td>"+i.item+"</td><td>"+i.onHand+" "+i.unit+"</td><td>"+i.min+" "+i.unit+"</td><td>"+i.days+"</td><td>"+rec+"</td></tr>"}).join("")}
function renderMaintenance(){q("workOrders").innerHTML=state.workOrders.map((w,i)=>"<div class='rowbox'><b>"+w.asset+"</b> "+tag(w.priority)+"<p>"+w.desc+"</p><select onchange='state.workOrders["+i+"].status=this.value;updateInputs(\"Work order status changed\")'><option "+(w.status==="Open"?"selected":"")+">Open</option><option "+(w.status==="In Progress"?"selected":"")+">In Progress</option><option "+(w.status==="Completed"?"selected":"")+">Completed</option></select></div>").join("");q("maintenanceAI").innerHTML=highOpenWorkOrders().length?highOpenWorkOrders().map(w=>"<p>"+tag("High")+" "+w.asset+": "+w.desc+"</p>").join(""):"<p>"+tag("Low")+" No high-priority maintenance blockers.</p>"}
function renderTasks(){q("taskBoard").innerHTML=state.tasks.map((t,i)=>"<div class='rowbox rowflex "+(t.done?"done":"")+"'><div><b>"+t.name+"</b><br><span class='small'>"+t.owner+" • "+t.priority+"</span></div><button class='btn "+(t.done?"secondary":"good")+"' onclick='toggleTask("+i+")'>"+(t.done?"Undo":"Done")+"</button></div>").join("")}
function renderDecisions(){var recs=recommendations();q("approvalQueue").innerHTML=recs.map(r=>"<div class='rowbox rowflex'><div><p>"+tag(r.p)+" <b>"+r.t+"</b></p><p class='small'>Why: "+r.why+"</p><p class='small'>Status: "+(state.decisions[r.id]||"Pending")+"</p></div><div class='actions'><button class='btn good' onclick='decide(\""+r.id+"\",\"Approved\")'>Approve</button><button class='btn warn' onclick='decide(\""+r.id+"\",\"Deferred\")'>Defer</button><button class='btn bad' onclick='decide(\""+r.id+"\",\"Overridden\")'>Override</button></div></div>").join("");q("auditTrail").innerHTML=state.audit.slice(0,12).map(a=>"<p class='small'>"+a+"</p>").join("")}
function renderDataSummary(){if(!q("dataSummary"))return;q("dataSummary").innerHTML="<p><b>Facility:</b> "+state.facility+"</p><p><b>Staff records:</b> "+state.staff.length+"</p><p><b>Program records:</b> "+(state.programs.lessons.length+state.programs.parties.length+state.programs.team.length)+"</p><p><b>Inventory items:</b> "+state.inventory.length+"</p><p><b>Open work orders:</b> "+state.workOrders.filter(w=>w.status!=='Completed').length+"</p><p><b>Decisions recorded:</b> "+Object.keys(state.decisions||{}).length+"</p>"}
function renderAIOps(){if(!q("aiOpsBriefing"))return;var recs=recommendations();q("aiOpsBriefing").innerHTML="<p><b>Good morning.</b> AquaIQPro estimates "+state.demand.adjusted+" visitors today and recommends "+staffNeeded()+" lifeguards. Current active coverage is "+staffAvailable()+".</p><p>"+(healthScore()>=90?"Today appears stable.":"Manager review is recommended.")+"</p><p><b>Top recommendation:</b> "+recs[0].t+"</p>";q("aiExplainPanel").innerHTML='<div class="status-strip"><div class="status-box"><b>Weather</b>'+state.weather.temp+'°F and '+state.weather.rain+'% rain</div><div class="status-box"><b>Programs</b>'+state.programs.lessons.length+' lessons, '+state.programs.parties.length+' parties</div><div class="status-box"><b>Operations</b>Staffing, water, inventory, maintenance</div><div class="status-box"><b>Saved Data</b>Browser autosave enabled</div></div>';q("explainabilityList").innerHTML=recs.map(r=>"<div class='rowbox'><b>"+r.p+" priority:</b> "+r.t+"<br><span class='small'>Why AquaIQPro recommended this: "+r.why+"</span></div>").join("")}
function addIncident(){if(q("incidentInput").value.trim()){state.incidents.unshift(q("incidentInput").value.trim());q("incidentInput").value="";updateInputs("Incident added")}}function addStaff(){if(q("newStaffName").value.trim()){state.staff.push({name:q("newStaffName").value,shift:q("newStaffShift").value||"TBD",area:q("newStaffArea").value,status:"Scheduled"});q("newStaffName").value="";q("newStaffShift").value="";updateInputs("Staff member added")}}function removeStaff(i){state.staff.splice(i,1);updateInputs("Staff member removed")}function addProgram(type){
  if(type==="lessons")state.programs.lessons.push({name:"New Lesson Block",time:"11:00 AM",count:12});
  else if(type==="parties")state.programs.parties.push({name:"New Pool Party",time:"3:00 PM",count:20});
  else if(type==="team"&&activeFacilityId==="gandy")state.programs.team.push({name:"Swim Team Practice",time:"4:00 PM",lanes:4});
  else if(type==="aquaticClass"&&activeFacilityId==="gandy")state.programs.aquaticClass.push({name:"Aquatic Class",time:"12:00 PM",count:14});
  updateInputs("Program added");
}
function removeProgram(type,i){state.programs[type].splice(i,1);updateInputs("Program removed")}function addWorkOrder(){if(q("woAsset").value.trim()){state.workOrders.unshift({asset:q("woAsset").value.trim(),priority:q("woPriority").value,status:q("woStatus").value,desc:q("woDesc").value.trim()||"No description entered."});q("woAsset").value="";q("woDesc").value="";updateInputs("Work order added")}}function addTask(){if(q("taskName").value.trim()){state.tasks.unshift({name:q("taskName").value.trim(),priority:q("taskPriority").value,owner:q("taskOwner").value,done:false});q("taskName").value="";updateInputs("Daily task added")}}function toggleTask(i){state.tasks[i].done=!state.tasks[i].done;updateInputs("Daily task status changed")}function decide(id,status){state.decisions[id]=status;state.audit.unshift(new Date().toLocaleString()+": Recommendation "+id+" "+status);render();saveState(false)}
function shortStatus(c){if(c.health>=90)return"Ready";if(c.health>=75)return"Review";return"Action"}function reportBullets(){var recs=recommendations(),high=recs.filter(r=>r.p==="High"),lanes=state.programs.team.reduce((s,x)=>s+x.lanes,0),inv=inventoryAlerts(),openWO=state.workOrders.filter(w=>w.status!=="Completed"),openTasks=state.tasks.filter(t=>!t.done);return{summary:["Forecast demand is "+state.demand.adjusted+" visitors.","Staffing is "+staffAvailable()+" active vs. "+staffNeeded()+" recommended.","Water status is "+waterStatus()+".",high.length?high.length+" high-priority item(s) need review.":"No high-priority action is currently required."],actions:recs.slice(0,5).map(r=>r.p+": "+r.t),programs:[state.programs.lessons.length+" swim lesson block(s)",state.programs.parties.length+" pool party event(s)",lanes+" swim team reserved lane(s)",lanes>=5?"Lane pressure is high.":"Lane pressure is manageable."],operations:[inv.length?inv.length+" inventory purchase flag(s)":"No urgent purchase flags",openWO.length+" open maintenance work order(s)",openTasks.length+" incomplete daily task(s)",state.incidents.length+" incident(s) logged"]}}
function buildReportHTML(title){var c={health:healthScore(),total:state.demand.adjusted,staffActive:staffAvailable(),required:staffNeeded(),water:waterStatus()},b=reportBullets(),generated=new Date().toLocaleString();return'<div class="report-compact"><div class="report-hero"><h3>'+title+'</h3><p>'+state.facility+' • '+generated+'</p></div><div class="compact-kpis"><div class="compact-kpi"><span>Status</span><b>'+shortStatus(c)+'</b></div><div class="compact-kpi"><span>Health</span><b>'+c.health+'%</b></div><div class="compact-kpi"><span>Demand</span><b>'+c.total+'</b></div><div class="compact-kpi"><span>Staffing</span><b>'+c.staffActive+'/'+c.required+'</b></div></div><div class="compact-body"><div class="compact-section"><h4>Manager Snapshot</h4><ul class="bullet-clean">'+b.summary.map(x=>'<li>'+x+'</li>').join("")+'</ul></div><div class="compact-section"><h4>Top AI Actions</h4><ul class="bullet-clean">'+b.actions.map(x=>'<li>'+x+'</li>').join("")+'</ul></div><div class="compact-section"><h4>Programs & Demand</h4><ul class="bullet-clean">'+b.programs.map(x=>'<li>'+x+'</li>').join("")+'</ul></div><div class="compact-section"><h4>Operations Watchlist</h4><ul class="bullet-clean">'+b.operations.map(x=>'<li>'+x+'</li>').join("")+'</ul></div><div class="compact-section" style="grid-column:1/-1"><h4>Forecast Reasoning</h4><div class="status-strip"><div class="status-box"><b>Weather</b>'+state.weather.temp+'°F, '+state.weather.rain+'% rain</div><div class="status-box"><b>Water</b>Chlorine '+state.water.chlorine+' ppm, pH '+state.water.ph+'</div><div class="status-box"><b>Capacity</b>Programs + staffing + lane pressure</div><div class="status-box"><b>Saved Data</b>Browser autosave enabled</div></div></div></div></div>'}
function generateReport(title){var visual=q("reportVisual");if(visual)visual.innerHTML=buildReportHTML(title);var text=q("reportBox");if(text)text.value=visual?visual.innerText:""}
function runScenario(){var temp=Number(q("scenarioTemp").value||state.weather.temp),rain=Number(q("scenarioRain").value||state.weather.rain),extra=Number(q("scenarioExtraDemand").value||0),callouts=Number(q("scenarioCallouts").value||0),d=demandFor(temp,rain)+extra,need=staffNeeded(d),avail=staffAvailable()-callouts,gap=Math.max(0,need-avail),risk=gap>1||rain>65?"High":gap===1||temp>=95?"Medium":"Low";q("scenarioDemand").textContent=d;q("scenarioDemandNote").textContent="Based on "+temp+"°F, "+rain+"% rain, and "+extra+" extra visitors.";q("scenarioStaffGap").textContent=gap;q("scenarioStaffNote").textContent=avail+" available vs. "+need+" recommended.";q("scenarioRisk").textContent=risk;q("scenarioRiskNote").textContent=risk==="High"?"Manager action recommended.":risk==="Medium"?"Monitor and prepare backup coverage.":"Scenario appears manageable."}
function quickAsk(txt){q("askInput").value=txt;askAI()}function askAI(){var ask=q("askInput").value.toLowerCase(),ans="Based on current inputs, ";if(ask.includes("lifeguard")||ask.includes("staff"))ans+=staffAvailable()>=staffNeeded()?"staffing appears sufficient with "+staffAvailable()+" available against "+staffNeeded()+" recommended.":"add "+(staffNeeded()-staffAvailable())+" lifeguard(s) for forecast demand and programs.";else if(ask.includes("chemical")||ask.includes("chlorine")||ask.includes("water"))ans+=waterStatus()==="Good"?"water quality is within target range. Continue routine testing.":"water quality needs attention. Chlorine is "+state.water.chlorine+" ppm and pH is "+state.water.ph+".";else if(ask.includes("buy")||ask.includes("order")||ask.includes("inventory"))ans+=inventoryAlerts().length?"purchase "+inventoryAlerts().map(i=>i.item).join(", ")+" based on current inventory and demand.":"no urgent purchases are required right now.";else if(ask.includes("maintenance"))ans+=highOpenWorkOrders().length?"prioritize "+highOpenWorkOrders().map(w=>w.asset).join(", ")+".":"there are no high-priority maintenance blockers right now.";else if(ask.includes("executive"))ans+="operational health is "+healthScore()+"%, forecast demand is "+state.demand.adjusted+", staffing is "+staffAvailable()+" available against "+staffNeeded()+" recommended, and there are "+recommendations().length+" active operational recommendations.";else ans+="the top recommendation is: "+recommendations()[0].t;q("assistantAnswer").innerHTML="<p>"+ans+"</p><p class='small'>Reasoning uses weather, demand, program load, staffing, water quality, inventory, maintenance, tasks, and incidents.</p>"}
function toggleChat(){var p=q("chatPop");if(p)p.classList.toggle("open")}function askAIPopup(){var pop=q("popupAsk"),old=q("askInput"),ans=q("popupAnswer");if(pop&&old)old.value=pop.value;askAI();if(ans&&q("assistantAnswer"))ans.innerHTML=q("assistantAnswer").innerHTML}

function capacityMetrics(){
  calcDemand();
  var forecast=Number(state.demand.adjusted||0);
  var scheduled=Math.max(0,state.staff.filter(function(s){return s.status==="Scheduled";}).length-Number(state.callouts||0));
  var reliefRequired=scheduled>=2?1:0;
  var activeSurveillance=Math.max(0,scheduled-reliefRequired);
  var staffingCapacity=activeSurveillance*25;
  var facilityLimit=activeFacility().capacity;
  var operatingCapacity=Math.min(staffingCapacity,facilityLimit);
  var requiredSurveillance=Math.ceil(forecast/25);
  var requiredRelief=requiredSurveillance>=2?1:0;
  var requiredScheduled=requiredSurveillance+requiredRelief;
  return {forecast:forecast,scheduled:scheduled,activeSurveillance:activeSurveillance,staffingCapacity:staffingCapacity,facilityLimit:facilityLimit,operatingCapacity:operatingCapacity,requiredSurveillance:requiredSurveillance,requiredRelief:requiredRelief,requiredScheduled:requiredScheduled};
}
function renderCapacity(){
  var m=capacityMetrics();
  if(!q("capForecast"))return;
  q("capForecast").textContent=Math.round(m.forecast);
  q("capActiveGuards").textContent=m.activeSurveillance;
  q("capStaffCapacity").textContent=m.staffingCapacity;
  q("capFacilityLimit").textContent=m.facilityLimit;
  var pct=m.operatingCapacity?m.forecast/m.operatingCapacity:1, alert=q("capacityAlert");
  if(m.forecast>=m.operatingCapacity){
    alert.className="capacity-alert full";
    alert.textContent="CAPACITY REACHED: Forecast demand meets or exceeds the current operating limit of "+m.operatingCapacity+" swimmers. Pause admission until swimmer count drops or qualified staffing increases.";
  }else if(pct>=0.85){
    alert.className="capacity-alert warn";
    alert.textContent="NEAR CAPACITY: "+Math.round(m.forecast)+" of "+m.operatingCapacity+" swimmer spaces are projected ("+Math.round(pct*100)+"%). Prepare controlled entry and backup staffing.";
  }else{
    alert.className="capacity-alert ok";
    alert.textContent="Within capacity: "+Math.round(m.forecast)+" projected swimmers against an operating limit of "+m.operatingCapacity+".";
  }
  q("rotationPlan").innerHTML="<b>30-minute rotation plan:</b> "+m.requiredSurveillance+" active surveillance position(s) are required. Add "+m.requiredRelief+" relief/rotation guard, for <b>"+m.requiredScheduled+" total scheduled lifeguard(s)</b>. Rotate every 30 minutes while preserving continuous zone coverage.";
}



var LIVE_WEATHER={
  latitude:28.0395,
  longitude:-81.9498,
  timezone:"America/New_York",
  loaded:false,
  lastUpdated:null,
  current:null,
  daily:[],
  hourly:[]
};
var WEATHER_REFRESH_MS=30*60*1000;
var weatherRefreshTimer=null;

function weatherCodeLabel(code){
  var map={
    0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",
    45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
    61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Heavy freezing rain",
    71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",
    80:"Rain showers",81:"Rain showers",82:"Heavy showers",
    85:"Snow showers",86:"Heavy snow showers",95:"Thunderstorms",
    96:"Thunderstorms with hail",99:"Severe thunderstorms with hail"
  };
  return map[code]||"Changing conditions";
}
function weatherDayLabel(dateString){
  var date=new Date(dateString+"T12:00:00");
  return date.toLocaleDateString("en-US",{weekday:"short"});
}
function setWeatherStatus(mode,text){
  ["weatherLiveDot","weatherPageDot"].forEach(function(id){
    var el=q(id);if(el)el.className="weather-dot "+(mode||"");
  });
  ["weatherLiveStatus","weatherPageStatus"].forEach(function(id){
    var el=q(id);if(el)el.textContent=text;
  });
}
function weatherApiUrl(){
  var hourly=[
    "temperature_2m","apparent_temperature","precipitation_probability",
    "precipitation","weather_code"
  ].join(",");
  var daily=[
    "weather_code","temperature_2m_max","temperature_2m_min",
    "precipitation_probability_max","precipitation_sum"
  ].join(",");
  return "https://api.open-meteo.com/v1/forecast?latitude="+LIVE_WEATHER.latitude+
    "&longitude="+LIVE_WEATHER.longitude+
    "&current=temperature_2m,apparent_temperature,precipitation,rain,weather_code"+
    "&hourly="+encodeURIComponent(hourly)+
    "&daily="+encodeURIComponent(daily)+
    "&temperature_unit=fahrenheit&precipitation_unit=inch&timezone="+encodeURIComponent(LIVE_WEATHER.timezone)+
    "&forecast_days=7";
}
async function loadLiveWeather(showNotice){
  setWeatherStatus("","Loading");
  if(q("weatherLiveSummary"))q("weatherLiveSummary").textContent="Loading the latest Lakeland forecast…";
  try{
    var response=await fetch(weatherApiUrl(),{cache:"no-store"});
    if(!response.ok)throw new Error("Weather service returned "+response.status);
    var payload=await response.json();
    LIVE_WEATHER.current=payload.current||null;
    LIVE_WEATHER.daily=[];
    if(payload.daily&&Array.isArray(payload.daily.time)){
      LIVE_WEATHER.daily=payload.daily.time.map(function(date,i){
        return {
          date:date,
          code:payload.daily.weather_code[i],
          high:Math.round(payload.daily.temperature_2m_max[i]),
          low:Math.round(payload.daily.temperature_2m_min[i]),
          rainChance:Math.round(payload.daily.precipitation_probability_max[i]||0),
          precipitation:Number(payload.daily.precipitation_sum[i]||0)
        };
      });
    }
    LIVE_WEATHER.hourly=[];
    if(payload.hourly&&Array.isArray(payload.hourly.time)){
      LIVE_WEATHER.hourly=payload.hourly.time.map(function(time,i){
        return {
          time:time,
          temp:Number(payload.hourly.temperature_2m[i]),
          feels:Number(payload.hourly.apparent_temperature[i]),
          rainChance:Number(payload.hourly.precipitation_probability[i]||0),
          precipitation:Number(payload.hourly.precipitation[i]||0),
          code:payload.hourly.weather_code[i]
        };
      });
    }
    LIVE_WEATHER.loaded=true;
    LIVE_WEATHER.lastUpdated=new Date();
    applyLiveWeatherToOperations();
    renderLiveWeather();
    render();
    saveState(false);
    if(showNotice)showToast("Lakeland weather refreshed");
  }catch(err){
    LIVE_WEATHER.loaded=false;
    setWeatherStatus("error","Manual fallback");
    if(q("weatherLiveSummary"))q("weatherLiveSummary").textContent="Live forecast unavailable. AquaIQPro is using the current manual weather inputs.";
    if(q("weatherUpdatedAt"))q("weatherUpdatedAt").textContent="Live forecast unavailable. Manual values remain active.";
    if(showNotice)showToast("Weather unavailable; using manual inputs");
    console.warn("AquaIQPro weather load failed:",err);
  }
}
function applyLiveWeatherToOperations(){
  if(!LIVE_WEATHER.current)return;
  state.weather.temp=Math.round(Number(LIVE_WEATHER.current.temperature_2m));
  var currentHour=LIVE_WEATHER.current.time;
  var hourlyMatch=LIVE_WEATHER.hourly.find(function(h){return h.time===currentHour});
  if(!hourlyMatch&&LIVE_WEATHER.hourly.length){
    hourlyMatch=LIVE_WEATHER.hourly.reduce(function(best,h){
      return Math.abs(new Date(h.time)-new Date(currentHour))<Math.abs(new Date(best.time)-new Date(currentHour))?h:best;
    },LIVE_WEATHER.hourly[0]);
  }
  state.weather.rain=hourlyMatch?Math.round(hourlyMatch.rainChance):0;
  hydrateInputs();
}
function renderLiveWeather(){
  if(!LIVE_WEATHER.loaded||!LIVE_WEATHER.current)return;
  var c=LIVE_WEATHER.current,d=LIVE_WEATHER.daily[0]||null;
  var condition=weatherCodeLabel(c.weather_code);
  setWeatherStatus("live","Live");
  if(q("weatherLiveSummary"))q("weatherLiveSummary").textContent=
    Math.round(c.temperature_2m)+"°F, "+condition+", "+state.weather.rain+"% rain chance";
  if(q("weatherUpdatedAt"))q("weatherUpdatedAt").textContent=
    "Updated "+LIVE_WEATHER.lastUpdated.toLocaleTimeString()+" for Lakeland, Florida";
  if(q("liveCurrentTemp"))q("liveCurrentTemp").textContent=Math.round(c.temperature_2m)+"°F";
  if(q("liveFeelsLike"))q("liveFeelsLike").textContent=Math.round(c.apparent_temperature)+"°F";
  if(q("liveRainChance"))q("liveRainChance").textContent=state.weather.rain+"%";
  if(q("liveWeatherCondition"))q("liveWeatherCondition").textContent=condition;
  if(q("liveHighLow")&&d)q("liveHighLow").textContent=d.high+"° / "+d.low+"°";
  if(q("livePrecipTotal")&&d)q("livePrecipTotal").textContent=d.precipitation.toFixed(2)+'" forecast precipitation';
  if(q("weatherWeek")){
    q("weatherWeek").innerHTML=LIVE_WEATHER.daily.map(function(day){
      return '<div class="weather-day"><b>'+weatherDayLabel(day.date)+'</b><span>'+weatherCodeLabel(day.code)+'</span><b>'+day.high+'° / '+day.low+'°</b><span>'+day.rainChance+'% rain</span></div>';
    }).join("");
  }
}
function liveForecastWeatherArray(){
  if(!LIVE_WEATHER.loaded||!LIVE_WEATHER.daily.length)return forecastWeather;
  return LIVE_WEATHER.daily.map(function(day){
    return {t:day.high,r:day.rainChance,low:day.low,code:day.code,date:day.date};
  });
}

var FACILITY_PROFILES={
  gandy:{
    id:"gandy",
    name:"Gandy Pool",
    description:"Heated 10-lane, 25-yard short-course pool with a one-meter diving board and an attached 3–4 foot recreation pool.",
    address:"404 Imperial Boulevard, Lakeland, FL",
    phone:"863.834.3157",
    operatingHours:"Lap swim weekdays 5:30 AM–7 PM; open swim weekdays 12–5 PM; weekends 10 AM–5 PM",
    poolType:"Competition + recreation pools",
    seasonal:"Year-round heated facility",
    capacity:300,
    baseDemand:230,
    typicalGuards:9,
    inventoryMultiplier:1,
    maintenance:["Diving board inspection","Main pump vibration check","Lane rope inspection"],
    schedule:[
      ["5:30 AM","Opening checks"],
      ["7:00 AM","Water test"],
      ["9:00 AM","Swim lessons"],
      ["10:30 AM","Guard rotation"],
      ["12:00 PM","Open swim begins"],
      ["2:00 PM","Peak attendance"],
      ["4:00 PM","Swim team / limited lanes"],
      ["7:00 PM","Closing checklist"]
    ]
  },
  simpson:{
    id:"simpson",
    name:"Simpson Park Pool",
    description:"Unheated neighborhood pool operating seasonally during summer, with lap and open-swim hours.",
    address:"1725 Martin Luther King Jr. Avenue, Lakeland, FL",
    phone:"863.834.2286",
    operatingHours:"Lap swim daily 10 AM–5 PM; open swim weekdays 12–5 PM and weekends 10 AM–5 PM",
    poolType:"Seasonal neighborhood pool",
    seasonal:"Seasonal summer operation; unheated",
    capacity:175,
    baseDemand:110,
    typicalGuards:6,
    inventoryMultiplier:.65,
    maintenance:["Pool liner inspection","Deck inspection","Seasonal equipment check"],
    schedule:[
      ["9:30 AM","Opening checks"],
      ["10:00 AM","Lap swim opens"],
      ["10:30 AM","Water test"],
      ["12:00 PM","Open swim begins"],
      ["1:30 PM","Guard rotation"],
      ["3:00 PM","Peak attendance"],
      ["4:30 PM","Final rotation"],
      ["5:00 PM","Closing checklist"]
    ]
  }
};

var FACILITY_STAFF_DEFAULTS={
  gandy:[
    {name:"Jordan Blake",shift:"6 AM–2 PM",area:"Lap Pool",status:"Scheduled"},
    {name:"Maya Thompson",shift:"7 AM–3 PM",area:"Recreation Pool",status:"Scheduled"},
    {name:"Luis Ramirez",shift:"8 AM–4 PM",area:"Deck Supervisor",status:"Scheduled"},
    {name:"Emma Carter",shift:"9 AM–5 PM",area:"Lessons",status:"Scheduled"},
    {name:"Noah Williams",shift:"10 AM–6 PM",area:"Lap Pool",status:"Scheduled"},
    {name:"Olivia Chen",shift:"11 AM–7 PM",area:"Recreation Pool",status:"Scheduled"},
    {name:"Ethan Brooks",shift:"12 PM–8 PM",area:"Swim Team",status:"Scheduled"},
    {name:"Ava Martinez",shift:"12 PM–8 PM",area:"Aquatic Class",status:"Scheduled"}
  ],
  simpson:[
    {name:"Caleb Morgan",shift:"10 AM–6 PM",area:"Recreation Pool",status:"Scheduled"},
    {name:"Sophia Reed",shift:"10 AM–6 PM",area:"Lessons",status:"Scheduled"},
    {name:"Marcus Hill",shift:"11 AM–7 PM",area:"Deck Supervisor",status:"Scheduled"},
    {name:"Lily Foster",shift:"11 AM–7 PM",area:"Recreation Pool",status:"Scheduled"},
    {name:"Daniel Kim",shift:"12 PM–8 PM",area:"Pool Parties",status:"Scheduled"},
    {name:"Grace Parker",shift:"12 PM–8 PM",area:"Recreation Pool",status:"Scheduled"}
  ]
};

var FACILITY_PROGRAM_DEFAULTS={
  gandy:{
    lessons:[
      {name:"Beginner Lessons",time:"9:00 AM",count:18},
      {name:"Intermediate Lessons",time:"10:30 AM",count:14}
    ],
    parties:[{name:"Birthday Party A",time:"1:00 PM",count:25}],
    team:[{name:"Swim Team Practice",time:"4:00 PM",lanes:5}],
    aquaticClass:[{name:"Aquatic Class",time:"11:30 AM",count:16}]
  },
  simpson:{
    lessons:[
      {name:"Beginner Lessons",time:"10:30 AM",count:12},
      {name:"Youth Lessons",time:"12:00 PM",count:10}
    ],
    parties:[{name:"Pool Party Reservation",time:"2:00 PM",count:20}],
    team:[],
    aquaticClass:[]
  }
};

function cloneFacilityData(value){return JSON.parse(JSON.stringify(value));}

function ensureFacilityOperationsState(){
  if(!state.staffByFacility){
    state.staffByFacility={
      gandy:cloneFacilityData(FACILITY_STAFF_DEFAULTS.gandy),
      simpson:cloneFacilityData(FACILITY_STAFF_DEFAULTS.simpson)
    };
    if(Array.isArray(state.staff)&&state.staff.length){
      state.staffByFacility.gandy=cloneFacilityData(state.staff);
    }
  }
  if(!state.programsByFacility){
    state.programsByFacility={
      gandy:cloneFacilityData(FACILITY_PROGRAM_DEFAULTS.gandy),
      simpson:cloneFacilityData(FACILITY_PROGRAM_DEFAULTS.simpson)
    };
    if(state.programs){
      state.programsByFacility.gandy=Object.assign(
        cloneFacilityData(FACILITY_PROGRAM_DEFAULTS.gandy),
        cloneFacilityData(state.programs)
      );
      if(!state.programsByFacility.gandy.aquaticClass){
        state.programsByFacility.gandy.aquaticClass=cloneFacilityData(FACILITY_PROGRAM_DEFAULTS.gandy.aquaticClass);
      }
    }
  }
  syncFacilityOperationsState();
}

function syncFacilityOperationsState(){
  if(!state.staffByFacility||!state.programsByFacility)return;
  state.staff=state.staffByFacility[activeFacilityId];
  state.programs=state.programsByFacility[activeFacilityId];
  if(!state.programs.aquaticClass)state.programs.aquaticClass=[];
}

function persistFacilityOperationsState(){
  if(state.staffByFacility)state.staffByFacility[activeFacilityId]=state.staff;
  if(state.programsByFacility)state.programsByFacility[activeFacilityId]=state.programs;
}

var activeFacilityId="gandy";
var reportHistoryData=[];

function activeFacility(){return FACILITY_PROFILES[activeFacilityId]||FACILITY_PROFILES.gandy}
function ensureExtendedState(){
  if(!state.facilityProfiles)state.facilityProfiles=JSON.parse(JSON.stringify(FACILITY_PROFILES));
  if(!state.activeFacilityId)state.activeFacilityId="gandy";
  activeFacilityId=state.activeFacilityId;
  if(!Array.isArray(state.reportHistory))state.reportHistory=[];
  reportHistoryData=state.reportHistory;
  if(!state.shiftNotes)state.shiftNotes={gandy:{text:"",reviewed:false},simpson:{text:"",reviewed:false}};
  if(typeof state.managerName!=="string")state.managerName="";
  ensureFacilityOperationsState();
}

function renderManagerIdentity(){
  var name=(state.managerName||"").trim();
  var hour=new Date().getHours();
  var greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  if(q("personalGreeting"))q("personalGreeting").textContent=greeting+(name?", "+name:"");
  if(q("personalNameLine"))q("personalNameLine").textContent=name
    ?"Your saved manager profile is active."
    :"Enter your name to personalize the shift workspace and reports.";
  if(q("managerNameInput"))q("managerNameInput").value=name;
  if(q("reportManager") && name && !q("reportManager").value.trim())q("reportManager").value=name;
}
function saveManagerIdentity(){
  var input=q("managerNameInput");
  if(!input)return;
  var name=input.value.trim();
  state.managerName=name;
  if(q("reportManager"))q("reportManager").value=name;
  state.audit.unshift(new Date().toLocaleString()+": Manager name "+(name?"saved as "+name:"cleared"));
  saveState(false);
  renderManagerIdentity();
  populateReportFields();
  showToast(name?"Manager name saved":"Manager name cleared");
}

function applyFacilityProfile(id,initial){
  if(!FACILITY_PROFILES[id])id="gandy";
  persistFacilityOperationsState();
  activeFacilityId=id;
  state.activeFacilityId=id;
  ensureFacilityOperationsState();
  syncFacilityOperationsState();
  var p=activeFacility();
  state.facility=p.name;
  state.demand.base=Number(p.baseDemand);
  if(!initial){
    state.audit.unshift(new Date().toLocaleString()+": Facility changed to "+p.name);
  }
  hydrateInputs();
  render();
  renderFacilityProfile();
  renderFacilityComparison();
  renderShiftWorkspace();
  renderManagerIdentity();
  populateReportFields();
  generateReport("Daily Operations Report");
  saveState(false);
}

var FACILITY_REFERENCE_DATA={
  gandy:{
    publishedConfiguration:"Heated 10-lane, 25-yard short-course pool with one-meter diving board and attached recreation pool",
    operatingPattern:"Year-round operations",
    programs:["Lap swim","Open swim","Swim lessons","Pool parties","Swim team","Aquatic Class"],
    maintenance:["Diving board inspection","Lane ropes and starting blocks","Heating equipment","Pump and filtration"],
    inventoryReason:"Higher year-round demand and broader program mix",
    comparisonNote:"Gandy requires broader daily coordination because it combines competition, recreation, programs, and year-round operations."
  },
  simpson:{
    publishedConfiguration:"Seasonal neighborhood aquatics facility associated with Simpson Park Community Center",
    operatingPattern:"Seasonal summer operations",
    programs:["Lap swim","Open swim","Seasonal programs","Special events"],
    maintenance:["Seasonal opening and closing","Pool liner and walls","Deck and access","Seasonal equipment"],
    inventoryReason:"Lower assumed demand and shorter operating season",
    comparisonNote:"Simpson requires stronger seasonal-readiness controls even when normal daily demand is lower."
  }
};

function facilityComparisonRows(){
  var g=FACILITY_PROFILES.gandy,s=FACILITY_PROFILES.simpson;
  return [
    ["Facility model",FACILITY_REFERENCE_DATA.gandy.publishedConfiguration,FACILITY_REFERENCE_DATA.simpson.publishedConfiguration,"Changes program complexity, surveillance zones, and maintenance needs."],
    ["Operating pattern",FACILITY_REFERENCE_DATA.gandy.operatingPattern,FACILITY_REFERENCE_DATA.simpson.operatingPattern,"Gandy requires continuous year-round planning; Simpson requires seasonal opening and closing readiness."],
    ["Base demand assumption",g.baseDemand+" patrons",s.baseDemand+" patrons","Higher assumed demand increases staffing, chemical use, inventory, and reporting volume."],
    ["Planning capacity",g.capacity+" people",s.capacity+" people","The lower of facility capacity and staffing-controlled capacity determines the operating limit."],
    ["Typical lifeguards",g.typicalGuards+" scheduled",s.typicalGuards+" scheduled","AquaIQ still applies active surveillance capacity and 30-minute relief coverage."],
    ["Program mix",FACILITY_REFERENCE_DATA.gandy.programs.join(", "),FACILITY_REFERENCE_DATA.simpson.programs.join(", "),"Programs change attendance peaks, lane availability, and staffing timing."],
    ["Maintenance focus",FACILITY_REFERENCE_DATA.gandy.maintenance.join(", "),FACILITY_REFERENCE_DATA.simpson.maintenance.join(", "),"Different facility assets create different preventive-maintenance priorities."],
    ["Inventory focus",FACILITY_REFERENCE_DATA.gandy.inventoryReason,FACILITY_REFERENCE_DATA.simpson.inventoryReason,"Par levels should reflect facility volume and operating season rather than use one standard level."]
  ];
}

function renderFacilityComparison(){
  var selected=activeFacilityId;
  var selectedProfile=activeFacility();
  var ids=["gandy","simpson"];

  if(q("comparisonSelectedFacility"))q("comparisonSelectedFacility").textContent=selectedProfile.name;
  if(q("comparisonSelectedFacilityNote"))q("comparisonSelectedFacilityNote").textContent=
    "The "+selectedProfile.name+" column, planning focus, and facility cards are synchronized with the main facility dropdown.";

  if(q("facilityCompareCards")){
    q("facilityCompareCards").innerHTML=ids.map(function(id){
      var p=FACILITY_PROFILES[id],r=FACILITY_REFERENCE_DATA[id];
      var isSelected=id===selected;
      return '<div class="facility-compare-card'+(isSelected?' selected':'')+'">'+
        '<div class="compare-head"><div><h3>'+p.name+'</h3><p class="small">'+r.operatingPattern+'</p></div>'+
        '<span class="tag '+(isSelected?'low':'info')+'">'+(isSelected?'Selected':'Compare')+'</span></div>'+
        '<div class="compare-metrics">'+
          '<div class="compare-metric"><span>Base demand</span><b>'+p.baseDemand+'</b></div>'+
          '<div class="compare-metric"><span>Planning capacity</span><b>'+p.capacity+'</b></div>'+
          '<div class="compare-metric"><span>Typical guards</span><b>'+p.typicalGuards+'</b></div>'+
          '<div class="compare-metric"><span>Program types</span><b>'+r.programs.length+'</b></div>'+
        '</div>'+
        '<div class="facility-difference">'+r.comparisonNote+'</div>'+
        '<ul class="compare-list">'+r.programs.map(function(x){return"<li>"+x+"</li>"}).join("")+'</ul>'+
        '<button class="btn secondary facility-select-card" type="button" data-facility-card="'+id+'" '+(isSelected?'disabled':'')+' style="margin-top:12px">'+
          (isSelected?'Currently Managing':'Switch to '+p.name)+
        '</button>'+
      '</div>';
    }).join("");

    q("facilityCompareCards").querySelectorAll("[data-facility-card]").forEach(function(btn){
      btn.addEventListener("click",function(){
        if(btn.disabled)return;
        applyFacilityProfile(btn.dataset.facilityCard,false);
        showToast(activeFacility().name+" is now the active facility");
      });
    });
  }

  if(q("facilityComparisonTable")){
    q("facilityComparisonTable").innerHTML=facilityComparisonRows().map(function(row){
      return "<tr><td><b>"+row[0]+"</b></td>"+
        '<td class="'+(selected==="gandy"?"selected-column":"")+'">'+row[1]+"</td>"+
        '<td class="'+(selected==="simpson"?"selected-column":"")+'">'+row[2]+"</td>"+
        "<td>"+row[3]+"</td></tr>";
    }).join("");
  }

  if(q("gandyCompareHeader"))q("gandyCompareHeader").classList.toggle("selected-column",selected==="gandy");
  if(q("simpsonCompareHeader"))q("simpsonCompareHeader").classList.toggle("selected-column",selected==="simpson");

  if(q("facilityDifferenceExplanation")){
    q("facilityDifferenceExplanation").innerHTML=
      '<div class="facility-difference'+(selected==="gandy"?' selected-planning-focus':'')+'"><b>Gandy:</b> '+FACILITY_REFERENCE_DATA.gandy.comparisonNote+'</div>'+
      '<div class="facility-difference'+(selected==="simpson"?' selected-planning-focus':'')+'"><b>Simpson:</b> '+FACILITY_REFERENCE_DATA.simpson.comparisonNote+'</div>';
  }

  if(q("facilityPlanningFocus")){
    var p=activeFacility(),r=FACILITY_REFERENCE_DATA[p.id];
    var focus=p.id==="gandy"
      ?["Peak-period staffing and lane allocation","Year-round chemical and equipment readiness","Swim-team and program coordination","Higher inventory par levels"]
      :["Seasonal opening and closing readiness","Pool liner, deck, and seasonal equipment inspection","Weather-sensitive attendance planning","Lower but carefully timed inventory par levels"];
    q("facilityPlanningFocus").innerHTML=
      '<div class="selected-planning-focus"><p><b>Currently managing: '+p.name+'</b></p>'+
      '<ul>'+focus.map(function(x){return"<li>"+x+"</li>"}).join("")+'</ul></div>'+
      '<div class="facility-sync-note">Changing the facility dropdown updates this focus, the highlighted comparison column, reports, schedule, capacity, and facility profile.</div>';
  }
}

function chooseRecommendedFacility(){
  var gScore=FACILITY_PROFILES.gandy.baseDemand+FACILITY_PROFILES.gandy.typicalGuards*10;
  var sScore=FACILITY_PROFILES.simpson.baseDemand+FACILITY_PROFILES.simpson.typicalGuards*10;
  var recommended=gScore>=sScore?"gandy":"simpson";
  applyFacilityProfile(recommended,false);
  renderFacilityComparison();
  showToast(FACILITY_PROFILES[recommended].name+" selected as the higher-demand planning facility");
}

function renderFacilityProfile(){
  var p=activeFacility();
  if(q("facilitySelect"))q("facilitySelect").value=p.id;
  if(q("facilityName"))q("facilityName").textContent=p.name;
  if(q("facilityDescription"))q("facilityDescription").textContent=p.description;
  if(q("facilityFacts")){
    q("facilityFacts").innerHTML=[
      ["Address",p.address],
      ["Phone",p.phone],
      ["Pool configuration",p.poolType],
      ["Operating pattern",p.seasonal],
      ["Published hours",p.operatingHours],
      ["Planning capacity",p.capacity+" people"]
    ].map(function(x){return '<div class="facility-fact"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>'}).join("");
  }
  if(q("facilityCapacityInput"))q("facilityCapacityInput").value=p.capacity;
  if(q("facilityBaseDemandInput"))q("facilityBaseDemandInput").value=p.baseDemand;
  if(q("facilityTypicalGuardsInput"))q("facilityTypicalGuardsInput").value=p.typicalGuards;
  if(q("reportFacilityBadge"))q("reportFacilityBadge").textContent=p.name;
  if(q("facilityRosterNote")){
    q("facilityRosterNote").innerHTML="<b>"+p.name+" lifeguard roster</b><br><span class='small'>Names, shifts, status changes, and manager edits are stored separately for this facility.</span>";
  }
  renderManagerIdentity();
}
function saveFacilityAssumptions(){
  var p=activeFacility();
  p.capacity=Number(q("facilityCapacityInput").value||p.capacity);
  p.baseDemand=Number(q("facilityBaseDemandInput").value||p.baseDemand);
  p.typicalGuards=Number(q("facilityTypicalGuardsInput").value||p.typicalGuards);
  state.demand.base=p.baseDemand;
  state.audit.unshift(new Date().toLocaleString()+": Facility assumptions updated for "+p.name);
  saveState(false);render();renderFacilityProfile();showToast("Facility profile saved");
}
function renderShiftWorkspace(){
  var p=activeFacility(),recs=recommendations();
  if(q("todaySchedule")){
    q("todaySchedule").innerHTML=p.schedule.map(function(s){return '<div class="shift-event"><b>'+s[0]+'</b><div>'+s[1]+'</div></div>'}).join("");
  }
  if(q("managerInbox")){
    var items=recs.slice(0,6);
    q("inboxCount").textContent=items.length;
    q("managerInbox").innerHTML=items.map(function(r){
      return '<div class="inbox-item"><span class="tag '+(r.p==="High"?"high":r.p==="Medium"?"med":"low")+'">'+r.p+'</span><div><b>'+r.t+'</b><div class="small">'+r.why+'</div></div><span class="small">Today</span></div>';
    }).join("");
  }
  var notes=state.shiftNotes[p.id]||{text:"",reviewed:false};
  if(q("shiftNotes"))q("shiftNotes").value=notes.text||"";
  if(q("handoffReviewed"))q("handoffReviewed").checked=!!notes.reviewed;
  if(q("handoffStatus"))q("handoffStatus").textContent=notes.text?(notes.reviewed?"Handoff reviewed.":"Saved; awaiting incoming-manager review."):"No shift notes saved.";
}
function saveShiftHandoff(){
  var p=activeFacility();
  state.shiftNotes[p.id]={text:q("shiftNotes").value.trim(),reviewed:q("handoffReviewed").checked,updatedAt:new Date().toISOString()};
  state.audit.unshift(new Date().toLocaleString()+": Shift notes updated for "+p.name);
  saveState(false);renderShiftWorkspace();showToast("Shift notes saved");
}
function reportFormData(){
  var p=activeFacility(),cap=capacityMetrics(),actual=Number(q("reportActualAttendance").value||0);
  return {
    id:"R"+Date.now(),
    facility:p.name,
    facilityId:p.id,
    date:q("reportDate").value||new Date().toISOString().slice(0,10),
    manager:q("reportManager").value.trim()||"Not entered",
    shift:q("reportShift").value,
    forecast:state.demand.adjusted,
    actual:actual||"",
    variance:actual?actual-state.demand.adjusted:"",
    readiness:healthScore(),
    temperature:state.weather.temp,
    rain:state.weather.rain,
    scheduledGuards:state.staff.filter(function(s){return s.status==="Scheduled"}).length,
    activeGuards:cap.activeSurveillance,
    reliefGuards:cap.requiredRelief,
    staffingCapacity:cap.staffingCapacity,
    operatingCapacity:cap.operatingCapacity,
    callouts:Number(q("reportCallouts").value||0),
    overtime:Number(q("reportOvertime").value||0),
    chlorine:state.water.chlorine,
    ph:state.water.ph,
    alkalinity:state.water.alk,
    waterStatus:waterStatus(),
    incidentType:q("reportIncidentType").value,
    incidentDetails:q("reportIncidentDetails").value.trim(),
    maintenanceCompleted:q("reportMaintenanceCompleted").value.trim(),
    maintenanceOutstanding:q("reportMaintenanceOutstanding").value.trim(),
    itemsOrdered:q("reportItemsOrdered").value.trim(),
    itemsLow:q("reportItemsLow").value.trim(),
    shiftSummary:q("reportShiftSummary").value.trim(),
    observations:q("reportObservations").value.trim(),
    followUp:q("reportFollowUp").value.trim(),
    reviewedBy:q("reportReviewedBy").value.trim(),
    generatedAt:new Date().toISOString()
  };
}
function populateReportFields(){
  var p=activeFacility();
  if(q("reportDate")&&!q("reportDate").value)q("reportDate").value=new Date().toISOString().slice(0,10);
  if(q("reportCallouts"))q("reportCallouts").value=state.callouts||0;
  if(q("reportMaintenanceOutstanding"))q("reportMaintenanceOutstanding").value=state.workOrders.filter(function(w){return w.status!=="Completed"}).map(function(w){return w.asset+": "+w.desc}).join("\n");
  if(q("reportItemsLow"))q("reportItemsLow").value=inventoryAlerts().map(function(i){return i.item+" ("+i.days+" days projected)"}).join("\n");
  if(q("reportFacilityBadge"))q("reportFacilityBadge").textContent=p.name;
}
function safeText(value){return value===undefined||value===null||value===""?"—":String(value)}
function buildEditableReportHTML(d){
  return '<div class="report-compact">'+
    '<div class="report-hero"><h3>Daily Operations Report</h3><p>'+d.facility+' • '+d.date+' • '+d.shift+' shift</p></div>'+
    '<div class="compact-kpis">'+
      '<div class="compact-kpi"><span>Readiness</span><b>'+d.readiness+'%</b></div>'+
      '<div class="compact-kpi"><span>Forecast</span><b>'+d.forecast+'</b></div>'+
      '<div class="compact-kpi"><span>Actual</span><b>'+safeText(d.actual)+'</b></div>'+
      '<div class="compact-kpi"><span>Staffing</span><b>'+d.activeGuards+'+'+d.reliefGuards+'</b></div>'+
    '</div>'+
    '<div class="compact-body">'+
      '<div class="compact-section"><h4>Report Information</h4><ul class="bullet-clean"><li>Manager: '+safeText(d.manager)+'</li><li>Weather: '+d.temperature+'°F, '+d.rain+'% rain</li><li>Operating capacity: '+d.operatingCapacity+'</li><li>Forecast variance: '+safeText(d.variance)+'</li></ul></div>'+
      '<div class="compact-section"><h4>Water Quality</h4><ul class="bullet-clean"><li>Status: '+d.waterStatus+'</li><li>Chlorine: '+d.chlorine+' ppm</li><li>pH: '+d.ph+'</li><li>Alkalinity: '+d.alkalinity+' ppm</li></ul></div>'+
      '<div class="compact-section"><h4>Staffing & Incident</h4><ul class="bullet-clean"><li>Scheduled guards: '+d.scheduledGuards+'</li><li>Active surveillance: '+d.activeGuards+'</li><li>Relief guards: '+d.reliefGuards+'</li><li>Call-outs: '+d.callouts+'</li><li>Overtime: '+d.overtime+' hours</li><li>Incident: '+d.incidentType+'</li></ul><p>'+safeText(d.incidentDetails)+'</p></div>'+
      '<div class="compact-section"><h4>Maintenance & Inventory</h4><p><b>Completed:</b> '+safeText(d.maintenanceCompleted)+'</p><p><b>Outstanding:</b> '+safeText(d.maintenanceOutstanding)+'</p><p><b>Ordered:</b> '+safeText(d.itemsOrdered)+'</p><p><b>Running low:</b> '+safeText(d.itemsLow)+'</p></div>'+
      '<div class="compact-section" style="grid-column:1/-1"><h4>Manager Summary</h4><p>'+safeText(d.shiftSummary)+'</p><p><b>Observations:</b> '+safeText(d.observations)+'</p><p><b>Follow-up:</b> '+safeText(d.followUp)+'</p><p><b>Reviewed by:</b> '+safeText(d.reviewedBy)+'</p></div>'+
    '</div></div>';
}
function updateReportPreview(){
  var d=reportFormData();
  if(q("reportVisual"))q("reportVisual").innerHTML=buildEditableReportHTML(d);
  if(q("reportBox"))q("reportBox").value=q("reportVisual").innerText;
  if(q("exportStatus"))q("exportStatus").textContent="Preview updated "+new Date().toLocaleTimeString();
}
function saveManagerReport(){
  var d=reportFormData();
  reportHistoryData.unshift(d);
  reportHistoryData=reportHistoryData.slice(0,25);
  state.reportHistory=reportHistoryData;
  saveState(false);renderReportHistory();updateReportPreview();showToast("Report saved");
}
function renderReportHistory(){
  if(!q("reportHistory"))return;
  if(!reportHistoryData.length){q("reportHistory").innerHTML='<p class="small">No reports saved yet.</p>';return}
  q("reportHistory").innerHTML=reportHistoryData.map(function(r,i){
    return '<div class="report-history-item"><div><b>'+r.facility+'</b><div class="small">'+r.date+' • '+r.shift+' • '+r.manager+'</div></div><button class="btn secondary" type="button" data-report-index="'+i+'">Open</button></div>';
  }).join("");
  q("reportHistory").querySelectorAll("[data-report-index]").forEach(function(btn){
    btn.addEventListener("click",function(){loadSavedReport(Number(btn.dataset.reportIndex))});
  });
}
function loadSavedReport(index){
  var d=reportHistoryData[index];if(!d)return;
  if(FACILITY_PROFILES[d.facilityId])applyFacilityProfile(d.facilityId,true);
  var map={
    reportManager:d.manager,reportShift:d.shift,reportDate:d.date,reportActualAttendance:d.actual,
    reportCallouts:d.callouts,reportOvertime:d.overtime,reportIncidentType:d.incidentType,
    reportIncidentDetails:d.incidentDetails,reportMaintenanceCompleted:d.maintenanceCompleted,
    reportMaintenanceOutstanding:d.maintenanceOutstanding,reportItemsOrdered:d.itemsOrdered,
    reportItemsLow:d.itemsLow,reportShiftSummary:d.shiftSummary,reportObservations:d.observations,
    reportFollowUp:d.followUp,reportReviewedBy:d.reviewedBy
  };
  Object.keys(map).forEach(function(id){if(q(id))q(id).value=map[id]||""});
  updateReportPreview();showToast("Saved report opened");
}
function filenameSafe(s){return String(s).replace(/[^a-z0-9_-]+/gi,"_")}
function downloadReportPDF(){
  var d=reportFormData();
  if(!window.jspdf||!window.jspdf.jsPDF){q("exportStatus").textContent="PDF library did not load. Use Print Report instead.";return}
  var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:"pt",format:"letter"});
  var y=48,left=48,width=516;
  function line(text,size,bold){
    doc.setFontSize(size||10);doc.setFont("helvetica",bold?"bold":"normal");
    var lines=doc.splitTextToSize(safeText(text),width);
    if(y+lines.length*(size||10)*1.3>735){doc.addPage();y=48}
    doc.text(lines,left,y);y+=lines.length*(size||10)*1.3+6;
  }
  line("AquaIQPro Daily Operations Report",18,true);
  line(d.facility+" | "+d.date+" | "+d.shift+" Shift",11,true);
  line("Manager: "+d.manager,10);
  y+=4;
  line("Operational Summary",12,true);
  line("Readiness: "+d.readiness+"% | Forecast: "+d.forecast+" | Actual: "+safeText(d.actual)+" | Operating Capacity: "+d.operatingCapacity,10);
  line("Staffing: "+d.activeGuards+" active surveillance + "+d.reliefGuards+" relief | Call-outs: "+d.callouts+" | Overtime: "+d.overtime+" hours",10);
  line("Weather: "+d.temperature+" F | Rain: "+d.rain+"%",10);
  line("Water Quality",12,true);
  line("Status: "+d.waterStatus+" | Chlorine: "+d.chlorine+" ppm | pH: "+d.ph+" | Alkalinity: "+d.alkalinity+" ppm",10);
  line("Incident",12,true);line(d.incidentType+": "+safeText(d.incidentDetails),10);
  line("Maintenance",12,true);line("Completed: "+safeText(d.maintenanceCompleted),10);line("Outstanding: "+safeText(d.maintenanceOutstanding),10);
  line("Inventory",12,true);line("Items ordered: "+safeText(d.itemsOrdered),10);line("Items running low: "+safeText(d.itemsLow),10);
  line("Manager Summary",12,true);line(d.shiftSummary,10);line("Observations: "+safeText(d.observations),10);line("Follow-up: "+safeText(d.followUp),10);
  line("Reviewed by: "+safeText(d.reviewedBy),10);
  doc.save(filenameSafe(d.facility+"_"+d.date+"_"+d.shift+"_Operations_Report")+".pdf");
  q("exportStatus").textContent="PDF downloaded.";
}
function downloadReportExcel(){
  var d=reportFormData();
  if(!window.XLSX){q("exportStatus").textContent="Excel library did not load.";return}
  var wb=XLSX.utils.book_new();
  var summary=[
    ["AquaIQPro Daily Operations Report",""],
    ["Facility",d.facility],["Date",d.date],["Shift",d.shift],["Manager",d.manager],
    ["Readiness",d.readiness+"%"],["Forecast Attendance",d.forecast],["Actual Attendance",d.actual],
    ["Forecast Variance",d.variance],["Temperature",d.temperature],["Rain Probability",d.rain+"%"],
    ["Operating Capacity",d.operatingCapacity]
  ];
  var staffing=[["Field","Value"],["Scheduled Guards",d.scheduledGuards],["Active Surveillance Guards",d.activeGuards],["Relief Guards",d.reliefGuards],["Staffing Capacity",d.staffingCapacity],["Call-outs",d.callouts],["Overtime Hours",d.overtime]];
  var water=[["Test","Reading","Target / Status"],["Free Chlorine",d.chlorine,"1.0–4.0 ppm"],["pH",d.ph,"7.2–7.8"],["Alkalinity",d.alkalinity,"80–120 ppm"],["Overall Status",d.waterStatus,""]];
  var operations=[["Category","Details"],["Incident Type",d.incidentType],["Incident Details",d.incidentDetails],["Maintenance Completed",d.maintenanceCompleted],["Maintenance Outstanding",d.maintenanceOutstanding],["Items Ordered",d.itemsOrdered],["Items Running Low",d.itemsLow]];
  var notes=[["Field","Entry"],["Shift Summary",d.shiftSummary],["Observations",d.observations],["Follow-up Required",d.followUp],["Reviewed By",d.reviewedBy]];
  [["Daily Summary",summary],["Staffing",staffing],["Water Quality",water],["Operations",operations],["Manager Notes",notes]].forEach(function(pair){
    var ws=XLSX.utils.aoa_to_sheet(pair[1]);ws["!cols"]=[{wch:28},{wch:60},{wch:24}];XLSX.utils.book_append_sheet(wb,ws,pair[0]);
  });
  XLSX.writeFile(wb,filenameSafe(d.facility+"_"+d.date+"_"+d.shift+"_Operations_Report")+".xlsx",{compression:true});
  q("exportStatus").textContent="Excel workbook downloaded.";
}
function printManagerReport(){updateReportPreview();window.print()}

function init(){loadState();ensureExtendedState();hydrateInputs();document.querySelectorAll("#nav button").forEach(btn=>btn.addEventListener("click",function(){document.querySelectorAll("#nav button").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));btn.classList.add("active");var page=q(btn.dataset.page);if(page)page.classList.add("active");if(q("pageTitle"))q("pageTitle").textContent=btn.textContent}));

var refreshWeatherButton=q("refreshWeatherButton");if(refreshWeatherButton)refreshWeatherButton.addEventListener("click",function(){loadLiveWeather(true)});
var refreshWeatherPageButton=q("refreshWeatherPageButton");if(refreshWeatherPageButton)refreshWeatherPageButton.addEventListener("click",function(){loadLiveWeather(true)});

var facilitySelect=q("facilitySelect");if(facilitySelect)facilitySelect.addEventListener("change",function(){applyFacilityProfile(facilitySelect.value,false);showToast(activeFacility().name+" selected")});
var saveManagerNameButton=q("saveManagerNameButton");if(saveManagerNameButton)saveManagerNameButton.addEventListener("click",saveManagerIdentity);
var managerNameInput=q("managerNameInput");if(managerNameInput)managerNameInput.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();saveManagerIdentity()}});
var returnToSelectedFacilityButton=q("returnToSelectedFacilityButton");if(returnToSelectedFacilityButton)returnToSelectedFacilityButton.addEventListener("click",function(){showPage("dashboard")});
var recommendedFacilityButton=q("useRecommendedFacilityButton");if(recommendedFacilityButton)recommendedFacilityButton.addEventListener("click",chooseRecommendedFacility);
var saveFacility=q("saveFacilityProfile");if(saveFacility)saveFacility.addEventListener("click",saveFacilityAssumptions);

var saveNotes=q("saveShiftNotes");if(saveNotes)saveNotes.addEventListener("click",saveShiftHandoff);
var previewBtn=q("previewReportButton");if(previewBtn)previewBtn.addEventListener("click",updateReportPreview);
var saveReportBtn=q("saveReportButton");if(saveReportBtn)saveReportBtn.addEventListener("click",saveManagerReport);
var pdfBtn=q("downloadPdfButton");if(pdfBtn)pdfBtn.addEventListener("click",downloadReportPDF);
var excelBtn=q("downloadExcelButton");if(excelBtn)excelBtn.addEventListener("click",downloadReportExcel);
var printBtn=q("printReportButton");if(printBtn)printBtn.addEventListener("click",printManagerReport);

var fab=document.querySelector(".chat-fab");if(fab)fab.addEventListener("click",function(e){e.preventDefault();toggleChat()});var begin=q("beginDayButton");if(begin)begin.addEventListener("click",beginDayReview);applyFacilityProfile(state.activeFacilityId||"gandy",true);renderCapacity();renderFacilityProfile();renderFacilityComparison();renderShiftWorkspace();renderManagerIdentity();renderShiftOperationsCenter();bindShiftQuickActions();populateReportFields();renderReportHistory();updateReportPreview();runScenario();loadLiveWeather(false);weatherRefreshTimer=setInterval(function(){loadLiveWeather(false)},WEATHER_REFRESH_MS)}init();