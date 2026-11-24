(() => {
  const KEY = 'dailyBingo.v1';
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const defaults = Array.from({length:9}, (_,i) => `My task ${i+1}`);
  let state = load();
  let toastTimer;

  function load(){ try { const s=JSON.parse(localStorage.getItem(KEY)); return s && Array.isArray(s.tasks) && s.tasks.length===9 ? s : {tasks:null}; } catch { return {tasks:null}; } }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function shuffled(){ const a=[0,1,2,3,4,5,6,7,8]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function newDay(){ state.date=today(); state.order=shuffled(); state.done=[]; save(); }
  function ensureDay(){ if(!state.tasks) return; if(state.date!==today() || !Array.isArray(state.order) || state.order.length!==9){newDay();} }
  function showToast(msg){ const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900); }
  function fields(target, values){ const root=$(target);root.innerHTML=''; values.forEach((v,i)=>{const label=document.createElement('label');label.className='task-field';const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');const input=document.createElement('input');input.type='text';input.maxLength=64;input.required=true;input.value=v;input.placeholder=`Task ${i+1}`;input.autocomplete='off';label.append(n,input);root.append(label);}); }
  function readFields(target){return [...$(target).querySelectorAll('input')].map(x=>x.value.trim());}
  function showSetup(){ $('setup').hidden=false; $('game').hidden=true; fields('setupFields',state.tasks||defaults.map(()=>'')); }
  function showGame(){ $('setup').hidden=true; $('game').hidden=false; render(); }
  function render(){
    ensureDay();
    const date=new Date(`${state.date}T12:00:00`);$('dateLabel').textContent=date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
    const board=$('board');board.innerHTML='';const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const winning=lines.filter(line=>line.every(pos=>state.done.includes(state.order[pos])));const winningPositions=new Set(winning.flat());
    state.order.forEach((taskIndex,pos)=>{const b=document.createElement('button');b.type='button';b.className='square'+(state.done.includes(taskIndex)?' done':'')+(winningPositions.has(pos)?' in-line':'');b.setAttribute('aria-pressed',state.done.includes(taskIndex)?'true':'false');const num=document.createElement('span');num.className='number';num.textContent=String(pos+1).padStart(2,'0');const text=document.createElement('span');text.textContent=state.tasks[taskIndex];const check=document.createElement('span');check.className='check';check.textContent='✓';b.append(num,text,check);b.addEventListener('click',()=>toggle(taskIndex));board.append(b);});
    const count=state.done.length;$('doneCount').textContent=count;$('progressFill').style.width=`${count/9*100}%`;
    $('bingoMessage').textContent=winning.length?(count===9?'BLACKOUT! All nine completed.':winning.length===1?'BINGO! You completed a line.':`BINGO! ${winning.length} lines completed.`):count===9?'All nine done. Nicely played!':count===0?'A line is waiting to happen.':`${9-count} squares left. Keep going.`;
  }
  function toggle(i){state.done=state.done.includes(i)?state.done.filter(x=>x!==i):[...state.done,i];save();render();}
  $('setupForm').addEventListener('submit',e=>{e.preventDefault();const tasks=readFields('setupFields');if(tasks.some(x=>!x)){showToast('Please fill in all nine tasks.');return;}state={tasks};newDay();showGame();});
  $('editButton').addEventListener('click',()=>{fields('editFields',state.tasks);$('editDialog').showModal();});
  $('editForm').addEventListener('submit',e=>{if(e.submitter && e.submitter.value==='save'){const tasks=readFields('editFields');if(tasks.some(x=>!x)){e.preventDefault();showToast('Please fill in all nine tasks.');return;}state.tasks=tasks;save();render();showToast('Your task list is saved.');}});
  $('resetButton').addEventListener('click',()=>{state.done=[];save();render();showToast("Today's card is reset.");});
  if(state.tasks){ensureDay();showGame();}else{showSetup();}
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  // Catch a day change while the app remains open.
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && state.tasks && state.date!==today()){newDay();render();showToast('A fresh card for a new day!');}});
})();
