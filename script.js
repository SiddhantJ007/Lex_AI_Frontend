/*  ─────────────────────────────────────────────────────────────┐
    LexAI front-end (single shared script for index & results)   │
    – no endpoints, ids or UX flows were changed                ─┘ */

const backendUrl = "https://lex-ai.duckdns.org";

let dt              = null;          // DataTable handle
let currentSession  = null;          // {original_prompt, translated_text, lang_code}

/* ---------- helpers ------------------------------------------------------ */
const $q  = (sel) => document.querySelector(sel);
const $$q = (sel) => [...document.querySelectorAll(sel)];
const boolFrom = (id, def=false) => ($q(`#${id}`)?.checked ?? def);
const getUserId = () => {
  let id = localStorage.getItem("lexai_uid");
  if (!id){ id = crypto.randomUUID(); localStorage.setItem("lexai_uid", id); }
  return id;
};
const toast = (msg) => {
  $q("#lexToast")?.remove();
  const n = document.createElement("div");
  n.id="lexToast"; n.textContent = msg; document.body.appendChild(n);
  setTimeout(()=>n.remove(), 3000);
};
const spinner = {
  on (m="Please wait…"){ $q("#lexaiSpinner")?.remove();
    const d=document.createElement("div"); d.id="lexaiSpinner";
    Object.assign(d.style,{position:"fixed",inset:0,zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",
      background:"rgba(255,255,255,.7)",fontFamily:"Segoe UI, sans-serif"});
    d.textContent=m; document.body.appendChild(d);},
  off(){ $q("#lexaiSpinner")?.remove(); }
};
const pingBackend = () => fetch(`${backendUrl}/ping`,{cache:"no-store"})
                            .then(r=>r.ok).catch(()=>false);

/* ---------- FEEDBACK table (shared by both pages) ------------------------ */
async function loadFeedbacks(){
  const incAlt = boolFrom("variantsChk");
  const r = await fetch(`${backendUrl}/feedbacks/?include_variants=${incAlt}`,
                        {cache:"no-store"});
  if(!r.ok) return console.warn("No feedback rows yet");
  const rows = (await r.json()).map(f=>[
      f.id, f.original_prompt, f.translated_text, f.target_language, f.feedback
  ]);

  if(!dt){
    dt = $('#feedbackTable').DataTable({
      data: rows,
      columns:["ID","Original","Translation","Lang","Feedback"].map(t=>({title:t})),
      pageLength:5, order:[[0,'desc']]
    });
    $('#feedbackTable').show();
  }else{
    dt.clear(); dt.rows.add(rows); dt.draw(false);
  }
  applyFeedbackFilter();
  $('#noRowsMsg').toggle(dt.rows({filter:'applied'}).count()===0);
}
function applyFeedbackFilter(){
  if(!dt) return;
  const sel = $q("#filterSelect")?.value ?? "all";
  dt.column(4).search(sel==="all"?"":`^${sel}`,true,false).draw(false);
}

/* ---------- GOOD/BAD feedback ------------------------------------------- */
async function sendFeedback(kind){
  if(!currentSession) return alert("Translate first!");
  const payload = {
    user_id: getUserId(), ...currentSession, feedback:kind, reason:null
  };
  const r = await fetch(`${backendUrl}/feedback/`,{
            method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify(payload)});
  if(r.ok){ loadFeedbacks(); toast("Saved!"); }
  else     { toast("Save failed"); }
}

/* ---------- run translation (results page) ------------------------------ */
async function runTranslation(prompt, lang){
  spinner.on("Translating…");
  try{
    const r = await fetch(`${backendUrl}/full-process/`,{
                method:"POST",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({prompt,target_language:lang})});
    const d = await r.json();
    $q("#translatedText").textContent = d.translated_text;
    $q("#result").style.display       = "block";
    $q("#feedbackControls").style.display = "block";
    currentSession = {original_prompt:prompt,
                      translated_text:d.translated_text,
                      lang_code:lang};
  }catch(e){ console.error(e); alert("Translation failed."); }
  finally{ spinner.off(); }
}

/* ---------- main boot (runs on every page) ------------------------------ */
document.addEventListener("DOMContentLoaded", async ()=>{
  /* page-role detection */
  const isResults = !!$q("#translatedText");

  /* restore or collect form data */
  if(!isResults){                    /* ---- index.html ---- */
    $q("#getTranslationForm")?.addEventListener("submit",(ev)=>{
      ev.preventDefault();
      const prompt = $q("#prompt").value.trim();
      const lang   = $q("#language").value;
      if(!prompt)  return alert("Enter tagline first!");
      sessionStorage.setItem("lex_prompt", prompt);
      sessionStorage.setItem("lex_lang",   lang);
      location.href = "results.html";
    });
  }else{                             /* ---- results.html --- */
    const prompt = sessionStorage.getItem("lex_prompt");
    const lang   = sessionStorage.getItem("lex_lang");
    if(!prompt||!lang) return location.href="index.html";
    await runTranslation(prompt, lang);
  }

  /* connectivity banner & feedback table (on both pages) */
  if(await pingBackend()){
    loadFeedbacks();
  }else{
    $q("#offlineBanner")?.classList.remove("hidden");
  }

  /* ---------------- attach one-off UI handlers ---------------- */
  $q("#filterSelect") ?.addEventListener("change",applyFeedbackFilter);
  $q("#variantsChk") ?.addEventListener("change",loadFeedbacks);

  /* action buttons – only if element exists on this page */
  $q("#copyBtn")     ?.addEventListener("click",()=>{
    navigator.clipboard.writeText($q("#translatedText").textContent)
             .then(()=>toast("Copied!")); });

  $q("#goodBtn")     ?.addEventListener("click",async()=>{
    await sendFeedback("Good");
    if(confirm("Saved!  Generate 5 alternatives?")){
      spinner.on("Generating…");
      const r = await fetch(`${backendUrl}/copy-variants/`,{
                  method:"POST",headers:{"Content-Type":"application/json"},
                  body:JSON.stringify({prompt:currentSession.original_prompt,
                                      target_language:currentSession.lang_code,
                                      count:5})});
      const {variants} = await r.json();
      showVariants(variants);
      spinner.off();
    }
  });

  $q("#badBtn")      ?.addEventListener("click",()=>sendFeedback("Bad"));

  $q("#downloadBtn") ?.addEventListener("click",async()=>{
    const qs = new URLSearchParams();
    const sel = $q("#filterSelect").value;
    if(sel!=="all") qs.append("type",sel);
    qs.append("include_variants", boolFrom("variantsChk"));
    const url = `${backendUrl}/feedbacks/download?${qs}`;
    const probe = await fetch(url);
    if(probe.ok) window.location.href = url;
    else alert("No feedbacks match this selection.");
  });

  $q("#clearBtn")    ?.addEventListener("click",async()=>{
    if(!confirm("Delete ALL feedback rows?")) return;
    const r = await fetch(`${backendUrl}/feedbacks/clear`,{method:"DELETE"});
    if(r.ok){ loadFeedbacks(); toast("Cleared."); }
  });
});

/* ---------- variant list renderer (results page only) ------------------- */
function showVariants(list){
  const ul = $q("#variantList"); if(!ul) return;
  ul.innerHTML="";
  list.forEach(txt=>{
    ul.insertAdjacentHTML("beforeend",
      `<li><span>${txt}</span>
         <button class="vote" data-v="Good">👍</button>
         <button class="vote" data-v="Bad">👎</button></li>`);
  });
  $$q(".vote").forEach(btn=>{
    btn.onclick = async ()=>{
      const li=btn.parentElement;
      const txt=li.querySelector("span").textContent;
      const r = await fetch(`${backendUrl}/variant-feedback/`,{
                method:"POST",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({user_id:getUserId(),
                                     original_prompt:currentSession.original_prompt,
                                     target_language:currentSession.lang_code,
                                     variant_text:txt,
                                     rating:btn.dataset.v})});
      if(r.ok){
        li.style.opacity=".4"; li.querySelectorAll(".vote").forEach(b=>b.remove());
        loadFeedbacks(); toast("Saved!");
      }else toast("Save failed");
    };
  });
}
