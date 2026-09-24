/*
 * Política de Privacidade do Setlyst (LGPD, Lei 13.709/2018).
 *
 * Descreve os dados que a plataforma realmente trata (ver API: users,
 * user_preferences, audit_log, email_outbox, verification_codes, trash) e
 * os operadores efetivamente usados (hoje: Render, Neon, Vercel, Stripe,
 * Resend, Google). Sempre que um novo operador, dado ou finalidade for
 * adicionado ao produto, este texto, o histórico de versões
 * (versions.ts) e `LEGAL_VERSION` precisam ser atualizados. Deve ser
 * revisado por um advogado antes da publicação definitiva.
 *
 * Canal de privacidade: opção de agente de tratamento de pequeno porte
 * (Resolução CD/ANPD nº 2/2022, art. 11), sem encarregado indicado. Se o
 * Setlyst passar a ser pessoa jurídica ou deixar de ser de pequeno porte,
 * indique um encarregado na seção 9 e volte a base dos registros de
 * acesso (3.1 b e 6.1 b) para obrigação legal (art. 7º, II).
 */

import { CONTROLLER, PRIVACY_EMAIL, controllerIdentity } from "@/lib/legal";
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
          `Esta Política explica como tratamos dados pessoais conforme a Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018, “LGPD”) e o Marco Civil da Internet (Lei 12.965/2014). Dúvidas e pedidos sobre dados pessoais podem ser enviados ao canal de privacidade, pelo e-mail ${dpo} (seção 9).`,
        ],
      },
      {
        id: "data",
        heading: "Dados que coletamos",
        blocks: [
          "Tratamos somente os dados necessários para oferecer o serviço:",
          {
            list: [
              "Dados de cadastro: nome de usuário, e-mail, nome e sobrenome (opcionais), senha (armazenada apenas como hash), idioma, data de criação da conta, versão dos termos aceita, data do aceite e declaração de idade, código de indicação e, se houver, a conta que indicou você.",
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
              "Guardar registros de acesso (IP, data e hora) por 6 meses, para segurança, prevenção a fraudes e atendimento a requisições de autoridades: legítimo interesse (art. 7º, IX) e exercício regular de direitos (art. 7º, VI). O prazo segue como referência o art. 15 do Marco Civil da Internet; havendo requisição de autoridade, os registros poderão ser preservados por prazo maior (art. 15, § 2º).",
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
              "Resend, Inc.: envio de e-mails transacionais e das comunicações que você autorizou.",
              "Google LLC: autenticação, quando você usa o login com Google.",
              "Google Cloud Vision (Google LLC), quando ativado: pode receber o endereço da imagem de perfil ou do logotipo de banda para classificar conteúdo impróprio. O recurso é opcional e só é usado enquanto estiver habilitado na configuração da plataforma.",
              "Stripe (Stripe, Inc. e empresas do seu grupo): processa os pagamentos das assinaturas. Recebe o seu e-mail, nome de usuário e os dados de pagamento que você informar na página de pagamento do Stripe, e os trata também como controlador independente para prevenção a fraudes e cumprimento das suas próprias obrigações legais, conforme a política de privacidade do Stripe.",
            ],
          },
          "Também há compartilhamento decorrente do uso que você faz da plataforma: integrantes das suas bandas veem o conteúdo da banda e seu nome de usuário, e quem abre um link público vê as informações compartilhadas, sem letras, cifras ou dados pessoais seus.",
          "Podemos fornecer dados a autoridades quando houver obrigação legal ou ordem judicial, nos limites da lei.",
          "Pessoas da Equipe só acessam dados e conteúdo da sua conta quando necessário para suporte, moderação ou segurança, em modo somente leitura, por tempo limitado e com registro em auditoria, sob dever de confidencialidade.",
        ],
      },
      {
        id: "international",
        heading: "Transferência internacional",
        blocks: [
          "Render, Neon, Vercel, Stripe, Google e Resend podem armazenar ou processar dados fora do Brasil, principalmente nos Estados Unidos. Essas transferências se baseiam no art. 33, IX, da LGPD, por serem necessárias à execução do contrato com você (art. 7º, V), e, quando adotadas pelo operador, nas cláusulas-padrão contratuais aprovadas pela ANPD (art. 33, II, “b”, e Resolução CD/ANPD nº 19/2024).",
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
              "Registros de acesso (IP, data e hora): 6 meses, com base no legítimo interesse e tomando como referência o art. 15 do Marco Civil da Internet; havendo requisição de autoridade, podem ser preservados por prazo maior. A exceção é o IP usado na criação da conta, mantido enquanto a conta existir para prevenir fraudes no programa de indicação (legítimo interesse).",
              "Registros de auditoria de ações administrativas e de segurança: pelo tempo necessário à apuração de incidentes e à defesa de direitos, limitado a 5 anos.",
              "Itens na lixeira: 30 dias; depois são excluídos definitivamente.",
              "E-mails na fila de envio: o conteúdo de e-mails sensíveis (como códigos) é apagado após o envio, e os registros de envio são removidos após 30 dias.",
              "Códigos de verificação: expiram em 15 minutos e são apagados diariamente.",
              "Cópias de segurança do banco de dados: até 30 dias, em rotação; dados excluídos deixam de existir nas cópias ao fim desse período.",
              "Registros de pagamento (valor, data, plano e identificadores do Stripe): pelo prazo exigido pela legislação tributária, em regra 5 anos. Com a exclusão da conta, deixam de ter vínculo com ela, e o cadastro de cliente no Stripe é excluído.",
              "Registros de aceite dos termos e de consentimento (versão, data, IP): enquanto a conta existir e por mais 5 anos, para comprovação (art. 7º, VI, e art. 8º, § 2º, da LGPD).",
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
        heading: "Canal de comunicação sobre dados pessoais",
        blocks: [
          `O Setlyst é agente de tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022) e, nos termos do seu art. 11, não indicou encarregado. O canal de comunicação com titulares e com a ANPD é ${dpo}, sob responsabilidade de ${CONTROLLER.name}.`,
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
          "Se ocorrer um incidente de segurança que possa acarretar risco ou dano relevante, comunicaremos a ANPD e os titulares afetados em até 3 dias úteis do conhecimento do incidente, conforme o art. 48 da LGPD e a Resolução CD/ANPD nº 15/2024, informando a natureza dos dados afetados, os riscos envolvidos e as medidas adotadas.",
        ],
      },
      {
        id: "minors",
        heading: "Crianças e adolescentes",
        blocks: [
          "O Setlyst é destinado a pessoas com 18 anos ou mais. Adolescentes de 16 e 17 anos podem usar a plataforma com a assistência do responsável legal exigida pela lei civil. Os dados de adolescentes são tratados com base nas hipóteses do art. 7º da LGPD, sempre no seu melhor interesse (art. 14 da LGPD e Enunciado CD/ANPD nº 1/2023), sem perfilamento para publicidade e com as configurações mais protetivas por padrão.",
          "No cadastro, você declara ter 18 anos ou mais, ou ter 16 ou 17 anos e autorização do seu responsável legal. A plataforma não se destina a menores de 16 anos. Se identificarmos uma conta de pessoa com menos de 16 anos, ou de adolescente sem a assistência exigida, a conta poderá ser encerrada e os dados eliminados.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          "Usamos apenas cookies estritamente necessários (sessão, proteção contra falsificação de requisições, login com Google, idioma, fuso horário e indicação) e o armazenamento local do navegador para preferências e uso offline. Não usamos cookies de publicidade nem de rastreamento. Detalhes na Política de Cookies.",
        ],
      },
      {
        id: "changes",
        heading: "Atualizações desta Política",
        blocks: [
          `Esta Política pode ser atualizada para refletir mudanças no serviço ou na legislação. Alterações relevantes serão comunicadas por e-mail e na plataforma com antecedência mínima de 15 dias da entrada em vigor, acompanhadas de resumo do que mudou; as versões anteriores permanecem disponíveis para consulta no histórico de versões deste documento. Alterações exigidas por lei, por ordem de autoridade ou para corrigir falha de segurança podem valer de imediato. Se não concordar com a nova versão, você poderá exportar seus dados e encerrar a conta; se tiver plano pago em curso, poderá cancelá-lo com reembolso proporcional ao período não usufruído. O exercício dos seus direitos de titular, inclusive a portabilidade, não depende do aceite da nova versão. Dúvidas gerais: ${SUPPORT_EMAIL}.`,
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
          `This Policy explains how we process personal data under the Brazilian General Data Protection Law (Law 13,709/2018, “LGPD”) and the Brazilian Civil Rights Framework for the Internet (Law 12,965/2014). Questions and requests about personal data can be sent to the privacy channel at ${dpo} (section 9).`,
        ],
      },
      {
        id: "data",
        heading: "Data we collect",
        blocks: [
          "We only process the data needed to provide the service:",
          {
            list: [
              "Registration data: username, e-mail address, first and last name (optional), password (stored only as a hash), language, account creation date, accepted terms version, acceptance date and age declaration, referral code and, if any, the account that referred you.",
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
              "Keeping access records (IP address, date and time) for 6 months, for security, fraud prevention and responding to requests from authorities: legitimate interest (art. 7, IX) and regular exercise of rights (art. 7, VI). The period uses article 15 of the Civil Rights Framework for the Internet as a benchmark; if an authority so requests, the records may be preserved for longer (art. 15, § 2).",
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
              "Resend, Inc.: delivery of transactional e-mails and of the communications you have authorised.",
              "Google LLC: authentication, when you use Sign in with Google.",
              "Google Cloud Vision (Google LLC), when enabled: may receive the address of a profile picture or band logo to classify inappropriate content. The feature is optional and is used only while it is enabled in the platform's configuration.",
              "Stripe (Stripe, Inc. and its group companies): processes subscription payments. It receives your e-mail address, username and the payment details you enter on Stripe's payment page, and also processes them as an independent controller for fraud prevention and its own legal obligations, under Stripe's privacy policy.",
            ],
          },
          "Data is also shared as a result of how you use the platform: members of your bands see the band's content and your username, and anyone who opens a public link sees the shared information, without lyrics, chords or your personal data.",
          "We may provide data to authorities when required by law or court order, within legal limits.",
          "Staff members only access your account's data and content when needed for support, moderation or security, in read-only mode, for a limited time and with an audit record, under a duty of confidentiality.",
        ],
      },
      {
        id: "international",
        heading: "International transfer",
        blocks: [
          "Render, Neon, Vercel, Stripe, Google and Resend may store or process data outside Brazil, mainly in the United States. These transfers are based on article 33, IX, of the LGPD, as they are necessary to perform the contract with you (art. 7, V), and, where adopted by the processor, on the standard contractual clauses approved by the ANPD (art. 33, II, “b”, and ANPD Resolution CD/ANPD No. 19/2024).",
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
              "Access records (IP address, date and time): 6 months, based on legitimate interest and using article 15 of the Civil Rights Framework for the Internet as a benchmark; if an authority so requests, they may be preserved for longer. The exception is the IP address used to create the account, kept while the account exists to prevent referral program fraud (legitimate interest).",
              "Audit records of administrative and security actions: for as long as needed to investigate incidents and defend rights, up to 5 years.",
              "Items in the trash: 30 days; after that they are permanently deleted.",
              "E-mails in the delivery queue: the content of sensitive e-mails (such as codes) is erased after sending, and delivery records are removed after 30 days.",
              "Verification codes: expire in 15 minutes and are erased daily.",
              "Database backups: up to 30 days, on rotation; deleted data disappears from backups at the end of that period.",
              "Payment records (amount, date, plan and Stripe identifiers): for the period required by tax law, usually 5 years. When the account is deleted they are no longer linked to it, and the customer record at Stripe is deleted.",
              "Records of acceptance of the terms and of consent (version, date, IP address): while the account exists and for 5 more years, as proof (art. 7, VI, and art. 8, § 2, of the LGPD).",
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
        heading: "Personal data contact channel",
        blocks: [
          `Setlyst is a small-scale processing agent (ANPD Resolution CD/ANPD No. 2/2022) and, under its article 11, has not appointed a data protection officer (encarregado). The communication channel for data subjects and the ANPD is ${dpo}, under the responsibility of ${CONTROLLER.name}.`,
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
          "If a security incident occurs that may cause relevant risk or harm, we will notify the ANPD and the affected data subjects within 3 business days of becoming aware of the incident, under article 48 of the LGPD and ANPD Resolution CD/ANPD No. 15/2024, stating the nature of the affected data, the risks involved and the measures taken.",
        ],
      },
      {
        id: "minors",
        heading: "Children and teenagers",
        blocks: [
          "Setlyst is intended for people aged 18 or over. Teenagers aged 16 and 17 may use the platform with the assistance of a legal guardian required by civil law. Teenagers' data is processed on the legal bases of article 7 of the LGPD, always in their best interest (article 14 of the LGPD and ANPD Statement CD/ANPD No. 1/2023), without profiling for advertising and with the most protective settings by default.",
          "At sign-up, you declare that you are 18 or over, or that you are 16 or 17 and have your legal guardian's authorisation. The platform is not intended for anyone under 16. If we identify an account belonging to someone under 16, or to a teenager without the required assistance, the account may be closed and the data deleted.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          "We only use strictly necessary cookies (session, protection against cross-site request forgery, Sign in with Google, language, time zone and referral) and the browser's local storage for preferences and offline use. We do not use advertising or tracking cookies. Details in the Cookie Policy.",
        ],
      },
      {
        id: "changes",
        heading: "Updates to this Policy",
        blocks: [
          `This Policy may be updated to reflect changes in the service or the law. Relevant changes will be communicated by e-mail and in the platform at least 15 days before they take effect, together with a summary of what changed; previous versions remain available in this document's version history. Changes required by law, by an order of an authority or to fix a security flaw may take effect immediately. If you do not agree with the new version, you may export your data and close your account; if you have a paid plan in progress, you may cancel it with a pro-rata refund for the period not used. Exercising your rights as a data subject, including portability, does not depend on accepting the new version. General questions: ${SUPPORT_EMAIL}.`,
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
          `Esta Política explica cómo tratamos los datos personales conforme a la Ley General de Protección de Datos de Brasil (Ley 13.709/2018, “LGPD”) y el Marco Civil de Internet (Ley 12.965/2014). Las dudas y solicitudes sobre datos personales pueden enviarse al canal de privacidad, en ${dpo} (sección 9).`,
        ],
      },
      {
        id: "data",
        heading: "Datos que recopilamos",
        blocks: [
          "Solo tratamos los datos necesarios para prestar el servicio:",
          {
            list: [
              "Datos de registro: nombre de usuario, correo electrónico, nombre y apellido (opcionales), contraseña (guardada solo como hash), idioma, fecha de creación de la cuenta, versión de los términos aceptada, fecha de aceptación y declaración de edad, código de recomendación y, si existe, la cuenta que te recomendó.",
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
              "Conservar los registros de acceso (IP, fecha y hora) durante 6 meses, para seguridad, prevención de fraudes y atención a requerimientos de autoridades: interés legítimo (art. 7, IX) y ejercicio regular de derechos (art. 7, VI). El plazo toma como referencia el artículo 15 del Marco Civil de Internet; si una autoridad lo requiere, los registros podrán conservarse por más tiempo (art. 15, § 2).",
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
              "Resend, Inc.: envío de correos transaccionales y de las comunicaciones que autorizaste.",
              "Google LLC: autenticación, cuando usas el inicio de sesión con Google.",
              "Google Cloud Vision (Google LLC), cuando está activado: puede recibir la dirección de la imagen de perfil o del logotipo de una banda para clasificar contenido inapropiado. La función es opcional y solo se usa mientras esté habilitada en la configuración de la plataforma.",
              "Stripe (Stripe, Inc. y las empresas de su grupo): procesa los pagos de las suscripciones. Recibe tu correo, nombre de usuario y los datos de pago que introduces en la página de pago de Stripe, y también los trata como responsable independiente para prevenir fraudes y cumplir sus propias obligaciones legales, conforme a la política de privacidad de Stripe.",
            ],
          },
          "También hay comunicación de datos derivada del uso que haces de la plataforma: los miembros de tus bandas ven el contenido de la banda y tu nombre de usuario, y quien abre un enlace público ve la información compartida, sin letras, acordes ni tus datos personales.",
          "Podemos facilitar datos a las autoridades cuando exista obligación legal u orden judicial, dentro de los límites de la ley.",
          "Las personas del Equipo solo acceden a los datos y al contenido de tu cuenta cuando es necesario para soporte, moderación o seguridad, en modo de solo lectura, por tiempo limitado y con registro en auditoría, bajo deber de confidencialidad.",
        ],
      },
      {
        id: "international",
        heading: "Transferencia internacional",
        blocks: [
          "Render, Neon, Vercel, Stripe, Google y Resend pueden almacenar o tratar datos fuera de Brasil, principalmente en Estados Unidos. Estas transferencias se basan en el artículo 33, IX, de la LGPD, por ser necesarias para la ejecución del contrato contigo (art. 7, V), y, cuando el encargado las haya adoptado, en las cláusulas contractuales tipo aprobadas por la ANPD (art. 33, II, “b”, y Resolución CD/ANPD nº 19/2024).",
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
              "Registros de acceso (IP, fecha y hora): 6 meses, con base en el interés legítimo y tomando como referencia el artículo 15 del Marco Civil de Internet; si una autoridad lo requiere, pueden conservarse por más tiempo. La excepción es la IP usada al crear la cuenta, que se conserva mientras la cuenta exista para prevenir fraudes en el programa de recomendaciones (interés legítimo).",
              "Registros de auditoría de acciones administrativas y de seguridad: el tiempo necesario para investigar incidentes y defender derechos, con un máximo de 5 años.",
              "Elementos en la papelera: 30 días; después se eliminan definitivamente.",
              "Correos en la cola de envío: el contenido de los correos sensibles (como códigos) se borra tras el envío, y los registros de envío se eliminan a los 30 días.",
              "Códigos de verificación: caducan a los 15 minutos y se borran a diario.",
              "Copias de seguridad de la base de datos: hasta 30 días, en rotación; los datos eliminados desaparecen de las copias al final de ese período.",
              "Registros de pago (importe, fecha, plan e identificadores de Stripe): durante el plazo exigido por la legislación tributaria, en general 5 años. Al eliminar la cuenta dejan de estar vinculados a ella, y el registro de cliente en Stripe se elimina.",
              "Registros de aceptación de los términos y de consentimiento (versión, fecha, IP): mientras exista la cuenta y durante 5 años más, como prueba (art. 7, VI, y art. 8, § 2, de la LGPD).",
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
        heading: "Canal de comunicación sobre datos personales",
        blocks: [
          `Setlyst es un agente de tratamiento de pequeño porte (Resolución CD/ANPD nº 2/2022) y, conforme a su artículo 11, no ha designado un delegado de protección de datos (encarregado). El canal de comunicación con los titulares y con la ANPD es ${dpo}, bajo la responsabilidad de ${CONTROLLER.name}.`,
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
          "Si se produce un incidente de seguridad que pueda causar un riesgo o daño relevante, lo comunicaremos a la ANPD y a los titulares afectados en un plazo de 3 días hábiles desde que tengamos conocimiento del incidente, conforme al artículo 48 de la LGPD y la Resolución CD/ANPD nº 15/2024, indicando la naturaleza de los datos afectados, los riesgos y las medidas adoptadas.",
        ],
      },
      {
        id: "minors",
        heading: "Niños y adolescentes",
        blocks: [
          "Setlyst está destinado a personas de 18 años o más. Los adolescentes de 16 y 17 años pueden usar la plataforma con la asistencia de su tutor legal exigida por la ley civil. Los datos de adolescentes se tratan con base en los supuestos del artículo 7 de la LGPD, siempre en su mejor interés (artículo 14 de la LGPD y Enunciado CD/ANPD nº 1/2023), sin elaboración de perfiles con fines publicitarios y con la configuración más protectora por defecto.",
          "En el registro, declaras tener 18 años o más, o tener 16 o 17 años y la autorización de tu tutor legal. La plataforma no está destinada a menores de 16 años. Si identificamos una cuenta de una persona menor de 16 años, o de un adolescente sin la asistencia exigida, la cuenta podrá cerrarse y los datos eliminarse.",
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          "Solo usamos cookies estrictamente necesarias (sesión, protección contra falsificación de peticiones, inicio de sesión con Google, idioma, zona horaria y recomendación) y el almacenamiento local del navegador para preferencias y uso sin conexión. No usamos cookies publicitarias ni de seguimiento. Más detalles en la Política de Cookies.",
        ],
      },
      {
        id: "changes",
        heading: "Actualizaciones de esta Política",
        blocks: [
          `Esta Política puede actualizarse para reflejar cambios en el servicio o en la ley. Los cambios relevantes se comunicarán por correo electrónico y en la plataforma con al menos 15 días de antelación a su entrada en vigor, junto con un resumen de lo que cambió; las versiones anteriores siguen disponibles para consulta en el historial de versiones de este documento. Los cambios exigidos por ley, por orden de una autoridad o para corregir un fallo de seguridad pueden aplicarse de inmediato. Si no estás de acuerdo con la nueva versión, podrás exportar tus datos y cerrar la cuenta; si tienes un plan de pago en curso, podrás cancelarlo con reembolso proporcional al período no disfrutado. El ejercicio de tus derechos como titular, incluida la portabilidad, no depende de aceptar la nueva versión. Dudas generales: ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
};
