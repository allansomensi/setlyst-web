/*
 * Política de Direitos Autorais do Setlyst (Lei 9.610/1998; Marco Civil
 * da Internet, arts. 19, § 2º, 21 e 31; STF, Temas 987 e 533).
 *
 * O procedimento de retirada usa o bloqueio de compartilhamento já
 * existente (share lock da Equipe), com prazo de 2 dias úteis. Links
 * públicos e os seus PDFs nunca incluem letras nem cifras (a API força
 * `include_lyrics=false` no PDF público). O canal de notificação é
 * `COPYRIGHT_EMAIL` (NEXT_PUBLIC_COPYRIGHT_EMAIL). Deve ser revisado por
 * um advogado antes da publicação definitiva.
 */

import { COPYRIGHT_EMAIL } from "@/lib/legal";
import type { LegalTexts } from "./types";

export const COPYRIGHT: LegalTexts = {
  "pt-BR": {
    title: "Política de Direitos Autorais",
    summary:
      "Como tratamos obras protegidas inseridas pelos usuários e como notificar uma infração ou contestar uma retirada.",
    sections: [
      {
        id: "purpose",
        heading: "Objetivo",
        blocks: [
          "O Setlyst respeita os direitos de autores, compositores, arranjadores, editoras e demais titulares. Esta Política explica as responsabilidades de quem usa a plataforma e os procedimentos de notificação, retirada e contranotificação.",
        ],
      },
      {
        id: "protection",
        heading: "Proteção legal",
        blocks: [
          "Letras, composições musicais, arranjos e transcrições são obras intelectuais protegidas pela Lei 9.610/1998 (Lei de Direitos Autorais). A reprodução, a distribuição e a comunicação ao público dessas obras dependem, em regra, de autorização prévia e expressa dos titulares.",
          "O Setlyst não fornece nem licencia letras, cifras ou obras musicais. Não somos intermediários de licenciamento e não concedemos autorização para execução pública, que é regulada por normas próprias.",
        ],
      },
      {
        id: "user-content",
        heading: "Conteúdo inserido pelos usuários",
        blocks: [
          "Todo o repertório do Setlyst é inserido pelos próprios usuários. Quem insere uma obra é o único responsável por ter o direito de usá-la ou por usá-la de forma permitida pela lei.",
          "Manter letras e cifras na sua conta para estudo, ensaio e apoio à sua própria apresentação é o uso para o qual a plataforma foi feita. Esse uso privado não autoriza a distribuição pública da obra.",
          "Obras suas, obras em domínio público e obras com licença que permita o compartilhamento podem ser compartilhadas livremente, nos limites da respectiva licença.",
        ],
      },
      {
        id: "public-sharing",
        heading: "Compartilhamento público",
        blocks: [
          "Links públicos exibem apenas a ordem das músicas e informações técnicas (título, artista, tom, andamento e duração), sem letras nem cifras, e o PDF que pode ser baixado a partir de um link público também não as inclui. Assim, o Setlyst não reproduz nem comunica ao público, por meio de links públicos, as letras e cifras inseridas pelos usuários.",
          "Campos de texto livre exibidos em links públicos, como a descrição da setlist, não devem conter letras nem cifras de terceiros; conteúdo nessa situação pode ser retirado conforme esta Política.",
          "Dentro de uma banda, o conteúdo é visível somente aos integrantes, conforme as permissões definidas.",
        ],
      },
      {
        id: "notice",
        heading: "Notificação de infração",
        blocks: [
          `O titular de direitos, ou quem o represente, pode notificar o Setlyst pelo canal dedicado ${COPYRIGHT_EMAIL}, permanentemente disponível, com o assunto “Direitos autorais”. A página de Contato e a opção “Denunciar conteúdo” dos links públicos levam a esse canal. Para que possamos localizar o conteúdo de forma inequívoca e analisar o pedido, a notificação deve conter:`,
          {
            list: [
              "nome completo ou razão social, CPF ou CNPJ, e-mail e telefone do notificante;",
              "se for representante, documento que comprove os poderes de representação;",
              "identificação da obra protegida e da titularidade dos direitos;",
              "endereço (URL) do link público ou, quando não houver, identificação precisa do conteúdo (título, nome de usuário ou banda);",
              "descrição de como o conteúdo viola os direitos;",
              "declaração de que o uso não foi autorizado pelo titular, por seu representante ou pela lei;",
              "declaração, sob as penas da lei, de que as informações são verdadeiras e de que o notificante é titular ou está autorizado a agir em nome do titular;",
              "assinatura física ou eletrônica.",
            ],
          },
          "Notificações incompletas podem ser devolvidas com pedido de complementação.",
        ],
      },
      {
        id: "takedown",
        heading: "Análise e retirada",
        blocks: [
          "Recebida notificação completa, o Setlyst torna o conteúdo indisponível ao público em até 2 dias úteis e, conforme o caso, remove-o.",
          "Quem inseriu o conteúdo é informado sobre a medida e seus motivos, conforme o art. 20 do Marco Civil da Internet, e recebe as informações necessárias para apresentar contranotificação. Os dados de contato do notificante podem ser compartilhados com o usuário quando necessários para a defesa de direitos.",
        ],
      },
      {
        id: "marco-civil",
        heading: "Regime de responsabilidade",
        blocks: [
          "Violações de direitos autorais não se submetem ao art. 19 do Marco Civil da Internet (art. 19, § 2º, e art. 31 da Lei 12.965/2014). O Setlyst adota procedimento de notificação e retirada: recebida notificação completa (seção 5), o conteúdo indicado é tornado indisponível ao público, com a desativação do link público ou o bloqueio do item, em até 2 dias úteis, independentemente de ordem judicial, e o usuário é avisado para, querendo, apresentar contranotificação (seção 8). Para outros conteúdos ilícitos, aplicam-se o Marco Civil da Internet e a interpretação dada pelo Supremo Tribunal Federal.",
          "Nos termos do art. 21 da mesma lei, imagens ou materiais contendo nudez ou atos sexuais de caráter privado divulgados sem autorização dos participantes são removidos após notificação da pessoa atingida ou de seu representante, independentemente de ordem judicial. A notificação deve permitir a identificação específica do material e comprovar a legitimidade de quem a apresenta.",
        ],
      },
      {
        id: "counter-notice",
        heading: "Contranotificação",
        blocks: [
          `Se você entender que o conteúdo foi retirado por engano ou que tem direito de usá-lo, pode enviar uma contranotificação para ${COPYRIGHT_EMAIL} em até 30 dias, contendo:`,
          {
            list: [
              "seu nome completo, nome de usuário e e-mail;",
              "identificação do conteúdo retirado;",
              "os motivos pelos quais o uso é legítimo (obra própria, domínio público, licença ou autorização do titular), com documentos, quando houver;",
              "declaração, sob as penas da lei, de que as informações são verdadeiras.",
            ],
          },
          "Se a contranotificação for fundamentada, o Setlyst pode restabelecer o conteúdo e informará o notificante, que poderá recorrer ao Poder Judiciário. Havendo ordem judicial, ela será cumprida.",
        ],
      },
      {
        id: "repeat-infringers",
        heading: "Reincidência",
        blocks: [
          "Contas com 3 (três) notificações procedentes em 12 meses têm o compartilhamento público desativado por 90 dias; a partir da 5ª notificação procedente no mesmo período, a conta pode ser encerrada, assegurada a oportunidade de contranotificação em cada caso.",
        ],
      },
      {
        id: "abuse",
        heading: "Notificações indevidas",
        blocks: [
          "Notificações falsas, de má-fé ou feitas para prejudicar terceiros podem gerar responsabilidade civil e criminal de quem as apresenta.",
        ],
      },
    ],
  },

  en: {
    title: "Copyright Policy",
    summary:
      "How we handle protected works added by users and how to report an infringement or contest a takedown.",
    sections: [
      {
        id: "purpose",
        heading: "Purpose",
        blocks: [
          "Setlyst respects the rights of authors, composers, arrangers, publishers and other rights holders. This Policy explains the responsibilities of those who use the platform and the notice, takedown and counter-notice procedures.",
        ],
      },
      {
        id: "protection",
        heading: "Legal protection",
        blocks: [
          "Lyrics, musical compositions, arrangements and transcriptions are intellectual works protected by Brazilian Law 9,610/1998 (Copyright Law). Reproducing, distributing and communicating these works to the public generally require the prior and express authorisation of the rights holders.",
          "Setlyst does not supply or license lyrics, chords or musical works. We are not a licensing intermediary and do not grant authorisation for public performance, which is governed by its own rules.",
        ],
      },
      {
        id: "user-content",
        heading: "Content added by users",
        blocks: [
          "The whole Setlyst repertoire is added by users themselves. Whoever adds a work is solely responsible for having the right to use it or for using it in a way the law allows.",
          "Keeping lyrics and chords in your account for study, rehearsal and support of your own performance is what the platform was made for. That private use does not authorise public distribution of the work.",
          "Your own works, works in the public domain and works under a licence that allows sharing may be shared freely, within the limits of that licence.",
        ],
      },
      {
        id: "public-sharing",
        heading: "Public sharing",
        blocks: [
          "Public links show only the running order and technical information (title, artist, key, tempo and duration), without lyrics or chords, and the PDF that can be downloaded from a public link does not include them either. Setlyst therefore does not reproduce or communicate to the public, through public links, the lyrics and chords entered by users.",
          "Free-text fields shown on public links, such as the setlist description, must not contain third-party lyrics or chords; content in that situation may be taken down under this Policy.",
          "Within a band, content is visible only to its members, according to the permissions set.",
        ],
      },
      {
        id: "notice",
        heading: "Infringement notice",
        blocks: [
          `A rights holder, or their representative, can notify Setlyst through the dedicated, permanently available channel ${COPYRIGHT_EMAIL}, with the subject “Copyright”. The Contact page and the “Report content” option on public links lead to this channel. So that we can locate the content unambiguously and assess the request, the notice must include:`,
          {
            list: [
              "the full name or company name, CPF or CNPJ (or equivalent tax ID), e-mail address and phone number of the notifying party;",
              "if acting as a representative, a document proving the power to represent;",
              "identification of the protected work and of the ownership of the rights;",
              "the address (URL) of the public link or, where there is none, precise identification of the content (title, username or band);",
              "a description of how the content infringes the rights;",
              "a statement that the use has not been authorised by the rights holder, their representative or the law;",
              "a statement, under penalty of law, that the information is true and that the notifying party is the rights holder or is authorised to act on their behalf;",
              "a physical or electronic signature.",
            ],
          },
          "Incomplete notices may be returned with a request for the missing information.",
        ],
      },
      {
        id: "takedown",
        heading: "Review and takedown",
        blocks: [
          "Once a complete notice is received, Setlyst makes the content unavailable to the public within 2 business days and, where appropriate, removes it.",
          "Whoever added the content is told about the measure and its reasons, under article 20 of the Brazilian Civil Rights Framework for the Internet, and receives the information needed to submit a counter-notice. The notifying party's contact details may be shared with the user when needed for the defence of rights.",
        ],
      },
      {
        id: "marco-civil",
        heading: "Liability regime",
        blocks: [
          "Copyright infringements are not subject to article 19 of the Brazilian Civil Rights Framework for the Internet (article 19, § 2, and article 31 of Law 12,965/2014). Setlyst follows a notice and takedown procedure: once a complete notice is received (section 5), the indicated content is made unavailable to the public, by disabling the public link or blocking the item, within 2 business days, regardless of a court order, and the user is informed so that they may, if they wish, submit a counter-notice (section 8). For other unlawful content, the Civil Rights Framework for the Internet and its interpretation by the Brazilian Supreme Federal Court apply.",
          "Under article 21 of the same law, images or materials containing nudity or private sexual acts disclosed without the participants' authorisation are removed after notice from the affected person or their representative, regardless of a court order. The notice must allow the specific identification of the material and prove the standing of whoever submits it.",
        ],
      },
      {
        id: "counter-notice",
        heading: "Counter-notice",
        blocks: [
          `If you believe the content was removed by mistake or that you have the right to use it, you can send a counter-notice to ${COPYRIGHT_EMAIL} within 30 days, including:`,
          {
            list: [
              "your full name, username and e-mail address;",
              "identification of the removed content;",
              "the reasons why the use is legitimate (your own work, public domain, licence or the rights holder's authorisation), with documents where available;",
              "a statement, under penalty of law, that the information is true.",
            ],
          },
          "If the counter-notice is well-founded, Setlyst may restore the content and will inform the notifying party, who may go to court. Any court order will be complied with.",
        ],
      },
      {
        id: "repeat-infringers",
        heading: "Repeat infringers",
        blocks: [
          "Accounts with 3 (three) upheld notices within 12 months have public sharing disabled for 90 days; from the 5th upheld notice within the same period, the account may be closed, with the opportunity to submit a counter-notice assured in each case.",
        ],
      },
      {
        id: "abuse",
        heading: "Improper notices",
        blocks: [
          "False notices, notices made in bad faith or notices intended to harm others may give rise to civil and criminal liability for whoever submits them.",
        ],
      },
    ],
  },

  es: {
    title: "Política de Derechos de Autor",
    summary:
      "Cómo tratamos las obras protegidas añadidas por los usuarios y cómo notificar una infracción o impugnar una retirada.",
    sections: [
      {
        id: "purpose",
        heading: "Objetivo",
        blocks: [
          "Setlyst respeta los derechos de autores, compositores, arreglistas, editoriales y demás titulares. Esta Política explica las responsabilidades de quienes usan la plataforma y los procedimientos de notificación, retirada y contranotificación.",
        ],
      },
      {
        id: "protection",
        heading: "Protección legal",
        blocks: [
          "Las letras, composiciones musicales, arreglos y transcripciones son obras intelectuales protegidas por la Ley brasileña 9.610/1998 (Ley de Derechos de Autor). Su reproducción, distribución y comunicación pública requieren, por regla general, autorización previa y expresa de los titulares.",
          "Setlyst no suministra ni licencia letras, acordes u obras musicales. No somos intermediarios de licencias y no concedemos autorización para la ejecución pública, que se rige por normas propias.",
        ],
      },
      {
        id: "user-content",
        heading: "Contenido añadido por los usuarios",
        blocks: [
          "Todo el repertorio de Setlyst lo añaden los propios usuarios. Quien añade una obra es el único responsable de tener derecho a usarla o de usarla de forma permitida por la ley.",
          "Guardar letras y acordes en tu cuenta para estudio, ensayo y apoyo de tu propia actuación es el uso para el que se creó la plataforma. Ese uso privado no autoriza la distribución pública de la obra.",
          "Tus propias obras, las obras de dominio público y las obras con licencias que permiten compartirlas pueden compartirse libremente, dentro de los límites de la licencia.",
        ],
      },
      {
        id: "public-sharing",
        heading: "Compartir públicamente",
        blocks: [
          "Los enlaces públicos muestran solo el orden de las canciones e información técnica (título, artista, tono, tempo y duración), sin letras ni acordes, y el PDF que puede descargarse desde un enlace público tampoco los incluye. Así, Setlyst no reproduce ni comunica al público, mediante enlaces públicos, las letras y acordes introducidos por los usuarios.",
          "Los campos de texto libre que aparecen en los enlaces públicos, como la descripción de la setlist, no deben contener letras ni acordes de terceros; el contenido en esa situación puede retirarse conforme a esta Política.",
          "Dentro de una banda, el contenido solo es visible para sus miembros, según los permisos definidos.",
        ],
      },
      {
        id: "notice",
        heading: "Notificación de infracción",
        blocks: [
          `El titular de derechos, o quien lo represente, puede notificar a Setlyst por el canal específico ${COPYRIGHT_EMAIL}, disponible de forma permanente, con el asunto “Derechos de autor”. La página de Contacto y la opción “Denunciar contenido” de los enlaces públicos llevan a ese canal. Para localizar el contenido de forma inequívoca y analizar la solicitud, la notificación debe incluir:`,
          {
            list: [
              "nombre completo o razón social, CPF o CNPJ (o identificación fiscal equivalente), correo y teléfono de quien notifica;",
              "si actúa como representante, un documento que acredite la representación;",
              "identificación de la obra protegida y de la titularidad de los derechos;",
              "dirección (URL) del enlace público o, si no la hay, identificación precisa del contenido (título, nombre de usuario o banda);",
              "descripción de cómo el contenido infringe los derechos;",
              "declaración de que el uso no fue autorizado por el titular, su representante o la ley;",
              "declaración, bajo las penas de la ley, de que la información es verdadera y de que quien notifica es titular o está autorizado a actuar en su nombre;",
              "firma física o electrónica.",
            ],
          },
          "Las notificaciones incompletas pueden devolverse con una solicitud de información adicional.",
        ],
      },
      {
        id: "takedown",
        heading: "Análisis y retirada",
        blocks: [
          "Recibida una notificación completa, Setlyst hace el contenido inaccesible al público en un plazo de 2 días hábiles y, según el caso, lo retira.",
          "Quien añadió el contenido recibe información sobre la medida y sus motivos, conforme al artículo 20 del Marco Civil de Internet, y los datos necesarios para presentar una contranotificación. Los datos de contacto de quien notifica pueden compartirse con el usuario cuando sean necesarios para la defensa de derechos.",
        ],
      },
      {
        id: "marco-civil",
        heading: "Régimen de responsabilidad",
        blocks: [
          "Las infracciones de derechos de autor no se someten al artículo 19 del Marco Civil de Internet (artículo 19, § 2, y artículo 31 de la Ley 12.965/2014). Setlyst adopta un procedimiento de notificación y retirada: recibida una notificación completa (sección 5), el contenido indicado se hace inaccesible al público, mediante la desactivación del enlace público o el bloqueo del elemento, en un plazo de 2 días hábiles, sin necesidad de orden judicial, y se avisa al usuario para que, si lo desea, presente una contranotificación (sección 8). Para otros contenidos ilícitos, se aplican el Marco Civil de Internet y la interpretación dada por el Supremo Tribunal Federal de Brasil.",
          "Según el artículo 21 de la misma ley, las imágenes o materiales con desnudos o actos sexuales de carácter privado divulgados sin autorización de los participantes se retiran tras la notificación de la persona afectada o de su representante, sin necesidad de orden judicial. La notificación debe permitir identificar específicamente el material y acreditar la legitimidad de quien la presenta.",
        ],
      },
      {
        id: "counter-notice",
        heading: "Contranotificación",
        blocks: [
          `Si consideras que el contenido se retiró por error o que tienes derecho a usarlo, puedes enviar una contranotificación a ${COPYRIGHT_EMAIL} en un plazo de 30 días, con:`,
          {
            list: [
              "tu nombre completo, nombre de usuario y correo;",
              "identificación del contenido retirado;",
              "los motivos por los que el uso es legítimo (obra propia, dominio público, licencia o autorización del titular), con documentos cuando los haya;",
              "declaración, bajo las penas de la ley, de que la información es verdadera.",
            ],
          },
          "Si la contranotificación está fundamentada, Setlyst puede restablecer el contenido e informará a quien notificó, que podrá acudir a los tribunales. Cualquier orden judicial será cumplida.",
        ],
      },
      {
        id: "repeat-infringers",
        heading: "Reincidencia",
        blocks: [
          "Las cuentas con 3 (tres) notificaciones procedentes en 12 meses tienen el uso compartido público desactivado durante 90 días; a partir de la 5.ª notificación procedente en el mismo período, la cuenta puede cerrarse, garantizando en cada caso la oportunidad de presentar una contranotificación.",
        ],
      },
      {
        id: "abuse",
        heading: "Notificaciones indebidas",
        blocks: [
          "Las notificaciones falsas, de mala fe o hechas para perjudicar a terceros pueden generar responsabilidad civil y penal para quien las presenta.",
        ],
      },
    ],
  },
};
