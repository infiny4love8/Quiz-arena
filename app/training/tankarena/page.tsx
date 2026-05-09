
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";



export default function TankArenaPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const iframeRef   = useRef<HTMLIFrameElement>(null);

  const duelId   = searchParams.get("duelId");
  const duelRole = searchParams.get("role") as "a" | "b" | null;
  const isDuelMode = !!duelId && !!duelRole;

  const [gameStarted, setGameStarted]     = useState(false);
  const [gameOver, setGameOver]           = useState(false);
  const [myScore, setMyScore]             = useState(0);
  const [waiting, setWaiting]             = useState(false);
  const [opponentDone, setOpponentDone]   = useState(false);
  const [blobUrl, setBlobUrl]             = useState<string | null>(null);

  // ── Générer le blob URL du jeu HTML avec postMessage injecté
  useEffect(() => {
    const gameHTML = getGameHTML(isDuelMode);
    const blob = new Blob([gameHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [isDuelMode]);

  // ── Écouter le score envoyé par le jeu via postMessage
  const handleFinish = useCallback(async (score: number) => {
    setMyScore(score);
    setGameOver(true);

    if (!isDuelMode || !duelId || !duelRole) return;

    const scoreCol = duelRole === "a" ? "score_a" : "score_b";

    // Sauvegarder mon score
    await supabase
      .from("duels")
      .update({ [scoreCol]: score })
      .eq("id", duelId);

    // Vérifier si l'adversaire a déjà fini
    const { data: updated } = await supabase
      .from("duels")
      .select("*")
      .eq("id", duelId)
      .single();

    if (!updated) return;

    const oppScore = duelRole === "a" ? updated.score_b : updated.score_a;

    if (oppScore !== null) {
      // Les deux ont fini → calculer le gagnant
      const { data: { user } } = await supabase.auth.getUser();
      const myId = user?.id;
      const winnerId = score > oppScore
        ? myId
        : oppScore > score
        ? (duelRole === "a" ? updated.player_b : updated.player_a)
        : null;

      await supabase
        .from("duels")
        .update({ status: "finished", winner: winnerId })
        .eq("id", duelId);

      router.push(`/duel/${duelId}/play`);
    } else {
      // Adversaire pas encore fini
      setWaiting(true);
    }
  }, [isDuelMode, duelId, duelRole, router]);

  // ── Écouter les messages du jeu
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "TANK_GAME_OVER") {
        handleFinish(e.data.score ?? 0);
      }
      if (e.data?.type === "TANK_STARTED") {
        setGameStarted(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleFinish]);

  // ── Realtime : écouter si l'adversaire finit
  useEffect(() => {
    if (!isDuelMode || !duelId) return;
    const channel = supabase
      .channel(`tank-duel-${duelId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "duels", filter: `id=eq.${duelId}` },
        (payload) => {
          const updated = payload.new as { score_a: number | null; score_b: number | null; status: string };
          const oppScore = duelRole === "a" ? updated.score_b : updated.score_a;
          if (oppScore !== null) setOpponentDone(true);
          if (updated.status === "finished") {
            router.push(`/duel/${duelId}/play`);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isDuelMode, duelId, duelRole, router]);

  // ── ÉCRAN D'ATTENTE
  if (waiting) {
    return (
      <main className="min-h-screen bg-[#05070c] text-white flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
          <h2 className="text-2xl font-black mb-3">
            Partie terminée !{" "}
            <span style={{ color: "#50ffd0" }}>{myScore} pts</span>
          </h2>
          <p className="text-white/40 text-sm mb-2">
            En attente de ton adversaire...
          </p>
          <p className="text-white/20 text-xs">
            Le résultat s&apos;affichera dès qu&apos;il aura terminé
          </p>
          {opponentDone && (
            <p className="mt-4 text-sm animate-pulse" style={{ color: "#50ffd0" }}>
              L&apos;adversaire vient de finir ! Calcul du résultat...
            </p>
          )}
        </div>
      </main>
    );
  }

  // ── JEU (iframe)
  return (
    <div className="fixed inset-0 bg-[#05070c]">
      {/* Badge duel mode */}
      {isDuelMode && !gameStarted && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-xs font-bold"
          style={{ background: "rgba(80,255,208,0.15)", border: "1px solid rgba(80,255,208,0.4)", color: "#50ffd0" }}>
          ⚔️ Mode Duel — Survis le plus longtemps possible !
        </div>
      )}

      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          className="w-full h-full border-none"
          allow="autoplay"
          title="Tank Arena"
        />
      )}
    </div>
  );
}

// ── HTML du jeu avec postMessage injecté pour envoyer le score
function getGameHTML(isDuelMode: boolean): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no"/>
  <title>Mini Tank Survival</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body{width:100%;height:100%;overflow:hidden;background:#05070c;color:#fff;font-family:Arial,Helvetica,sans-serif;touch-action:none}
    #gameWrap{position:fixed;inset:0;background:#071018}
    canvas{width:100vw;height:100vh;display:block}
    .hud{position:fixed;top:14px;left:12px;right:12px;z-index:5;display:flex;gap:8px;align-items:center;justify-content:space-between;pointer-events:none;font-weight:900;text-shadow:0 3px 12px rgba(0,0,0,.7)}
    .pill{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);padding:9px 12px;border-radius:999px;white-space:nowrap;min-height:38px}
    .reloadWrap{position:fixed;top:62px;left:50%;transform:translateX(-50%);width:min(58vw,330px);height:12px;z-index:5;background:rgba(0,0,0,.36);border:1px solid rgba(255,255,255,.14);border-radius:999px;overflow:hidden;pointer-events:none}
    #reloadBar{height:100%;width:100%;border-radius:999px;background:linear-gradient(90deg,#50ffd0 0 33%,#81a7ff 33% 66%,#ff7de9 66% 100%);transition:width .06s linear}
    .weaponBox{position:fixed;top:82px;left:50%;transform:translateX(-50%);z-index:5;pointer-events:none;font-size:13px;color:rgba(255,255,255,.88);background:rgba(0,0,0,.3);padding:5px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08)}
    .hint{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(92vw,620px);z-index:5;text-align:center;color:rgba(255,255,255,.82);font-size:14px;line-height:1.35;pointer-events:none;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:10px 14px}
    .menu{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.55);backdrop-filter:blur(9px);overflow:auto}
    .card{width:min(94vw,580px);max-height:94vh;overflow:auto;border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.18);box-shadow:0 26px 80px rgba(0,0,0,.48);padding:22px;text-align:center}
    .card h1{font-size:32px;margin-bottom:8px;letter-spacing:-1px}
    .card p{color:rgba(255,255,255,.78);margin:9px 0 14px;line-height:1.45}
    .sectionTitle{text-align:left;margin:15px 0 8px;color:rgba(255,255,255,.92);font-weight:900;font-size:14px;letter-spacing:.3px;text-transform:uppercase}
    .tankSelect{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .selectCard{border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.22);border-radius:18px;padding:10px 8px;cursor:pointer;min-height:74px;transition:.15s}
    .selectCard.active{border-color:rgba(80,255,208,.85);background:rgba(80,255,208,.12)}
    .selectCard:active{transform:scale(.97)}
    .miniTankPreview{width:42px;height:28px;margin:0 auto 7px;border-radius:10px;position:relative}
    .miniTankPreview:after{content:'';position:absolute;width:23px;height:7px;right:-15px;top:10px;border-radius:999px;background:rgba(255,255,255,.86)}
    .smallTxt{color:rgba(255,255,255,.76);font-size:12px;font-weight:800}
    .leaderboard{margin-top:14px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:12px;text-align:left}
    .leaderboard h3{font-size:14px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;color:rgba(255,255,255,.9)}
    .leaderboard ol{padding-left:22px;color:rgba(255,255,255,.8);line-height:1.75;font-weight:800}
    .leaderboard li:first-child{color:#50ffd0}
    button{border:none;cursor:pointer;color:#061015;background:linear-gradient(135deg,#50ffd0,#81a7ff);font-size:17px;font-weight:900;border-radius:999px;padding:14px 24px;margin-top:16px}
    #formBanner{position:fixed;top:155px;left:50%;transform:translateX(-50%);z-index:6;pointer-events:none;padding:7px 15px;border-radius:999px;background:rgba(255,180,50,.15);border:1px solid rgba(255,200,80,.3);color:#ffe9a0;font-weight:900;font-size:13px;opacity:0;transition:opacity .25s ease}
    #formBanner.show{opacity:1}
    .hidden{display:none}
    ${isDuelMode ? `.duelBadge{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:20;padding:6px 16px;border-radius:999px;background:rgba(80,255,208,.15);border:1px solid rgba(80,255,208,.4);color:#50ffd0;font-weight:900;font-size:13px}` : ""}
    @media(max-width:500px){.tankSelect{grid-template-columns:repeat(2,1fr)}.hud{font-size:12px}.pill{padding:8px 9px}.card h1{font-size:27px}}
  </style>
</head>
<body>
<div id="gameWrap"><canvas id="game"></canvas></div>
${isDuelMode ? `<div class="duelBadge">⚔️ Mode Duel</div>` : ""}
<div class="hud">
  <div class="pill">Score: <span id="score">0</span></div>
  <div class="pill">Vies: <span id="lives">♥♥♥♥♥</span></div>
  <div class="pill">Best: <span id="best">0</span></div>
  <div class="pill">Wave: <span id="wave">1</span></div>
</div>
<div class="reloadWrap"><div id="reloadBar"></div></div>
<div class="weaponBox">Arme: <span id="weaponName">Canon • 3/3</span></div>
<div id="formBanner"></div>
<div class="hint">Tap = tirer • Maintiens = avancer • 3 tirs rechargeables</div>
<div id="menu" class="menu">
  <div class="card">
    <h1>Mini Tank Survival</h1>
    <p>${isDuelMode ? "⚔️ Mode Duel — Survis le plus longtemps possible. Ton score sera comparé à celui de ton adversaire !" : "Choisis ton tank. Survis aux vagues, enchaîne les combos, bats ton meilleur score."}</p>
    <div class="sectionTitle">Choisis ton tank</div>
    <div id="tankSelect" class="tankSelect"></div>
    <div class="leaderboard"><h3>Leaderboard</h3><ol id="leaderList"></ol></div>
    <button id="startBtn">${isDuelMode ? "⚔️ Commencer le duel" : "Jouer"}</button>
  </div>
</div>
<script>
// ── postMessage vers le parent Next.js
function notifyParent(type, data) {
  try { window.parent.postMessage({ type, ...data }, '*'); } catch(e) {}
}

const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),wrap=document.getElementById('gameWrap');
let W=0,H=0,DPR=Math.max(1,Math.min(2,devicePixelRatio||1));
function resize(){W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener('resize',resize);resize();
const rand=(a,b)=>Math.random()*(b-a)+a;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const norm=a=>Math.atan2(Math.sin(a),Math.cos(a));
function rr(x,y,w,h,r){r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function toRgba(hex,a){const n=parseInt(hex.slice(1),16);return\`rgba(\${(n>>16)&255},\${(n>>8)&255},\${n&255},\${a})\`;}
function shade(hex,f){const n=parseInt(hex.slice(1),16);return\`rgb(\${clamp(((n>>16)&255)*(1+f),0,255)|0},\${clamp(((n>>8)&255)*(1+f),0,255)|0},\${clamp((n&255)*(1+f),0,255)|0})\`;}
const SKINS=[{name:'Aqua',color:'#4effd1',accent:'#d9fff7',type:'classic',spd:188,fr:.42},{name:'Ruby',color:'#ff5c7a',accent:'#ffe1e8',type:'wide',spd:176,fr:.37},{name:'Gold',color:'#ffcf4d',accent:'#fff4bd',type:'heavy',spd:164,fr:.48},{name:'Violet',color:'#9a7dff',accent:'#eee8ff',type:'mini',spd:202,fr:.44},{name:'Cyber',color:'#52e3ff',accent:'#e0fbff',type:'classic',spd:190,fr:.39},{name:'Toxic',color:'#c2ff4d',accent:'#f4ffd6',type:'wide',spd:182,fr:.41}];
const MAPS=[{key:'neon',base:'#071018',grid:'rgba(80,255,208,.10)',glow:'#50ffd0',a:'#26394a',b:'#0c1823'},{key:'desert',base:'#2a1908',grid:'rgba(255,205,100,.10)',glow:'#ffbd59',a:'#8a5a2c',b:'#3b2410'},{key:'lava',base:'#17050a',grid:'rgba(255,84,44,.12)',glow:'#ff4f32',a:'#3a1515',b:'#100507'},{key:'ice',base:'#06141f',grid:'rgba(150,230,255,.13)',glow:'#9be7ff',a:'#426e85',b:'#153040'},{key:'grass',base:'#071608',grid:'rgba(150,255,100,.10)',glow:'#76ff52',a:'#2d5930',b:'#102014'}];
let selSkin=0,selMap=0;
let bestScore=Number(localStorage.getItem('mtBest')||0);
let leaders=JSON.parse(localStorage.getItem('mtLeaders')||'[]');
document.getElementById('best').textContent=bestScore;
let running=false,holding=false,moveAngle=0,lastDown=0,lastTime=0;
let score=0,wave=1,rotDir=1,shake=0,slowMo=0,tScale=1;
let combo=0,comboTimer=0,maxCombo=0;
let bullets=[],eBullets=[],enemies=[],powerUps=[],obstacles=[];
let particles=[],tracks=[],smokeArr=[],decor=[],floatTxts=[],hitRings=[];
let bossSpeech=null;
const P={x:0,y:0,r:18,ang:-Math.PI/2,spin:1.82,spd:188,lives:50,inv:0,fireCd:0,fireRate:.42,burst:3,burstRegen:0,bPower:1,multiAmmo:0,shield:0,boost:0,type:'classic',color:'#4effd1',accent:'#d9fff7',weapon:'canon',wAmmo:0,recoil:0,trackT:0};
function cmap(){return MAPS[selMap];}
function hasBoss(){return enemies.some(e=>e.isBoss);}
let AC=null,musicTimer=null,musicOn=false;
function initAudio(){if(!AC)AC=new(AudioContext||webkitAudioContext)();if(AC.state==='suspended')AC.resume();}
function tone(f,d,type='sine',vol=.08,delay=0){if(!AC)return;const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02);}
function sndShoot(w){if(w==='missile'){tone(120,.18,'sawtooth',.15);tone(70,.12,'square',.08,.04);}else tone(240,.1,'square',.16);}
function sndHit(){tone(120,.12,'sawtooth',.1);}
function sndPower(){[420,640,880].forEach((f,i)=>tone(f,.13,'sine',.08,i*.04));}
function sndBoss(){tone(80,.18,'sawtooth',.12);tone(60,.24,'square',.09,.12);tone(44,.28,'sawtooth',.08,.28);}
function sndExplode(){if(!AC)return;const t=AC.currentTime,n=AC.sampleRate*.28,buf=AC.createBuffer(1,n,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const src=AC.createBufferSource(),fil=AC.createBiquadFilter(),g=AC.createGain();src.buffer=buf;fil.type='lowpass';fil.frequency.setValueAtTime(360,t);fil.frequency.exponentialRampToValueAtTime(75,t+.22);g.gain.setValueAtTime(.24,t);g.gain.exponentialRampToValueAtTime(.001,t+.28);src.connect(fil);fil.connect(g);g.connect(AC.destination);src.start(t);src.stop(t+.29);}
function startMusic(){initAudio();if(musicOn)return;musicOn=true;let notes=[220,277,330,277,247,294,370,294],i=0;musicTimer=setInterval(()=>{if(!running)return;const boss=hasBoss(),n=notes[i++%notes.length]*(boss?.78:1);tone(n,.18,boss?'sawtooth':'triangle',boss?.13:.09);if(i%2===0)tone(n*1.5,.09,'sine',boss?.055:.038,.04);if(i%4===0)tone(boss?46:64,.24,'square',boss?.12:.075);},265);}
function stopMusic(){musicOn=false;clearInterval(musicTimer);}
function buildMenu(){const el=document.getElementById('tankSelect');el.innerHTML='';SKINS.forEach((s,i)=>{const d=document.createElement('div');d.className='selectCard'+(i===selSkin?' active':'');d.innerHTML=\`<div class="miniTankPreview" style="background:\${s.color}"></div><div class="smallTxt">\${s.name}</div>\`;d.onclick=()=>{selSkin=i;buildMenu();};el.appendChild(d);});}
buildMenu();
function renderLeaders(){const el=document.getElementById('leaderList');el.innerHTML=leaders.length?leaders.slice(0,5).map((l,i)=>\`<li>#\${i+1} — \${l.score} pts • Wave \${l.wave}</li>\`).join(''):'<li>Aucun score</li>';}
renderLeaders();
function saveLeader(){leaders.push({score,wave,date:Date.now()});leaders.sort((a,b)=>b.score-a.score);leaders=leaders.slice(0,5);localStorage.setItem('mtLeaders',JSON.stringify(leaders));renderLeaders();}
function applyTheme(){const m=cmap();wrap.style.background=\`linear-gradient(\${m.grid} 1px,transparent 1px),linear-gradient(90deg,\${m.grid} 1px,transparent 1px),radial-gradient(circle at center,\${toRgba(m.glow,.08)},transparent 45%),\${m.base}\`;wrap.style.backgroundSize='34px 34px,34px 34px,cover,cover';}
applyTheme();
function resetGame(){selMap=Math.floor(Math.random()*MAPS.length);const s=SKINS[selSkin];Object.assign(P,{x:W/2,y:H/2,ang:-Math.PI/2,lives:50,inv:0,shield:0,boost:0,fireCd:0,burst:3,burstRegen:0,bPower:1,multiAmmo:0,weapon:'canon',wAmmo:0,recoil:0,trackT:0,color:s.color,accent:s.accent,type:s.type,spd:s.spd,fireRate:s.fr});rotDir=1;score=0;wave=1;bullets=[];eBullets=[];enemies=[];powerUps=[];particles=[];tracks=[];smokeArr=[];floatTxts=[];hitRings=[];bossSpeech=null;combo=0;comboTimer=0;maxCombo=0;shake=0;slowMo=0;tScale=1;makeObs();makeDecor();spawnWave();updateHUD();updateWeaponHUD();applyTheme();}
function makeDecor(){decor=[];for(let i=0;i<65;i++){decor.push({x:rand(20,W-20),y:rand(70,H-20),r:rand(1,3),a:rand(.1,.45),d:rand(0,10)});}}
function rectsOvlp(a,b,p=0){return a.x-p<b.x+b.w&&a.x+a.w+p>b.x&&a.y-p<b.y+b.h&&a.y+a.h+p>b.y;}
function makeObs(){obstacles=[];const count=W<700?5:8;let tries=0;while(obstacles.length<count&&tries++<500){const o={x:rand(60,W-120),y:rand(105,H-175),w:rand(58,120),h:rand(40,92),radius:16};const cx=o.x+o.w/2,cy=o.y+o.h/2;if(Math.hypot(cx-W/2,cy-H/2)<180)continue;if(obstacles.some(p=>rectsOvlp(o,p,42)))continue;obstacles.push(o);}}
function circRect(c,r){const nx=clamp(c.x,r.x,r.x+r.w),ny=clamp(c.y,r.y,r.y+r.h);return Math.hypot(c.x-nx,c.y-ny)<c.r;}
function hitsObs(b){return obstacles.some(o=>circRect(b,o));}
function canMove(o,nx,ny){const t={x:nx,y:ny,r:o.r};if(nx<o.r+8||nx>W-o.r-8||ny<o.r+58||ny>H-o.r-8)return false;return!obstacles.some(r=>circRect(t,r));}
function tryMove(o,dx,dy){const ox=o.x,oy=o.y;if(canMove(o,ox+dx,oy+dy)){o.x+=dx;o.y+=dy;return true;}if(canMove(o,ox+dx,oy)){o.x+=dx;return true;}if(canMove(o,ox,oy+dy)){o.y+=dy;return true;}return false;}
function hasSight(a,b){const steps=Math.ceil(dist(a,b)/18);for(let i=1;i<steps;i++){const t=i/steps,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,r:4};if(obstacles.some(o=>circRect(p,o)))return false;}return true;}
function edgePos(){const s=Math.floor(rand(0,4));if(s===0)return{x:rand(40,W-40),y:-55};if(s===1)return{x:W+55,y:rand(100,H-90)};if(s===2)return{x:rand(40,W-40),y:H+55};return{x:-55,y:rand(100,H-90)};}
function pickRole(){if(wave<=2)return'normal';const pool=['normal','normal'];if(wave>=3)pool.push('fast');if(wave>=6)pool.push('heavy');if(wave>=8)pool.push('sniper');if(wave>=10)pool.push('kamikaze');return pool[Math.floor(rand(0,pool.length))];}
const ECOLS=['#ff5c7a','#ffb84d','#9a7dff','#52e3ff','#c2ff4d','#ff61dc'];
function makeEnemy(x,y,role,tx,ty){const hasTgt=tx!==undefined;return{x,y,r:role==='fast'?15:role==='heavy'?24:role==='sniper'?17:role==='kamikaze'?16:19,ang:0,color:ECOLS[Math.floor(rand(0,ECOLS.length))],type:role==='heavy'?'heavy':role==='fast'?'mini':role==='sniper'?'wide':'classic',role,isBoss:false,hp:1,maxHp:1,spd:role==='fast'?96+wave*2.2:role==='kamikaze'?92+wave*2.6:role==='heavy'?42+wave*1.2:role==='sniper'?40+wave:60+wave*1.6,fireCd:rand(1.2,2.3),fireRate:role==='sniper'?clamp(2.35-wave*.025,1.5,2.35):clamp(2.05-wave*.025,1.05,2.05),bSpd:role==='sniper'?320+wave*3:220+wave*3,dmg:1,aimErr:role==='sniper'?.1:.18,stuck:0,dodge:0,dodgeT:0,warn:0,entering:hasTgt?.8:0,tx:hasTgt?tx:x,ty:hasTgt?ty:y};}
function spawnEnemy(){const p=edgePos();enemies.push(makeEnemy(p.x,p.y,pickRole()));}
function spawnWave(){if(wave%5===0){spawnBoss();sndBoss();applyTheme();return;}if(wave%4===0){for(let i=0;i<2;i++)spawnEnemy();applyTheme();return;}spawnEnemy();applyTheme();}
function spawnBoss(){const tx=rand(95,W-95),ty=rand(135,H-115);const taunts=['C terminé pour toi !','Tu vas morfler !','Fin de partie !','T es mort !'];bossSpeech={text:taunts[Math.floor(rand(0,taunts.length))],x:tx,y:ty-72,life:2,max:2};enemies.push({x:tx,y:ty,tx,ty,r:32,ang:rand(0,Math.PI*2),color:'#ff3d63',type:'boss',role:'boss',isBoss:true,hp:2,maxHp:2,spd:26+wave*.35,fireCd:rand(3,4),fireRate:rand(3,4),bSpd:175+wave*1.2,dmg:1,aimErr:.22,stuck:0,dodge:0,dodgeT:0,warn:0,entering:0,burstT:7});}
function spawnPower(x,y,guaranteed=false){if(!guaranteed&&Math.random()>.40)return;const roll=Math.random();let p;if(guaranteed)p=roll<.5?{kind:'multi',label:'3',color:'#ff7de9'}:{kind:'missile',label:'M',color:'#ff9b4d'};else if(roll<.45)p={kind:'multi',label:'3',color:'#ff7de9'};else if(roll<.75)p={kind:'missile',label:'M',color:'#ff9b4d'};else if(roll<.88)p={kind:'shield',label:'●',color:'#7db4ff'};else p={kind:'rapid',label:'⚡',color:'#ffe45c'};powerUps.push({x,y,r:15,life:9,pulse:0,...p});}
function setWeapon(k){P.weapon=k;if(k==='missile')P.wAmmo=5;if(k==='canon')P.wAmmo=0;updateWeaponHUD();}
function shoot(){if(!running||P.fireCd>0||P.burst<=0)return;P.burst--;if(P.burst<3&&P.burstRegen<=0)P.burstRegen=.55;P.fireCd=.105;P.recoil=.12;const prev=rotDir;rotDir*=-1;sndShoot(P.weapon);const fx=Math.cos(P.ang),fy=Math.sin(P.ang),sx=-Math.sin(P.ang),off=prev>0?2.2:-2.2;const bx=P.x+fx*29+sx*off,by=P.y+fy*29+Math.cos(P.ang)*off;addSmoke(bx,by,P.ang);if(P.weapon==='missile'){bullets.push({x:bx,y:by,vx:fx*330,vy:fy*330,r:8,life:1.55,dmg:4,missile:true,ang:P.ang,trail:[]});P.wAmmo--;if(P.wAmmo<=0)setWeapon('canon');return;}const spread=P.bPower>=3?[-.12,0,.12]:[0];spread.forEach(s=>{const a=P.ang+s;bullets.push({x:bx+Math.cos(a)*2,y:by+Math.sin(a)*2,vx:Math.cos(a)*560,vy:Math.sin(a)*560,r:5,life:1.15,dmg:1});});if(P.bPower>=3){P.multiAmmo--;if(P.multiAmmo<=0){P.bPower=1;P.multiAmmo=0;}}burst(bx,by,P.color,8,2.1);}
function enemyShoot(e){if(e.isBoss)e.fireCd=rand(3,4);else e.fireCd=e.fireRate+rand(-.2,.35);const a=ang(e,P)+rand(-e.aimErr,e.aimErr);const sp=e.isBoss?[-.12,.12]:[0];sp.forEach(s=>{eBullets.push({x:e.x+Math.cos(a+s)*(e.r+8),y:e.y+Math.sin(a+s)*(e.r+8),vx:Math.cos(a+s)*e.bSpd,vy:Math.sin(a+s)*e.bSpd,r:e.isBoss?6:5,life:e.role==='sniper'?2.7:2.1,dmg:e.dmg||1});});burst(e.x+Math.cos(ang(e,P))*28,e.y+Math.sin(ang(e,P))*28,e.color,6,1.7);}
function bossBurst(e){const a=ang(e,P)+rand(-.12,.12);for(let i=0;i<7;i++){const aa=a+(i-3)*.22;eBullets.push({x:e.x+Math.cos(aa)*42,y:e.y+Math.sin(aa)*42,vx:Math.cos(aa)*(220+wave*2.5),vy:Math.sin(aa)*(220+wave*2.5),r:5,life:2.4,dmg:1});}sndBoss();shake=10;}
function burst(x,y,c,n=18,p=4){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(35,145)*p/3.5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(1.5,4.5),life:rand(.25,.75),max:.75,color:c});}}
function addSmoke(x,y,a){for(let i=0;i<8;i++){smokeArr.push({x,y,vx:Math.cos(a+rand(-.5,.5))*rand(15,60),vy:Math.sin(a+rand(-.5,.5))*rand(15,60),r:rand(5,11),life:rand(.28,.55),max:.55});}}
function addTrack(){tracks.push({x:P.x-Math.cos(P.ang)*10,y:P.y-Math.sin(P.ang)*10,ang:P.ang,life:2.8,max:2.8});if(tracks.length>90)tracks.shift();}
function floatText(x,y,txt,col='#fff'){floatTxts.push({x,y,txt,col,life:1,max:1,vy:-38});}
function hitRing(x,y,r,c){hitRings.push({x,y,r:r+10,color:c,life:.18,max:.18});}
function update(dtRaw){if(!running)return;if(slowMo>0){slowMo-=dtRaw;tScale=.48;}else tScale=1;const dt=dtRaw*tScale;P.fireCd=Math.max(0,P.fireCd-dt);P.inv=Math.max(0,P.inv-dt);P.shield=Math.max(0,P.shield-dt);P.boost=Math.max(0,P.boost-dt);P.recoil=Math.max(0,P.recoil-dt*2.4);if(P.burst<3){P.burstRegen-=dt;if(P.burstRegen<=0){P.burst++;P.burstRegen=P.burst<3?.55:0;}}comboTimer=Math.max(0,comboTimer-dt);if(comboTimer<=0)combo=0;if(!holding)P.ang=norm(P.ang+rotDir*P.spin*dt);if(holding){const sp=P.spd*(P.boost>0?1.15:1);if(tryMove(P,Math.cos(moveAngle)*sp*dt,Math.sin(moveAngle)*sp*dt)){P.trackT-=dt;if(P.trackT<=0){addTrack();P.trackT=.055;}}}updateEnemies(dt);updateBullets(dt);updateEBullets(dt);updatePowers(dt);updateFX(dt);for(let i=enemies.length-1;i>=0;i--){if(enemies[i].hp<=0)killEnemy(i);}if(enemies.length===0){wave++;spawnWave();updateHUD();}shake=Math.max(0,shake-dtRaw*30);updateReload();updateWeaponHUD();}
function updateEnemies(dt){for(const e of enemies){if(e.entering>0){e.entering-=dt;e.x+=(e.tx-e.x)*Math.min(1,dt*2.4);e.y+=(e.ty-e.y)*Math.min(1,dt*2.4);e.ang+=dt*3;continue;}e.ang=ang(e,P);const direct=ang(e,P),gap=dist(e,P),see=hasSight(e,P);let dir=direct;if(e.role==='sniper'){if(gap<250)dir=direct+Math.PI;else if(!see)dir=direct;else dir=direct+Math.PI/2;}if(e.role==='kamikaze'&&gap<e.r+P.r+12&&P.inv<=0){damagePlayer(1);e.hp=0;burst(e.x,e.y,e.color,45,6);sndExplode();}if((!see||e.dodgeT>0)&&e.role!=='kamikaze'){e.dodgeT-=dt;if(e.dodgeT<=0){e.dodgeT=rand(.35,.9);e.dodge=direct+(Math.random()<.5?Math.PI/2:-Math.PI/2)+rand(-.35,.35);}dir=e.dodge;}let moved=true;if(e.role==='sniper')moved=tryMove(e,Math.cos(dir)*e.spd*.75*dt,Math.sin(dir)*e.spd*.75*dt);else if(gap>(e.isBoss?220:180)||!see||e.role==='kamikaze')moved=tryMove(e,Math.cos(dir)*e.spd*dt,Math.sin(dir)*e.spd*dt);else if(gap<115)moved=tryMove(e,-Math.cos(direct)*e.spd*.45*dt,-Math.sin(direct)*e.spd*.45*dt);if(!moved){e.stuck+=dt;e.dodgeT=0;e.dodge=direct+rand(-1.8,1.8);if(e.stuck>1.15){e.x=clamp(e.x+Math.cos(e.dodge)*18,e.r+8,W-e.r-8);e.y=clamp(e.y+Math.sin(e.dodge)*18,e.r+58,H-e.r-8);e.stuck=0;}}else e.stuck=0;e.fireCd-=dt;if(see&&e.role==='sniper'&&e.fireCd<.55)e.warn=.55;else e.warn=Math.max(0,e.warn-dt);if(e.fireCd<=0&&see&&e.role!=='kamikaze')enemyShoot(e);if(e.isBoss){e.burstT-=dt;if(e.burstT<=0){e.burstT=7;bossBurst(e);}}}}
function updateBullets(dt){for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.missile){b.ang=Math.atan2(b.vy,b.vx);b.trail.push({x:b.x,y:b.y,life:.25});if(b.trail.length>12)b.trail.shift();}if(b.x<-40||b.x>W+40||b.y<-40||b.y>H+40||b.life<=0||hitsObs(b)){if(b.missile)missileBoom(b.x,b.y);else{burst(b.x,b.y,'#d8fff7',5,1.5);sndHit();}bullets.splice(i,1);continue;}for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){if(b.missile)missileBoom(b.x,b.y);else{e.hp-=b.dmg;sndHit();burst(b.x,b.y,e.color,14,3.5);hitRing(e.x,e.y,e.r,e.color);}bullets.splice(i,1);shake=b.missile?12:5;break;}}}}
function missileBoom(x,y){sndExplode();burst(x,y,'#ff9b4d',46,6);for(const e of enemies){const d=Math.hypot(x-e.x,y-e.y);if(d<90){e.hp-=clamp(4.4-d/25,1,4.4);hitRing(e.x,e.y,e.r,e.color);}}shake=13;}
function updateEBullets(dt){for(let i=eBullets.length-1;i>=0;i--){const b=eBullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20||b.life<=0||hitsObs(b)){burst(b.x,b.y,'#ff9dad',5,1.5);eBullets.splice(i,1);continue;}if(Math.hypot(b.x-P.x,b.y-P.y)<b.r+P.r){eBullets.splice(i,1);damagePlayer(b.dmg||1);}}}
function damagePlayer(n){if(P.inv>0)return;if(P.shield>0){P.shield=Math.max(0,P.shield-1.5*n);sndHit();}else{P.lives-=n;P.inv=1.15;combo=0;sndExplode();}shake=10;burst(P.x,P.y,P.shield>0?'#7db4ff':'#ff5c7a',24,5);updateHUD();if(P.lives<=0)gameOver();}
function killEnemy(i){const e=enemies[i],boss=e.isBoss;combo++;comboTimer=2.6;maxCombo=Math.max(maxCombo,combo);const base=boss?1000+wave*80:100+wave*15;const bonus=combo>1?Math.floor(base*Math.min(.75,combo*.08)):0;score+=base+bonus;slowMo=boss?.42:.16;sndExplode();burst(e.x,e.y,e.color,boss?70:30,boss?7:4.8);floatText(e.x,e.y-22,\`+\${base+bonus}\${combo>1?' COMBO x'+combo:''}\`,boss?'#ffcf4d':'#fff');spawnPower(e.x,e.y,boss);enemies.splice(i,1);updateHUD();}
function updatePowers(dt){for(let i=powerUps.length-1;i>=0;i--){const p=powerUps[i];p.life-=dt;p.pulse+=dt*7;if(p.life<=0){powerUps.splice(i,1);continue;}if(Math.hypot(p.x-P.x,p.y-P.y)<p.r+P.r+4){if(p.kind==='life')P.lives=Math.min(50,P.lives+1);if(p.kind==='rapid')P.boost=7;if(p.kind==='shield')P.shield=7;if(p.kind==='multi'){P.bPower=3;P.multiAmmo=5;}if(p.kind==='missile')setWeapon('missile');sndPower();burst(p.x,p.y,p.color,30,5);powerUps.splice(i,1);updateHUD();updateWeaponHUD();}}}
function updateFX(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;if(p.life<=0)particles.splice(i,1);}for(let i=smokeArr.length-1;i>=0;i--){const s=smokeArr[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.94;s.vy*=.94;s.r+=dt*18;s.life-=dt;if(s.life<=0)smokeArr.splice(i,1);}for(let i=tracks.length-1;i>=0;i--){tracks[i].life-=dt;if(tracks[i].life<=0)tracks.splice(i,1);}for(let i=floatTxts.length-1;i>=0;i--){const f=floatTxts[i];f.y+=f.vy*dt;f.life-=dt;if(f.life<=0)floatTxts.splice(i,1);}for(let i=hitRings.length-1;i>=0;i--){hitRings[i].life-=dt;if(hitRings[i].life<=0)hitRings.splice(i,1);}if(bossSpeech){bossSpeech.life-=dt;bossSpeech.y-=dt*6;if(bossSpeech.life<=0)bossSpeech=null;}}
function draw(){const m=cmap();ctx.clearRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));drawMap(m);drawTracks();ctx.save();ctx.strokeStyle=toRgba(m.glow,.28);ctx.lineWidth=3;rr(10,55,W-20,H-70,26);ctx.stroke();ctx.restore();obstacles.forEach(drawObs);drawPowers();drawTank(P,true);enemies.forEach(e=>drawTank(e,false));drawBossSpeech();drawHitRings();drawBullets();drawSmoke();drawParticles();drawFloatTxts();ctx.restore();}
function drawMap(m){ctx.save();for(const s of decor){ctx.globalAlpha=s.a;ctx.fillStyle=m.glow;ctx.beginPath();ctx.arc(s.x,s.y+Math.sin(performance.now()/900+s.d)*2,s.r,0,Math.PI*2);ctx.fill();}if(m.key==='lava'){ctx.globalAlpha=.18;ctx.strokeStyle='#ff4f32';ctx.lineWidth=2;for(let i=0;i<8;i++){ctx.beginPath();const y=90+i*80+Math.sin(performance.now()/500+i)*12;ctx.moveTo(0,y);for(let x=0;x<W;x+=60)ctx.lineTo(x,y+Math.sin(x/45+i)*12);ctx.stroke();}}if(m.key==='grass'){ctx.globalAlpha=.12;ctx.strokeStyle='#76ff52';for(let i=0;i<55;i++){const x=(i*83)%W,y=80+((i*47)%(H-100));ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y-10);ctx.stroke();}}if(m.key==='ice'){ctx.globalAlpha=.08;ctx.strokeStyle='#dff8ff';for(let i=0;i<22;i++){const x=(i*113)%W,y=75+((i*67)%(H-95));ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+44,y+Math.sin(i)*8);ctx.stroke();}}ctx.restore();}
function drawTracks(){ctx.save();ctx.fillStyle='rgba(0,0,0,.22)';for(const tr of tracks){ctx.save();ctx.globalAlpha=clamp(tr.life/tr.max,0,.28);ctx.translate(tr.x,tr.y);ctx.rotate(tr.ang);rr(-10,-10,20,4,2);ctx.fill();rr(-10,6,20,4,2);ctx.fill();ctx.restore();}ctx.restore();}
function drawObs(o){const m=cmap();ctx.save();const g=ctx.createLinearGradient(o.x,o.y,o.x+o.w,o.y+o.h);g.addColorStop(0,shade(m.a,.18));g.addColorStop(.55,m.a);g.addColorStop(1,m.b);ctx.fillStyle=g;rr(o.x,o.y,o.w,o.h,o.radius);ctx.fill();ctx.strokeStyle=toRgba(m.glow,.22);ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.08)';rr(o.x+8,o.y+7,o.w-16,8,6);ctx.fill();ctx.fillStyle='rgba(0,0,0,.14)';for(let i=0;i<4;i++){rr(o.x+10+i*24,o.y+22,13,o.h-32,7);ctx.fill();}ctx.restore();}
function drawTank(t,isPlayer){if(isPlayer&&P.inv>0&&Math.floor(performance.now()/90)%2===0)return;const main=t.color,dark=isPlayer?shade(t.color,-.55):'#1a1020';const sc=t.isBoss?1.25:1;ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.ang);ctx.scale(sc,sc);ctx.save();ctx.strokeStyle=toRgba(main,t.isBoss?.3:.3);ctx.lineWidth=t.isBoss?8:12;ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(0,0,t.isBoss?24:20,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#000';ctx.scale(1.2,.4);ctx.beginPath();ctx.arc(0,28,t.isBoss?33:22,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='rgba(3,8,12,.95)';rr(-20,-18,36,10,5);ctx.fill();rr(-20,8,36,10,5);ctx.fill();ctx.fillStyle=main;ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;if(t.type==='wide')rr(-18,-14,32,28,8);else if(t.type==='mini')rr(-13,-12,25,24,8);else if(t.type==='heavy')rr(-21,-16,36,32,9);else if(t.type==='boss')rr(-25,-18,42,36,10);else rr(-16,-14,30,28,9);ctx.fill();ctx.stroke();ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='rgba(255,255,255,.9)';rr(-12,-11,18,7,5);ctx.fill();ctx.restore();const recoil=isPlayer?P.recoil*28:0;ctx.fillStyle=dark;rr(2-recoil,-5,t.isBoss?38:28,10,5);ctx.fill();ctx.fillStyle='rgba(255,255,255,.86)';rr((t.isBoss?32:22)-recoil,-3,10,6,3);ctx.fill();if(t.role==='sniper'){ctx.fillStyle='#111';rr(8,-3,42,6,4);ctx.fill();}if(t.role==='kamikaze'){ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(-6,-10);ctx.lineTo(8,0);ctx.lineTo(-6,10);ctx.closePath();ctx.fill();}ctx.fillStyle=isPlayer?t.accent:'rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(0,0,isPlayer?8:7,0,Math.PI*2);ctx.fill();ctx.fillStyle=main;ctx.beginPath();ctx.arc(0,0,isPlayer?4:3.5,0,Math.PI*2);ctx.fill();if(isPlayer){ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.arc(13,-8,2.5,0,Math.PI*2);ctx.fill();}ctx.restore();if(isPlayer&&P.shield>0){ctx.save();ctx.strokeStyle='rgba(125,180,255,.75)';ctx.lineWidth=3;ctx.globalAlpha=.8+Math.sin(performance.now()/130)*.2;ctx.beginPath();ctx.arc(t.x,t.y,31+Math.sin(performance.now()/200)*2,0,Math.PI*2);ctx.stroke();ctx.restore();}if(t.isBoss){const bw=120,bh=8,bx=t.x-bw/2,by=t.y-t.r*sc-32;ctx.save();ctx.fillStyle='rgba(0,0,0,.6)';rr(bx,by,bw,bh,4);ctx.fill();ctx.fillStyle='#ff3d63';rr(bx,by,bw*clamp(t.hp/t.maxHp,0,1),bh,4);ctx.fill();ctx.restore();}if(t.warn>0){ctx.save();ctx.globalAlpha=clamp(t.warn/.55,0,.45);ctx.strokeStyle='#ff355f';ctx.lineWidth=2;ctx.setLineDash([10,8]);ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(P.x,P.y);ctx.stroke();ctx.setLineDash([]);ctx.restore();}}
function drawPowers(){for(const p of powerUps){ctx.save();ctx.translate(p.x,p.y);const sc=1+Math.sin(p.pulse)*.08;ctx.scale(sc,sc);ctx.save();ctx.strokeStyle=p.color;ctx.lineWidth=6;ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(0,0,p.r+5,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#061015';ctx.font='900 16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.label,0,1);ctx.restore();}}
function drawBossSpeech(){if(!bossSpeech)return;ctx.save();const alpha=clamp(bossSpeech.life/bossSpeech.max,0,1);ctx.globalAlpha=Math.min(1,alpha*1.35);ctx.font='900 16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';const pad=14,tw=ctx.measureText(bossSpeech.text).width,w=Math.min(230,tw+pad*2),h=40;const x=clamp(bossSpeech.x-w/2,16,W-w-16),y=clamp(bossSpeech.y,90,H-100);ctx.fillStyle='rgba(20,8,14,.88)';rr(x,y,w,h,18);ctx.fill();ctx.strokeStyle='rgba(255,100,130,.75)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ffdce4';ctx.fillText(bossSpeech.text,x+w/2,y+h/2);ctx.beginPath();ctx.moveTo(x+w/2-9,y+h);ctx.lineTo(x+w/2+10,y+h);ctx.lineTo(x+w/2,y+h+13);ctx.closePath();ctx.fillStyle='rgba(20,8,14,.88)';ctx.fill();ctx.restore();}
function drawBullets(){for(const b of bullets){if(b.missile){for(const tr of b.trail){ctx.save();ctx.globalAlpha=tr.life;ctx.fillStyle='#ff9b4d';ctx.beginPath();ctx.arc(tr.x,tr.y,4,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.ang);ctx.fillStyle='#ff9b4d';rr(-8,-5,18,10,5);ctx.fill();ctx.fillStyle='#fff2d9';rr(4,-3,8,6,3);ctx.fill();ctx.restore();continue;}ctx.save();ctx.fillStyle='#dffff8';ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.restore();}for(const b of eBullets){ctx.save();ctx.fillStyle='#ffd6df';ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.restore();}}
function drawSmoke(){ctx.save();for(const s of smokeArr){ctx.globalAlpha=clamp(s.life/s.max,0,.25);ctx.fillStyle='rgba(210,220,220,.7)';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.restore();}
function drawParticles(){for(const p of particles){ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore();}}
function drawHitRings(){for(const h of hitRings){ctx.save();ctx.globalAlpha=clamp(h.life/h.max,0,1);ctx.strokeStyle=h.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x,h.y,h.r*(1+(1-h.life/h.max)*.55),0,Math.PI*2);ctx.stroke();ctx.restore();}}
function drawFloatTxts(){for(const f of floatTxts){ctx.save();ctx.globalAlpha=clamp(f.life/f.max,0,1);ctx.fillStyle=f.col;ctx.font='900 18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.txt,f.x,f.y);ctx.restore();}}
function updateHUD(){document.getElementById('lives').textContent='♥'.repeat(Math.max(0,Math.ceil(P.lives/10)));document.getElementById('score').textContent=score;document.getElementById('wave').textContent=wave;if(score>bestScore){bestScore=score;localStorage.setItem('mtBest',bestScore);document.getElementById('best').textContent=bestScore;}}
function updateWeaponHUD(){const n={canon:\`Canon • \${P.burst}/3\`,missile:\`Missile x\${P.wAmmo} • \${P.burst}/3\`};document.getElementById('weaponName').textContent=n[P.weapon]||'Canon';}
function updateReload(){const bar=document.getElementById('reloadBar');bar.style.width=\`\${clamp(P.burst/3,0,1)*100}%\`;bar.style.filter=P.burst>0?'brightness(1.25)':'brightness(.65)';}
function gameOver(){
  running=false;holding=false;stopMusic();saveLeader();
  // ── Envoyer le score au parent Next.js
  notifyParent('TANK_GAME_OVER', { score });
  const menu=document.getElementById('menu');
  menu.classList.remove('hidden');
  menu.querySelector('h1').textContent='Game Over';
  menu.querySelector('p').textContent=\`Score: \${score} • Meilleur: \${bestScore} • Combo max: x\${maxCombo}\`;
  document.getElementById('startBtn').textContent='Rejouer';
  applyTheme();
}
function loop(t){const dt=Math.min(.033,(t-lastTime)/1000||0);lastTime=t;update(dt);draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
document.getElementById('startBtn').onclick=()=>{
  initAudio();
  document.getElementById('menu').classList.add('hidden');
  resetGame();running=true;startMusic();lastTime=performance.now();
  notifyParent('TANK_STARTED', {});
};
function onDown(e){if(!running)return;initAudio();e.preventDefault();holding=true;moveAngle=P.ang;lastDown=performance.now();}
function onUp(e){if(!running)return;e.preventDefault();holding=false;if(performance.now()-lastDown<260)shoot();}
function onCancel(e){if(!running)return;e.preventDefault();holding=false;}
canvas.addEventListener('pointerdown',onDown,{passive:false});
canvas.addEventListener('pointerup',onUp,{passive:false});
canvas.addEventListener('pointercancel',onCancel,{passive:false});
canvas.addEventListener('pointerleave',onCancel,{passive:false});
addEventListener('keydown',e=>{if(e.code==='Space'){initAudio();shoot();}});
<\/script>
</body>
</html>`;
}