const canvas=document.getElementById('board');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const overlay=document.getElementById('overlay');
const ranksEl=document.getElementById('ranks');
const againBtn=document.getElementById('again');
const cover=document.getElementById('cover');
const overMsg=document.getElementById('over-msg');
const pauseBtn=document.getElementById('pause');
const CELL=20, COLS=canvas.width/CELL, ROWS=canvas.height/CELL;
const RANK_KEY='snake-top5';

const muteBtn=document.getElementById('mute');
let audioCtx=null, muted=localStorage.getItem('snake-mute')==='1';
function unlockAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return;
  if(!audioCtx) audioCtx=new AC();
  if(audioCtx.state==='suspended') audioCtx.resume();
}
function beep(freq,dur,type,vol){
  if(muted||!audioCtx) return;
  const o=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o.type=type||'square';
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  g.gain.setValueAtTime(vol||0.05, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime+dur);
}
function sfxEat(){ beep(720,0.06,'square',0.045); setTimeout(()=>beep(980,0.07,'square',0.04),45); }
function sfxDie(){ beep(240,0.16,'sawtooth',0.05); setTimeout(()=>beep(140,0.22,'sawtooth',0.045),110); }
function sfxStart(){ beep(523,0.07,'triangle',0.045); setTimeout(()=>beep(784,0.1,'triangle',0.045),70); }
function renderMute(){ if(muteBtn){ muteBtn.classList.toggle('off', muted); muteBtn.style.opacity=muted?'0.45':'1'; } }
renderMute();
if(muteBtn){
  muteBtn.addEventListener('click', e=>{
    e.preventDefault();
    muted=!muted;
    localStorage.setItem('snake-mute', muted?'1':'0');
    if(!muted) unlockAudio();
    renderMute();
  });
}
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){ this.rect(x,y,w,h); };
}
let snake,dir,nextDir,food,score,best,ticking,paused,dead,started,touchStart,ranks,particles,tickMs;
function loadRanks(){
  let arr=[];
  try { arr=JSON.parse(localStorage.getItem(RANK_KEY)||'[]'); } catch(e) { arr=[]; }
  if(!Array.isArray(arr)) arr=[];
  arr=arr.map(Number).filter(n=>Number.isFinite(n)&&n>0);
  const old=Number(localStorage.getItem('snake-best')||0);
  if(old>0 && !arr.includes(old)) arr.push(old);
  arr.sort((a,b)=>b-a);
  return arr.slice(0,5);
}
function saveRanks(){
  localStorage.setItem(RANK_KEY, JSON.stringify(ranks));
  if(ranks[0]) localStorage.setItem('snake-best', String(ranks[0]));
}
function renderRanks(){
  ranksEl.innerHTML='';
  for(let i=0;i<5;i++){
    const li=document.createElement('li');
    li.innerHTML='<span>#'+(i+1)+'</span><span>'+(ranks[i]==null?'--':ranks[i])+'</span>';
    ranksEl.appendChild(li);
  }
  best=ranks[0]||0;
  bestEl.textContent=String(best);
}
function recordScore(n){
  if(n>0){
    ranks.push(n);
    ranks.sort((a,b)=>b-a);
    ranks=ranks.slice(0,5);
    saveRanks();
  }
  renderRanks();
}
ranks=loadRanks();
renderRanks();
function reset(firstDir){
  const cx=Math.floor(COLS/2),cy=Math.floor(ROWS/2);
  const d=firstDir||{x:1,y:0};
  snake=[{x:cx,y:cy},{x:cx-d.x,y:cy-d.y},{x:cx-2*d.x,y:cy-2*d.y}];
  dir=d; nextDir=d;
  score=0; scoreEl.textContent='0';
  paused=false; dead=false; particles=[]; tickMs=140;
  placeFood();
}
function placeFood(){
  for(;;){
    const x=Math.floor(Math.random()*COLS), y=Math.floor(Math.random()*ROWS);
    if(!snake.some(p=>p.x===x&&p.y===y)){ food={x,y}; return; }
  }
}
function burst(x,y){
  for(let i=0;i<8;i++){
    particles.push({x:(x+0.5)*CELL,y:(y+0.5)*CELL,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:12});
  }
}
function roundCell(x,y,color,r){
  const px=x*CELL+2, py=y*CELL+2, s=CELL-4;
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.roundRect(px,py,s,s,r);
  ctx.fill();
}
function draw(){
  const g=ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,'#10263c'); g.addColorStop(1,'#071018');
  ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='rgba(255,255,255,.04)';
  for(let i=0;i<=COLS;i++){ctx.beginPath();ctx.moveTo(i*CELL,0);ctx.lineTo(i*CELL,canvas.height);ctx.stroke();}
  for(let j=0;j<=ROWS;j++){ctx.beginPath();ctx.moveTo(0,j*CELL);ctx.lineTo(canvas.width,j*CELL);ctx.stroke();}
  ctx.fillStyle='#ff6b8a';
  ctx.beginPath();
  ctx.arc((food.x+0.5)*CELL,(food.y+0.5)*CELL,7,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#fff6';
  ctx.beginPath();
  ctx.arc((food.x+0.5)*CELL-2,(food.y+0.5)*CELL-2,2.2,0,Math.PI*2);
  ctx.fill();
  snake.forEach((p,i)=>{
    roundCell(p.x,p.y, i===0 ? '#5ef0b6' : '#2fbf86', i===0?8:6);
  });
  const h=snake[0];
  ctx.fillStyle='#042015';
  const ex=h.x*CELL+CELL/2+dir.x*3, ey=h.y*CELL+CELL/2+dir.y*3;
  ctx.beginPath(); ctx.arc(ex-3,ey-2,1.6,0,Math.PI*2); ctx.arc(ex+3,ey-2,1.6,0,Math.PI*2); ctx.fill();
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(p.life/12,0);
    ctx.fillStyle='#ffd37a';
    ctx.fillRect(p.x,p.y,3,3);
    ctx.globalAlpha=1;
  });
}
function stopLoop(){ if(ticking){ clearInterval(ticking); ticking=null; } }
function startLoop(){
  stopLoop();
  ticking=setInterval(step, tickMs);
}
function setCover(show, msg, btn){
  cover.hidden=!show;
  if(msg!=null) overMsg.textContent=msg;
  if(btn) againBtn.textContent=btn;
}
function die(){
  dead=true; paused=false; started=true;
  stopLoop();
  recordScore(score);
  sfxDie();
  setCover(true, 'Score '+score+'   Best '+best);
}
function step(){
  if(!ticking||paused||dead) return;
  dir=nextDir;
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(head.x<0||head.y<0||head.x>=COLS||head.y>=ROWS) return die();
  if(snake.some(p=>p.x===head.x&&p.y===head.y)) return die();
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){
    score+=1; scoreEl.textContent=String(score);
    if(score>best){ best=score; bestEl.textContent=String(best); }
    burst(food.x,food.y); sfxEat();
    placeFood();
    tickMs=Math.max(70, 140-Math.floor(score/3)*8);
    startLoop();
  } else snake.pop();
  particles=particles.filter(p=>--p.life>0);
  particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; });
  draw();
}
function restart(firstDir){
  started=true;
  unlockAudio();
  sfxStart();
  reset(firstDir);
  setCover(false);
  overlay.textContent='';
  draw();
  startLoop();
}
function applyDir(nd){
  if(!nd) return;
  if(!started||dead){ restart(nd); return; }
  if(nd.x===-dir.x&&nd.y===-dir.y) return;
  nextDir=nd;
  if(!ticking) startLoop();
}
const keymap={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},w:{x:0,y:-1},a:{x:-1,y:0},s:{x:0,y:1},d:{x:1,y:0},W:{x:0,y:-1},A:{x:-1,y:0},S:{x:0,y:1},D:{x:1,y:0}};
document.addEventListener('keydown',e=>{
  unlockAudio();
  if(e.key===' '||e.code==='Space'||e.key==='Enter'){
    e.preventDefault();
    if(!started||dead){ restart(); return; }
    paused=!paused;
    overlay.textContent=paused?'Paused':'';
    return;
  }
  applyDir(keymap[e.key]);
});
againBtn.addEventListener('click', e=>{ e.preventDefault(); unlockAudio(); restart(); });
pauseBtn.addEventListener('click', ()=>{
  if(!started||dead) return;
  paused=!paused;
  overlay.textContent=paused?'Paused':'';
});
function touchPoint(e){ const t=e.changedTouches[0]; return {x:t.clientX,y:t.clientY}; }
canvas.addEventListener('touchstart',e=>{ e.preventDefault(); unlockAudio(); touchStart=touchPoint(e); },{passive:false});
canvas.addEventListener('touchmove',e=>{ e.preventDefault(); },{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  if(!touchStart) return;
  const end=touchPoint(e);
  const dx=end.x-touchStart.x, dy=end.y-touchStart.y;
  touchStart=null;
  if(Math.abs(dx)<20&&Math.abs(dy)<20){ if(!started||dead) restart(); return; }
  applyDir(Math.abs(dx)>Math.abs(dy)?{x:dx>0?1:-1,y:0}:{x:0,y:dy>0?1:-1});
},{passive:false});
reset();
draw();
setCover(true, document.querySelector('h1').textContent, document.getElementById('again').textContent);
