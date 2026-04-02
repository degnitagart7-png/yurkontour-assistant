/**
 * Demo test scenarios for ЮрКонтур Assistant.
 * These scenarios are used in demo mode to showcase the extension's capabilities.
 */

export interface DemoScenario {
  id: string;
  title: string;
  subtitle: string;
  marketplace: string;
  message: string;
  expectedType: "question" | "claim";
  expectedRisk: "low" | "medium" | "high";
  color: "blue" | "yellow" | "red";
  icon: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "demo-question-specs",
    title: "Вопрос по товару",
    subtitle: "Спрашивают про габариты холодильника",
    marketplace: "ozon",
    message:
      "Здравствуйте! Подскажите, пожалуйста, какой уровень шума у холодильника Samsung RB37A5200WW? В карточке товара указан класс энергопотребления A+, но не нашёл информацию о децибелах. И ещё вопрос — какой объём морозильной камеры? Хочу понять, подойдёт ли он для семьи из 4 человек. Спасибо!",
    expectedType: "question",
    expectedRisk: "low",
    color: "blue",
    icon: "question",
  },
  {
    id: "demo-question-compat",
    title: "Уточнение деталей",
    subtitle: "Совместимость фильтра с вытяжкой",
    marketplace: "wb",
    message:
      "Добрый день! У меня стиральная машина LG F1296NDS3. Хочу заказать дополнительный фильтр для воды. Подойдёт ли фильтр из вашего ассортимента к этой модели? Или нужен оригинальный аксессуар от LG? И ещё подскажите, есть ли в комплекте шланг для подключения или его нужно покупать отдельно?",
    expectedType: "question",
    expectedRisk: "low",
    color: "blue",
    icon: "search",
  },
  {
    id: "demo-claim-medium",
    title: "Претензия: Ремонт",
    subtitle: "Сломалась посудомойка, средний риск",
    marketplace: "ozon",
    message:
      "Заказ №78234521. Купил посудомоечную машину Bosch SMS25AW01R 15 марта. Через неделю перестала набирать воду, мигает индикатор ошибки E15. Не работает ни одна программа мойки. Требую возврат денег! Это бракованный товар, я очень разочарован. Верните деньги или замените на исправную модель!",
    expectedType: "claim",
    expectedRisk: "medium",
    color: "yellow",
    icon: "wrench",
  },
  {
    id: "demo-claim-high",
    title: "Претензия: Угроза судом",
    subtitle: "Техсложный товар, 15 дней прошло, высокий риск",
    marketplace: "yandex",
    message:
      "ТРЕБУЮ НЕМЕДЛЕННОГО РЕШЕНИЯ! Заказ №91002347 от 02.01.2025. Купил телевизор Samsung QE55Q60AAU — через 10 дней экран начал мерцать, появились полосы. Это ТЕХНИЧЕСКИ СЛОЖНЫЙ ТОВАР, 15 дней с покупки не прошло! По статье 18 ЗоЗПП требую полный возврат денежных средств! Если в течение 10 дней не вернёте деньги — подаю исковое заявление в суд! Также направлю жалобу в Роспотребнадзор. Буду требовать неустойку и штраф 50% по п.6 ст.13 ЗоЗПП! Мой адвокат уже готовит документы!",
    expectedType: "claim",
    expectedRisk: "high",
    color: "red",
    icon: "alert",
  },
];
