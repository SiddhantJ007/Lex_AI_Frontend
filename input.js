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

/* hand data to the real app */
document.getElementById("firstForm").onsubmit = e => {
  e.preventDefault();
  const prompt = document.getElementById("prompt").value.trim();
  const lang   = document.getElementById("language").value;
  if (!prompt) return alert("Please enter copy first!");

  sessionStorage.setItem("lex_prompt", prompt);
  sessionStorage.setItem("lex_lang",   lang);

  /* jump to the old page */
  location.href = "result.html";
};
