const backendUrl = "https://lex-ai.duckdns.org";

let dt = null; 

let includeVariants = false; 


function getUserId () {
  let id = localStorage.getItem("lexai_uid");
  if (!id) {                       // first visit → create & store
    id = crypto.randomUUID();
    localStorage.setItem("lexai_uid", id);
  }
  return id;
}

function applyFeedbackFilter(){
  if (!dt) return;           // table not ready yet
  const wanted = document.getElementById("filterSelect").value;
  dt.column(4)               // Feedback column
    .search(
       wanted === "all" ? "" : `^${wanted}`,   // ← fixed here
       true, false)
    .draw(false);
}

/*function toast(msg){
  const t = document.getElementById("lexToast");
  t.textContent = msg;    t.style.display="block";
  setTimeout(()=>{ t.style.display="none"; },2000);
}*/

/* simple spinner helpers – no‑op if you don't want a loader */
function spinnerOn(msg = "Please wait…") {
  let s = document.getElementById("lexaiSpinner");
  if (!s) {                                 // create once
    s = document.createElement("div");
    s.id = "lexaiSpinner";
    Object.assign(s.style, {
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(255,255,255,0.7)", display:"flex",
      alignItems:"center", justifyContent:"center",
      fontFamily:"Segoe UI, sans-serif", fontSize:"1.1rem"
    });
    document.body.appendChild(s);
  }
  s.textContent = msg;
  s.style.display = "flex";
}
function spinnerOff() {
  const s = document.getElementById("lexaiSpinner");
  if (s) s.style.display = "none";
}

function showSpin(on=true){
  document.getElementById("spinner_1").classList[on ? "remove":"add"]("hidden");
  document.querySelectorAll("button,select,textarea,input")
          .forEach(el => el.disabled = on);
}

/* ---------- tiny helper ---------- */
async function pingBackend() {
  try {
    const r = await fetch(`${backendUrl}/ping`, { cache: "no-store" });
    return r.ok;
  } catch { return false; }
}

/* -------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {

  if (typeof $ === "undefined") {
    console.error("jQuery missing – LexAI UI can’t initialise.");
    return;
  }

  /* show/hide connectivity banner */
  const offlineBanner = document.getElementById("offlineBanner");
  const backendUp     = await pingBackend();
  offlineBanner.style.display = backendUp ? "none" : "block";

  /* only try to load feedbacks if ping succeeded */
  if (backendUp) {
    await loadFeedbacks();             // fills the table
    if (!window._filterBound) {
      document.getElementById("filterSelect").onchange = () => {
        const wanted = document.getElementById("filterSelect").value;
        $('#feedbackTable')
          .DataTable()
          .column(4)                               // Feedback column
          .search(wanted === "all" ? "" : wanted, true, false)
          .draw();
      };
      window._filterBound = true;
    }
  } else {
    console.warn("Backend offline – table will remain empty");
  }

  /* === FEEDBACK TABLE ===================================== */         
  
async function loadFeedbacks () {
  try {
    const incAlt = document.getElementById("variantsChk").checked ? 1 : 0;
    // always pull the freshest state from the API
    const res = await fetch(
       `${backendUrl}/feedbacks/?include_variants=${incAlt}`,
      { cache:"no-store" });
    if (!res.ok) throw new Error(backend ${res.status});

    const data  = await res.json();
    
    /* transform to DataTables row‑array once so we can reuse it */
    const rows = data.map(fb => [
      fb.id,
      fb.original_prompt,
      fb.translated_text,
      fb.target_language,
      fb.feedback
    ]);

    if (!dt) {
      /* first call → create the table */
      dt = $('#feedbackTable').DataTable({
        data:    rows,
        columns: [
          { title: "ID" },
          { title: "Original Prompt" },
          { title: "Translated Text" },
          { title: "Language" },
          { title: "Feedback" }
        ],
        pageLength: 5,
        order:      [[0, 'desc']]      // ascending ID as requested
      });
      $('#feedbackTable').show();     // reveal the table once built
    } else {
      /* subsequent calls → just refresh rows (no redraw flicker) */
      dt.clear();
      dt.rows.add(rows);
      dt.draw(false);                 // keep current paging position
    }

    /* re‑apply Good/Bad filter after (re)draw ------------ */
    applyFeedbackFilter();

    /* “No rows” helper message */
    $('#noRowsMsg').toggle(dt.rows({filter:'applied'}).count() === 0);

    console.log(Feedbacks loaded: ${rows.length});

  } catch (e) {
    console.error("loadFeedbacks failed:", e);
    alert("Could not load feedbacks – see console.");
  }
}
  
  /* --- one‑time bindings ---------------------------------- */
document.getElementById('refreshBtn' ).onclick = loadFeedbacks;
document.getElementById('variantsChk').onchange = loadFeedbacks;
document.getElementById('filterSelect').onchange = () => {
    applyFeedbackFilter();            // just refilter; no re‐fetch needed
};

  /* =========== GET TRANSLATION ============================ */
  document.getElementById("translateBtn").onclick = async (e) => {
    e.preventDefault();

    const prompt = document.getElementById("prompt").value.trim();
    const langEl = document.getElementById("language");
    const target = langEl.value;
    const selOpt = langEl.selectedOptions[0];

    if (!prompt) { alert("Enter tagline first!"); return; }
    if (selOpt.disabled) { alert("Language coming soon!"); return; }

    showSpin(true);    
    try {
      const res = await fetch(`${backendUrl}/full-process/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, target_language: target })
      });
      const data = await res.json();

      document.getElementById("translatedText").textContent = data.translated_text;
      document.getElementById("result").style.display = "block";
      document.getElementById("feedbackControls").style.display = "block";

      window.currentSession = {
      original_prompt : prompt,
      translated_text : data.translated_text,
      // store BOTH:
      lang_code       : target,        // e.g. "FR"
      lang_name       : selOpt.text    // e.g. "French"
    };
      
    } catch { alert("Backend unreachable."); }
    finally   { showSpin(false); }
  };

  /* =========== GOOD / BAD buttons ========================= */
  async function sendFeedback(type) {
    if (!window.currentSession) {
      alert("Translate something first!");
      return;
    }

    // temporary user id (until real auth)
    const userId = localStorage.getItem("lexai_uid") ||
                   crypto.randomUUID();
    localStorage.setItem("lexai_uid", userId);

    const payload = {
      user_id:          userId,
      original_prompt:  window.currentSession.original_prompt,
      translated_text:  window.currentSession.translated_text,
      target_language:  window.currentSession.lang_code,
      feedback:         type,         
      reason:           null
    };

    const res = await fetch(`${backendUrl}/feedback/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      await loadFeedbacks();          // refresh table immediately
    } else {
      const err = await res.json();
      console.error(err);
      alert("Feedback failed! See console.");
    }
  }

/* ------------------ GOOD button click ------------------- */

/* ---------- GOOD button workflow --------------------------------- */
document.getElementById("goodBtn").onclick = async () => {
  if (!window.currentSession) {
    return alert("Translate something first!");
  }

  /* 1️⃣  store the *current* translation as GOOD immediately */
  await sendFeedback("Good", "");          // ↓ see helper just after this
  await loadFeedbacks();                   // refresh table

  /* 2️⃣  ask if user wants more ideas */
  if (!confirm("Saved!  Would you like 5 alternative suggestions?")) return;

  spinnerOn("Generating ideas…");
  try {
    const r = await fetch(`${backendUrl}/copy-variants/`, {
      method : "POST",
      headers: { "Content-Type":"application/json" },
      body   : JSON.stringify({
                  prompt          : currentSession.original_prompt,
                  target_language : currentSession.lang_code,
                  count           : 5 })
    });
    const data = await r.json();            // {variants:[…]}

    showVariants(data.variants);            // render panel (next block)
  } catch (e) {
    console.error(e);
    alert("Could not fetch variants.");
  } finally {
    spinnerOff();
  }
};


/* -------------- Variant panel ------------------------------------ */
async function requestVariants() {
  spinnerOn("Generating alternatives...");
  try {
    const res = await fetch(${backendUrl}/copy-variants/?num=5, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        prompt:          currentSession.original_prompt,
        target_language: currentSession.lang_code   // e.g. "FR"
      })
    });
    const data = await res.json();
    showVariants(data.variants);
  } catch(e){ alert("Could not fetch variants"); console.error(e); }
  spinnerOff();
}

/* ---------- toast helper (uses #lexToast) ---------- */
function toast(msg){
  // if a previous toast is still fading, remove it first
  document.getElementById("lexToast")?.remove();

  const t = document.createElement("div");
  t.id = "lexToast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

/* ---------- variant list renderer (unchanged except toast & fade) ---------- */
function showVariants(list){
  const ul = document.getElementById("variantList");
  ul.innerHTML = "";

  list.forEach(txt=>{
    ul.insertAdjacentHTML("beforeend",
      <li>
        <span>${txt}</span>
        <div>
          <button class="vote" data-v="Good">👍</button>
          <button class="vote" data-v="Bad" >👎</button>
        </div>
      </li>);
  });

  ul.querySelectorAll(".vote").forEach(btn=>{
    btn.onclick = async () => {
  const li          = btn.closest("li");
  const variantText = li.querySelector("span").textContent;

  const res = await fetch(`${backendUrl}/variant-feedback/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id:         getUserId(),              //  ← NEW
      original_prompt: currentSession.original_prompt,
      target_language: currentSession.lang_code,
      variant_text:    variantText,
      rating:          btn.dataset.v
    })
  });

  if (res.ok) {
    li.style.opacity = .45;
    li.querySelectorAll(".vote").forEach(b => b.remove());
    toast("Saved!");
    loadFeedbacks();
  } else {
    toast("Save failed!");
  }
};
  });

  alert("Rate these ideas: 👍 if you like it, 👎 otherwise.");
}
  
  document.getElementById("badBtn").onclick = () => sendFeedback("Bad");
  
  /* ---------------- Bad → ask reason → regenerate ------------- */
document.getElementById("badBtn").onclick = async () => {
  if (!window.currentSession) { alert("Translate first!"); return; }

  const reason = prompt(
    "What’s wrong with this translation?\n" +
    "(say e.g. “tone too formal”, “missing key word”, …)"
  );
  if (!reason) return;

  // show spinner & disable controls
  document.getElementById("spinner").classList.remove("hidden");
  document.querySelectorAll("button,select,textarea,input")
          .forEach(el => el.disabled = true);

  try {
    const payload = {
      user_id:         window.lexai_uid,
      original_prompt: window.currentSession.original_prompt,
      translated_text: window.currentSession.translated_text,
      target_language: window.currentSession.lang_code,
      reason          : reason
    };

    const res = await fetch(`${backendUrl}/feedback/regenerate`, {
      method : "POST",
      headers: { "Content-Type":"application/json" },
      body   : JSON.stringify(payload)
    });
    if (!res.ok) throw await res.json();

    const out = await res.json();          // << new translation!
    // update UI
    document.getElementById("translatedText").textContent = out.new_translation;
    window.currentSession.translated_text                 = out.new_translation;
    window.currentSession.original_prompt                 = out.improved_prompt;

    await loadFeedbacks();                 // refresh table

    alert("Done! Translation regenerated.");
  } catch (e) {
    console.error(e);
    alert("Regeneration failed – see console.");
  } finally {
    // hide spinner & re‑enable
    document.getElementById("spinner").classList.add("hidden");
    document.querySelectorAll("button,select,textarea,input")
            .forEach(el => el.disabled = false);
  }
};

  /* =========== COPY button ================================ */
  document.getElementById("copyBtn").onclick = () => {
    const txt = document.getElementById("translatedText").textContent;
    navigator.clipboard.writeText(txt).then(() => {
      alert("Translated text copied to clipboard!");
    });
  };

  /* =========== DOWNLOAD Excel ============================= */
 document.getElementById("downloadBtn").onclick = async () => {
  const filterSel   = document.getElementById("filterSelect").value;      // all | Good | Bad
  const includeAlt  = document.getElementById("variantsChk").checked;     // true | false

  /* build query string with URLSearchParams (avoids double “?” etc.) */
  const qs = new URLSearchParams();
  if (filterSel !== "all") qs.append("type", filterSel);          // Good / Bad
  qs.append("include_variants", includeAlt);                      // always send

  const url = `${backendUrl}/feedbacks/download?${qs.toString()}`;

  /* probe first so we can alert cleanly on 404 */
  const probe = await fetch(url, { method:"GET" });
  if (probe.ok) {
    window.location.href = url;                                   // real download
  } else {
    alert("No feedbacks match this selection.");
  }
};
  
  /* =========== UPLOAD PDF / IMAGE ========================= */
  document.getElementById("uploadBtn").onclick = async () => {
    const file = document.getElementById("fileInput").files[0];
    if (!file) { alert("Select a file first!"); return; }

    const form = new FormData();
    form.append("file", file);

    const endpoint = file.name.toLowerCase().endsWith(".pdf")
        ? "/upload-pdf/" : "/upload-image/";

    try {
      const r = await fetch(${backendUrl}${endpoint},
                            { method: "POST", body: form });
      const d = await r.json();
      if (d.extracted_text) {
        document.getElementById("prompt").value = d.extracted_text;
        alert("Text extracted — verify then click Get Translation.");
      } else {
        alert("No text found.");
      }
    } catch {
      alert("Backend unreachable.");
    }
  };

  async function askVariants(n = 5){
  spinnerOn("Generating ideas…");
  const res = await fetch(`${backendUrl}/copy-variants/`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        prompt:  currentSession.original_prompt,
        target_language: currentSession.lang_code,
        count: n
      })
  });
  const arr = await res.json();               // [{variant_no, original_prompt, translated_text}, …]
  spinnerOff();

  const box = document.getElementById("variantsBox");
  box.classList.remove("hidden");
  arr.forEach(v => {
     box.insertAdjacentHTML("beforeend",
       <div class="varRow">
           <span>${v.translated_text}</span>
           <button onclick="rateVariant(${v.variant_no},'Good')">👍</button>
           <button onclick="rateVariant(${v.variant_no},'Bad')">👎</button>
        </div>);
  });
  // push into feedback table immediately (optional)
  loadFeedbacks();
}

async function rateVariant(no, type){
  const vRow = [...document.querySelectorAll(".varRow")].find(r=>r.textContent.includes(no));
  const text = vRow.querySelector("span").textContent;
  await sendFeedbackVariant(no, text, type);  // tiny helper that POSTs /feedback/
  loadFeedbacks();
}
});
