/*
 * Política de Privacidade do Setlyst (LGPD, Lei 13.709/2018).
 *
 * Descreve os dados que a plataforma realmente trata (ver API: users,
 * user_preferences, audit_log, email_outbox, verification_codes, trash) e
 * os operadores efetivamente usados (hoje: Render, Neon, Vercel, Stripe,
 * provedor de e-mail, Google). Sempre que um novo operador, dado ou
 * finalidade for adicionado ao produto, este texto e `LEGAL_VERSION`
 * precisam ser atualizados. Deve ser revisado por um advogado antes da
 * publicação definitiva.
 */

import { PRIVACY_EMAIL, controllerIdentity } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/links";
import type { LegalTexts } from "./types";

const dpo = PRIVACY_EMAIL;

export const PRIVACY: LegalTexts = {
  "pt-BR": {
    title: "Política de Privacidade",
    summary:
      "Quais dados pessoais o Setlyst trata, por que, com quem compartilha, por quanto tempo guarda e como você exerce seus direitos pela LGPD.",
    sections: [
      {
        id: "controller",
        heading: "Controlador",
        blocks: [
          `O controlador dos dados pessoais tratados no Setlyst é ${controllerIdentity("pt-BR")}.`,
          `Esta Política explica como tratamos dados pessoais conforme a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018, “LGPD”) e o Marco Civil da Internet (Lei 12.965/2014). Dúvidas podem ser enviadas ao nosso Encarregado pelo e-mail ${dpo}.`,
        ],
      },
      {
        id: "data",
        heading: "Dados que coletamos",
        blocks: [
          "Tratamos somente os dados necessários para oferecer o serviço:",
          {
            list: [
              "Dados de cadastro: nome de usuário, e-mail, nome e sobrenome (opcionais), senha (armazenada apenas como hash), idioma, data de criação da conta, versão dos termos aceita e data do aceite, código de indicação e, se houver, a conta que indicou você.",
              "Dados de perfil: biografia, localização, instrumentos e o endereço (URL) da imagem de perfil que você informar. Não armazenamos o arquivo da imagem, apenas o endereço.",
              "Login com Google: identificador da conta Google, e-mail e nome, recebidos do Google quando você escolhe essa forma de acesso.",
              "Conteúdo: músicas, letras, cifras, anotações, setlists, shows, turnês, bandas, sugestões, votos, lembretes e links que você cadastra.",
              "Dados de uso e segurança: endereço IP, data e hora de acesso, tentativas de login, eventos de segurança (troca de senha, ativação da verificação em duas etapas) e registros de auditoria de ações administrativas.",
              "Preferências: tema, idioma, configurações do Modo Ao Vivo e da interface, preferências de comunicação e itens fixados.",
              "Comunicações: e-mails enviados a você (verificação, segurança, avisos), notificações e mensagens que você nos envia pelo suporte.",
              "Dados de assinatura e pagamento: plano, periodicidade, situação da assinatura, créditos, códigos promocionais resgatados, indicações e, para cada pagamento, valor, data, plano e eventuais reembolsos, além dos identificadores de cliente, assinatura e fatura no Stripe. Os dados do cartão são informados diretamente na página de pagamento do Stripe: o Setlyst nunca recebe nem armazena o número do cartão.",
            ],
          },
          "Dados salvos para uso offline ficam no armazenamento do seu próprio navegador e são apagados ao sair da conta.",
        ],
      },
      {
        id: "purposes",
        heading: "Finalidades e bases legais",
        blocks: [
          "Tratamos dados pessoais para as finalidades abaixo, com as respectivas bases legais do art. 7º da LGPD:",
          {
            list: [
              "Criar e manter a conta, autenticar você, prestar o serviço contratado, sincronizar bandas e gerar exportações: execução de contrato (art. 7º, V).",
              "Guardar registros de acesso pelo prazo de 6 meses: cumprimento de obrigação legal (art. 7º, II, e art. 15 do Marco Civil da Internet).",
              "Prevenir fraudes e abusos, limitar tentativas de acesso, moderar nomes de usuário e imagens de perfil, garantir a segurança da plataforma e melhorar o serviço com estatísticas agregadas: legítimo interesse (art. 7º, IX), sempre respeitando seus direitos e expectativas.",
              "Enviar e-mails de novidades do produto e ofertas: consentimento (art. 7º, I), que você pode retirar a qualquer momento.",
              "Enviar comunicações de segurança e avisos essenciais sobre a conta: execução de contrato e legítimo interesse.",
              "Processar a assinatura e os pagamentos: execução de contrato (art. 7º, V). Guardar os registros de pagamento para cumprir obrigações fiscais e contábeis: obrigação legal (art. 7º, II).",
              "Defender direitos em processos judiciais, administrativos ou arbitrais: exercício regular de direitos (art. 7º, VI).",
            ],
          },
          "Verificações automáticas de nomes de usuário e imagens apenas sinalizam casos para análise. Qualquer medida de moderação é decidida por uma pessoa da Equipe, e você pode pedir a revisão de decisões tomadas com base em tratamento automatizado (art. 20 da LGPD).",
        ],
      },
      {
        id: "sharing",
        heading: "Compartilhamento e operadores",
        blocks: [
          "Não vendemos dados pessoais. Compartilhamos dados apenas com operadores que nos ajudam a prestar o serviço, sob contrato e dentro das nossas instruções:",
          {
            list: [
              "Render Services, Inc. (hospedagem da API) e Neon (banco de dados PostgreSQL gerenciado): armazenam e processam todos os dados da plataforma.",
              "Vercel Inc.: hospeda o site e o aplicativo web e fornece o Vercel Web Analytics, que mede visitas de forma agregada e sem cookies.",
              "Provedor de envio de e-mails: entrega e-mails transacionais e comunicações que você autorizou.",
              "Google LLC: autenticação, quando você usa o login com Google.",
              "Google Cloud Vision (opcional): pode receber o endereço da imagem de perfil ou do logotipo de banda para classificar conteúdo impróprio, quando esse recurso estiver ativado.",
              "Stripe (Stripe, Inc. e empresas do seu grupo): processa os pagamentos das assinaturas. Recebe o seu e-mail, nome de usuário e os dados de pagamento que você informar na página de pagamento do Stripe, e os trata também como controlador independente para prevenção a fraudes e cumprimento das suas próprias obrigações legais, conforme a política de privacidade do Stripe.",
            ],
          },
          "Também há compartilhamento decorrente do uso que você faz da plataforma: integrantes das suas bandas veem o conteúdo da banda e seu nome de usuário, e quem abre um link público vê o conteúdo compartilhado, sem dados pessoais seus.",
          "Podemos fornecer dados a autoridades quando houver obrigação legal ou ordem judicial, nos limites da lei.",
        ],
      },
      {
        id: "international",
        heading: "Transferência internacional",
        blocks: [
          "Os operadores Render, Neon, Vercel, Stripe e Google mantêm servidores fora do Brasil, principalmente nos Estados Unidos. Essas transferências são feitas com base no art. 33 da LGPD, por meio de cláusulas contratuais que asseguram nível de proteção compatível com a lei brasileira, conforme a regulamentação da Autoridade Nacional de Proteção de Dados (ANPD).",
        ],
      },
      {
        id: "retention",
        heading: "Por quanto tempo guardamos",
        blocks: [
          "Os prazos de retenção são:",
          {
            list: [
              "Dados de cadastro, perfil, preferências e conteúdo: enquanto a conta existir. Após a exclusão da conta, são apagados, ressalvados os casos abaixo.",
              "Registros de acesso (IP, data e hora): 6 meses, conforme o art. 15 do Marco Civil da Internet. A exceção é o IP usado na criação da conta, mantido enquanto a conta existir para prevenir fraudes no programa de indicação (legítimo interesse).",
              "Registros de auditoria de ações administrativas e de segurança: pelo tempo necessário à apuração de incidentes e à defesa de direitos, limitado a 5 anos.",
              "Itens na lixeira: 30 dias; depois são excluídos definitivamente.",
              "E-mails na fila de envio: o conteúdo de e-mails sensíveis (como códigos) é apagado após o envio, e os registros de envio são removidos após 30 dias.",
              "Códigos de verificação: expiram em 15 minutos e são apagados diariamente.",
              "Cópias de segurança do banco de dados: até 30 dias, em rotação; dados excluídos deixam de existir nas cópias ao fim desse período.",
              "Registros de pagamento (valor, data, plano e identificadores do Stripe): pelo prazo exigido pela legislação tributária, em regra 5 anos. Com a exclusão da conta, deixam de ter vínculo com ela, e o cadastro de cliente no Stripe é excluído.",
            ],
          },
        ],
      },
      {
        id: "rights",
        heading: "Seus direitos",
        blocks: [
          "Nos termos do art. 18 da LGPD, você pode solicitar:",
          {
            list: [
              "confirmação da existência de tratamento;",
              "acesso aos dados;",
              "correção de dados incompletos, inexatos ou desatualizados;",
              "anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;",
              "portabilidade dos dados a outro fornecedor;",
              "eliminação dos dados tratados com base no consentimento;",
              "informação sobre as entidades com as quais compartilhamos dados;",
              "informação sobre a possibilidade de não fornecer consentimento e suas consequências;",
              "revogação do consentimento;",
              "revisão de decisões tomadas unicamente com base em tratamento automatizado.",
            ],
          },
          "Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).",
        ],
      },
      {
        id: "exercise",
        heading: "Como exercer seus direitos",
        blocks: [
          "Muitos direitos podem ser exercidos diretamente na plataforma:",
          {
            list: [
              "Acesso e correção: em Meu perfil e em Configurações.",
              "Acesso e portabilidade: em Configurações, na seção Dados, baixe o backup do seu conteúdo e o arquivo com todos os seus dados pessoais (perfil, preferências, consentimentos, assinatura, pagamentos e registro de segurança).",
              "Consentimento para e-mails: ajuste as preferências em Configurações, na seção Comunicações, ou use o link de descadastro presente nos e-mails.",
              "Eliminação: exclua a sua conta em Configurações.",
            ],
          },
          `Para os demais pedidos, escreva para ${dpo} usando o e-mail cadastrado na conta. Podemos pedir informações adicionais para confirmar a sua identidade. Respondemos em até 15 dias.`,
        ],
      },
      {
        id: "dpo",
        heading: "Encarregado pelo tratamento de dados",
        blocks: [
          `O Encarregado (DPO) é o canal de comunicação entre você, o Setlyst e a ANPD. Contato: ${dpo}.`,
        ],
      },
      {
        id: "security",
        heading: "Segurança dos dados",
        blocks: [
          "Adotamos medidas técnicas e administrativas para proteger os dados pessoais, conforme o art. 46 da LGPD, entre elas:",
          {
            list: [
              "criptografia em trânsito (HTTPS/TLS) em todas as conexões;",
              "senhas armazenadas somente como hash Argon2;",
              "verificação em duas etapas (TOTP) opcional, com segredos criptografados em repouso (AES-256-GCM) e códigos de recuperação armazenados como hash;",
              "códigos de verificação por e-mail armazenados como HMAC e com número limitado de tentativas;",
              "limitação de tentativas de login e bloqueio temporário da conta;",
              "controle de acesso por funções, princípio do menor privilégio e registro de auditoria das ações da Equipe;",
              "imagens de perfil carregadas por meio do nosso servidor, com validação, para não expor o seu IP a sites de terceiros.",
            ],
          },
          "Nenhum sistema é totalmente imune a falhas. Por isso, recomendamos senha forte e verificação em duas etapas.",
        ],
      },
      {
        id: "incidents",
        heading: "Incidentes de segurança",
        blocks: [
          "Se ocorrer um incidente de segurança que possa acarretar risco ou dano relevante, comunicaremos a ANPD e os titulares afetados no prazo e na forma da regulamentação, conforme o art. 48 da LGPD, informando a natureza dos dados afetados, os riscos envolvidos e as medidas adotadas.",
        ],
      },
      {
        id: "minors",
        heading: "Crianças e adolescentes",
        blocks: [
          "O Setlyst é destinado a pessoas com 18 anos ou mais. Adolescentes de 16 e 17 anos podem usar a plataforma somente com o consentimento de pai, mãe ou responsável legal, observado o melhor interesse do adolescente (art. 14 da LGPD).",
          "A plataforma não se destina a menores de 16 anos. Se identificarmos uma conta de pessoa com menos de 16 anos, ou sem o consentimento exigido, a conta poderá ser encerrada e os dados eliminados.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          "Usamos apenas cookies estritamente necessários (sessão, proteção contra falsificação de requisições e idioma) e de preferência (tema). Não usamos cookies de publicidade. Detalhes na Política de Cookies.",
        ],
      },
      {
        id: "changes",
        heading: "Atualizações desta Política",
        blocks: [
          `Esta Política pode ser atualizada para refletir mudanças no serviço ou na legislação. A data de vigência aparece no topo do documento, e mudanças relevantes serão comunicadas por e-mail ou aviso na plataforma. Dúvidas gerais: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },

  en: {
    title: "Privacy Policy",
    summary:
      "What personal data Setlyst processes, why, who it is shared with, how long it is kept and how you exercise your rights under the LGPD.",
    sections: [
      {
        id: "controller",
        heading: "Controller",
        blocks: [
          `The controller of the personal data processed in Setlyst is ${controllerIdentity("en")}.`,
          `This Policy explains how we process personal data under the Brazilian General Data Protection Law (Law 13,709/2018, “LGPD”) and the Brazilian Civil Rights Framework for the Internet (Law 12,965/2014). Questions can be sent to our Data Protection Officer at ${dpo}.`,
        ],
      },
      {
        id: "data",
        heading: "Data we collect",
        blocks: [
          "We only process the data needed to provide the service:",
          {
            list: [
              "Registration data: username, e-mail address, first and last name (optional), password (stored only as a hash), language, account creation date, accepted terms version and acceptance date, referral code and, if any, the account that referred you.",
              "Profile data: bio, location, instruments and the address (URL) of the profile picture you provide. We do not store the image file, only its address.",
              "Sign in with Google: Google account identifier, e-mail address and name, received from Google when you choose that sign-in method.",
              "Content: songs, lyrics, chords, notes, setlists, gigs, tours, bands, suggestions, votes, reminders and links you add.",
              "Usage and security data: IP address, date and time of access, sign-in attempts, security events (password change, two-step verification turned on) and audit records of administrative actions.",
              "Preferences: theme, language, Live Mode and interface settings, communication preferences and pinned items.",
              "Communications: e-mails sent to you (verification, security, notices), notifications and messages you send to support.",
              "Subscription and payment data: plan, billing period, subscription status, credits, redeemed promo codes, referrals and, for each payment, the amount, date, plan and any refunds, plus the customer, subscription and invoice identifiers at Stripe. Card details are entered directly on Stripe's payment page: Setlyst never receives or stores card numbers.",
            ],
          },
          "Data saved for offline use stays in your own browser's storage and is erased when you sign out.",
        ],
      },
      {
        id: "purposes",
        heading: "Purposes and legal bases",
        blocks: [
          "We process personal data for the purposes below, with the corresponding legal bases of article 7 of the LGPD:",
          {
            list: [
              "Creating and maintaining the account, authenticating you, providing the contracted service, syncing bands and generating exports: performance of a contract (art. 7, V).",
              "Keeping access records for 6 months: compliance with a legal obligation (art. 7, II, and art. 15 of the Civil Rights Framework for the Internet).",
              "Preventing fraud and abuse, limiting sign-in attempts, moderating usernames and profile pictures, keeping the platform secure and improving the service with aggregated statistics: legitimate interest (art. 7, IX), always respecting your rights and expectations.",
              "Sending product news and offers by e-mail: consent (art. 7, I), which you can withdraw at any time.",
              "Sending security communications and essential account notices: performance of a contract and legitimate interest.",
              "Processing the subscription and payments: performance of a contract (art. 7, V). Keeping payment records to meet tax and accounting obligations: legal obligation (art. 7, II).",
              "Defending rights in judicial, administrative or arbitration proceedings: regular exercise of rights (art. 7, VI).",
            ],
          },
          "Automatic checks of usernames and images only flag cases for review. Any moderation measure is decided by a member of Staff, and you may ask for a review of decisions based on automated processing (art. 20 of the LGPD).",
        ],
      },
      {
        id: "sharing",
        heading: "Sharing and processors",
        blocks: [
          "We do not sell personal data. We share data only with processors that help us provide the service, under contract and following our instructions:",
          {
            list: [
              "Render Services, Inc. (API hosting) and Neon (managed PostgreSQL database): store and process all platform data.",
              "Vercel Inc.: hosts the website and web app and provides Vercel Web Analytics, which measures visits in aggregate and without cookies.",
              "E-mail delivery provider: delivers transactional e-mails and the communications you have authorised.",
              "Google LLC: authentication, when you use Sign in with Google.",
              "Google Cloud Vision (optional): may receive the address of a profile picture or band logo to classify inappropriate content, when this feature is enabled.",
              "Stripe (Stripe, Inc. and its group companies): processes subscription payments. It receives your e-mail address, username and the payment details you enter on Stripe's payment page, and also processes them as an independent controller for fraud prevention and its own legal obligations, under Stripe's privacy policy.",
            ],
          },
          "Data is also shared as a result of how you use the platform: members of your bands see the band's content and your username, and anyone who opens a public link sees the shared content, without your personal data.",
          "We may provide data to authorities when required by law or court order, within legal limits.",
        ],
      },
      {
        id: "international",
        heading: "International transfer",
        blocks: [
          "The processors Render, Neon, Vercel, Stripe and Google keep servers outside Brazil, mainly in the United States. These transfers are based on article 33 of the LGPD, through contractual clauses that ensure a level of protection compatible with Brazilian law, as regulated by the National Data Protection Authority (ANPD).",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep data",
        blocks: [
          "Retention periods are:",
          {
            list: [
              "Registration, profile, preference and content data: while the account exists. After the account is deleted, they are erased, except as described below.",
              "Access records (IP, date and time): 6 months, under article 15 of the Civil Rights Framework for the Internet. The exception is the IP address used to create the account, kept while the account exists to prevent referral program fraud (legitimate interest).",
              "Audit records of administrative and security actions: for as long as needed to investigate incidents and defend rights, up to 5 years.",
              "Items in the trash: 30 days; after that they are permanently deleted.",
              "E-mails in the delivery queue: the content of sensitive e-mails (such as codes) is erased after sending, and delivery records are removed after 30 days.",
              "Verification codes: expire in 15 minutes and are erased daily.",
              "Database backups: up to 30 days, on rotation; deleted data disappears from backups at the end of that period.",
              "Payment records (amount, date, plan and Stripe identifiers): for the period required by tax law, usually 5 years. When the account is deleted they are no longer linked to it, and the customer record at Stripe is deleted.",
            ],
          },
        ],
      },
      {
        id: "rights",
        heading: "Your rights",
        blocks: [
          "Under article 18 of the LGPD, you may request:",
          {
            list: [
              "confirmation that processing takes place;",
              "access to the data;",
              "correction of incomplete, inaccurate or outdated data;",
              "anonymisation, blocking or deletion of unnecessary or excessive data, or data processed in breach of the LGPD;",
              "portability of the data to another provider;",
              "deletion of data processed on the basis of consent;",
              "information about the entities we share data with;",
              "information about the possibility of not giving consent and its consequences;",
              "withdrawal of consent;",
              "review of decisions based solely on automated processing.",
            ],
          },
          "You may also lodge a complaint with the National Data Protection Authority (ANPD).",
        ],
      },
      {
        id: "exercise",
        heading: "How to exercise your rights",
        blocks: [
          "Many rights can be exercised directly in the platform:",
          {
            list: [
              "Access and correction: in My account and in Settings.",
              "Access and portability: in Settings, in the Data section, download the backup of your content and the file with all your personal data (profile, preferences, consents, subscription, payments and security log).",
              "Consent to e-mails: adjust your preferences in Settings, in the Communications section, or use the unsubscribe link in the e-mails.",
              "Deletion: delete your account in Settings.",
            ],
          },
          `For other requests, write to ${dpo} from the e-mail address registered on your account. We may ask for additional information to confirm your identity. We reply within 15 days.`,
        ],
      },
      {
        id: "dpo",
        heading: "Data Protection Officer",
        blocks: [
          `The Data Protection Officer (Encarregado) is the communication channel between you, Setlyst and the ANPD. Contact: ${dpo}.`,
        ],
      },
      {
        id: "security",
        heading: "Data security",
        blocks: [
          "We adopt technical and administrative measures to protect personal data, as required by article 46 of the LGPD, including:",
          {
            list: [
              "encryption in transit (HTTPS/TLS) on every connection;",
              "passwords stored only as Argon2 hashes;",
              "optional two-step verification (TOTP), with secrets encrypted at rest (AES-256-GCM) and recovery codes stored as hashes;",
              "e-mail verification codes stored as HMAC with a limited number of attempts;",
              "sign-in attempt limits and temporary account lockout;",
              "role-based access control, least privilege and an audit log of Staff actions;",
              "profile pictures loaded through our server, with validation, so your IP address is not exposed to third-party sites.",
            ],
          },
          "No system is completely immune to failure. That is why we recommend a strong password and two-step verification.",
        ],
      },
      {
        id: "incidents",
        heading: "Security incidents",
        blocks: [
          "If a security incident occurs that may cause relevant risk or harm, we will notify the ANPD and the affected data subjects within the time and in the manner set by regulation, under article 48 of the LGPD, stating the nature of the affected data, the risks involved and the measures taken.",
        ],
      },
      {
        id: "minors",
        heading: "Children and teenagers",
        blocks: [
          "Setlyst is intended for people aged 18 or over. Teenagers aged 16 and 17 may use the platform only with the consent of a parent or legal guardian, in the teenager's best interest (article 14 of the LGPD).",
          "The platform is not intended for anyone under 16. If we identify an account belonging to someone under 16, or without the required consent, the account may be closed and the data deleted.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          "We only use strictly necessary cookies (session, protection against cross-site request forgery and language) and preference cookies (theme). We do not use advertising cookies. Details in the Cookie Policy.",
        ],
      },
      {
        id: "changes",
        heading: "Updates to this Policy",
        blocks: [
          `This Policy may be updated to reflect changes in the service or the law. The effective date is shown at the top of the document, and relevant changes will be communicated by e-mail or a notice in the platform. General questions: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },

  es: {
    title: "Política de Privacidad",
    summary:
      "Qué datos personales trata Setlyst, para qué, con quién los comparte, cuánto tiempo los conserva y cómo ejerces tus derechos según la LGPD.",
    sections: [
      {
        id: "controller",
        heading: "Responsable del tratamiento",
        blocks: [
          `El responsable de los datos personales tratados en Setlyst es ${controllerIdentity("es")}.`,
          `Esta Política explica cómo tratamos los datos personales conforme a la Ley General de Protección de Datos de Brasil (Ley 13.709/2018, “LGPD”) y el Marco Civil de Internet (Ley 12.965/2014). Las dudas pueden enviarse a nuestro Encargado de protección de datos en ${dpo}.`,
        ],
      },
      {
        id: "data",
        heading: "Datos que recopilamos",
        blocks: [
          "Solo tratamos los datos necesarios para prestar el servicio:",
          {
            list: [
              "Datos de registro: nombre de usuario, correo electrónico, nombre y apellido (opcionales), contraseña (guardada solo como hash), idioma, fecha de creación de la cuenta, versión de los términos aceptada y fecha de aceptación, código de recomendación y, si existe, la cuenta que te recomendó.",
              "Datos de perfil: biografía, ubicación, instrumentos y la dirección (URL) de la imagen de perfil que indiques. No guardamos el archivo de la imagen, solo su dirección.",
              "Inicio de sesión con Google: identificador de la cuenta de Google, correo electrónico y nombre, recibidos de Google cuando eliges ese método.",
              "Contenido: canciones, letras, acordes, notas, setlists, shows, giras, bandas, sugerencias, votos, recordatorios y enlaces que registras.",
              "Datos de uso y seguridad: dirección IP, fecha y hora de acceso, intentos de inicio de sesión, eventos de seguridad (cambio de contraseña, activación de la verificación en dos pasos) y registros de auditoría de acciones administrativas.",
              "Preferencias: tema, idioma, ajustes del Modo en vivo y de la interfaz, preferencias de comunicación y elementos fijados.",
              "Comunicaciones: correos que te enviamos (verificación, seguridad, avisos), notificaciones y mensajes que envías al soporte.",
              "Datos de suscripción y pago: plan, periodicidad, estado de la suscripción, créditos, códigos promocionales canjeados, recomendaciones y, por cada pago, el importe, la fecha, el plan y los reembolsos, además de los identificadores de cliente, suscripción y factura en Stripe. Los datos de la tarjeta se introducen directamente en la página de pago de Stripe: Setlyst nunca recibe ni guarda el número de la tarjeta.",
            ],
          },
          "Los datos guardados para uso sin conexión quedan en el almacenamiento de tu propio navegador y se borran al cerrar sesión.",
        ],
      },
      {
        id: "purposes",
        heading: "Finalidades y bases legales",
        blocks: [
          "Tratamos datos personales para las finalidades siguientes, con las bases legales correspondientes del artículo 7 de la LGPD:",
          {
            list: [
              "Crear y mantener la cuenta, autenticarte, prestar el servicio contratado, sincronizar bandas y generar exportaciones: ejecución de contrato (art. 7, V).",
              "Conservar los registros de acceso durante 6 meses: cumplimiento de obligación legal (art. 7, II, y art. 15 del Marco Civil de Internet).",
              "Prevenir fraudes y abusos, limitar intentos de acceso, moderar nombres de usuario e imágenes de perfil, garantizar la seguridad de la plataforma y mejorar el servicio con estadísticas agregadas: interés legítimo (art. 7, IX), respetando siempre tus derechos y expectativas.",
              "Enviar correos con novedades del producto y ofertas: consentimiento (art. 7, I), que puedes retirar en cualquier momento.",
              "Enviar comunicaciones de seguridad y avisos esenciales de la cuenta: ejecución de contrato e interés legítimo.",
              "Procesar la suscripción y los pagos: ejecución de contrato (art. 7, V). Conservar los registros de pago para cumplir obligaciones fiscales y contables: obligación legal (art. 7, II).",
              "Defender derechos en procesos judiciales, administrativos o arbitrales: ejercicio regular de derechos (art. 7, VI).",
            ],
          },
          "Las comprobaciones automáticas de nombres de usuario e imágenes solo señalan casos para revisión. Cualquier medida de moderación la decide una persona del Equipo, y puedes pedir la revisión de decisiones basadas en tratamiento automatizado (art. 20 de la LGPD).",
        ],
      },
      {
        id: "sharing",
        heading: "Comunicación de datos y encargados",
        blocks: [
          "No vendemos datos personales. Solo compartimos datos con encargados que nos ayudan a prestar el servicio, bajo contrato y siguiendo nuestras instrucciones:",
          {
            list: [
              "Render Services, Inc. (alojamiento de la API) y Neon (base de datos PostgreSQL gestionada): almacenan y procesan todos los datos de la plataforma.",
              "Vercel Inc.: aloja el sitio y la aplicación web y ofrece Vercel Web Analytics, que mide las visitas de forma agregada y sin cookies.",
              "Proveedor de envío de correo: entrega correos transaccionales y las comunicaciones que autorizaste.",
              "Google LLC: autenticación, cuando usas el inicio de sesión con Google.",
              "Google Cloud Vision (opcional): puede recibir la dirección de la imagen de perfil o del logotipo de una banda para clasificar contenido inapropiado, cuando esta función esté activada.",
              "Stripe (Stripe, Inc. y las empresas de su grupo): procesa los pagos de las suscripciones. Recibe tu correo, nombre de usuario y los datos de pago que introduces en la página de pago de Stripe, y también los trata como responsable independiente para prevenir fraudes y cumplir sus propias obligaciones legales, conforme a la política de privacidad de Stripe.",
            ],
          },
          "También hay comunicación de datos derivada del uso que haces de la plataforma: los miembros de tus bandas ven el contenido de la banda y tu nombre de usuario, y quien abre un enlace público ve el contenido compartido, sin tus datos personales.",
          "Podemos facilitar datos a las autoridades cuando exista obligación legal u orden judicial, dentro de los límites de la ley.",
        ],
      },
      {
        id: "international",
        heading: "Transferencia internacional",
        blocks: [
          "Los encargados Render, Neon, Vercel, Stripe y Google tienen servidores fuera de Brasil, principalmente en Estados Unidos. Estas transferencias se basan en el artículo 33 de la LGPD, mediante cláusulas contractuales que garantizan un nivel de protección compatible con la ley brasileña, conforme a la regulación de la Autoridad Nacional de Protección de Datos (ANPD).",
        ],
      },
      {
        id: "retention",
        heading: "Cuánto tiempo conservamos los datos",
        blocks: [
          "Los plazos de conservación son:",
          {
            list: [
              "Datos de registro, perfil, preferencias y contenido: mientras exista la cuenta. Tras eliminar la cuenta, se borran, salvo en los casos siguientes.",
              "Registros de acceso (IP, fecha y hora): 6 meses, según el artículo 15 del Marco Civil de Internet. La excepción es la IP usada al crear la cuenta, que se conserva mientras la cuenta exista para prevenir fraudes en el programa de recomendaciones (interés legítimo).",
              "Registros de auditoría de acciones administrativas y de seguridad: el tiempo necesario para investigar incidentes y defender derechos, con un máximo de 5 años.",
              "Elementos en la papelera: 30 días; después se eliminan definitivamente.",
              "Correos en la cola de envío: el contenido de los correos sensibles (como códigos) se borra tras el envío, y los registros de envío se eliminan a los 30 días.",
              "Códigos de verificación: caducan a los 15 minutos y se borran a diario.",
              "Copias de seguridad de la base de datos: hasta 30 días, en rotación; los datos eliminados desaparecen de las copias al final de ese período.",
              "Registros de pago (importe, fecha, plan e identificadores de Stripe): durante el plazo exigido por la legislación tributaria, en general 5 años. Al eliminar la cuenta dejan de estar vinculados a ella, y el registro de cliente en Stripe se elimina.",
            ],
          },
        ],
      },
      {
        id: "rights",
        heading: "Tus derechos",
        blocks: [
          "Según el artículo 18 de la LGPD, puedes solicitar:",
          {
            list: [
              "confirmación de la existencia de tratamiento;",
              "acceso a los datos;",
              "corrección de datos incompletos, inexactos o desactualizados;",
              "anonimización, bloqueo o eliminación de datos innecesarios, excesivos o tratados en incumplimiento de la LGPD;",
              "portabilidad de los datos a otro proveedor;",
              "eliminación de los datos tratados con base en el consentimiento;",
              "información sobre las entidades con las que compartimos datos;",
              "información sobre la posibilidad de no dar el consentimiento y sus consecuencias;",
              "revocación del consentimiento;",
              "revisión de decisiones tomadas únicamente con base en tratamiento automatizado.",
            ],
          },
          "También puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos (ANPD).",
        ],
      },
      {
        id: "exercise",
        heading: "Cómo ejercer tus derechos",
        blocks: [
          "Muchos derechos pueden ejercerse directamente en la plataforma:",
          {
            list: [
              "Acceso y corrección: en Mi cuenta y en Configuración.",
              "Acceso y portabilidad: en Configuración, en la sección Datos, descarga la copia de seguridad de tu contenido y el archivo con todos tus datos personales (perfil, preferencias, consentimientos, suscripción, pagos y registro de seguridad).",
              "Consentimiento para correos: ajusta tus preferencias en Configuración, en la sección Comunicaciones, o usa el enlace de baja incluido en los correos.",
              "Eliminación: elimina tu cuenta en Configuración.",
            ],
          },
          `Para las demás solicitudes, escribe a ${dpo} desde el correo registrado en la cuenta. Podemos pedir información adicional para confirmar tu identidad. Respondemos en un plazo de 15 días.`,
        ],
      },
      {
        id: "dpo",
        heading: "Encargado de protección de datos",
        blocks: [
          `El Encargado (DPO) es el canal de comunicación entre tú, Setlyst y la ANPD. Contacto: ${dpo}.`,
        ],
      },
      {
        id: "security",
        heading: "Seguridad de los datos",
        blocks: [
          "Adoptamos medidas técnicas y administrativas para proteger los datos personales, conforme al artículo 46 de la LGPD, entre ellas:",
          {
            list: [
              "cifrado en tránsito (HTTPS/TLS) en todas las conexiones;",
              "contraseñas guardadas solo como hash Argon2;",
              "verificación en dos pasos (TOTP) opcional, con secretos cifrados en reposo (AES-256-GCM) y códigos de recuperación guardados como hash;",
              "códigos de verificación por correo guardados como HMAC y con número limitado de intentos;",
              "límite de intentos de inicio de sesión y bloqueo temporal de la cuenta;",
              "control de acceso por roles, principio de mínimo privilegio y registro de auditoría de las acciones del Equipo;",
              "imágenes de perfil cargadas a través de nuestro servidor, con validación, para no exponer tu IP a sitios de terceros.",
            ],
          },
          "Ningún sistema es totalmente inmune a fallos. Por eso recomendamos una contraseña fuerte y la verificación en dos pasos.",
        ],
      },
      {
        id: "incidents",
        heading: "Incidentes de seguridad",
        blocks: [
          "Si se produce un incidente de seguridad que pueda causar un riesgo o daño relevante, lo comunicaremos a la ANPD y a los titulares afectados en el plazo y la forma de la regulación, conforme al artículo 48 de la LGPD, indicando la naturaleza de los datos afectados, los riesgos y las medidas adoptadas.",
        ],
      },
      {
        id: "minors",
        heading: "Niños y adolescentes",
        blocks: [
          "Setlyst está destinado a personas de 18 años o más. Los adolescentes de 16 y 17 años solo pueden usar la plataforma con el consentimiento de su padre, madre o tutor legal, en el mejor interés del adolescente (artículo 14 de la LGPD).",
          "La plataforma no está destinada a menores de 16 años. Si identificamos una cuenta de una persona menor de 16 años, o sin el consentimiento exigido, la cuenta podrá cerrarse y los datos eliminarse.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          "Solo usamos cookies estrictamente necesarias (sesión, protección contra falsificación de peticiones e idioma) y de preferencias (tema). No usamos cookies publicitarias. Más detalles en la Política de Cookies.",
        ],
      },
      {
        id: "changes",
        heading: "Actualizaciones de esta Política",
        blocks: [
          `Esta Política puede actualizarse para reflejar cambios en el servicio o en la ley. La fecha de vigencia figura al inicio del documento, y los cambios relevantes se comunicarán por correo electrónico o aviso en la plataforma. Dudas generales: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
};
