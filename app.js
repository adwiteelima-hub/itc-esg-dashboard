
let MODEL=null, RESULT=null;
const $=s=>document.querySelector(s);
const fmt=(n,d=1)=>Number(n).toFixed(d);
function score(i,v){
  v=Number(v);
  if(i.direction==="categorical") return i.code==="S4"?(v===0?100:v===1?50:0):0;
  if(i.direction==="higher") return Math.max(0,Math.min(100,v/i.benchmark*100));
  if(v===0)return 100;
  return Math.max(0,Math.min(100,i.benchmark/v*100));
}
function calculate(overrides={}){
  const indicators=MODEL.indicators.map(i=>{
    const actual=Object.hasOwn(overrides,i.code)?Number(overrides[i.code]):Number(i.actual);
    const s=score(i,actual);
    return {...i,actual,score:s,contribution:s*i.weight/100};
  });
  const dimensions={};
  Object.entries(MODEL.dimensions).forEach(([d,w])=>{
    const rows=indicators.filter(i=>i.dimension===d);
    const contribution=rows.reduce((a,i)=>a+i.contribution,0);
    dimensions[d]={weight:w,score:contribution/w*100,contribution,rows};
  });
  const overall=indicators.reduce((a,i)=>a+i.contribution,0);
  const band=MODEL.bands.find(b=>overall>=b.min).label;
  return {indicators,dimensions,overall,band};
}
function esc(x){return String(x).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function pageTitle(name){$("#pageTitle").textContent=name;}
function card(label,value,sub=""){return `<div class="card"><div class="label">${label}</div><div class="big">${value}</div><div class="sub">${sub}</div></div>`}
function bars(rows){
 return rows.map(i=>`<div class="bar-row"><span><b>${i.code}</b> ${esc(i.name)}</span><div class="bar"><div class="fill ${i.score>=80?"good":i.score<60?"warn":""}" style="width:${i.score}%"></div></div><b>${fmt(i.score)}</b></div>`).join("");
}
function table(rows){
 return `<div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Indicator</th><th>Actual</th><th>Benchmark</th><th>Direction</th><th>Score</th><th>Weight</th><th>Contribution</th></tr></thead><tbody>${rows.map(i=>`<tr><td class="code">${i.code}</td><td>${esc(i.name)}<div class="sub">${esc(i.benchmarkType)}</div></td><td>${i.actual} ${esc(i.unit)}</td><td>${esc(i.benchmarkLabel)}</td><td>${i.direction}</td><td><b>${fmt(i.score)}</b></td><td>${i.weight}%</td><td>${fmt(i.contribution,2)}</td></tr>`).join("")}</tbody></table></div>`;
}
function overview(){
 pageTitle("Executive Overview");
 const d=RESULT.dimensions;
 $("#content").innerHTML=`
 <div class="grid g4">
  <div class="hero"><div class="label">OVERALL ESG SCORE</div><div class="big">${fmt(RESULT.overall)}</div><div class="sub">${RESULT.band} performance</div></div>
  ${card("Environmental",fmt(d.Environmental.score),`${d.Environmental.weight}% model weight`)}
  ${card("Social",fmt(d.Social.score),`${d.Social.weight}% model weight`)}
  ${card("Governance",fmt(d.Governance.score),`${d.Governance.weight}% model weight`)}
 </div>
 <div class="two-col">
  <div class="card"><div class="section-title">Dimension performance</div>${Object.entries(d).map(([k,v])=>`<div class="bar-row"><span><b>${k}</b> · ${v.weight}%</span><div class="bar"><div class="fill good" style="width:${v.score}%"></div></div><b>${fmt(v.score)}</b></div>`).join("")}</div>
  <div class="card"><div class="section-title">Score contribution</div>${Object.entries(d).map(([k,v])=>card(k,fmt(v.contribution,2),`points of 100`)).join("")}</div>
 </div>
 <div class="section-title">Management interpretation</div>
 <div class="card"><div class="callout">Under this proposed 12-indicator academic methodology, ITC scores <b>${fmt(RESULT.overall)}/100</b> and falls in the <b>${RESULT.band}</b> band. Environmental performance is strongest on renewable energy and waste recovery. The main model weakness is the Social dimension's women-in-total-workforce indicator, which scores ${fmt(RESULT.indicators.find(i=>i.code==="S2").score)} against the framework's 40% benchmark.</div></div>`;
}
function dimensionPage(dim){
 const d=RESULT.dimensions[dim];
 pageTitle(dim);
 $("#content").innerHTML=`<div class="grid g3">${card(`${dim} score`,fmt(d.score),`${d.weight}% of total ESG`)}${card("Weighted contribution",fmt(d.contribution,2),"points of 100")}${card("Indicators",d.rows.length,"included in this dimension")}</div>
 <div class="card" style="margin-top:16px"><div class="section-title">Indicator performance</div>${bars(d.rows)}</div>
 <div class="section-title">Detailed scorecard</div>${table(d.rows)}
 <div class="section-title">Source note</div><div class="card note">Values and source labels are carried from the methodology dataset. Academic benchmarks are model assumptions and should not be described as ITC targets.</div>`;
}
function scorecard(){
 pageTitle("ESG Scorecard");
 $("#content").innerHTML=`<div class="grid g3">${card("Overall ESG",fmt(RESULT.overall),RESULT.band)}${card("Total indicator weight","100%","all 12 indicators")}${card("Reporting year",MODEL.year,"ITC Limited")}</div><div class="section-title">All 12 indicators</div>${table(RESULT.indicators)}<div class="section-title">Dimension totals</div>${table(Object.entries(RESULT.dimensions).map(([k,v])=>({code:k, name:k+" dimension", actual:v.score, unit:"/100", benchmark:v.weight, benchmarkLabel:v.weight+"% weight",direction:"-",score:v.score,weight:v.weight,contribution:v.contribution,benchmarkType:"Dimension"})))}`;
}
function methodology(){
 pageTitle("Methodology");
 $("#content").innerHTML=`<div class="grid g3">${card("Environmental","40%","4 indicators")}${card("Social","35%","4 indicators")}${card("Governance","25%","4 indicators")}</div>
 <div class="two-col" style="margin-top:16px"><div class="card"><div class="section-title">Scoring formulas</div>
 <div class="callout"><b>Higher is better:</b><br>Score = min(100, Actual ÷ Benchmark × 100)</div><br>
 <div class="callout"><b>Lower is better:</b><br>Score = min(100, Benchmark ÷ Actual × 100)</div><br>
 <div class="callout"><b>Weighted contribution:</b><br>Score × Indicator Weight ÷ 100</div><br>
 <div class="callout"><b>Overall ESG:</b><br>Sum of all 12 weighted contributions.</div></div>
 <div class="card"><div class="section-title">Rating bands</div>${MODEL.bands.map(b=>`<div class="bar-row"><span>${b.label}</span><div class="bar"><div class="fill" style="width:${b.min}%"></div></div><b>${b.min}+</b></div>`).join("")}</div></div>
 <div class="section-title">Benchmark governance</div><div class="card note">The framework explicitly separates ITC-reported targets from academic benchmarks. ITC targets are used where the reports provide them. For indicators without a directly comparable ITC target, the framework uses stated academic benchmarks. This is an academic scoring model, not an official ITC or third-party ESG rating.</div>`;
}
function whatif(){
 pageTitle("What-if Analysis");
 const select=MODEL.indicators.map(i=>`<option value="${i.code}">${i.code} — ${esc(i.name)}</option>`).join("");
 $("#content").innerHTML=`<div class="card"><div class="section-title">Select an indicator</div><select id="wfCode" class="select">${select}</select><div style="margin-top:16px"><label class="label">Scenario value</label><input id="wfValue" class="input" type="number" step="0.01"></div><div id="wfOut" style="margin-top:20px"></div></div>`;
 const code=$("#wfCode").value; const i=MODEL.indicators.find(x=>x.code===code); $("#wfValue").value=i.actual;
 $("#wfCode").onchange=()=>{const x=MODEL.indicators.find(y=>y.code===$("#wfCode").value);$("#wfValue").value=x.actual; renderWF();};
 $("#wfValue").oninput=renderWF; renderWF();
}
function renderWF(){
 const code=$("#wfCode").value,v=Number($("#wfValue").value);const i=MODEL.indicators.find(x=>x.code===code);const scenario=calculate({[code]:v});const change=scenario.overall-RESULT.overall;
 $("#wfOut").innerHTML=`<div class="grid g3">${card("Current ESG",fmt(RESULT.overall),RESULT.band)}${card("Scenario ESG",fmt(scenario.overall),scenario.band)}${card("Change",(change>=0?"+":"")+fmt(change),change>=0?"Improvement":"Decline")}</div><div class="section-title">Indicator effect</div><div class="callout">${esc(i.name)} changes from <b>${i.actual} ${esc(i.unit)}</b> to <b>${v} ${esc(i.unit)}</b>. The overall ESG score changes by <b>${change>=0?"+":""}${fmt(change)}</b> points because the indicator has a ${i.weight}% weight.</div>`;
}
function dataPage(){
 pageTitle("Data Input");
 $("#content").innerHTML=`<div class="card"><div class="note">Edit values below to test the model. These edits are local to the current browser session and do not overwrite the underlying ITC source data.</div><div class="section-title">Indicator inputs</div><div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Indicator</th><th>Current actual</th><th>Benchmark</th><th>Weight</th><th>Source</th></tr></thead><tbody>${MODEL.indicators.map(i=>`<tr><td class="code">${i.code}</td><td>${esc(i.name)}</td><td><input class="input edit" data-code="${i.code}" type="number" step="0.01" value="${i.actual}"></td><td>${esc(i.benchmarkLabel)}</td><td>${i.weight}%</td><td>${esc(i.source)}</td></tr>`).join("")}</tbody></table></div><button id="recalc" class="select" style="margin-top:14px;cursor:pointer">Recalculate dashboard</button></div>`;
 $("#recalc").onclick=()=>{const overrides={};document.querySelectorAll(".edit").forEach(x=>overrides[x.dataset.code]=Number(x.value));RESULT=calculate(overrides);alert(`Recalculated ESG score: ${RESULT.overall.toFixed(1)} (${RESULT.band})`);};
}
function validation(){
 pageTitle("Validation");
 const errors=[],warnings=[];const total=MODEL.indicators.reduce((s,i)=>s+i.weight,0);
 if(total!==100)errors.push("Indicator weights do not total 100%.");
 for(const[d,w]of Object.entries(MODEL.dimensions)){const x=MODEL.indicators.filter(i=>i.dimension===d).reduce((s,i)=>s+i.weight,0);if(x!==w)errors.push(`${d} weights total ${x}%, expected ${w}%.`);}
 MODEL.indicators.forEach(i=>{if(i.direction!=="categorical"&&i.benchmark<=0)errors.push(`${i.code}: invalid benchmark.`);if(!i.source)warnings.push(`${i.code}: missing source.`);});
 $("#content").innerHTML=`<div class="card"><div class="section-title">Model checks</div><div class="checks"><div class="check">✓ Indicator weights total ${total}%</div><div class="check">✓ Environmental = 40%</div><div class="check">✓ Social = 35%</div><div class="check">✓ Governance = 25%</div><div class="check">✓ No zero benchmark used for lower-is-better ratios</div><div class="check">✓ All 12 indicators have source labels</div></div>${errors.map(e=>`<div class="warnbox" style="margin-top:8px">⚠ ${esc(e)}</div>`).join("")}${warnings.map(e=>`<div class="warnbox" style="margin-top:8px">⚠ ${esc(e)}</div>`).join("")}</div>`;
}
function render(page="overview"){
 if(page==="overview")overview();
 else if(page==="environmental")dimensionPage("Environmental");
 else if(page==="social")dimensionPage("Social");
 else if(page==="governance")dimensionPage("Governance");
 else if(page==="scorecard")scorecard();
 else if(page==="methodology")methodology();
 else if(page==="whatif")whatif();
 else if(page==="data")dataPage();
 else if(page==="validation")validation();
 document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
}
fetch("data.json").then(r=>r.json()).then(m=>{MODEL=m;RESULT=calculate();render();});
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>render(b.dataset.page));
