const backendUrl = "https://lex-ai.duckdns.org";

/* ---------- tiny helper ---------- */
async function pingBackend() {
  try {
    const r = await fetch(`${backendUrl}/ping`, {cache:"no-store"});
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
  } else {
    console.warn("Backend offline – table will remain empty");
  }

  /* === FEEDBACK TABLE ===================================== */
    async function loadFeedbacks () {
  try {
    const r = await fetch(`${backendUrl}/feedbacks/`, {cache:"no-store"});
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
      $('#feedbackTable').DataTable({ pageLength: 5, order: [[0, 'desc']] });
    }

    console.log("Feedbacks loaded:", data.length);
  } catch (e) {
    console.error("loadFeedbacks failed:", e);
    alert("Could not load feedbacks – see console.");
  }
}

/* --- one‑time bindings --------------------------------------- */
document.getElementById('refreshBtn').onclick = loadFeedbacks;

async function sendFeedback(type) {
  // … existing POST logic …
  if (res.ok) loadFeedbacks();    // auto‑refresh after Good/Bad
}

  /* =========== GET TRANSLATION ============================= */
  document.getElementById("translateBtn").onclick = async (e) => {
  e.preventDefault();

      const prompt = document.getElementById("prompt").value.trim();
      const langEl = document.getElementById("language");
      const target = langEl.value;
      const selOpt = langEl.selectedOptions[0];

      if (!prompt) { alert("Enter tagline first!"); return; }
      if (selOpt.disabled) { alert("Language coming soon!"); return; }

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
          target_language : selOpt.text
        };

      } catch { alert("Backend unreachable."); }
    };

  /* =========== GOOD / BAD buttons (separate!) ============== */
  async function sendFeedback(type) {
  if (!window.currentSession) {
    alert("Translate something first!");
    return;
  }

  // assign a temporary user id (later we’ll replace with real auth)
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
document.getElementById("badBtn").onclick  = () => sendFeedback("Bad");
    
  /* =========== COPY button ================================= */
  document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(
      document.getElementById("translatedText").textContent
    );
  };
 
  document.getElementById("copyBtn").onclick = () => {
  const txt = document.getElementById("translatedText").textContent;
  navigator.clipboard.writeText(txt).then(() => {
    alert("Translated text copied to clipboard!");
  });
};
    
  /* =========== DOWNLOAD Excel ============================== */
  document.getElementById("downloadBtn").onclick = () => {
    window.location.href = `${backendUrl}/feedbacks/download`;
  };

  /* =========== UPLOAD PDF / IMAGE ========================== */
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
 document.getElementById("refreshBtn").onclick = loadFeedbacks;
});  
