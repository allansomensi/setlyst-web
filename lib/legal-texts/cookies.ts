/*
 * Política de Cookies do Setlyst.
 *
 * Lista os cookies e o armazenamento local realmente usados pelo app
 * (next-auth em produção, com os prefixos __Secure-/__Host-; next-intl;
 * next-themes; lib/auth-flow.ts; hooks/use-*-prefs; service worker;
 * Dexie). Ao adicionar um cookie ou uma chave de armazenamento, atualize
 * esta lista e o histórico de versões. Deve ser revisada por um advogado
 * antes da publicação definitiva.
 */

import { PRIVACY_EMAIL } from "@/lib/legal";
import type { LegalTexts } from "./types";

export const COOKIES: LegalTexts = {
  "pt-BR": {
    title: "Política de Cookies",
    summary:
      "Quais cookies e dados de armazenamento local o Setlyst usa, para quê e como controlá-los.",
    sections: [
      {
        id: "what",
        heading: "O que são cookies",
        blocks: [
          "Cookies são pequenos arquivos gravados pelo navegador que permitem, por exemplo, manter você conectado entre uma página e outra. O armazenamento local (local storage, IndexedDB e cache do navegador) funciona de modo parecido, mas os dados não são enviados automaticamente ao servidor.",
        ],
      },
      {
        id: "necessary",
        heading: "Cookies estritamente necessários",
        blocks: [
          "Sem estes cookies a plataforma não funciona. Eles dispensam consentimento, pois são indispensáveis à prestação do serviço que você solicitou:",
          {
            list: [
              "Sessão (__Secure-next-auth.session-token): mantém você conectado. Criptografado; vale por até 24 horas e é renovado enquanto você usa a plataforma.",
              "Proteção contra falsificação de requisições (__Host-next-auth.csrf-token): impede que outros sites façam ações em seu nome. Dura a sessão do navegador.",
              "Endereço de retorno (__Secure-next-auth.callback-url): lembra a página a que você deve voltar depois de entrar. Dura a sessão do navegador.",
              "Login com Google (setlyst_google_intent, setlyst_google_signup, setlyst_google_2fa, setlyst_google_error, setlyst_google_link e os cookies de estado e PKCE do next-auth): guardam temporariamente as escolhas feitas antes de ir ao Google e o andamento do login ou da vinculação da conta Google. Duram até 15 minutos.",
              "Idioma (NEXT_LOCALE): guarda o idioma escolhido. Dura 1 ano.",
              "Fuso horário (tz): guarda o fuso horário do seu dispositivo, para exibir datas e horários corretamente. Dura 1 ano.",
              "Indicação (setlyst_ref, quando presente): guarda o código de indicação de um link de convite, para creditar quem indicou você mesmo que o cadastro seja feito depois ou com Google. Dura 30 dias.",
            ],
          },
        ],
      },
      {
        id: "preferences",
        heading: "Preferências e armazenamento local",
        blocks: [
          "Usamos o armazenamento local (localStorage), o armazenamento de sessão (sessionStorage) e o banco de dados do navegador (IndexedDB) para:",
          {
            list: [
              "Tema claro, escuro ou do sistema (theme).",
              "Preferências de exibição do Modo Ao Vivo (setlyst:live-display) e quantidade de itens por página nas listas (setlyst:page-size).",
              "Registro de que a dica de gesto do Modo Ao Vivo já foi exibida (setlyst:live-swipe-hint-seen).",
              "Avisos e banners dispensados (setlyst:email-banner-dismissed e setlyst-announcements-continued, no armazenamento de sessão, apagados ao fechar o navegador).",
              "Banco de dados offline (setlyst-offline, no IndexedDB): conteúdo salvo para uso sem conexão e fila de alterações feitas sem conexão, que são sincronizadas quando a conexão volta.",
              "Arquivos da aplicação guardados pelo service worker, para abrir o app mais rápido e sem conexão.",
            ],
          },
          "Esses dados ficam somente no seu dispositivo e não são usados para identificar você nem para rastreamento. O banco de dados offline é apagado quando você sai da conta; as preferências permanecem até que você as altere ou limpe os dados do site no navegador.",
        ],
      },
      {
        id: "analytics",
        heading: "Estatísticas de acesso",
        blocks: [
          "Usamos o Vercel Web Analytics para contar visitas de forma agregada. Ele não usa cookies, não cria identificadores persistentes e não segue você entre sites.",
          "Como o Setlyst usa apenas cookies e armazenamento estritamente necessários ou de preferência, sem ferramentas de publicidade ou rastreamento, não exibimos banner de consentimento de cookies, conforme o Guia Orientativo sobre Cookies da ANPD.",
        ],
      },
      {
        id: "advertising",
        heading: "Publicidade",
        blocks: [
          "O Setlyst não usa cookies de publicidade, não exibe anúncios e não compartilha dados de navegação com redes de anúncios.",
        ],
      },
      {
        id: "control",
        heading: "Como controlar",
        blocks: [
          "Você pode apagar ou bloquear cookies nas configurações do navegador. Bloquear os cookies estritamente necessários impede o login. Sair da conta apaga os dados offline guardados pelo Setlyst neste dispositivo.",
          `Dúvidas sobre cookies e privacidade: ${PRIVACY_EMAIL}.`,
        ],
      },
    ],
  },

  en: {
    title: "Cookie Policy",
    summary:
      "Which cookies and local storage Setlyst uses, what for, and how to control them.",
    sections: [
      {
        id: "what",
        heading: "What cookies are",
        blocks: [
          "Cookies are small files stored by the browser that make it possible, for example, to keep you signed in from one page to the next. Local storage (local storage, IndexedDB and the browser cache) works in a similar way, but its data is not sent to the server automatically.",
        ],
      },
      {
        id: "necessary",
        heading: "Strictly necessary cookies",
        blocks: [
          "The platform does not work without these cookies. They do not require consent, as they are essential to provide the service you requested:",
          {
            list: [
              "Session (__Secure-next-auth.session-token): keeps you signed in. Encrypted; valid for up to 24 hours and renewed while you use the platform.",
              "Cross-site request forgery protection (__Host-next-auth.csrf-token): stops other sites from taking actions on your behalf. Lasts for the browser session.",
              "Return address (__Secure-next-auth.callback-url): remembers the page to return to after signing in. Lasts for the browser session.",
              "Sign in with Google (setlyst_google_intent, setlyst_google_signup, setlyst_google_2fa, setlyst_google_error, setlyst_google_link and next-auth's state and PKCE cookies): temporarily store the choices made before going to Google and the progress of the sign-in or of linking the Google account. Last up to 15 minutes.",
              "Language (NEXT_LOCALE): stores the chosen language. Lasts 1 year.",
              "Time zone (tz): stores your device's time zone, so dates and times are shown correctly. Lasts 1 year.",
              "Referral (setlyst_ref, when present): stores the referral code of an invitation link, so the person who referred you is credited even if you sign up later or with Google. Lasts 30 days.",
            ],
          },
        ],
      },
      {
        id: "preferences",
        heading: "Preferences and local storage",
        blocks: [
          "We use the browser's local storage (localStorage), session storage (sessionStorage) and database (IndexedDB) for:",
          {
            list: [
              "Light, dark or system theme (theme).",
              "Live Mode display preferences (setlyst:live-display) and the number of items per page in lists (setlyst:page-size).",
              "A record that the Live Mode swipe hint has been shown (setlyst:live-swipe-hint-seen).",
              "Dismissed notices and banners (setlyst:email-banner-dismissed and setlyst-announcements-continued, in session storage, erased when the browser is closed).",
              "Offline database (setlyst-offline, in IndexedDB): content saved for offline use and the queue of changes made without a connection, which are synced when the connection returns.",
              "Application files kept by the service worker, so the app opens faster and without a connection.",
            ],
          },
          "This data stays only on your device and is not used to identify or track you. The offline database is erased when you sign out; preferences remain until you change them or clear the site's data in your browser.",
        ],
      },
      {
        id: "analytics",
        heading: "Visit statistics",
        blocks: [
          "We use Vercel Web Analytics to count visits in aggregate. It does not use cookies, does not create persistent identifiers and does not follow you across sites.",
          "As Setlyst only uses strictly necessary or preference cookies and storage, with no advertising or tracking tools, we do not show a cookie consent banner, in line with the ANPD's guidance on cookies.",
        ],
      },
      {
        id: "advertising",
        heading: "Advertising",
        blocks: [
          "Setlyst does not use advertising cookies, does not show ads and does not share browsing data with ad networks.",
        ],
      },
      {
        id: "control",
        heading: "How to control them",
        blocks: [
          "You can delete or block cookies in your browser settings. Blocking the strictly necessary cookies prevents signing in. Signing out erases the offline data Setlyst keeps on this device.",
          `Questions about cookies and privacy: ${PRIVACY_EMAIL}.`,
        ],
      },
    ],
  },

  es: {
    title: "Política de Cookies",
    summary:
      "Qué cookies y almacenamiento local usa Setlyst, para qué y cómo controlarlos.",
    sections: [
      {
        id: "what",
        heading: "Qué son las cookies",
        blocks: [
          "Las cookies son pequeños archivos que guarda el navegador y que permiten, por ejemplo, mantener tu sesión iniciada de una página a otra. El almacenamiento local (local storage, IndexedDB y la caché del navegador) funciona de forma parecida, pero sus datos no se envían automáticamente al servidor.",
        ],
      },
      {
        id: "necessary",
        heading: "Cookies estrictamente necesarias",
        blocks: [
          "La plataforma no funciona sin estas cookies. No requieren consentimiento, porque son indispensables para prestar el servicio que solicitaste:",
          {
            list: [
              "Sesión (__Secure-next-auth.session-token): mantiene tu sesión iniciada. Cifrada; vale hasta 24 horas y se renueva mientras usas la plataforma.",
              "Protección contra falsificación de peticiones (__Host-next-auth.csrf-token): impide que otros sitios realicen acciones en tu nombre. Dura la sesión del navegador.",
              "Dirección de retorno (__Secure-next-auth.callback-url): recuerda la página a la que volver tras iniciar sesión. Dura la sesión del navegador.",
              "Inicio de sesión con Google (setlyst_google_intent, setlyst_google_signup, setlyst_google_2fa, setlyst_google_error, setlyst_google_link y las cookies de estado y PKCE de next-auth): guardan temporalmente las opciones elegidas antes de ir a Google y el avance del inicio de sesión o de la vinculación de la cuenta de Google. Duran hasta 15 minutos.",
              "Idioma (NEXT_LOCALE): guarda el idioma elegido. Dura 1 año.",
              "Zona horaria (tz): guarda la zona horaria de tu dispositivo, para mostrar fechas y horas correctamente. Dura 1 año.",
              "Recomendación (setlyst_ref, cuando existe): guarda el código de recomendación de un enlace de invitación, para acreditar a quien te recomendó aunque te registres más tarde o con Google. Dura 30 días.",
            ],
          },
        ],
      },
      {
        id: "preferences",
        heading: "Preferencias y almacenamiento local",
        blocks: [
          "Usamos el almacenamiento local (localStorage), el almacenamiento de sesión (sessionStorage) y la base de datos del navegador (IndexedDB) para:",
          {
            list: [
              "Tema claro, oscuro o del sistema (theme).",
              "Preferencias de visualización del Modo en vivo (setlyst:live-display) y cantidad de elementos por página en las listas (setlyst:page-size).",
              "Registro de que la sugerencia de gesto del Modo en vivo ya se mostró (setlyst:live-swipe-hint-seen).",
              "Avisos y banners descartados (setlyst:email-banner-dismissed y setlyst-announcements-continued, en el almacenamiento de sesión, que se borran al cerrar el navegador).",
              "Base de datos sin conexión (setlyst-offline, en IndexedDB): contenido guardado para uso sin conexión y cola de cambios hechos sin conexión, que se sincronizan cuando vuelve la conexión.",
              "Archivos de la aplicación guardados por el service worker, para abrir la app más rápido y sin conexión.",
            ],
          },
          "Estos datos quedan solo en tu dispositivo y no se usan para identificarte ni para seguimiento. La base de datos sin conexión se borra al cerrar sesión; las preferencias permanecen hasta que las cambies o borres los datos del sitio en el navegador.",
        ],
      },
      {
        id: "analytics",
        heading: "Estadísticas de visitas",
        blocks: [
          "Usamos Vercel Web Analytics para contar las visitas de forma agregada. No usa cookies, no crea identificadores persistentes y no te sigue entre sitios.",
          "Como Setlyst solo usa cookies y almacenamiento estrictamente necesarios o de preferencias, sin herramientas publicitarias ni de seguimiento, no mostramos un banner de consentimiento de cookies, conforme a la guía orientativa sobre cookies de la ANPD.",
        ],
      },
      {
        id: "advertising",
        heading: "Publicidad",
        blocks: [
          "Setlyst no usa cookies publicitarias, no muestra anuncios y no comparte datos de navegación con redes publicitarias.",
        ],
      },
      {
        id: "control",
        heading: "Cómo controlarlas",
        blocks: [
          "Puedes borrar o bloquear las cookies en la configuración del navegador. Bloquear las cookies estrictamente necesarias impide iniciar sesión. Cerrar sesión borra los datos sin conexión que Setlyst guarda en este dispositivo.",
          `Dudas sobre cookies y privacidad: ${PRIVACY_EMAIL}.`,
        ],
      },
    ],
  },
};
