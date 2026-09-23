// Script of public/offline.html, a separate file so the page runs under
// the static CSP (no inline scripts). That page is served as-is by the
// service worker (public/sw.js) as a last-resort fallback for any page that was never cached while
// online. It has to work with zero network access and no build step,
// so it can't use next-intl — instead it picks a language itself from
// the URL the browser still shows (the address bar keeps the
// originally-requested page's URL even though this file's markup is
// what actually renders), falling back to the browser's own language.
(function () {
  var DICT = {
    en: {
      title: "Setlyst · Offline",
      heading: "You're offline",
      body: "This page hasn't been saved for offline use yet. Open it once with a connection (during soundcheck, for example) and it will be available offline afterwards.",
      button: "Try again",
    },
    "pt-BR": {
      title: "Setlyst · Offline",
      heading: "Você está offline",
      body: "Esta página ainda não foi salva para uso sem internet. Abra-a uma vez com conexão (durante a passagem de som, por exemplo) e ela ficará disponível offline depois.",
      button: "Tentar novamente",
    },
    es: {
      title: "Setlyst · Sin conexión",
      heading: "Estás sin conexión",
      body: "Esta página todavía no se guardó para uso sin conexión. Ábrela una vez con conexión (durante la prueba de sonido, por ejemplo) y quedará disponible sin conexión después.",
      button: "Reintentar",
    },
  };
  var SUPPORTED = Object.keys(DICT);
  var DEFAULT_LOCALE = "en";

  function resolveLocale() {
    // 1. The app's own locale segment, e.g. "/pt-BR/dashboard/...".
    var segment = location.pathname.split("/")[1] || "";
    for (var i = 0; i < SUPPORTED.length; i++) {
      if (SUPPORTED[i].toLowerCase() === segment.toLowerCase()) {
        return SUPPORTED[i];
      }
    }
    // 2. Fall back to the browser's own language preference.
    var nav = (navigator.language || DEFAULT_LOCALE).toLowerCase();
    if (nav.indexOf("pt") === 0) return "pt-BR";
    if (nav.indexOf("es") === 0) return "es";
    return DEFAULT_LOCALE;
  }

  var strings = DICT[resolveLocale()] || DICT[DEFAULT_LOCALE];
  document.documentElement.lang = resolveLocale();
  document.title = strings.title;
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (strings[key]) el.textContent = strings[key];
  });
  var retry = document.getElementById("retry");
  if (retry) {
    retry.addEventListener("click", function () {
      location.reload();
    });
  }
})();
