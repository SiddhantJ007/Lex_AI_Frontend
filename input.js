/* input.js  –  only for input.html */
const backend = "https://lex-ai.duckdns.org";

/* optional OCR upload */
document.getElementById("uploadBtn").onclick = async () => {
  const f = document.getElementById("fileInput").files[0];
  if (!f) return alert("Choose a file first!");
  const fd = new FormData(); fd.append("file", f);
  const ep = f.name.toLowerCase().endsWith(".pdf") ? "/upload-pdf/" : "/upload-image/";
  const out = await fetch(backend + ep, {method:"POST", body:fd}).then(r=>r.json());
  if (out.extracted_text) document.getElementById("prompt").value = out.extracted_text;
  else alert("No text found in file.");
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
