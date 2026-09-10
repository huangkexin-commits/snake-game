const canvas=document.getElementById('board');
const ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const overlay=document.getElementById('overlay');
const CELL=20, COLS=canvas.width/CELL, ROWS=canvas.height/CELL;
let snake,dir,nextDir,food,score,best,ticking,paused,dead;
best=Number(localStorage.getItem('snake-best')||0);
bestEl.textContent=best;
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
function die(){dead=true;overlay.textContent='Game over. Space to restart';}
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
    if(score>best){best=score;bestEl.textContent=String(best);localStorage.setItem('snake-best',String(best));}
    placeFood();
  } else { snake.pop(); }
  draw();
}
function startLoop(){if(ticking)return;ticking=setInterval(step,120);}
const keymap={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},w:{x:0,y:-1},a:{x:-1,y:0},s:{x:0,y:1},d:{x:1,y:0},W:{x:0,y:-1},A:{x:-1,y:0},S:{x:0,y:1},D:{x:1,y:0}};
document.addEventListener('keydown',e=>{
  if(e.key===' '||e.code==='Space'){
    e.preventDefault();
    if(dead){overlay.textContent='';reset();draw();startLoop();return;}
    if(!ticking)return;
    paused=!paused;
    overlay.textContent=paused?'Paused':'';
    return;
  }
  const nd=keymap[e.key];
  if(!nd)return;
  e.preventDefault();
  if(dead)return;
  if(nd.x===-dir.x&&nd.y===-dir.y)return;
  nextDir=nd;
  if(!ticking){overlay.textContent='';startLoop();}
});
reset();
draw();
