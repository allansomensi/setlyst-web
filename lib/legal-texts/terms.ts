/*
 * Termos de Uso do Setlyst.
 *
 * Texto redigido para refletir o funcionamento real da plataforma e a
 * legislação brasileira (CDC, Marco Civil da Internet, LGPD, Lei 9.610/98).
 * Antes da publicação definitiva, este texto deve ser revisado por um
 * advogado. O português (pt-BR) é a versão de referência; en e es são
 * traduções de mesmo conteúdo.
 */

import { CONTROLLER } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/links";
import type { LegalTexts } from "./types";

const who = `${CONTROLLER.name}, inscrita no CNPJ sob o nº ${CONTROLLER.taxId}, com sede em ${CONTROLLER.address}`;
const whoEn = `${CONTROLLER.name}, registered under CNPJ ${CONTROLLER.taxId}, with its registered office at ${CONTROLLER.address}`;
const whoEs = `${CONTROLLER.name}, inscrita en el CNPJ con el nº ${CONTROLLER.taxId}, con domicilio en ${CONTROLLER.address}`;

export const TERMS: LegalTexts = {
  "pt-BR": {
    title: "Termos de Uso",
    summary:
      "As regras para usar o Setlyst: conta, conteúdo, bandas, links públicos, moderação e responsabilidades.",
    sections: [
      {
        id: "acceptance",
        heading: "Aceitação",
        blocks: [
          `Estes Termos de Uso regulam o acesso e o uso do Setlyst, plataforma on-line de organização de repertório, letras, cifras, setlists e apresentações ao vivo, oferecida por ${who} (“Setlyst”, “nós”).`,
          "Ao criar uma conta ou usar a plataforma, você declara que leu, entendeu e aceita estes Termos, a Política de Privacidade, a Política de Cookies, as Diretrizes da Comunidade e a Política de Direitos Autorais. Se você contratar um plano pago, também se aplicam os Termos de Assinatura.",
          "Se você não concordar com algum destes documentos, não crie uma conta nem use a plataforma.",
        ],
      },
      {
        id: "definitions",
        heading: "Definições",
        blocks: [
          "Para os fins destes Termos:",
          {
            list: [
              "Plataforma: o site, o aplicativo web instalável (PWA) e a API do Setlyst.",
              "Usuário: a pessoa física titular de uma conta.",
              "Conteúdo do Usuário: músicas, letras, cifras, anotações, setlists, shows, turnês, imagens de perfil e demais informações inseridas por Usuários.",
              "Banda: espaço compartilhado entre Usuários, com repertório, setlists, shows e turnês comuns.",
              "Link público: endereço criado por um Usuário para exibir uma setlist ou um show a pessoas sem conta.",
              "Equipe: administradores e moderadores designados pelo Setlyst.",
            ],
          },
        ],
      },
      {
        id: "service",
        heading: "O serviço",
        blocks: [
          "O Setlyst permite cadastrar músicas com letra e cifra, montar setlists, analisar andamento (BPM) e energia do repertório, apresentar no Modo Ao Vivo com metrônomo e transposição de tom, organizar shows e turnês, trabalhar em bandas com repertório compartilhado, exportar em PDF e ChordPro e consultar conteúdo sem conexão.",
          "O Setlyst é uma ferramenta de organização. Não fornecemos, vendemos nem licenciamos letras, cifras ou obras musicais de terceiros: todo o repertório é inserido pelos próprios Usuários.",
        ],
      },
      {
        id: "account",
        heading: "Cadastro e conta",
        blocks: [
          "Para usar a plataforma é necessário criar uma conta com nome de usuário, e-mail válido e senha, ou por meio do login com Google. As informações fornecidas devem ser verdadeiras e mantidas atualizadas.",
          "A plataforma é destinada a pessoas com 18 anos ou mais. Adolescentes de 16 e 17 anos podem usá-la somente com o consentimento e a supervisão de pai, mãe ou responsável legal, que responde pelos atos praticados na conta. Não é permitido o uso por menores de 16 anos.",
          "Cada conta é pessoal e intransferível. Não é permitido criar contas em nome de outra pessoa, manter contas para contornar sanções ou comercializar contas.",
          "O nome de usuário e a imagem de perfil devem respeitar as Diretrizes da Comunidade. O Setlyst pode redefinir nomes de usuário que as violem.",
        ],
      },
      {
        id: "account-security",
        heading: "Segurança da conta",
        blocks: [
          "Você é responsável por manter sua senha em sigilo e por toda atividade realizada na sua conta. Recomendamos ativar a verificação em duas etapas nas configurações de segurança.",
          `Se suspeitar de acesso não autorizado, altere a senha imediatamente e avise-nos pelo e-mail ${SUPPORT_EMAIL}. A equipe do Setlyst nunca pede a sua senha.`,
        ],
      },
      {
        id: "acceptable-use",
        heading: "Uso aceitável",
        blocks: [
          "Ao usar a plataforma, você se compromete a não:",
          {
            list: [
              "publicar ou compartilhar conteúdo ilícito, ofensivo, discriminatório ou que viole direitos de terceiros;",
              "compartilhar publicamente obras protegidas sem autorização dos titulares;",
              "tentar acessar contas, bandas ou dados de outras pessoas sem permissão;",
              "contornar limites de uso, planos, mecanismos de segurança ou sanções aplicadas;",
              "sobrecarregar a infraestrutura, fazer coleta automatizada de dados (scraping) ou usar a API de forma abusiva;",
              "distribuir programas maliciosos, spam ou links enganosos;",
              "usar a plataforma para assediar, ameaçar ou se passar por outra pessoa.",
            ],
          },
          "Testes de segurança são bem-vindos somente nas condições descritas na Política de Segurança.",
        ],
      },
      {
        id: "user-content",
        heading: "Conteúdo do Usuário e licença",
        blocks: [
          "O Conteúdo do Usuário continua sendo seu (ou de quem detém os respectivos direitos). O Setlyst não reivindica propriedade sobre ele.",
          "Você concede ao Setlyst uma licença não exclusiva, gratuita, mundial e limitada ao período em que o conteúdo estiver armazenado, apenas para hospedar, armazenar, reproduzir tecnicamente, adaptar o formato (por exemplo, gerar PDF ou transpor o tom) e exibir o conteúdo para você, para os integrantes das suas bandas e para quem acessar os links públicos que você criar. Essa licença existe somente para operar o serviço e termina com a exclusão do conteúdo, ressalvadas as cópias de segurança mantidas pelo prazo informado na Política de Privacidade.",
          "O Setlyst não usa o seu conteúdo para publicidade, não o vende e não o disponibiliza a terceiros além do necessário para operar a plataforma.",
        ],
      },
      {
        id: "third-party-content",
        heading: "Material protegido de terceiros",
        blocks: [
          "Letras, cifras e arranjos de outros artistas costumam ser obras protegidas pela Lei 9.610/1998. Ao inserir esse material, você declara ter o direito de usá-lo ou fazê-lo para fins de estudo, ensaio e execução, sendo o único responsável por esse uso.",
          "Compartilhar publicamente obras protegidas pode depender de autorização dos titulares. Os procedimentos de notificação e retirada estão descritos na Política de Direitos Autorais.",
        ],
      },
      {
        id: "public-links",
        heading: "Links públicos de compartilhamento",
        blocks: [
          "Você pode gerar links públicos de setlists e shows. Qualquer pessoa com o link consegue ver o conteúdo compartilhado, inclusive letras e cifras, sem precisar de conta.",
          "Você pode revogar um link a qualquer momento. Cópias ou capturas feitas por terceiros enquanto o link esteve ativo fogem ao controle do Setlyst.",
          "A Equipe pode bloquear links públicos que violem estes Termos ou direitos de terceiros.",
        ],
      },
      {
        id: "bands",
        heading: "Bandas",
        blocks: [
          "Quem cria uma banda torna-se seu proprietário. O proprietário e os administradores definem funções e permissões dos integrantes, que determinam quem pode editar músicas, setlists, shows e turnês da banda.",
          "Músicas, setlists, shows, turnês, sugestões e lembretes criados dentro de uma banda pertencem ao espaço da banda e ficam disponíveis a todos os integrantes, de acordo com as permissões. Ao adicionar conteúdo à banda, você autoriza os demais integrantes a acessá-lo e, conforme as permissões, a editá-lo.",
          "Quando um integrante sai ou é removido, o conteúdo que ele adicionou à banda permanece na banda. O conteúdo pessoal desse integrante continua na conta dele.",
          "O proprietário pode transferir a propriedade da banda a outro integrante e precisa fazê-lo antes de sair. Se o proprietário excluir a conta, a propriedade passa automaticamente ao integrante de função mais alta e mais antigo; se não houver outros integrantes, a banda e o seu conteúdo são excluídos.",
        ],
      },
      {
        id: "moderation",
        heading: "Moderação e sanções",
        blocks: [
          "A Equipe pode analisar conteúdos denunciados ou identificados por verificações automáticas, especialmente nomes de usuário, imagens de perfil e logotipos de bandas.",
          "Em caso de violação destes Termos ou das Diretrizes da Comunidade, o Setlyst pode, conforme a gravidade e a reincidência:",
          {
            list: [
              "remover o conteúdo ou a imagem;",
              "redefinir o nome de usuário;",
              "revogar links públicos;",
              "suspender temporariamente a conta;",
              "encerrar a conta de forma definitiva.",
            ],
          },
          "Sempre que possível, você será informado sobre a medida e o motivo, e poderá contestá-la pelo e-mail de suporte. Toda ação da Equipe fica registrada em auditoria.",
        ],
      },
      {
        id: "availability",
        heading: "Disponibilidade e período de pré-lançamento",
        blocks: [
          "O Setlyst está em período de pré-lançamento. Funcionalidades podem ser criadas, alteradas ou descontinuadas, e mudanças relevantes são anunciadas na página de Novidades ou por aviso na plataforma.",
          "Buscamos manter a plataforma disponível de forma contínua, mas podem ocorrer interrupções para manutenção, atualizações ou por fatores fora do nosso controle. O Modo Ao Vivo e o conteúdo salvo para uso offline ajudam a reduzir o impacto de falhas de conexão no palco; recomendamos manter também uma cópia exportada do repertório essencial.",
        ],
      },
      {
        id: "plans",
        heading: "Planos e assinatura",
        blocks: [
          "O Setlyst oferece os planos Básico, Intermediário e Pro, com limites e recursos descritos na página de Planos. As condições de contratação, período de teste, renovação, cancelamento, reembolso, créditos e indicações estão nos Termos de Assinatura.",
          "Durante o pré-lançamento, enquanto a cobrança não estiver ativa, todos os recursos ficam liberados sem custo. O início da cobrança será comunicado com antecedência mínima de 30 dias.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "Propriedade intelectual do Setlyst",
        blocks: [
          "A marca Setlyst, o logotipo, o design da interface e os textos institucionais pertencem ao Setlyst. O código-fonte da plataforma é distribuído sob a licença indicada nos repositórios públicos do projeto; o uso da marca não é autorizado por essa licença.",
        ],
      },
      {
        id: "liability",
        heading: "Limitação de responsabilidade",
        blocks: [
          "Respeitados os direitos garantidos pelo Código de Defesa do Consumidor (Lei 8.078/1990), o Setlyst não se responsabiliza por:",
          {
            list: [
              "Conteúdo do Usuário, inclusive a sua licitude e a titularidade de direitos autorais;",
              "danos decorrentes do uso indevido da conta por falta de cuidado com a senha;",
              "indisponibilidade causada por falhas de conexão do Usuário, de terceiros ou por caso fortuito e força maior;",
              "perdas decorrentes de conteúdo excluído pelo próprio Usuário após o prazo da lixeira.",
            ],
          },
          "Nada nestes Termos exclui ou limita responsabilidades que não possam ser afastadas por lei, em especial a responsabilidade por vícios e defeitos do serviço nos termos do CDC.",
        ],
      },
      {
        id: "termination",
        heading: "Encerramento",
        blocks: [
          "Você pode excluir a sua conta a qualquer momento em Configurações. Antes, recomendamos exportar um backup do seu conteúdo.",
          "A exclusão remove os seus dados pessoais e o seu conteúdo pessoal, observados os prazos de guarda obrigatória e de cópias de segurança descritos na Política de Privacidade. O conteúdo adicionado a bandas permanece com a banda.",
          "O Setlyst pode encerrar contas que violem gravemente estes Termos, com aviso prévio sempre que a situação permitir.",
        ],
      },
      {
        id: "changes",
        heading: "Alterações destes Termos",
        blocks: [
          "Estes Termos podem ser atualizados. A data de vigência aparece no topo do documento. Mudanças relevantes serão comunicadas por e-mail ou aviso na plataforma, e o uso continuado depende do aceite da nova versão.",
        ],
      },
      {
        id: "law",
        heading: "Lei aplicável e foro",
        blocks: [
          "Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Código de Defesa do Consumidor, o Marco Civil da Internet (Lei 12.965/2014), a Lei Geral de Proteção de Dados (Lei 13.709/2018), o Decreto 7.962/2013 e a Lei 9.610/1998.",
          "Fica eleito o foro da Comarca de Caxias do Sul/RS para resolver questões relativas a estes Termos, sem prejuízo do direito do consumidor de propor ação no foro do seu domicílio.",
        ],
      },
      {
        id: "contact",
        heading: "Contato",
        blocks: [
          `Dúvidas, solicitações e reclamações podem ser enviadas para ${SUPPORT_EMAIL}. Respondemos em até 5 dias úteis.`,
        ],
      },
    ],
  },

  en: {
    title: "Terms of Use",
    summary:
      "The rules for using Setlyst: account, content, bands, public links, moderation and responsibilities.",
    sections: [
      {
        id: "acceptance",
        heading: "Acceptance",
        blocks: [
          `These Terms of Use govern access to and use of Setlyst, an online platform for organising repertoire, lyrics, chords, setlists and live performances, provided by ${whoEn} (“Setlyst”, “we”).`,
          "By creating an account or using the platform, you declare that you have read, understood and accept these Terms, the Privacy Policy, the Cookie Policy, the Community Guidelines and the Copyright Policy. If you subscribe to a paid plan, the Subscription Terms also apply.",
          "If you do not agree with any of these documents, do not create an account or use the platform.",
        ],
      },
      {
        id: "definitions",
        heading: "Definitions",
        blocks: [
          "For the purposes of these Terms:",
          {
            list: [
              "Platform: the Setlyst website, installable web app (PWA) and API.",
              "User: the individual who holds an account.",
              "User Content: songs, lyrics, chords, notes, setlists, gigs, tours, profile pictures and any other information entered by Users.",
              "Band: a space shared between Users, with a common repertoire, setlists, gigs and tours.",
              "Public link: an address created by a User to show a setlist or a gig to people without an account.",
              "Staff: administrators and moderators appointed by Setlyst.",
            ],
          },
        ],
      },
      {
        id: "service",
        heading: "The service",
        blocks: [
          "Setlyst lets you store songs with lyrics and chords, build setlists, analyse the tempo (BPM) and energy of your repertoire, perform in Live Mode with a metronome and key transposition, organise gigs and tours, work in bands with a shared repertoire, export to PDF and ChordPro and access content offline.",
          "Setlyst is an organisation tool. We do not supply, sell or license third-party lyrics, chords or musical works: the whole repertoire is entered by Users themselves.",
        ],
      },
      {
        id: "account",
        heading: "Registration and account",
        blocks: [
          "Using the platform requires an account with a username, a valid e-mail address and a password, or signing in with Google. The information you provide must be accurate and kept up to date.",
          "The platform is intended for people aged 18 or over. Teenagers aged 16 and 17 may use it only with the consent and supervision of a parent or legal guardian, who is responsible for the account. Use by anyone under 16 is not allowed.",
          "Each account is personal and non-transferable. You may not create accounts on behalf of someone else, keep accounts to get around sanctions or trade accounts.",
          "Usernames and profile pictures must follow the Community Guidelines. Setlyst may reset usernames that break them.",
        ],
      },
      {
        id: "account-security",
        heading: "Account security",
        blocks: [
          "You are responsible for keeping your password confidential and for all activity in your account. We recommend turning on two-step verification in the security settings.",
          `If you suspect unauthorised access, change your password immediately and let us know at ${SUPPORT_EMAIL}. The Setlyst team will never ask for your password.`,
        ],
      },
      {
        id: "acceptable-use",
        heading: "Acceptable use",
        blocks: [
          "When using the platform, you agree not to:",
          {
            list: [
              "publish or share unlawful, offensive or discriminatory content, or content that infringes the rights of others;",
              "publicly share protected works without the rights holders' authorisation;",
              "try to access other people's accounts, bands or data without permission;",
              "get around usage limits, plans, security mechanisms or sanctions;",
              "overload the infrastructure, scrape data or abuse the API;",
              "distribute malware, spam or misleading links;",
              "use the platform to harass, threaten or impersonate anyone.",
            ],
          },
          "Security testing is welcome only under the conditions described in the Security Policy.",
        ],
      },
      {
        id: "user-content",
        heading: "User Content and licence",
        blocks: [
          "User Content remains yours (or belongs to whoever holds the rights to it). Setlyst claims no ownership over it.",
          "You grant Setlyst a non-exclusive, royalty-free, worldwide licence, limited to the period during which the content is stored, only to host, store, technically reproduce, adapt the format of (for example, generate a PDF or transpose the key) and display the content to you, to the members of your bands and to anyone who opens the public links you create. This licence exists only to operate the service and ends when the content is deleted, except for backup copies kept for the period stated in the Privacy Policy.",
          "Setlyst does not use your content for advertising, does not sell it and does not make it available to third parties beyond what is needed to operate the platform.",
        ],
      },
      {
        id: "third-party-content",
        heading: "Third-party protected material",
        blocks: [
          "Lyrics, chords and arrangements by other artists are usually works protected by Brazilian Law 9,610/1998. By entering such material you declare that you have the right to use it or that you do so for study, rehearsal and performance, and you are solely responsible for that use.",
          "Sharing protected works publicly may require the rights holders' authorisation. The notice and takedown procedures are described in the Copyright Policy.",
        ],
      },
      {
        id: "public-links",
        heading: "Public sharing links",
        blocks: [
          "You can create public links to setlists and gigs. Anyone with the link can see the shared content, including lyrics and chords, without an account.",
          "You can revoke a link at any time. Copies or screenshots taken by others while the link was active are outside Setlyst's control.",
          "Staff may block public links that break these Terms or infringe the rights of others.",
        ],
      },
      {
        id: "bands",
        heading: "Bands",
        blocks: [
          "Whoever creates a band becomes its owner. The owner and administrators set the members' roles and permissions, which determine who can edit the band's songs, setlists, gigs and tours.",
          "Songs, setlists, gigs, tours, suggestions and reminders created within a band belong to the band's space and are available to all members according to their permissions. By adding content to a band, you allow the other members to access it and, depending on their permissions, to edit it.",
          "When a member leaves or is removed, the content they added to the band stays with the band. That member's personal content remains in their account.",
          "The owner can transfer ownership of the band to another member and must do so before leaving. If the owner deletes their account, ownership passes automatically to the member with the highest role and longest membership; if there are no other members, the band and its content are deleted.",
        ],
      },
      {
        id: "moderation",
        heading: "Moderation and sanctions",
        blocks: [
          "Staff may review content that has been reported or detected by automatic checks, especially usernames, profile pictures and band logos.",
          "If these Terms or the Community Guidelines are broken, Setlyst may, depending on severity and recurrence:",
          {
            list: [
              "remove the content or image;",
              "reset the username;",
              "revoke public links;",
              "suspend the account temporarily;",
              "close the account permanently.",
            ],
          },
          "Whenever possible, you will be told about the measure and its reason, and you may contest it through the support e-mail. Every Staff action is recorded in an audit log.",
        ],
      },
      {
        id: "availability",
        heading: "Availability and pre-release period",
        blocks: [
          "Setlyst is in a pre-release period. Features may be added, changed or discontinued, and relevant changes are announced on the What's new page or by a notice in the platform.",
          "We aim to keep the platform continuously available, but interruptions may occur for maintenance, updates or reasons beyond our control. Live Mode and content saved for offline use help reduce the impact of connection failures on stage; we also recommend keeping an exported copy of your essential repertoire.",
        ],
      },
      {
        id: "plans",
        heading: "Plans and subscription",
        blocks: [
          "Setlyst offers the Basic, Intermediate and Pro plans, with the limits and features described on the Plans page. The conditions for subscribing, the trial period, renewal, cancellation, refunds, credits and referrals are set out in the Subscription Terms.",
          "During the pre-release period, while billing is not active, every feature is available free of charge. The start of billing will be announced at least 30 days in advance.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "Setlyst's intellectual property",
        blocks: [
          "The Setlyst brand, logo, interface design and institutional texts belong to Setlyst. The platform's source code is distributed under the licence stated in the project's public repositories; that licence does not authorise use of the brand.",
        ],
      },
      {
        id: "liability",
        heading: "Limitation of liability",
        blocks: [
          "Subject to the rights guaranteed by the Brazilian Consumer Protection Code (Law 8,078/1990), Setlyst is not liable for:",
          {
            list: [
              "User Content, including its lawfulness and copyright ownership;",
              "damage resulting from misuse of the account due to lack of care with the password;",
              "unavailability caused by failures of the User's connection, of third parties, or by acts of God and force majeure;",
              "losses resulting from content deleted by the User after the trash retention period.",
            ],
          },
          "Nothing in these Terms excludes or limits liability that cannot be excluded by law, in particular liability for defects in the service under the Consumer Protection Code.",
        ],
      },
      {
        id: "termination",
        heading: "Termination",
        blocks: [
          "You can delete your account at any time in Settings. We recommend exporting a backup of your content first.",
          "Deletion removes your personal data and your personal content, subject to the mandatory retention periods and backup periods described in the Privacy Policy. Content added to bands stays with the band.",
          "Setlyst may close accounts that seriously break these Terms, with prior notice whenever the situation allows.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to these Terms",
        blocks: [
          "These Terms may be updated. The effective date is shown at the top of the document. Relevant changes will be communicated by e-mail or a notice in the platform, and continued use requires accepting the new version.",
        ],
      },
      {
        id: "law",
        heading: "Governing law and jurisdiction",
        blocks: [
          "These Terms are governed by the laws of the Federative Republic of Brazil, in particular the Consumer Protection Code, the Brazilian Civil Rights Framework for the Internet (Law 12,965/2014), the General Data Protection Law (Law 13,709/2018), Decree 7,962/2013 and Law 9,610/1998.",
          "The courts of the District of Caxias do Sul, State of Rio Grande do Sul, Brazil, are chosen to settle matters relating to these Terms, without prejudice to the consumer's right to bring proceedings in the courts of their own domicile.",
        ],
      },
      {
        id: "contact",
        heading: "Contact",
        blocks: [
          `Questions, requests and complaints can be sent to ${SUPPORT_EMAIL}. We reply within 5 business days.`,
        ],
      },
    ],
  },

  es: {
    title: "Términos de Uso",
    summary:
      "Las reglas para usar Setlyst: cuenta, contenido, bandas, enlaces públicos, moderación y responsabilidades.",
    sections: [
      {
        id: "acceptance",
        heading: "Aceptación",
        blocks: [
          `Estos Términos de Uso regulan el acceso y el uso de Setlyst, plataforma en línea para organizar repertorio, letras, acordes, setlists y presentaciones en vivo, ofrecida por ${whoEs} (“Setlyst”, “nosotros”).`,
          "Al crear una cuenta o usar la plataforma, declaras haber leído, entendido y aceptado estos Términos, la Política de Privacidad, la Política de Cookies, las Normas de la Comunidad y la Política de Derechos de Autor. Si contratas un plan de pago, también se aplican los Términos de Suscripción.",
          "Si no estás de acuerdo con alguno de estos documentos, no crees una cuenta ni uses la plataforma.",
        ],
      },
      {
        id: "definitions",
        heading: "Definiciones",
        blocks: [
          "A efectos de estos Términos:",
          {
            list: [
              "Plataforma: el sitio web, la aplicación web instalable (PWA) y la API de Setlyst.",
              "Usuario: la persona física titular de una cuenta.",
              "Contenido del Usuario: canciones, letras, acordes, notas, setlists, shows, giras, imágenes de perfil y demás información introducida por los Usuarios.",
              "Banda: espacio compartido entre Usuarios, con repertorio, setlists, shows y giras comunes.",
              "Enlace público: dirección creada por un Usuario para mostrar una setlist o un show a personas sin cuenta.",
              "Equipo: administradores y moderadores designados por Setlyst.",
            ],
          },
        ],
      },
      {
        id: "service",
        heading: "El servicio",
        blocks: [
          "Setlyst permite registrar canciones con letra y acordes, crear setlists, analizar el tempo (BPM) y la energía del repertorio, tocar en el Modo en vivo con metrónomo y transposición de tono, organizar shows y giras, trabajar en bandas con repertorio compartido, exportar en PDF y ChordPro y consultar contenido sin conexión.",
          "Setlyst es una herramienta de organización. No suministramos, vendemos ni licenciamos letras, acordes u obras musicales de terceros: todo el repertorio lo introducen los propios Usuarios.",
        ],
      },
      {
        id: "account",
        heading: "Registro y cuenta",
        blocks: [
          "Para usar la plataforma es necesario crear una cuenta con nombre de usuario, correo electrónico válido y contraseña, o iniciar sesión con Google. La información proporcionada debe ser verdadera y mantenerse actualizada.",
          "La plataforma está destinada a personas de 18 años o más. Los adolescentes de 16 y 17 años solo pueden usarla con el consentimiento y la supervisión de su padre, madre o tutor legal, que responde por la cuenta. No se permite el uso a menores de 16 años.",
          "Cada cuenta es personal e intransferible. No se permite crear cuentas en nombre de otra persona, mantener cuentas para eludir sanciones ni comerciar con cuentas.",
          "El nombre de usuario y la imagen de perfil deben respetar las Normas de la Comunidad. Setlyst puede restablecer los nombres de usuario que las incumplan.",
        ],
      },
      {
        id: "account-security",
        heading: "Seguridad de la cuenta",
        blocks: [
          "Eres responsable de mantener tu contraseña en secreto y de toda la actividad realizada en tu cuenta. Recomendamos activar la verificación en dos pasos en los ajustes de seguridad.",
          `Si sospechas de un acceso no autorizado, cambia la contraseña de inmediato y avísanos en ${SUPPORT_EMAIL}. El equipo de Setlyst nunca te pedirá la contraseña.`,
        ],
      },
      {
        id: "acceptable-use",
        heading: "Uso aceptable",
        blocks: [
          "Al usar la plataforma, te comprometes a no:",
          {
            list: [
              "publicar o compartir contenido ilícito, ofensivo, discriminatorio o que infrinja derechos de terceros;",
              "compartir públicamente obras protegidas sin autorización de sus titulares;",
              "intentar acceder a cuentas, bandas o datos de otras personas sin permiso;",
              "eludir límites de uso, planes, mecanismos de seguridad o sanciones;",
              "sobrecargar la infraestructura, extraer datos de forma automatizada (scraping) o abusar de la API;",
              "distribuir programas maliciosos, spam o enlaces engañosos;",
              "usar la plataforma para acosar, amenazar o suplantar a otra persona.",
            ],
          },
          "Las pruebas de seguridad son bienvenidas solo en las condiciones descritas en la Política de Seguridad.",
        ],
      },
      {
        id: "user-content",
        heading: "Contenido del Usuario y licencia",
        blocks: [
          "El Contenido del Usuario sigue siendo tuyo (o de quien tenga los derechos correspondientes). Setlyst no reclama su propiedad.",
          "Concedes a Setlyst una licencia no exclusiva, gratuita, mundial y limitada al período en que el contenido esté almacenado, solo para alojar, almacenar, reproducir técnicamente, adaptar el formato (por ejemplo, generar un PDF o transponer el tono) y mostrar el contenido a ti, a los miembros de tus bandas y a quien abra los enlaces públicos que crees. Esta licencia existe solo para operar el servicio y termina con la eliminación del contenido, salvo las copias de seguridad conservadas durante el plazo indicado en la Política de Privacidad.",
          "Setlyst no usa tu contenido para publicidad, no lo vende ni lo pone a disposición de terceros más allá de lo necesario para operar la plataforma.",
        ],
      },
      {
        id: "third-party-content",
        heading: "Material protegido de terceros",
        blocks: [
          "Las letras, acordes y arreglos de otros artistas suelen ser obras protegidas por la Ley brasileña 9.610/1998. Al introducir ese material, declaras tener derecho a usarlo o hacerlo con fines de estudio, ensayo e interpretación, y eres el único responsable de ese uso.",
          "Compartir públicamente obras protegidas puede requerir autorización de sus titulares. Los procedimientos de notificación y retirada se describen en la Política de Derechos de Autor.",
        ],
      },
      {
        id: "public-links",
        heading: "Enlaces públicos",
        blocks: [
          "Puedes crear enlaces públicos de setlists y shows. Cualquier persona con el enlace puede ver el contenido compartido, incluidas letras y acordes, sin necesidad de cuenta.",
          "Puedes revocar un enlace en cualquier momento. Las copias o capturas hechas por terceros mientras el enlace estuvo activo quedan fuera del control de Setlyst.",
          "El Equipo puede bloquear enlaces públicos que incumplan estos Términos o derechos de terceros.",
        ],
      },
      {
        id: "bands",
        heading: "Bandas",
        blocks: [
          "Quien crea una banda pasa a ser su propietario. El propietario y los administradores definen los roles y permisos de los miembros, que determinan quién puede editar las canciones, setlists, shows y giras de la banda.",
          "Las canciones, setlists, shows, giras, sugerencias y recordatorios creados dentro de una banda pertenecen al espacio de la banda y están disponibles para todos los miembros según sus permisos. Al añadir contenido a una banda, autorizas a los demás miembros a acceder a él y, según sus permisos, a editarlo.",
          "Cuando un miembro sale o es eliminado, el contenido que añadió a la banda permanece en la banda. Su contenido personal sigue en su cuenta.",
          "El propietario puede transferir la propiedad de la banda a otro miembro y debe hacerlo antes de salir. Si el propietario elimina su cuenta, la propiedad pasa automáticamente al miembro con el rol más alto y más antigüedad; si no hay otros miembros, la banda y su contenido se eliminan.",
        ],
      },
      {
        id: "moderation",
        heading: "Moderación y sanciones",
        blocks: [
          "El Equipo puede revisar contenidos denunciados o detectados por comprobaciones automáticas, especialmente nombres de usuario, imágenes de perfil y logotipos de bandas.",
          "Si se incumplen estos Términos o las Normas de la Comunidad, Setlyst puede, según la gravedad y la reincidencia:",
          {
            list: [
              "retirar el contenido o la imagen;",
              "restablecer el nombre de usuario;",
              "revocar enlaces públicos;",
              "suspender temporalmente la cuenta;",
              "cerrar la cuenta de forma definitiva.",
            ],
          },
          "Siempre que sea posible, se te informará de la medida y su motivo, y podrás impugnarla por el correo de soporte. Toda acción del Equipo queda registrada en una auditoría.",
        ],
      },
      {
        id: "availability",
        heading: "Disponibilidad y período de prelanzamiento",
        blocks: [
          "Setlyst está en período de prelanzamiento. Las funciones pueden crearse, cambiar o retirarse, y los cambios relevantes se anuncian en la página de Novedades o mediante un aviso en la plataforma.",
          "Procuramos mantener la plataforma disponible de forma continua, pero pueden producirse interrupciones por mantenimiento, actualizaciones o causas ajenas a nuestro control. El Modo en vivo y el contenido guardado para uso sin conexión ayudan a reducir el impacto de los fallos de conexión en el escenario; recomendamos mantener también una copia exportada del repertorio esencial.",
        ],
      },
      {
        id: "plans",
        heading: "Planes y suscripción",
        blocks: [
          "Setlyst ofrece los planes Básico, Intermedio y Pro, con los límites y funciones descritos en la página de Planes. Las condiciones de contratación, período de prueba, renovación, cancelación, reembolso, créditos y recomendaciones figuran en los Términos de Suscripción.",
          "Durante el prelanzamiento, mientras el cobro no esté activo, todas las funciones están disponibles sin coste. El inicio del cobro se anunciará con al menos 30 días de antelación.",
        ],
      },
      {
        id: "intellectual-property",
        heading: "Propiedad intelectual de Setlyst",
        blocks: [
          "La marca Setlyst, el logotipo, el diseño de la interfaz y los textos institucionales pertenecen a Setlyst. El código fuente de la plataforma se distribuye bajo la licencia indicada en los repositorios públicos del proyecto; esa licencia no autoriza el uso de la marca.",
        ],
      },
      {
        id: "liability",
        heading: "Limitación de responsabilidad",
        blocks: [
          "Respetando los derechos garantizados por el Código de Defensa del Consumidor de Brasil (Ley 8.078/1990), Setlyst no se responsabiliza por:",
          {
            list: [
              "el Contenido del Usuario, incluida su licitud y la titularidad de derechos de autor;",
              "daños derivados del uso indebido de la cuenta por falta de cuidado con la contraseña;",
              "indisponibilidad causada por fallos de conexión del Usuario, de terceros o por caso fortuito y fuerza mayor;",
              "pérdidas derivadas de contenido eliminado por el propio Usuario tras el plazo de la papelera.",
            ],
          },
          "Nada en estos Términos excluye o limita responsabilidades que no puedan excluirse por ley, en especial la responsabilidad por vicios y defectos del servicio conforme al Código de Defensa del Consumidor.",
        ],
      },
      {
        id: "termination",
        heading: "Terminación",
        blocks: [
          "Puedes eliminar tu cuenta en cualquier momento en Configuración. Antes, recomendamos exportar una copia de seguridad de tu contenido.",
          "La eliminación borra tus datos personales y tu contenido personal, respetando los plazos de conservación obligatoria y de copias de seguridad descritos en la Política de Privacidad. El contenido añadido a bandas permanece en la banda.",
          "Setlyst puede cerrar cuentas que incumplan gravemente estos Términos, con aviso previo siempre que la situación lo permita.",
        ],
      },
      {
        id: "changes",
        heading: "Cambios en estos Términos",
        blocks: [
          "Estos Términos pueden actualizarse. La fecha de vigencia figura al inicio del documento. Los cambios relevantes se comunicarán por correo electrónico o aviso en la plataforma, y el uso continuado requiere aceptar la nueva versión.",
        ],
      },
      {
        id: "law",
        heading: "Ley aplicable y jurisdicción",
        blocks: [
          "Estos Términos se rigen por las leyes de la República Federativa de Brasil, en especial el Código de Defensa del Consumidor, el Marco Civil de Internet (Ley 12.965/2014), la Ley General de Protección de Datos (Ley 13.709/2018), el Decreto 7.962/2013 y la Ley 9.610/1998.",
          "Se elige el fuero de la Comarca de Caxias do Sul, Rio Grande do Sul, Brasil, para resolver las cuestiones relativas a estos Términos, sin perjuicio del derecho del consumidor a demandar en el fuero de su domicilio.",
        ],
      },
      {
        id: "contact",
        heading: "Contacto",
        blocks: [
          `Las dudas, solicitudes y reclamaciones pueden enviarse a ${SUPPORT_EMAIL}. Respondemos en un plazo de 5 días hábiles.`,
        ],
      },
    ],
  },
};
