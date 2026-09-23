/*
 * Política de Cookies do Setlyst.
 *
 * Lista os cookies e o armazenamento local realmente usados pelo app
 * (next-auth, next-intl, next-themes, service worker, Dexie). Ao adicionar
 * um cookie novo, atualize esta lista. Deve ser revisada por um advogado
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
              "Sessão (next-auth.session-token): mantém você conectado. Criptografado, expira com a sessão ou após o período de validade do login.",
              "Proteção contra falsificação de requisições (next-auth.csrf-token): impede que outros sites façam ações em seu nome. Dura a sessão do navegador.",
              "Endereço de retorno (next-auth.callback-url): lembra a página a que você deve voltar depois de entrar. Dura a sessão do navegador.",
              "Idioma (NEXT_LOCALE): guarda o idioma escolhido. Dura 1 ano.",
              "Indicação (quando presente): guarda por pouco tempo o código de indicação usado no cadastro com Google, para creditar quem indicou você.",
            ],
          },
        ],
      },
      {
        id: "preferences",
        heading: "Preferências e armazenamento local",
        blocks: [
          "Usamos o armazenamento local do navegador para:",
          {
            list: [
              "Tema (claro, escuro ou do sistema) nas páginas públicas.",
              "Conteúdo salvo para uso offline e fila de alterações feitas sem conexão, que são sincronizadas quando a conexão volta.",
              "Arquivos da aplicação guardados pelo service worker, para abrir o app mais rápido e sem conexão.",
            ],
          },
          "Esses dados ficam somente no seu dispositivo e são apagados quando você sai da conta.",
        ],
      },
      {
        id: "analytics",
        heading: "Estatísticas de acesso",
        blocks: [
          "Usamos o Vercel Web Analytics para contar visitas de forma agregada. Ele não usa cookies, não cria identificadores persistentes e não segue você entre sites.",
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
              "Session (next-auth.session-token): keeps you signed in. Encrypted; expires with the session or after the sign-in validity period.",
              "Cross-site request forgery protection (next-auth.csrf-token): stops other sites from taking actions on your behalf. Lasts for the browser session.",
              "Return address (next-auth.callback-url): remembers the page to return to after signing in. Lasts for the browser session.",
              "Language (NEXT_LOCALE): stores the chosen language. Lasts 1 year.",
              "Referral (when present): briefly stores the referral code used when signing up with Google, so the person who referred you is credited.",
            ],
          },
        ],
      },
      {
        id: "preferences",
        heading: "Preferences and local storage",
        blocks: [
          "We use the browser's local storage for:",
          {
            list: [
              "Theme (light, dark or system) on the public pages.",
              "Content saved for offline use and the queue of changes made without a connection, which are synced when the connection returns.",
              "Application files kept by the service worker, so the app opens faster and without a connection.",
            ],
          },
          "This data stays only on your device and is erased when you sign out.",
        ],
      },
      {
        id: "analytics",
        heading: "Visit statistics",
        blocks: [
          "We use Vercel Web Analytics to count visits in aggregate. It does not use cookies, does not create persistent identifiers and does not follow you across sites.",
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
              "Sesión (next-auth.session-token): mantiene tu sesión iniciada. Cifrada; caduca con la sesión o tras el período de validez del inicio de sesión.",
              "Protección contra falsificación de peticiones (next-auth.csrf-token): impide que otros sitios realicen acciones en tu nombre. Dura la sesión del navegador.",
              "Dirección de retorno (next-auth.callback-url): recuerda la página a la que volver tras iniciar sesión. Dura la sesión del navegador.",
              "Idioma (NEXT_LOCALE): guarda el idioma elegido. Dura 1 año.",
              "Recomendación (cuando existe): guarda durante poco tiempo el código de recomendación usado al registrarte con Google, para acreditar a quien te recomendó.",
            ],
          },
        ],
      },
      {
        id: "preferences",
        heading: "Preferencias y almacenamiento local",
        blocks: [
          "Usamos el almacenamiento local del navegador para:",
          {
            list: [
              "Tema (claro, oscuro o del sistema) en las páginas públicas.",
              "Contenido guardado para uso sin conexión y cola de cambios hechos sin conexión, que se sincronizan cuando vuelve la conexión.",
              "Archivos de la aplicación guardados por el service worker, para abrir la app más rápido y sin conexión.",
            ],
          },
          "Estos datos quedan solo en tu dispositivo y se borran al cerrar sesión.",
        ],
      },
      {
        id: "analytics",
        heading: "Estadísticas de visitas",
        blocks: [
          "Usamos Vercel Web Analytics para contar las visitas de forma agregada. No usa cookies, no crea identificadores persistentes y no te sigue entre sitios.",
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
