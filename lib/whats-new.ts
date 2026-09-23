/**
 * Release notes shown on the "What's new" page. Newest first. Text is
 * written per locale here (not in messages/*.json) so each release note
 * stays together as one reviewable block.
 *
 * To announce a release: add an entry at the top with a new, unique `id`.
 * Everyone whose `ui_settings.whatsNew.lastSeen` differs from the newest
 * id sees the "new" dot until they open the page.
 */

import type { AppLocale } from "@/i18n/locales";

export type ReleaseItemKind = "new" | "improved" | "fixed" | "security";

export interface ReleaseItem {
  kind: ReleaseItemKind;
  text: Record<AppLocale, string>;
}

export interface ReleaseNote {
  id: string;
  version: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: Record<AppLocale, string>;
  items: ReleaseItem[];
}

export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: "2026-09-v0.11",
    version: "0.11.0",
    date: "2026-09-22",
    title: {
      en: "Tags, a new PDF engine and a safer platform",
      "pt-BR": "Tags, novo motor de PDF e uma plataforma mais segura",
      es: "Etiquetas, un nuevo motor de PDF y una plataforma más segura",
    },
    items: [
      {
        kind: "new",
        text: {
          en: 'Tag your songs ("ballad", "opener", "romantic"…) and filter your library by vibe — click any tag to see every song that shares it. Rename or merge tags from the Songs page.',
          "pt-BR":
            'Adicione tags às suas músicas ("balada", "abertura", "romântica"…) e filtre seu repertório pela vibe — clique em uma tag para ver todas as músicas com ela. Renomeie ou junte tags na página de Músicas.',
          es: "Etiqueta tus canciones («balada», «apertura», «romántica»…) y filtra tu repertorio por ambiente: haz clic en una etiqueta para ver todas las canciones que la comparten. Renombra o une etiquetas desde la página de Canciones.",
        },
      },
      {
        kind: "new",
        text: {
          en: "PDF export rebuilt: compact and two-column layouts, text size, paper size and orientation, margins, page numbers, an optional Setlyst watermark, and a full songbook with chords aligned above the lyrics. Save your favourite setup as the default.",
          "pt-BR":
            "Exportação para PDF refeita: layout compacto e em duas colunas, tamanho do texto, papel e orientação, margens, numeração de páginas, marca d'água do Setlyst opcional e um songbook completo com os acordes alinhados sobre a letra. Salve sua configuração favorita como padrão.",
          es: "Exportación a PDF renovada: diseño compacto y a dos columnas, tamaño de texto, papel y orientación, márgenes, números de página, marca de agua de Setlyst opcional y un cancionero completo con los acordes alineados sobre la letra. Guarda tu configuración favorita como predeterminada.",
        },
      },
      {
        kind: "new",
        text: {
          en: "Your preferences now follow you to every device: Live Mode defaults (chords, sections, contrast, fit to screen), PDF defaults and list size live in Settings.",
          "pt-BR":
            "Suas preferências agora acompanham você em todos os dispositivos: padrões do Modo Ao Vivo (acordes, seções, contraste, caber na tela), padrões de PDF e tamanho das listas ficam em Configurações.",
          es: "Tus preferencias ahora te siguen en todos los dispositivos: valores del Modo en vivo (acordes, secciones, contraste, ajustar a pantalla), del PDF y tamaño de listas en Configuración.",
        },
      },
      {
        kind: "security",
        text: {
          en: "Stronger passwords: every account must now meet the new password policy. Changing your password signs you out everywhere.",
          "pt-BR":
            "Senhas mais fortes: toda conta agora precisa atender à nova política de senhas. Alterar a senha desconecta você de todos os dispositivos.",
          es: "Contraseñas más fuertes: toda cuenta debe cumplir la nueva política. Cambiar la contraseña cierra tu sesión en todos los dispositivos.",
        },
      },
      {
        kind: "improved",
        text: {
          en: "See who last changed a song, setlist or band, and when.",
          "pt-BR":
            "Veja quem alterou por último uma música, setlist ou banda, e quando.",
          es: "Consulta quién modificó por última vez una canción, setlist o banda, y cuándo.",
        },
      },
      {
        kind: "improved",
        text: {
          en: "Settings has a new layout, with Usage & limits showing how much of your space you're using.",
          "pt-BR":
            "Uso e limites, em Configurações, mostra quanto do seu espaço você está usando.",
          es: "Uso y límites, en Configuración, muestra cuánto de tu espacio estás usando.",
        },
      },
      {
        kind: "fixed",
        text: {
          en: "Clearing a song's BPM, key or duration, a gig's notes or a band's description now actually clears it.",
          "pt-BR":
            "Apagar o BPM, tom ou duração de uma música, as notas de um show ou a descrição de uma banda agora realmente apaga o valor.",
          es: "Borrar el BPM, tono o duración de una canción, las notas de un concierto o la descripción de una banda ahora sí lo borra.",
        },
      },
      {
        kind: "fixed",
        text: {
          en: "Deleting an account no longer removes the band setlists and songs that person created.",
          "pt-BR":
            "Excluir uma conta não remove mais os setlists e músicas de banda criados por essa pessoa.",
          es: "Eliminar una cuenta ya no borra los setlists y canciones de banda que esa persona creó.",
        },
      },
    ],
  },
  {
    id: "2026-08-v0.10",
    version: "0.10.0",
    date: "2026-08-20",
    title: {
      en: "Notifications, analytics and favorites",
      "pt-BR": "Notificações, análises e favoritos",
      es: "Notificaciones, análisis y favoritos",
    },
    items: [
      {
        kind: "new",
        text: {
          en: "In-app notifications when your role in a band changes or you're removed from one.",
          "pt-BR":
            "Notificações no app quando seu papel em uma banda muda ou você é removido de uma.",
          es: "Notificaciones en la app cuando cambia tu rol en una banda o te eliminan de una.",
        },
      },
      {
        kind: "new",
        text: {
          en: "Analytics: your activity over time, top genres and artists.",
          "pt-BR":
            "Análises: sua atividade ao longo do tempo, principais gêneros e artistas.",
          es: "Análisis: tu actividad a lo largo del tiempo, géneros y artistas principales.",
        },
      },
      {
        kind: "new",
        text: {
          en: "Favorite setlists and bands to keep them at the top.",
          "pt-BR": "Favorite setlists e bandas para mantê-los no topo.",
          es: "Marca setlists y bandas como favoritos para tenerlos arriba.",
        },
      },
    ],
  },
];

export const LATEST_RELEASE_ID = RELEASE_NOTES[0]?.id ?? null;

/** Whether there's a release note the person hasn't opened yet. */
export function hasUnseenRelease(lastSeen: string | null | undefined): boolean {
  return LATEST_RELEASE_ID !== null && lastSeen !== LATEST_RELEASE_ID;
}
