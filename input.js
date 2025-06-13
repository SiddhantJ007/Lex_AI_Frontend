/* input.js  –  only for input.html */
const backend = "https://lex-ai.duckdns.org";

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

document.getElementById("firstForm").onsubmit = e => {
  e.preventDefault();

  const prompt = document.getElementById("prompt").value.trim();
  const langEl = document.getElementById("language");
  const target = langEl.value;

  if (!prompt)               return alert("Please enter copy first!");
  if (langEl.disabled)       return alert("Language coming soon!");

  /* store to sessionStorage ( NOT localStorage – survives one tab only ) */
  sessionStorage.setItem("lex_prompt", prompt);
  sessionStorage.setItem("lex_lang",   target);

  /* go to the results page */
  location.href = "result.html";
};
