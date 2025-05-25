const backendUrl = "https://lex-ai.duckdns.org";

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
      const r = await fetch(
        `${backendUrl}/feedbacks/?_=${Date.now()}`,  
        { cache:"no-store" }                          
      );
      
      if (!r.ok) throw new Error("backend " + r.status);
      const data = await r.json();

      const tbody = document
        .getElementById("feedbackTable")
        .querySelector("tbody");
      tbody.innerHTML = "";                 // clear old rows

      data.forEach(fb => {
        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <td>${fb.id}</td>
            <td>${fb.original_prompt}</td>
            <td>${fb.translated_text}</td>
            <td>${fb.target_language}</td>
            <td>${fb.feedback}</td>
          </tr>`);
      });

      // show / hide ‘no rows’ message
      document.getElementById('noRowsMsg').style.display =
        data.length ? 'none' : 'block';

      // make the table visible
      document.getElementById('feedbackTable').style.display = 'table';

      // (re‑)initialise DataTables if present
      if ($.fn.DataTable) {
        if ($.fn.DataTable.isDataTable('#feedbackTable')) {
          $('#feedbackTable').DataTable().destroy();
        }
        $('#feedbackTable').DataTable({ pageLength: 5, order: [[0, 'asc']] });
      }

      console.log("Feedbacks loaded:", data.length);
    } catch (e) {
      console.error("loadFeedbacks failed:", e);
      alert("Could not load feedbacks – see console.");
    }
  }

  /* --- one‑time bindings ---------------------------------- */
  document.getElementById('refreshBtn').onclick = loadFeedbacks;

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
      target_language:  window.currentSession.target_language,
      feedback:         type          // "Good" or "Bad"
    };

    const res = await fetch(`${backendUrl}/feedback/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      await loadFeedbacks();          // refresh table immediately
      alert("Thanks for your feedback!");
    } else {
      const err = await res.json();
      console.error(err);
      alert("Feedback failed! See console.");
    }
  }
  document.getElementById("goodBtn").onclick = () => sendFeedback("Good");
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
    const filter = document.getElementById("filterSelect").value;
    let url = `${backendUrl}/feedbacks/download`;
    if (filter !== "all") url += `?type=${filter}`;
    // attempt fetch first to catch 404 and alert cleanly
    const r = await fetch(url, { method:"GET" });
    if (r.ok) {
      window.location.href = url;          // trigger real download
    } else {
      alert("No feedbacks match this filter yet.");
    }
  };

  document.getElementById("clearBtn").onclick = async () => {
    if (!confirm("Delete ALL feedback rows – are you sure?")) return;
    const r = await fetch(`${backendUrl}/feedbacks/clear`, {method:"DELETE"});
    if (r.ok) { await loadFeedbacks(); alert("Table cleared."); }
    else      { alert("Failed to clear – see console."); }
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
      const r = await fetch(`${backendUrl}${endpoint}`,
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

});
