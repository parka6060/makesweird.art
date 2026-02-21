const $=id=>document.getElementById(id),L=localStorage;
const H=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return(h%0xFFFF).toString(36)};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ADJ=['bold','brave','calm','cool','cozy','cute','dark','deep','fair','fast','free','glad','gold','hazy','keen','kind','loud','lush','mild','neat','odd','pale','raw','shy','soft','warm','wild','swift','quiet','tiny','vast','wise','zany','silly','dumb','green','orange','happy','friendly','liminal','dorky','teal'];
const NOUN=['bear','bird','bone','cave','clay','crow','dawn','deer','dusk','fawn','fire','fish','frog','glow','hare','hawk','jade','lake','leaf','moth','mist','moss','newt','pine','reed','seed','snow','star','wren','yarn','wolf','owl','box','mouse','teddy','soy','beat','mlg','penguin','egg','oli','boo','sky','rain','stream','friend','weirdo','drawing'];

const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,'0')).join('');
let tok=L.getItem('tok');
if(!tok){
const pick=a=>a[Math.random()*a.length|0];
const gen=()=>pick(ADJ)+'-'+pick(NOUN)+'-'+(1000+(Math.random()*9000|0))+'-'+hex();
tok=gen();L.setItem('tok',tok);
(async()=>{for(let i=0;i<5;i++){
const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:tok})});
const d=await r.json();if(d.ok)return;
if(d.error==='taken'){tok=gen();L.setItem('tok',tok);continue}
return}})()}
const api=(path,body)=>fetch(path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(body)});

if(location.hash.startsWith('#x')){
const[b,sig]=location.hash.slice(1).split('.'),p=b.split(':');
const n=p[0].slice(1),hasName=p.length>2;
const who=hasName?decodeURIComponent(p[p.length-1]):'';
const thing=decodeURIComponent(p.slice(1,hasName?-1:undefined).join(':')||'weird art');
const payload=who?n+':'+thing+':'+who:n+':'+thing;
const dw=n==='1'?'day':'days';
if(sig!==H(payload)){$('main').innerHTML='<p>nice try.</p>'}
else{$('main').innerHTML='<p>'+esc(who||'someone')+' made '+esc(thing)+'<br>for '+esc(n)+' '+dw+' straight.</p>'}
}else{
const t=$('t'),t2=$('t2'),c=$('c'),l=$('l'),sub=$('sub'),tag=$('tag'),dots=$('dots'),mk=$('mk');
const today=new Date().toISOString().slice(0,10);
const last=L.getItem('d'),gap=last?Math.round((new Date(today)-new Date(last))/864e5):0;
let streak=gap>=3?0:(+L.getItem('n')||0),hist=JSON.parse(L.getItem('h')||'[]');
const san=s=>(s||'').replace(/[^a-zA-Z0-9 .,!?'\-]/g,'').replace(/[\x00-\x1f]/g,'').trim().slice(0,40)||'weird art';
const save=v=>{const val=san(v);t.textContent=t2.textContent=val;L.setItem('t',val)};
save(L.getItem('t')?? 'weird art');
t.onclick=()=>{
if(t.isContentEditable)return;
t.setAttribute('contenteditable','');t.focus();
const r=document.createRange();r.selectNodeContents(t);
const s=getSelection();s.removeAllRanges();s.addRange(r);
};
t.onblur=()=>{t.removeAttribute('contenteditable');save(t.textContent.trim());if(last===today)api('/api/thing',{thing:san(t.textContent)}).catch(()=>{})};
t.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();t.blur()}};
function renderDots(){
if(!hist.length){dots.innerHTML='';return}let m=0,h='';
for(let d=new Date(hist[0]);d<=new Date(today);d.setDate(d.getDate()+1)){
if(hist.includes(d.toISOString().slice(0,10))){h+='<span class=on></span>';m=0}else{m++;h+='<span'+(m>=2?' class=x':'')+'></span>'}}
dots.innerHTML=h}
renderDots();
tag.textContent=streak?`(x${streak})`:'';tag.title=streak?'click to copy share link':'';
if(last===today){sub.textContent='nice. see you tomorrow.';c.checked=c.disabled=true;l.style.opacity=.4;mk.textContent='made';
fetch('/api/sync',{headers:{'Authorization':'Bearer '+tok}}).then(r=>r.json()).then(d=>{
if(d.streak){L.setItem('n',d.streak);streak=d.streak;tag.textContent=`(x${streak})`}
if(d.hist&&d.hist.length){hist=[...new Set([...hist,...d.hist])].sort();L.setItem('h',JSON.stringify(hist));renderDots()}
}).catch(()=>{})}
else if(gap>=3)sub.textContent="it's okay. start again whenever you're ready.";
else if(gap===2)sub.textContent='missed a day \u2014 you still got this.';
else sub.textContent='use your hands. keep it simple.';
c.onchange=()=>{
if(!c.checked)return;
streak=gap<=2?streak+1:1;hist.push(today);
L.setItem('d',today);L.setItem('n',streak);L.setItem('h',JSON.stringify(hist));
c.disabled=true;l.style.opacity=.4;mk.textContent='made';
sub.textContent='nice. see you tomorrow.';tag.textContent=`(x${streak})`;renderDots();
api('/api/checkin',{thing:san(t.textContent)}).then(r=>r.json()).then(d=>{if(d.ok&&d.streak&&d.streak!==streak){streak=d.streak;L.setItem('n',streak);tag.textContent=`(x${streak})`}}).catch(()=>{});
};
tag.onclick=()=>{
if(streak<1)return;
const name=L.getItem('username')||'',thing=encodeURIComponent(t.textContent);
const payload=streak+':'+t.textContent+(name?':'+name:'');
const sig=H(payload),nameEnc=name?':'+encodeURIComponent(name):'';
navigator.clipboard.writeText(location.origin+'#x'+streak+':'+thing+nameEnc+'.'+sig);
const prev=tag.textContent;tag.textContent='copied!';
setTimeout(()=>tag.textContent=prev,1200);
};
}