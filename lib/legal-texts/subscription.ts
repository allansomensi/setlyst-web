/*
 * Termos de Assinatura do Setlyst (CDC, Decreto 7.962/2013).
 *
 * Refletem o modelo de cobrança da API (billing: planos, período de teste,
 * códigos promocionais, créditos e indicações). Quando o processador de
 * pagamentos for integrado, revisar as cláusulas de pagamento, renovação e
 * reembolso. Deve ser revisado por um advogado antes da publicação
 * definitiva.
 */

import { CONTROLLER } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/links";
import type { LegalTexts } from "./types";

export const SUBSCRIPTION: LegalTexts = {
  "pt-BR": {
    title: "Termos de Assinatura",
    summary:
      "Planos, período de teste, renovação, cancelamento, direito de arrependimento, reembolsos, créditos e indicações.",
    sections: [
      {
        id: "scope",
        heading: "Objeto",
        blocks: [
          "Estes Termos de Assinatura complementam os Termos de Uso e regulam a contratação dos planos pagos do Setlyst. Em caso de conflito sobre assinatura, prevalecem estes Termos.",
        ],
      },
      {
        id: "supplier",
        heading: "Identificação do fornecedor",
        blocks: [
          `Em cumprimento ao Decreto 7.962/2013, informamos: ${CONTROLLER.name}, CNPJ ${CONTROLLER.taxId}, endereço ${CONTROLLER.address}, e-mail de atendimento ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        id: "plans",
        heading: "Planos",
        blocks: [
          "O Setlyst oferece os planos Básico, Intermediário e Pro, com cobrança mensal ou anual. Os preços, em reais, os limites de uso e os recursos de cada plano estão descritos de forma clara na página de Planos e são apresentados novamente antes da confirmação da contratação.",
          "Recursos exclusivos de planos incluem, conforme o plano: criação de bandas, turnês, exportação de estatísticas, opções avançadas de PDF e suporte prioritário.",
        ],
      },
      {
        id: "pre-release",
        heading: "Período de pré-lançamento",
        blocks: [
          "Enquanto a cobrança não estiver ativa, todos os recursos ficam liberados sem custo e nenhum valor é cobrado.",
          "O início da cobrança será comunicado por e-mail e aviso na plataforma com antecedência mínima de 30 dias. Nenhum plano pago é contratado sem a sua ação expressa.",
        ],
      },
      {
        id: "trial",
        heading: "Período de teste",
        blocks: [
          "Com a cobrança ativa, novas contas recebem 30 dias gratuitos do plano Pro, sem necessidade de cadastrar cartão.",
          "Avisamos por e-mail e na plataforma 3 dias antes do fim do teste. Ao final, se você não contratar um plano, o teste simplesmente termina: nada é cobrado, o seu conteúdo é preservado e continua disponível para consulta e exportação, e os recursos e limites passam a ser os da conta sem plano.",
          "O período de teste é concedido uma vez por pessoa. Criar contas para obter novos testes é considerado abuso.",
        ],
      },
      {
        id: "contracting",
        heading: "Contratação e pagamento",
        blocks: [
          "Antes de concluir a contratação, você verá um resumo com o plano, o valor, a periodicidade, a forma de pagamento e as condições de renovação e cancelamento. A confirmação é enviada por e-mail.",
          "Os pagamentos são processados por um processador de pagamentos parceiro. O Setlyst não armazena os dados completos do cartão.",
          "Se um pagamento não for aprovado, a assinatura pode ficar pendente por um período de tolerância. Persistindo a falta de pagamento, a assinatura expira e a conta passa a não ter plano, sem perda de conteúdo.",
        ],
      },
      {
        id: "renewal",
        heading: "Renovação",
        blocks: [
          "A assinatura é renovada automaticamente ao fim de cada período (mensal ou anual), pelo preço vigente, até que você a cancele.",
          "Nas assinaturas anuais, enviamos um lembrete por e-mail com pelo menos 7 dias de antecedência da renovação.",
        ],
      },
      {
        id: "cancellation",
        heading: "Cancelamento",
        blocks: [
          "Você pode cancelar a qualquer momento em Configurações, na seção Assinatura, ou pelo e-mail de atendimento, sem multa e sem necessidade de justificativa.",
          "O cancelamento impede a próxima renovação. O plano continua ativo até o fim do período já pago, e depois a conta passa a não ter plano, com o conteúdo preservado.",
        ],
      },
      {
        id: "withdrawal",
        heading: "Direito de arrependimento",
        blocks: [
          "Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da contratação em até 7 dias contados da contratação, com reembolso integral de todos os valores pagos, inclusive quando já tiver usado o plano nesse período.",
          "Para exercer esse direito, use a opção de cancelamento na plataforma ou escreva para o e-mail de atendimento. Confirmaremos o recebimento imediatamente, e o estorno será solicitado ao processador de pagamentos pelo mesmo meio usado no pagamento, nos termos do art. 5º do Decreto 7.962/2013.",
        ],
      },
      {
        id: "refunds",
        heading: "Reembolsos",
        blocks: [
          "Fora do prazo de arrependimento, não há reembolso proporcional de períodos já iniciados, pois o plano permanece ativo até o fim do período pago.",
          "Haverá reembolso, total ou proporcional, quando houver cobrança indevida, falha na prestação do serviço atribuível ao Setlyst ou nas demais hipóteses previstas em lei.",
        ],
      },
      {
        id: "plan-changes",
        heading: "Mudança de plano",
        blocks: [
          "A mudança para um plano superior vale imediatamente. A mudança para um plano inferior vale a partir da próxima renovação.",
          "Se o seu conteúdo ultrapassar os limites do novo plano, nada é excluído: você continua acessando tudo, mas não poderá criar novos itens daquele tipo até ficar dentro do limite.",
        ],
      },
      {
        id: "price-changes",
        heading: "Alteração de preços",
        blocks: [
          "Os preços podem ser reajustados. Avisaremos por e-mail com antecedência mínima de 30 dias, e o novo preço vale somente a partir da renovação seguinte ao aviso. Se não concordar, você pode cancelar antes da renovação, sem custo.",
        ],
      },
      {
        id: "promo-codes",
        heading: "Códigos promocionais e promoções",
        blocks: [
          "Códigos promocionais podem conceder dias de plano, extensão do período de teste, créditos ou desconto no próximo pagamento, conforme informado no próprio código.",
          "Cada código pode ser resgatado uma vez por conta, dentro do prazo de validade e do número máximo de resgates. Alguns códigos são restritos a contas novas.",
          "Promoções exibidas na página de Planos têm prazo de validade informado e aplicam o desconto indicado sobre o preço do plano.",
        ],
      },
      {
        id: "credits",
        heading: "Créditos",
        blocks: [
          "Créditos podem ser obtidos pelo programa de indicação, por códigos promocionais ou por concessão do Setlyst, e trocados por dias de plano conforme as recompensas exibidas na plataforma.",
          "Créditos não têm valor monetário, não podem ser convertidos em dinheiro, não são reembolsáveis e não podem ser transferidos para outras contas. Créditos com prazo de validade informado na concessão expiram ao fim desse prazo, e todos os créditos são perdidos com a exclusão da conta.",
        ],
      },
      {
        id: "referrals",
        heading: "Programa de indicação",
        blocks: [
          "Cada conta tem um código e um link de indicação. Quando uma pessoa cria uma conta nova com o seu código e confirma o e-mail, a indicação é qualificada e ambas as contas recebem créditos, nos valores exibidos na plataforma.",
          "Regras do programa:",
          {
            list: [
              "somente contas novas, de pessoas reais e diferentes de quem indica, são elegíveis;",
              "a indicação é qualificada apenas após a confirmação do e-mail da pessoa indicada;",
              "há um limite mensal de indicações recompensadas por conta, informado na plataforma;",
              "indicações entre contas criadas a partir da mesma conexão ou dispositivo podem não ser recompensadas;",
              "não é permitido divulgar o código com spam, anúncios pagos com a marca Setlyst ou informações enganosas.",
            ],
          },
          "Em caso de fraude ou abuso, o Setlyst pode cancelar créditos e indicações e aplicar as sanções previstas nos Termos de Uso. O programa pode ser alterado ou encerrado mediante aviso, preservados os créditos já concedidos.",
        ],
      },
      {
        id: "support",
        heading: "Atendimento",
        blocks: [
          `Dúvidas, pedidos de cancelamento, reembolso e reclamações podem ser enviados para ${SUPPORT_EMAIL}. Respondemos em até 5 dias úteis.`,
        ],
      },
    ],
  },

  en: {
    title: "Subscription Terms",
    summary:
      "Plans, trial, renewal, cancellation, right of withdrawal, refunds, credits and referrals.",
    sections: [
      {
        id: "scope",
        heading: "Scope",
        blocks: [
          "These Subscription Terms supplement the Terms of Use and govern subscriptions to Setlyst's paid plans. In case of conflict regarding subscriptions, these Terms prevail.",
        ],
      },
      {
        id: "supplier",
        heading: "Supplier identification",
        blocks: [
          `In compliance with Brazilian Decree 7,962/2013: ${CONTROLLER.name}, CNPJ ${CONTROLLER.taxId}, address ${CONTROLLER.address}, support e-mail ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        id: "plans",
        heading: "Plans",
        blocks: [
          "Setlyst offers the Basic, Intermediate and Pro plans, billed monthly or yearly. Prices in Brazilian reais, usage limits and the features of each plan are clearly described on the Plans page and shown again before you confirm the subscription.",
          "Plan-exclusive features include, depending on the plan: creating bands, tours, statistics export, advanced PDF options and priority support.",
        ],
      },
      {
        id: "pre-release",
        heading: "Pre-release period",
        blocks: [
          "While billing is not active, every feature is available free of charge and nothing is charged.",
          "The start of billing will be announced by e-mail and a notice in the platform at least 30 days in advance. No paid plan is ever taken out without your explicit action.",
        ],
      },
      {
        id: "trial",
        heading: "Trial period",
        blocks: [
          "Once billing is active, new accounts get 30 free days of the Pro plan, with no card required.",
          "We let you know by e-mail and in the platform 3 days before the trial ends. At the end, if you do not subscribe to a plan, the trial simply ends: nothing is charged, your content is kept and remains available to view and export, and your features and limits become those of an account without a plan.",
          "The trial is granted once per person. Creating accounts to obtain new trials is considered abuse.",
        ],
      },
      {
        id: "contracting",
        heading: "Subscribing and payment",
        blocks: [
          "Before completing the subscription, you will see a summary with the plan, price, billing period, payment method and renewal and cancellation conditions. The confirmation is sent by e-mail.",
          "Payments are handled by a partner payment processor. Setlyst does not store full card details.",
          "If a payment is not approved, the subscription may remain pending for a grace period. If payment is still missing, the subscription expires and the account no longer has a plan, without losing content.",
        ],
      },
      {
        id: "renewal",
        heading: "Renewal",
        blocks: [
          "The subscription renews automatically at the end of each period (monthly or yearly), at the current price, until you cancel it.",
          "For yearly subscriptions, we send an e-mail reminder at least 7 days before renewal.",
        ],
      },
      {
        id: "cancellation",
        heading: "Cancellation",
        blocks: [
          "You can cancel at any time in Settings, in the Subscription section, or through the support e-mail, with no fee and no need to give a reason.",
          "Cancelling stops the next renewal. The plan stays active until the end of the period already paid, after which the account no longer has a plan, with its content kept.",
        ],
      },
      {
        id: "withdrawal",
        heading: "Right of withdrawal",
        blocks: [
          "Under article 49 of the Brazilian Consumer Protection Code, you may withdraw from the subscription within 7 days of taking it out, with a full refund of all amounts paid, even if you have already used the plan during that period.",
          "To exercise this right, use the cancellation option in the platform or write to the support e-mail. We will confirm receipt immediately, and the refund will be requested from the payment processor through the same payment method, under article 5 of Decree 7,962/2013.",
        ],
      },
      {
        id: "refunds",
        heading: "Refunds",
        blocks: [
          "Outside the withdrawal period, there are no pro-rata refunds for periods already started, as the plan remains active until the end of the paid period.",
          "Full or partial refunds will be given for undue charges, service failures attributable to Setlyst and the other cases provided for by law.",
        ],
      },
      {
        id: "plan-changes",
        heading: "Changing plans",
        blocks: [
          "Upgrading to a higher plan takes effect immediately. Downgrading takes effect at the next renewal.",
          "If your content exceeds the new plan's limits, nothing is deleted: you keep access to everything, but you cannot create new items of that type until you are within the limit.",
        ],
      },
      {
        id: "price-changes",
        heading: "Price changes",
        blocks: [
          "Prices may be adjusted. We will notify you by e-mail at least 30 days in advance, and the new price applies only from the renewal following the notice. If you do not agree, you can cancel before renewal at no cost.",
        ],
      },
      {
        id: "promo-codes",
        heading: "Promo codes and promotions",
        blocks: [
          "Promo codes may grant plan days, a trial extension, credits or a discount on the next payment, as stated in the code itself.",
          "Each code can be redeemed once per account, within its validity period and maximum number of redemptions. Some codes are restricted to new accounts.",
          "Promotions shown on the Plans page have a stated end date and apply the indicated discount to the plan price.",
        ],
      },
      {
        id: "credits",
        heading: "Credits",
        blocks: [
          "Credits can be earned through the referral programme, promo codes or grants from Setlyst, and exchanged for plan days according to the rewards shown in the platform.",
          "Credits have no cash value, cannot be converted into money, are non-refundable and cannot be transferred to other accounts. Credits with an expiry date stated when granted expire at the end of that period, and all credits are lost when the account is deleted.",
        ],
      },
      {
        id: "referrals",
        heading: "Referral programme",
        blocks: [
          "Each account has a referral code and link. When someone creates a new account with your code and confirms their e-mail address, the referral qualifies and both accounts receive credits, in the amounts shown in the platform.",
          "Programme rules:",
          {
            list: [
              "only new accounts belonging to real people other than the referrer are eligible;",
              "a referral qualifies only after the referred person confirms their e-mail address;",
              "there is a monthly limit of rewarded referrals per account, shown in the platform;",
              "referrals between accounts created from the same connection or device may not be rewarded;",
              "promoting your code through spam, paid ads using the Setlyst brand or misleading information is not allowed.",
            ],
          },
          "In case of fraud or abuse, Setlyst may cancel credits and referrals and apply the sanctions set out in the Terms of Use. The programme may be changed or ended with notice, keeping credits already granted.",
        ],
      },
      {
        id: "support",
        heading: "Support",
        blocks: [
          `Questions, cancellation and refund requests and complaints can be sent to ${SUPPORT_EMAIL}. We reply within 5 business days.`,
        ],
      },
    ],
  },

  es: {
    title: "Términos de Suscripción",
    summary:
      "Planes, período de prueba, renovación, cancelación, derecho de desistimiento, reembolsos, créditos y recomendaciones.",
    sections: [
      {
        id: "scope",
        heading: "Objeto",
        blocks: [
          "Estos Términos de Suscripción complementan los Términos de Uso y regulan la contratación de los planes de pago de Setlyst. En caso de conflicto sobre la suscripción, prevalecen estos Términos.",
        ],
      },
      {
        id: "supplier",
        heading: "Identificación del proveedor",
        blocks: [
          `En cumplimiento del Decreto brasileño 7.962/2013: ${CONTROLLER.name}, CNPJ ${CONTROLLER.taxId}, domicilio ${CONTROLLER.address}, correo de atención ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        id: "plans",
        heading: "Planes",
        blocks: [
          "Setlyst ofrece los planes Básico, Intermedio y Pro, con cobro mensual o anual. Los precios en reales, los límites de uso y las funciones de cada plan se describen con claridad en la página de Planes y se muestran de nuevo antes de confirmar la contratación.",
          "Las funciones exclusivas de los planes incluyen, según el plan: creación de bandas, giras, exportación de estadísticas, opciones avanzadas de PDF y soporte prioritario.",
        ],
      },
      {
        id: "pre-release",
        heading: "Período de prelanzamiento",
        blocks: [
          "Mientras el cobro no esté activo, todas las funciones están disponibles sin coste y no se cobra ningún importe.",
          "El inicio del cobro se anunciará por correo electrónico y aviso en la plataforma con al menos 30 días de antelación. Nunca se contrata un plan de pago sin tu acción expresa.",
        ],
      },
      {
        id: "trial",
        heading: "Período de prueba",
        blocks: [
          "Con el cobro activo, las cuentas nuevas reciben 30 días gratis del plan Pro, sin necesidad de registrar una tarjeta.",
          "Te avisamos por correo y en la plataforma 3 días antes del fin de la prueba. Al terminar, si no contratas un plan, la prueba simplemente finaliza: no se cobra nada, tu contenido se conserva y sigue disponible para consulta y exportación, y las funciones y límites pasan a ser los de una cuenta sin plan.",
          "La prueba se concede una vez por persona. Crear cuentas para obtener nuevas pruebas se considera abuso.",
        ],
      },
      {
        id: "contracting",
        heading: "Contratación y pago",
        blocks: [
          "Antes de completar la contratación verás un resumen con el plan, el precio, la periodicidad, la forma de pago y las condiciones de renovación y cancelación. La confirmación se envía por correo electrónico.",
          "Los pagos los procesa un procesador de pagos asociado. Setlyst no guarda los datos completos de la tarjeta.",
          "Si un pago no se aprueba, la suscripción puede quedar pendiente durante un período de gracia. Si persiste la falta de pago, la suscripción caduca y la cuenta queda sin plan, sin pérdida de contenido.",
        ],
      },
      {
        id: "renewal",
        heading: "Renovación",
        blocks: [
          "La suscripción se renueva automáticamente al final de cada período (mensual o anual), al precio vigente, hasta que la canceles.",
          "En las suscripciones anuales, enviamos un recordatorio por correo con al menos 7 días de antelación a la renovación.",
        ],
      },
      {
        id: "cancellation",
        heading: "Cancelación",
        blocks: [
          "Puedes cancelar en cualquier momento en Configuración, en la sección Suscripción, o por el correo de atención, sin penalización y sin necesidad de justificarlo.",
          "La cancelación impide la siguiente renovación. El plan sigue activo hasta el final del período ya pagado y después la cuenta queda sin plan, con el contenido conservado.",
        ],
      },
      {
        id: "withdrawal",
        heading: "Derecho de desistimiento",
        blocks: [
          "Conforme al artículo 49 del Código de Defensa del Consumidor de Brasil, puedes desistir de la contratación en un plazo de 7 días desde que la realizaste, con reembolso íntegro de todos los importes pagados, incluso si ya usaste el plan en ese período.",
          "Para ejercer este derecho, usa la opción de cancelación de la plataforma o escribe al correo de atención. Confirmaremos la recepción de inmediato, y el reembolso se solicitará al procesador de pagos por el mismo medio de pago, conforme al artículo 5 del Decreto 7.962/2013.",
        ],
      },
      {
        id: "refunds",
        heading: "Reembolsos",
        blocks: [
          "Fuera del plazo de desistimiento, no hay reembolso proporcional de períodos ya iniciados, porque el plan sigue activo hasta el final del período pagado.",
          "Habrá reembolso total o parcial en caso de cobro indebido, fallo del servicio atribuible a Setlyst y demás supuestos previstos en la ley.",
        ],
      },
      {
        id: "plan-changes",
        heading: "Cambio de plan",
        blocks: [
          "El cambio a un plan superior se aplica de inmediato. El cambio a un plan inferior se aplica desde la siguiente renovación.",
          "Si tu contenido supera los límites del nuevo plan, no se elimina nada: sigues accediendo a todo, pero no podrás crear nuevos elementos de ese tipo hasta estar dentro del límite.",
        ],
      },
      {
        id: "price-changes",
        heading: "Cambios de precio",
        blocks: [
          "Los precios pueden ajustarse. Te avisaremos por correo con al menos 30 días de antelación, y el nuevo precio solo se aplica desde la renovación siguiente al aviso. Si no estás de acuerdo, puedes cancelar antes de la renovación sin coste.",
        ],
      },
      {
        id: "promo-codes",
        heading: "Códigos promocionales y promociones",
        blocks: [
          "Los códigos promocionales pueden conceder días de plan, ampliación de la prueba, créditos o un descuento en el próximo pago, según se indique en el propio código.",
          "Cada código puede canjearse una vez por cuenta, dentro de su plazo de validez y del número máximo de canjes. Algunos códigos están restringidos a cuentas nuevas.",
          "Las promociones mostradas en la página de Planes tienen una fecha de fin indicada y aplican el descuento señalado al precio del plan.",
        ],
      },
      {
        id: "credits",
        heading: "Créditos",
        blocks: [
          "Los créditos pueden obtenerse con el programa de recomendaciones, con códigos promocionales o por concesión de Setlyst, y canjearse por días de plan según las recompensas mostradas en la plataforma.",
          "Los créditos no tienen valor monetario, no pueden convertirse en dinero, no son reembolsables y no pueden transferirse a otras cuentas. Los créditos con fecha de caducidad indicada al concederse caducan al final de ese plazo, y todos los créditos se pierden al eliminar la cuenta.",
        ],
      },
      {
        id: "referrals",
        heading: "Programa de recomendaciones",
        blocks: [
          "Cada cuenta tiene un código y un enlace de recomendación. Cuando alguien crea una cuenta nueva con tu código y confirma su correo, la recomendación se cualifica y ambas cuentas reciben créditos, en los importes mostrados en la plataforma.",
          "Reglas del programa:",
          {
            list: [
              "solo son elegibles cuentas nuevas de personas reales y distintas de quien recomienda;",
              "la recomendación se cualifica solo después de que la persona recomendada confirme su correo;",
              "existe un límite mensual de recomendaciones recompensadas por cuenta, indicado en la plataforma;",
              "las recomendaciones entre cuentas creadas desde la misma conexión o dispositivo pueden no recompensarse;",
              "no se permite promocionar el código con spam, anuncios pagados con la marca Setlyst ni información engañosa.",
            ],
          },
          "En caso de fraude o abuso, Setlyst puede cancelar créditos y recomendaciones y aplicar las sanciones previstas en los Términos de Uso. El programa puede cambiar o terminar con aviso previo, conservando los créditos ya concedidos.",
        ],
      },
      {
        id: "support",
        heading: "Atención",
        blocks: [
          `Las dudas, solicitudes de cancelación y reembolso y reclamaciones pueden enviarse a ${SUPPORT_EMAIL}. Respondemos en un plazo de 5 días hábiles.`,
        ],
      },
    ],
  },
};
