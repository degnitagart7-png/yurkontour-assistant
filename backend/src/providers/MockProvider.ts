import {
  AIProvider,
  AnalysisRequest,
  AnalysisResponse,
  CaseType,
  RiskLevel,
  ExtractedFacts,
  QuestionCategory,
  ClaimCategory,
} from "./AIProvider";

// ============ KEYWORD DICTIONARIES ============

const CLAIM_KEYWORDS = [
  "брак", "бракован", "сломал", "сломан", "не работает", "неисправ",
  "возврат", "вернуть", "верните", "требую", "деньги", "компенсац",
  "суд", "жалоб", "роспотребнадзор", "претенз", "некачественн",
  "обман", "мошен", "разбит", "поврежд", "дефект", "трещин",
  "не включается", "перестал", "гарантийн", "ремонт", "замен",
  "адвокат", "прокуратур", "иск", "штраф", "неустойк",
  "не соответств", "другой цвет", "другая модель", "не то прислали",
  "не доставили", "просрочка", "задержка", "опоздание",
];

const QUESTION_KEYWORDS: Record<QuestionCategory, string[]> = {
  specs: [
    "характеристик", "мощность", "вес", "размер", "объем", "объём", "габарит",
    "параметр", "скорость", "напряжение", "ватт", "литр", "децибел",
    "уровень шума", "энергопотреблен", "класс энерг", "диагональ",
    "разрешение", "производительность",
  ],
  compatibility: [
    "совместим", "подходит", "подойдет", "подойдёт", "для модели",
    "к модели", "от модели", "заменить на", "аналог", "взаимозамен",
    "фильтр", "насадк", "аксессуар", "запчаст", "картридж",
  ],
  completeness: [
    "комплект", "в наборе", "в коробке", "что входит", "что идет",
    "что идёт", "поставк", "включен", "прилагается",
  ],
  warranty: [
    "гарантия", "гарантийн", "срок службы", "сколько гарантия",
    "обслуживан", "сервис", "сервисный центр",
  ],
  delivery: [
    "доставк", "когда придет", "когда придёт", "где заказ", "трек",
    "отслеж", "отправ", "курьер", "пункт выдачи", "статус заказ",
    "сроки доставк",
  ],
  other: [],
};

const RISK_HIGH = [
  "суд", "иск", "исковое", "адвокат", "прокуратур", "роспотребнадзор",
  "жалоб", "штраф", "неустойк", "штраф 50", "моральный вред",
  "судебное", "буду судиться",
];

const RISK_MEDIUM = [
  "требую", "требование", "верните деньги", "возврат денег",
  "возврат средств", "вернуть деньги", "компенсац",
  "в последний раз", "третий раз", "который раз", "игнорируете",
  "мошенники", "обманщики",
];

const CLAIM_CATEGORIES: Record<ClaimCategory, string[]> = {
  court_threat: ["суд", "иск", "адвокат", "прокуратур", "роспотребнадзор", "жалоб", "штраф", "неустойк"],
  return_demand: ["возврат", "вернуть", "верните", "возврат денег", "вернуть деньги"],
  defect: ["дефект", "брак", "бракован", "некачественн", "трещин", "разбит"],
  malfunction: ["не работает", "неисправ", "сломал", "перестал", "не включается", "не запускается"],
  mismatch: ["не соответств", "другой цвет", "другая модель", "не то прислали", "не тот товар"],
  incomplete: ["некомплект", "не хватает", "нет в комплекте", "отсутствует"],
  delivery_delay: ["не доставили", "просрочка", "задержка доставки", "опоздание", "не привезли"],
  other: [],
};

const ORDER_REGEX = /(?:заказ[а-яё]*\s*(?:№|#|номер)?\s*)(\d{5,})/i;
const ORDER_REGEX2 = /(?:№|#)\s*(\d{5,})/;
const DATE_REGEX = /(\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4})|(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s*\d{0,4})/i;
const PRODUCT_PATTERNS = [
  /(?:купил[а-яё]*|заказал[а-яё]*|приобрел[а-яё]*|модель|товар)\s+([A-ZА-ЯЁa-zа-яё][A-Za-zА-ЯЁа-яё0-9\s\-]{3,40})/i,
  /([A-Z][A-Za-z]+\s+[A-Z0-9][A-Za-z0-9\-\/]+)/,
];

// ============ HELPER FUNCTIONS ============

function lower(s: string): string {
  return s.toLowerCase();
}

function matchesAny(text: string, keywords: string[]): boolean {
  const t = lower(text);
  return keywords.some((kw) => t.includes(lower(kw)));
}

function countMatches(text: string, keywords: string[]): number {
  const t = lower(text);
  return keywords.filter((kw) => t.includes(lower(kw))).length;
}

// ============ REPLY TEMPLATES ============

const QUESTION_REPLIES: Record<QuestionCategory, { reply: string; questions: string[] }> = {
  specs: {
    reply: "Здравствуйте! Спасибо за ваш вопрос. Подробные характеристики данного товара указаны в карточке товара в разделе «Характеристики». Если вам нужна информация по конкретному параметру — уточните, пожалуйста, что именно вас интересует, и я оперативно предоставлю данные.",
    questions: [
      "Какой именно параметр вас интересует?",
      "Укажите, пожалуйста, точную модель товара.",
      "Вас интересуют технические характеристики или габариты?",
    ],
  },
  compatibility: {
    reply: "Здравствуйте! Благодарим за обращение. Для точного ответа о совместимости, пожалуйста, уточните полные названия моделей. Мы проверим совместимость и ответим в кратчайшие сроки.",
    questions: [
      "Укажите, пожалуйста, точную модель основного устройства.",
      "Какой аксессуар/запчасть вы хотите приобрести?",
      "У вас есть артикул интересующего аксессуара?",
    ],
  },
  completeness: {
    reply: "Здравствуйте! В стандартную комплектацию входят все позиции, указанные в карточке товара в разделе «Комплектация». Если какого-то элемента не хватает — пожалуйста, сообщите, что именно отсутствует.",
    questions: [
      "Какой именно элемент комплектации вас интересует?",
      "Вы уже получили товар и обнаружили нехватку?",
    ],
  },
  warranty: {
    reply: "Здравствуйте! Гарантийный срок на данный товар указан в карточке товара. Гарантийное обслуживание осуществляется через авторизованные сервисные центры производителя. Если у вас возникла гарантийная ситуация — опишите проблему, и мы подскажем порядок действий.",
    questions: [
      "Когда был приобретён товар?",
      "Возникла ли проблема с товаром или вопрос информационный?",
      "Укажите модель товара для уточнения условий гарантии.",
    ],
  },
  delivery: {
    reply: "Здравствуйте! Информация о статусе доставки доступна в вашем личном кабинете на маркетплейсе. Если статус не обновляется или есть задержка — пожалуйста, укажите номер заказа, и мы проверим информацию.",
    questions: [
      "Укажите, пожалуйста, номер вашего заказа.",
      "На какой маркетплейс был оформлен заказ?",
      "Когда был оформлен заказ?",
    ],
  },
  other: {
    reply: "Здравствуйте! Спасибо за обращение. Пожалуйста, уточните ваш вопрос, чтобы мы могли дать максимально точный ответ.",
    questions: [
      "Уточните, пожалуйста, что именно вас интересует.",
      "Укажите модель или название товара.",
    ],
  },
};

const CLAIM_REPLIES: Record<ClaimCategory, { reply: string; formalReply: string; docs: string[] }> = {
  defect: {
    reply: "Здравствуйте! Нам очень жаль, что вы столкнулись с этой ситуацией. Мы зарегистрировали ваше обращение и обязательно разберёмся. Пожалуйста, предоставьте номер заказа и фото/видео дефекта — мы оперативно предложим решение.",
    formalReply: "Уважаемый покупатель!\n\nНастоящим подтверждаем получение Вашего обращения относительно ненадлежащего качества товара.\n\nВ соответствии со ст. 18 Закона РФ «О защите прав потребителей», Вы имеете право предъявить требования к продавцу при обнаружении недостатков товара.\n\nДля рассмотрения Вашего обращения просим предоставить:\n— номер заказа;\n— фотографии/видео, подтверждающие наличие дефекта;\n— описание обстоятельств обнаружения недостатка.\n\nВаше обращение будет рассмотрено в установленные законодательством сроки (ст. 22 ЗоЗПП — 10 дней).\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Фото дефекта", "Видео, демонстрирующее дефект", "Дата обнаружения проблемы", "Копия чека / подтверждение покупки"],
  },
  malfunction: {
    reply: "Здравствуйте! Приносим извинения за неудобства. Мы зарегистрировали вашу жалобу на неисправность. Пожалуйста, укажите номер заказа, модель товара и приложите видео, демонстрирующее проблему.",
    formalReply: "Уважаемый покупатель!\n\nВаше обращение о неисправности товара получено и зарегистрировано.\n\nВ соответствии со ст. 18 Закона РФ «О защите прав потребителей», при обнаружении недостатков товара Вы вправе потребовать замены, ремонта или возврата уплаченной суммы.\n\nОбращаем внимание: если товар относится к технически сложным (Постановление Правительства РФ №924), возврат/замена при любом недостатке возможен в течение 15 дней с момента передачи. После 15 дней — при наличии существенного недостатка.\n\nДля рассмотрения просим предоставить:\n— номер заказа;\n— видео, демонстрирующее неисправность;\n— описание условий эксплуатации.\n\nПродавец вправе провести проверку качества товара (п. 5 ст. 18 ЗоЗПП).\n\nСрок рассмотрения — 10 дней (ст. 22 ЗоЗПП).\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Модель/наименование товара", "Видео неисправности", "Фото товара", "Дата покупки", "Описание условий эксплуатации"],
  },
  mismatch: {
    reply: "Здравствуйте! Нам жаль, что товар не соответствует ожиданиям. Пожалуйста, уточните, в чём именно расхождение с описанием, и приложите фото товара.",
    formalReply: "Уважаемый покупатель!\n\nВаше обращение о несоответствии товара описанию получено.\n\nВ соответствии со ст. 26.1 Закона РФ «О защите прав потребителей», при дистанционном способе продажи Вы вправе отказаться от товара в течение 7 дней после передачи.\n\nДля рассмотрения просим предоставить:\n— номер заказа;\n— фото полученного товара;\n— описание расхождения с карточкой товара.\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Фото полученного товара", "Скриншот описания из карточки товара", "Описание расхождения"],
  },
  incomplete: {
    reply: "Здравствуйте! Приносим извинения за ситуацию с комплектацией. Пожалуйста, укажите номер заказа и что именно отсутствует в комплекте. Приложите фото содержимого упаковки.",
    formalReply: "Уважаемый покупатель!\n\nВаше обращение о неполной комплектации товара получено.\n\nДля оперативного решения просим предоставить:\n— номер заказа;\n— перечень отсутствующих компонентов;\n— фото содержимого упаковки.\n\nМы рассмотрим обращение и предложим решение в кратчайшие сроки.\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Фото содержимого упаковки", "Перечень отсутствующих элементов"],
  },
  delivery_delay: {
    reply: "Здравствуйте! Приносим извинения за задержку доставки. Укажите, пожалуйста, номер заказа — мы проверим статус и сообщим актуальную информацию.",
    formalReply: "Уважаемый покупатель!\n\nВаше обращение о задержке доставки получено.\n\nМы проверим статус Вашего заказа и предоставим актуальную информацию. Напоминаем, что сроки доставки зависят от логистической службы маркетплейса.\n\nДля проверки просим указать номер заказа.\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Дата оформления заказа", "Ожидаемая дата доставки"],
  },
  return_demand: {
    reply: "Здравствуйте! Мы готовы рассмотреть ваше обращение о возврате. Пожалуйста, укажите номер заказа и причину возврата. Для дистанционной покупки срок возврата качественного товара — 7 дней (ст. 26.1 ЗоЗПП).",
    formalReply: "Уважаемый покупатель!\n\nВаше обращение о возврате товара получено и зарегистрировано.\n\nВ соответствии со ст. 26.1 Закона РФ «О защите прав потребителей», при дистанционном способе продажи Вы вправе отказаться от товара в течение 7 дней после его передачи при условии сохранения товарного вида и документа, подтверждающего покупку.\n\nДля оформления возврата просим предоставить:\n— номер заказа;\n— причину возврата;\n— фотографии товара и упаковки.\n\nСрок рассмотрения — 10 дней (ст. 22 ЗоЗПП).\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Причина возврата", "Фото товара", "Фото упаковки", "Подтверждение покупки"],
  },
  court_threat: {
    reply: "Здравствуйте! Благодарим за обращение. Мы серьёзно относимся к каждой претензии и заинтересованы в урегулировании ситуации в досудебном порядке. Ваше обращение передано ответственному специалисту. Пожалуйста, предоставьте номер заказа и подробное описание проблемы.",
    formalReply: "Уважаемый покупатель!\n\nНастоящим подтверждаем получение Вашего обращения.\n\nМы заинтересованы в урегулировании ситуации в досудебном порядке и готовы рассмотреть Ваши требования в соответствии с законодательством РФ.\n\nВ соответствии со ст. 22 Закона РФ «О защите прав потребителей», срок рассмотрения претензии составляет 10 дней с момента получения.\n\nДля объективного рассмотрения просим предоставить:\n— номер заказа;\n— подробное описание проблемы;\n— фото/видео материалы;\n— копию чека или подтверждение покупки;\n— Ваши требования в конкретной форме.\n\nОбращаем внимание, что в соответствии с п. 5 ст. 18 ЗоЗПП, продавец вправе провести проверку качества товара.\n\nО результатах рассмотрения Вы будете уведомлены в установленный срок.\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Подробное описание проблемы", "Фото/видео материалы", "Копия чека / подтверждение покупки", "Серийный номер товара", "Дата покупки", "Конкретные требования покупателя"],
  },
  other: {
    reply: "Здравствуйте! Мы приняли вашу претензию и обязательно рассмотрим. Для оперативного решения, пожалуйста, предоставьте номер заказа и подробное описание проблемы.",
    formalReply: "Уважаемый покупатель!\n\nВаше обращение получено и зарегистрировано.\n\nДля рассмотрения просим предоставить номер заказа и подробное описание ситуации.\n\nСрок рассмотрения — 10 дней (ст. 22 ЗоЗПП).\n\nС уважением,\nСлужба работы с обращениями",
    docs: ["Номер заказа", "Описание проблемы", "Подтверждающие материалы"],
  },
};

// ============ MOCK PROVIDER ============

export class MockProvider implements AIProvider {
  readonly name = "mock";

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const { message } = request;

    // 1. Classify
    const claimScore = countMatches(message, CLAIM_KEYWORDS);
    const isClaim = claimScore >= 2 || (claimScore >= 1 && message.length > 80);

    const type: CaseType = isClaim ? "claim" : "question";

    // 2. Categorize
    let category: QuestionCategory | ClaimCategory;
    let confidence: number;

    if (type === "claim") {
      category = this.detectClaimCategory(message);
      confidence = Math.min(0.65 + claimScore * 0.08, 0.95);
    } else {
      category = this.detectQuestionCategory(message);
      const qFlat = Object.values(QUESTION_KEYWORDS).flat();
      const qScore = countMatches(message, qFlat);
      confidence = Math.min(0.6 + qScore * 0.1, 0.95);
    }

    // 3. Extract facts
    const facts = this.extractFacts(message);

    // Override product name from product context if available
    if (request.product_context?.name) {
      facts.product = request.product_context.name;
    }

    // 4. Score risk
    const { risk_level, risk_factors } = this.scoreRisk(message, facts);

    // 5. Generate replies
    let short_reply: string;
    let formal_reply: string | null = null;
    let clarifying_questions: string[] = [];
    let missing_documents: string[] = [];
    let lawyer_summary: string | null = null;
    let deadline_days: string | null = null;
    let financial_risk_estimate: string | null = null;
    let required_legal_actions: string[] = [];

    if (type === "question") {
      const tmpl = QUESTION_REPLIES[category as QuestionCategory] || QUESTION_REPLIES.other;
      short_reply = tmpl.reply;
      clarifying_questions = tmpl.questions;

      // If product context is available and this is a specs question, enrich the reply
      if (category === "specs" && request.product_context?.specs?.length) {
        const specLines = request.product_context.specs
          .slice(0, 10)
          .map((s) => `${s.key}: ${s.value}`)
          .join("\n");
        const productName = request.product_context.name || "данного товара";
        short_reply = `Здравствуйте! Вот характеристики ${productName}:\n\n${specLines}\n\nЕсли вам нужна информация по конкретному параметру — уточните, пожалуйста.`;
      }
    } else {
      const tmpl = CLAIM_REPLIES[category as ClaimCategory] || CLAIM_REPLIES.other;
      short_reply = tmpl.reply;
      formal_reply = tmpl.formalReply;
      missing_documents = tmpl.docs;
      clarifying_questions = [
        "Укажите номер заказа.",
        "Опишите проблему подробнее.",
        "Какое решение для вас было бы приемлемым?",
      ];

      // Lawyer contour fields
      deadline_days = this.computeDeadline(category as ClaimCategory);
      financial_risk_estimate = this.computeFinancialRisk(risk_level, category as ClaimCategory);
      required_legal_actions = this.computeLegalActions(category as ClaimCategory, risk_level);

      if (risk_level === "high") {
        lawyer_summary = this.generateLawyerSummary(message, facts, category as ClaimCategory, risk_factors);
      }
    }

    return {
      type,
      category,
      confidence,
      risk_level,
      extracted_facts: facts,
      short_reply,
      formal_reply,
      clarifying_questions,
      missing_documents,
      lawyer_summary,
      deadline_days,
      financial_risk_estimate,
      required_legal_actions,
    };
  }

  private detectQuestionCategory(message: string): QuestionCategory {
    let best: QuestionCategory = "other";
    let bestCount = 0;
    for (const [cat, keywords] of Object.entries(QUESTION_KEYWORDS)) {
      if (cat === "other") continue;
      const count = countMatches(message, keywords);
      if (count > bestCount) {
        bestCount = count;
        best = cat as QuestionCategory;
      }
    }
    return best;
  }

  private detectClaimCategory(message: string): ClaimCategory {
    for (const [cat, keywords] of Object.entries(CLAIM_CATEGORIES)) {
      if (cat === "other") continue;
      if (matchesAny(message, keywords)) {
        return cat as ClaimCategory;
      }
    }
    return "other";
  }

  private extractFacts(message: string): ExtractedFacts {
    const facts: ExtractedFacts = {
      order_number: null,
      product: null,
      purchase_date: null,
      problem: null,
      customer_demand: null,
      risk_markers: [],
    };

    // Order number extraction
    const orderMatch = message.match(ORDER_REGEX) || message.match(ORDER_REGEX2);
    if (orderMatch) facts.order_number = orderMatch[1];

    // Date
    const dateMatch = message.match(DATE_REGEX);
    if (dateMatch) facts.purchase_date = dateMatch[0];

    // Product
    for (const pattern of PRODUCT_PATTERNS) {
      const m = message.match(pattern);
      if (m) {
        facts.product = m[1]?.trim() || null;
        break;
      }
    }

    // Problem
    if (matchesAny(message, ["не включается", "не включ"])) facts.problem = "Не включается";
    else if (matchesAny(message, ["перестал"])) facts.problem = "Перестал работать";
    else if (matchesAny(message, ["сломал"])) facts.problem = "Поломка";
    else if (matchesAny(message, ["не работает"])) facts.problem = "Не работает";
    else if (matchesAny(message, ["дефект", "брак"])) facts.problem = "Производственный дефект";
    else if (matchesAny(message, ["не соответств"])) facts.problem = "Не соответствует описанию";
    else if (matchesAny(message, ["не доставили", "задержка", "просрочка"])) facts.problem = "Задержка доставки";

    // Demand
    if (matchesAny(message, ["замен"])) facts.customer_demand = "Замена товара";
    else if (matchesAny(message, ["возврат", "вернуть", "верните"])) facts.customer_demand = "Возврат денежных средств";
    else if (matchesAny(message, ["ремонт"])) facts.customer_demand = "Гарантийный ремонт";
    else if (matchesAny(message, ["компенсац"])) facts.customer_demand = "Компенсация";

    // Risk markers
    const markers: string[] = [];
    if (matchesAny(message, ["суд", "иск"])) markers.push("Угроза суда");
    if (matchesAny(message, ["роспотребнадзор"])) markers.push("Жалоба в Роспотребнадзор");
    if (matchesAny(message, ["прокуратур"])) markers.push("Прокуратура");
    if (matchesAny(message, ["адвокат", "юрист"])) markers.push("Привлечение юриста");
    if (matchesAny(message, ["неустойк"])) markers.push("Требование неустойки");
    if (matchesAny(message, ["штраф 50", "штраф пятьдесят"])) markers.push("Штраф 50% (п.6 ст.13 ЗоЗПП)");
    if (matchesAny(message, ["моральный вред"])) markers.push("Компенсация морального вреда");
    facts.risk_markers = markers;

    return facts;
  }

  private scoreRisk(message: string, facts: ExtractedFacts): { risk_level: RiskLevel; risk_factors: string[] } {
    let score = 0;
    const factors: string[] = [];

    if (matchesAny(message, RISK_HIGH)) {
      score += 40;
      factors.push("Упоминание суда / контролирующих органов");
    }
    if (matchesAny(message, RISK_MEDIUM)) {
      score += 25;
      factors.push("Финансовые требования / эскалация");
    }
    if (facts.risk_markers.length > 0) {
      score += facts.risk_markers.length * 15;
    }

    // Emotion detection
    const exclamations = (message.match(/!/g) || []).length;
    const capsWords = (message.match(/[А-ЯЁA-Z]{3,}/g) || []).length;
    if (exclamations >= 3 || capsWords >= 2) {
      score += 10;
      factors.push("Повышенная эмоциональность");
    }

    let risk_level: RiskLevel;
    if (score >= 50) risk_level = "high";
    else if (score >= 25) risk_level = "medium";
    else risk_level = "low";

    return { risk_level, risk_factors: factors };
  }

  private generateLawyerSummary(
    message: string,
    facts: ExtractedFacts,
    category: ClaimCategory,
    riskFactors: string[]
  ): string {
    const lines: string[] = [
      "=== СВОДКА ДЛЯ ЮРИСТА ===",
      "",
      `Дата: ${new Date().toLocaleDateString("ru-RU")}`,
      `Уровень риска: ВЫСОКИЙ`,
      `Категория: ${CLAIM_CATEGORY_LABELS_INTERNAL[category] || category}`,
      "",
    ];

    if (facts.product) lines.push(`Товар: ${facts.product}`);
    if (facts.purchase_date) lines.push(`Дата покупки: ${facts.purchase_date}`);
    if (facts.problem) lines.push(`Проблема: ${facts.problem}`);
    if (facts.customer_demand) lines.push(`Требование: ${facts.customer_demand}`);

    if (facts.risk_markers.length > 0) {
      lines.push("", "Рисковые маркеры:");
      facts.risk_markers.forEach((m) => lines.push(`  - ${m}`));
    }

    if (riskFactors.length > 0) {
      lines.push("", "Факторы риска:");
      riskFactors.forEach((f) => lines.push(`  - ${f}`));
    }

    lines.push("", "Исходное сообщение:", `«${message.slice(0, 500)}»`);
    lines.push("", "========================");

    return lines.join("\n");
  }

  private computeDeadline(category: ClaimCategory): string {
    switch (category) {
      case "return_demand":
        return "10 дней на возврат денежных средств (ст. 22 ЗоЗПП)";
      case "court_threat":
        return "10 дней на рассмотрение претензии (ст. 22 ЗоЗПП)";
      case "defect":
      case "malfunction":
        return "20 дней на проверку качества / 10 дней на возврат (ст. 21, 22 ЗоЗПП)";
      case "mismatch":
        return "7 дней на возврат при дистанционной покупке (ст. 26.1 ЗоЗПП)";
      case "delivery_delay":
        return "Новый срок по соглашению сторон (ст. 23.1 ЗоЗПП)";
      case "incomplete":
        return "10 дней на доукомплектацию (ст. 22 ЗоЗПП)";
      default:
        return "10 дней (ст. 22 ЗоЗПП)";
    }
  }

  private computeFinancialRisk(riskLevel: RiskLevel, category: ClaimCategory): string {
    if (riskLevel === "high") {
      return "Цена товара + штраф 50% (п.6 ст.13 ЗоЗПП) + неустойка 1%/день (ст. 23) + моральный вред";
    }
    if (riskLevel === "medium") {
      if (category === "return_demand") {
        return "Цена товара + возможная неустойка 1%/день при просрочке возврата";
      }
      return "Цена товара + расходы на экспертизу";
    }
    return "Стоимость устранения недостатка или замены товара";
  }

  private computeLegalActions(category: ClaimCategory, riskLevel: RiskLevel): string[] {
    const actions: string[] = ["Зарегистрировать обращение во внутренней системе"];

    if (category === "defect" || category === "malfunction") {
      actions.push("Назначить проверку качества товара (п. 5 ст. 18 ЗоЗПП)");
      actions.push("Запросить фото/видео подтверждение дефекта");
    }
    if (category === "return_demand" || category === "mismatch") {
      actions.push("Запросить реквизиты для возврата денежных средств");
      actions.push("Подготовить акт приёма-передачи товара");
    }
    if (category === "court_threat" || riskLevel === "high") {
      actions.push("Передать кейс юристу для оценки");
      actions.push("Подготовить досудебный ответ в установленные сроки");
      actions.push("Проверить сроки и основания по ЗоЗПП");
    }
    if (category === "delivery_delay") {
      actions.push("Проверить статус доставки в логистической системе");
      actions.push("Связаться с логистическим партнёром");
    }

    actions.push("Запросить номер заказа и дату покупки (если не указаны)");

    return actions;
  }
}

const CLAIM_CATEGORY_LABELS_INTERNAL: Record<string, string> = {
  defect: "Дефект товара",
  malfunction: "Неисправность",
  mismatch: "Несоответствие описанию",
  incomplete: "Некомплект",
  delivery_delay: "Просрочка доставки",
  return_demand: "Требование возврата",
  court_threat: "Угроза суда",
  other: "Другое",
};
