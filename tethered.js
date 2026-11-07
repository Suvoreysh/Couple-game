// TETHERED — 3D co-op game for two (boyfriend + girlfriend). Single file, zero dependencies.
// Run:  node tethered.js   → open http://localhost:3000   (PORT env supported, e.g. Render)
const http = require('http');
const PORT = process.env.PORT || 3000;
const rooms = {};

const HTML = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Tethered</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;overflow:hidden;background:#070b22;font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#fff;touch-action:none;user-select:none}
canvas{display:block}
#hud{position:fixed;left:12px;top:10px;right:12px;pointer-events:none;display:none}
#lvl{font-weight:800;font-size:18px;text-shadow:0 2px 8px #000}
#hint{font-size:13px;opacity:.85;max-width:480px;margin-top:2px;text-shadow:0 2px 8px #000}
#bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);width:min(320px,60vw);height:10px;border-radius:9px;background:#ffffff22;overflow:hidden;display:none}
#fill{height:100%;width:0;background:#ff6fae;transition:background .15s}
#barl{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);font-size:11px;letter-spacing:2px;opacity:.7;display:none}
#toast{position:fixed;left:50%;top:22%;transform:translateX(-50%);padding:10px 18px;border-radius:14px;background:#000a;font-weight:700;opacity:0;transition:opacity .3s;pointer-events:none;text-align:center;max-width:86vw}
#menu,#fin{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:radial-gradient(circle at 50% 30%,#2a1850,#070b22 70%);z-index:5;padding:20px;text-align:center}
#fin{display:none}
h1{margin:0;font-size:clamp(40px,12vw,76px);letter-spacing:6px;background:linear-gradient(90deg,#4da3ff,#ff6fae);-webkit-background-clip:text;color:transparent}
p.s{margin:0 0 8px;opacity:.8;max-width:420px;font-size:14px}
button{font:inherit;font-weight:700;padding:13px 22px;border:0;border-radius:14px;color:#fff;background:linear-gradient(90deg,#4da3ff,#ff6fae);cursor:pointer;min-width:240px}
button.g{background:#ffffff1c}
input{font:inherit;font-weight:700;text-transform:uppercase;text-align:center;padding:12px;border-radius:12px;border:2px solid #ffffff33;background:#0006;color:#fff;width:130px;letter-spacing:4px}
.row{display:flex;gap:8px;align-items:center}
#status{min-height:20px;font-size:14px;color:#ffd1e6;max-width:440px;word-break:break-all}
#stick{position:fixed;left:22px;bottom:22px;width:130px;height:130px;border-radius:50%;background:#ffffff14;border:2px solid #ffffff30;display:none;z-index:3}
#knob{position:absolute;left:41px;top:41px;width:48px;height:48px;border-radius:50%;background:#ffffff55}
#jump{position:fixed;right:26px;bottom:34px;width:92px;height:92px;border-radius:50%;background:#ff6fae66;border:2px solid #ffffff55;display:none;z-index:3;align-items:center;justify-content:center;font-weight:800;font-size:15px}
#help{font-size:12px;opacity:.6;max-width:440px}
</style></head><body>
<div id="hud"><div id="lvl"></div><div id="hint"></div></div>
<div id="bar"><div id="fill"></div></div><div id="barl">ROPE</div>
<div id="toast"></div>
<div id="stick"><div id="knob"></div></div><div id="jump">JUMP</div>
<div id="menu">
  <h1>TETHERED</h1>
  <p class="s">Two hearts, one rope. Nobody can finish alone. Hold plates, build bridges, and get both of you to the glowing exit.</p>
  <button id="bCreate">Create online room</button>
  <div class="row"><input id="code" maxlength="6" placeholder="CODE"><button id="bJoin" style="min-width:110px">Join</button></div>
  <button id="bLocal" class="g">Play on this device (2 players)</button>
  <div id="status"></div>
  <div id="help">Online: WASD / arrows to move, Space to jump (touch: stick + JUMP).<br>Same device: Blue = WASD + Space, Pink = Arrows + Enter.</div>
</div>
<div id="fin"><h1>YOU MADE IT</h1><p class="s" style="font-size:22px">Together, tied by a rope, all the way to the end.</p><div style="font-size:64px">&#10084;&#65039;</div><button id="bAgain">Play again</button></div>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const $=id=>document.getElementById(id);
const W=0.35,H=1.0,SPEED=7,JUMP=11,G=30,COL=[0x4da3ff,0xff6fae];
const P=(x0,z0,x1,z1,t,c)=>[x0,t-1,z0,x1,t,z1,c||0x26345f];

const L=[
{name:'1 · First Steps',hint:'Stand on a plate to open the door of the same color. Your partner then holds the plate on the other side so you can pass.',rope:14,
 spawn:[[-1.5,0,-2],[1.5,0,-2]],
 boxes:[P(-5,-4,5,14,0),P(-5,17,5,40,0)],
 plates:[{id:'a',x:3,z:23,y:0},{id:'b',x:-3,z:33,y:0}],
 doors:[{b:[-5,0,28,5,5,29],by:['a','b'],bridge:false,color:0xff5577}],
 exit:{x:0,y:0,z:37}},
{name:'2 · Bridges',hint:'Bridges only exist while someone stands on a matching plate. Take turns.',rope:18,
 spawn:[[-1.5,0,-2],[1.5,0,-2]],
 boxes:[P(-4,-4,4,8,0),P(-4,20,4,34,0),P(-4,46,4,60,0)],
 plates:[{id:'a',x:0,z:6.5,y:0},{id:'b',x:0,z:21.5,y:0},{id:'c',x:0,z:32.5,y:0},{id:'d',x:0,z:47.5,y:0}],
 doors:[{b:[-1.5,-1,8,1.5,0,20],by:['a','b'],bridge:true,color:0x55ddff},
        {b:[-1.5,-1,34,1.5,0,46],by:['c','d'],bridge:true,color:0xffcc33}],
 exit:{x:0,y:0,z:57}},
{name:'3 · Sky Climb',hint:'Climb the stepping stones, pass the wall, cross the last bridge. Careful, the rope pulls.',rope:19,
 spawn:[[-1.5,0,-2],[1.5,0,-2]],
 boxes:[P(-4,-4,4,6,0),P(-1.5,9,1.5,12,0),P(-1.5,15,1.5,18,1.2),P(-1.5,21,1.5,24,2.4),P(-1.5,27,1.5,30,3.6),
        P(-5,33,5,52,3.6),P(-5,64,5,80,3.6)],
 plates:[{id:'c',x:3,z:38,y:3.6},{id:'d',x:-3,z:47,y:3.6},{id:'a',x:3,z:50.2,y:3.6},{id:'b',x:-3,z:65.5,y:3.6}],
 doors:[{b:[-5,3.6,42,5,8.6,43],by:['c','d'],bridge:false,color:0xb06bff},
        {b:[-1.5,2.6,52,1.5,3.6,64],by:['a','b'],bridge:true,color:0x55ffa0}],
 exit:{x:0,y:3.6,z:76}}
];

const net={mode:'',slot:0,es:null,room:'',id:Math.random().toString(36).slice(2),started:false,first:true};
const keys={},touch={x:0,z:0,j:false};
let lv=null,cur=0,group=null,exitT=0,netT=0,toastT=0,done=false;

// ---------- three ----------
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0a0f2c);
scene.fog=new THREE.Fog(0x0a0f2c,30,110);
const cam=new THREE.PerspectiveCamera(55,1,0.1,400);
cam.position.set(0,10,-12);
scene.add(new THREE.HemisphereLight(0xbfd8ff,0x30204a,1.0));
const sun=new THREE.DirectionalLight(0xffffff,1.1);sun.position.set(8,20,-6);scene.add(sun);
function resize(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
const sg=new THREE.BufferGeometry(),sp=[];
for(let i=0;i<700;i++){const a=Math.random()*6.283,b=Math.acos(2*Math.random()-1),r=120+Math.random()*40;sp.push(r*Math.sin(b)*Math.cos(a),r*Math.cos(b)*0.7+20,r*Math.sin(b)*Math.sin(a));}
sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
const stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.8,fog:false}));scene.add(stars);

const pl=[0,1].map(i=>{
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.35,0.3,6,12),new THREE.MeshStandardMaterial({color:COL[i],emissive:COL[i],emissiveIntensity:0.3}));
  body.position.y=0.5;g.add(body);
  const em=new THREE.MeshBasicMaterial({color:0x111111});
  [-0.13,0.13].forEach(ex=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.06,8,8),em);e.position.set(ex,0.66,-0.31);g.add(e);});
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.5,0.62,28),new THREE.MeshBasicMaterial({color:0xffee66,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=0.04;ring.visible=false;g.add(ring);
  scene.add(g);
  return {i,g,ring,x:0,y:0,z:0,vy:0,grounded:false,coy:0,on:null,safe:{x:0,y:0,z:0},tx:0,ty:0,tz:0};
});
const beads=[];const bm=new THREE.MeshStandardMaterial({color:0xff9ccb,emissive:0xff4f9a,emissiveIntensity:0.6});
for(let i=0;i<16;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),bm);scene.add(b);beads.push(b);}

function boxMesh(b,mat,edge){
  const geo=new THREE.BoxGeometry(b[3]-b[0],b[4]-b[1],b[5]-b[2]);
  const m=new THREE.Mesh(geo,mat);
  m.position.set((b[0]+b[3])/2,(b[1]+b[4])/2,(b[2]+b[5])/2);
  if(edge){const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:edge,transparent:true,opacity:0.55}));m.add(e);m.userData.edge=e;}
  return m;
}
let exitRing=null,exitGlow=null;
function loadLevel(n){
  cur=n;exitT=0;
  if(group)scene.remove(group);
  if(n>=L.length){finale();return;}
  lv=L[n];group=new THREE.Group();scene.add(group);
  lv.boxes.forEach(b=>group.add(boxMesh(b,new THREE.MeshStandardMaterial({color:b[6],roughness:0.8}),0x7fb0ff)));
  const pc={};
  lv.doors.forEach(d=>{
    d.open=false;d.op=d.bridge?0.14:0.92;
    d.mesh=boxMesh(d.b,new THREE.MeshStandardMaterial({color:d.color,emissive:d.color,emissiveIntensity:0.35,transparent:true,opacity:d.op}),d.color);
    d.b.door=true;group.add(d.mesh);d.by.forEach(id=>{if(!pc[id])pc[id]=d.color;});
  });
  lv.plates.forEach(p=>{
    const c=pc[p.id]||0xffffff;
    p.mesh=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.95,0.14,24),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:0.3}));
    p.mesh.position.set(p.x,p.y+0.07,p.z);group.add(p.mesh);
  });
  const e=lv.exit;
  exitRing=new THREE.Mesh(new THREE.TorusGeometry(2.4,0.12,10,40),new THREE.MeshBasicMaterial({color:0xffee66}));
  exitRing.rotation.x=Math.PI/2;exitRing.position.set(e.x,e.y+0.1,e.z);group.add(exitRing);
  exitGlow=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,6,32,1,true),new THREE.MeshBasicMaterial({color:0xffee66,transparent:true,opacity:0.14,side:THREE.DoubleSide}));
  exitGlow.position.set(e.x,e.y+3,e.z);group.add(exitGlow);
  pl.forEach((p,i)=>{const s=lv.spawn[i];p.x=p.tx=s[0];p.y=p.ty=s[1];p.z=p.tz=s[2];p.vy=0;p.safe={x:s[0],y:s[1],z:s[2]};});
  $('lvl').textContent=lv.name;$('hint').textContent=lv.hint;toast(lv.name,2600);
}
function finale(){done=true;$('fin').style.display='flex';}
function toast(t,ms){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>e.style.opacity=0,ms||1600);}

// ---------- physics ----------
function solids(){const s=lv.boxes.slice();lv.doors.forEach(d=>{if(d.open===d.bridge)s.push(d.b);});return s;}
const ov=(p,b)=>p.x-W<b[3]&&p.x+W>b[0]&&p.z-W<b[5]&&p.z+W>b[2]&&p.y<b[4]-0.001&&p.y+H>b[1]+0.001;
function phys(p,dt,k){
  const S=solids();
  let ix=k.x,iz=k.z;const m=Math.hypot(ix,iz);if(m>1){ix/=m;iz/=m;}
  const vx=-ix*SPEED,vz=iz*SPEED;
  p.x+=vx*dt;
  for(const b of S)if(ov(p,b)){if(b[4]-p.y<0.31&&b[4]>p.y)p.y=b[4];else p.x=p.x<(b[0]+b[3])/2?b[0]-W-0.0005:b[3]+W+0.0005;}
  p.z+=vz*dt;
  for(const b of S)if(ov(p,b)){if(b[4]-p.y<0.31&&b[4]>p.y)p.y=b[4];else p.z=p.z<(b[2]+b[5])/2?b[2]-W-0.0005:b[5]+W+0.0005;}
  p.coy=p.grounded?0.1:p.coy-dt;
  if(k.j&&p.coy>0){p.vy=JUMP;p.coy=0;p.grounded=false;}
  p.vy-=G*dt;p.y+=p.vy*dt;p.grounded=false;p.on=null;
  for(const b of S)if(ov(p,b)){if(p.vy<=0){p.y=b[4];p.vy=0;p.grounded=true;p.on=b;}else{p.y=b[1]-H;p.vy=0;}}
  if(p.grounded&&p.on&&!p.on.door){p.safe={x:p.x,y:p.y,z:p.z};}
  if(p.y<-14){p.x=p.safe.x;p.y=p.safe.y+0.5;p.z=p.safe.z;p.vy=0;toast('Oops! Back to safe ground',1000);}
}
function ropeC(a,b,fa,fb){
  const R=lv.rope,dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
  if(d>R){const e=(d-R)/d;a.x+=dx*e*fa;a.z+=dz*e*fa;b.x-=dx*e*fb;b.z-=dz*e*fb;}
  return d;
}
function inputFor(i){
  const k=keys;let x=0,z=0,j=false;
  if(net.mode==='local'){
    if(i===0){x=(k.KeyD?1:0)-(k.KeyA?1:0)+touch.x;z=(k.KeyW?1:0)-(k.KeyS?1:0)+touch.z;j=!!k.Space||touch.j;}
    else{x=(k.ArrowRight?1:0)-(k.ArrowLeft?1:0);z=(k.ArrowUp?1:0)-(k.ArrowDown?1:0);j=!!(k.Enter||k.ShiftRight);}
  }else{
    x=((k.KeyD||k.ArrowRight)?1:0)-((k.KeyA||k.ArrowLeft)?1:0)+touch.x;
    z=((k.KeyW||k.ArrowUp)?1:0)-((k.KeyS||k.ArrowDown)?1:0)+touch.z;
    j=!!k.Space||touch.j;
  }
  return {x:Math.max(-1,Math.min(1,x)),z:Math.max(-1,Math.min(1,z)),j};
}
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>{keys[e.code]=false;});

// touch
if(matchMedia('(pointer:coarse)').matches){$('stick').style.display='block';$('jump').style.display='flex';}
(function(){
  const st=$('stick'),kn=$('knob');let id=null;
  function mv(e){const r=st.getBoundingClientRect(),cx=r.left+65,cy=r.top+65;let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy),m=50;if(d>m){dx*=m/d;dy*=m/d;}
    kn.style.left=(41+dx)+'px';kn.style.top=(41+dy)+'px';touch.x=dx/m;touch.z=-dy/m;}
  st.addEventListener('pointerdown',e=>{id=e.pointerId;st.setPointerCapture(id);mv(e);});
  st.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e);});
  const up=e=>{if(e.pointerId===id){id=null;touch.x=touch.z=0;kn.style.left='41px';kn.style.top='41px';}};
  st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  const j=$('jump');j.addEventListener('pointerdown',()=>touch.j=true);j.addEventListener('pointerup',()=>touch.j=false);j.addEventListener('pointercancel',()=>touch.j=false);
})();

// ---------- network ----------
function send(m){if(net.mode!=='online')return;fetch('/send?room='+net.room+'&id='+net.id,{method:'POST',body:JSON.stringify(m),keepalive:true}).catch(()=>{});}
function joinOnline(code){
  net.mode='online';net.room=code;
  $('status').textContent='Connecting…';
  const es=new EventSource('/events?room='+code+'&id='+net.id);net.es=es;
  es.onmessage=ev=>{
    const m=JSON.parse(ev.data);
    if(m.t==='hello'){net.slot=m.slot;$('status').textContent='Room '+code+' · you are '+(m.slot===0?'BLUE':'PINK')+'. Waiting for your partner… Share this link: '+location.origin+'/?room='+code;}
    else if(m.t==='full'){$('status').textContent='That room is full.';es.close();net.mode='';}
    else if(m.t==='count'){if(m.n>=2&&!net.started)startGame();else if(m.n<2&&net.started)toast('Partner disconnected…',2500);}
    else if(m.t==='p'){const o=pl[1-net.slot];o.tx=m.x;o.ty=m.y;o.tz=m.z;if(net.first){o.x=m.x;o.y=m.y;o.z=m.z;net.first=false;}}
    else if(m.t==='lvl'){if(m.n!==cur&&net.started)loadLevel(m.n);}
  };
  es.onerror=()=>{if(!net.started)$('status').textContent='Connection problem. Retrying…';};
}
function startGame(){
  net.started=true;$('menu').style.display='none';$('hud').style.display='block';$('bar').style.display='block';$('barl').style.display='block';
  pl.forEach(p=>p.ring.visible=net.mode==='online'&&p.i===net.slot);
  done=false;loadLevel(0);
}
const rand4=()=>Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*24)]).join('');
$('bLocal').onclick=()=>{net.mode='local';startGame();};
$('bCreate').onclick=()=>joinOnline(rand4());
$('bJoin').onclick=()=>{const c=$('code').value.trim().toUpperCase();if(c.length>=3)joinOnline(c);};
$('bAgain').onclick=()=>{$('fin').style.display='none';done=false;loadLevel(0);send({t:'lvl',n:0});};
const qr=new URLSearchParams(location.search).get('room');if(qr){$('code').value=qr.toUpperCase();joinOnline(qr.toUpperCase());}

// ---------- loop ----------
const look=new THREE.Vector3(0,0,0);let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(lv&&net.started&&!done){
    const local=net.mode==='local';
    pl.forEach(p=>{
      if(local||p.i===net.slot)phys(p,dt,inputFor(p.i));
      else{const f=Math.min(1,dt*14);p.x+=(p.tx-p.x)*f;p.y+=(p.ty-p.y)*f;p.z+=(p.tz-p.z)*f;}
    });
    if(local)ropeC(pl[0],pl[1],0.5,0.5);else ropeC(pl[net.slot],pl[1-net.slot],1,0);
    const pressed={};
    lv.plates.forEach(pt=>{pressed[pt.id]=pl.some(p=>Math.abs(p.x-pt.x)<1&&Math.abs(p.z-pt.z)<1&&Math.abs(p.y-pt.y)<0.4);
      pt.mesh.position.y=pt.y+(pressed[pt.id]?0.03:0.07);pt.mesh.material.emissiveIntensity=pressed[pt.id]?1.3:0.3;});
    lv.doors.forEach(d=>{d.open=d.by.some(id=>pressed[id]);
      const t=d.bridge?(d.open?0.9:0.14):(d.open?0:0.92);d.op+=(t-d.op)*Math.min(1,dt*10);
      d.mesh.material.opacity=d.op;d.mesh.visible=d.op>0.02;if(d.mesh.userData.edge)d.mesh.userData.edge.material.opacity=Math.min(0.55,d.op);});
    // exit
    const e=lv.exit;
    const inn=pl.every(p=>Math.hypot(p.x-e.x,p.z-e.z)<2.6&&Math.abs(p.y-e.y)<2);
    exitT=inn?exitT+dt:0;
    exitRing.material.color.set(inn?0x66ff99:0xffee66);exitGlow.material.color.set(inn?0x66ff99:0xffee66);
    exitRing.rotation.z+=dt;
    if(exitT>0.9){toast('Level complete ❤',1500);const n=cur+1;send({t:'lvl',n});loadLevel(n);}
    // net
    netT+=dt;if(netT>0.08&&net.mode==='online'){netT=0;const m=pl[net.slot];send({t:'p',x:+m.x.toFixed(2),y:+m.y.toFixed(2),z:+m.z.toFixed(2)});}
  }
  // visuals
  pl.forEach(p=>p.g.position.set(p.x,p.y,p.z));
  const a=pl[0],b=pl[1];
  const d=Math.hypot(a.x-b.x,a.z-b.z),R=lv?lv.rope:14,slack=Math.max(0,(R-d)/R);
  beads.forEach((s,i)=>{const t=i/(beads.length-1);
    s.position.set(a.x+(b.x-a.x)*t,a.y+0.6+(b.y-a.y)*t-Math.sin(Math.PI*t)*(0.2+slack*2.2),a.z+(b.z-a.z)*t);});
  const tens=Math.min(1,d/R);bm.color.setHex(tens>0.88?0xff3b3b:0xff9ccb);
  $('fill').style.width=(tens*100)+'%';$('fill').style.background=tens>0.88?'#ff3b3b':'#ff6fae';
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,mz=(a.z+b.z)/2;
  const want=new THREE.Vector3(mx,my+9+d*0.45,mz-11-d*0.5);
  cam.position.lerp(want,1-Math.exp(-4*dt));
  look.lerp(new THREE.Vector3(mx,my,mz+2),1-Math.exp(-6*dt));cam.lookAt(look);
  stars.position.copy(cam.position);
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
</script></body></html>`;

function broadcast(r, msg, except) {
  const line = 'data:' + (typeof msg === 'string' ? msg : JSON.stringify(msg)) + '\n\n';
  r.clients.forEach(c => { if (c !== except) c.res.write(line); });
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const code = (u.searchParams.get('room') || '').toUpperCase().slice(0, 8);
  const id = u.searchParams.get('id') || '';

  if (u.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
      'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'
    });
    const r = rooms[code] || (rooms[code] = { clients: [] });
    if (r.clients.length >= 2) { res.write('data:{"t":"full"}\n\n'); return res.end(); }
    const slot = r.clients.some(c => c.slot === 0) ? 1 : 0;
    const c = { id, slot, res };
    r.clients.push(c);
    res.write('data:' + JSON.stringify({ t: 'hello', slot }) + '\n\n');
    broadcast(r, { t: 'count', n: r.clients.length });
    const hb = setInterval(() => res.write(':hb\n\n'), 15000);
    req.on('close', () => {
      clearInterval(hb);
      r.clients = r.clients.filter(x => x !== c);
      if (!r.clients.length) delete rooms[code]; else broadcast(r, { t: 'count', n: r.clients.length });
    });
    return;
  }

  if (u.pathname === '/send' && req.method === 'POST') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 1000) req.destroy(); });
    req.on('end', () => {
      const r = rooms[code];
      const me = r && r.clients.find(c => c.id === id);
      if (me) { try { JSON.parse(body); broadcast(r, body, me); } catch (e) {} }
      res.writeHead(204); res.end();
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
}).listen(PORT, () => console.log('Tethered running on http://localhost:' + PORT));
