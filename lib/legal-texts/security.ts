/*
 * Política de Segurança e divulgação responsável de vulnerabilidades.
 *
 * Descreve controles efetivamente implementados na API e no web (Argon2,
 * TOTP com segredos em AES-256-GCM, bloqueio de conta, limites por IP,
 * auditoria, proxy de imagens). Deve ser revisada por um advogado antes da
 * publicação definitiva.
 */

import { SUPPORT_EMAIL } from "@/lib/links";
import type { LegalTexts } from "./types";

export const SECURITY: LegalTexts = {
  "pt-BR": {
    title: "Política de Segurança",
    summary:
      "Como protegemos contas e dados, o que você pode fazer para proteger a sua conta e como relatar uma vulnerabilidade.",
    sections: [
      {
        id: "passwords",
        heading: "Senhas",
        blocks: [
          "As senhas precisam ter pelo menos 8 caracteres, com letras maiúsculas e minúsculas, número e símbolo, não podem conter o nome de usuário nem ser uma senha comum conhecida. Elas são armazenadas somente como hash Argon2, e ninguém da Equipe tem acesso a elas.",
          "Alterar ou redefinir a senha encerra as sessões em todos os dispositivos, e você recebe um aviso por e-mail.",
        ],
      },
      {
        id: "two-factor",
        heading: "Verificação em duas etapas",
        blocks: [
          "Você pode ativar a verificação em duas etapas com um aplicativo autenticador (TOTP). Os segredos são criptografados em repouso com AES-256-GCM, e os códigos de recuperação são exibidos uma única vez e armazenados apenas como hash.",
          "Ativar ou desativar a verificação em duas etapas gera um aviso por e-mail.",
        ],
      },
      {
        id: "sessions",
        heading: "Sessões e acesso",
        blocks: [
          "As sessões expiram automaticamente e são conferidas a cada requisição, de modo que suspensão, desativação ou troca de senha valem imediatamente.",
          "Tentativas repetidas de login bloqueiam a conta temporariamente, com tempo de bloqueio crescente. Recuperação de senha, cadastro e outras rotas sensíveis têm limite de requisições por endereço IP. Códigos enviados por e-mail expiram em 15 minutos e aceitam poucas tentativas.",
        ],
      },
      {
        id: "access-control",
        heading: "Controle de acesso da Equipe",
        blocks: [
          "Os papéis da Equipe são hierárquicos: moderadores atuam apenas sobre contas comuns e administradores sobre usuários e moderadores. Ninguém atua sobre a própria conta pelo painel da Equipe. O recurso “ver como” é somente leitura, tem tempo limitado e é auditado.",
          "Toda ação administrativa fica registrada em auditoria, com autor, data e hora.",
        ],
      },
      {
        id: "infrastructure",
        heading: "Proteção de dados",
        blocks: [
          "Todo o tráfego usa HTTPS. A API envia cabeçalhos de segurança rigorosos, não armazena respostas autenticadas em cache e nunca expõe detalhes internos de erro.",
          "Imagens de perfil e logotipos são carregados por meio do nosso servidor, que valida o endereço, bloqueia redes internas, limita tamanho e tipo de arquivo e nunca serve SVG.",
          "Ao sair da conta, os dados guardados para uso offline são apagados do dispositivo.",
        ],
      },
      {
        id: "your-part",
        heading: "O que você pode fazer",
        blocks: [
          "Para manter a sua conta segura:",
          {
            list: [
              "use uma senha exclusiva para o Setlyst e um gerenciador de senhas;",
              "ative a verificação em duas etapas e guarde os códigos de recuperação em local seguro;",
              "confirme o seu e-mail, para receber avisos de segurança e poder recuperar a conta;",
              "saia da conta em dispositivos compartilhados;",
              "desconfie de mensagens que peçam a sua senha ou códigos: o Setlyst nunca pede essas informações.",
            ],
          },
        ],
      },
      {
        id: "disclosure",
        heading: "Divulgação responsável de vulnerabilidades",
        blocks: [
          `Se você encontrou uma vulnerabilidade, escreva para ${SUPPORT_EMAIL} com o assunto “Segurança”, descrevendo o problema, o impacto e os passos para reproduzir.`,
          "Durante os testes, pedimos que você:",
          {
            list: [
              "use apenas contas próprias ou criadas para o teste;",
              "não acesse, altere ou exclua dados de outras pessoas;",
              "não faça testes de negação de serviço, engenharia social ou envio de spam;",
              "interrompa o teste e nos avise assim que obtiver acesso a dados que não são seus;",
              "aguarde a correção, ou 90 dias, antes de divulgar publicamente.",
            ],
          },
          "Confirmamos o recebimento em até 5 dias úteis e mantemos você informado sobre a correção. Pesquisas feitas de boa-fé e dentro destas regras não serão objeto de medidas contra o pesquisador por parte do Setlyst.",
        ],
      },
    ],
  },

  en: {
    title: "Security Policy",
    summary:
      "How we protect accounts and data, what you can do to protect your account and how to report a vulnerability.",
    sections: [
      {
        id: "passwords",
        heading: "Passwords",
        blocks: [
          "Passwords must be at least 8 characters long, with upper- and lower-case letters, a number and a symbol, must not contain the username and must not be a known common password. They are stored only as Argon2 hashes, and no one on Staff has access to them.",
          "Changing or resetting the password ends sessions on every device, and you receive a notice by e-mail.",
        ],
      },
      {
        id: "two-factor",
        heading: "Two-step verification",
        blocks: [
          "You can turn on two-step verification with an authenticator app (TOTP). Secrets are encrypted at rest with AES-256-GCM, and recovery codes are shown only once and stored only as hashes.",
          "Turning two-step verification on or off triggers an e-mail notice.",
        ],
      },
      {
        id: "sessions",
        heading: "Sessions and access",
        blocks: [
          "Sessions expire automatically and are checked on every request, so a suspension, deactivation or password change takes effect immediately.",
          "Repeated sign-in attempts lock the account temporarily, with increasing lockout times. Password recovery, sign-up and other sensitive routes are rate-limited per IP address. Codes sent by e-mail expire in 15 minutes and accept only a few attempts.",
        ],
      },
      {
        id: "access-control",
        heading: "Staff access control",
        blocks: [
          "Staff roles are hierarchical: moderators act only on regular accounts, and administrators on users and moderators. Nobody can act on their own account from the Staff console. “View as” is read-only, time-limited and audited.",
          "Every administrative action is recorded in an audit log, with author, date and time.",
        ],
      },
      {
        id: "infrastructure",
        heading: "Data protection",
        blocks: [
          "All traffic uses HTTPS. The API sends strict security headers, does not let authenticated responses be cached and never exposes internal error details.",
          "Profile pictures and logos are loaded through our server, which validates the address, blocks internal networks, limits file size and type and never serves SVG.",
          "When you sign out, data saved for offline use is erased from the device.",
        ],
      },
      {
        id: "your-part",
        heading: "What you can do",
        blocks: [
          "To keep your account secure:",
          {
            list: [
              "use a password unique to Setlyst and a password manager;",
              "turn on two-step verification and keep the recovery codes somewhere safe;",
              "confirm your e-mail address, so you receive security notices and can recover the account;",
              "sign out on shared devices;",
              "be wary of messages asking for your password or codes: Setlyst never asks for them.",
            ],
          },
        ],
      },
      {
        id: "disclosure",
        heading: "Responsible vulnerability disclosure",
        blocks: [
          `If you have found a vulnerability, write to ${SUPPORT_EMAIL} with the subject “Security”, describing the problem, its impact and the steps to reproduce it.`,
          "While testing, we ask you to:",
          {
            list: [
              "use only your own accounts or accounts created for the test;",
              "not access, change or delete other people's data;",
              "not perform denial-of-service tests, social engineering or spam;",
              "stop testing and tell us as soon as you gain access to data that is not yours;",
              "wait for the fix, or 90 days, before disclosing publicly.",
            ],
          },
          "We acknowledge receipt within 5 business days and keep you informed about the fix. Setlyst will not take action against researchers for good-faith research carried out within these rules.",
        ],
      },
    ],
  },

  es: {
    title: "Política de Seguridad",
    summary:
      "Cómo protegemos las cuentas y los datos, qué puedes hacer para proteger tu cuenta y cómo informar de una vulnerabilidad.",
    sections: [
      {
        id: "passwords",
        heading: "Contraseñas",
        blocks: [
          "Las contraseñas deben tener al menos 8 caracteres, con mayúsculas y minúsculas, un número y un símbolo, no pueden contener el nombre de usuario ni ser una contraseña común conocida. Se guardan solo como hash Argon2 y nadie del Equipo tiene acceso a ellas.",
          "Cambiar o restablecer la contraseña cierra las sesiones en todos los dispositivos, y recibes un aviso por correo.",
        ],
      },
      {
        id: "two-factor",
        heading: "Verificación en dos pasos",
        blocks: [
          "Puedes activar la verificación en dos pasos con una aplicación de autenticación (TOTP). Los secretos se cifran en reposo con AES-256-GCM, y los códigos de recuperación se muestran una sola vez y se guardan solo como hash.",
          "Activar o desactivar la verificación en dos pasos genera un aviso por correo.",
        ],
      },
      {
        id: "sessions",
        heading: "Sesiones y acceso",
        blocks: [
          "Las sesiones caducan automáticamente y se comprueban en cada petición, así que una suspensión, desactivación o cambio de contraseña se aplica de inmediato.",
          "Los intentos repetidos de inicio de sesión bloquean la cuenta temporalmente, con tiempos de bloqueo crecientes. La recuperación de contraseña, el registro y otras rutas sensibles tienen límite de peticiones por dirección IP. Los códigos enviados por correo caducan a los 15 minutos y admiten pocos intentos.",
        ],
      },
      {
        id: "access-control",
        heading: "Control de acceso del Equipo",
        blocks: [
          "Los roles del Equipo son jerárquicos: los moderadores solo actúan sobre cuentas normales y los administradores sobre usuarios y moderadores. Nadie actúa sobre su propia cuenta desde el panel del Equipo. «Ver como» es de solo lectura, tiene tiempo limitado y queda auditado.",
          "Toda acción administrativa queda registrada en una auditoría, con autor, fecha y hora.",
        ],
      },
      {
        id: "infrastructure",
        heading: "Protección de datos",
        blocks: [
          "Todo el tráfico usa HTTPS. La API envía cabeceras de seguridad estrictas, no permite que las respuestas autenticadas se guarden en caché y nunca expone detalles internos de errores.",
          "Las imágenes de perfil y los logotipos se cargan a través de nuestro servidor, que valida la dirección, bloquea redes internas, limita el tamaño y el tipo de archivo y nunca sirve SVG.",
          "Al cerrar sesión, los datos guardados para uso sin conexión se borran del dispositivo.",
        ],
      },
      {
        id: "your-part",
        heading: "Qué puedes hacer",
        blocks: [
          "Para mantener tu cuenta segura:",
          {
            list: [
              "usa una contraseña exclusiva para Setlyst y un gestor de contraseñas;",
              "activa la verificación en dos pasos y guarda los códigos de recuperación en un lugar seguro;",
              "confirma tu correo, para recibir avisos de seguridad y poder recuperar la cuenta;",
              "cierra sesión en dispositivos compartidos;",
              "desconfía de mensajes que pidan tu contraseña o códigos: Setlyst nunca los pide.",
            ],
          },
        ],
      },
      {
        id: "disclosure",
        heading: "Divulgación responsable de vulnerabilidades",
        blocks: [
          `Si encontraste una vulnerabilidad, escribe a ${SUPPORT_EMAIL} con el asunto “Seguridad”, describiendo el problema, su impacto y los pasos para reproducirlo.`,
          "Durante las pruebas, te pedimos que:",
          {
            list: [
              "uses solo cuentas propias o creadas para la prueba;",
              "no accedas, modifiques ni elimines datos de otras personas;",
              "no hagas pruebas de denegación de servicio, ingeniería social ni envío de spam;",
              "detengas la prueba y nos avises en cuanto obtengas acceso a datos que no son tuyos;",
              "esperes a la corrección, o 90 días, antes de publicarlo.",
            ],
          },
          "Confirmamos la recepción en un plazo de 5 días hábiles y te mantenemos informado sobre la corrección. Setlyst no tomará medidas contra investigadores por investigaciones de buena fe realizadas dentro de estas reglas.",
        ],
      },
    ],
  },
};
