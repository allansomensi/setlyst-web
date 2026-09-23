/*
 * Diretrizes da Comunidade do Setlyst.
 *
 * Base da moderação de nomes de usuário, imagens de perfil e logotipos
 * (API: src/moderation, fila de moderação da Equipe). Deve ser revisado
 * por um advogado antes da publicação definitiva.
 */

import { SUPPORT_EMAIL } from "@/lib/links";
import type { LegalTexts } from "./types";

export const GUIDELINES: LegalTexts = {
  "pt-BR": {
    title: "Diretrizes da Comunidade",
    summary:
      "O que é permitido em nomes de usuário, imagens de perfil e espaços compartilhados, como a moderação funciona e como denunciar.",
    sections: [
      {
        id: "purpose",
        heading: "Objetivo",
        blocks: [
          "O Setlyst é usado por músicos que dividem repertório, ensaios e palco. Estas Diretrizes mantêm esse ambiente profissional e respeitoso, e fazem parte dos Termos de Uso.",
        ],
      },
      {
        id: "scope",
        heading: "Onde se aplicam",
        blocks: [
          "Estas regras valem para tudo que outras pessoas podem ver: nome de usuário, nome, imagem de perfil, biografia e localização, nomes e logotipos de bandas, sugestões, votos, lembretes e conteúdo exibido em links públicos.",
        ],
      },
      {
        id: "profile",
        heading: "Imagens de perfil, nomes de usuário e logotipos",
        blocks: [
          "Não são permitidos em imagens de perfil, nomes de usuário, nomes e logotipos de bandas:",
          {
            list: [
              "Nudez e conteúdo sexual: nudez total ou parcial, atos sexuais, conteúdo sexualmente sugestivo ou termos de conotação sexual.",
              "Violência e conteúdo chocante: sangue, ferimentos, mutilação, violência explícita, crueldade contra animais ou apologia à violência.",
              "Ódio e discriminação: conteúdo que ofenda ou discrimine pessoas por raça, cor, etnia, religião ou procedência nacional, práticas tipificadas pela Lei 7.716/1989, e também por orientação sexual, identidade de gênero, deficiência, idade ou origem regional. Símbolos, termos e referências de grupos de ódio também são proibidos.",
              "Assédio: insultos, ameaças, humilhação ou referências depreciativas a uma pessoa determinada.",
              "Falsa identidade: se passar por outra pessoa, artista, banda, empresa ou pela Equipe do Setlyst, inclusive com nomes como “admin”, “suporte” ou “setlyst” que induzam a erro.",
              "Dados pessoais de terceiros: documentos, telefones, endereços, e-mails ou fotos de outras pessoas sem autorização.",
              "Conteúdo ilegal: apologia a crimes, venda de drogas ou armas, pirataria e qualquer conteúdo que viole a lei.",
              "Spam: propaganda, links, números de telefone ou chamadas para outros serviços usados como nome ou imagem.",
            ],
          },
          "Qualquer conteúdo que envolva exploração ou sexualização de crianças e adolescentes leva ao banimento imediato e é comunicado às autoridades, nos termos do Estatuto da Criança e do Adolescente.",
        ],
      },
      {
        id: "images",
        heading: "Requisitos técnicos das imagens",
        blocks: [
          "A imagem de perfil e o logotipo de banda são informados por endereço (URL) e precisam usar HTTPS. São aceitos os formatos PNG, JPEG, WebP, GIF e AVIF, com até 3 MB. Imagens SVG não são aceitas. As imagens são carregadas por meio do servidor do Setlyst, que verifica o formato e o tamanho antes de exibi-las.",
        ],
      },
      {
        id: "shared-spaces",
        heading: "Convivência em bandas",
        blocks: [
          "Em bandas, trate os demais integrantes com respeito, use sugestões e votos de boa-fé e não apague ou altere conteúdo da banda para prejudicar outras pessoas. Desentendimentos sobre a banda devem ser resolvidos entre os integrantes; a Equipe atua apenas quando houver violação destas Diretrizes ou dos Termos de Uso.",
        ],
      },
      {
        id: "automatic-checks",
        heading: "Verificações automáticas",
        blocks: [
          "Nomes de usuário, imagens de perfil e logotipos passam por verificações automáticas que apenas sinalizam casos suspeitos para a Equipe. Termos ofensivos evidentes são recusados já no cadastro. A decisão sobre qualquer medida é sempre tomada por uma pessoa da Equipe.",
        ],
      },
      {
        id: "enforcement",
        heading: "Medidas aplicáveis",
        blocks: [
          "Conforme a gravidade, a intenção e a reincidência, a Equipe pode:",
          {
            list: [
              "remover a imagem de perfil ou o logotipo da banda;",
              "redefinir o nome de usuário para um nome provisório, que você pode trocar em seguida por outro adequado;",
              "revogar links públicos;",
              "suspender a conta por tempo determinado;",
              "banir a conta de forma permanente.",
            ],
          },
          "Você recebe uma notificação com a medida aplicada e o motivo, exceto quando o aviso puder prejudicar uma investigação. Toda medida fica registrada em auditoria.",
        ],
      },
      {
        id: "appeals",
        heading: "Contestação",
        blocks: [
          `Se discordar de uma medida, escreva para ${SUPPORT_EMAIL} em até 30 dias, explicando o motivo. Uma pessoa da Equipe diferente da que aplicou a medida, sempre que possível, analisará o pedido.`,
        ],
      },
      {
        id: "reporting",
        heading: "Como denunciar",
        blocks: [
          "No perfil de qualquer usuário, use a opção Denunciar e escolha o motivo: imagem de perfil imprópria, nome de usuário ofensivo, falsa identidade, spam ou outro. Você também pode descrever o problema em poucas palavras.",
          `Para conteúdo em links públicos ou situações que exijam mais detalhes, escreva para ${SUPPORT_EMAIL}. Para violações de direitos autorais, siga o procedimento da Política de Direitos Autorais.`,
          "As denúncias são confidenciais: a pessoa denunciada não sabe quem a denunciou. Denúncias falsas ou em massa, feitas para prejudicar alguém, também violam estas Diretrizes.",
        ],
      },
    ],
  },

  en: {
    title: "Community Guidelines",
    summary:
      "What is allowed in usernames, profile pictures and shared spaces, how moderation works and how to report.",
    sections: [
      {
        id: "purpose",
        heading: "Purpose",
        blocks: [
          "Setlyst is used by musicians who share repertoire, rehearsals and the stage. These Guidelines keep that environment professional and respectful, and are part of the Terms of Use.",
        ],
      },
      {
        id: "scope",
        heading: "Where they apply",
        blocks: [
          "These rules apply to everything other people can see: username, name, profile picture, bio and location, band names and logos, suggestions, votes, reminders and content shown through public links.",
        ],
      },
      {
        id: "profile",
        heading: "Profile pictures, usernames and logos",
        blocks: [
          "The following are not allowed in profile pictures, usernames, band names and logos:",
          {
            list: [
              "Nudity and sexual content: full or partial nudity, sexual acts, sexually suggestive content or sexually connoted terms.",
              "Violence and shocking content: blood, injuries, mutilation, explicit violence, cruelty to animals or glorification of violence.",
              "Hate and discrimination: content that offends or discriminates against people because of race, colour, ethnicity, religion or national origin, conduct defined as a crime by Brazilian Law 7,716/1989, and also because of sexual orientation, gender identity, disability, age or regional origin. Symbols, terms and references of hate groups are also forbidden.",
              "Harassment: insults, threats, humiliation or disparaging references to a specific person.",
              "Impersonation: pretending to be another person, artist, band, company or the Setlyst team, including names such as “admin”, “support” or “setlyst” that mislead others.",
              "Other people's personal data: documents, phone numbers, addresses, e-mail addresses or photos of other people without authorisation.",
              "Illegal content: glorification of crimes, sale of drugs or weapons, piracy and any content that breaks the law.",
              "Spam: advertising, links, phone numbers or calls to other services used as a name or picture.",
            ],
          },
          "Any content involving the exploitation or sexualisation of children and teenagers leads to an immediate ban and is reported to the authorities, under the Brazilian Statute of Children and Adolescents.",
        ],
      },
      {
        id: "images",
        heading: "Technical requirements for images",
        blocks: [
          "Profile pictures and band logos are provided as an address (URL) and must use HTTPS. PNG, JPEG, WebP, GIF and AVIF are accepted, up to 3 MB. SVG images are not accepted. Images are loaded through Setlyst's server, which checks the format and size before showing them.",
        ],
      },
      {
        id: "shared-spaces",
        heading: "Working together in bands",
        blocks: [
          "In bands, treat the other members with respect, use suggestions and votes in good faith and do not delete or change band content to harm others. Disagreements about the band should be settled among its members; Staff only step in when these Guidelines or the Terms of Use are broken.",
        ],
      },
      {
        id: "automatic-checks",
        heading: "Automatic checks",
        blocks: [
          "Usernames, profile pictures and logos go through automatic checks that only flag suspicious cases for Staff. Obviously offensive terms are refused at sign-up. Any measure is always decided by a member of Staff.",
        ],
      },
      {
        id: "enforcement",
        heading: "Measures",
        blocks: [
          "Depending on severity, intent and recurrence, Staff may:",
          {
            list: [
              "remove the profile picture or band logo;",
              "reset the username to a temporary one, which you can then change to a suitable name;",
              "revoke public links;",
              "suspend the account for a set period;",
              "ban the account permanently.",
            ],
          },
          "You receive a notification with the measure and its reason, unless notice could harm an investigation. Every measure is recorded in an audit log.",
        ],
      },
      {
        id: "appeals",
        heading: "Appeals",
        blocks: [
          `If you disagree with a measure, write to ${SUPPORT_EMAIL} within 30 days explaining why. Whenever possible, a member of Staff other than the one who applied the measure will review the request.`,
        ],
      },
      {
        id: "reporting",
        heading: "How to report",
        blocks: [
          "On any user's profile, use the Report option and choose the reason: inappropriate profile picture, offensive username, impersonation, spam or other. You can also describe the problem in a few words.",
          `For content in public links or situations that need more detail, write to ${SUPPORT_EMAIL}. For copyright infringement, follow the procedure in the Copyright Policy.`,
          "Reports are confidential: the reported person does not learn who reported them. False or mass reports made to harm someone also break these Guidelines.",
        ],
      },
    ],
  },

  es: {
    title: "Normas de la Comunidad",
    summary:
      "Qué se permite en nombres de usuario, imágenes de perfil y espacios compartidos, cómo funciona la moderación y cómo denunciar.",
    sections: [
      {
        id: "purpose",
        heading: "Objetivo",
        blocks: [
          "Setlyst lo usan músicos que comparten repertorio, ensayos y escenario. Estas Normas mantienen ese entorno profesional y respetuoso, y forman parte de los Términos de Uso.",
        ],
      },
      {
        id: "scope",
        heading: "Dónde se aplican",
        blocks: [
          "Estas reglas se aplican a todo lo que otras personas pueden ver: nombre de usuario, nombre, imagen de perfil, biografía y ubicación, nombres y logotipos de bandas, sugerencias, votos, recordatorios y contenido mostrado en enlaces públicos.",
        ],
      },
      {
        id: "profile",
        heading: "Imágenes de perfil, nombres de usuario y logotipos",
        blocks: [
          "No se permite en imágenes de perfil, nombres de usuario, nombres y logotipos de bandas:",
          {
            list: [
              "Desnudos y contenido sexual: desnudez total o parcial, actos sexuales, contenido sexualmente sugerente o términos de connotación sexual.",
              "Violencia y contenido impactante: sangre, heridas, mutilaciones, violencia explícita, crueldad animal o apología de la violencia.",
              "Odio y discriminación: contenido que ofenda o discrimine a personas por raza, color, etnia, religión u origen nacional, conductas tipificadas por la Ley brasileña 7.716/1989, y también por orientación sexual, identidad de género, discapacidad, edad u origen regional. También se prohíben símbolos, términos y referencias de grupos de odio.",
              "Acoso: insultos, amenazas, humillaciones o referencias despectivas a una persona concreta.",
              "Suplantación: hacerse pasar por otra persona, artista, banda, empresa o por el Equipo de Setlyst, incluso con nombres como “admin”, “soporte” o “setlyst” que induzcan a error.",
              "Datos personales de terceros: documentos, teléfonos, direcciones, correos o fotos de otras personas sin autorización.",
              "Contenido ilegal: apología de delitos, venta de drogas o armas, piratería y cualquier contenido que infrinja la ley.",
              "Spam: publicidad, enlaces, números de teléfono o reclamos a otros servicios usados como nombre o imagen.",
            ],
          },
          "Cualquier contenido que implique explotación o sexualización de niños y adolescentes conlleva la expulsión inmediata y se comunica a las autoridades, conforme al Estatuto del Niño y del Adolescente de Brasil.",
        ],
      },
      {
        id: "images",
        heading: "Requisitos técnicos de las imágenes",
        blocks: [
          "La imagen de perfil y el logotipo de la banda se indican mediante una dirección (URL) y deben usar HTTPS. Se aceptan PNG, JPEG, WebP, GIF y AVIF, de hasta 3 MB. No se aceptan imágenes SVG. Las imágenes se cargan a través del servidor de Setlyst, que comprueba el formato y el tamaño antes de mostrarlas.",
        ],
      },
      {
        id: "shared-spaces",
        heading: "Convivencia en bandas",
        blocks: [
          "En las bandas, trata a los demás miembros con respeto, usa las sugerencias y los votos de buena fe y no borres ni cambies contenido de la banda para perjudicar a otros. Los desacuerdos sobre la banda deben resolverse entre sus miembros; el Equipo solo interviene cuando se incumplen estas Normas o los Términos de Uso.",
        ],
      },
      {
        id: "automatic-checks",
        heading: "Comprobaciones automáticas",
        blocks: [
          "Los nombres de usuario, imágenes de perfil y logotipos pasan por comprobaciones automáticas que solo señalan casos sospechosos al Equipo. Los términos claramente ofensivos se rechazan en el registro. La decisión sobre cualquier medida la toma siempre una persona del Equipo.",
        ],
      },
      {
        id: "enforcement",
        heading: "Medidas aplicables",
        blocks: [
          "Según la gravedad, la intención y la reincidencia, el Equipo puede:",
          {
            list: [
              "retirar la imagen de perfil o el logotipo de la banda;",
              "restablecer el nombre de usuario a uno provisional, que luego puedes cambiar por otro adecuado;",
              "revocar enlaces públicos;",
              "suspender la cuenta durante un tiempo determinado;",
              "expulsar la cuenta de forma permanente.",
            ],
          },
          "Recibirás una notificación con la medida y su motivo, salvo cuando el aviso pueda perjudicar una investigación. Toda medida queda registrada en una auditoría.",
        ],
      },
      {
        id: "appeals",
        heading: "Impugnación",
        blocks: [
          `Si no estás de acuerdo con una medida, escribe a ${SUPPORT_EMAIL} en un plazo de 30 días explicando el motivo. Siempre que sea posible, revisará la solicitud una persona del Equipo distinta de la que aplicó la medida.`,
        ],
      },
      {
        id: "reporting",
        heading: "Cómo denunciar",
        blocks: [
          "En el perfil de cualquier usuario, usa la opción Denunciar y elige el motivo: imagen de perfil inapropiada, nombre de usuario ofensivo, suplantación, spam u otro. También puedes describir el problema en pocas palabras.",
          `Para contenido en enlaces públicos o situaciones que requieran más detalle, escribe a ${SUPPORT_EMAIL}. Para infracciones de derechos de autor, sigue el procedimiento de la Política de Derechos de Autor.`,
          "Las denuncias son confidenciales: la persona denunciada no sabe quién la denunció. Las denuncias falsas o masivas hechas para perjudicar a alguien también incumplen estas Normas.",
        ],
      },
    ],
  },
};
