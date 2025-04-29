const backendUrl = "https://18.220.43.79";  // Replace with your actual backend IP/Domain

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
            target_language: target_language
        };

        window.currentSession = {
            original_prompt: prompt,
            translated_text: data.translated_text,
            target_language: target_language
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
