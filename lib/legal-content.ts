/**
 * The legal texts shown at /legal/[doc]. Kept in code (not in the message
 * catalogs) so each document is reviewed as one block per language.
 *
 * These describe how Setlyst actually works — what is stored, where, for
 * how long and who can see it. They are a solid starting point, not legal
 * advice: have them reviewed for your jurisdiction (e.g. LGPD in Brazil,
 * GDPR in the EU) before relying on them, and bump `updated` whenever the
 * text changes.
 */

import type { AppLocale } from "@/i18n/locales";
import { SUPPORT_EMAIL } from "@/lib/links";
import type { LegalDocument } from "@/lib/links";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalText {
  title: string;
  summary: string;
  sections: LegalSection[];
}

/** ISO date of the last substantive change, per document. */
export const LEGAL_UPDATED: Record<LegalDocument, string> = {
  terms: "2026-09-22",
  privacy: "2026-09-22",
  security: "2026-09-22",
};

const contact = SUPPORT_EMAIL;

const TEXTS: Record<LegalDocument, Record<AppLocale, LegalText>> = {
  terms: {
    en: {
      title: "Terms of use",
      summary: "The rules for using Setlyst.",
      sections: [
        {
          heading: "The service",
          paragraphs: [
            "Setlyst is a catalogue of lyrics, chords and setlists for live performance. It is offered as is, on small infrastructure, and may change or be unavailable at times. We'll announce significant changes on the “What's new” page.",
          ],
        },
        {
          heading: "Your account",
          paragraphs: [
            "You're responsible for what happens under your account. Choose a strong password, don't share it, and tell us at " +
              contact +
              " if you think someone else has access.",
            "Usernames must follow the platform rules and can't impersonate other people, bands or Setlyst itself.",
          ],
        },
        {
          heading: "Your content",
          paragraphs: [
            "Songs, lyrics, setlists and notes you add remain yours. You grant Setlyst only the permission needed to store them and show them to you, to your bands and — when you create a public link — to anyone with that link.",
            "Only add material you have the right to use. Lyrics and chords of other artists are usually protected by copyright: keeping them for your own rehearsal and performance is your responsibility, and sharing them publicly may not be allowed.",
          ],
        },
        {
          heading: "Fair use and limits",
          paragraphs: [
            "Each account has limits on how much it can store (see Settings → Usage & limits). Don't try to get around limits, overload the service, access other people's data or use Setlyst to distribute unlawful content.",
          ],
        },
        {
          heading: "Moderation",
          paragraphs: [
            "Staff (admins and moderators) may take public links down, suspend or deactivate accounts that break these terms, always recording the action and, where possible, telling you why. Deactivation and suspension keep your data; permanent deletion is a last resort.",
          ],
        },
        {
          heading: "Ending",
          paragraphs: [
            "You can export your library at any time (Settings → Backup) and ask for your account to be deleted by writing to " +
              contact +
              ".",
          ],
        },
      ],
    },
    "pt-BR": {
      title: "Termos de uso",
      summary: "As regras para usar o Setlyst.",
      sections: [
        {
          heading: "O serviço",
          paragraphs: [
            "O Setlyst é um catálogo de letras, cifras e setlists para apresentações ao vivo. Ele é oferecido como está, em uma infraestrutura pequena, e pode mudar ou ficar indisponível em alguns momentos. Mudanças importantes são anunciadas na página “Novidades”.",
          ],
        },
        {
          heading: "Sua conta",
          paragraphs: [
            "Você é responsável pelo que acontece na sua conta. Use uma senha forte, não a compartilhe e avise em " +
              contact +
              " se achar que outra pessoa tem acesso.",
            "Nomes de usuário devem seguir as regras da plataforma e não podem se passar por outras pessoas, bandas ou pelo próprio Setlyst.",
          ],
        },
        {
          heading: "Seu conteúdo",
          paragraphs: [
            "Músicas, letras, setlists e anotações que você adiciona continuam sendo seus. Você concede ao Setlyst apenas a permissão necessária para armazená-los e mostrá-los a você, às suas bandas e — quando você cria um link público — a quem tiver o link.",
            "Adicione apenas material que você tem direito de usar. Letras e cifras de outros artistas geralmente são protegidas por direitos autorais: mantê-las para seus ensaios e shows é responsabilidade sua, e compartilhá-las publicamente pode não ser permitido.",
          ],
        },
        {
          heading: "Uso justo e limites",
          paragraphs: [
            "Cada conta tem limites de armazenamento (veja Configurações → Uso e limites). Não tente contornar limites, sobrecarregar o serviço, acessar dados de outras pessoas ou usar o Setlyst para distribuir conteúdo ilegal.",
          ],
        },
        {
          heading: "Moderação",
          paragraphs: [
            "A equipe (administradores e moderadores) pode derrubar links públicos, suspender ou desativar contas que descumpram estes termos, sempre registrando a ação e, quando possível, informando o motivo. Desativação e suspensão preservam seus dados; a exclusão permanente é o último recurso.",
          ],
        },
        {
          heading: "Encerramento",
          paragraphs: [
            "Você pode exportar seu repertório a qualquer momento (Configurações → Backup) e pedir a exclusão da sua conta escrevendo para " +
              contact +
              ".",
          ],
        },
      ],
    },
    es: {
      title: "Términos de uso",
      summary: "Las reglas para usar Setlyst.",
      sections: [
        {
          heading: "El servicio",
          paragraphs: [
            "Setlyst es un catálogo de letras, acordes y setlists para actuaciones en vivo. Se ofrece tal cual, sobre una infraestructura pequeña, y puede cambiar o no estar disponible en algún momento. Los cambios importantes se anuncian en la página «Novedades».",
          ],
        },
        {
          heading: "Tu cuenta",
          paragraphs: [
            "Eres responsable de lo que ocurre en tu cuenta. Usa una contraseña fuerte, no la compartas y avísanos en " +
              contact +
              " si crees que otra persona tiene acceso.",
            "Los nombres de usuario deben seguir las reglas de la plataforma y no pueden suplantar a otras personas, bandas ni a Setlyst.",
          ],
        },
        {
          heading: "Tu contenido",
          paragraphs: [
            "Las canciones, letras, setlists y notas que añades siguen siendo tuyas. Concedes a Setlyst solo el permiso necesario para guardarlas y mostrarlas a ti, a tus bandas y —cuando creas un enlace público— a quien tenga el enlace.",
            "Añade solo material que tengas derecho a usar. Las letras y acordes de otros artistas suelen estar protegidos por derechos de autor: guardarlos para tus ensayos y conciertos es tu responsabilidad, y compartirlos públicamente puede no estar permitido.",
          ],
        },
        {
          heading: "Uso justo y límites",
          paragraphs: [
            "Cada cuenta tiene límites de almacenamiento (ver Configuración → Uso y límites). No intentes eludir los límites, sobrecargar el servicio, acceder a datos de otras personas ni usar Setlyst para distribuir contenido ilícito.",
          ],
        },
        {
          heading: "Moderación",
          paragraphs: [
            "El equipo (administradores y moderadores) puede retirar enlaces públicos, suspender o desactivar cuentas que incumplan estos términos, registrando siempre la acción y, cuando sea posible, explicando el motivo. La desactivación y la suspensión conservan tus datos; la eliminación permanente es el último recurso.",
          ],
        },
        {
          heading: "Baja",
          paragraphs: [
            "Puedes exportar tu repertorio en cualquier momento (Configuración → Copia de seguridad) y pedir que se elimine tu cuenta escribiendo a " +
              contact +
              ".",
          ],
        },
      ],
    },
  },

  privacy: {
    en: {
      title: "Privacy & data storage",
      summary: "What we store, where, for how long and who can see it.",
      sections: [
        {
          heading: "What we store",
          paragraphs: [
            "Account: username, optional email and name, role, and a hash of your password (Argon2 — the password itself is never stored).",
            "Library: artists, songs, lyrics, tags, setlists, shows and bands you create or join, plus your preferences (language, theme, Live Mode and PDF defaults).",
            "Activity: when you last signed in, and an audit log of administrative and security-relevant actions (who did what, when, and from which IP address).",
          ],
        },
        {
          heading: "Where it lives",
          paragraphs: [
            "Everything is stored in a PostgreSQL database operated for Setlyst. Songs you make available offline are also kept in your browser's storage on that device only.",
            "Page views are counted with Vercel Analytics, which does not use cookies or build a profile of you. We don't sell data or show ads.",
          ],
        },
        {
          heading: "Who can see it",
          paragraphs: [
            "Your personal library is visible only to you. Band content is visible to that band's members. Public links show a read-only copy to anyone who has the link, until you (or staff) turn it off.",
            "Staff can see account details and content when needed to run and moderate the service. They can “view as” another user in read-only mode; every such session is recorded in the audit log.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Your data is kept while your account exists. Deactivated or suspended accounts keep their data so they can be restored. When an account is deleted, its personal content is removed; band content it created stays with the band. Audit entries are kept to protect the platform.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "You can view and edit your profile, export your library as a backup file at any time, and ask for a copy or deletion of your data by writing to " +
              contact +
              ". Depending on where you live (for example under the LGPD or the GDPR) you may have additional rights.",
          ],
        },
      ],
    },
    "pt-BR": {
      title: "Privacidade e armazenamento de dados",
      summary: "O que guardamos, onde, por quanto tempo e quem pode ver.",
      sections: [
        {
          heading: "O que guardamos",
          paragraphs: [
            "Conta: nome de usuário, e-mail e nome (opcionais), papel e um hash da sua senha (Argon2 — a senha em si nunca é armazenada).",
            "Repertório: artistas, músicas, letras, tags, setlists, shows e bandas que você cria ou participa, além das suas preferências (idioma, tema, padrões do Modo Ao Vivo e do PDF).",
            "Atividade: seu último acesso e um registro de auditoria das ações administrativas e de segurança (quem fez o quê, quando e de qual endereço IP).",
          ],
        },
        {
          heading: "Onde fica",
          paragraphs: [
            "Tudo é armazenado em um banco de dados PostgreSQL operado para o Setlyst. Músicas que você deixa disponíveis offline também ficam no armazenamento do navegador, apenas naquele aparelho.",
            "As visualizações de página são contadas com o Vercel Analytics, que não usa cookies nem cria um perfil seu. Não vendemos dados nem exibimos anúncios.",
          ],
        },
        {
          heading: "Quem pode ver",
          paragraphs: [
            "Seu repertório pessoal é visível só para você. O conteúdo de uma banda é visível aos membros dela. Links públicos mostram uma cópia somente leitura para quem tiver o link, até você (ou a equipe) desativá-lo.",
            "A equipe pode ver dados da conta e conteúdo quando necessário para operar e moderar o serviço. Ela pode “ver como” outro usuário em modo somente leitura; toda sessão assim fica registrada na auditoria.",
          ],
        },
        {
          heading: "Por quanto tempo",
          paragraphs: [
            "Seus dados são mantidos enquanto a conta existir. Contas desativadas ou suspensas mantêm os dados para poderem ser restauradas. Quando uma conta é excluída, o conteúdo pessoal é removido; o conteúdo de banda criado por ela fica com a banda. Registros de auditoria são mantidos para proteger a plataforma.",
          ],
        },
        {
          heading: "Seus direitos",
          paragraphs: [
            "Você pode ver e editar seu perfil, exportar seu repertório como arquivo de backup a qualquer momento e pedir uma cópia ou a exclusão dos seus dados escrevendo para " +
              contact +
              ". Conforme a LGPD, você também pode solicitar confirmação de tratamento, correção e informações sobre compartilhamento.",
          ],
        },
      ],
    },
    es: {
      title: "Privacidad y almacenamiento de datos",
      summary:
        "Qué guardamos, dónde, durante cuánto tiempo y quién puede verlo.",
      sections: [
        {
          heading: "Qué guardamos",
          paragraphs: [
            "Cuenta: nombre de usuario, correo y nombre (opcionales), rol y un hash de tu contraseña (Argon2: la contraseña en sí nunca se guarda).",
            "Repertorio: artistas, canciones, letras, etiquetas, setlists, conciertos y bandas que creas o a las que te unes, además de tus preferencias (idioma, tema, valores del Modo en vivo y del PDF).",
            "Actividad: tu último acceso y un registro de auditoría de las acciones administrativas y de seguridad (quién hizo qué, cuándo y desde qué dirección IP).",
          ],
        },
        {
          heading: "Dónde se guarda",
          paragraphs: [
            "Todo se guarda en una base de datos PostgreSQL operada para Setlyst. Las canciones que dejas disponibles sin conexión también se guardan en el almacenamiento del navegador, solo en ese dispositivo.",
            "Las visitas se cuentan con Vercel Analytics, que no usa cookies ni crea un perfil tuyo. No vendemos datos ni mostramos anuncios.",
          ],
        },
        {
          heading: "Quién puede verlo",
          paragraphs: [
            "Tu repertorio personal solo lo ves tú. El contenido de una banda lo ven sus miembros. Los enlaces públicos muestran una copia de solo lectura a quien tenga el enlace, hasta que tú (o el equipo) lo desactivéis.",
            "El equipo puede ver datos de la cuenta y contenido cuando es necesario para operar y moderar el servicio. Puede «ver como» otro usuario en modo solo lectura; cada sesión así queda registrada en la auditoría.",
          ],
        },
        {
          heading: "Durante cuánto tiempo",
          paragraphs: [
            "Tus datos se conservan mientras exista tu cuenta. Las cuentas desactivadas o suspendidas conservan sus datos para poder restaurarse. Cuando se elimina una cuenta, se borra su contenido personal; el contenido de banda que creó se queda en la banda. Los registros de auditoría se conservan para proteger la plataforma.",
          ],
        },
        {
          heading: "Tus derechos",
          paragraphs: [
            "Puedes ver y editar tu perfil, exportar tu repertorio como copia de seguridad en cualquier momento y pedir una copia o la eliminación de tus datos escribiendo a " +
              contact +
              ". Según dónde vivas (por ejemplo, con el RGPD) puedes tener derechos adicionales.",
          ],
        },
      ],
    },
  },

  security: {
    en: {
      title: "Security policy",
      summary:
        "How accounts and data are protected, and how to report a problem.",
      sections: [
        {
          heading: "Accounts and passwords",
          paragraphs: [
            "Passwords must have at least 8 characters with upper- and lowercase letters, a number and a symbol, can't contain your username and can't be a known common password. They're stored only as Argon2 hashes.",
            "Changing your password signs you out on every device. Staff never need your password: when they help you get back in, they set a temporary one that you must replace at your next sign-in.",
          ],
        },
        {
          heading: "Sessions",
          paragraphs: [
            "Sign-in sessions expire automatically and are checked against your account on every request, so a suspension, deactivation or password change takes effect immediately.",
          ],
        },
        {
          heading: "Access control",
          paragraphs: [
            "Roles are strictly hierarchical: moderators can only act on regular accounts, admins on users and moderators, and nobody can act on their own account from the staff console. “View as” is read-only, time-limited and audited.",
            "Repeated sign-in attempts and heavy request bursts are rate limited.",
          ],
        },
        {
          heading: "Data protection",
          paragraphs: [
            "Traffic is served over HTTPS. The API sends strict security headers, never returns internal error details, and records administrative actions in an audit log.",
          ],
        },
        {
          heading: "Reporting a vulnerability",
          paragraphs: [
            "Found a security problem? Please write to " +
              contact +
              " with the details and steps to reproduce, and give us reasonable time to fix it before disclosing it. Please don't access other people's data or disrupt the service while testing.",
          ],
        },
      ],
    },
    "pt-BR": {
      title: "Política de segurança",
      summary: "Como contas e dados são protegidos e como relatar um problema.",
      sections: [
        {
          heading: "Contas e senhas",
          paragraphs: [
            "Senhas precisam ter pelo menos 8 caracteres, com letras maiúsculas e minúsculas, um número e um símbolo, não podem conter seu nome de usuário e não podem ser uma senha comum conhecida. Elas são armazenadas apenas como hash Argon2.",
            "Alterar a senha desconecta você de todos os dispositivos. A equipe nunca precisa da sua senha: ao ajudar você a voltar a entrar, ela define uma senha temporária que você deve trocar no próximo acesso.",
          ],
        },
        {
          heading: "Sessões",
          paragraphs: [
            "As sessões expiram automaticamente e são verificadas contra a sua conta a cada requisição, então suspensão, desativação ou troca de senha valem na hora.",
          ],
        },
        {
          heading: "Controle de acesso",
          paragraphs: [
            "Os papéis são estritamente hierárquicos: moderadores só atuam sobre contas comuns, administradores sobre usuários e moderadores, e ninguém atua sobre a própria conta pelo painel da equipe. O “ver como” é somente leitura, tem tempo limitado e é auditado.",
            "Tentativas repetidas de login e picos de requisições são limitados.",
          ],
        },
        {
          heading: "Proteção de dados",
          paragraphs: [
            "O tráfego usa HTTPS. A API envia cabeçalhos de segurança rigorosos, nunca expõe detalhes internos de erro e registra ações administrativas em auditoria.",
          ],
        },
        {
          heading: "Relatar uma vulnerabilidade",
          paragraphs: [
            "Encontrou um problema de segurança? Escreva para " +
              contact +
              " com os detalhes e os passos para reproduzir, e nos dê um prazo razoável para corrigir antes de divulgar. Não acesse dados de outras pessoas nem prejudique o serviço durante os testes.",
          ],
        },
      ],
    },
    es: {
      title: "Política de seguridad",
      summary:
        "Cómo se protegen las cuentas y los datos, y cómo informar de un problema.",
      sections: [
        {
          heading: "Cuentas y contraseñas",
          paragraphs: [
            "Las contraseñas deben tener al menos 8 caracteres con mayúsculas y minúsculas, un número y un símbolo, no pueden contener tu nombre de usuario ni ser una contraseña común conocida. Se guardan solo como hash Argon2.",
            "Cambiar la contraseña cierra tu sesión en todos los dispositivos. El equipo nunca necesita tu contraseña: si te ayuda a recuperar el acceso, define una temporal que deberás cambiar en tu próximo inicio de sesión.",
          ],
        },
        {
          heading: "Sesiones",
          paragraphs: [
            "Las sesiones caducan automáticamente y se comprueban con tu cuenta en cada petición, así que una suspensión, desactivación o cambio de contraseña se aplica de inmediato.",
          ],
        },
        {
          heading: "Control de acceso",
          paragraphs: [
            "Los roles son estrictamente jerárquicos: los moderadores solo actúan sobre cuentas normales, los administradores sobre usuarios y moderadores, y nadie actúa sobre su propia cuenta desde el panel del equipo. «Ver como» es de solo lectura, tiene tiempo limitado y queda auditado.",
            "Los intentos repetidos de inicio de sesión y las ráfagas de peticiones están limitados.",
          ],
        },
        {
          heading: "Protección de datos",
          paragraphs: [
            "El tráfico se sirve por HTTPS. La API envía cabeceras de seguridad estrictas, nunca expone detalles internos de errores y registra las acciones administrativas en una auditoría.",
          ],
        },
        {
          heading: "Informar de una vulnerabilidad",
          paragraphs: [
            "¿Has encontrado un problema de seguridad? Escribe a " +
              contact +
              " con los detalles y los pasos para reproducirlo, y danos un plazo razonable para corregirlo antes de publicarlo. No accedas a datos de otras personas ni interrumpas el servicio durante las pruebas.",
          ],
        },
      ],
    },
  },
};

export function getLegalText(doc: LegalDocument, locale: string): LegalText {
  const texts = TEXTS[doc];
  return (texts as Record<string, LegalText>)[locale] ?? texts.en;
}
