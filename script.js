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

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- helper to load / reload feedbacks ---------- */
  async function loadFeedbacks() {
    const res  = await fetch(`${backendUrl}/feedbacks/`);
    const data = await res.json();

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

    // show controls the first time
    document.getElementById('feedbackTable').style.display = 'table';
    document.getElementById('feedbackToolbar').classList.remove('hidden');

    // (re)‑initialize DataTable
    if ($.fn.DataTable.isDataTable('#feedbackTable')) {
      $('#feedbackTable').DataTable().destroy();
    }
    const dt = $('#feedbackTable').DataTable({
      pageLength: 5,
      order: [[0, 'desc']],
      dom: 't<"dt-footer"lip>'
    });

    // hook up filtering
    $('#filterSelect').off().on('change', function () {
      const val = this.value;
      dt.column(4).search(val, true, false).draw();
    });
  }

  /* ---------- copy button ---------- */
  document.getElementById('copyBtn').addEventListener('click', () => {
    const text = document.getElementById('translatedText').textContent;
    navigator.clipboard.writeText(text);
    alert('Translated text copied!');
  });

  /* ---------- Excel download ---------- */
  document.getElementById('downloadBtn').addEventListener('click', () => {
    window.location.href = `${backendUrl}/feedbacks/download`;
  });

  /* ---------- existing handlers stay unchanged ---------- */
  // … (keep your Get Translation, Upload, Good, Bad code as-is)

  /* remove the old View Feedback button’s click (not needed) */
  document.getElementById('viewFeedbackBtn')
          .classList.add('hidden');

  /* ---------- initial load ---------- */
  loadFeedbacks();   // show feedbacks at startup
});
