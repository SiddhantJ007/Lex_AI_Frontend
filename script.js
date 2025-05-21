/*const backendUrl = "https://lex-ai.duckdns.org";

document.addEventListener('DOMContentLoaded', function () {

    // Handle Get Translation
    document.getElementById('getTranslationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const prompt = document.getElementById('prompt').value.trim();
        const target_language = document.getElementById('language').value;
        const selectedOption = document.getElementById('language').selectedOptions[0];
        
        if (!prompt) {
            alert("Please enter your marketing tagline before proceeding!");
            return;
        }
        
        if (selectedOption.disabled) {
            alert("Selected language is coming soon. Please choose a currently available language!");
            return;
        }

        const response = await fetch(`${backendUrl}/full-process/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                target_language: target_language
            })
        });

        const data = await response.json();

        // Update result and show it
        document.getElementById('translatedText').textContent = data.translated_text;
        document.getElementById('result').style.display = "block";
        document.getElementById('feedbackControls').style.display = "block";
        
        // Save session for feedback
        window.currentSession = {
            original_prompt: prompt,
            translated_text: data.translated_text,
            target_language: selectedOption.text
        };

        window.currentSession = {
            original_prompt: prompt,
            translated_text: data.translated_text,
            target_language: selectedOption.text
        };
    });

    // Handle Upload and Extract Text
    document.getElementById('uploadBtn').addEventListener('click', async function() {
        const file = document.getElementById('fileInput').files[0];
        if (!file) return alert("Please select a PDF or Image file.");

        const formData = new FormData();
        formData.append('file', file);

        let endpoint = '';
        if (file.name.toLowerCase().endsWith('.pdf')) {
            endpoint = '/upload-pdf/';
        } else {
            endpoint = '/upload-image/';
        }

        const response = await fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.extracted_text) {
            document.getElementById('prompt').value = data.extracted_text;
            alert("Text extracted successfully. Please verify and click 'Get Translation'.");
        } else {
            alert("Failed to extract text. Please try again.");
        }
    });

    // Handle Good Feedback
    document.getElementById('goodBtn').addEventListener('click', async function() {
        if (!window.currentSession) {
            alert("No translation available to give feedback on!");
            return;
        }

        await fetch(`${backendUrl}/feedback/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original_prompt: window.currentSession.original_prompt,
                translated_text: window.currentSession.translated_text,
                target_language: window.currentSession.target_language,
                feedback: 'Good'
            })
        });

        alert("Thanks for your feedback!");
    });

    // Handle Bad Feedback
    document.getElementById('badBtn').addEventListener('click', async function() {
        if (!window.currentSession) {
            alert("No translation available to give feedback on!");
            return;
        }

        await fetch(`${backendUrl}/feedback/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original_prompt: window.currentSession.original_prompt,
                translated_text: window.currentSession.translated_text,
                target_language: window.currentSession.target_language,
                feedback: 'Bad'
            })
        });

        alert("Thanks for your feedback!");
    });

    // Handle View Feedbacks
    document.getElementById('viewFeedbackBtn').addEventListener('click', async function() {
        const response = await fetch(`${backendUrl}/feedbacks/`);
        const data = await response.json();

        const tableBody = document.getElementById('feedbackTable').querySelector('tbody');
        tableBody.innerHTML = '';

        data.forEach(fb => {
            const row = `<tr>
                <td>${fb.id}</td>
                <td>${fb.original_prompt}</td>
                <td>${fb.translated_text}</td>
                <td>${fb.target_language}</td>
                <td>${fb.feedback}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });
        document.getElementById('feedbackTable').style.display = "table";
    });
});
*/

const backendUrl = "https://lex-ai.duckdns.org";

async function pingBackend() {
  try {
    const r = await fetch(`${backendUrl}/ping`);     
    return r.ok;
  } catch { return false; }
}

/* -------------------------------------------------- */
/* run after full DOM ready *and* jQuery present      */
document.addEventListener("DOMContentLoaded", async () => {

  if (typeof $ === "undefined") {
    console.error("jQuery missing – LexAI UI can’t initialise.");
    return;
  }

  /* ---------- show UI regardless of backend state ---------- */
  const offlineBanner = document.getElementById("offlineBanner");
  const backendUp     = await pingBackend();
  offlineBanner.style.display = backendUp ? "none" : "block";

  /* === FEEDBACK TABLE ===================================== */
    async function loadFeedbacks() {
  try {
    const r = await fetch(`${backendUrl}/feedbacks/`);
    if (!r.ok) throw new Error("backend");
    const data = await r.json();

    const tbody = document
       .getElementById('feedbackTable')
       .querySelector('tbody');
    tbody.innerHTML = '';

    data.forEach(fb => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${fb.id}</td>
          <td>${fb.original_prompt}</td>
          <td>${fb.translated_text}</td>
          <td>${fb.target_language}</td>
          <td>${fb.feedback}</td>
        </tr>`);
    });

    document.getElementById('feedbackTable').style.display = 'table';

    if ($.fn.DataTable) {                // (re‑)initialise
      if ($.fn.DataTable.isDataTable('#feedbackTable')) {
        $('#feedbackTable').DataTable().destroy();
      }
      $('#feedbackTable').DataTable({ pageLength:5, order:[[0,'desc']] });
            }
          } catch { console.warn('Backend offline – table not refreshed'); }
        }
        
        /* manual refresh */
        document.getElementById('refreshBtn').onclick = loadFeedbacks;
        
        /* auto‑reload after Good/Bad succeeds */
        async function sendFeedback(type) {
          // unchanged POST body
          if (res.ok) loadFeedbacks();
        }

  /* =========== GET TRANSLATION ============================= */
  document.getElementById("getTranslationForm")
    .addEventListener("submit", async (e) => {
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
    });

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
  /* =========== COPY button ================================= */
  document.getElementById("copyBtn").onclick = () => {
    navigator.clipboard.writeText(
      document.getElementById("translatedText").textContent
    );
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
      const r = await fetch(`${backendUrl}${endpoint}`, { method:"POST", body: form });
      const d = await r.json();
      if (d.extracted_text) {
        document.getElementById("prompt").value = d.extracted_text;
        alert("Text extracted — verify then click Get Translation.");
      } else {
        alert("No text found.");
      }
    } catch { alert("Backend unreachable."); }
  };
});
