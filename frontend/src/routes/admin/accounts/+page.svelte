<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import { toLocalInput } from '$lib/datetime';
  import LedgerCategories from '$lib/components/LedgerCategories.svelte';
  import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Banknote as CircleDollarSign, ChevronDown, Download, FileText, Tags, Pencil, Plus, Search, SlidersHorizontal, Trash2, TrendingUp, WalletCards, X } from 'lucide-svelte';

  type Entry = { id:string; type:'INCOME'|'EXPENSE'; date:string; description:string; notes?:string; customer?:string; quantity?:number|null; unitPrice?:number|null; total:number; category:{name:string} };
  type Period = 'day'|'week'|'month';
  type Category = { id:string; name:string; type:'INCOME'|'EXPENSE'; entries:number };
  const number = new Intl.NumberFormat('en-BD',{minimumFractionDigits:0,maximumFractionDigits:2});
  const money = (value:number) => `\u09F3${number.format(Number(value)||0)}`;
  let allRows:Entry[] = [];
  let period:Period='month', typeFilter='ALL', categoryFilter='ALL', search='';
  let showEntry=false, loading=true, saving=false, notice='', editingId='';
  let entryType:'INCOME'|'EXPENSE'='EXPENSE', entryDate=toLocalInput(new Date()), description='', category='', customer='', quantity:string='', unitPrice:string='', directTotal:string='', notes='';
  // The categories come from the database; staff manage them from this page.
  let categoryList:Category[] = [], showCategories=false;
  $: categories = categoryList.map(c=>c.name);
  $: entryCategories = categoryList.filter(c=>c.type===entryType);
  const firstCategory = (type:'INCOME'|'EXPENSE') => categoryList.find(c=>c.type===type)?.name ?? '';
  async function loadCategories(){ try{categoryList=await api<Category[]>('/admin/accounts/categories',{headers:auth()})}catch(e){notice=`The categories could not be loaded: ${e instanceof Error?e.message:'unknown error'}.`} }
  // A renamed category shows under its new name on the entries already listed.
  async function categoriesChanged(){ await loadCategories(); await load() }

  $: cutoff = periodStart(period);
  $: rows = allRows.filter(r=>new Date(r.date)>=cutoff).filter(r=>typeFilter==='ALL'||r.type===typeFilter).filter(r=>categoryFilter==='ALL'||r.category.name===categoryFilter).filter(r=>(r.description+' '+(r.notes||'')+' '+(r.customer||'')).toLowerCase().includes(search.toLowerCase()));
  $: income = rows.filter(r=>r.type==='INCOME').reduce((s,r)=>s+r.total,0);
  $: expense = rows.filter(r=>r.type==='EXPENSE').reduce((s,r)=>s+r.total,0);
  $: profit = income-expense;
  $: autoTotal = quantity && unitPrice ? Number(quantity)*Number(unitPrice) : 0;
  $: effectiveTotal = Number(directTotal)||autoTotal;
  $: chartDays = makeChart(period, allRows);
  $: maxBar = Math.max(...chartDays.flatMap(d=>[d.income,d.expense]),1);
  $: linePoints = chartDays.map((d,i)=>`${i*(680/Math.max(chartDays.length-1,1))+20},${205-((d.running-chartMin(chartDays))/(Math.max(chartMax(chartDays)-chartMin(chartDays),1)))*170}`).join(' ');

  function periodStart(p:Period){const d=new Date();if(p==='day')d.setHours(0,0,0,0);else if(p==='week'){d.setDate(d.getDate()-6);d.setHours(0,0,0,0)}else{d.setDate(1);d.setHours(0,0,0,0)}return d}
  function makeChart(p:Period,data:Entry[]){
    const today=new Date();const count=p==='day'?8:p==='week'?7:Math.ceil(today.getDate()/7); let running=0;
    return Array.from({length:count},(_,i)=>{
      let start=new Date(),end=new Date(),label='';
      if(p==='day'){start.setHours(i*3,0,0,0);end=new Date(start);end.setHours(start.getHours()+3);label=start.toLocaleTimeString('en-US',{hour:'numeric'});}
      else if(p==='week'){start.setDate(start.getDate()-(count-1-i));start.setHours(0,0,0,0);end=new Date(start);end.setDate(end.getDate()+1);label=start.toLocaleDateString('en-US',{weekday:'short'});}
      else{const first=i*7+1,last=Math.min(first+6,today.getDate());start=new Date(today.getFullYear(),today.getMonth(),first);end=new Date(today.getFullYear(),today.getMonth(),last+1);label=`${first}\u2013${last}`;}
      const matching=data.filter(r=>new Date(r.date)>=start&&new Date(r.date)<end);
      const inc=matching.filter(r=>r.type==='INCOME').reduce((s,r)=>s+r.total,0),exp=matching.filter(r=>r.type==='EXPENSE').reduce((s,r)=>s+r.total,0);
      running+=inc-exp;return{label,income:inc,expense:exp,running};
    });
  }  const chartMin=(d:any[])=>Math.min(0,...d.map(x=>x.running)); const chartMax=(d:any[])=>Math.max(0,...d.map(x=>x.running));

  const numbers = (r:any):Entry => ({...r,total:Number(r.total),quantity:r.quantity?Number(r.quantity):null,unitPrice:r.unitPrice?Number(r.unitPrice):null});
  const auth = () => ({authorization:`Bearer ${localStorage.getItem('bp_token')}`});
  async function load(){ loading=true; try{const data:any=await api(`/admin/accounts?period=${period}`,{headers:auth()});allRows=data.rows.map(numbers)}catch(e){allRows=[];notice=`The ledger could not be loaded: ${e instanceof Error?e.message:'unknown error'}. Check your connection or sign in again.`}finally{loading=false} }
  function startAdding(){ editingId='';entryType='EXPENSE';category=firstCategory('EXPENSE');entryDate=toLocalInput(new Date());description=customer=quantity=unitPrice=directTotal=notes='';showEntry=true }
  function startEditing(row:Entry){ editingId=row.id;entryType=row.type;category=row.category.name;entryDate=toLocalInput(new Date(row.date));description=row.description;customer=row.customer||'';notes=row.notes||'';if(row.quantity&&row.unitPrice){quantity=String(row.quantity);unitPrice=String(row.unitPrice);directTotal=''}else{quantity=unitPrice='';directTotal=String(row.total)}showEntry=true }
  async function save(){
    if(!description||!effectiveTotal){notice='Add an item and either a total or quantity with unit price.';return}
    saving=true;notice='';
    try{const cat=categoryList.find(c=>c.name===category&&c.type===entryType);if(!cat)throw new Error('Choose a category. Add one under Categories if the list is empty');const amount=directTotal?{total:Number(directTotal)}:{quantity:Number(quantity),unitPrice:Number(unitPrice)};const body=JSON.stringify({type:entryType,date:new Date(entryDate).toISOString(),description,notes,customer,categoryId:cat.id,...amount});const saved=numbers({...(await api<any>(editingId?`/admin/accounts/${editingId}`:'/admin/accounts',{method:editingId?'PUT':'POST',headers:auth(),body})),category:{name:category}});allRows=editingId?allRows.map(r=>r.id===editingId?saved:r):[saved,...allRows];showEntry=false;loadCategories()}catch(e){notice=e instanceof Error?`Not saved: ${e.message}. Please retry.`:'Not saved. Check the API and database, then retry.'}finally{saving=false}
  }
  async function remove(row:Entry){
    if(!confirm(`Delete “${row.description}” (${money(row.total)})? This cannot be undone.`))return;
    try{await api(`/admin/accounts/${row.id}`,{method:'DELETE',headers:auth()});allRows=allRows.filter(r=>r.id!==row.id);loadCategories()}catch(e){notice=e instanceof Error?`Not deleted: ${e.message}.`:'Not deleted. Please retry.'}
  }  onMount(()=>{load();loadCategories()});
</script>

<svelte:head><title>Hisab Kitab — Bengal Port Admin</title></svelte:head>

<div class="ledger-shell">
  <header class="ledger-head">
    <div class="wrap head-row">
      <div class="title-row"><a href="/admin" aria-label="Back to admin dashboard"><ArrowLeft size={20}/></a><div><span>ADMIN · HISAB KITAB</span><h1>Profit & loss ledger</h1><p>Every taka, quantity and note—clear at a glance.</p></div></div>
      <button class="add" onclick={startAdding}><Plus size={19}/> Add transaction</button>
    </div>
  </header>

  <main class="wrap workspace">
    <div class="toolbar">
      <div class="period" aria-label="Reporting period">{#each [['day','Today'],['week','7 days'],['month','This month']] as p}<button class:active={period===p[0]} onclick={()=>{period=p[0] as Period;load()}}>{p[1]}</button>{/each}</div>
      <div class="tools"><label class="search"><Search size={17}/><input bind:value={search} placeholder="Search item, note or party"/></label><button class="export" onclick={()=>showCategories=true}><Tags size={17}/> Categories</button><button class="export" onclick={()=>window.print()}><Download size={17}/> Export</button></div>
    </div>

    {#if notice}<div class="notice">{notice}<button onclick={()=>notice=''}><X size={15}/></button></div>{/if}

    <section class="summary-grid">
      <article class="net"><div><span>NET {profit>=0?'PROFIT':'LOSS'}</span><b class:loss={profit<0}>{money(Math.abs(profit))}</b><small>{profit>=0?'Your revenue is ahead of spending.':'Spending is ahead of revenue.'}</small></div><div class="net-mark"><TrendingUp size={34}/></div></article>
      <article><div class="metric-icon income"><ArrowDownLeft size={20}/></div><div><span>Total income</span><b>{money(income)}</b><small>{rows.filter(r=>r.type==='INCOME').length} recorded payments</small></div></article>
      <article><div class="metric-icon expense"><ArrowUpRight size={20}/></div><div><span>Total expense</span><b>{money(expense)}</b><small>{rows.filter(r=>r.type==='EXPENSE').length} purchases & costs</small></div></article>
      <article><div class="metric-icon"><WalletCards size={20}/></div><div><span>Average transaction</span><b>{money(rows.length?(income+expense)/rows.length:0)}</b><small>{rows.length} total entries</small></div></article>
    </section>

    <section class="charts">
      <article class="chart-card cash-chart"><div class="chart-head"><div><h2>Cash movement</h2><p>Income and expenses across the selected period</p></div><div class="legend"><span><i class="in"></i>Income</span><span><i class="out"></i>Expense</span></div></div><div class="bars">{#each chartDays as d}<div class="bar-group" title={`${d.label}: ${money(d.income)} income, ${money(d.expense)} expense`}><div class="bar-pair"><i class="bar-in" style={`height:${d.income?Math.max(3,d.income/maxBar*150):0}px`}></i><i class="bar-out" style={`height:${d.expense?Math.max(3,d.expense/maxBar*150):0}px`}></i></div><span>{d.label}</span></div>{/each}</div></article>
      <article class="chart-card trend"><div class="chart-head"><div><h2>Profit trajectory</h2><p>Running net result</p></div><div class:negative={profit<0} class="trend-badge">{profit>=0?'+':'−'} {money(Math.abs(profit))}</div></div><svg viewBox="0 0 720 230" role="img" aria-label="Cumulative profit trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9952d" stop-opacity=".28"/><stop offset="1" stop-color="#c9952d" stop-opacity="0"/></linearGradient></defs><path d={`M ${linePoints} L 700 215 L 20 215 Z`} fill="url(#area)"/><polyline points={linePoints} fill="none" stroke="#c9952d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>{#each chartDays as d,i}<circle cx={i*(680/Math.max(chartDays.length-1,1))+20} cy={205-((d.running-chartMin(chartDays))/(Math.max(chartMax(chartDays)-chartMin(chartDays),1)))*170} r="4" fill="#fff" stroke="#c9952d" stroke-width="3"/>{/each}</svg></article>
    </section>

    <section class="ledger">
      <div class="ledger-top"><div><h2>Transaction ledger</h2><p>{rows.length} entries in this view</p></div><div class="filters"><label><SlidersHorizontal size={16}/><select bind:value={typeFilter}><option value="ALL">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select></label><label><select bind:value={categoryFilter}><option value="ALL">All categories</option>{#each categories as c}<option>{c}</option>{/each}</select><ChevronDown size={15}/></label></div></div>
      <div class="table-wrap"><table><thead><tr><th>Date & time</th><th>Item / details</th><th>Category</th><th>Calculation</th><th class="amount">Amount</th><th class="row-actions"><span class="sr">Actions</span></th></tr></thead><tbody>{#each rows as row}<tr><td><b>{new Date(row.date).toLocaleDateString('en-BD',{day:'2-digit',month:'short'})}</b><span>{new Date(row.date).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span></td><td><div class="item"><i class:income={row.type==='INCOME'}>{#if row.type==='INCOME'}<ArrowDownLeft size={16}/>{:else}<ArrowUpRight size={16}/>{/if}</i><div><b>{row.description}</b><span>{row.customer}{row.notes?` · ${row.notes}`:''}</span></div></div></td><td><mark>{row.category.name}</mark></td><td>{#if row.quantity&&row.unitPrice}<b>{row.quantity} × {money(row.unitPrice)}</b><span>Quantity × unit</span>{:else}<b>Direct total</b><span>Amount entered</span>{/if}</td><td class:expense={row.type==='EXPENSE'} class="amount"><b>{row.type==='EXPENSE'?'−':'+'}{money(row.total)}</b><span>{row.type==='INCOME'?'Income':'Expense'}</span></td><td class="row-actions"><button aria-label="Edit entry" onclick={()=>startEditing(row)}><Pencil size={15}/></button><button class="danger" aria-label="Delete entry" onclick={()=>remove(row)}><Trash2 size={15}/></button></td></tr>{/each}</tbody></table>{#if loading}<div class="empty"><h3>Loading the ledger…</h3></div>{:else if !rows.length}<div class="empty"><FileText size={28}/><h3>No entries in this view</h3><p>Try another period, clear your filters, or add a transaction.</p></div>{/if}</div>
    </section>
  </main>
</div>

{#if showEntry}<div class="sheet-backdrop" role="presentation" onclick={(e)=>{if(e.target===e.currentTarget)showEntry=false}}><div class="entry-sheet" role="dialog" aria-modal="true" aria-labelledby="entry-title"><header><div><span>{editingId?'EDIT LEDGER ENTRY':'NEW LEDGER ENTRY'}</span><h2 id="entry-title">{editingId?'Correct this entry':'Record money movement'}</h2></div><button aria-label="Close" onclick={()=>showEntry=false}><X/></button></header><div class="type-switch"><button class:active={entryType==='EXPENSE'} onclick={()=>{entryType='EXPENSE';category=firstCategory('EXPENSE')}}><ArrowUpRight size={18}/> Expense</button><button class:active={entryType==='INCOME'} onclick={()=>{entryType='INCOME';category=firstCategory('INCOME')}}><ArrowDownLeft size={18}/> Income</button></div><form onsubmit={(e)=>{e.preventDefault();save()}}><div class="field wide"><label for="item">What was {entryType==='EXPENSE'?'bought or paid for':'the payment for'}? *</label><input id="item" bind:value={description} placeholder={entryType==='EXPENSE'?'e.g. 4 printer cartridges':'e.g. consultation fee'} required/></div><div class="form-grid"><div class="field"><label for="when">Date & time *</label><input id="when" type="datetime-local" bind:value={entryDate} required/></div><div class="field"><label for="category">Category *</label><select id="category" bind:value={category} required>{#each entryCategories as c}<option>{c.name}</option>{/each}</select></div><div class="field wide"><label for="party">{entryType==='EXPENSE'?'Vendor / paid to':'Customer / received from'}</label><input id="party" bind:value={customer} placeholder="Optional name"/></div></div><div class="amount-box"><div class="amount-title"><div><CircleDollarSign size={20}/><b>Amount</b></div><span>Use either method</span></div><div class="amount-grid"><div class="calculation"><div class="field"><label for="qty">Quantity</label><input id="qty" type="number" min="0.01" step="any" bind:value={quantity} oninput={()=>directTotal=''} placeholder="e.g. 4"/></div><b>×</b><div class="field"><label for="unit">Unit price</label><input id="unit" type="number" min="0.01" step="any" bind:value={unitPrice} oninput={()=>directTotal=''} placeholder="Tk 1,850"/></div><strong>= {money(autoTotal)}</strong></div><div class="or">OR</div><div class="field"><label for="total">Enter total directly</label><input id="total" type="number" min="0.01" step="any" bind:value={directTotal} oninput={()=>{quantity='';unitPrice=''}} placeholder="Total amount in taka"/></div></div></div><div class="field wide"><label for="notes">Notes</label><textarea id="notes" bind:value={notes} rows="3" placeholder="Invoice number, payment method, purpose, or anything useful later"></textarea></div><footer><div><span>ENTRY TOTAL</span><b>{money(effectiveTotal)}</b></div><button type="button" class="cancel" onclick={()=>showEntry=false}>Cancel</button><button class="save" disabled={saving||!description||!effectiveTotal||!category}>{saving?'Saving…':editingId?'Save changes':'Save transaction'}</button></footer></form></div></div>{/if}
{#if showCategories}<LedgerCategories categories={categoryList} onchange={categoriesChanged} onclose={()=>showCategories=false}/>{/if}

<style>
  .ledger-shell{min-height:100vh;background:#eef1f4;color:#12213a}.ledger-head{background:#07182f;color:white;padding:34px 0 32px;box-shadow:inset 0 -3px #c9952d}.head-row,.title-row,.toolbar,.tools,.summary-grid article,.chart-head,.legend,.ledger-top,.filters,.item,.amount-title,.amount-title>div,.calculation,.entry-sheet header,.type-switch,.entry-sheet footer{display:flex;align-items:center}.head-row,.toolbar,.ledger-top,.chart-head,.entry-sheet header{justify-content:space-between}.title-row{gap:20px}.title-row>a{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:white;background:#ffffff12}.title-row span,.entry-sheet header span{font-size:11px;letter-spacing:.14em;color:#d8ae4a;font-weight:800}.title-row h1{font-size:34px;letter-spacing:-.025em;margin:5px 0 4px}.title-row p{margin:0;color:#c4ceda;font-size:14px}.add,.save{border:0;background:#d19b2d;color:#07182f;border-radius:10px;padding:13px 18px;font-weight:800;display:flex;align-items:center;gap:9px;cursor:pointer}.workspace{padding:28px 0 90px}.toolbar{margin-bottom:18px}.period{display:flex;background:#dde2e7;padding:4px;border-radius:10px}.period button{border:0;background:transparent;padding:9px 17px;border-radius:7px;color:#586577;font-size:13px;font-weight:750;cursor:pointer}.period button.active{background:white;color:#07182f;box-shadow:0 2px 7px #07182f14}.tools{gap:10px}.search{display:flex;align-items:center;gap:8px;background:white;border:1px solid #d8dde2;padding:0 12px;border-radius:9px}.search input{border:0;outline:0;padding:10px 0;width:230px}.export{display:flex;gap:7px;align-items:center;padding:10px 14px;background:white;border:1px solid #d8dde2;border-radius:9px;color:#26354a;font-weight:700}.notice{background:#fff8e8;border:1px solid #ead39d;padding:11px 14px;border-radius:9px;font-size:13px;color:#6c5522;margin-bottom:18px}.notice{display:flex;justify-content:space-between}.notice button{border:0;background:none;color:inherit}.summary-grid{display:grid;grid-template-columns:1.25fr repeat(3,1fr);gap:13px}.summary-grid article{background:white;border-radius:13px;padding:21px;gap:13px;min-width:0}.summary-grid article.net{background:#0a2344;color:white;justify-content:space-between}.summary-grid span{display:block;color:#6a7585;font-size:12px;margin-bottom:7px}.summary-grid b{display:block;font-size:25px;letter-spacing:-.025em;white-space:nowrap}.summary-grid small{display:block;color:#778291;font-size:11px;margin-top:6px}.summary-grid .net span,.summary-grid .net small{color:#becbda}.summary-grid .net b{font-size:31px;color:#e1b34a}.summary-grid .net b.loss{color:#ff9f91}.net-mark{width:52px;height:52px;border-radius:50%;background:#ffffff10;display:grid;place-items:center;color:#d8ae4a}.metric-icon{width:38px;height:38px;border-radius:10px;background:#eef1f4;display:grid;place-items:center;flex:none}.metric-icon.income{background:#e4f5ed;color:#17704b}.metric-icon.expense{background:#fff0ed;color:#ae493b}.charts{display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin:14px 0}.chart-card,.ledger{background:white;border-radius:14px}.chart-card{padding:23px 24px}.chart-head h2,.ledger h2{font-size:17px;margin:0 0 4px}.chart-head p,.ledger-top p{font-size:12px;color:#788392;margin:0}.legend{gap:14px;font-size:11px;color:#637080}.legend span{display:flex;align-items:center;gap:6px}.legend i{width:8px;height:8px;border-radius:2px}.legend .in{background:#153c66}.legend .out{background:#d39c2c}.bars{height:190px;display:flex;align-items:flex-end;gap:8px;border-bottom:1px solid #e3e7eb;padding:14px 4px 0}.bar-group{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px}.bar-pair{height:155px;display:flex;align-items:flex-end;gap:3px}.bar-pair i{display:block;width:8px;border-radius:3px 3px 0 0}.bar-in{background:#153c66}.bar-out{background:#d39c2c}.bar-group span{font-size:10px;color:#7d8794}.trend svg{width:100%;height:190px;overflow:visible}.trend-badge{font-size:12px;font-weight:800;color:#176b49;background:#e7f5ee;padding:7px 9px;border-radius:7px}.trend-badge.negative{color:#a44236;background:#fff0ed}.ledger{overflow:hidden}.ledger-top{padding:20px 22px;border-bottom:1px solid #e3e7eb}.filters{gap:8px}.filters label{display:flex;align-items:center;gap:7px;border:1px solid #d9dee4;border-radius:8px;padding:0 10px;color:#687485}.filters select{border:0;background:transparent;padding:9px 22px 9px 0;appearance:none;outline:0;font-size:12px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:920px}th{text-align:left;padding:12px 18px;font-size:10px;letter-spacing:.08em;color:#7b8592;background:#f6f7f8}td{padding:15px 18px;border-bottom:1px solid #eaedf0;font-size:12px;vertical-align:middle}td>span,td .item span{display:block;color:#7a8593;margin-top:4px;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.item{gap:11px}.item>i{width:31px;height:31px;border-radius:8px;background:#fff0ed;color:#b44c3f;display:grid;place-items:center;flex:none}.item>i.income{background:#e5f5ed;color:#17704b}mark{background:#eef1f4;color:#48576b;border-radius:5px;padding:5px 7px;font-size:10px}.amount{text-align:right}.amount b{color:#16704b;font-size:13px}.amount.expense b{color:#b3483c}.empty{text-align:center;padding:50px;color:#74808f}.empty h3{color:#24344a;margin:10px 0 5px}.sheet-backdrop{position:fixed;inset:0;background:#061326a8;z-index:100;display:flex;justify-content:flex-end;backdrop-filter:blur(3px)}.entry-sheet{width:min(610px,100vw);height:100%;overflow:auto;background:#f7f8fa;box-shadow:-24px 0 60px #0613263d}.entry-sheet header{background:#07182f;color:white;padding:25px 28px}.entry-sheet h2{margin:5px 0 0;font-size:24px}.entry-sheet header button{border:0;background:#ffffff12;color:white;width:38px;height:38px;border-radius:50%}.type-switch{background:white;padding:15px 28px;gap:8px;border-bottom:1px solid #e1e5e9}.type-switch button{flex:1;border:1px solid #dce1e5;background:white;border-radius:9px;padding:11px;display:flex;justify-content:center;align-items:center;gap:8px;font-weight:800;color:#596678}.type-switch button.active{background:#102d50;color:white;border-color:#102d50}.entry-sheet form{padding:25px 28px}.field{display:grid;gap:6px}.field label{font-size:11px;font-weight:800;color:#405066}.field input,.field select,.field textarea{width:100%;border:1px solid #d5dbe1;background:white;border-radius:8px;padding:11px 12px;outline:none}.field input:focus,.field select:focus,.field textarea:focus{border-color:#c9952d;box-shadow:0 0 0 3px #c9952d1c}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px}.wide{grid-column:1/-1}.entry-sheet form>.wide{margin-bottom:15px}.amount-box{background:#edf0f3;border-radius:12px;padding:16px;margin:18px 0}.amount-title{justify-content:space-between;margin-bottom:13px}.amount-title>div{gap:7px}.amount-title span{font-size:10px;color:#6f7a87}.amount-grid{display:grid;grid-template-columns:1fr auto 170px;align-items:end;gap:12px}.calculation{gap:8px}.calculation .field{flex:1}.calculation>b{margin-top:18px}.calculation strong{margin-top:18px;white-space:nowrap;color:#0d2848}.or{font-size:10px;color:#76818e;padding-bottom:13px}.entry-sheet footer{margin:25px -28px -25px;padding:18px 28px;background:white;border-top:1px solid #dfe3e7;justify-content:flex-end;gap:10px}.entry-sheet footer>div{margin-right:auto}.entry-sheet footer span{font-size:9px;color:#77828f}.entry-sheet footer b{display:block;font-size:21px}.cancel{border:1px solid #d8dde2;background:white;border-radius:9px;padding:12px 17px;font-weight:750}.save:disabled{opacity:.5;cursor:not-allowed}
  @media(max-width:1050px){.summary-grid{grid-template-columns:1fr 1fr}.charts{grid-template-columns:1fr}.amount-grid{grid-template-columns:1fr}.or{text-align:center;padding:0}.calculation{flex-wrap:wrap}}
  @media(max-width:700px){.head-row,.toolbar,.ledger-top{align-items:flex-start;gap:18px}.head-row,.toolbar{flex-direction:column}.add{width:100%;justify-content:center}.workspace{width:min(94vw,1380px)}.tools{width:100%}.search{flex:1}.search input{width:100%}.summary-grid{grid-template-columns:1fr}.charts{margin-top:13px}.filters{width:100%;overflow:auto}.ledger-top{flex-direction:column}.entry-sheet form{padding:20px}.form-grid{grid-template-columns:1fr}.entry-sheet footer{margin:22px -20px -20px;padding:15px 20px;flex-wrap:wrap}.title-row h1{font-size:28px}.period{width:100%}.period button{flex:1}.chart-card{padding:19px 16px}}
  .row-actions{position:relative;white-space:nowrap;text-align:right}.row-actions button{width:2rem;height:2rem;margin-left:.3rem;border:1px solid #dfe5ea;border-radius:.5rem;background:#fff;color:#35495d;display:inline-grid;place-items:center;cursor:pointer}.row-actions button.danger{color:#a84747;border-color:#eadada}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  @media(hover:hover) and (pointer:fine){.row-actions button:hover{background:#f4f6f8}.row-actions button.danger:hover{background:#fff1f1}}
  /* Small text that was hard to read on a phone. */
  th,.bar-group span,mark,.amount-title span,.or{font-size:11px}.entry-sheet footer span{font-size:10.5px}
  .chart-head{flex-wrap:wrap;gap:8px 14px}.toolbar{flex-wrap:wrap;gap:12px}.period button{white-space:nowrap}.filters{flex-wrap:wrap}.tools{flex-wrap:wrap}.export{white-space:nowrap}.title-row>a{flex:none}.row-actions button{width:2.25rem;height:2.25rem}
  /* Where the ledger's card is too narrow for a table, each entry is a card:
     the item and its amount on top, then date, category and calculation. */
  .ledger{container-type:inline-size}.table-wrap{scrollbar-gutter:auto}
  table{min-width:0}
  @container (max-width:46rem){
    table,tbody{display:block}thead{display:none}
    tbody tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;align-items:center;padding:14px 16px;border-bottom:1px solid #eaedf0}
    td{display:block;padding:0;border:0;min-width:0}
    td>span,td .item span{max-width:none;white-space:normal}
    td:nth-child(2){grid-column:1;grid-row:1}
    td.amount{grid-column:2;grid-row:1;align-self:start}
    td:nth-child(1){grid-column:1;grid-row:2;display:flex;gap:6px;align-items:baseline}td:nth-child(1) span{margin:0}
    td:nth-child(3){grid-column:2;grid-row:2;text-align:right}
    td:nth-child(4){grid-column:1;grid-row:3;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}td:nth-child(4) span{margin:0}
    td.row-actions{grid-column:2;grid-row:3}
    .ledger-top{padding:16px}
  }
  /* On phones and tablets fields use 16px text: iPhones zoom the page when a smaller field is focused. */
  @media(max-width:58rem){.filters select,.search input,.field input,.field select,.field textarea{font-size:16px}}
  @media(max-width:700px){.tools{flex-wrap:wrap}.search{flex:1 1 100%}.tools .export{flex:1;justify-content:center}.filters label{flex:1}.filters select{width:100%}.entry-sheet header{padding:18px 20px}.type-switch{padding:12px 20px}.entry-sheet h2{font-size:20px}.amount-grid{gap:10px}}
  @media(max-width:420px){.period button{padding:9px 8px}.calculation{display:grid;grid-template-columns:1fr auto 1fr;align-items:end}.calculation>b{margin:0 0 12px}.calculation strong{grid-column:1/-1;margin-top:0}.entry-sheet footer .cancel,.entry-sheet footer .save{flex:1;justify-content:center}.entry-sheet footer>div{flex:1 1 100%}.summary-grid b{font-size:22px}.summary-grid .net b{font-size:26px}}
  @media print{.ledger-head,.toolbar,.notice,.add,.sheet-backdrop,.row-actions{display:none}.ledger-shell{background:white}.workspace{padding:0}.summary-grid article,.chart-card,.ledger{break-inside:avoid}}
</style>




