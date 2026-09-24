/*
 * Termos de Assinatura do Setlyst (CDC, Decreto 7.962/2013).
 *
 * Refletem o modelo de cobrança da API (billing: planos, período de teste,
 * códigos promocionais, créditos e indicações) e a integração com o Stripe
 * (checkout, portal de cobrança, mudança de plano com cobrança
 * proporcional imediata). Deve ser revisado por um advogado antes da
 * publicação definitiva.
 *
 * Compromissos que o código precisa cumprir: aviso 7 dias antes da
 * primeira cobrança de quem contrata durante o teste (4.4), novas
 * tentativas de cobrança por 14 dias, alinhadas ao Smart Retries do Stripe
 * e ao `PAYMENT_GRACE_DAYS` da API (5.3), e o botão "Desistir da
 * assinatura" em Configurações › Assinatura (8.2, `POST /billing/withdraw`).
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
          `Em cumprimento ao Decreto 7.962/2013, informamos: ${CONTROLLER.name}, ${CONTROLLER.taxIdLabel} ${CONTROLLER.taxId}, endereço ${CONTROLLER.address}, e-mail de atendimento ${SUPPORT_EMAIL}.`,
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
        id: "trial",
        heading: "Período de teste",
        blocks: [
          "Toda conta nova recebe 30 dias gratuitos do plano Pro, com todos os recursos liberados, sem necessidade de cadastrar cartão. O teste começa na criação da conta, e os dias restantes ficam sempre visíveis na plataforma.",
          "Avisamos por e-mail e na plataforma 3 dias antes do fim do teste. Ao final, se você não contratar um plano, o teste simplesmente termina: nada é cobrado, o seu conteúdo é preservado e continua disponível para consulta e exportação, e os recursos e limites passam a ser os da conta sem plano.",
          "O período de teste é concedido uma vez por pessoa. Criar contas para obter novos testes é considerado abuso.",
          "Se você contratar um plano durante o período de teste, o teste continua até a data informada na tela de contratação, e a primeira cobrança será feita automaticamente nessa data, no valor e na periodicidade escolhidos. Enviaremos um aviso por e-mail com pelo menos 7 dias de antecedência da primeira cobrança (ou logo após a contratação, se ela ocorrer a menos de 7 dias dessa data), informando o valor, a data e como cancelar. Se você cancelar antes dessa data, nada será cobrado.",
        ],
      },
      {
        id: "contracting",
        heading: "Contratação e pagamento",
        blocks: [
          "Antes de concluir a contratação, você verá um resumo com o plano, o valor, a periodicidade, a forma de pagamento e as condições de renovação, cancelamento e desistência, com link para estes Termos de Assinatura. A contratação só é concluída após você aceitar expressamente estes Termos de Assinatura. A confirmação é enviada por e-mail.",
          "Os pagamentos são feitos com os meios exibidos na página de pagamento (como cartão de crédito) e processados pelo Stripe, em página de pagamento segura do próprio Stripe. O Setlyst não recebe nem armazena os dados do cartão.",
          "Se um pagamento não for aprovado, faremos novas tentativas de cobrança por até 14 dias e avisaremos você por e-mail para atualizar a forma de pagamento; durante esse período o plano permanece ativo. Encerradas as tentativas sem sucesso, a assinatura é cancelada, nenhuma nova cobrança é feita e a conta passa a não ter plano, sem perda de conteúdo.",
          "Os preços exibidos são finais, em reais, sem taxas adicionais. Pagamentos com cartão emitido no exterior podem sofrer conversão cambial e IOF cobrados pelo emissor do cartão, sem participação do Setlyst. O recibo de cada pagamento é enviado por e-mail e fica disponível no portal de cobrança, acessível em Configurações › Assinatura.",
          "Somente pessoas maiores de 18 anos, ou o responsável legal de adolescente usuário, podem contratar planos pagos.",
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
          "Conforme o art. 49 do Código de Defesa do Consumidor e o art. 5º do Decreto 7.962/2013, você pode desistir da contratação em até 7 dias contados da contratação ou, se ela ocorreu durante o período de teste, da primeira cobrança, com reembolso integral de todos os valores pagos, inclusive se já tiver usado o plano nesse período.",
          `Você pode exercer esse direito, sem justificativa, pelo botão “Desistir da assinatura” em Configurações › Assinatura, disponível durante o prazo, ou por e-mail para ${SUPPORT_EMAIL}.`,
          "Ao receber o pedido, enviaremos confirmação imediata, encerraremos a assinatura e comunicaremos imediatamente ao Stripe e à administradora do cartão para que o valor não seja lançado na fatura ou, se já lançado, seja estornado pelo mesmo meio de pagamento. O prazo para o estorno aparecer na fatura depende do emissor do cartão.",
          "Após a desistência, a conta passa a não ter plano, e o seu conteúdo é preservado.",
        ],
      },
      {
        id: "refunds",
        heading: "Reembolsos",
        blocks: [
          "Fora do prazo de arrependimento e das hipóteses de reembolso proporcional previstas nestes Termos e nos Termos de Uso, não há reembolso proporcional de períodos já iniciados, pois o plano permanece ativo até o fim do período pago.",
          "Haverá reembolso, total ou proporcional, quando houver cobrança indevida, falha na prestação do serviço atribuível ao Setlyst ou nas demais hipóteses previstas em lei.",
          "O saldo em reais gerado por mudança para plano mais barato que não tenha sido utilizado será reembolsado, mediante pedido, em caso de cancelamento definitivo ou de exclusão da conta.",
          "Se identificar uma cobrança que não reconhece, fale conosco antes de contestá-la junto ao emissor do cartão; responderemos em até 5 dias úteis. Isso não limita os seus direitos perante o emissor.",
        ],
      },
      {
        id: "plan-changes",
        heading: "Mudança de plano",
        blocks: [
          "A mudança de plano ou de periodicidade vale imediatamente. Numa mudança para um plano mais caro, a diferença proporcional ao tempo restante do período é cobrada na hora; numa mudança para um plano mais barato, o valor proporcional não utilizado vira saldo em reais na sua conta de cobrança do Stripe, abatido automaticamente das próximas cobranças e reembolsável nos termos do item 9.3. Esse saldo não se confunde com os créditos da seção 13.",
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
      {
        id: "changes",
        heading: "Alterações destes Termos",
        blocks: [
          "O Setlyst poderá alterar estes Termos de Assinatura para refletir mudanças legais, técnicas ou do serviço. Alterações relevantes serão comunicadas por e-mail e na plataforma com antecedência mínima de 15 dias da entrada em vigor, acompanhadas de resumo do que mudou; as versões anteriores permanecem disponíveis para consulta no histórico de versões deste documento. Alterações exigidas por lei, por ordem de autoridade ou para corrigir falha de segurança podem valer de imediato. Se você não concordar com a nova versão, poderá exportar seus dados e cancelar a assinatura com reembolso proporcional ao período não usufruído. Nenhuma alteração modifica o preço ou as condições de um período de assinatura já pago; reajustes de preço seguem a seção 11.",
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
          `In compliance with Brazilian Decree 7,962/2013: ${CONTROLLER.name}, ${CONTROLLER.taxIdLabel} ${CONTROLLER.taxId}, address ${CONTROLLER.address}, support e-mail ${SUPPORT_EMAIL}.`,
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
        id: "trial",
        heading: "Trial period",
        blocks: [
          "Every new account gets 30 free days of the Pro plan, with every feature unlocked and no card required. The trial starts when the account is created, and the days left are always shown in the platform.",
          "We let you know by e-mail and in the platform 3 days before the trial ends. At the end, if you do not subscribe to a plan, the trial simply ends: nothing is charged, your content is kept and remains available to view and export, and your features and limits become those of an account without a plan.",
          "The trial is granted once per person. Creating accounts to obtain new trials is considered abuse.",
          "If you subscribe to a plan during the trial, the trial continues until the date shown on the subscription screen, and the first charge is made automatically on that date, for the amount and billing period you chose. We will send you an e-mail at least 7 days before the first charge (or right after you subscribe, if you do so less than 7 days before that date) stating the amount, the date and how to cancel. If you cancel before that date, nothing is charged.",
        ],
      },
      {
        id: "contracting",
        heading: "Subscribing and payment",
        blocks: [
          "Before completing the subscription, you will see a summary with the plan, price, billing period, payment method and the renewal, cancellation and withdrawal conditions, with a link to these Subscription Terms. The subscription is only concluded after you expressly accept these Subscription Terms. The confirmation is sent by e-mail.",
          "Payments are made with the methods shown on the payment page (such as credit card) and processed by Stripe, on Stripe's own secure payment page. Setlyst never receives or stores card details.",
          "If a payment is not approved, we will retry the charge for up to 14 days and let you know by e-mail so you can update your payment method; during that period the plan remains active. If the retries end without success, the subscription is cancelled, no further charge is made and the account no longer has a plan, without losing content.",
          "The prices shown are final, in Brazilian reais, with no additional fees. Payments with a card issued abroad may be subject to currency conversion and IOF (Brazilian tax on financial transactions) charged by the card issuer, without Setlyst's involvement. The receipt for each payment is sent by e-mail and is available in the billing portal, reached from Settings › Subscription.",
          "Only people aged 18 or over, or the legal guardian of a teenage user, may subscribe to paid plans.",
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
          "Under article 49 of the Brazilian Consumer Protection Code and article 5 of Decree 7,962/2013, you may withdraw from the subscription within 7 days of taking it out or, if you subscribed during the trial period, of the first charge, with a full refund of all amounts paid, even if you have already used the plan during that period.",
          `You can exercise this right, without giving a reason, through the “Withdraw from subscription” button in Settings › Subscription, available during that period, or by e-mail to ${SUPPORT_EMAIL}.`,
          "When we receive the request, we will send an immediate confirmation, end the subscription and immediately notify Stripe and the card issuer so that the amount is not posted to your statement or, if already posted, is reversed through the same payment method. How long the reversal takes to appear on your statement depends on your card issuer.",
          "After withdrawal, the account no longer has a plan, and your content is kept.",
        ],
      },
      {
        id: "refunds",
        heading: "Refunds",
        blocks: [
          "Outside the withdrawal period and the pro-rata refund cases set out in these Terms and in the Terms of Use, there are no pro-rata refunds for periods already started, as the plan remains active until the end of the paid period.",
          "Full or partial refunds will be given for undue charges, service failures attributable to Setlyst and the other cases provided for by law.",
          "Any unused balance in reais generated by a move to a cheaper plan will be refunded, on request, if the subscription is cancelled for good or the account is deleted.",
          "If you see a charge you do not recognise, contact us before disputing it with your card issuer; we will reply within 5 business days. This does not limit your rights before the issuer.",
        ],
      },
      {
        id: "plan-changes",
        heading: "Changing plans",
        blocks: [
          "Changing plan or billing period takes effect immediately. When moving to a more expensive plan, the difference for the rest of the period is charged right away; when moving to a cheaper one, the unused amount becomes a balance in reais on your Stripe billing account, automatically deducted from your next charges and refundable under clause 9.3. This balance is not the same as the credits in section 13.",
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
      {
        id: "changes",
        heading: "Changes to these Terms",
        blocks: [
          "Setlyst may change these Subscription Terms to reflect legal, technical or service changes. Relevant changes will be communicated by e-mail and in the platform at least 15 days before they take effect, together with a summary of what changed; previous versions remain available in this document's version history. Changes required by law, by an order of an authority or to fix a security flaw may take effect immediately. If you do not agree with the new version, you may export your data and cancel the subscription with a pro-rata refund for the period not used. No change alters the price or conditions of a subscription period already paid; price adjustments follow section 11.",
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
          `En cumplimiento del Decreto brasileño 7.962/2013: ${CONTROLLER.name}, ${CONTROLLER.taxIdLabel} ${CONTROLLER.taxId}, domicilio ${CONTROLLER.address}, correo de atención ${SUPPORT_EMAIL}.`,
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
        id: "trial",
        heading: "Período de prueba",
        blocks: [
          "Toda cuenta nueva recibe 30 días gratis del plan Pro, con todas las funciones activadas y sin necesidad de registrar una tarjeta. La prueba empieza al crear la cuenta, y los días restantes siempre se ven en la plataforma.",
          "Te avisamos por correo y en la plataforma 3 días antes del fin de la prueba. Al terminar, si no contratas un plan, la prueba simplemente finaliza: no se cobra nada, tu contenido se conserva y sigue disponible para consulta y exportación, y las funciones y límites pasan a ser los de una cuenta sin plan.",
          "La prueba se concede una vez por persona. Crear cuentas para obtener nuevas pruebas se considera abuso.",
          "Si contratas un plan durante el período de prueba, la prueba continúa hasta la fecha indicada en la pantalla de contratación, y el primer cobro se realizará automáticamente en esa fecha, por el importe y la periodicidad elegidos. Te enviaremos un aviso por correo con al menos 7 días de antelación al primer cobro (o justo después de la contratación, si se hace a menos de 7 días de esa fecha), indicando el importe, la fecha y cómo cancelar. Si cancelas antes de esa fecha, no se cobrará nada.",
        ],
      },
      {
        id: "contracting",
        heading: "Contratación y pago",
        blocks: [
          "Antes de completar la contratación verás un resumen con el plan, el precio, la periodicidad, la forma de pago y las condiciones de renovación, cancelación y desistimiento, con un enlace a estos Términos de Suscripción. La contratación solo se completa después de que aceptes expresamente estos Términos de Suscripción. La confirmación se envía por correo electrónico.",
          "Los pagos se hacen con los medios que se muestran en la página de pago (como tarjeta de crédito) y los procesa Stripe, en la página de pago segura del propio Stripe. Setlyst nunca recibe ni guarda los datos de la tarjeta.",
          "Si un pago no se aprueba, haremos nuevos intentos de cobro durante un máximo de 14 días y te avisaremos por correo para que actualices la forma de pago; durante ese período el plan sigue activo. Si los intentos terminan sin éxito, la suscripción se cancela, no se hace ningún cobro más y la cuenta queda sin plan, sin pérdida de contenido.",
          "Los precios mostrados son finales, en reales, sin tasas adicionales. Los pagos con tarjeta emitida en el extranjero pueden estar sujetos a conversión de divisas e IOF (impuesto brasileño sobre operaciones financieras) cobrados por el emisor de la tarjeta, sin participación de Setlyst. El recibo de cada pago se envía por correo y está disponible en el portal de cobro, al que se accede desde Configuración › Suscripción.",
          "Solo las personas mayores de 18 años, o el tutor legal de un adolescente usuario, pueden contratar planes de pago.",
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
          "Conforme al artículo 49 del Código de Defensa del Consumidor de Brasil y al artículo 5 del Decreto 7.962/2013, puedes desistir de la contratación en un plazo de 7 días desde la contratación o, si se realizó durante el período de prueba, desde el primer cobro, con reembolso íntegro de todos los importes pagados, incluso si ya usaste el plan en ese período.",
          `Puedes ejercer este derecho, sin justificación, con el botón “Desistir de la suscripción” en Configuración › Suscripción, disponible durante el plazo, o por correo a ${SUPPORT_EMAIL}.`,
          "Al recibir la solicitud, te enviaremos una confirmación inmediata, terminaremos la suscripción y comunicaremos de inmediato a Stripe y a la emisora de la tarjeta que el importe no debe cargarse en el extracto o, si ya se cargó, debe reembolsarse por el mismo medio de pago. El plazo para que el reembolso aparezca en el extracto depende del emisor de la tarjeta.",
          "Tras el desistimiento, la cuenta queda sin plan y tu contenido se conserva.",
        ],
      },
      {
        id: "refunds",
        heading: "Reembolsos",
        blocks: [
          "Fuera del plazo de desistimiento y de los supuestos de reembolso proporcional previstos en estos Términos y en los Términos de Uso, no hay reembolso proporcional de períodos ya iniciados, porque el plan sigue activo hasta el final del período pagado.",
          "Habrá reembolso total o parcial en caso de cobro indebido, fallo del servicio atribuible a Setlyst y demás supuestos previstos en la ley.",
          "El saldo en reales generado por un cambio a un plan más barato que no se haya utilizado se reembolsará, previa solicitud, en caso de cancelación definitiva o de eliminación de la cuenta.",
          "Si identificas un cobro que no reconoces, contáctanos antes de impugnarlo ante el emisor de la tarjeta; responderemos en un plazo de 5 días hábiles. Esto no limita tus derechos ante el emisor.",
        ],
      },
      {
        id: "plan-changes",
        heading: "Cambio de plan",
        blocks: [
          "El cambio de plan o de periodicidad se aplica de inmediato. Al pasar a un plan más caro, la diferencia proporcional al resto del período se cobra en el momento; al pasar a uno más barato, el importe no utilizado queda como saldo en reales en tu cuenta de cobro de Stripe, se descuenta automáticamente de los próximos cobros y es reembolsable según el punto 9.3. Este saldo no se confunde con los créditos de la sección 13.",
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
      {
        id: "changes",
        heading: "Cambios en estos Términos",
        blocks: [
          "Setlyst podrá modificar estos Términos de Suscripción para reflejar cambios legales, técnicos o del servicio. Los cambios relevantes se comunicarán por correo electrónico y en la plataforma con al menos 15 días de antelación a su entrada en vigor, junto con un resumen de lo que cambió; las versiones anteriores siguen disponibles para consulta en el historial de versiones de este documento. Los cambios exigidos por ley, por orden de una autoridad o para corregir un fallo de seguridad pueden aplicarse de inmediato. Si no estás de acuerdo con la nueva versión, podrás exportar tus datos y cancelar la suscripción con reembolso proporcional al período no disfrutado. Ningún cambio modifica el precio ni las condiciones de un período de suscripción ya pagado; los ajustes de precio siguen la sección 11.",
        ],
      },
    ],
  },
};
