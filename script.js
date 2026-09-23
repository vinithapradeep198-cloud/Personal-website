/* ================================================================
   ✦★ AASHVIN — SHARED CONFIG + ENGINE ★✦
   Edit the CONFIG below to control the ENTIRE site.
================================================================ */
const CONFIG = {
  name: "Aashvin",
  displayName: "AASHVIN ♡",
  handle: "@aashvyn",
  bio: "Smoke some weeds 🚬 and create something fucking awesome",
  location: "📍 Kerala, IN • Online Now",
  email: "aashvinpradeep@gmail.com",
  socials: [
    { id:"instagram", label:"Instagram", handle:"@aashvyn", followers:"MAIN", sub:"tap to open", url:"https://www.instagram.com/aashvyn?stkn=MTJyZDV6MmdwMnRueQ%3D%3D&utm_source=qr", color:"ig", icon:"📸", badge:"MAIN ACCOUNT ★" },
    { id:"instagram2", label:"Instagram", handle:"@awbonki", followers:"2ND", sub:"tap to open", url:"https://www.instagram.com/awbonki?stkn=NHk0NWlnbjV3Mnlh&utm_source=qr", color:"ig", icon:"📸", badge:"2ND ACCOUNT" },
    { id:"instagram3", label:"Instagram", handle:"@girlsluvmydih", followers:"VAULT", sub:"tap to open", url:"https://www.instagram.com/girlsluvmydih?stkn=NDloZG5jcnI1aWt3&utm_source=qr", color:"ig", icon:"📸", badge:"VAULT • GIRLSLUV" },
    { id:"x", label:"X / Twitter", handle:"@aashvynx", followers:"FOLLOW", sub:"on X", url:"https://x.com/aashvynx?s=11", color:"tk", icon:"𝕏", badge:"X FEED • LIVE" },
    { id:"spotify", label:"Spotify", handle:"Aashvin", followers:"LISTEN", sub:"playlists", url:"https://open.spotify.com/playlist/5J7HPpBU72Zn54Ti4fXZV9?si=7c2xYGCnRd6udq-SX8dCYA&utm_source=copy-link&pi=PkvQxWPWT3icN", color:"sp", icon:"♫", badge:"PLAYLIST • LIVE" },
    { id:"snapchat", label:"Add More", handle:"@aashvyn", followers:"+", sub:"customize me", url:"#", color:"pi", icon:"＋", badge:"EDIT IN CONFIG" },
  ],
  quickLinks: [
    { icon:"𝕏", title:"X / Twitter — @aashvynx", desc:"Follow my thoughts & updates", url:"https://x.com/aashvynx?s=11" },
    { icon:"📸", title:"Instagram Main — @aashvyn", desc:"My primary world — daily drops", url:"https://www.instagram.com/aashvyn?stkn=MTJyZDV6MmdwMnRueQ%3D%3D&utm_source=qr" },
    { icon:"✉", title:"Contact Email", desc:"aashvinpradeep@gmail.com", url:"mailto:aashvinpradeep@gmail.com" },
    { icon:"🔗", title:"Share This Profile", desc:"Copy link & send to friends", url:"https://aashvin.vercel.app/" },
  ],
  tracks: [
    { title:"Midnight Neon", artist:"Aashvin's Lo-Fi • 85 BPM", dur:"2:47", key:0 },
    { title:"Pixel Dreams", artist:"Cyber Chill • 82 BPM", dur:"3:12", key:1 },
    { title:"Chill Protocol", artist:"Late Night Vibe • 88 BPM", dur:"2:58", key:2 },
  ],
  /* 🔐 CHANGE THESE BEFORE DEPLOYING! */
  admin: { user:"aashvin", pass:"aashvin2025" },

  /*
   * ★ SUPABASE CLOUD BACKEND (FREE) ★
   * -----------------------------------
   * To make files & comments GLOBAL (visible to everyone):
   *
   * 1. Go to https://supabase.com → Create free project
   * 2. Create two tables:
   *    • "files"   — columns: id (uuid PK default gen), name (text), type (text), size (int8), url (text), icon (text), ts (int8)
   *    • "comments" — columns: id (uuid PK default gen), name (text), text (text), ts (int8), admin (bool default false)
   * 3. Go to Storage → Create bucket "uploads" → set it PUBLIC
   * 4. Under Settings → API, copy your URL and anon key below:
   */
  supabase: {
    url:  "",   // e.g. "https://xyz.supabase.co"
    key:  ""    // e.g. "eyJhbGciOiJIUzI1NiIs..."
  }
};

/* ================================================================ */
"use strict";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const ACC={ig:"#ff2d95", tk:"#e7e9ea", sp:"#00ff9d", pi:"#ff2d95", pu:"#8b2dff", cy:"#00f0ff"};
const PALETTE=["#00f0ff","#ff2d95","#8b2dff","#00ff9d","#ffcc00"];
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============ GLOBAL STATE ============ */
let isAdmin=false;
try{ isAdmin=sessionStorage.getItem("aashvyn_admin")==="1"; }catch(e){}
let FILES=[], COMMENTS=[], myName="";
const NKEY="aashvyn_cname";
try{ myName=localStorage.getItem(NKEY)||""; }catch(e){}

/* ============ SUPABASE CLIENT (OPTIONAL) ============ */
let SB = null;
function initSupabase(){
  if(SB) return SB;
  if(!CONFIG.supabase.url || !CONFIG.supabase.key) return null;
  if(typeof supabase === "undefined") return null;
  try{
    const { createClient } = supabase;
    SB = createClient(CONFIG.supabase.url, CONFIG.supabase.key);
    return SB;
  }catch(e){ console.warn("Supabase init failed",e); return null; }
}

/* ============ AUDIO ENGINE ============ */
let AC=null, master, comp, analyser, musicGain, songBus, crackleBus, reverbNode, delayNode, noiseBuf, crakBuf;
let muted=false; try{muted=localStorage.getItem("aashvyn_muted")==="1";}catch(e){}
const engine={playing:false,track:0,step:0,bar:0,nextTime:0,timer:null,elapsed:0,lastNotePos:4};
let vuLevel=0;

function initAudio(){
  if(AC)return true;
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();master.gain.value=muted?0:.92;
    comp=AC.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=22;comp.ratio.value=6;comp.attack.value=.004;comp.release.value=.24;
    analyser=AC.createAnalyser();analyser.fftSize=128;analyser.smoothingTimeConstant=.82;
    master.connect(comp);comp.connect(analyser);analyser.connect(AC.destination);
    const sfxG=AC.createGain();sfxG.gain.value=.5;sfxG.connect(master);AC._sfx=sfxG;
    musicGain=AC.createGain();musicGain.gain.value=.8;musicGain.connect(master);
    songBus=AC.createGain();songBus.gain.value=0;songBus.connect(musicGain);
    const irLen=Math.floor(AC.sampleRate*1.9),ir=AC.createBuffer(2,irLen,AC.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<irLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/irLen,2.6)*.5;}
    reverbNode=AC.createConvolver();reverbNode.buffer=ir;
    const rG=AC.createGain();rG.gain.value=.35;reverbNode.connect(rG);rG.connect(musicGain);
    delayNode=AC.createDelay(1.2);delayNode.delayTime.value=.32;
    const fb=AC.createGain();fb.gain.value=.32;
    const dF=AC.createBiquadFilter();dF.type="lowpass";dF.frequency.value=2400;
    delayNode.connect(dF);dF.connect(fb);fb.connect(delayNode);
    const dO=AC.createGain();dO.gain.value=.3;dF.connect(dO);dO.connect(musicGain);dO.connect(reverbNode);
    noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
    {const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    crakBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);
    {const d=crakBuf.getChannelData(0);let rum=0,pop=0;for(let i=0;i<d.length;i++){rum=rum*.98+(Math.random()*2-1)*.02;if(Math.random()<.00045)pop=(Math.random()<.5?-1:1)*(.35+Math.random()*.6);pop*=.965;d[i]=rum*1.6+pop+(Math.random()*2-1)*.018;}}
    const cr=AC.createBufferSource();cr.buffer=crakBuf;cr.loop=true;
    const hp=AC.createBiquadFilter();hp.type="highpass";hp.frequency.value=420;
    const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=6800;
    const lfo=AC.createOscillator();lfo.frequency.value=.55;const lG=AC.createGain();lG.gain.value=.006;lfo.connect(lG);lG.connect(cr.playbackRate);lfo.start();
    crackleBus=AC.createGain();crackleBus.gain.value=0;
    cr.connect(hp);hp.connect(lp);lp.connect(crackleBus);crackleBus.connect(musicGain);cr.start();
    return true;
  }catch(e){return false;}
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function sfx(freq=1400,dur=.05,vol=.05,type="sine",slide){if(!AC||muted)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,slide),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(AC._sfx);o.start(t);o.stop(t+dur+.02);}
const sfxHover=()=>sfx(1650,.025,.014,"sine");
const sfxClick=()=>{sfx(820,.07,.05,"triangle",240);};
const sfxOpen=()=>{sfx(520,.09,.05,"sine",980);};
const sfxDing=()=>{sfx(880,.14,.05);setTimeout(()=>sfx(1318,.18,.045),70);};
const sfxPop=()=>{[69,72,76,81].forEach((m,i)=>setTimeout(()=>sfx(mtof(m),.16,.05,"triangle"),i*65));};
const sfxWhoosh=()=>{if(!AC||muted)return;const t=AC.currentTime,src=AC.createBufferSource();src.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type="bandpass";f.Q.value=1.1;f.frequency.setValueAtTime(240,t);f.frequency.exponentialRampToValueAtTime(3400,t+.28);const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09,t+.09);g.gain.exponentialRampToValueAtTime(.0001,t+.3);src.connect(f);f.connect(g);g.connect(AC._sfx);src.start(t);src.stop(t+.32);};
const sfxHack=()=>{if(!AC||muted)return;[220,330,440,660,880].forEach((f,i)=>setTimeout(()=>sfx(f,.12,.05,"square"),i*85));};

/* ============ LO-FI SEQUENCER ============ */
const SEQN=[
  {bpm:85,chords:[[57,60,64,71],[53,57,60,64],[48,52,55,59],[55,59,62,64]],scale:[57,59,60,62,64,65,67,69,71,72],kick:[0,8,10],snare:[4,12],ghost:[15],mel:[1,3,6,9,11,14],melP:.5},
  {bpm:82,chords:[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]],scale:[53,55,57,59,60,62,64,65,67,69],kick:[0,8],snare:[4,12],ghost:[14],mel:[2,5,6,10,13],melP:.45},
  {bpm:88,chords:[[52,55,59,66],[48,52,55,62],[57,60,64,67],[50,53,57,62]],scale:[52,55,57,59,60,62,64,66,67,69],kick:[0,7,8],snare:[4,12],ghost:[15],mel:[1,4,6,9,11,14],melP:.55},
];
function bpmOf(i){const t=CONFIG.tracks[i];if(t){const m=t.artist.match(/(\d+)\s*BPM/i);if(m)return+m[1];}return(SEQN[i%SEQN.length]||{}).bpm||85;}
function durOf(i){const t=CONFIG.tracks[i];if(!t)return 167;const p=t.dur.split(":");return(+p[0])*60+(+p[1]||0);}
function _kick(t,v=1){const o=AC.createOscillator(),g=AC.createGain();o.type="sine";o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(44,t+.12);g.gain.setValueAtTime(.85*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.26);o.connect(g);g.connect(songBus);o.start(t);o.stop(t+.28);}
function _snare(t,v=1){const n=AC.createBufferSource();n.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type="bandpass";f.frequency.value=1850;f.Q.value=.8;const g=AC.createGain();g.gain.setValueAtTime(.5*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.17);n.connect(f);f.connect(g);g.connect(songBus);f.connect(reverbNode);n.start(t);n.stop(t+.2);const o=AC.createOscillator();o.type="triangle";o.frequency.value=185;const og=AC.createGain();og.gain.setValueAtTime(.25*v,t);og.gain.exponentialRampToValueAtTime(.0001,t+.09);o.connect(og);og.connect(songBus);o.start(t);o.stop(t+.1);}
function _hat(t,v=1,open=false){const n=AC.createBufferSource();n.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type="highpass";f.frequency.value=7600;const d=open?.14:.038;const g=AC.createGain();g.gain.setValueAtTime(.16*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(f);f.connect(g);g.connect(songBus);n.start(t);n.stop(t+d+.03);}
function _pad(t,notes,dur,vel=1){notes.forEach(m=>{[-4,4].forEach(det=>{const o=AC.createOscillator();o.type="sawtooth";o.frequency.value=mtof(m);o.detune.value=det;const f=AC.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(450,t);f.frequency.linearRampToValueAtTime(1250,t+dur*.4);f.frequency.linearRampToValueAtTime(500,t+dur);const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.028*vel,t+dur*.3);g.gain.setValueAtTime(.028*vel,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.9);o.connect(f);f.connect(g);g.connect(songBus);g.connect(reverbNode);o.start(t);o.stop(t+dur+1);});});}
function _bass(t,m,dur){const o=AC.createOscillator();o.type="sine";o.frequency.value=mtof(m);const o2=AC.createOscillator();o2.type="triangle";o2.frequency.value=mtof(m);const f=AC.createBiquadFilter();f.type="lowpass";f.frequency.value=420;const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.32,t+.015);g.gain.setTargetAtTime(.0001,t+dur*.6,.14);const g2=AC.createGain();g2.gain.value=.25;o.connect(g);o2.connect(g2);g2.connect(g);g.connect(f);f.connect(songBus);o.start(t);o.stop(t+dur+.5);o2.start(t);o2.stop(t+dur+.5);}
function _pluck(t,m,vel=1){const pan=AC.createStereoPanner?AC.createStereoPanner():null;const o=AC.createOscillator();o.type="triangle";o.frequency.value=mtof(m);const o2=AC.createOscillator();o2.type="sine";o2.frequency.value=mtof(m)*2;const g=AC.createGain();g.gain.setValueAtTime(.16*vel,t);g.gain.exponentialRampToValueAtTime(.0001,t+.5);const g2=AC.createGain();g2.gain.value=.2;o.connect(g);o2.connect(g2);g2.connect(g);if(pan){pan.pan.value=Math.random()*1.4-.7;g.connect(pan);pan.connect(songBus);pan.connect(delayNode);pan.connect(reverbNode);}else{g.connect(songBus);g.connect(delayNode);g.connect(reverbNode);}o.start(t);o.stop(t+.6);o2.start(t);o2.stop(t+.6);}

const LOOKAHEAD=.65,TICK=50;
function scheduleStep(step,t){const sq=SEQN[engine.track%SEQN.length],bar16=60/sq.bpm*4,chord=sq.chords[engine.bar%4],root=chord[0]-12;if(step%2===1)t+=.09*(bar16/16);if(sq.kick.includes(step))_kick(t);if(sq.snare.includes(step))_snare(t);if(sq.ghost.includes(step)&&Math.random()<.3)_snare(t,.28);const hv=[.9,.35,.6,.4,.85,.35,.6,.4,.9,.4,.6,.45,.85,.5,.7,.5][step];_hat(t,hv,step===14&&Math.random()<.5);if(step===0)_pad(t,chord,bar16/2*.96);if(step===8)_pad(t,chord.slice(0,3),bar16/2*.9,.65);if(step===0||step===8)_bass(t,root,bar16/16*3);if(step===6||step===14)_bass(t,root,bar16/16*2);if(step===15&&Math.random()<.25)_bass(t,root+7,bar16/16*1.5);if(sq.mel.includes(step)&&Math.random()<sq.melP){engine.lastNotePos=Math.max(0,Math.min(sq.scale.length-1,engine.lastNotePos+(Math.random()<.5?-1:1)*(Math.random()<.25?2:1)));let n=sq.scale[engine.lastNotePos];if(Math.random()<.22)n+=12;_pluck(t,n,.85+Math.random()*.3);}}
function scheduler(){while(engine.nextTime<AC.currentTime+LOOKAHEAD){scheduleStep(engine.step,engine.nextTime);const dt=60/bpmOf(engine.track)/4;engine.nextTime+=dt;engine.elapsed+=dt;engine.step=(engine.step+1)%16;if(engine.step===0)engine.bar++;if(engine.elapsed>=durOf(engine.track)){switchTrack((engine.track+1)%CONFIG.tracks.length,true);return;}}}

const ICON_PLAY='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.5" height="14" rx="1.4"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.4"/></svg>';
function play(){if(!initAudio())return;if(AC.state==="suspended")AC.resume();if(engine.playing)return;engine.playing=true;engine.nextTime=AC.currentTime+.08;engine.step=0;engine.bar=0;const t=AC.currentTime;songBus.gain.cancelScheduledValues(t);songBus.gain.setTargetAtTime(1,t,.15);crackleBus.gain.cancelScheduledValues(t);crackleBus.gain.setTargetAtTime(.05,t,.4);engine.timer=setInterval(scheduler,TICK);const b=$("#playBtn");if(b){b.innerHTML=ICON_PAUSE;$("#playerCard").classList.add("playing");}sfxOpen();}
function pause(){if(!engine.playing)return;engine.playing=false;clearInterval(engine.timer);const t=AC.currentTime;songBus.gain.setTargetAtTime(0,t,.07);crackleBus.gain.setTargetAtTime(0,t,.2);const b=$("#playBtn");if(b){b.innerHTML=ICON_PLAY;$("#playerCard").classList.remove("playing");}}
function switchTrack(i,auto=false){engine.track=(i+CONFIG.tracks.length)%CONFIG.tracks.length;engine.step=0;engine.bar=0;engine.elapsed=0;if(engine.playing&&AC){const t=AC.currentTime;songBus.gain.cancelScheduledValues(t);songBus.gain.setTargetAtTime(0,t,.05);setTimeout(()=>{if(engine.playing)songBus.gain.setTargetAtTime(1,AC.currentTime,.15);},160);engine.nextTime=Math.max(engine.nextTime,AC.currentTime+.18);}if(auto)sfxDing();updateTrackUI();drawCover(engine.track);}
function togglePlay(){engine.playing?pause():play();}

/* ============ MODAL / TOAST / CLIPBOARD ============ */
function openModal(sel){const m=$(sel);if(!m)return;m.classList.add("open");document.body.style.overflow="hidden";const f=m.querySelector("input,textarea");if(f)setTimeout(()=>f.focus(),260);}
function closeModal(m){m=typeof m==="string"?$(m):m;if(!m)return;m.classList.remove("open");if(!$(".modal.open"))document.body.style.overflow="";sfxClick();}
document.addEventListener("click",e=>{const x=e.target.closest("[data-close]");if(x){closeModal(x.closest(".modal"));return;}if(e.target.classList&&e.target.classList.contains("modal"))closeModal(e.target);});
addEventListener("keydown",e=>{if(e.key==="Escape"){const o=$(".modal.open");if(o)closeModal(o);}});

let toastT;
function toast(msg){const t=$("#toast");if(!t)return;$("#toastMsg").textContent=msg;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2800);}
function copyText(txt){const done=()=>{toast("copied to clipboard ♡");sfxDing();};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done).catch(()=>fb());else fb();function fb(){const ta=document.createElement("textarea");ta.value=txt;ta.style.position="fixed";ta.style.opacity=0;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");done();}catch(e){toast("copy failed");}ta.remove();}}
document.addEventListener("click",e=>{const c=e.target.closest("[data-copy]");if(c){e.preventDefault();copyText(c.dataset.copy);}});
$("#emailPill")?.addEventListener("click",()=>copyText(CONFIG.email));

/* ============ CAPTCHA ============ */
let pendingDownload=null, currentCaptcha="";
function generateCaptcha(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";currentCaptcha="";for(let i=0;i<4;i++)currentCaptcha+=chars.charAt(Math.floor(Math.random()*chars.length));if($("#capDisplay"))$("#capDisplay").textContent=currentCaptcha;if($("#capInput"))$("#capInput").value="";if($("#capErr"))$("#capErr").textContent="";}
$("#capForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const val=$("#capInput").value.toUpperCase().trim();
  if(val===currentCaptcha){
    if(pendingDownload){
      const a=document.createElement("a");a.href=pendingDownload.url;a.download=pendingDownload.name;
      document.body.appendChild(a);a.click();a.remove();
      toast("✓ verified — downloading "+pendingDownload.name);sfxDing();
    }
    closeModal("#mCaptcha");pendingDownload=null;
  }else{
    $("#capErr").textContent="✕ INVALID CODE — TRY AGAIN";
    const s=$("#mCaptcha .modal-sheet");if(s){s.classList.remove("shake");void s.offsetWidth;s.classList.add("shake");}
    sfx(180,.22,.06,"sawtooth",70);generateCaptcha();
  }
});

/* ============ FILES ============ */
const fmtBytes=b=>b<1024?b+" B":b<1048576?(b/1024).toFixed(1)+" KB":b<1073741824?(b/1048576).toFixed(1)+" MB":(b/1073741824).toFixed(2)+" GB";
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function loadFiles(){
  initSupabase();
  if(SB){
    try{const{data}=await SB.from("files").select("*").order("ts",{ascending:false});if(data)FILES=data;}catch(e){FILES=[];}
  }else{
    try{const r=await fetch("./data/files.json",{cache:"no-store"});FILES=await r.json();}catch(e){FILES=[];}
    FILES.sort((a,b)=>b.ts-a.ts);
  }
  const fc=$("#fileCount");if(fc)fc.textContent=FILES.length;
  const ts=$("#toolsSub");if(ts)ts.textContent=FILES.length?`${FILES.length} FILE${FILES.length>1?"S":""} · ${fmtBytes(FILES.reduce((s,f)=>s+f.size,0))} TOTAL`:"FILES SHARED BY AASHVIN";
  renderFiles();
}
function renderFiles(){
  const g=$("#filesGrid");if(!g)return;
  if(!FILES.length){g.innerHTML='<div class="empty" style="grid-column:1/-1"><span class="big">📭</span>NO FILES UPLOADED YET<br><span style="opacity:.6">check back soon — admin drops stuff here</span></div>';return;}
  g.innerHTML="";
  FILES.forEach(f=>{
    const card=document.createElement("div");card.className="file-card reveal in";
    card.innerHTML=`<div class="file-thumb">${f.icon||"📦"}</div>
      <div class="file-name" title="${esc(f.name)}">${esc(f.name)}</div>
      <div class="file-meta"><span>${fmtBytes(f.size)}</span><span>•</span><span>${new Date(f.ts).toLocaleDateString()}</span></div>
      <div class="file-acts">
        <button class="dl-btn" data-dlid="${f.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M4 20h16"/></svg>Download</button>
        <button class="del-btn" data-delf="${f.id}" title="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg></button>
      </div>`;
    g.appendChild(card);
  });
}

/* Download click → CAPTCHA */
document.addEventListener("click",e=>{
  const dl=e.target.closest("[data-dlid]");
  if(dl){e.preventDefault();const f=FILES.find(x=>x.id===dl.dataset.dlid);if(f){pendingDownload=f;generateCaptcha();openModal("#mCaptcha");sfxOpen();}}
});

/* Admin: upload via Supabase Storage */
const fileInput=document.createElement("input");fileInput.type="file";fileInput.multiple=true;fileInput.style.display="none";document.body.appendChild(fileInput);
function pickFiles(){
  if(!SB){toast("Set Supabase keys in CONFIG to enable cloud upload, or push files to /files/ on GitHub");sfxDing();return;}
  fileInput.click();
}
fileInput.addEventListener("change",async e=>{
  const arr=[...e.target.files];if(!arr.length)return;e.target.value="";
  let ok=0;
  for(const file of arr){
    try{
      const path=Date.now()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const{error:upErr}=await SB.storage.from("uploads").upload(path,file,{upsert:true});
      if(upErr)throw upErr;
      const{data:urlData}=SB.storage.from("uploads").getPublicUrl(path);
      const ext=(file.name.split(".").pop()||"").toLowerCase();
      let icon="📦";if(file.type.startsWith("image"))icon="🖼️";else if(file.type.startsWith("video"))icon="🎬";else if(file.type.startsWith("audio"))icon="🎵";else if(ext==="pdf")icon="📕";else if(["zip","rar","7z"].includes(ext))icon="🗜️";
      await SB.from("files").insert({name:file.name,type:file.type,size:file.size,url:urlData.publicUrl,icon,ts:Date.now()});
      ok++;
    }catch(err){toast("⚠ "+file.name+" failed: "+err.message);}
  }
  if(ok){sfxDing();toast("✓ "+ok+" file"+(ok>1?"s":"")+" uploaded globally");await loadFiles();}
});
$("#dropZone")?.addEventListener("click",pickFiles);
$("#uploadBtn")?.addEventListener("click",pickFiles);

/* Admin: delete file */
document.addEventListener("click",async e=>{
  const df=e.target.closest("[data-delf]");
  if(df&&isAdmin){
    const f=FILES.find(x=>x.id===df.dataset.delf);if(!f)return;
    if(!confirm('Delete "'+f.name+'" permanently?'))return;
    if(SB){try{await SB.from("files").delete().eq("id",f.id);}catch(e){}}
    else toast("Remove entry from /data/files.json & commit to GitHub");
    await loadFiles();sfxClick();toast("🗑 file deleted");
  }
});

/* ============ COMMENTS ============ */
function ago(ts){const s=(Date.now()-ts)/1000;if(s<60)return"just now";if(s<3600)return Math.floor(s/60)+"m ago";if(s<86400)return Math.floor(s/3600)+"h ago";if(s<604800)return Math.floor(s/86400)+"d ago";return new Date(ts).toLocaleDateString();}

async function loadComments(){
  initSupabase();
  if(SB){
    try{const{data}=await SB.from("comments").select("*").order("ts",{ascending:false});if(data)COMMENTS=data;}catch(e){COMMENTS=[];}
  }else{
    try{const r=await fetch("./data/comments.json",{cache:"no-store"});COMMENTS=await r.json();}catch(e){COMMENTS=[];}
  }
  renderComments();
}
function renderComments(){
  const cc=$("#cmtCount");if(cc)cc.textContent=COMMENTS.length;
  const l=$("#cList");if(!l)return;
  if(!COMMENTS.length){l.innerHTML='<div class="empty" style="color:rgba(255,214,238,.75)"><span class="big">🌸</span>no comments yet…<br><span style="opacity:.7">be the first to leave something sweet ♡</span></div>';return;}
  l.innerHTML="";
  COMMENTS.slice().sort((a,b)=>b.ts-a.ts).forEach((c,i)=>{
    const d=document.createElement("div");d.className="c-item";d.style.animationDelay=(i*45)+"ms";
    d.innerHTML=`<div class="c-top"><div class="c-av">${esc((c.name[0]||"?").toUpperCase())}</div><span class="c-name${c.admin?" is-admin":""}">${esc(c.name)}</span><span class="c-time">${ago(c.ts)}</span></div><div class="c-text">${esc(c.text)}</div><button class="c-del" data-delc="${c.id}" title="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
    l.appendChild(d);
  });
}
function showCPanel(){const has=!!myName;const ng=$("#nameGate"),cp=$("#cPanel");if(ng)ng.style.display=has?"none":"block";if(cp)cp.style.display=has?"block":"none";if(has){const wn=$("#whoName");if(wn)wn.textContent=myName;}}
function spawnHearts(){const h=$("#hearts");if(!h)return;h.innerHTML="";const g=["♡","💕","✨","🌸","💗"];for(let i=0;i<14;i++){const s=document.createElement("i");s.textContent=g[i%g.length];s.style.left=Math.random()*100+"%";s.style.animationDuration=(7+Math.random()*7)+"s";s.style.animationDelay=(Math.random()*7)+"s";s.style.fontSize=(11+Math.random()*13)+"px";h.appendChild(s);}}
$("#cEnter")?.addEventListener("click",()=>{const v=$("#cName").value.trim();if(!v){$("#cName").focus();$("#cName").classList.add("shake");setTimeout(()=>$("#cName").classList.remove("shake"),420);return;}myName=v.slice(0,22);try{localStorage.setItem(NKEY,myName);}catch(e){}sfxDing();showCPanel();toast("welcome, "+myName+" ♡");});
$("#cName")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("#cEnter").click();}});
$("#switchName")?.addEventListener("click",()=>{myName="";try{localStorage.removeItem(NKEY);}catch(e){}$("#cName").value="";showCPanel();sfxClick();});
async function sendComment(){
  const t=$("#cText").value.trim();if(!t||(!myName&&!isAdmin))return;
  const entry={name:isAdmin?CONFIG.name:myName,text:t,ts:Date.now(),admin:isAdmin};
  if(SB){
    try{const{error}=await SB.from("comments").insert(entry);if(error)throw error;toast("comment posted globally ♡");}
    catch(e){toast("⚠ failed: "+e.message);return;}
  }else{
    COMMENTS.push({id:"c_"+Date.now(),...entry});
    toast("comment posted (local preview — set Supabase for global)");
  }
  $("#cText").value="";sfxDing();await loadComments();
}
$("#cSend")?.addEventListener("click",sendComment);
$("#cText")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendComment();}});
$("#cText")?.addEventListener("input",e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,130)+"px";});
document.addEventListener("click",async e=>{
  const d=e.target.closest("[data-delc]");
  if(d&&isAdmin){
    if(SB){try{await SB.from("comments").delete().eq("id",d.dataset.delc);}catch(e){}}
    else COMMENTS=COMMENTS.filter(c=>c.id!==d.dataset.delc);
    sfxClick();toast("🗑 comment removed");await loadComments();
  }
});

/* ============ ADMIN + MATRIX ============ */
const mx_c=$("#matrix");let mx_x,mxCols=[],mxRun=false,mxFont=15;
if(mx_c)mx_x=mx_c.getContext("2d");
function mxResize(){if(!mx_c)return;mx_c.width=innerWidth;mx_c.height=innerHeight;const n=Math.ceil(innerWidth/mxFont);mxCols=Array.from({length:n},()=>Math.random()*-60);}
addEventListener("resize",()=>{if(mxRun)mxResize();});
const GLYPHS="アイウエオカキクケコサシスセソタチツテトナニヌネノabcdefghijklmnopqrstuvwxyz0123456789$#@%&*<>/|=+";
function mxLoop(){if(!mxRun||!mx_x)return;mx_x.fillStyle="rgba(0,6,0,.075)";mx_x.fillRect(0,0,mx_c.width,mx_c.height);mx_x.font=mxFont+"px monospace";for(let i=0;i<mxCols.length;i++){const y=mxCols[i]*mxFont,ch=GLYPHS[(Math.random()*GLYPHS.length)|0];mx_x.fillStyle="#d4ffdc";mx_x.fillText(ch,i*mxFont,y);mx_x.fillStyle="#00ff41";mx_x.fillText(GLYPHS[(Math.random()*GLYPHS.length)|0],i*mxFont,y-mxFont);if(y>mx_c.height&&Math.random()>.975)mxCols[i]=0;else mxCols[i]++;}requestAnimationFrame(mxLoop);}
const GREEN=["#00ff41","#12e06a","#7dff9b","#0b8f3c","#d4ffdc"];
function setAdmin(on,silent){
  isAdmin=on;
  try{on?sessionStorage.setItem("aashvyn_admin","1"):sessionStorage.removeItem("aashvyn_admin");}catch(e){}
  document.body.classList.toggle("admin",on);
  pts.forEach((p,i)=>p.c=on?GREEN[i%GREEN.length]:PALETTE[i%5]);
  if(on){if(!mxRun&&mx_c){mxRun=true;mxResize();mxLoop();}}
  else{mxRun=false;if(mx_c)setTimeout(()=>mx_x.clearRect(0,0,mx_c.width,mx_c.height),1000);}
  if($("#cList"))renderComments();
  const ab=$("#adminBtn");if(ab)ab.querySelector("b").textContent=on?"Exit Admin":"Admin";
  if(!silent){if(on){toast("◉ ROOT ACCESS GRANTED — welcome back, Aashvin");sfxHack();}else{toast("◌ admin session terminated");sfxClick();}}
}
$("#adminBtn")?.addEventListener("click",()=>{sfxClick();if(isAdmin){setAdmin(false);return;}if($("#admErr"))$("#admErr").textContent="";if($("#admUser"))$("#admUser").value="";if($("#admPass"))$("#admPass").value="";openModal("#mAdmin");});
$("#adminForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const u=$("#admUser").value.trim(),p=$("#admPass").value;
  if(u===CONFIG.admin.user&&p===CONFIG.admin.pass){if($("#admErr"))$("#admErr").textContent="";closeModal("#mAdmin");setAdmin(true);}
  else{if($("#admErr"))$("#admErr").textContent="✕ ACCESS DENIED";const s=$("#mAdmin .modal-sheet");if(s){s.classList.remove("shake");void s.offsetWidth;s.classList.add("shake");}sfx(180,.22,.06,"sawtooth",70);}
});

/* ============ UI INIT ============ */
function initUI(){
  const bio=$("#bio");if(bio)bio.textContent=CONFIG.bio;
  const loc=$("#locPill");if(loc)loc.textContent=CONFIG.location;
  const ep=$("#emailPill");if(ep)ep.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3 7 9 6 9-6"/></svg>'+CONFIG.email;
  const ARROW='<span class="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span>';
  const g=$("#socialGrid");
  if(g){g.innerHTML="";CONFIG.socials.forEach((s,i)=>{const a=document.createElement("a");a.className="card reveal in"+(i===0?" feature":"");a.href=s.url;if(s.url.startsWith("http")){a.target="_blank";a.rel="noopener noreferrer";}a.style.setProperty("--accent",ACC[s.color]||ACC.cy);a.dataset.sfx="open";a.innerHTML=`<span class="badge">${s.badge}</span><div class="icon-tile">${s.icon}</div><div class="label">${s.label}</div><div class="handle">${s.handle}</div><div class="foot"><span class="count">${s.followers}</span><span class="sub">${s.sub}</span></div>${ARROW}`;a.addEventListener("pointerleave",()=>{a.style.transform="";});g.appendChild(a);});}
  const l=$("#linkList");
  if(l){l.innerHTML="";CONFIG.quickLinks.forEach(q=>{const isCopy=q.title.toLowerCase().includes("share");const a=document.createElement("a");a.className="link-row reveal in";a.href=q.url;if(q.url.startsWith("http")&&!isCopy){a.target="_blank";a.rel="noopener noreferrer";}if(isCopy){a.href="#";a.dataset.copy=q.url;}a.dataset.sfx=isCopy?"d":"open";a.innerHTML=`<div class="li">${q.icon}</div><div class="lt"><b>${q.title}</b><span>${q.desc}</span></div><span class="la"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span>`;l.appendChild(a);});}
  const tl=$("#tracklist");
  if(tl){tl.innerHTML="";CONFIG.tracks.forEach((t,i)=>{const d=document.createElement("div");d.className="track"+(i===engine.track?" active":"");d.dataset.i=i;d.dataset.sfx="ui";d.innerHTML=`<span class="teq"><span class="eq"><i></i><i></i><i></i><i></i></span></span><div class="tinfo"><b>${t.title}</b><span>${t.artist}</span></div><span class="live-tag">LIVE</span><span class="tdur">${t.dur}</span>`;d.addEventListener("click",()=>{if(i===engine.track)togglePlay();else{switchTrack(i);play();}});tl.appendChild(d);});}
  updateTrackUI();drawCover(0);
}
function updateTrackUI(){if(!$("#npTitle"))return;$$(".track").forEach((el,i)=>el.classList.toggle("active",i===engine.track));const t=CONFIG.tracks[engine.track];$("#npTitle").textContent=t.title;$("#npArtist").textContent=t.artist;if($("#bpmChip"))$("#bpmChip").textContent=bpmOf(engine.track)+" BPM";if($("#tEnd"))$("#tEnd").textContent=t.dur;}

/* ============ COVER ART ============ */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function drawCover(i){const cv=$("#cover");if(!cv)return;const c=cv.getContext("2d"),S=192,r=rng(1337+i*97);const hues=[188,318,275,140,42],h=hues[i%hues.length];const g=c.createLinearGradient(0,0,0,S);g.addColorStop(0,`hsl(${h+40} 80% 10%)`);g.addColorStop(.55,`hsl(${h+60} 90% 16%)`);g.addColorStop(1,`hsl(${h} 100% 8%)`);c.fillStyle=g;c.fillRect(0,0,S,S);for(let k=0;k<60;k++){c.fillStyle=`hsla(${h+r()*80} 100% 80% / ${.15+r()*.5})`;c.fillRect(r()*S,r()*S*.6,1.6,1.6);}const sy=S*.42,sr=52,sg=c.createLinearGradient(0,sy-sr,0,sy+sr);sg.addColorStop(0,`hsl(${h+120} 100% 62%)`);sg.addColorStop(1,`hsl(${h} 100% 55%)`);c.save();c.beginPath();c.arc(S/2,sy,sr,0,7);c.clip();c.fillStyle=sg;c.fillRect(S/2-sr,sy-sr,sr*2,sr*2);c.fillStyle=`hsl(${h} 60% 10%)`;for(let k=0;k<5;k++){const yy=sy+6+k*9;c.fillRect(S/2-sr,yy+k*1.6,sr*2,3.2);}c.restore();c.fillStyle=`hsla(${h} 100% 60% / .5)`;c.fillRect(0,sy+sr*.55,S,1.5);c.strokeStyle=`hsla(${h+30} 100% 60% / .35)`;c.lineWidth=1;const hor=sy+sr*.55;for(let k=1;k<9;k++){const y=hor+Math.pow(k/9,2)*(S-hor);c.beginPath();c.moveTo(0,y);c.lineTo(S,y);c.globalAlpha=1-k/11;c.stroke();}c.globalAlpha=.5;for(let k=-6;k<=6;k++){c.beginPath();c.moveTo(S/2,hor);c.lineTo(S/2+k*48,S);c.stroke();}c.globalAlpha=1;const L=(CONFIG.tracks[i]?CONFIG.tracks[i].title[0]:"A").toUpperCase();c.font="900 64px 'Arial Black',sans-serif";c.textAlign="center";c.fillStyle=`hsl(${h+120} 100% 60%)`;c.fillText(L,S/2+3,S-24);c.fillStyle="#eef2ff";c.fillText(L,S/2,S-27);}

/* ============ MARQUEE + TYPED ============ */
(function(){const mq=$("#mq");if(mq){const items=["LO-FI BEATS","NEON NIGHTS","RANKED GRIND","AESTHETIC DROPS","PIXEL DREAMS","24/7 FREQUENCY","CYBER CHILL","GOOD VIBES ONLY"];let html="";for(let r=0;r<2;r++)items.forEach((t,i)=>{html+=`<span class="mq ${i%2?"hollow":""}">${t}</span><span class="star">✦</span>`;});mq.innerHTML=html+html;}
const el=$("#typed");if(el){const phrases=["curating late-night beats","clutching pixels till 3AM","posting aesthetic transmissions","lofi.neon.repeat()","tuning this frequency 4 u"];let p=0,i=0,del=false;(function tick(){if(reduced){el.textContent=phrases[0];return;}const word=phrases[p];el.textContent=word.slice(0,i);if(!del){if(i<word.length){i++;setTimeout(tick,55+Math.random()*60);}else{del=true;setTimeout(tick,2100);}}else{if(i>0){i--;setTimeout(tick,26);}else{del=false;p=(p+1)%phrases.length;setTimeout(tick,420);}}})();}})();

/* ============ PARTICLES + VIZ + CURSOR ============ */
const fx=$("#fx");let fctx,W,H,dpr;if(fx)fctx=fx.getContext("2d");
function resize(){if(!fx)return;dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;fx.width=W*dpr;fx.height=H*dpr;fx.style.width=W+"px";fx.style.height=H+"px";fctx.setTransform(dpr,0,0,dpr,0,0);const vz=$("#viz");if(vz){vz.width=vz.clientWidth*dpr||600*dpr;vz.height=64*dpr;}}
addEventListener("resize",resize);resize();
const N=70,pts=[];for(let i=0;i<N;i++)pts.push({x:Math.random()*(W||1000),y:Math.random()*(H||1000),vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:1+Math.random()*1.8,c:PALETTE[i%5]});
let mx=(W||1000)/2,my=(H||1000)/2,cx=mx,cyy=my;
addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY;const cg=$("#cursorGlow");if(cg)cg.style.opacity=1;});
const vizData=new Uint8Array(64);let last=performance.now(),rafOn=true;
function loop(now){if(!rafOn)return;const dt=Math.min((now-last)/16.7,3);last=now;
if(fctx){fctx.clearRect(0,0,W,H);for(const p of pts){if(!reduced){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;if(p.y<-10)p.y=H+10;if(p.y>H+10)p.y=-10;}fctx.globalAlpha=.75;fctx.fillStyle=p.c;fctx.beginPath();fctx.arc(p.x,p.y,p.r,0,7);fctx.fill();}fctx.lineWidth=1;for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){const a=pts[i],b=pts[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;if(d2<16900){const al=(1-Math.sqrt(d2)/130)*.55;fctx.globalAlpha=al;fctx.strokeStyle="#00f0ff";fctx.beginPath();fctx.moveTo(a.x,a.y);fctx.lineTo(b.x,b.y);fctx.stroke();}}fctx.globalAlpha=1;}
cx+=(mx-cx)*.12*dt;cyy+=(my-cyy)*.12*dt;const cg=$("#cursorGlow");if(cg){cg.style.left=cx+"px";cg.style.top=cyy+"px";}
if(analyser&&$("#viz")){analyser.getByteFrequencyData(vizData);const vz=$("#viz"),vc=vz.getContext("2d"),vw=vz.width,vh=vz.height;vc.clearRect(0,0,vw,vh);const bars=42,bw=vw/bars;let sum=0;for(let i=0;i<bars;i++){const v=vizData[Math.floor(Math.pow(i/bars,1.6)*58)]/255;sum+=v;const bh=Math.max(3,v*vh*.92);const hg=vc.createLinearGradient(0,vh,0,vh-bh);hg.addColorStop(0,"#8b2dff");hg.addColorStop(.55,"#00f0ff");hg.addColorStop(1,"#ff2d95");vc.fillStyle=hg;vc.globalAlpha=engine.playing?.95:.28;if(vc.roundRect){vc.beginPath();vc.roundRect(i*bw+bw*.22,vh-bh,bw*.56,bh,3);vc.fill();}else vc.fillRect(i*bw+bw*.22,vh-bh,bw*.56,bh);}vc.globalAlpha=1;vuLevel=sum/bars;}
if(engine.playing&&$(".pbar .fill")){const e=engine.elapsed,d=durOf(engine.track),pr=Math.min(e/d*100,100);$(".pbar .fill").style.width=pr+"%";$(".pbar .knob").style.left=pr+"%";$("#tCur").textContent=Math.floor(e/60)+":"+String(Math.floor(e%60)).padStart(2,"0");}
requestAnimationFrame(loop);}
requestAnimationFrame(loop);
document.addEventListener("visibilitychange",()=>{rafOn=!document.hidden;if(rafOn){last=performance.now();requestAnimationFrame(loop);}});
if(!matchMedia("(hover:hover)").matches&&$("#cursorGlow"))$("#cursorGlow").style.display="none";

/* ============ CARD TILT ============ */
if(matchMedia("(hover:hover)").matches){document.addEventListener("pointermove",e=>{const c=e.target.closest(".card");$$(".card").forEach(card=>{if(card!==c){card.style.transform="";return;}const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.setProperty("--mx",x*100+"%");card.style.setProperty("--my",y*100+"%");card.style.transform=`translateY(-4px) scale(1.01) perspective(700px) rotateX(${(.5-y)*7}deg) rotateY(${(x-.5)*9}deg)`;});});document.addEventListener("pointerleave",()=>$$(".card").forEach(c=>c.style.transform=""),true);}

/* ============ REVEAL OBSERVER ============ */
const io=new IntersectionObserver(en=>en.forEach(x=>{if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target);}}),{threshold:.12});
function observeReveals(){$$(".reveal:not(.in)").forEach((el,i)=>{el.style.transitionDelay=(i%6)*55+"ms";io.observe(el);});}

/* ============ AVATAR EASTER EGG ============ */
$(".avatar-wrap")?.addEventListener("click",e=>{sfxPop();sfxWhoosh();const r=$(".avatar-wrap").getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;for(let k=0;k<26;k++){const s=document.createElement("span");s.className="spark";const heart=Math.random()<.4;s.textContent=heart?"♡":"";s.style.cssText=`left:${x}px;top:${y}px;width:${heart?"auto":"6px"};height:${heart?"auto":"6px"};font-size:${10+Math.random()*14}px;color:${PALETTE[k%5]};background:${heart?"transparent":PALETTE[k%5]};border-radius:${heart?"0":"2px"};text-shadow:0 0 10px ${PALETTE[k%5]};z-index:90;position:fixed;`;document.body.appendChild(s);const a=Math.random()*Math.PI*2,d=50+Math.random()*110;s.animate([{transform:"translate(0,0) rotate(0deg) scale(1)",opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d-60}px) rotate(${Math.random()*540-270}deg) scale(0)`,opacity:0}],{duration:750+Math.random()*500,easing:"cubic-bezier(.1,.8,.3,1)"}).onfinish=()=>s.remove();}toast("♡ +1 vibe received");});

/* ============ VIEWS ============ */
(function(){const vp=$("#viewsPill");if(!vp)return;let v=0;try{v=+(localStorage.getItem("aashvyn_views")||0);}catch(e){}v++;try{localStorage.setItem("aashvyn_views",v);}catch(e){}const total=12847+v;vp.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>'+total.toLocaleString("en-US")+" VIEWS";})();

/* ============ CONTROLS ============ */
setInterval(()=>{const d=new Date();const c=$("#clock span");if(c)c.textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":");},1000);
addEventListener("scroll",()=>{const h=document.documentElement,sb=$("#scrollbar");if(sb)sb.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight)*100)+"%";},{passive:true});
const SPK_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const SPK_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="m16 9 6 6M22 9l-6 6"/></svg>';
function setMuteBtn(){const mb=$("#muteBtn");if(mb)mb.innerHTML=muted?SPK_OFF:SPK_ON;}
setMuteBtn();
$("#muteBtn")?.addEventListener("click",()=>{muted=!muted;setMuteBtn();try{localStorage.setItem("aashvyn_muted",muted?"1":"0");}catch(e){}if(AC)master.gain.setTargetAtTime(muted?0:.92,AC.currentTime,.05);toast(muted?"sound off — frequency muted":"sound on — frequency live ♫");if(!muted)sfxDing();});
if($("#playBtn"))$("#playBtn").innerHTML=ICON_PLAY;
$("#playBtn")?.addEventListener("click",togglePlay);
$("#nextBtn")?.addEventListener("click",()=>{switchTrack(engine.track+1);if(!engine.playing)play();});
$("#prevBtn")?.addEventListener("click",()=>{if(engine.elapsed>4){engine.elapsed=0;engine.step=0;engine.bar=0;if(AC)engine.nextTime=Math.max(engine.nextTime,AC.currentTime+.1);}else switchTrack(engine.track-1);if(!engine.playing)play();});
$("#quickPlay")?.addEventListener("click",()=>{const m=$("#music");if(m)m.scrollIntoView({behavior:"smooth"});if(!engine.playing)play();});
$("#pbar")?.addEventListener("click",()=>{engine.elapsed=0;engine.step=0;engine.bar=0;if(!engine.playing)play();toast("vibe restarted ↺");});
$("#vol")?.addEventListener("input",e=>{if(AC)musicGain.gain.setTargetAtTime(e.target.value/100,AC.currentTime,.05);});
addEventListener("keydown",e=>{const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable;if(typing||$(".modal.open"))return;if(e.code==="Space"&&e.target===document.body&&$("#playBtn")){e.preventDefault();togglePlay();}if(e.key==="m"||e.key==="M")$("#muteBtn")?.click();if(e.key==="ArrowRight")$("#nextBtn")?.click();if(e.key==="ArrowLeft")$("#prevBtn")?.click();});
addEventListener("pointerdown",e=>{initAudio();if(AC&&AC.state==="suspended")AC.resume();const t=e.target.closest("[data-sfx]");if(t){const k=t.dataset.sfx;k==="open"?sfxOpen():k==="d"?sfxDing():sfxClick();}const b=e.target.closest("button");if(b)b.blur();},{passive:true});
let hovTh=0;addEventListener("pointerover",e=>{const t=e.target.closest("[data-sfx],.track,.link-row,a");if(t){const n=performance.now();if(n-hovTh>140){hovTh=n;sfxHover();}}},{passive:true});
$$(".nav-links a").forEach(a=>{const h=a.getAttribute("href"),p=location.pathname;if(h===p||h==="./"+p.split("/").pop()||(p.endsWith("index.html")&&h==="./index.html")||(p==="/"&&h==="./index.html"))a.classList.add("active");});

/* ============ BOOT ============ */
initUI();
observeReveals();
loadFiles().then(()=>observeReveals()).catch(()=>{});
loadComments().then(()=>observeReveals()).catch(()=>{});
if(isAdmin)setAdmin(true,true);
if($("#nameGate"))showCPanel();
if($("#hearts"))spawnHearts();
