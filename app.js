import {currencies, validPair, convert, getFxRates, sampleRates} from './rates.js';
const $ = id => document.getElementById(id);
const from=$('select-from'), to=$('select-to'), period=$('periodSelect'), amount=$('betrag');
const result=$('currency-result'), detail=$('rate-detail'), status=$('status'), chart=$('chart');
let current=null, generation=0, controller, sample=false;
const fmt=(n,d=4)=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:d}).format(n);
for(const select of [from,to]) for(const code of currencies) select.add(new Option(code,code));
from.value='EUR';to.value='USD';
function setStatus(message,error=false){status.textContent=message;status.dataset.error=String(error);}
function calculate(){
  if(!current){result.textContent='–';return;}
  try{if(amount.value.trim()==='')throw new Error();result.textContent=`${fmt(convert(Number(amount.value),current.rate),4)} ${current.quote}`;}
  catch{result.textContent='Ungültiger Betrag';}
}
function drawHistory(history,quote){
  chart.replaceChildren();
  if(!history.length){chart.textContent='Kein Kursverlauf verfügbar oder beide Währungen sind identisch.';return;}
  const NS='http://www.w3.org/2000/svg', w=780,h=270,left=84,right=18,top=16,bottom=42;
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('aria-hidden','true');
  const el=(name,attrs,text)=>{const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.append(n);return n;};
  const values=history.map(p=>p.rate), lo=Math.min(...values), hi=Math.max(...values), pad=Math.max((hi-lo)*.15,Math.abs(hi)*.001,1e-9), min=lo-pad,max=hi+pad;
  const times=history.map(p=>Date.parse(p.date)), first=times[0],last=times.at(-1);
  const x=i=>left+(last===first?.5:(times[i]-first)/(last-first))*(w-left-right),y=v=>top+(max-v)/(max-min)*(h-top-bottom);
  for(let i=0;i<=4;i++){const v=max-(max-min)*i/4,yy=y(v);el('line',{x1:left,y1:yy,x2:w-right,y2:yy,stroke:'#dbe4e5'});el('text',{x:left-8,y:yy+4,'text-anchor':'end','font-size':12,fill:'#52646d'},fmt(v,5));}
  el('polyline',{points:history.map((p,i)=>`${x(i)},${y(p.rate)}`).join(' '),fill:'none',stroke:'#176b65','stroke-width':2.5,'stroke-linejoin':'round'});
  for(const [i,p] of history.entries()){const c=el('circle',{cx:x(i),cy:y(p.rate),r:3,fill:'#176b65'});const t=document.createElementNS(NS,'title');t.textContent=`${p.date}: ${fmt(p.rate,6)} ${quote}`;c.append(t);}
  for(const i of new Set([0,Math.floor((history.length-1)/2),history.length-1]))el('text',{x:x(i),y:h-16,'text-anchor':i===0?'start':i===history.length-1?'end':'middle','font-size':12,fill:'#52646d'},history[i].date);
  chart.append(svg);chart.setAttribute('aria-label',`Kursverlauf von ${history[0].date} bis ${history.at(-1).date}: ${fmt(history[0].rate,5)} bis ${fmt(history.at(-1).rate,5)} ${quote}`);
}
async function refresh(){
  const id=++generation;controller?.abort();controller=new AbortController();
  current=null;calculate();detail.textContent='Kurse werden geladen …';chart.textContent='Kursverlauf wird geladen …';setStatus('');
  const ownController=controller;
  const timeout=setTimeout(()=>ownController.abort(),12000);
  try{
    const data=sample?sampleRates(from.value,to.value,Number(period.value)):await getFxRates(from.value,to.value,Number(period.value),ownController.signal);
    if(id!==generation)return null;
    current=data;calculate();detail.textContent=`1 ${data.base} = ${fmt(data.rate,6)} ${data.quote}${data.date?' · Stand '+data.date:''}`;
    drawHistory(data.history,data.quote);$('chart-caption').textContent=data.sample?'Fiktiver Kursverlauf – keine echten Marktdaten.':'Tägliche EZB-Referenzkurse, keine Börsen-Livekurse.';
    setStatus(data.sample?'Beispielmodus: Alle angezeigten Kurse sind fiktiv.':'Referenzkurs geladen.');return data;
  }catch(e){if(id!==generation)return null;result.textContent='–';detail.textContent='Kein Kurs geladen.';chart.textContent='Kein Kursverlauf verfügbar.';setStatus('Abruf fehlgeschlagen. Erneut versuchen oder Beispieldaten wählen. '+(e.name==='AbortError'?'Zeitlimit erreicht.':e.message),true);throw e;}
  finally{clearTimeout(timeout);}
}
function refreshUI(){refresh().catch(()=>{});}
$('converter').addEventListener('submit',e=>{e.preventDefault();if(current)calculate();else refreshUI();});
amount.addEventListener('input',calculate);[from,to,period].forEach(n=>n.addEventListener('change',refreshUI));
$('swap').addEventListener('click',()=>{[from.value,to.value]=[to.value,from.value];refreshUI();});
$('sample').addEventListener('click',()=>{sample=!sample;$('sample').textContent=sample?'Echte Referenzkurse abrufen':'Mit Beispieldaten testen';refreshUI();});
// Standard: nur gleiches Origin. Abweichende Elternseite muss explizit angegeben sein.
let allowedOrigin=location.origin;
try{const p=new URLSearchParams(location.search).get('parentOrigin');if(p){const u=new URL(p);if(['http:','https:'].includes(u.protocol)&&u.origin===p)allowedOrigin=u.origin;}}catch{}
window.addEventListener('message',async e=>{
  if(window.parent===window||e.source!==window.parent||e.origin!==allowedOrigin)return;
  const {type,payload,requestId}=e.data||{};if(!['getFxRates','setCurrency'].includes(type))return;
  const f=payload?.from??from.value,t=payload?.to??to.value,p=Number(payload?.period??period.value);
  const reply=(type,payload)=>e.source.postMessage({type,payload,requestId},e.origin);
  if(!validPair(f,t,p)){reply('fxError',{message:'Ungültige Eingabe'});return;}
  from.value=f;to.value=t;period.value=String(p);
  try{const data=await refresh();if(data)reply('fxData',{...data,timestamp:Date.now()});else reply('fxError',{message:'Anfrage durch neue Auswahl ersetzt'});}
  catch{reply('fxError',{message:'Kursabruf fehlgeschlagen'});}
});
refreshUI();
