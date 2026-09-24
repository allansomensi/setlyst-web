/*
 * Termos de Uso do Setlyst.
 *
 * Texto redigido para refletir o funcionamento real da plataforma e a
 * legislação brasileira (CDC, Marco Civil da Internet, LGPD, Lei 9.610/98).
 * Antes da publicação definitiva, este texto deve ser revisado por um
 * advogado. O português (pt-BR) é a versão de referência; en e es são
 * traduções de mesmo conteúdo.
 */

import { controllerIdentity } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/links";
import type { LegalTexts } from "./types";

const who = controllerIdentity("pt-BR");
const whoEn = controllerIdentity("en");
const whoEs = controllerIdentity("es");

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
          "Ao criar uma conta, você declara que leu, entendeu e aceita estes Termos, a Política de Cookies, as Diretrizes da Comunidade e a Política de Direitos Autorais, e que está ciente da Política de Privacidade, que informa como os seus dados pessoais são tratados. Essa declaração é feita na caixa de aceite do cadastro (“Li e aceito os Termos de Uso e estou ciente da Política de Privacidade”), acompanhada da declaração de idade prevista em “Cadastro e conta”, e fica registrada com a versão dos documentos e a data do aceite. O uso da plataforma sem conta, como a abertura de um link público, também está sujeito a estes Termos no que for aplicável. Se você contratar um plano pago, também se aplicam os Termos de Assinatura, aceitos no momento da contratação.",
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
          "A plataforma é destinada a pessoas com 18 anos ou mais. Adolescentes de 16 e 17 anos podem usá-la somente assistidos por pai, mãe ou responsável legal, que deve conhecer e concordar com estes Termos e responde pelos atos praticados na conta (arts. 4º, I, e 1.634, VII, do Código Civil). Não é permitido o uso por menores de 16 anos. A contratação de plano pago é restrita a maiores de 18 anos ou ao responsável legal do adolescente, com meio de pagamento de titularidade deste. Ao criar a conta você declara atender a essas condições; constatada declaração falsa, a conta poderá ser encerrada, com reembolso proporcional de valores pagos por período não usufruído.",
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
        id: "communications",
        heading: "Comunicações eletrônicas",
        blocks: [
          "Você concorda em receber por e-mail as comunicações essenciais sobre a conta, a segurança e a assinatura, que não podem ser desativadas enquanto a conta existir.",
          "As demais comunicações, como novidades e ofertas, dependem da sua autorização e podem ser desativadas em Configurações ou pelo link presente nos próprios e-mails.",
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
          "Ao inserir letras, cifras, arranjos ou qualquer obra, você declara e garante que é o autor ou titular dos direitos, possui autorização dos titulares, que a obra está em domínio público ou que o uso se enquadra nas limitações do art. 46 da Lei 9.610/1998. Você é o único responsável pelo conteúdo que insere e se compromete a ressarcir o Setlyst pelos valores que este venha a ser condenado a pagar, por decisão definitiva, em razão de conteúdo inserido por você em violação a estes Termos, assegurado o seu direito de defesa.",
          "Compartilhar publicamente obras protegidas pode depender de autorização dos titulares. Os procedimentos de notificação e retirada estão descritos na Política de Direitos Autorais.",
          "A autorização para execução pública das obras em apresentações (art. 68 da Lei 9.610/1998) não é concedida pelo Setlyst e cabe a quem promove a apresentação.",
        ],
      },
      {
        id: "public-links",
        heading: "Links públicos de compartilhamento",
        blocks: [
          "Você pode gerar links públicos de setlists e shows. Links públicos exibem apenas a ordem das músicas e informações técnicas (título, artista, tom, andamento e duração), além do título, da descrição e dos links de referência da setlist e, nos shows, do local, da data e da situação, sem letras nem cifras. O PDF que pode ser baixado a partir de um link público também não inclui letras nem cifras. Qualquer pessoa com o link consegue ver esse conteúdo, sem precisar de conta.",
          "Você pode revogar um link a qualquer momento. Cópias ou capturas feitas por terceiros enquanto o link esteve ativo fogem ao controle do Setlyst.",
          "A Equipe pode bloquear links públicos que violem estes Termos ou direitos de terceiros.",
          "Qualquer pessoa pode denunciar um link público pela opção “Denunciar conteúdo” exibida na própria página ou pela página de Contato.",
        ],
      },
      {
        id: "bands",
        heading: "Bandas",
        blocks: [
          "Quem cria uma banda torna-se o seu responsável: a banda conta nos limites do plano dessa pessoa. O responsável e os administradores definem funções e permissões dos integrantes, que determinam quem pode editar músicas, setlists, shows e turnês da banda.",
          "Músicas, setlists, shows, turnês, sugestões e lembretes criados dentro de uma banda pertencem ao espaço da banda e ficam disponíveis a todos os integrantes, de acordo com as permissões. Ao adicionar conteúdo à banda, você autoriza os demais integrantes a acessá-lo e, conforme as permissões, a editá-lo.",
          "Quando um integrante sai ou é removido, o conteúdo que ele adicionou à banda permanece na banda. O conteúdo pessoal desse integrante continua na conta dele.",
          "O responsável pode passar essa função a outro integrante e precisa fazê-lo antes de sair. Se o responsável excluir a conta, a função passa automaticamente ao integrante de função mais alta e mais antigo; se não houver outros integrantes, a banda e o seu conteúdo são excluídos.",
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
        heading: "Disponibilidade e evolução do serviço",
        blocks: [
          "O Setlyst está em constante evolução. Funcionalidades podem ser criadas, alteradas ou descontinuadas, e mudanças relevantes são anunciadas na página de Novidades ou por aviso na plataforma.",
          "Buscamos manter a plataforma disponível de forma contínua, mas podem ocorrer interrupções para manutenção, atualizações ou por fatores fora do nosso controle. O Modo Ao Vivo e o conteúdo salvo para uso offline ajudam a reduzir o impacto de falhas de conexão no palco; recomendamos manter também uma cópia exportada do repertório essencial.",
        ],
      },
      {
        id: "plans",
        heading: "Planos e assinatura",
        blocks: [
          "O Setlyst oferece os planos Básico, Intermediário e Pro, com limites e recursos descritos na página de Planos. As condições de contratação, período de teste, renovação, cancelamento, reembolso, créditos e indicações estão nos Termos de Assinatura.",
          "Toda conta nova começa com um período de teste gratuito do plano Pro. Nenhum valor é cobrado sem a contratação expressa de um plano; se a contratação ocorrer durante o teste, a cobrança começa ao fim do teste, conforme os Termos de Assinatura.",
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
          "Salvo em caso de conteúdo ilícito ou ordem judicial, você terá 30 dias após o encerramento para exportar o seu conteúdo, e os valores pagos por período não usufruído serão reembolsados proporcionalmente quando o encerramento não decorrer de violação destes Termos por você.",
        ],
      },
      {
        id: "changes",
        heading: "Alterações destes Termos",
        blocks: [
          "O Setlyst poderá alterar estes Termos para refletir mudanças legais, técnicas ou do serviço. Alterações relevantes serão comunicadas por e-mail e na plataforma com antecedência mínima de 15 dias da entrada em vigor, acompanhadas de resumo do que mudou; as versões anteriores permanecem disponíveis para consulta. Alterações exigidas por lei, por ordem de autoridade ou para corrigir falha de segurança podem valer de imediato. Se você não concordar com a nova versão, poderá exportar seus dados e encerrar a conta; se tiver plano pago em curso, poderá cancelá-lo com reembolso proporcional ao período não usufruído. Nenhuma alteração modifica o preço ou as condições de um período de assinatura já pago.",
          "A versão vigente, a data de vigência e o histórico de versões, com o resumo de cada alteração, aparecem neste documento.",
        ],
      },
      {
        id: "assignment",
        heading: "Cessão",
        blocks: [
          "O Setlyst poderá ceder a sua posição nestes Termos e nos Termos de Assinatura a pessoa jurídica constituída ou controlada pelo seu atual titular, ou a quem o suceder na exploração da plataforma, mediante aviso com 30 dias de antecedência, mantidas as condições da assinatura em curso; você poderá encerrar a conta, sem ônus, caso não concorde.",
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
          `Dúvidas, solicitações e reclamações podem ser enviadas para ${SUPPORT_EMAIL}. A página de Contato reúne também os canais de privacidade e de direitos autorais. Respondemos em até 5 dias úteis.`,
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
          "When you create an account, you declare that you have read, understood and accept these Terms, the Cookie Policy, the Community Guidelines and the Copyright Policy, and that you are aware of the Privacy Policy, which explains how your personal data is processed. This declaration is made in the acceptance box at sign-up (“I have read and accept the Terms of Use and I am aware of the Privacy Policy”), together with the age declaration described in “Registration and account”, and is recorded with the version of the documents and the date of acceptance. Using the platform without an account, such as opening a public link, is also subject to these Terms where applicable. If you subscribe to a paid plan, the Subscription Terms, accepted when you subscribe, also apply.",
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
          "The platform is intended for people aged 18 or over. Teenagers aged 16 and 17 may use it only when assisted by a parent or legal guardian, who must know and agree to these Terms and is responsible for the acts performed on the account (articles 4, I, and 1,634, VII, of the Brazilian Civil Code). Use by anyone under 16 is not allowed. Subscribing to a paid plan is restricted to people aged 18 or over or to the teenager's legal guardian, using a payment method held by the guardian. By creating the account you declare that you meet these conditions; if the declaration is found to be false, the account may be closed, with a pro-rata refund of amounts paid for any period not used.",
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
        id: "communications",
        heading: "Electronic communications",
        blocks: [
          "You agree to receive by e-mail the essential communications about your account, security and subscription, which cannot be turned off while the account exists.",
          "Other communications, such as product news and offers, depend on your authorisation and can be turned off in Settings or through the link in the e-mails themselves.",
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
          "By entering lyrics, chords, arrangements or any other work, you declare and warrant that you are the author or rights holder, that you have the rights holders' authorisation, that the work is in the public domain or that the use falls within the limitations of article 46 of Brazilian Law 9,610/1998. You are solely responsible for the content you enter and agree to reimburse Setlyst for any amounts it is ordered to pay, by a final decision, because of content you entered in breach of these Terms, with your right of defence assured.",
          "Sharing protected works publicly may require the rights holders' authorisation. The notice and takedown procedures are described in the Copyright Policy.",
          "Authorisation for the public performance of works at shows (article 68 of Law 9,610/1998) is not granted by Setlyst and is the responsibility of whoever promotes the performance.",
        ],
      },
      {
        id: "public-links",
        heading: "Public sharing links",
        blocks: [
          "You can create public links to setlists and gigs. Public links show only the running order and technical information (title, artist, key, tempo and duration), plus the setlist's title, description and reference links and, for gigs, the venue, date and status, without lyrics or chords. The PDF that can be downloaded from a public link does not include lyrics or chords either. Anyone with the link can see this content without an account.",
          "You can revoke a link at any time. Copies or screenshots taken by others while the link was active are outside Setlyst's control.",
          "Staff may block public links that break these Terms or infringe the rights of others.",
          "Anyone can report a public link through the “Report content” option shown on the page itself or through the Contact page.",
        ],
      },
      {
        id: "bands",
        heading: "Bands",
        blocks: [
          "Whoever creates a band becomes its lead: the band counts towards that person's plan limits. The lead and administrators set the members' roles and permissions, which determine who can edit the band's songs, setlists, gigs and tours.",
          "Songs, setlists, gigs, tours, suggestions and reminders created within a band belong to the band's space and are available to all members according to their permissions. By adding content to a band, you allow the other members to access it and, depending on their permissions, to edit it.",
          "When a member leaves or is removed, the content they added to the band stays with the band. That member's personal content remains in their account.",
          "The lead can hand that role to another member and must do so before leaving. If the lead deletes their account, the role passes automatically to the member with the highest role and longest membership; if there are no other members, the band and its content are deleted.",
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
        heading: "Availability and changes to the service",
        blocks: [
          "Setlyst is constantly evolving. Features may be added, changed or discontinued, and relevant changes are announced on the What's new page or by a notice in the platform.",
          "We aim to keep the platform continuously available, but interruptions may occur for maintenance, updates or reasons beyond our control. Live Mode and content saved for offline use help reduce the impact of connection failures on stage; we also recommend keeping an exported copy of your essential repertoire.",
        ],
      },
      {
        id: "plans",
        heading: "Plans and subscription",
        blocks: [
          "Setlyst offers the Basic, Intermediate and Pro plans, with the limits and features described on the Plans page. The conditions for subscribing, the trial period, renewal, cancellation, refunds, credits and referrals are set out in the Subscription Terms.",
          "Every new account starts with a free trial of the Pro plan. Nothing is charged without your express subscription to a plan; if you subscribe during the trial, billing starts when the trial ends, as set out in the Subscription Terms.",
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
          "Except in cases of unlawful content or a court order, you will have 30 days after the closure to export your content, and amounts paid for any period not used will be refunded pro rata when the closure does not result from your breach of these Terms.",
        ],
      },
      {
        id: "changes",
        heading: "Changes to these Terms",
        blocks: [
          "Setlyst may change these Terms to reflect legal, technical or service changes. Relevant changes will be communicated by e-mail and in the platform at least 15 days before they take effect, together with a summary of what changed; previous versions remain available for consultation. Changes required by law, by an order of an authority or to fix a security flaw may take effect immediately. If you do not agree with the new version, you may export your data and close your account; if you have a paid plan in progress, you may cancel it with a pro-rata refund for the period not used. No change alters the price or conditions of a subscription period already paid.",
          "The version in force, its effective date and the version history, with a summary of each change, are shown in this document.",
        ],
      },
      {
        id: "assignment",
        heading: "Assignment",
        blocks: [
          "Setlyst may assign its position under these Terms and the Subscription Terms to a legal entity incorporated or controlled by its current holder, or to whoever succeeds it in operating the platform, with 30 days' notice, keeping the conditions of any subscription in progress; if you do not agree, you may close your account at no cost.",
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
          `Questions, requests and complaints can be sent to ${SUPPORT_EMAIL}. The Contact page also lists the privacy and copyright channels. We reply within 5 business days.`,
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
          "Al crear una cuenta, declaras haber leído, entendido y aceptado estos Términos, la Política de Cookies, las Normas de la Comunidad y la Política de Derechos de Autor, y que conoces la Política de Privacidad, que explica cómo se tratan tus datos personales. Esta declaración se hace en la casilla de aceptación del registro (“He leído y acepto los Términos de Uso y conozco la Política de Privacidad”), junto con la declaración de edad prevista en “Registro y cuenta”, y queda registrada con la versión de los documentos y la fecha de aceptación. El uso de la plataforma sin cuenta, como abrir un enlace público, también está sujeto a estos Términos en lo que corresponda. Si contratas un plan de pago, también se aplican los Términos de Suscripción, aceptados en el momento de la contratación.",
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
          "La plataforma está destinada a personas de 18 años o más. Los adolescentes de 16 y 17 años solo pueden usarla asistidos por su padre, madre o tutor legal, que debe conocer y aceptar estos Términos y responde por los actos realizados en la cuenta (arts. 4, I, y 1.634, VII, del Código Civil brasileño). No se permite el uso a menores de 16 años. La contratación de un plan de pago está restringida a mayores de 18 años o al tutor legal del adolescente, con un medio de pago del que este sea titular. Al crear la cuenta declaras cumplir estas condiciones; si se comprueba que la declaración es falsa, la cuenta podrá cerrarse, con reembolso proporcional de los importes pagados por el período no disfrutado.",
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
        id: "communications",
        heading: "Comunicaciones electrónicas",
        blocks: [
          "Aceptas recibir por correo electrónico las comunicaciones esenciales sobre la cuenta, la seguridad y la suscripción, que no pueden desactivarse mientras la cuenta exista.",
          "Las demás comunicaciones, como novedades y ofertas, dependen de tu autorización y pueden desactivarse en Configuración o mediante el enlace incluido en los propios correos.",
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
          "Al introducir letras, acordes, arreglos o cualquier obra, declaras y garantizas que eres el autor o titular de los derechos, que tienes autorización de los titulares, que la obra es de dominio público o que el uso se ajusta a las limitaciones del artículo 46 de la Ley brasileña 9.610/1998. Eres el único responsable del contenido que introduces y te comprometes a resarcir a Setlyst por los importes que se le condene a pagar, por decisión firme, a causa de contenido introducido por ti en infracción de estos Términos, con tu derecho de defensa garantizado.",
          "Compartir públicamente obras protegidas puede requerir autorización de sus titulares. Los procedimientos de notificación y retirada se describen en la Política de Derechos de Autor.",
          "La autorización para la ejecución pública de las obras en presentaciones (artículo 68 de la Ley 9.610/1998) no la concede Setlyst y corresponde a quien promueve la presentación.",
        ],
      },
      {
        id: "public-links",
        heading: "Enlaces públicos",
        blocks: [
          "Puedes crear enlaces públicos de setlists y shows. Los enlaces públicos muestran solo el orden de las canciones e información técnica (título, artista, tono, tempo y duración), además del título, la descripción y los enlaces de referencia de la setlist y, en los shows, el lugar, la fecha y el estado, sin letras ni acordes. El PDF que puede descargarse desde un enlace público tampoco incluye letras ni acordes. Cualquier persona con el enlace puede ver este contenido sin necesidad de cuenta.",
          "Puedes revocar un enlace en cualquier momento. Las copias o capturas hechas por terceros mientras el enlace estuvo activo quedan fuera del control de Setlyst.",
          "El Equipo puede bloquear enlaces públicos que incumplan estos Términos o derechos de terceros.",
          "Cualquier persona puede denunciar un enlace público mediante la opción “Denunciar contenido” que aparece en la propia página o en la página de Contacto.",
        ],
      },
      {
        id: "bands",
        heading: "Bandas",
        blocks: [
          "Quien crea una banda pasa a ser su responsable: la banda cuenta en los límites del plan de esa persona. El responsable y los administradores definen los roles y permisos de los miembros, que determinan quién puede editar las canciones, setlists, shows y giras de la banda.",
          "Las canciones, setlists, shows, giras, sugerencias y recordatorios creados dentro de una banda pertenecen al espacio de la banda y están disponibles para todos los miembros según sus permisos. Al añadir contenido a una banda, autorizas a los demás miembros a acceder a él y, según sus permisos, a editarlo.",
          "Cuando un miembro sale o es eliminado, el contenido que añadió a la banda permanece en la banda. Su contenido personal sigue en su cuenta.",
          "El responsable puede pasar esa función a otro miembro y debe hacerlo antes de salir. Si el responsable elimina su cuenta, la función pasa automáticamente al miembro con el rol más alto y más antigüedad; si no hay otros miembros, la banda y su contenido se eliminan.",
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
        heading: "Disponibilidad y evolución del servicio",
        blocks: [
          "Setlyst está en constante evolución. Las funciones pueden crearse, cambiar o retirarse, y los cambios relevantes se anuncian en la página de Novedades o mediante un aviso en la plataforma.",
          "Procuramos mantener la plataforma disponible de forma continua, pero pueden producirse interrupciones por mantenimiento, actualizaciones o causas ajenas a nuestro control. El Modo en vivo y el contenido guardado para uso sin conexión ayudan a reducir el impacto de los fallos de conexión en el escenario; recomendamos mantener también una copia exportada del repertorio esencial.",
        ],
      },
      {
        id: "plans",
        heading: "Planes y suscripción",
        blocks: [
          "Setlyst ofrece los planes Básico, Intermedio y Pro, con los límites y funciones descritos en la página de Planes. Las condiciones de contratación, período de prueba, renovación, cancelación, reembolso, créditos y recomendaciones figuran en los Términos de Suscripción.",
          "Toda cuenta nueva empieza con un período de prueba gratuito del plan Pro. No se cobra ningún importe sin la contratación expresa de un plan; si la contratación se hace durante la prueba, el cobro empieza al final de la prueba, conforme a los Términos de Suscripción.",
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
          "Salvo en caso de contenido ilícito u orden judicial, tendrás 30 días tras el cierre para exportar tu contenido, y los importes pagados por el período no disfrutado se reembolsarán proporcionalmente cuando el cierre no se deba a un incumplimiento de estos Términos por tu parte.",
        ],
      },
      {
        id: "changes",
        heading: "Cambios en estos Términos",
        blocks: [
          "Setlyst podrá modificar estos Términos para reflejar cambios legales, técnicos o del servicio. Los cambios relevantes se comunicarán por correo electrónico y en la plataforma con al menos 15 días de antelación a su entrada en vigor, junto con un resumen de lo que cambió; las versiones anteriores siguen disponibles para consulta. Los cambios exigidos por ley, por orden de una autoridad o para corregir un fallo de seguridad pueden aplicarse de inmediato. Si no estás de acuerdo con la nueva versión, podrás exportar tus datos y cerrar la cuenta; si tienes un plan de pago en curso, podrás cancelarlo con reembolso proporcional al período no disfrutado. Ningún cambio modifica el precio ni las condiciones de un período de suscripción ya pagado.",
          "La versión vigente, su fecha de vigencia y el historial de versiones, con el resumen de cada cambio, figuran en este documento.",
        ],
      },
      {
        id: "assignment",
        heading: "Cesión",
        blocks: [
          "Setlyst podrá ceder su posición en estos Términos y en los Términos de Suscripción a una persona jurídica constituida o controlada por su actual titular, o a quien le suceda en la explotación de la plataforma, con aviso previo de 30 días y manteniendo las condiciones de la suscripción en curso; si no estás de acuerdo, podrás cerrar la cuenta sin coste.",
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
          `Las dudas, solicitudes y reclamaciones pueden enviarse a ${SUPPORT_EMAIL}. La página de Contacto reúne también los canales de privacidad y de derechos de autor. Respondemos en un plazo de 5 días hábiles.`,
        ],
      },
    ],
  },
};
