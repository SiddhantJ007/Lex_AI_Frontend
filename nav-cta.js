// Smart navbar CTA: Try for free ↔ Open App
(function () {
  var BE = "https://main.d2ig4w5p4y9zve.amplifyapp.com";

  // Grab the CTA in the glass navbar (skip the red logout button on trans.html)
  var cta = document.querySelector('nav.glass .btn-cta:not(.btn-logout)');
  if (!cta) return;

  function setTry() {
    cta.textContent = "Try for free";
    cta.setAttribute("href", "signup.html"); // relative keeps host stable
  }

  var token = localStorage.getItem("lexai_token") || "";
  if (!token) { setTry(); return; }

  fetch(BE + "/me", { headers: { Authorization: "Bearer " + token } })
    .then(function (r) {
      if (r.ok) {
        cta.textContent = "Open App";
        cta.setAttribute("href", "trans.html");
      } else {
        localStorage.removeItem("lexai_token");
        localStorage.removeItem("lexai_uid");
        setTry();
      }
    })
    .catch(function () { setTry(); });
})();
