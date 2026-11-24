(() => {
  const KEY = 'dailyBingo.v1';
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const defaults = Array.from({length:9}, (_,i) => `My task ${i+1}`);
  let state = load();
  let toastTimer;

  function load(){
    try {
      const s=JSON.parse(localStorage.getItem(KEY));
      if(!s || !Array.isArray(s.tasks) || s.tasks.length!==9) return {tasks:null,stats:{playedDays:[],bingoDays:[]}};
      s.stats=s.stats && Array.isArray(s.stats.playedDays) && Array.isArray(s.stats.bingoDays) ? s.stats : {playedDays:[],bingoDays:[]};
      return s;
    } catch { return {tasks:null,stats:{playedDays:[],bingoDays:[]}}; }
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function shuffled(){ const a=[0,1,2,3,4,5,6,7,8]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function newDay(){ state.date=today(); state.order=shuffled(); state.done=[]; save(); }
  function ensureDay(){ if(!state.tasks) return; if(state.date!==today() || !Array.isArray(state.order) || state.order.length!==9){newDay();} }
  function showToast(msg){ const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900); }
  function fields(target, values){ const root=$(target);root.innerHTML=''; values.forEach((v,i)=>{const label=document.createElement('label');label.className='task-field';const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');const input=document.createElement('input');input.type='text';input.maxLength=64;input.required=true;input.value=v;input.placeholder=`Task ${i+1}`;input.autocomplete='off';label.append(n,input);root.append(label);}); }
  function readFields(target){return [...$(target).querySelectorAll('input')].map(x=>x.value.trim());}
  function showSetup(){ $('setup').hidden=false; $('game').hidden=true; fields('setupFields',state.tasks||defaults.map(()=>'')); }
  function showGame(){ $('setup').hidden=true; $('game').hidden=false; render(); }
  function dateOffset(dateString, offset){
    const d=new Date(`${dateString}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  }
  function streakLength(days, endDate){
    const set=new Set(days);let count=0,d=endDate;
    while(set.has(d)){count++;d=dateOffset(d,-1);}
    return count;
  }
  function getLines(){ return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; }
  function updateStats(){
    const stats=state.stats || (state.stats={playedDays:[],bingoDays:[],totalBingos:0,bingoLinesByDay:{}});
    stats.playedDays=Array.isArray(stats.playedDays)?stats.playedDays:[];
    stats.bingoDays=Array.isArray(stats.bingoDays)?stats.bingoDays:[];
    stats.bingoLinesByDay=stats.bingoLinesByDay && typeof stats.bingoLinesByDay==='object'?stats.bingoLinesByDay:{};
    if(!Number.isFinite(stats.totalBingos)) stats.totalBingos=new Set(stats.bingoDays).size;
    const day=today();
    if(state.done.length && !stats.playedDays.includes(day)) stats.playedDays.push(day);
    const winning=getLines().filter(line=>line.every(pos=>state.done.includes(state.order[pos])));
    const earned=stats.bingoLinesByDay[day] || (stats.bingoLinesByDay[day]=[]);
    let newBingos=0;
    for(const line of winning){
      const signature=line.map(pos=>state.order[pos]).sort((a,b)=>a-b).join('-');
      if(!earned.includes(signature)){earned.push(signature);stats.totalBingos++;newBingos++;}
    }
    if(winning.length && !stats.bingoDays.includes(day)) stats.bingoDays.push(day);
    save();
    return newBingos;
  }
  function renderStats(){
    const stats=state.stats || {playedDays:[],bingoDays:[]};
    const played=[...new Set(stats.playedDays)].sort();
    const currentEnd=played.includes(today())?today():played.includes(dateOffset(today(),-1))?dateOffset(today(),-1):null;
    let best=0,run=0,previous=null;
    for(const day of played){run=previous && dateOffset(previous,1)===day?run+1:1;best=Math.max(best,run);previous=day;}
    $('currentStreak').textContent=currentEnd?streakLength(played,currentEnd):0;
    $('bestStreak').textContent=best;
    $('bingoTotal').textContent=Number.isFinite(stats.totalBingos)?stats.totalBingos:new Set(stats.bingoDays||[]).size;
    $('daysPlayed').textContent=played.length;
  }
  function render(){
    ensureDay();
    const date=new Date(`${state.date}T12:00:00`);$('dateLabel').textContent=date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
    const board=$('board');board.innerHTML='';const lines=getLines();
    const winning=lines.filter(line=>line.every(pos=>state.done.includes(state.order[pos])));const winningPositions=new Set(winning.flat());
    state.order.forEach((taskIndex,pos)=>{const b=document.createElement('button');b.type='button';b.className='square'+(state.done.includes(taskIndex)?' done':'')+(winningPositions.has(pos)?' in-line':'');b.setAttribute('aria-pressed',state.done.includes(taskIndex)?'true':'false');const num=document.createElement('span');num.className='number';num.textContent=String(pos+1).padStart(2,'0');const text=document.createElement('span');text.textContent=state.tasks[taskIndex];const check=document.createElement('span');check.className='check';check.textContent='✓';b.append(num,text,check);b.addEventListener('click',()=>toggle(taskIndex));board.append(b);});
    const count=state.done.length;$('doneCount').textContent=count;renderStats();$('progressFill').style.width=`${count/9*100}%`;
    $('bingoMessage').textContent=winning.length?(count===9?'BLACKOUT! All nine completed.':winning.length===1?'BINGO! You completed a line.':`BINGO! ${winning.length} lines completed.`):count===9?'All nine done. Nicely played!':count===0?'A line is waiting to happen.':`${9-count} squares left. Keep going.`;
  }
  function toggle(i){state.done=state.done.includes(i)?state.done.filter(x=>x!==i):[...state.done,i];let newBingos=0;if(state.done.length)newBingos=updateStats();save();render();if(newBingos){showToast(newBingos===1?'BINGO! 🎉':`${newBingos} new BINGOS! 🎉`);celebrate();}}
  function celebrate(){if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const layer=document.createElement('div');layer.className='confetti-layer';layer.setAttribute('aria-hidden','true');const colors=['#e76f51','#e9c46a','#2a9d8f','#8d6bc2','#f4a261','#6aab9c'];for(let i=0;i<64;i++){const piece=document.createElement('i');piece.className='confetti-piece';piece.style.setProperty('--x',`${Math.random()*100}vw`);piece.style.setProperty('--fall',`${65+Math.random()*45}vh`);piece.style.setProperty('--spin',`${Math.random()*900-450}deg`);piece.style.setProperty('--delay',`${Math.random()*450}ms`);piece.style.setProperty('--color',colors[i%colors.length]);piece.style.setProperty('--w',`${5+Math.random()*6}px`);piece.style.setProperty('--h',`${8+Math.random()*9}px`);layer.append(piece);}document.body.append(layer);setTimeout(()=>layer.remove(),2400);}
  $('setupForm').addEventListener('submit',e=>{e.preventDefault();const tasks=readFields('setupFields');if(tasks.some(x=>!x)){showToast('Please fill in all nine tasks.');return;}state={tasks};newDay();showGame();});
  $('editButton').addEventListener('click',()=>{fields('editFields',state.tasks);$('editDialog').showModal();});
  $('editForm').addEventListener('submit',e=>{if(e.submitter && e.submitter.value==='save'){const tasks=readFields('editFields');if(tasks.some(x=>!x)){e.preventDefault();showToast('Please fill in all nine tasks.');return;}state.tasks=tasks;save();render();showToast('Your task list is saved.');}});
  $('resetButton').addEventListener('click',()=>{state.done=[];save();render();showToast("Today's card is reset.");});
  if(state.tasks){ensureDay();showGame();}else{showSetup();}
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  // Catch a day change while the app remains open.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && state.tasks && state.date!==today()){newDay();render();showToast('A fresh card for a new day!');}});
})();
