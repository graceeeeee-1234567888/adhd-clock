/* Piano Garden FX: one bounded animation loop owns every decorative effect. */
(() => {
  'use strict';
  const ambient=document.createElement('canvas'), foreground=document.createElement('canvas');
  ambient.className='ambient-particles'; foreground.className='burst-particles';
  for(const canvas of [ambient,foreground]) { canvas.setAttribute('aria-hidden','true');document.body.appendChild(canvas); }
  const ctx=ambient.getContext('2d'),fx=foreground.getContext('2d');
  if(!ctx||!fx) { ambient.remove();foreground.remove();return; }
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=true;
  try { enabled=localStorage.getItem('piano_particles')!=='off'; } catch(_) {}
  const palette=['#7aad85','#ce8ab2','#86afd3','#e2c77d'];
  const pointer={x:-1000,y:-1000,active:false};
  let width=innerWidth,height=innerHeight,frame=0,previous=0,time=0,nextAmbient=3;
  let motes=[],bubbles=[],particles=[],rockets=[],waves=[],jobs=[],labels=[];
  let stage=null,stageAttempted=false,boostUntil=0,lastTrail=0,partyUntil=0;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const choose=array=>array[Math.floor(Math.random()*array.length)];
  const calm=()=>document.body.classList.contains('zen');
  const allowed=()=>enabled&&!preference.matches;
  const active=()=>allowed()&&!document.hidden;
  const cap=()=>width<600?850:1700;
  const consoleBox=document.createElement('section');
  consoleBox.className='fx-console';consoleBox.setAttribute('aria-label','五毛特效放映厅');
  consoleBox.innerHTML='<div class="fx-console-heading"><div><span class="fx-ticket" aria-hidden="true">✹</span><strong>五毛特效放映厅</strong><span class="fx-console-sub">快乐不用等练完</span></div></div><div class="fx-actions"><button type="button" class="fx-action" data-show="notes">♫ 音符暴雨</button><button type="button" class="fx-action" data-show="bubbles">◌ 泡泡喷泉</button><button type="button" class="fx-action" data-show="fireworks">✹ 烟花连发</button><button type="button" class="fx-action fx-action-big" data-show="party">★ 全部炸开</button></div><p class="fx-status" aria-live="polite">自由试玩 · 不消耗星星 · 鼠标划过会拖出星光</p>';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='mini particle-toggle';
  consoleBox.querySelector('.fx-console-heading').appendChild(toggle);
  document.querySelector('.topbar').appendChild(consoleBox);
  const status=consoleBox.querySelector('.fx-status');
  const showButtons=Array.from(consoleBox.querySelectorAll('[data-show]'));
  const spriteCache=new Map();
  function sprite(kind,color) {
    const key=kind+color;if(spriteCache.has(key))return spriteCache.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=160;
    const c=canvas.getContext('2d');c.translate(80,80);
    c.lineJoin='round';c.shadowColor=color;c.shadowBlur=9;
    if(kind==='bubble') {
      const gradient=c.createRadialGradient(-20,-25,2,0,0,62);
      gradient.addColorStop(0,'#fffdf380');gradient.addColorStop(.65,color+'12');gradient.addColorStop(.88,color+'55');gradient.addColorStop(1,color+'cc');
      c.fillStyle=gradient;c.beginPath();c.arc(0,0,61,0,Math.PI*2);c.fill();
      c.lineWidth=3;c.strokeStyle=color;c.stroke();
      c.shadowBlur=0;c.strokeStyle='#fffcf2';c.lineWidth=6;c.beginPath();c.arc(-4,-5,45,3.35,4.65);c.stroke();
      c.fillStyle='#fffdf3';c.beginPath();c.ellipse(-30,-36,8,5,-.7,0,Math.PI*2);c.fill();
      c.strokeStyle='#e4cbe9';c.lineWidth=3;c.beginPath();c.arc(2,2,55,.3,1.5);c.stroke();
    } else if(kind==='note') {
      c.textAlign='center';c.textBaseline='middle';c.font='bold 119px Georgia,serif';
      c.shadowBlur=0;c.fillStyle='#53665e';
      for(let d=8;d>0;d-=2)c.fillText('♪',d,d);
      const g=c.createLinearGradient(-25,-50,25,55);g.addColorStop(0,'#fff8e8');g.addColorStop(.3,color);g.addColorStop(.7,color);g.addColorStop(1,'#5f7263');
      c.fillStyle=g;c.fillText('♪',0,0);c.strokeStyle='#fff6de';c.lineWidth=1;c.strokeText('♪',0,0);
    } else if(kind==='star') {
      const vertices=[];
      for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?25:61;vertices.push([Math.cos(a)*r,Math.sin(a)*r]);}
      c.shadowBlur=4;
      for(let i=0;i<10;i++) { c.fillStyle=i%2?color:'#f4ead4';c.beginPath();c.moveTo(0,0);c.lineTo(...vertices[i]);c.lineTo(...vertices[(i+1)%10]);c.closePath();c.fill(); }
      c.strokeStyle=color;c.lineWidth=2;c.beginPath();vertices.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.stroke();
      c.fillStyle='#fffef5';c.beginPath();c.arc(-10,-15,7,0,Math.PI*2);c.fill();
    } else if(kind==='ring') {
      c.strokeStyle=color;c.lineWidth=13;c.beginPath();c.ellipse(0,0,57,28,-.35,0,Math.PI*2);c.stroke();
      c.strokeStyle='#fff6e1';c.lineWidth=4;c.beginPath();c.ellipse(-2,-3,56,26,-.35,Math.PI,Math.PI*2);c.stroke();
    } else {
      c.rotate(.3);c.fillStyle=color;c.fillRect(-34,-42,68,84);c.fillStyle='#fff5dc80';c.fillRect(-34,-42,18,84);c.strokeStyle='#577a6688';c.lineWidth=3;c.strokeRect(-34,-42,68,84);
    }
    spriteCache.set(key,canvas);return canvas;
  }
  function paint(surface,p,alpha=1) {
    surface.save();surface.globalAlpha=alpha;surface.translate(p.x,p.y);surface.rotate(p.angle||0);
    const size=p.size;surface.drawImage(sprite(p.kind,p.color),-size,-size,size*2,size*2);surface.restore();
  }
  function addParticle(p) {
    if(particles.length>=cap())return;
    particles.push({x:0,y:0,vx:0,vy:0,life:2,total:2,size:5,kind:'star',color:choose(palette),angle:0,spin:0,gravity:45,drag:.35,...p});
  }
  function enqueue(delay,type,data={}) { if(jobs.length<40)jobs.push({at:time+delay,type,data}); }
  function ring(x,y,color=choose(palette),radius=14) { if(waves.length<14)waves.push({x,y,color,radius,life:1.3,total:1.3}); }
  function label(text,x=width/2,y=height*.3) { if(labels.length>=3)labels.shift();labels.push({text,x,y,life:2.1,total:2.1}); }
  function explode(x,y,amount=115,quiet=false) {
    const color=choose(palette);
    ring(x,y,color); if(!quiet)boostUntil=Math.max(boostUntil,time+1.5);
    const count=Math.min(amount,cap()-particles.length);
    for(let i=0;i<count;i++) {
      const a=i/count*Math.PI*2+rand(-.04,.04),v=rand(60,260),life=rand(1.1,2.7);
      addParticle({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,total:life,size:i%8===0?rand(10,18):rand(2,5),
        kind:i%8===0?choose(['star','note','petal']):'spark',color:i%4?color:choose(palette),spin:rand(-3,3),gravity:55});
    }
  }
  function launch(x=rand(.12,.88)*width,y=rand(.15,.48)*height,quiet=false) {
    if(rockets.length>=12)return;
    rockets.push({x,y:height+15,tx:x+rand(-35,35),ty:y,life:0,total:rand(.65,1.1),color:choose(palette),quiet});
  }
  function rain(kind,count) {
    for(let i=0;i<count;i++) {
      const life=rand(3,5.5),bubble=kind==='bubble';
      addParticle({x:rand(-30,width+30),y:bubble?height+rand(10,120):rand(-150,-20),vx:rand(-35,35),vy:bubble?rand(-170,-80):rand(75,190),
        gravity:bubble?-4:16,drag:.03,life,total:life,size:bubble?rand(20,65):rand(12,30),kind,color:choose(palette),spin:rand(-.8,.8),angle:rand(-.4,.4)});
    }
  }
  function fireworks(long=false) {
    if(!active())return;
    const count=long?13:7;
    for(let i=0;i<count;i++)enqueue(i*.4,'launch',{x:width*(.12+(i*.193)% .76),y:height*(.14+(i*.117)%.38)});
    boostUntil=time+(long?8:5);label(long?'今天的努力，值得一整片烟花！':'五毛烟花 · 盛大开场');
  }
  function show(type) {
    if(!active()||calm())return;
    // Repeated clicks refresh the show instead of accumulating unbounded timers.
    jobs=[];labels=[];
    if(type==='notes') { for(let i=0;i<7;i++)enqueue(i*.35,'rain',{kind:'note',count:14});label('音符暴雨，快乐超标 ♫'); }
    if(type==='bubbles') { for(let i=0;i<8;i++)enqueue(i*.3,'rain',{kind:'bubble',count:9});label('咕噜咕噜 · 灵感冒泡'); }
    if(type==='fireworks')fireworks();
    if(type==='party') {
      partyUntil=time+8;fireworks(true);
      for(let i=0;i<8;i++){enqueue(i*.55,'rain',{kind:i%2?'star':'note',count:12});enqueue(i*.6,'rain',{kind:'bubble',count:5});}
      label('练琴宇宙 · 全部炸开！',width/2,height*.47);
    }
    boostUntil=Math.max(boostUntil,time+6);
    status.textContent='正在放映：'+({notes:'音符暴雨',bubbles:'泡泡喷泉',fireworks:'烟花连发',party:'全部炸开'}[type])+' · 可随时关闭特效';
  }
  function celebrate(count=50) {
    if(!active())return;
    if(calm()){ring(width/2,height*.4,palette[0]);return;}
    explode(width*.5,height*.38,Math.min(220,count*2));
    enqueue(.25,'launch',{x:width*.22,y:height*.28});enqueue(.55,'launch',{x:width*.78,y:height*.32});
    rain('petal',30);boostUntil=time+3;
  }
  function clear() {
    particles=[];rockets=[];waves=[];jobs=[];labels=[];boostUntil=partyUntil=0;
    ctx.clearRect(0,0,width,height);fx.clearRect(0,0,width,height);
    document.body.classList.remove('fx-party','fx-hot');
  }
  function updateStage(method,...args) {
    if(!stage)return;
    try { stage[method](...args); }
    catch(_) {
      try { stage.dispose(); } catch(_) {}
      stage=null; // Keep Canvas effects and the clock running if WebGL fails.
    }
  }
  function resize() {
    width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
    const dpr=Math.min(devicePixelRatio||1,width<600?1.25:1.5);
    for(const canvas of [ambient,foreground]){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);fx.setTransform(dpr,0,0,dpr,0,0);
    motes=Array.from({length:width<600?44:100},()=>({x:rand(0,width),y:rand(0,height),size:rand(3,10),kind:choose(['star','note','petal']),color:choose(palette),angle:rand(0,6.28),spin:rand(-.4,.4),vx:rand(-9,9),vy:rand(-20,-6)}));
    bubbles=Array.from({length:width<600?5:10},(_,i)=>({x:rand(0,width),y:rand(0,height),size:rand(25,62),kind:'bubble',color:palette[i%4],phase:rand(0,6.28),speed:rand(10,24)}));
    updateStage('resize',width,height);
  }
  function draw(now) {
    frame=0;if(!active())return;
    const dt=previous?Math.min((now-previous)/1000,.045):0;previous=now;time+=dt;
    const quiet=calm(),boost=quiet?0:Math.max(0,Math.min(1,boostUntil-time));
    ctx.clearRect(0,0,width,height);fx.clearRect(0,0,width,height);
    document.body.classList.toggle('fx-hot',boost>0);
    document.body.classList.toggle('fx-party',!quiet&&time<partyUntil);
    updateStage('render',time,pointer,boost,quiet);
    for(const p of bubbles) {
      p.y-=p.speed*dt*(quiet?.2:1);if(p.y < -p.size){p.y=height+p.size;p.x=rand(0,width);}
      const x=p.x;p.x+=Math.sin(time*.5+p.phase)*12;paint(ctx,p,quiet?.13:.55);p.x=x;
    }
    for(const p of motes) {
      p.x=(p.x+p.vx*dt+width)%width;p.y=(p.y+p.vy*dt*(quiet?.25:1)+height)%height;p.angle+=p.spin*dt;
      paint(ctx,p,quiet?.12:.55);
      if(pointer.active&&!quiet){const d=Math.hypot(p.x-pointer.x,p.y-pointer.y);if(d<145){ctx.globalAlpha=(1-d/145)*.24;ctx.strokeStyle=p.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(pointer.x,pointer.y);ctx.stroke();}}
    }
    ctx.globalAlpha=1;
    if(!quiet&&time>=nextAmbient){launch(Math.random()<.5?width*.08:width*.92,rand(.12,.4)*height,true);nextAmbient=time+rand(6,10);}
    const due=jobs.filter(job=>job.at<=time);jobs=jobs.filter(job=>job.at>time);
    for(const job of due){if(quiet)continue;if(job.type==='launch')launch(job.data.x,job.data.y);else if(job.type==='rain')rain(job.data.kind,job.data.count);}
    for(const rocket of rockets) {
      rocket.life+=dt;const t=Math.min(1,rocket.life/rocket.total),ease=1-(1-t)**2;
      const x=rocket.x+(rocket.tx-rocket.x)*t,y=height+15+(rocket.ty-height-15)*ease;
      fx.globalAlpha=1;fx.strokeStyle=rocket.color;fx.lineWidth=3;fx.beginPath();fx.moveTo(x,y+28);fx.lineTo(x,y);fx.stroke();
      paint(fx,{x,y,size:9,kind:'star',color:rocket.color},1);
      if(t>=1)explode(x,y,rocket.quiet?60:140,rocket.quiet);
    }
    rockets=rockets.filter(r=>r.life<r.total);
    for(const p of particles) {
      const oldX=p.x,oldY=p.y;
      p.life-=dt;p.vy+=p.gravity*dt;p.vx*=Math.exp(-p.drag*dt);p.vy*=Math.exp(-p.drag*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
      const alpha=Math.max(0,Math.min(1,p.life/.55))*(quiet?.25:1);
      if(p.kind==='spark'){
        fx.globalAlpha=alpha;fx.strokeStyle=p.color;fx.lineWidth=p.size*.65;fx.beginPath();fx.moveTo(oldX-p.vx*.025,oldY-p.vy*.025);fx.lineTo(p.x,p.y);fx.stroke();
      } else paint(fx,p,alpha);
    }
    particles=particles.filter(p=>p.life>0&&p.y<height+200&&p.y>-450);
    for(const w of waves){w.life-=dt;w.radius+=dt*210;fx.globalAlpha=Math.max(0,w.life/w.total)*.65;fx.strokeStyle=w.color;fx.lineWidth=3;fx.beginPath();fx.ellipse(w.x,w.y,w.radius,w.radius*.65,time*.3,0,Math.PI*2);fx.stroke();}
    waves=waves.filter(w=>w.life>0);
    for(const item of labels) {
      item.life-=dt;fx.save();fx.globalAlpha=Math.max(0,Math.min(1,item.life/.4));fx.translate(item.x,item.y-(item.total-item.life)*13);fx.rotate(-.045);
      const fontSize=Math.min(35,Math.max(17,width/26));fx.font='900 '+fontSize+'px "Microsoft YaHei",sans-serif';fx.textAlign='center';fx.textBaseline='middle';
      fx.lineJoin='round';fx.lineWidth=8;fx.strokeStyle='#fffae8';fx.strokeText(item.text,0,0);fx.fillStyle='#98658c';fx.fillText(item.text,0,0);fx.restore();
    }
    labels=labels.filter(item=>item.life>0);fx.globalAlpha=1;
    frame=requestAnimationFrame(draw);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;previous=0;
    document.body.classList.toggle('effects-off',!allowed());
    toggle.textContent=preference.matches?'✦ 动态已静止':enabled?'✦ 特效开':'✦ 特效关';
    toggle.setAttribute('aria-pressed',String(allowed()));toggle.disabled=preference.matches;
    toggle.title=preference.matches?'已遵循系统减少动态效果设置':'开启或关闭所有装饰特效';
    showButtons.forEach(button=>{button.disabled=!allowed()||calm();});
    for(const id of ['fireworkBtn','shakeBtn']){const button=document.getElementById(id);if(button){button.disabled=!allowed();button.title=allowed()?'':'先开启特效即可使用';}}
    clear();nextAmbient=time+3;
    if(active()){
      if(!stageAttempted){stageAttempted=true;try{stage=window.createGardenStage?window.createGardenStage():null;}catch(_){stage=null;}}
      updateStage('setVisible',true);
      frame=requestAnimationFrame(draw);
    }else updateStage('setVisible',false);
    status.textContent=preference.matches?'已遵循系统减少动态效果设置。':!enabled?'特效已关闭，随时可以再打开。':calm()?'专注模式：只留下轻轻漂浮的泡泡。':'自由试玩 · 不消耗星星 · 鼠标划过会拖出星光';
  }
  toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('piano_particles',enabled?'on':'off');}catch(_){}sync();});
  showButtons.forEach(button=>button.addEventListener('click',()=>show(button.dataset.show)));
  document.getElementById('startBtn').addEventListener('click',()=>{
    if(!active()||calm()||!document.getElementById('timeText').classList.contains('ticking'))return;
    const box=document.querySelector('.ring-wrap').getBoundingClientRect();ring(box.x+box.width/2,box.y+box.height/2,palette[1],box.width*.4);
    celebrate(90);rain('note',24);label(document.querySelector('.pill.active').dataset.mode==='focus'?'把快乐练出来！':'休息一下，灵感冒泡！',width/2,height*.22);
  });
  document.getElementById('zenBtn').addEventListener('click',sync);
  addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;
    if(!active()||calm()||time-lastTrail<.025)return;lastTrail=time;
    for(let i=0;i<2;i++)addParticle({x:pointer.x+rand(-8,8),y:pointer.y+rand(-8,8),vx:rand(-35,35),vy:rand(-40,10),life:.8,total:.8,size:rand(6,14),kind:choose(['star','note']),color:choose(palette),spin:rand(-2,2),gravity:25});
  },{passive:true});
  addEventListener('pointerdown',event=>{
    if(!active()||calm()||event.button>0)return;
    if(event.target.closest&&event.target.closest('button,input,select,textarea,a'))return;
    ring(event.clientX,event.clientY);
    for(const bubble of bubbles)if(Math.hypot(event.clientX-bubble.x,event.clientY-bubble.y)<bubble.size+12){explode(bubble.x,bubble.y,40,true);bubble.y=height+bubble.size;break;}
  },{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.active=false;});
  addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',sync);preference.addEventListener('change',sync);
  addEventListener('pagehide',event=>{cancelAnimationFrame(frame);frame=0;if(stage&&!event.persisted){stage.dispose();stage=null;}});
  addEventListener('pageshow',event=>{if(event.persisted)sync();});
  window.PianoEffects={celebrate,fireworks:()=>fireworks(true),show,clear,get enabled(){return allowed();}};
  resize();sync();
})();
