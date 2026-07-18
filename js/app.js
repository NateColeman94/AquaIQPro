console.info("AquaIQPro v5.7.3 Dashboard & UX Polish loaded");
var state={facility:"Gandy Pool Demo",weather:{temp:94,rain:18},demand:{base:230,adjusted:0},water:{chlorine:2.1,ph:7.4,alk:95},callouts:1,staff:[{name:"Alex",shift:"6 AM–2 PM",area:"Lap Pool",status:"Scheduled"},{name:"Brianna",shift:"8 AM–4 PM",area:"Recreation Pool",status:"Scheduled"},{name:"Carlos",shift:"10 AM–6 PM",area:"Deck Supervisor",status:"Scheduled"},{name:"Dana",shift:"11 AM–5 PM",area:"Lessons",status:"Scheduled"},{name:"Eli",shift:"12 PM–6 PM",area:"Recreation Pool",status:"Scheduled"}],programs:{lessons:[{name:"Beginner Lessons",time:"9:00 AM",count:18},{name:"Intermediate Lessons",time:"10:30 AM",count:14}],parties:[{name:"Birthday Party A",time:"1:00 PM",count:25}],team:[{name:"Swim Team Practice",time:"4:00 PM",lanes:5}]},inventory:[{item:"Liquid Chlorine",onHand:42,min:25,unit:"gal",dailyUse:4.5},{item:"Muriatic Acid",onHand:9,min:10,unit:"gal",dailyUse:1.2},{item:"Test Reagents",onHand:6,min:4,unit:"kits",dailyUse:.35},{item:"Rescue Tubes",onHand:11,min:8,unit:"units",dailyUse:.03}],workOrders:[{asset:"Main Pump",priority:"Medium",status:"Open",desc:"Routine vibration check before weekend peak."},{asset:"Diving Board",priority:"High",status:"Open",desc:"Pre-opening safety inspection required."}],tasks:[{name:"Opening water test",priority:"High",owner:"Pool Manager",done:false},{name:"Confirm lifeguard coverage",priority:"High",owner:"Lifeguard Supervisor",done:false},{name:"Inspect deck and rescue equipment",priority:"Medium",owner:"Lifeguard Supervisor",done:false}],incidents:[],decisions:{},audit:["System initialized with v3.0 master build."]};
var DEFAULT_STATE_JSON=JSON.stringify(state), STORAGE_KEY="AquaIQProV563Stable", days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], forecastWeather=[{t:92,r:15},{t:94,r:18},{t:91,r:34},{t:88,r:55},{t:93,r:20},{t:96,r:12},{t:95,r:25}];
function q(id){return document.getElementById(id)}function tag(level){var cls=level==="High"?"high":level==="Medium"?"med":level==="Low"?"low":"info";return '<span class="tag '+cls+'">'+level+'</span>'}
function programDemand(){normalizeRuntimeStateV563();return state.programs.lessons.reduce((s,x)=>s+x.count,0)*.35+state.programs.parties.reduce((s,x)=>s+x.count,0)*.8+state.programs.team.reduce((s,x)=>s+x.lanes,0)*7+(state.programs.aquaticClass||[]).reduce((s,x)=>s+x.count,0)*.4}
function demandFor(temp,rain){var d=state.demand.base;if(temp>=92)d*=1.28;else if(temp>=86)d*=1.14;if(rain>=60)d*=.58;else if(rain>=35)d*=.78;else if(rain<=20)d*=1.08;return Math.round(d+programDemand())}
function calcDemand(){state.demand.adjusted=demandFor(state.weather.temp,state.weather.rain)}function staffAvailable(){normalizeRuntimeStateV563();return state.staff.filter(s=>s.status==="Scheduled").length-state.callouts}function staffNeeded(d){d=d||state.demand.adjusted;return Math.max(4,Math.ceil(d/55)+state.programs.parties.length+Math.ceil(state.programs.lessons.length/2))}function waterStatus(){var c=state.water.chlorine,p=state.water.ph;if(c<1||c>4||p<7.2||p>7.8)return"Action";if(c<1.5||c>3.5||p<7.3||p>7.7)return"Watch";return"Good"}function inventoryCalculated(){normalizeRuntimeStateV563();return state.inventory.map(i=>Object.assign({},i,{days:Math.round(i.onHand/(i.dailyUse*(state.demand.adjusted/250)))}))}function inventoryAlerts(){return inventoryCalculated().filter(i=>i.onHand<=i.min||i.days<=7)}function highOpenWorkOrders(){return state.workOrders.filter(w=>w.priority==="High"&&w.status!=="Completed")}function incompleteHighTasks(){return state.tasks.filter(t=>!t.done&&t.priority==="High")}
function healthScore(){var score=100;if(waterStatus()==="Watch")score-=8;if(waterStatus()==="Action")score-=22;var gap=staffNeeded()-staffAvailable();if(gap>0)score-=gap*10;if(state.weather.rain>50)score-=7;score-=inventoryAlerts().length*6;score-=state.incidents.length*3;score-=highOpenWorkOrders().length*7;score-=incompleteHighTasks().length*4;return Math.max(45,Math.min(100,score))}
function recommendations(){var rec=[],gap=staffNeeded()-staffAvailable();if(gap>0)rec.push({id:"staff-gap",p:"High",t:"Schedule "+gap+" additional lifeguard(s) for peak demand.",why:"Forecast attendance and program load exceed available coverage."});if(waterStatus()==="Action")rec.push({id:"water-action",p:"High",t:"Correct water chemistry before peak swim periods and document retest.",why:"Current chlorine or pH is outside configured range."});if(waterStatus()==="Watch")rec.push({id:"water-watch",p:"Medium",t:"Increase water chemistry testing frequency during afternoon peak.",why:"Readings are near the edge of target range."});if(state.weather.temp>=92&&state.weather.rain<30)rec.push({id:"heat-demand",p:"Medium",t:"Prepare for high open-swim demand with hydration, shade, and extra deck coverage.",why:"High temperature and low rain probability increase demand."});inventoryAlerts().forEach(i=>rec.push({id:"buy-"+i.item,p:i.onHand<=i.min?"High":"Medium",t:"Purchase "+i.item+"; projected supply is "+i.days+" day(s).",why:"Inventory is below minimum or projected below safety stock."}));highOpenWorkOrders().forEach(w=>rec.push({id:"wo-"+w.asset,p:"High",t:"Prioritize "+w.asset+" work order before peak operations.",why:w.desc}));if(incompleteHighTasks().length)rec.push({id:"tasks-high",p:"High",t:"Complete "+incompleteHighTasks().length+" high-priority daily task(s).",why:"Incomplete high-priority tasks reduce readiness."});if(state.programs.team.reduce((s,x)=>s+x.lanes,0)>=5)rec.push({id:"lane-pressure",p:"Medium",t:"Manage swim team lane capacity pressure and update public lane messaging.",why:"Swim team reserved five or more lanes."});if(!rec.length)rec.push({id:"normal",p:"Low",t:"No critical issues. Continue routine monitoring.",why:"All major indicators are within configured limits."});return rec}
function showToast(msg){var t=q("toast");if(!t)return;t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1700)}function updateSaveIndicator(msg){var el=q("saveIndicator");if(el)el.textContent=msg||("Last saved: "+new Date().toLocaleTimeString())}function saveState(show){persistCompleteFacilityState();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));updateSaveIndicator();if(show)showToast("AquaIQPro data saved")}catch(e){showToast("Save failed")}}function loadState(){
  try{
    var saved=localStorage.getItem(STORAGE_KEY);
    if(saved){
      var parsed=JSON.parse(saved);
      if(parsed&&parsed.runtimeSchemaVersion==="5.6.3")state=parsed;
    }else{
      var legacy=localStorage.getItem("AquaIQProV3Master");
      if(legacy){
        try{
          var prior=JSON.parse(legacy);
          if(prior&&typeof prior.managerName==="string")state.managerName=prior.managerName;
        }catch(ignoreLegacy){}
      }
    }
  }catch(e){
    console.warn("Saved data could not be loaded; using stable defaults.",e);
  }
}function exportData(){saveState(false);var payload=JSON.stringify({exportedAt:new Date().toISOString(),app:"AquaIQPro",version:"v5.7.3 Dashboard & UX Polish",state:state},null,2),blob=new Blob([payload],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="AquaIQPro_Backup_"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Backup exported")}function importData(event){var file=event.target.files&&event.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var parsed=JSON.parse(e.target.result),imported=parsed.state||parsed;if(!imported.facility)throw new Error("Invalid file");state=imported;ensureExtendedState();saveState(false);hydrateInputs();render();renderCapacity();if(typeof renderWorkforce==="function")renderWorkforce();showToast("Backup imported")}catch(err){showToast("Import failed")}};reader.readAsText(file)}function resetDemoData(){if(!confirm("Reset AquaIQPro to default demo data?"))return;state=JSON.parse(DEFAULT_STATE_JSON);localStorage.removeItem(STORAGE_KEY);ensureExtendedState();hydrateInputs();render();renderCapacity();if(typeof renderWorkforce==="function")renderWorkforce();showToast("Demo data reset");updateSaveIndicator("Autosave ready")}
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


var DEFAULT_ROTATION_POSITIONS={gandy:["Lap Pool Chair 1","Lap Pool Chair 2","Recreation Pool","Lessons / Programs","Relief / Roaming","Break"],simpson:["Main Pool Chair 1","Main Pool Chair 2","Shallow Area","Lessons / Parties","Relief / Roaming","Break"]};
function ensureRotationState(){if(!state.rotationByFacility)state.rotationByFacility={gandy:{positions:cloneFacilityData(DEFAULT_ROTATION_POSITIONS.gandy),startHour:8,blockCount:8,notes:"",schedule:[]},simpson:{positions:cloneFacilityData(DEFAULT_ROTATION_POSITIONS.simpson),startHour:10,blockCount:8,notes:"",schedule:[]}};["gandy","simpson"].forEach(function(id){if(!state.rotationByFacility[id])state.rotationByFacility[id]={positions:cloneFacilityData(DEFAULT_ROTATION_POSITIONS[id]),startHour:id==="gandy"?8:10,blockCount:8,notes:"",schedule:[]}})}
function activeRotationState(){ensureRotationState();return state.rotationByFacility[activeFacilityId]}
function rotationAvailableGuards(){return state.staff.filter(function(g){var s=(g.status||"Scheduled").toLowerCase();return s!=="called out"&&s!=="unavailable"&&s!=="absent"})}
function rotationTimeLabel(startHour,index){var total=startHour*60+index*30,h=Math.floor(total/60)%24,m=total%60,s=h>=12?"PM":"AM";return (h%12||12)+":"+(m===0?"00":"30")+" "+s}
function generateRotationSchedule(save){
  var r=activeRotationState(),guards=rotationAvailableGuards(),positions=r.positions.slice(),schedule=[];
  for(var p=0;p<positions.length;p++){
    var row=[];
    for(var b=0;b<r.blockCount;b++){
      var lower=positions[p].toLowerCase(),type=lower.indexOf("break")>=0?"break":lower.indexOf("relief")>=0||lower.indexOf("roaming")>=0?"relief":"active";
      if(!guards.length){row.push({name:"Unfilled",type:"unavailable",detail:"No guard available"});continue;}
      var guardIndex=(p+b)%guards.length;
      var guard=guards[guardIndex];
      row.push({name:guard.name,type:type,detail:type==="break"?"Scheduled recovery":type==="relief"?"Relief and deck checks":"30-minute assignment"});
    }
    schedule.push(row);
  }
  r.schedule=schedule;
  r.published=false;
  r.publishedAt="";
  if(save!==false)saveState(false);
  renderRotationBoard();
}
function rotationConflictSummary(r){
  var conflicts=[];
  for(var b=0;b<r.blockCount;b++){
    var used={};
    r.positions.forEach(function(position,p){
      var a=r.schedule[p]&&r.schedule[p][b];
      if(!a||a.name==="Unfilled")return;
      var type=a.type||"active";
      if(type==="break"||type==="relief"||type==="active"){
        if(used[a.name])conflicts.push(rotationTimeLabel(r.startHour,b)+": "+a.name+" assigned to both "+used[a.name]+" and "+position);
        else used[a.name]=position;
      }
    });
  }
  return conflicts;
}
function setRotationAssignment(positionIndex,blockIndex,name){
  var r=activeRotationState(),position=r.positions[positionIndex]||"Position",lower=position.toLowerCase();
  var type=name==="Unfilled"?"unavailable":lower.indexOf("break")>=0?"break":lower.indexOf("relief")>=0||lower.indexOf("roaming")>=0?"relief":"active";
  if(!r.schedule[positionIndex])r.schedule[positionIndex]=[];
  r.schedule[positionIndex][blockIndex]={name:name,type:type,detail:type==="break"?"Scheduled recovery":type==="relief"?"Relief and deck checks":type==="unavailable"?"Coverage gap":"Manual assignment"};
  r.published=false;r.publishedAt="";saveState(false);renderRotationBoard();
}
function renderRotationBoard(){
  recoverGandyRosterV562();ensureRotationState();
  var r=activeRotationState(),guards=rotationAvailableGuards(),positions=r.positions,blocks=r.blockCount;
  if(typeof r.published!=="boolean")r.published=false;
  if(q("rotationFacilityContext"))q("rotationFacilityContext").textContent="Showing rotations for "+activeFacility().name;
  if(q("rotationStartTime"))q("rotationStartTime").value=String(r.startHour);
  if(q("rotationBlockCount"))q("rotationBlockCount").value=String(r.blockCount);
  if(q("rotationNotes"))q("rotationNotes").value=r.notes||"";
  if(q("rotationGuardCount"))q("rotationGuardCount").textContent=guards.length;
  if(q("rotationPositionCount"))q("rotationPositionCount").textContent=positions.filter(function(x){return x.toLowerCase().indexOf("break")<0}).length;
  var required=positions.filter(function(x){var l=x.toLowerCase();return l.indexOf("break")<0&&l.indexOf("relief")<0&&l.indexOf("roaming")<0}).length;
  if(!r.schedule.length||r.schedule.length!==positions.length){generateRotationSchedule(false);return;}
  var conflicts=rotationConflictSummary(r),hasUnfilled=r.schedule.some(function(row){return row.some(function(a){return !a||a.name==="Unfilled"})}),ok=guards.length>=required+1&&!conflicts.length&&!hasUnfilled;
  if(q("rotationCoverageStatus"))q("rotationCoverageStatus").textContent=ok?"Ready":"Gap";
  if(q("rotationCoverageNote"))q("rotationCoverageNote").textContent=conflicts.length?conflicts.length+" assignment conflict(s)":hasUnfilled?"Unfilled assignment detected":ok?"Relief coverage available":"Additional coverage needed";
  if(q("rotationAlertTitle"))q("rotationAlertTitle").textContent=ok?"Rotation coverage is ready":"Rotation coverage needs attention";
  if(q("rotationAlertText"))q("rotationAlertText").textContent=conflicts.length?conflicts[0]+(conflicts.length>1?" (and "+(conflicts.length-1)+" more)":""):hasUnfilled?"One or more rotation blocks are unfilled. Assign an available lifeguard before publishing.":ok?guards.length+" available guards cover "+required+" active positions with relief capacity.":guards.length+" available guards cannot safely cover "+required+" active positions plus relief.";
  if(q("rotationAlertBadge")){q("rotationAlertBadge").textContent=ok?"Ready":"Action";q("rotationAlertBadge").className="tag "+(ok?"low":"high")}
  if(q("rotationPublishStatus"))q("rotationPublishStatus").textContent=r.published?("Published "+new Date(r.publishedAt).toLocaleString()):"Draft schedule";
  if(q("rotationBoard")){
    var names=guards.map(function(g){return g.name});
    var h='<div class="rotation-grid" style="grid-template-columns:180px repeat('+blocks+',minmax(140px,1fr))"><div class="rotation-cell header position">Position</div>';
    for(var b=0;b<blocks;b++)h+='<div class="rotation-cell header">'+rotationTimeLabel(r.startHour,b)+'</div>';
    positions.forEach(function(position,p){
      h+='<div class="rotation-cell position">'+position+'</div>';
      for(var b=0;b<blocks;b++){
        var a=r.schedule[p][b]||{name:"Unfilled",type:"unavailable",detail:"Coverage gap"};
        h+='<div class="rotation-cell"><div class="rotation-assignment '+a.type+'"><select class="rotation-assignment-select" data-rotation-position-index="'+p+'" data-rotation-block-index="'+b+'"><option value="Unfilled"'+(a.name==="Unfilled"?' selected':'')+'>Unfilled</option>'+names.map(function(name){return '<option value="'+name.replace(/"/g,'&quot;')+'"'+(a.name===name?' selected':'')+'>'+name+'</option>'}).join('')+'</select><span>'+a.detail+'</span></div></div>';
      }
    });
    h+='</div>';q("rotationBoard").innerHTML=h;
    q("rotationBoard").querySelectorAll(".rotation-assignment-select").forEach(function(select){select.addEventListener("change",function(){setRotationAssignment(Number(select.dataset.rotationPositionIndex),Number(select.dataset.rotationBlockIndex),select.value)})});
  }
  if(q("rotationPositionsEditor")){
    q("rotationPositionsEditor").innerHTML=positions.map(function(position,index){return '<div class="rotation-position-row"><input data-rotation-position="'+index+'" value="'+position.replace(/"/g,'&quot;')+'"><button type="button" class="btn secondary" data-remove-rotation-position="'+index+'">Remove</button></div>'}).join("");
    q("rotationPositionsEditor").querySelectorAll("[data-rotation-position]").forEach(function(input){input.addEventListener("change",function(){r.positions[Number(input.dataset.rotationPosition)]=input.value.trim()||"Unnamed Position";r.schedule=[];generateRotationSchedule()})});
    q("rotationPositionsEditor").querySelectorAll("[data-remove-rotation-position]").forEach(function(button){button.addEventListener("click",function(){r.positions.splice(Number(button.dataset.removeRotationPosition),1);r.schedule=[];generateRotationSchedule()})})
  }
}
function bindRotationBoard(){
  var g=q("generateRotationButton");if(g&&!g.dataset.bound){g.dataset.bound="1";g.addEventListener("click",function(){var r=activeRotationState();r.startHour=Number(q("rotationStartTime").value);r.blockCount=Number(q("rotationBlockCount").value);r.schedule=[];generateRotationSchedule();showToast("30-minute rotation schedule generated")})}
  var a=q("addRotationPositionButton");if(a&&!a.dataset.bound){a.dataset.bound="1";a.addEventListener("click",function(){var r=activeRotationState();r.positions.push("New Position");r.schedule=[];generateRotationSchedule()})}
  var s=q("saveRotationNotesButton");if(s&&!s.dataset.bound){s.dataset.bound="1";s.addEventListener("click",function(){var r=activeRotationState();r.notes=q("rotationNotes").value.trim();saveState(false);if(q("rotationNotesStatus"))q("rotationNotesStatus").textContent="Rotation notes saved for "+activeFacility().name+".";showToast("Rotation notes saved")})}
  var p=q("publishRotationButton");if(p&&!p.dataset.bound){p.dataset.bound="1";p.addEventListener("click",function(){var r=activeRotationState(),conflicts=rotationConflictSummary(r),hasUnfilled=r.schedule.some(function(row){return row.some(function(a){return !a||a.name==="Unfilled"})});if(conflicts.length||hasUnfilled){showToast("Resolve rotation gaps before publishing");return;}r.published=true;r.publishedAt=new Date().toISOString();saveState(false);renderRotationBoard();showToast("Rotation schedule published")})}
  var reset=q("resetRotationButton");if(reset&&!reset.dataset.bound){reset.dataset.bound="1";reset.addEventListener("click",function(){var r=activeRotationState();r.schedule=[];generateRotationSchedule();showToast("Automatic assignments restored")})}
}

function render(){syncCompleteFacilityState();ensureRotationState();calcDemand();var score=healthScore(),needed=staffNeeded(),avail=staffAvailable(),ws=waterStatus(),recs=recommendations();q("healthMetric").textContent=score+"%";q("healthTrend").textContent=score>=90?"Strong operating posture":score>=75?"Manageable with attention":"Needs manager action";q("healthBar").style.width=score+"%";q("demandMetric").textContent=state.demand.adjusted;q("demandTrend").textContent="Base "+state.demand.base+", adjusted for weather and programs.";q("staffMetric").textContent=avail+"/"+needed;q("staffTrend").textContent=avail>=needed?"Coverage meets forecast need":"Coverage gap detected";q("waterMetric").textContent=ws;q("waterTrend").textContent="Chlorine "+state.water.chlorine+" ppm, pH "+state.water.ph;q("aiSummary").innerHTML="<p><b>Today's outlook:</b> "+(score>=85?"Ready with routine monitoring.":"Manager attention recommended.")+"</p><p>Forecast demand is <b>"+state.demand.adjusted+"</b>. Recommended lifeguards: <b>"+needed+"</b>.</p><p><b>Explainability:</b> weather, programs, staffing, water, inventory, maintenance, tasks, and incidents feed the score.</p>";q("priorityActions").innerHTML=recs.map(r=>"<p>"+tag(r.p)+" "+r.t+"<br><span class='small'>Why: "+r.why+"</span></p>").join("");q("programLoad").innerHTML="<p>Lessons: <b>"+state.programs.lessons.length+"</b></p><p>Pool parties: <b>"+state.programs.parties.length+"</b></p>"+(activeFacilityId==="gandy"?"<p>Swim team reserved lanes: <b>"+state.programs.team.reduce((s,x)=>s+x.lanes,0)+"</b></p><p>Aquatic Class blocks: <b>"+(state.programs.aquaticClass||[]).length+"</b></p>":"<p>Facility program model: <b>Lessons and pool parties</b></p>");q("inventoryRisk").innerHTML=inventoryAlerts().length?inventoryAlerts().map(i=>"<p>"+tag("High")+" "+i.item+": "+i.days+" days left</p>").join(""):"<p>"+tag("Low")+" No urgent purchase alerts.</p>";q("decisionStatus").innerHTML="<p>Approved: <b>"+Object.values(state.decisions).filter(x=>x==="Approved").length+"</b></p><p>Deferred: <b>"+Object.values(state.decisions).filter(x=>x==="Deferred").length+"</b></p><p>Overridden: <b>"+Object.values(state.decisions).filter(x=>x==="Overridden").length+"</b></p>";safeModuleRender("operations",renderOperations);
safeModuleRender("forecast",renderForecast);
safeModuleRender("water",renderWater);
safeModuleRender("staffing",renderStaff);
safeModuleRender("programs",renderPrograms);
safeModuleRender("inventory",renderInventory);
safeModuleRender("maintenance",renderMaintenance);
safeModuleRender("tasks",renderTasks);
safeModuleRender("decisions",renderDecisions);
safeModuleRender("data",renderDataSummary);
safeModuleRender("assistant",renderAIOps);
safeModuleRender("dashboard",renderOperationsHome);
safeModuleRender("operations",renderShiftOperationsCenter);
safeModuleRender("dashboard",renderDashboardIntelligence);
safeModuleRender("capacity",renderCapacity);
}
function renderDashboardIntelligence(){
  var alerts=[],available=staffAvailable(),needed=staffNeeded(),ws=waterStatus();
  var inv=inventoryAlerts(),openWork=state.workOrders.filter(function(w){return w.status!=="Completed"});
  var highWork=openWork.filter(function(w){return w.priority==="High"});
  var openIncidents=Array.isArray(state.incidents)?state.incidents.length:0;
  var workforce=(state.workforceByFacility&&state.workforceByFacility[activeFacilityId])||{requests:[],certifications:[]};
  var pendingRequests=(workforce.requests||[]).filter(function(r){return r.status==="Pending"}).length;
  var today=new Date();today.setHours(0,0,0,0);
  var expiring=(workforce.certifications||[]).filter(function(c){var d=new Date(c.expires+"T00:00:00");return d>=today&&((d-today)/86400000)<=30}).length;
  var expired=(workforce.certifications||[]).filter(function(c){return new Date(c.expires+"T00:00:00")<today}).length;

  if(available<needed)alerts.push({severity:"high",title:"Staffing below forecast need",note:available+" available / "+needed+" needed",page:"staffing",label:"Review"});
  if(ws!=="Good")alerts.push({severity:ws==="Unsafe"?"high":"med",title:"Water chemistry requires review",note:"Chlorine "+state.water.chlorine+" ppm • pH "+state.water.ph,page:"water",label:"Review"});
  inv.forEach(function(i){alerts.push({severity:i.days<=2?"high":"med",title:i.item+" is running low",note:i.days+" days remaining",page:"inventory",label:"Review"})});
  if(highWork.length)alerts.push({severity:"high",title:highWork.length+" high-priority maintenance item"+(highWork.length===1?"":"s"),note:"Immediate manager review recommended",page:"maintenance",label:"Open"});
  else if(openWork.length)alerts.push({severity:"med",title:openWork.length+" open maintenance item"+(openWork.length===1?"":"s"),note:"Review before shift close",page:"maintenance",label:"Open"});
  if(openIncidents)alerts.push({severity:"high",title:openIncidents+" active incident note"+(openIncidents===1?"":"s"),note:"Confirm follow-up and documentation",page:"incidentcenter",label:"Open"});
  if(expired)alerts.push({severity:"high",title:expired+" expired staff credential"+(expired===1?"":"s"),note:"Manager action required",page:"staffing",label:"Review"});
  if(pendingRequests)alerts.push({severity:"med",title:pendingRequests+" pending staff request"+(pendingRequests===1?"":"s"),note:"Awaiting manager review",page:"staffing",label:"Review"});
  if(!alerts.length)alerts.push({severity:"low",title:"No critical alerts",note:"Continue routine monitoring",page:"dashboard",label:"Ready"});

  var alertEl=q("dashboardCriticalAlerts");
  if(alertEl){
    alertEl.innerHTML=alerts.slice(0,6).map(function(a){return '<div class="dashboard-alert-item"><span class="dashboard-alert-dot '+a.severity+'"></span><div><b>'+a.title+'</b><div class="small">'+a.note+'</div></div><button class="dashboard-alert-link" type="button" data-dashboard-page="'+a.page+'">'+a.label+'</button></div>'}).join("");
    alertEl.querySelectorAll("[data-dashboard-page]").forEach(function(btn){btn.addEventListener("click",function(){showPage(btn.dataset.dashboardPage)})});
  }
  if(q("dashboardAlertCount")){
    var actionable=alerts.filter(function(a){return a.severity!=="low"}).length;
    q("dashboardAlertCount").textContent=actionable;
    q("dashboardAlertCount").className="tag "+(alerts.some(function(a){return a.severity==="high"})?"high":actionable?"med":"low");
  }

  var tasks=Array.isArray(state.tasks)?state.tasks:[];
  var incompleteTasks=tasks.filter(function(t){return !t.done&&t.status!=="Completed"}).length;
  var completedTasks=tasks.length-incompleteTasks;
  var operations=[
    {title:"Chemical checks",value:ws==="Good"?"On target":"Review",note:ws==="Good"?"Current readings within range":"Corrective action may be required",page:"water"},
    {title:"Staffing coverage",value:available+" / "+needed,note:available>=needed?"Forecast need covered":"Coverage gap detected",page:"staffing"},
    {title:"Daily tasks",value:completedTasks+" / "+tasks.length,note:incompleteTasks?incompleteTasks+" remaining":"No remaining tasks",page:"tasks"},
    {title:"Maintenance",value:openWork.length+" open",note:highWork.length?highWork.length+" high priority":"Routine work queue",page:"maintenance"},
    {title:"Staff requests",value:pendingRequests+" pending",note:pendingRequests?"Manager review needed":"Queue is clear",page:"staffing"},
    {title:"Incidents",value:openIncidents+" open",note:openIncidents?"Follow-up required":"No incidents logged",page:"incidentcenter"}
  ];
  if(q("dashboardOperationsSummary")){
    q("dashboardOperationsSummary").innerHTML=operations.map(function(o){return '<div class="operations-summary-item"><div><b>'+o.title+'</b><div class="small">'+o.note+'</div></div><b>'+o.value+'</b><button class="dashboard-alert-link" type="button" data-operations-page="'+o.page+'">View</button></div>'}).join("");
    q("dashboardOperationsSummary").querySelectorAll("[data-operations-page]").forEach(function(btn){btn.addEventListener("click",function(){showPage(btn.dataset.operationsPage)})});
  }

  var score=healthScore(),demand=state.demand.adjusted,brief=[];
  brief.push('<p class="ai-brief-lead">'+(score>=90?"Operations are ready for the day.":score>=75?"Operations are manageable, with a few items requiring attention.":"Manager action is recommended before peak operations.")+'</p>');
  brief.push('<p>Forecast attendance is <b>'+demand+'</b>. Staffing is <b>'+(available>=needed?"sufficient":"below the recommended level")+'</b> at '+available+' available versus '+needed+' needed.</p>');
  if(ws!=="Good")brief.push('<p>Water chemistry is currently marked <b>'+ws+'</b>; review the latest readings and corrective guidance.</p>');
  if(inv.length||openWork.length||pendingRequests||expired||expiring)brief.push('<p>Additional attention: '+[inv.length?inv.length+" inventory alert"+(inv.length===1?"":"s"):"",openWork.length?openWork.length+" open work order"+(openWork.length===1?"":"s"):"",pendingRequests?pendingRequests+" pending staff request"+(pendingRequests===1?"":"s"):"",expired?expired+" expired credential"+(expired===1?"":"s"):"",expiring?expiring+" credential"+(expiring===1?"":"s")+" expiring soon":""].filter(Boolean).join(", ")+".</p>");
  else brief.push('<p>No inventory, maintenance, workforce, or credential exceptions are currently flagged.</p>');
  if(q("aiOperationsBrief"))q("aiOperationsBrief").innerHTML=brief.join("");
}

function renderOperations(){q("checklist").innerHTML=["Water chemistry checked","Staffing coverage reviewed","Programs confirmed","Inventory reviewed","Maintenance reviewed"].map(x=>"<p>☑ "+x+"</p>").join("");q("incidents").innerHTML=state.incidents.length?state.incidents.map(i=>"<p>⚠ "+i+"</p>").join(""):"<p class='small'>No incidents logged.</p>"}
function renderForecast(){var weatherSource=liveForecastWeatherArray();var vals=weatherSource.map((w,i)=>{var d=demandFor(w.t,w.r);return{day:w.date?weatherDayLabel(w.date):days[i],temp:w.t,rain:w.r,d:d,staff:staffNeeded(d)}}),max=Math.max(...vals.map(x=>x.d));q("demandChart").innerHTML=vals.map(x=>"<div style='height:"+Math.max(20,x.d/max*160)+"px'><b>"+x.d+"</b><span>"+x.day+"</span></div>").join("");q("forecastTable").innerHTML=vals.map((x,i)=>"<tr><td>"+x.day+"</td><td>"+x.temp+"°F</td><td>"+x.rain+"%</td><td>"+(i>=4?"Weekend/event load":"Standard")+"</td><td>"+x.d+"</td><td>"+x.staff+"</td></tr>").join("");var high=vals.slice().sort((a,b)=>b.d-a.d)[0];q("forecastExplanation").innerHTML="<p>AquaIQPro increases demand when heat is high and rain is low. It lowers demand when rain risk is high. Program load adds demand from lessons, parties, and swim team.</p><p><b>Highest projected day:</b> "+high.day+" with "+high.d+" visitors.</p>"}
function renderWater(){var rows=[["Free Chlorine","1.0–4.0 ppm",state.water.chlorine,state.water.chlorine>=1&&state.water.chlorine<=4?"Low":"High"],["pH","7.2–7.8",state.water.ph,state.water.ph>=7.2&&state.water.ph<=7.8?"Low":"High"],["Alkalinity","80–120 ppm",state.water.alk,state.water.alk>=80&&state.water.alk<=120?"Low":"Medium"]];q("chemicalRanges").innerHTML=rows.map(r=>"<tr><td>"+r[0]+"</td><td>"+r[1]+"</td><td>"+r[2]+"</td><td>"+tag(r[3])+"</td></tr>").join("");var wr=recommendations().filter(r=>r.id.indexOf("water")>=0);q("waterGuidance").innerHTML=wr.length?wr.map(r=>"<p>"+tag(r.p)+" "+r.t+"<br><span class='small'>"+r.why+"</span></p>").join(""):"<p>Water readings are within target range. Continue scheduled testing.</p>"}
function renderStaff(){recoverGandyRosterV562();q("staffTable").innerHTML=state.staff.map((s,i)=>"<tr><td>"+s.name+"</td><td>"+s.shift+"</td><td>"+s.area+"</td><td><select onchange='state.staff["+i+"].status=this.value;updateInputs(\"Staff status changed\")'><option "+(s.status==="Scheduled"?"selected":"")+">Scheduled</option><option "+(s.status==="No Show"?"selected":"")+">No Show</option><option "+(s.status==="Called Out"?"selected":"")+">Called Out</option></select></td><td><button class='btn bad' onclick='removeStaff("+i+")'>Remove</button></td></tr>").join("")}
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
function renderDataSummary(){if(!q("dataSummary"))return;q("dataSummary").innerHTML="<p><b>Facility:</b> "+state.facility+"</p><p><b>Staff records:</b> "+state.staff.length+"</p><p><b>Program records:</b> "+(state.programs.lessons.length+state.programs.parties.length+state.programs.team.length+(state.programs.aquaticClass||[]).length)+"</p><p><b>Inventory items:</b> "+state.inventory.length+"</p><p><b>Open work orders:</b> "+state.workOrders.filter(w=>w.status!=='Completed').length+"</p><p><b>Decisions recorded:</b> "+Object.keys(state.decisions||{}).length+"</p>"}
function renderAIOps(){if(!q("aiOpsBriefing"))return;var recs=recommendations();q("aiOpsBriefing").innerHTML="<p><b>Good morning.</b> AquaIQPro estimates "+state.demand.adjusted+" visitors today and recommends "+staffNeeded()+" lifeguards. Current active coverage is "+staffAvailable()+".</p><p>"+(healthScore()>=90?"Today appears stable.":"Manager review is recommended.")+"</p><p><b>Top recommendation:</b> "+recs[0].t+"</p>";q("aiExplainPanel").innerHTML='<div class="status-strip"><div class="status-box"><b>Weather</b>'+state.weather.temp+'°F and '+state.weather.rain+'% rain</div><div class="status-box"><b>Programs</b>'+state.programs.lessons.length+' lessons, '+state.programs.parties.length+' parties</div><div class="status-box"><b>Operations</b>Staffing, water, inventory, maintenance</div><div class="status-box"><b>Saved Data</b>Browser autosave enabled</div></div>';q("explainabilityList").innerHTML=recs.map(r=>"<div class='rowbox'><b>"+r.p+" priority:</b> "+r.t+"<br><span class='small'>Why AquaIQPro recommended this: "+r.why+"</span></div>").join("")}
function addIncident(){if(q("incidentInput").value.trim()){state.incidents.unshift(q("incidentInput").value.trim());q("incidentInput").value="";updateInputs("Incident added")}}function addStaff(){if(q("newStaffName").value.trim()){state.staff.push({name:q("newStaffName").value,shift:q("newStaffShift").value||"TBD",area:q("newStaffArea").value,status:"Scheduled"});q("newStaffName").value="";q("newStaffShift").value="";updateInputs("Staff member added");if(typeof renderWorkforce==="function")renderWorkforce()}}function removeStaff(i){state.staff.splice(i,1);updateInputs("Staff member removed");if(typeof renderWorkforce==="function")renderWorkforce()}function addProgram(type){
  if(type==="lessons")state.programs.lessons.push({name:"New Lesson Block",time:"11:00 AM",count:12});
  else if(type==="parties")state.programs.parties.push({name:"New Pool Party",time:"3:00 PM",count:20});
  else if(type==="team"&&activeFacilityId==="gandy")state.programs.team.push({name:"Swim Team Practice",time:"4:00 PM",lanes:4});
  else if(type==="aquaticClass"&&activeFacilityId==="gandy")state.programs.aquaticClass.push({name:"Aquatic Class",time:"12:00 PM",count:14});
  updateInputs("Program added");
}
function removeProgram(type,i){state.programs[type].splice(i,1);updateInputs("Program removed")}function addWorkOrder(){if(q("woAsset").value.trim()){state.workOrders.unshift({asset:q("woAsset").value.trim(),priority:q("woPriority").value,status:q("woStatus").value,desc:q("woDesc").value.trim()||"No description entered."});q("woAsset").value="";q("woDesc").value="";updateInputs("Work order added")}}function addTask(){if(q("taskName").value.trim()){state.tasks.unshift({name:q("taskName").value.trim(),priority:q("taskPriority").value,owner:q("taskOwner").value,done:false});q("taskName").value="";updateInputs("Daily task added")}}function toggleTask(i){state.tasks[i].done=!state.tasks[i].done;updateInputs("Daily task status changed")}function decide(id,status){state.decisions[id]=status;state.audit.unshift(new Date().toLocaleString()+": Recommendation "+id+" "+status);render();saveState(false)}
function shortStatus(c){if(c.health>=90)return"Ready";if(c.health>=75)return"Review";return"Action"}function reportBullets(){var recs=recommendations(),high=recs.filter(r=>r.p==="High"),lanes=state.programs.team.reduce((s,x)=>s+x.lanes,0),inv=inventoryAlerts(),openWO=state.workOrders.filter(w=>w.status!=="Completed"),openTasks=state.tasks.filter(t=>!t.done),programBullets=[state.programs.lessons.length+" swim lesson block(s)",state.programs.parties.length+" pool party event(s)"];if(activeFacilityId==="gandy"){programBullets.push(lanes+" swim team reserved lane(s)");programBullets.push((state.programs.aquaticClass||[]).length+" Aquatic Class block(s)");programBullets.push(lanes>=5?"Lane pressure is high.":"Lane pressure is manageable.");}return{summary:["Forecast demand is "+state.demand.adjusted+" visitors.","Staffing is "+staffAvailable()+" active vs. "+staffNeeded()+" recommended.","Water status is "+waterStatus()+".",high.length?high.length+" high-priority item(s) need review.":"No high-priority action is currently required."],actions:recs.slice(0,5).map(r=>r.p+": "+r.t),programs:programBullets,operations:[inv.length?inv.length+" inventory purchase flag(s)":"No urgent purchase flags",openWO.length+" open maintenance work order(s)",openTasks.length+" incomplete daily task(s)",state.incidents.length+" incident(s) logged"]}}
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


var FACILITY_OPERATION_DEFAULTS={
  gandy:{
    water:{chlorine:2.1,ph:7.4,alk:95},
    callouts:1,
    inventory:[
      {item:"Liquid Chlorine",onHand:42,min:25,unit:"gal",dailyUse:4.5},
      {item:"Muriatic Acid",onHand:9,min:10,unit:"gal",dailyUse:1.2},
      {item:"Test Reagents",onHand:6,min:4,unit:"kits",dailyUse:.35},
      {item:"Rescue Tubes",onHand:11,min:8,unit:"units",dailyUse:.03},
      {item:"Lane Rope Hardware",onHand:8,min:6,unit:"sets",dailyUse:.02}
    ],
    workOrders:[
      {asset:"Main Pump",priority:"Medium",status:"Open",desc:"Routine vibration check before weekend peak."},
      {asset:"Diving Board",priority:"High",status:"Open",desc:"Pre-opening safety inspection required."},
      {asset:"Starting Block 4",priority:"Medium",status:"In Progress",desc:"Tighten mounting hardware and document inspection."}
    ],
    tasks:[
      {name:"Opening water test",priority:"High",owner:"Pool Manager",done:false},
      {name:"Confirm lifeguard coverage",priority:"High",owner:"Lifeguard Supervisor",done:false},
      {name:"Inspect diving board and starting blocks",priority:"High",owner:"Pool Manager",done:false},
      {name:"Confirm Swim Team and Aquatic Class setup",priority:"Medium",owner:"Program Coordinator",done:false}
    ],
    incidents:[],
    decisions:{}
  },
  simpson:{
    water:{chlorine:1.8,ph:7.5,alk:88},
    callouts:0,
    inventory:[
      {item:"Liquid Chlorine",onHand:24,min:15,unit:"gal",dailyUse:2.5},
      {item:"Muriatic Acid",onHand:7,min:6,unit:"gal",dailyUse:.7},
      {item:"Test Reagents",onHand:4,min:3,unit:"kits",dailyUse:.22},
      {item:"Rescue Tubes",onHand:7,min:6,unit:"units",dailyUse:.02},
      {item:"Seasonal Deck Supplies",onHand:12,min:8,unit:"units",dailyUse:.08}
    ],
    workOrders:[
      {asset:"Pool Liner",priority:"Medium",status:"Open",desc:"Inspect marked area near the shallow-end wall."},
      {asset:"Deck Gate",priority:"High",status:"Open",desc:"Verify self-closing latch before opening."},
      {asset:"Shade Structure",priority:"Low",status:"Open",desc:"Check seasonal anchoring and fabric condition."}
    ],
    tasks:[
      {name:"Opening water test",priority:"High",owner:"Pool Manager",done:false},
      {name:"Confirm seasonal lifeguard coverage",priority:"High",owner:"Lifeguard Supervisor",done:false},
      {name:"Inspect deck gate and pool liner",priority:"High",owner:"Pool Manager",done:false},
      {name:"Confirm lesson and pool-party setup",priority:"Medium",owner:"Program Coordinator",done:false}
    ],
    incidents:[],
    decisions:{}
  }
};

function ensureCompleteFacilityState(){
  ensureFacilityOperationsState();
  recoverGandyRosterV562();

  if(!state.operationsByFacility){
    state.operationsByFacility={
      gandy:cloneFacilityData(FACILITY_OPERATION_DEFAULTS.gandy),
      simpson:cloneFacilityData(FACILITY_OPERATION_DEFAULTS.simpson)
    };

    // Migrate the previously shared operational data into Gandy so existing
    // user edits are not lost during the upgrade.
    if(state.water)state.operationsByFacility.gandy.water=cloneFacilityData(state.water);
    if(typeof state.callouts==="number")state.operationsByFacility.gandy.callouts=state.callouts;
    if(Array.isArray(state.inventory)&&state.inventory.length)state.operationsByFacility.gandy.inventory=cloneFacilityData(state.inventory);
    if(Array.isArray(state.workOrders)&&state.workOrders.length)state.operationsByFacility.gandy.workOrders=cloneFacilityData(state.workOrders);
    if(Array.isArray(state.tasks)&&state.tasks.length)state.operationsByFacility.gandy.tasks=cloneFacilityData(state.tasks);
    if(Array.isArray(state.incidents))state.operationsByFacility.gandy.incidents=cloneFacilityData(state.incidents);
    if(state.decisions)state.operationsByFacility.gandy.decisions=cloneFacilityData(state.decisions);
  }

  ["gandy","simpson"].forEach(function(id){
    if(!state.operationsByFacility[id]){
      state.operationsByFacility[id]=cloneFacilityData(FACILITY_OPERATION_DEFAULTS[id]);
    }
  });

  syncCompleteFacilityState();
}

function syncCompleteFacilityState(){
  syncFacilityOperationsState();
  if(!state.operationsByFacility)return;
  var ops=state.operationsByFacility[activeFacilityId];
  state.water=ops.water;
  state.callouts=ops.callouts;
  state.inventory=ops.inventory;
  state.workOrders=ops.workOrders;
  state.tasks=ops.tasks;
  state.incidents=ops.incidents;
  state.decisions=ops.decisions;
}

function persistCompleteFacilityState(){
  persistFacilityOperationsState();
  if(!state.operationsByFacility)return;
  state.operationsByFacility[activeFacilityId]={
    water:state.water,
    callouts:state.callouts,
    inventory:state.inventory,
    workOrders:state.workOrders,
    tasks:state.tasks,
    incidents:state.incidents,
    decisions:state.decisions
  };
}

function renderFacilityDataContext(){
  var name=activeFacility().name;
  var labels={
    waterFacilityContext:"Showing water-quality readings for "+name,
    inventoryFacilityContext:"Showing inventory and par levels for "+name,
    maintenanceFacilityContext:"Showing maintenance work orders for "+name,
    tasksFacilityContext:"Showing opening and daily tasks for "+name,
    operationsFacilityContext:"Showing operational checklist and incidents for "+name,
    rotationFacilityContext:"Showing capacity and rotations for "+name
  };
  Object.keys(labels).forEach(function(id){
    var el=q(id);
    if(el)el.textContent=labels[id];
  });
}

var activeFacilityId="gandy";
var reportHistoryData=[];

function activeFacility(){return FACILITY_PROFILES[activeFacilityId]||FACILITY_PROFILES.gandy}

function recoverGandyRosterV562(){
  var fullNameMap={
    "Jordan":"Jordan Blake",
    "Maya":"Maya Thompson",
    "Luis":"Luis Ramirez",
    "Emma":"Emma Carter",
    "Noah":"Noah Williams",
    "Olivia":"Olivia Chen",
    "Ethan":"Ethan Brooks",
    "Ava":"Ava Martinez"
  };
  var obsoleteDemoNames=["Alex","Brianna","Carlos","Dana","Eli"];

  function upgradeKnownNames(roster){
    if(!Array.isArray(roster))return;
    roster.forEach(function(guard){
      if(!guard||typeof guard.name!=="string")return;
      var current=guard.name.trim();
      if(fullNameMap[current])guard.name=fullNameMap[current];
    });
  }

  if(!state.staffByFacility){return;}
  var gandy=state.staffByFacility.gandy;
  var obsolete=Array.isArray(gandy)&&gandy.length===5&&gandy.every(function(guard){
    return guard&&obsoleteDemoNames.indexOf(String(guard.name||"").trim())>=0;
  });

  if(!Array.isArray(gandy)||!gandy.length||obsolete){
    state.staffByFacility.gandy=cloneFacilityData(FACILITY_STAFF_DEFAULTS.gandy);
  }else{
    upgradeKnownNames(gandy);
  }

  if(activeFacilityId==="gandy"){
    state.staff=state.staffByFacility.gandy;
  }
  state.gandyRosterRecoveryVersion="5.6.2";
}


function normalizeRuntimeStateV563(){
  var defaults=JSON.parse(DEFAULT_STATE_JSON);
  function arr(value,fallback){return Array.isArray(value)?value:fallback;}
  function obj(value,fallback){return value&&typeof value==="object"&&!Array.isArray(value)?value:fallback;}

  state=obj(state,defaults);
  state.weather=obj(state.weather,JSON.parse(JSON.stringify(defaults.weather)));
  state.demand=obj(state.demand,JSON.parse(JSON.stringify(defaults.demand)));
  state.water=obj(state.water,JSON.parse(JSON.stringify(defaults.water)));
  state.staff=arr(state.staff,JSON.parse(JSON.stringify(defaults.staff)));
  state.inventory=arr(state.inventory,JSON.parse(JSON.stringify(defaults.inventory)));
  state.workOrders=arr(state.workOrders,JSON.parse(JSON.stringify(defaults.workOrders)));
  state.tasks=arr(state.tasks,JSON.parse(JSON.stringify(defaults.tasks)));
  state.incidents=arr(state.incidents,[]);
  state.decisions=obj(state.decisions,{});
  state.audit=arr(state.audit,[]);
  state.programs=obj(state.programs,{});
  state.programs.lessons=arr(state.programs.lessons,JSON.parse(JSON.stringify(defaults.programs.lessons)));
  state.programs.parties=arr(state.programs.parties,JSON.parse(JSON.stringify(defaults.programs.parties)));
  state.programs.team=arr(state.programs.team,JSON.parse(JSON.stringify(defaults.programs.team)));
  state.programs.aquaticClass=arr(state.programs.aquaticClass,[]);
  state.callouts=Number.isFinite(Number(state.callouts))?Number(state.callouts):0;
  state.runtimeSchemaVersion="5.6.3";

  state.staff=state.staff.filter(function(x){return x&&typeof x==="object";}).map(function(x){
    return {name:String(x.name||"Lifeguard"),shift:String(x.shift||"8 AM–4 PM"),area:String(x.area||"Deck"),status:String(x.status||"Scheduled")};
  });
  state.inventory=state.inventory.filter(function(x){return x&&typeof x==="object";});
  state.workOrders=state.workOrders.filter(function(x){return x&&typeof x==="object";});
  state.tasks=state.tasks.filter(function(x){return x&&typeof x==="object";});
}

function safeModuleRender(name,fn){
  try{fn();}
  catch(error){
    console.error("AquaIQPro module failed: "+name,error);
    var section=document.getElementById(name);
    if(section&&!section.querySelector(".module-recovery-message")){
      var notice=document.createElement("div");
      notice.className="notice module-recovery-message";
      notice.innerHTML="<b>Module recovery:</b> This section encountered incompatible saved data. Refreshing the page will reload stable defaults.";
      section.insertBefore(notice,section.firstChild);
    }
  }
}

function ensureExtendedState(){
  normalizeRuntimeStateV563();
  if(!state.facilityProfiles)state.facilityProfiles=JSON.parse(JSON.stringify(FACILITY_PROFILES));
  if(!state.activeFacilityId)state.activeFacilityId="gandy";
  activeFacilityId=state.activeFacilityId;
  if(!Array.isArray(state.reportHistory))state.reportHistory=[];
  reportHistoryData=state.reportHistory;
  if(!state.shiftNotes)state.shiftNotes={gandy:{text:"",reviewed:false},simpson:{text:"",reviewed:false}};
  if(typeof state.managerName!=="string")state.managerName="";
  ensureCompleteFacilityState();
  ensureRotationState();
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
  showToast(name?"Manager name saved":"Manager name cleared");
}

function applyFacilityProfile(id,initial){
  if(!FACILITY_PROFILES[id])id="gandy";
  persistCompleteFacilityState();
  activeFacilityId=id;
  state.activeFacilityId=id;
  ensureCompleteFacilityState();
  syncCompleteFacilityState();
  var p=activeFacility();
  state.facility=p.name;
  state.demand.base=Number(p.baseDemand);
  if(!initial){
    state.audit.unshift(new Date().toLocaleString()+": Facility changed to "+p.name);
  }
  hydrateInputs();
  render();
  renderFacilityProfile();
  facilityDisplayAudit();
  renderFacilityComparison();
  renderRotationBoard();
  bindRotationBoard();
  renderShiftWorkspace();
  renderManagerIdentity();
  refreshFacilityDisplay();
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



function facilityDisplayAudit(){
  var expected=activeFacility().name;
  var ids=["welcomeFacilityName","facilityName","reportFacilityBadge","comparisonSelectedFacility"];
  ids.forEach(function(id){
    var el=q(id);
    if(el&&el.textContent.trim()!==expected)el.textContent=expected;
  });
  renderFacilityDataContext();
}

function refreshFacilityDisplay(){
  var p=activeFacility();
  var facilityName=p.name;

  if(q("facilitySelect"))q("facilitySelect").value=p.id;
  if(q("welcomeFacilityName"))q("welcomeFacilityName").textContent=facilityName;
  if(q("facilityName"))q("facilityName").textContent=facilityName;
  if(q("reportFacilityBadge"))q("reportFacilityBadge").textContent=facilityName;
  if(q("comparisonSelectedFacility"))q("comparisonSelectedFacility").textContent=facilityName;

  renderFacilityDataContext();

  if(q("facilityRosterNote")){
    q("facilityRosterNote").innerHTML="<b>"+facilityName+" lifeguard roster</b><br><span class='small'>Names, shifts, status changes, and manager edits are stored separately for this facility.</span>";
  }

  if(q("facilityProgramNote")){
    q("facilityProgramNote").innerHTML=p.id==="gandy"
      ?"<b>Gandy Pool program profile</b><br><span class='small'>Swim Lessons, Pool Parties, Swim Team, and Aquatic Class affect demand and staffing.</span>"
      :"<b>Simpson Park Pool program profile</b><br><span class='small'>Swim Lessons and Pool Parties affect demand and staffing. Swim Team and Aquatic Class are not scheduled here.</span>";
  }
}

function renderFacilityProfile(){
  var p=activeFacility();
  refreshFacilityDisplay();

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
    var items=recs.slice(0,4).map(function(r){return{p:r.p,t:r.t,why:r.why,page:"decisions"}});
    var wf=(state.workforceByFacility&&state.workforceByFacility[p.id])||{requests:[],certifications:[]};
    var pending=(wf.requests||[]).filter(function(r){return r.status==="Pending"}).length;
    var now=new Date();now.setHours(0,0,0,0);
    var credentialIssues=(wf.certifications||[]).filter(function(c){var d=new Date(c.expires+"T00:00:00");return d<now||((d-now)/86400000)<=30}).length;
    if(pending)items.unshift({p:"Medium",t:pending+" pending staff request"+(pending===1?"":"s"),why:"Time off, swap, or availability requests are waiting for review.",page:"staffing"});
    if(credentialIssues)items.unshift({p:"High",t:credentialIssues+" credential alert"+(credentialIssues===1?"":"s"),why:"Expired or soon-to-expire staff credentials require attention.",page:"staffing"});
    items=items.slice(0,6);
    q("inboxCount").textContent=items.length;
    q("managerInbox").innerHTML=items.map(function(r){
      return '<button type="button" class="inbox-item inbox-item-button" data-inbox-page="'+(r.page||"decisions")+'"><span class="tag '+(r.p==="High"?"high":r.p==="Medium"?"med":"low")+'">'+r.p+'</span><div><b>'+r.t+'</b><div class="small">'+r.why+'</div></div><span class="small">Open</span></button>';
    }).join("");
    q("managerInbox").querySelectorAll("[data-inbox-page]").forEach(function(btn){btn.addEventListener("click",function(){showPage(btn.dataset.inboxPage)})});
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

function showPage(pageId,sourceButton){
  var page=q(pageId);
  if(!page)return;
  document.querySelectorAll("#nav button").forEach(function(b){b.classList.remove("active")});
  document.querySelectorAll(".section").forEach(function(section){section.classList.remove("active")});
  page.classList.add("active");
  var btn=sourceButton||document.querySelector('#nav button[data-page="'+pageId+'"]');
  if(btn){
    btn.classList.add("active");
    var group=btn.closest("details.nav-group");
    if(group)group.open=true;
  }
  var title=btn&&(btn.dataset.title||btn.textContent.trim());
  if(q("pageTitle"))q("pageTitle").textContent=title||pageId;
  var focusId=btn&&btn.dataset.focus;
  if(focusId){
    var focusPanel=q(focusId);
    if(focusPanel){
      if(focusPanel.tagName&&focusPanel.tagName.toLowerCase()==="details")focusPanel.open=true;
      window.setTimeout(function(){focusPanel.scrollIntoView({behavior:"smooth",block:"start"})},60);
      return;
    }
  }
  window.scrollTo({top:0,behavior:"smooth"});
}
function init(){loadState();ensureExtendedState();hydrateInputs();document.querySelectorAll("#nav button").forEach(function(btn){
  btn.addEventListener("click",function(){
    var targetFacility=btn.dataset.facilityTarget;
    if(targetFacility){
      var selector=q("facilitySelect");
      if(selector)selector.value=targetFacility;
      applyFacilityProfile(targetFacility,false);
      refreshFacilityDisplay();
      showToast(activeFacility().name+" selected");
    }
    showPage(btn.dataset.page,btn);
  });
});

var refreshWeatherButton=q("refreshWeatherButton");if(refreshWeatherButton)refreshWeatherButton.addEventListener("click",function(){loadLiveWeather(true)});
var refreshWeatherPageButton=q("refreshWeatherPageButton");if(refreshWeatherPageButton)refreshWeatherPageButton.addEventListener("click",function(){loadLiveWeather(true)});

var facilitySelect=q("facilitySelect");if(facilitySelect)facilitySelect.addEventListener("change",function(){var selectedId=this.value;applyFacilityProfile(selectedId,false);refreshFacilityDisplay();showToast(activeFacility().name+" selected")});
var saveManagerNameButton=q("saveManagerNameButton");if(saveManagerNameButton)saveManagerNameButton.addEventListener("click",saveManagerIdentity);
var managerNameInput=q("managerNameInput");if(managerNameInput)managerNameInput.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();saveManagerIdentity()}});
var returnToSelectedFacilityButton=q("returnToSelectedFacilityButton");if(returnToSelectedFacilityButton)returnToSelectedFacilityButton.addEventListener("click",function(){showPage("dashboard")});
var recommendedFacilityButton=q("useRecommendedFacilityButton");if(recommendedFacilityButton)recommendedFacilityButton.addEventListener("click",chooseRecommendedFacility);
var saveFacility=q("saveFacilityProfile");if(saveFacility)saveFacility.addEventListener("click",saveFacilityAssumptions);

var saveNotes=q("saveShiftNotes");if(saveNotes)saveNotes.addEventListener("click",saveShiftHandoff);

var fab=document.querySelector(".chat-fab");if(fab)fab.addEventListener("click",function(e){e.preventDefault();toggleChat()});var begin=q("beginDayButton");if(begin)begin.addEventListener("click",beginDayReview);applyFacilityProfile(state.activeFacilityId||"gandy",true);renderCapacity();renderFacilityProfile();facilityDisplayAudit();renderFacilityComparison();renderRotationBoard();bindRotationBoard();renderShiftWorkspace();renderManagerIdentity();refreshFacilityDisplay();renderShiftOperationsCenter();bindShiftQuickActions();runScenario();loadLiveWeather(false);weatherRefreshTimer=setInterval(function(){loadLiveWeather(false)},WEATHER_REFRESH_MS)}init();

/* AquaIQPro 5.5.2 isolated Incident Center module */
(function(){
  "use strict";

  var INCIDENT_STORAGE_KEY="aquaiqpro_incident_center_v1";
  var incidentEditingId=null;
  var incidentStore={gandy:[],simpson:[]};

  function incidentEl(id){
    return document.getElementById(id);
  }

  function incidentFacilityId(){
    if(typeof activeFacilityId==="string"&&(activeFacilityId==="gandy"||activeFacilityId==="simpson")){
      return activeFacilityId;
    }
    var select=incidentEl("facilitySelect");
    return select&&select.value==="simpson"?"simpson":"gandy";
  }

  function incidentFacilityName(){
    var id=incidentFacilityId();
    if(typeof FACILITY_PROFILES==="object"&&FACILITY_PROFILES[id]){
      return FACILITY_PROFILES[id].name;
    }
    return id==="simpson"?"Simpson Park Pool":"Gandy Pool";
  }

  function loadIncidentStore(){
    try{
      var parsed=JSON.parse(localStorage.getItem(INCIDENT_STORAGE_KEY)||"null");
      if(parsed&&typeof parsed==="object"){
        incidentStore.gandy=Array.isArray(parsed.gandy)?parsed.gandy:[];
        incidentStore.simpson=Array.isArray(parsed.simpson)?parsed.simpson:[];
      }
    }catch(error){
      incidentStore={gandy:[],simpson:[]};
      console.warn("Incident Center storage reset:",error);
    }
  }

  function saveIncidentStore(){
    try{
      localStorage.setItem(INCIDENT_STORAGE_KEY,JSON.stringify(incidentStore));
    }catch(error){
      console.warn("Incident Center could not save:",error);
    }
  }

  function activeIncidentRecords(){
    var id=incidentFacilityId();
    if(!Array.isArray(incidentStore[id]))incidentStore[id]=[];
    return incidentStore[id];
  }

  function incidentDefaults(){
    var now=new Date();
    return{
      date:now.toISOString().slice(0,10),
      time:String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0")
    };
  }

  function clearIncidentForm(){
    incidentEditingId=null;
    var defaults=incidentDefaults();
    if(incidentEl("incidentCenterFormTitle"))incidentEl("incidentCenterFormTitle").textContent="Log New Incident";
    if(incidentEl("incidentCenterType"))incidentEl("incidentCenterType").value="First Aid";
    if(incidentEl("incidentCenterSeverity"))incidentEl("incidentCenterSeverity").value="Medium";
    if(incidentEl("incidentCenterDate"))incidentEl("incidentCenterDate").value=defaults.date;
    if(incidentEl("incidentCenterTime"))incidentEl("incidentCenterTime").value=defaults.time;
    ["incidentCenterLocation","incidentCenterResponder","incidentCenterDescription","incidentCenterAction","incidentCenterFollowUp"].forEach(function(id){
      if(incidentEl(id))incidentEl(id).value="";
    });
    if(incidentEl("incidentCenterStatus"))incidentEl("incidentCenterStatus").value="Open";
    if(incidentEl("incidentCenterManagerReview"))incidentEl("incidentCenterManagerReview").value="Pending";
    if(incidentEl("incidentCenterMessage"))incidentEl("incidentCenterMessage").textContent="";
  }

  function formIncident(){
    return{
      id:incidentEditingId||("INC-"+Date.now()),
      facilityId:incidentFacilityId(),
      type:incidentEl("incidentCenterType").value,
      severity:incidentEl("incidentCenterSeverity").value,
      date:incidentEl("incidentCenterDate").value,
      time:incidentEl("incidentCenterTime").value,
      location:incidentEl("incidentCenterLocation").value.trim(),
      responder:incidentEl("incidentCenterResponder").value.trim(),
      description:incidentEl("incidentCenterDescription").value.trim(),
      action:incidentEl("incidentCenterAction").value.trim(),
      followUp:incidentEl("incidentCenterFollowUp").value.trim(),
      status:incidentEl("incidentCenterStatus").value,
      managerReview:incidentEl("incidentCenterManagerReview").value,
      updatedAt:new Date().toISOString()
    };
  }

  function incidentValid(record){
    return Boolean(
      record.type&&record.severity&&record.date&&record.time&&
      record.location&&record.responder&&record.description&&record.action
    );
  }

  function saveIncidentRecord(){
    var record=formIncident();
    if(!incidentValid(record)){
      incidentEl("incidentCenterMessage").textContent="Complete the required fields before saving.";
      return;
    }

    var records=activeIncidentRecords();
    var index=records.findIndex(function(item){return item.id===record.id});
    if(index>=0){
      records[index]=record;
    }else{
      records.unshift(record);
    }

    saveIncidentStore();
    clearIncidentForm();
    renderIncidentCenterIsolated();
    if(typeof showToast==="function")showToast(index>=0?"Incident updated":"Incident saved");
  }

  function editIncidentRecord(id){
    var record=activeIncidentRecords().find(function(item){return item.id===id});
    if(!record)return;

    incidentEditingId=id;
    incidentEl("incidentCenterFormTitle").textContent="Edit Incident";
    incidentEl("incidentCenterType").value=record.type;
    incidentEl("incidentCenterSeverity").value=record.severity;
    incidentEl("incidentCenterDate").value=record.date;
    incidentEl("incidentCenterTime").value=record.time;
    incidentEl("incidentCenterLocation").value=record.location;
    incidentEl("incidentCenterResponder").value=record.responder;
    incidentEl("incidentCenterDescription").value=record.description;
    incidentEl("incidentCenterAction").value=record.action;
    incidentEl("incidentCenterFollowUp").value=record.followUp||"";
    incidentEl("incidentCenterStatus").value=record.status;
    incidentEl("incidentCenterManagerReview").value=record.managerReview||"Pending";
  }

  function resolveIncidentRecord(id){
    var record=activeIncidentRecords().find(function(item){return item.id===id});
    if(!record)return;
    record.status="Resolved";
    record.managerReview="Reviewed";
    record.updatedAt=new Date().toISOString();
    saveIncidentStore();
    renderIncidentCenterIsolated();
  }

  function removeIncidentRecord(id){
    var facility=incidentFacilityId();
    incidentStore[facility]=activeIncidentRecords().filter(function(item){return item.id!==id});
    saveIncidentStore();
    renderIncidentCenterIsolated();
  }

  function severityTagClass(severity){
    return severity==="High"||severity==="Critical"?"high":severity==="Medium"?"med":"low";
  }

  function renderIncidentCenterIsolated(){
    var facilityName=incidentFacilityName();
    var records=activeIncidentRecords();

    if(incidentEl("incidentCenterFacility")){
      incidentEl("incidentCenterFacility").textContent="Showing incident records for "+facilityName;
    }

    var open=records.filter(function(item){return item.status!=="Resolved"});
    var high=records.filter(function(item){return item.severity==="High"||item.severity==="Critical"});
    var resolved=records.filter(function(item){return item.status==="Resolved"});
    var pending=records.filter(function(item){return item.managerReview!=="Reviewed"});

    incidentEl("incidentMetricOpen").textContent=open.length;
    incidentEl("incidentMetricHigh").textContent=high.length;
    incidentEl("incidentMetricResolved").textContent=resolved.length;
    incidentEl("incidentMetricReview").textContent=pending.length?"Review":"Ready";
    incidentEl("incidentMetricReviewNote").textContent=pending.length
      ?pending.length+" record(s) awaiting review"
      :"No pending records";

    var statusFilter=incidentEl("incidentCenterStatusFilter").value;
    var severityFilter=incidentEl("incidentCenterSeverityFilter").value;
    var filtered=records.filter(function(item){
      return(statusFilter==="all"||item.status===statusFilter)&&
        (severityFilter==="all"||item.severity===severityFilter);
    });

    var list=incidentEl("incidentCenterList");
    if(filtered.length){
      list.innerHTML=filtered.map(function(item){
        return'<div class="incident-center-card '+String(item.severity||"Low").toLowerCase()+'">'+
          '<div class="rowflex"><div><h4>'+item.type+'</h4><span class="small">'+item.date+' • '+item.time+' • '+item.location+'</span></div>'+
          '<span class="tag '+severityTagClass(item.severity)+'">'+item.severity+'</span></div>'+
          '<p>'+item.description+'</p>'+
          '<div class="incident-center-meta"><span class="tag info">'+item.status+'</span><span class="tag info">Responder: '+item.responder+'</span><span class="tag info">Manager: '+item.managerReview+'</span></div>'+
          '<div class="incident-center-card-actions"><button type="button" class="btn secondary" data-incident-edit="'+item.id+'">Edit</button>'+
          (item.status!=="Resolved"?'<button type="button" class="btn secondary" data-incident-resolve="'+item.id+'">Resolve</button>':'')+
          '<button type="button" class="btn secondary" data-incident-remove="'+item.id+'">Remove</button></div>'+
        '</div>';
      }).join("");
    }else{
      list.innerHTML='<p class="small">No incidents match the selected filters.</p>';
    }

    list.querySelectorAll("[data-incident-edit]").forEach(function(button){
      button.addEventListener("click",function(){editIncidentRecord(button.dataset.incidentEdit)});
    });
    list.querySelectorAll("[data-incident-resolve]").forEach(function(button){
      button.addEventListener("click",function(){resolveIncidentRecord(button.dataset.incidentResolve)});
    });
    list.querySelectorAll("[data-incident-remove]").forEach(function(button){
      button.addEventListener("click",function(){removeIncidentRecord(button.dataset.incidentRemove)});
    });

    var followUp=incidentEl("incidentCenterFollowUpList");
    if(open.length){
      followUp.innerHTML=open.map(function(item){
        return'<div class="incident-center-followup"><span class="incident-center-followup-dot"></span><div><b>'+item.type+' — '+item.location+'</b><div class="small">'+(item.followUp||"Follow-up details have not been entered.")+'</div></div><span class="tag '+(item.followUp?"med":"high")+'">'+(item.followUp?"Assigned":"Missing")+'</span></div>';
      }).join("");
    }else{
      followUp.innerHTML='<p class="small">No open incident follow-up actions.</p>';
    }
  }

  var incidentCenterBound=false;

  function bindIncidentCenterIsolated(){
    if(incidentCenterBound)return;
    incidentCenterBound=true;
    ["incidentCenterStatusFilter","incidentCenterSeverityFilter"].forEach(function(id){
      var element=incidentEl(id);
      if(element)element.addEventListener("change",renderIncidentCenterIsolated);
    });

    var newButton=incidentEl("incidentNewButton");
    if(newButton)newButton.addEventListener("click",clearIncidentForm);

    var saveButton=incidentEl("incidentCenterSaveButton");
    if(saveButton)saveButton.addEventListener("click",saveIncidentRecord);

    var clearButton=incidentEl("incidentCenterClearButton");
    if(clearButton)clearButton.addEventListener("click",clearIncidentForm);

    var facilitySelect=incidentEl("facilitySelect");
    if(facilitySelect){
      facilitySelect.addEventListener("change",function(){
        incidentEditingId=null;
        clearIncidentForm();
        renderIncidentCenterIsolated();
      });
    }
  }

  function incidentCenterIsolatedInit(){
    if(!incidentEl("incidentcenter"))return;
    loadIncidentStore();
    clearIncidentForm();
    bindIncidentCenterIsolated();
    renderIncidentCenterIsolated();
    console.info("AquaIQPro v5.5.2 isolated Incident Center loaded");
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",incidentCenterIsolatedInit,{once:true});
  }else{
    incidentCenterIsolatedInit();
  }
})();



/* AquaIQPro v5.7.2 Workforce Management isolated module */
(function(){
  "use strict";
  var DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  function el(id){return document.getElementById(id)}
  function fid(){return typeof activeFacilityId==="string"?activeFacilityId:"gandy"}
  function facilityName(){try{return activeFacility().name}catch(e){return fid()==="simpson"?"Simpson Park Pool":"Gandy Pool"}}
  function today(){return new Date().toISOString().slice(0,10)}
  function addDays(days){var d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
  function escapeHtml(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
  function ensureStore(){
    if(!state.workforceByFacility)state.workforceByFacility={};
    ["gandy","simpson"].forEach(function(id){
      if(!state.workforceByFacility[id])state.workforceByFacility[id]={requests:[],availability:{},certifications:[],directory:[]};
      var w=state.workforceByFacility[id];
      if(!Array.isArray(w.requests))w.requests=[];
      if(!w.availability||typeof w.availability!=="object")w.availability={};
      if(!Array.isArray(w.certifications))w.certifications=[];
      if(!Array.isArray(w.directory))w.directory=[];
    });
    seedDirectory();
  }
  function store(){ensureStore();return state.workforceByFacility[fid()]}
  function roster(){return Array.isArray(state.staff)?state.staff:[]}
  function seedDirectory(){
    ["gandy","simpson"].forEach(function(id){
      var w=state.workforceByFacility[id],staff=(state.staffByFacility&&state.staffByFacility[id])||[];
      staff.forEach(function(s){if(!w.directory.some(function(p){return p.name===s.name})){w.directory.push({id:"P-"+Date.now()+"-"+Math.random().toString(16).slice(2),name:s.name,role:s.area==="Deck Supervisor"?"Deck Supervisor":"Lifeguard",phone:"",email:"",emergencyName:"",emergencyPhone:""})}});
    });
  }
  function allNames(){var names=store().directory.map(function(p){return p.name});roster().forEach(function(s){if(names.indexOf(s.name)<0)names.push(s.name)});return names.sort()}
  function fillSelect(select,includeBlank){if(!select)return;var current=select.value,html=includeBlank?'<option value="">Not selected</option>':'';html+=allNames().map(function(n){return '<option value="'+escapeHtml(n)+'">'+escapeHtml(n)+'</option>'}).join('');select.innerHTML=html;if(allNames().indexOf(current)>=0)select.value=current}
  function save(){saveState(false)}
  function requestStatusClass(status){return status==="Approved"?"low":status==="Denied"?"high":"med"}
  function renderRequests(){
    var w=store(),filter=el("requestStatusFilter")?el("requestStatusFilter").value:"all",list=el("staffRequestList");
    if(!list)return;
    var items=w.requests.filter(function(r){return filter==="all"||r.status===filter});
    list.innerHTML=items.length?items.map(function(r){return '<div class="workforce-item"><div><div class="rowflex"><b>'+escapeHtml(r.staff)+'</b><span class="tag '+requestStatusClass(r.status)+'">'+r.status+'</span></div><div class="small">'+escapeHtml(r.type)+' • '+escapeHtml(r.start)+(r.end&&r.end!==r.start?' to '+escapeHtml(r.end):'')+(r.replacement?' • Coverage: '+escapeHtml(r.replacement):'')+'</div><p>'+escapeHtml(r.reason||"No reason entered")+'</p></div><div class="workforce-actions">'+(r.status==="Pending"?'<button class="btn secondary" data-request-action="approve" data-request-id="'+r.id+'">Approve</button><button class="btn secondary" data-request-action="deny" data-request-id="'+r.id+'">Deny</button>':'')+'<button class="btn secondary" data-request-action="remove" data-request-id="'+r.id+'">Remove</button></div></div>'}).join(''):'<p class="small">No requests match this filter.</p>';
    list.querySelectorAll("[data-request-action]").forEach(function(btn){btn.addEventListener("click",function(){handleRequest(btn.dataset.requestId,btn.dataset.requestAction)})});
    var pending=w.requests.filter(function(r){return r.status==="Pending"}).length,impact=w.requests.filter(function(r){return r.status==="Approved"&&r.type==="Time Off"}).length;
    if(el("workforcePendingCount"))el("workforcePendingCount").textContent=pending;
    if(el("workforceCoverageImpact"))el("workforceCoverageImpact").textContent=impact;
  }
  function handleRequest(id,action){var w=store(),r=w.requests.find(function(x){return x.id===id});if(!r)return;if(action==="remove")w.requests=w.requests.filter(function(x){return x.id!==id});else{r.status=action==="approve"?"Approved":"Denied";r.reviewedAt=new Date().toISOString();if(r.status==="Approved"&&r.type==="Time Off"){var person=roster().find(function(s){return s.name===r.staff});if(person)person.status="Unavailable";}if(r.status==="Approved"&&r.type==="Shift Swap"&&r.replacement){var person=roster().find(function(s){return s.name===r.staff}),replacement=roster().find(function(s){return s.name===r.replacement});if(person&&replacement){var shift=person.shift,area=person.area;person.shift=replacement.shift;person.area=replacement.area;replacement.shift=shift;replacement.area=area;}}}save();renderWorkforce();render();showToast(action==="remove"?"Request removed":"Request "+r.status.toLowerCase())}
  function submitRequest(){var staff=el("requestStaff").value,type=el("requestType").value,start=el("requestStart").value,end=el("requestEnd").value||start,reason=el("requestReason").value.trim(),replacement=el("requestReplacement").value;if(!staff||!start){el("requestFormStatus").textContent="Select a staff member and start date.";return}store().requests.unshift({id:"R-"+Date.now(),staff:staff,type:type,start:start,end:end,reason:reason,replacement:replacement,status:"Pending",submittedAt:new Date().toISOString()});save();el("requestReason").value="";el("requestFormStatus").textContent="Request submitted for manager review.";renderRequests();showToast("Staff request submitted")}
  function availabilityFor(name){var w=store();if(!w.availability[name])w.availability[name]={days:[true,true,true,true,true,true,true],notes:""};return w.availability[name]}
  function renderAvailability(){var select=el("availabilityStaff");if(!select)return;var name=select.value||allNames()[0];if(!name)return;select.value=name;var a=availabilityFor(name),grid=el("availabilityGrid");grid.innerHTML=DAYS.map(function(day,i){return '<label class="availability-day"><input type="checkbox" data-availability-day="'+i+'" '+(a.days[i]?'checked':'')+'><span>'+day.slice(0,3)+'</span></label>'}).join('');if(el("availabilityNotes"))el("availabilityNotes").value=a.notes||"";var dow=new Date().getDay(),available=allNames().filter(function(n){return availabilityFor(n).days[dow]}).length;if(el("workforceAvailableToday"))el("workforceAvailableToday").textContent=available}
  function saveAvailability(){var name=el("availabilityStaff").value;if(!name)return;var a=availabilityFor(name);a.days=Array.from(document.querySelectorAll("[data-availability-day]")).map(function(c){return c.checked});a.notes=el("availabilityNotes").value.trim();save();el("availabilityStatus").textContent="Availability saved for "+name+".";renderAvailability();showToast("Availability saved")}
  function certStatus(exp){var now=new Date(today()+"T00:00:00"),d=new Date(exp+"T00:00:00"),days=Math.ceil((d-now)/86400000);return days<0?{label:"Expired",cls:"high"}:days<=30?{label:"Expires in "+days+" days",cls:"med"}:{label:"Active",cls:"low"}}
  function renderCertifications(){var w=store(),list=el("certificationList");if(!list)return;var sorted=w.certifications.slice().sort(function(a,b){return a.expires.localeCompare(b.expires)});list.innerHTML=sorted.length?sorted.map(function(c){var st=certStatus(c.expires);return '<div class="workforce-item compact"><div><b>'+escapeHtml(c.staff)+' — '+escapeHtml(c.type)+'</b><div class="small">Issued '+escapeHtml(c.issued||"Not entered")+' • Expires '+escapeHtml(c.expires)+'</div></div><div class="workforce-actions"><span class="tag '+st.cls+'">'+st.label+'</span><button class="btn secondary" data-cert-remove="'+c.id+'">Remove</button></div></div>'}).join(''):'<p class="small">No certifications have been entered.</p>';list.querySelectorAll("[data-cert-remove]").forEach(function(btn){btn.addEventListener("click",function(){w.certifications=w.certifications.filter(function(c){return c.id!==btn.dataset.certRemove});save();renderCertifications()})});if(el("certExpiringCount"))el("certExpiringCount").textContent=w.certifications.filter(function(c){return certStatus(c.expires).cls==="med"}).length;if(el("certExpiredCount"))el("certExpiredCount").textContent=w.certifications.filter(function(c){return certStatus(c.expires).cls==="high"}).length}
  function addCertification(){var staff=el("certStaff").value,type=el("certType").value,issued=el("certIssued").value,expires=el("certExpires").value;if(!staff||!expires){showToast("Select staff and expiration date");return}store().certifications.push({id:"C-"+Date.now(),staff:staff,type:type,issued:issued,expires:expires});save();renderCertifications();showToast("Certification added")}
  function renderDirectory(){var w=store(),list=el("directoryList");if(!list)return;list.innerHTML=w.directory.length?w.directory.map(function(p){var count=w.certifications.filter(function(c){return c.staff===p.name}).length;return '<div class="directory-card"><div class="rowflex"><div><b>'+escapeHtml(p.name)+'</b><div class="small">'+escapeHtml(p.role)+'</div></div><span class="tag info">'+count+' cert'+(count===1?'':'s')+'</span></div><div class="small">'+escapeHtml(p.phone||"No phone")+'<br>'+escapeHtml(p.email||"No email")+'</div><div class="directory-actions"><button class="btn secondary" data-directory-edit="'+p.id+'">Edit</button><button class="btn secondary" data-directory-remove="'+p.id+'">Remove</button></div></div>'}).join(''):'<p class="small">No staff profiles.</p>';list.querySelectorAll("[data-directory-edit]").forEach(function(btn){btn.addEventListener("click",function(){editProfile(btn.dataset.directoryEdit)})});list.querySelectorAll("[data-directory-remove]").forEach(function(btn){btn.addEventListener("click",function(){w.directory=w.directory.filter(function(p){return p.id!==btn.dataset.directoryRemove});save();renderWorkforce()})});if(el("directoryProfileCount"))el("directoryProfileCount").textContent=w.directory.length}
  var editingProfileId="";
  function editProfile(id){var p=store().directory.find(function(x){return x.id===id});if(!p)return;editingProfileId=id;el("directoryName").value=p.name;el("directoryRole").value=p.role;el("directoryPhone").value=p.phone||"";el("directoryEmail").value=p.email||"";el("directoryEmergencyName").value=p.emergencyName||"";el("directoryEmergencyPhone").value=p.emergencyPhone||"";el("saveDirectoryProfile").textContent="Update Staff Profile"}
  function saveProfile(){var name=el("directoryName").value.trim();if(!name){showToast("Enter a staff name");return}var w=store(),profile=editingProfileId?w.directory.find(function(x){return x.id===editingProfileId}):null;if(!profile){profile={id:"P-"+Date.now()};w.directory.push(profile)}profile.name=name;profile.role=el("directoryRole").value;profile.phone=el("directoryPhone").value.trim();profile.email=el("directoryEmail").value.trim();profile.emergencyName=el("directoryEmergencyName").value.trim();profile.emergencyPhone=el("directoryEmergencyPhone").value.trim();if(!roster().some(function(s){return s.name===name}))roster().push({name:name,shift:"Unassigned",area:profile.role,status:"Available"});editingProfileId="";["directoryName","directoryPhone","directoryEmail","directoryEmergencyName","directoryEmergencyPhone"].forEach(function(id){el(id).value=""});el("saveDirectoryProfile").textContent="Add Staff Profile";save();renderWorkforce();render();showToast("Staff profile saved")}
  function renderWorkforce(){if(!el("staffing"))return;ensureStore();[el("requestStaff"),el("availabilityStaff"),el("certStaff")].forEach(function(s){fillSelect(s,false)});fillSelect(el("requestReplacement"),true);renderRequests();renderAvailability();renderCertifications();renderDirectory()}
  var bound=false;
  function bind(){if(bound||!el("staffing"))return;bound=true;if(el("submitStaffRequest"))el("submitStaffRequest").addEventListener("click",submitRequest);if(el("requestStatusFilter"))el("requestStatusFilter").addEventListener("change",renderRequests);if(el("availabilityStaff"))el("availabilityStaff").addEventListener("change",renderAvailability);if(el("saveAvailability"))el("saveAvailability").addEventListener("click",saveAvailability);if(el("addCertification"))el("addCertification").addEventListener("click",addCertification);if(el("saveDirectoryProfile"))el("saveDirectoryProfile").addEventListener("click",saveProfile);var fs=el("facilitySelect");if(fs)fs.addEventListener("change",function(){setTimeout(renderWorkforce,0)});}
  function init(){if(!el("staffing"))return;ensureStore();bind();if(el("requestStart"))el("requestStart").value=today();if(el("requestEnd"))el("requestEnd").value=today();if(el("certIssued"))el("certIssued").value=today();if(el("certExpires"))el("certExpires").value=addDays(365);renderWorkforce();window.renderWorkforce=renderWorkforce}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

/* AquaIQPro 5.6 Report Center 2.0 isolated module */
(function(){
  "use strict";

  var REPORT2_KEY="aquaiqpro_report_center_2_v1";
  var reportHistory=[];

  function r2(id){return document.getElementById(id);}

  function reportFacilityId(){
    return typeof activeFacilityId==="string"?activeFacilityId:"gandy";
  }

  function reportFacilityName(){
    var id=reportFacilityId();
    if(typeof FACILITY_PROFILES==="object"&&FACILITY_PROFILES[id]){
      return FACILITY_PROFILES[id].name;
    }
    return id==="simpson"?"Simpson Park Pool":"Gandy Pool";
  }

  function todayISO(){
    return new Date().toISOString().slice(0,10);
  }

  function loadReportHistory(){
    try{
      var parsed=JSON.parse(localStorage.getItem(REPORT2_KEY)||"[]");
      reportHistory=Array.isArray(parsed)?parsed:[];
    }catch(error){
      reportHistory=[];
    }
  }

  function saveReportHistory(){
    localStorage.setItem(REPORT2_KEY,JSON.stringify(reportHistory));
  }

  function report2SystemValues(){
    var guards=typeof staffAvailable==="function"?staffAvailable():0;
    var needed=typeof staffNeeded==="function"?staffNeeded():0;
    var demand=state&&state.demand?Number(state.demand.adjusted||0):0;
    var capacity=typeof capacityMetrics==="function"?capacityMetrics():{operatingCapacity:0};
    var waterLabel=typeof waterStatus==="function"?waterStatus():"Unknown";
    var inv=typeof inventoryAlerts==="function"?inventoryAlerts():[];
    var work=state&&Array.isArray(state.workOrders)?state.workOrders.filter(function(x){return x.status!=="Completed";}):[];
    var programCount=0;
    if(state&&state.programs){
      programCount=(state.programs.lessons||[]).length+
        (state.programs.parties||[]).length+
        (state.programs.team||[]).length+
        (state.programs.aquaticClass||[]).length;
    }

    return{
      guards:guards,
      needed:needed,
      demand:Math.round(demand),
      capacity:capacity.operatingCapacity||0,
      water:waterLabel,
      chlorine:state&&state.water?state.water.chlorine:"--",
      ph:state&&state.water?state.water.ph:"--",
      inventoryAlerts:inv.length,
      openWork:work.length,
      programs:programCount,
      incidents:0
    };
  }

  function renderReportSystemData(){
    var values=report2SystemValues();
    var facility=reportFacilityName();

    if(r2("reportCenterFacilityContext"))r2("reportCenterFacilityContext").textContent="Building reports for "+facility;

    if(r2("report2SystemSnapshot")){
      r2("report2SystemSnapshot").innerHTML=[
        ["Facility",facility],
        ["Forecast attendance",values.demand],
        ["Guards available",values.guards],
        ["Operating capacity",values.capacity],
        ["Water status",values.water],
        ["Open work orders",values.openWork]
      ].map(function(item){
        return'<div class="report2-snapshot-item"><span>'+item[0]+'</span><b>'+item[1]+'</b></div>';
      }).join("");
    }

    if(r2("report2AttendanceData")){
      r2("report2AttendanceData").innerHTML=
        "<p>Forecast attendance: <b>"+values.demand+"</b></p>"+
        "<p>Available guards: <b>"+values.guards+"</b> of <b>"+values.needed+"</b> needed</p>"+
        "<p>Staffing-controlled capacity: <b>"+values.capacity+"</b></p>";
    }

    if(r2("report2WaterData")){
      r2("report2WaterData").innerHTML=
        "<p>Water status: <b>"+values.water+"</b></p>"+
        "<p>Chlorine: <b>"+values.chlorine+"</b></p>"+
        "<p>pH: <b>"+values.ph+"</b></p>";
    }

    if(r2("report2ProgramData")){
      r2("report2ProgramData").innerHTML=
        "<p>Scheduled program blocks: <b>"+values.programs+"</b></p>"+
        "<p>Program configuration follows the selected facility.</p>";
    }

    if(r2("report2OperationsData")){
      r2("report2OperationsData").innerHTML=
        "<p>Inventory alerts: <b>"+values.inventoryAlerts+"</b></p>"+
        "<p>Open maintenance work orders: <b>"+values.openWork+"</b></p>";
    }

    if(r2("report2Manager")&&!r2("report2Manager").value){
      r2("report2Manager").value=(state&&state.managerName)||"";
    }
    if(r2("report2Signature")&&!r2("report2Signature").value){
      r2("report2Signature").value=(state&&state.managerName)||"";
    }
    if(r2("report2Title")&&!r2("report2Title").value){
      r2("report2Title").value=facility+" "+r2("report2Type").value;
    }
    if(r2("report2TypeMetric")){
      r2("report2TypeMetric").textContent=r2("report2Type").value.replace(" Report","");
    }
    updateReportCompletion();
  }

  function managerFieldIds(){
    return[
      "report2Summary",
      "report2WentWell",
      "report2Challenges",
      "report2StaffNotes",
      "report2SafetyNotes",
      "report2FollowUp",
      "report2Handoff",
      "report2Signature"
    ];
  }

  function updateReportCompletion(){
    var fields=managerFieldIds();
    var completed=fields.filter(function(id){
      var el=r2(id);
      return el&&el.value.trim();
    }).length;
    var percent=Math.round(completed/fields.length*100);
    if(r2("report2CompletionMetric"))r2("report2CompletionMetric").textContent=percent+"%";
    if(r2("report2CompletionNote")){
      r2("report2CompletionNote").textContent=percent===100
        ?"Manager sections complete"
        :(fields.length-completed)+" manager field(s) remaining";
    }
  }

  function collectReport(){
    return{
      id:"RPT-"+Date.now(),
      facilityId:reportFacilityId(),
      facilityName:reportFacilityName(),
      type:r2("report2Type").value,
      date:r2("report2Date").value,
      manager:r2("report2Manager").value.trim(),
      shift:r2("report2Shift").value,
      title:r2("report2Title").value.trim(),
      summary:r2("report2Summary").value.trim(),
      wentWell:r2("report2WentWell").value.trim(),
      challenges:r2("report2Challenges").value.trim(),
      staffNotes:r2("report2StaffNotes").value.trim(),
      safetyNotes:r2("report2SafetyNotes").value.trim(),
      followUp:r2("report2FollowUp").value.trim(),
      handoff:r2("report2Handoff").value.trim(),
      reviewStatus:r2("report2ReviewStatus").value,
      signature:r2("report2Signature").value.trim(),
      reviewDate:r2("report2ReviewDate").value,
      supervisorComments:r2("report2SupervisorComments").value.trim(),
      systemSnapshot:report2SystemValues(),
      savedAt:new Date().toISOString()
    };
  }

  function requiredReportFieldsComplete(report){
    return Boolean(
      report.manager &&
      report.title &&
      report.summary &&
      report.wentWell &&
      report.challenges &&
      report.staffNotes &&
      report.followUp &&
      report.signature
    );
  }

  function saveDraft(finalize){
    var report=collectReport();
    if(finalize&&!requiredReportFieldsComplete(report)){
      r2("report2StatusMessage").textContent="Complete the required manager-entry sections before finalizing.";
      return;
    }
    if(finalize){
      report.reviewStatus="Final";
      r2("report2ReviewStatus").value="Final";
    }
    reportHistory.unshift(report);
    saveReportHistory();
    renderReportHistory();
    r2("report2StatusMessage").textContent=finalize?"Report finalized and saved.":"Draft saved.";
  }

  function clearReport(){
    [
      "report2Summary","report2WentWell","report2Challenges","report2StaffNotes",
      "report2SafetyNotes","report2FollowUp","report2Handoff","report2SupervisorComments"
    ].forEach(function(id){if(r2(id))r2(id).value="";});
    r2("report2ReviewStatus").value="Draft";
    r2("report2ReviewDate").value=todayISO();
    r2("report2Date").value=todayISO();
    r2("report2Title").value=reportFacilityName()+" "+r2("report2Type").value;
    updateReportCompletion();
    r2("report2StatusMessage").textContent="New report started.";
  }

  function renderReportHistory(){
    var query=(r2("report2HistorySearch")?r2("report2HistorySearch").value:"").toLowerCase();
    var filtered=reportHistory.filter(function(report){
      return !query||
        String(report.title||"").toLowerCase().includes(query)||
        String(report.manager||"").toLowerCase().includes(query)||
        String(report.facilityName||"").toLowerCase().includes(query);
    });

    if(!r2("report2History"))return;
    r2("report2History").innerHTML=filtered.length?filtered.map(function(report){
      return'<div class="report2-history-item"><div><b>'+report.title+'</b><div class="small">'+report.facilityName+' • '+report.date+' • '+report.manager+' • '+report.reviewStatus+'</div></div><button class="btn secondary" type="button" data-report2-load="'+report.id+'">Open</button></div>';
    }).join(""):'<p class="small">No saved reports match the search.</p>';

    r2("report2History").querySelectorAll("[data-report2-load]").forEach(function(button){
      button.addEventListener("click",function(){
        var report=reportHistory.find(function(item){return item.id===button.dataset.report2Load;});
        if(!report)return;
        r2("report2Type").value=report.type;
        r2("report2Date").value=report.date;
        r2("report2Manager").value=report.manager;
        r2("report2Shift").value=report.shift;
        r2("report2Title").value=report.title;
        r2("report2Summary").value=report.summary;
        r2("report2WentWell").value=report.wentWell;
        r2("report2Challenges").value=report.challenges;
        r2("report2StaffNotes").value=report.staffNotes;
        r2("report2SafetyNotes").value=report.safetyNotes;
        r2("report2FollowUp").value=report.followUp;
        r2("report2Handoff").value=report.handoff;
        r2("report2ReviewStatus").value=report.reviewStatus;
        r2("report2Signature").value=report.signature;
        r2("report2ReviewDate").value=report.reviewDate;
        r2("report2SupervisorComments").value=report.supervisorComments;
        updateReportCompletion();
        r2("report2StatusMessage").textContent="Saved report opened.";
      });
    });
  }

  function reportText(){
    var report=collectReport();
    return[
      report.title,
      report.facilityName+" | "+report.date+" | "+report.shift,
      "Manager: "+report.manager,
      "",
      "MANAGER SUMMARY",
      report.summary,
      "",
      "WHAT WENT WELL",
      report.wentWell,
      "",
      "CHALLENGES",
      report.challenges,
      "",
      "STAFFING NOTES",
      report.staffNotes,
      "",
      "SAFETY NOTES",
      report.safetyNotes,
      "",
      "FOLLOW-UP",
      report.followUp,
      "",
      "HANDOFF",
      report.handoff,
      "",
      "STATUS: "+report.reviewStatus,
      "SIGNED: "+report.signature
    ].join("\n");
  }

  function downloadText(filename,text,type){
    var blob=new Blob([text],{type:type||"text/plain"});
    var link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download=filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function bindReportCenter2(){
    if(!r2("reports"))return;

    loadReportHistory();
    r2("report2Date").value=todayISO();
    r2("report2ReviewDate").value=todayISO();

    ["report2Type","report2Manager","report2Title"].forEach(function(id){
      var el=r2(id);if(el)el.addEventListener("change",renderReportSystemData);
    });

    managerFieldIds().forEach(function(id){
      var el=r2(id);if(el)el.addEventListener("input",updateReportCompletion);
    });

    r2("report2GenerateButton").addEventListener("click",renderReportSystemData);
    r2("report2NewButton").addEventListener("click",clearReport);
    r2("report2SaveDraftButton").addEventListener("click",function(){saveDraft(false);});
    r2("report2FinalizeButton").addEventListener("click",function(){saveDraft(true);});
    r2("report2PrintButton").addEventListener("click",function(){window.print();});
    r2("report2PdfButton").addEventListener("click",function(){
      downloadText("AquaIQPro_Report_"+todayISO()+".txt",reportText(),"text/plain");
      r2("report2StatusMessage").textContent="Printable report file downloaded.";
    });
    r2("report2ExcelButton").addEventListener("click",function(){
      var report=collectReport();
      var rows=[
        ["Field","Value"],
        ["Title",report.title],
        ["Facility",report.facilityName],
        ["Date",report.date],
        ["Manager",report.manager],
        ["Shift",report.shift],
        ["Summary",report.summary],
        ["What Went Well",report.wentWell],
        ["Challenges",report.challenges],
        ["Staffing Notes",report.staffNotes],
        ["Safety Notes",report.safetyNotes],
        ["Follow-Up",report.followUp],
        ["Handoff",report.handoff],
        ["Review Status",report.reviewStatus],
        ["Signature",report.signature]
      ];
      var csv=rows.map(function(row){
        return row.map(function(cell){return'"'+String(cell||"").replace(/"/g,'""')+'"';}).join(",");
      }).join("\n");
      downloadText("AquaIQPro_Report_"+todayISO()+".csv",csv,"text/csv");
      r2("report2StatusMessage").textContent="Excel-compatible CSV downloaded.";
    });

    r2("report2HistorySearch").addEventListener("input",renderReportHistory);

    var facilitySelect=r2("facilitySelect");
    if(facilitySelect){
      facilitySelect.addEventListener("change",function(){
        renderReportSystemData();
      });
    }

    renderReportSystemData();
    renderReportHistory();
  }

  bindReportCenter2();
})();

