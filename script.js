const backendUrl = "https://18.220.43.79";  // HTTPS Backend IP

document.getElementById('translateForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const prompt = document.getElementById('prompt').value.trim();
    const targetLanguage = document.getElementById('target_language').value;

    const supportedLanguages = [
        "EN", "FR", "DE", "ES", "IT", "NL", "PT", "JA", "ZH", "RU",
        "TR", "SV", "PL", "FI", "NO", "DA", "CS", "RO", "HU", "KO"
    ];

    if (!prompt) {
        alert("Please enter your marketing tagline before proceeding!");
        return;
    }

    if (!supportedLanguages.includes(targetLanguage)) {
        alert("Support for this language is coming soon! Please select another language.");
        return;
    }

    const response = await fetch(`${backendUrl}/full-process/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, target_language: targetLanguage })
    });

    const data = await response.json();
    document.getElementById('translatedText').innerText = data.translated_text;

    document.getElementById('outputSection').style.display = 'block';

    window.currentSession = {
        original_prompt: prompt,
        translated_text: data.translated_text,
        target_language: targetLanguage
    };
});

document.getElementById('goodFeedback').addEventListener('click', async () => {
    await sendFeedback('good');
});

document.getElementById('badFeedback').addEventListener('click', async () => {
    await sendFeedback('bad');
});

async function sendFeedback(feedbackType) {
    const session = window.currentSession;
    if (!session) return;

    await fetch(`${backendUrl}/feedback/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            original_prompt: session.original_prompt,
            translated_text: session.translated_text,
            target_language: session.target_language,
            feedback: feedbackType
        })
    });

    alert("Feedback submitted. Thank you!");

    // Refresh the feedback table immediately
    await loadFeedbacks();
}

// This function loads feedbacks - separated from viewFeedbacks click now
async function loadFeedbacks() {
    const response = await fetch(`${backendUrl}/feedbacks/`);
    const feedbacks = await response.json();

    const tbody = document.getElementById('feedbackTable').querySelector('tbody');
    tbody.innerHTML = "";

    feedbacks.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.original_prompt}</td>
            <td>${item.translated_text}</td>
            <td>${item.target_language}</td>
            <td>${item.feedback}</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('feedbackList').style.display = 'block';
}

// Connect View Feedback button to loadFeedbacks too
document.getElementById('viewFeedbacks').addEventListener('click', async () => {
    await loadFeedbacks();
});


document.getElementById('viewFeedbacks').addEventListener('click', async () => {
    const response = await fetch(`${backendUrl}/feedbacks/`);
    const feedbacks = await response.json();

    const tbody = document.getElementById('feedbackTable').querySelector('tbody');
    tbody.innerHTML = "";

    feedbacks.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.original_prompt}</td>
            <td>${item.translated_text}</td>
            <td>${item.target_language}</td>
            <td>${item.feedback}</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('feedbackList').style.display = 'block';
});