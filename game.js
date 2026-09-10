const canvas=document.getElementById('board');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const overlay=document.getElementById('overlay');
const ranksEl=document.getElementById('ranks');
const againBtn=document.getElementById('again');
const CELL=20, COLS=canvas.width/CELL, ROWS=canvas.height/CELL;
const RANK_KEY='snake-top5';
let snake,dir,nextDir,food,score,best,ticking,paused,dead,touchStart,ranks;
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
    const n=ranks[i];
    li.innerHTML='<span>#'+(i+1)+'</span><span>'+(n==null?'--':n)+'</span>';
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
function reset(){
  const cx=Math.floor(COLS/2),cy=Math.floor(ROWS/2);
  snake=[{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
  dir={x:1,y:0};
  nextDir={x:1,y:0};
  score=0;
  scoreEl.textContent='0';
  paused=false;
  dead=false;
  placeFood();
}
function placeFood(){
  for(;;){
    const x=Math.floor(Math.random()*COLS),y=Math.floor(Math.random()*ROWS);
    if(!snake.some(p=>p.x===x&&p.y===y)){food={x,y};return;}
  }
}
function drawCell(x,y,color){
  ctx.fillStyle=color;
  ctx.fillRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2);
}
function draw(){
  ctx.fillStyle='#0e1116';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#2a3140';
  for(let i=0;i<=COLS;i++){ctx.beginPath();ctx.moveTo(i*CELL,0);ctx.lineTo(i*CELL,canvas.height);ctx.stroke();}
  for(let j=0;j<=ROWS;j++){ctx.beginPath();ctx.moveTo(0,j*CELL);ctx.lineTo(canvas.width,j*CELL);ctx.stroke();}
  drawCell(food.x,food.y,'#fb7185');
  snake.forEach((p,i)=>drawCell(p.x,p.y,i===0?'#34d399':'#6ee7b7'));
}
function stopLoop(){
  if(ticking){ clearInterval(ticking); ticking=null; }
}
function startLoop(){
  if(ticking) return;
  ticking=setInterval(step,120);
}
function die(){
  dead=true;
  paused=false;
  stopLoop();
  recordScore(score);
  overlay.textContent='Score '+score+'  Best '+best;
  if(againBtn) againBtn.hidden=false;
}
function step(){
  if(!ticking||paused||dead)return;
  dir=nextDir;
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(head.x<0||head.y<0||head.x>=COLS||head.y>=ROWS)return die();
  if(snake.some(p=>p.x===head.x&&p.y===head.y))return die();
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){
    score+=1;
    scoreEl.textContent=String(score);
    if(score>best){best=score;bestEl.textContent=String(best);}
    placeFood();
  } else { snake.pop(); }
  draw();
}
function restart(firstDir){
  stopLoop();
  overlay.textContent='';
  if(againBtn) againBtn.hidden=true;
  reset();
  if(firstDir){ dir=firstDir; nextDir=firstDir; }
  draw();
  startLoop();
}
function applyDir(nd){
  if(!nd)return;
  if(dead){ restart(nd); return; }
  if(nd.x===-dir.x&&nd.y===-dir.y)return;
  nextDir=nd;
  if(!ticking){ overlay.textContent=''; startLoop(); }
}
const keymap={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},w:{x:0,y:-1},a:{x:-1,y:0},s:{x:0,y:1},d:{x:1,y:0},W:{x:0,y:-1},A:{x:-1,y:0},S:{x:0,y:1},D:{x:1,y:0}};
document.addEventListener('keydown',e=>{
  if(e.key===' '||e.code==='Space'){
    e.preventDefault();
    if(dead){ restart(); return; }
    if(!ticking) return;
    paused=!paused;
    overlay.textContent=paused?'Paused':'';
    return;
  }
  applyDir(keymap[e.key]);
});
if(againBtn){
  againBtn.addEventListener('click',()=>restart());
}
function touchPoint(e){
  const t=e.changedTouches[0];
  return {x:t.clientX,y:t.clientY};
}
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  touchStart=touchPoint(e);
},{passive:false});
canvas.addEventListener('touchmove',e=>{e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  if(!touchStart)return;
  const end=touchPoint(e);
  const dx=end.x-touchStart.x;
  const dy=end.y-touchStart.y;
  touchStart=null;
  if(Math.abs(dx)<20&&Math.abs(dy)<20){
    if(dead) restart();
    return;
  }
  const nd=Math.abs(dx)>Math.abs(dy)?{x:dx>0?1:-1,y:0}:{x:0,y:dy>0?1:-1};
  applyDir(nd);
},{passive:false});
reset();
draw();
if(againBtn) againBtn.hidden=true;
