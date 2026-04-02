# ЮрКонтур Assistant

Chrome-расширение (Manifest V3, Side Panel API) — AI-помощник оператора для обработки сообщений покупателей на маркетплейсах.

## Возможности

- **Автоопределение сообщений** — Content Scripts парсят DOM на seller.ozon.ru, seller.wildberries.ru, partner.market.yandex.ru
- **Классификация** — вопрос или претензия, с подкатегорией
- **Оценка риска** — низкий / средний / высокий (для претензий)
- **Генерация ответов** — короткий ответ + формальный (со ссылками на ЗоЗПП)
- **Чеклист документов** — что запросить у покупателя
- **Передача юристу** — сводка для высокорисковых кейсов
- **История сессии** — последние 20 анализов в chrome.storage.local
- **Демо-режим** — 4 готовых тестовых сценария

## Архитектура

```
yurkontour-assistant/
├── extension/              # Chrome Extension (Vite + React + TypeScript + Tailwind)
│   ├── background.ts       # Service Worker — маршрутизация сообщений, API-вызовы
│   ├── content_scripts/    # DOM-парсеры для 3 маркетплейсов
│   ├── sidepanel/          # React Side Panel UI (6 экранов)
│   ├── public/             # manifest.json, иконки
│   └── dist/               # Собранное расширение (загружать в Chrome)
├── backend/                # Next.js 14 API (App Router)
│   └── src/
│       ├── app/api/analyze/ # POST /api/analyze
│       ├── providers/       # AIProvider абстракция (Mock / OpenAI / Anthropic)
│       └── services/        # Бизнес-логика
├── knowledge/              # База знаний (JSON)
├── prompts/                # AI-промпты (шаблоны)
└── types/                  # Общие TypeScript-типы
```

## Быстрый старт

### Требования

- Node.js >= 18
- Chrome >= 116 (Side Panel API)

### 1. Установка зависимостей

```bash
# Backend
cd backend
npm install

# Extension
cd ../extension
npm install
```

### 2. Настройка окружения

```bash
# Backend
cp backend/.env.example backend/.env.local
# По умолчанию AI_PROVIDER="mock" — не требует API-ключей
```

### 3. Запуск backend

```bash
cd backend
npm run dev
# API доступен на http://localhost:3000/api/analyze
```

### 4. Сборка расширения

```bash
cd extension
npm run build
# Результат в extension/dist/
```

### 5. Установка в Chrome

1. Откройте `chrome://extensions/`
2. Включите **Режим разработчика** (toggle сверху-справа)
3. Нажмите **Загрузить распакованное расширение**
4. Выберите папку `extension/dist/`
5. Перейдите на seller.ozon.ru / seller.wildberries.ru / partner.market.yandex.ru
6. Нажмите на иконку расширения — откроется Side Panel

### 6. Демо-режим (без маркетплейса)

1. Установите расширение и запустите backend
2. Откройте Side Panel на любой странице
3. Нажмите иконку ▶ (Демо-режим) в шапке
4. Выберите один из 4 тестовых сценариев

## API

### POST /api/analyze

**Request:**
```json
{
  "message": "Текст сообщения покупателя",
  "marketplace": "ozon" | "wb" | "yandex" | "other"
}
```

**Response:**
```json
{
  "type": "question" | "claim",
  "category": "specs" | "compatibility" | "defect" | "court_threat" | ...,
  "confidence": 0.85,
  "risk_level": "low" | "medium" | "high",
  "extracted_facts": {
    "order_number": "78234521",
    "product": "Samsung QE55Q60AAU",
    "purchase_date": "02.01.2025",
    "problem": "Производственный дефект",
    "customer_demand": "Возврат денежных средств",
    "risk_markers": ["Угроза суда", "Жалоба в Роспотребнадзор"]
  },
  "short_reply": "Здравствуйте! ...",
  "formal_reply": "Уважаемый покупатель!\n\nВ соответствии со ст. 18 ЗоЗПП ...",
  "clarifying_questions": ["Укажите номер заказа.", ...],
  "missing_documents": ["Фото дефекта", "Номер заказа", ...],
  "lawyer_summary": "=== СВОДКА ДЛЯ ЮРИСТА === ..."
}
```

## Демо-сценарии

| # | Сценарий | Тип | Риск |
|---|----------|-----|------|
| 1 | Вопрос по характеристикам холодильника | Вопрос | Низкий |
| 2 | Вопрос по совместимости стиральной машины | Вопрос | Низкий |
| 3 | Претензия по неисправности посудомойки | Претензия | Средний |
| 4 | Претензия с угрозой суда (техсложный товар) | Претензия | Высокий |

## AI-провайдеры

Система поддерживает абстракцию провайдеров. Текущий провайдер задаётся в `backend/.env.local`:

| Провайдер | `AI_PROVIDER` | Описание |
|-----------|---------------|----------|
| Mock | `mock` | Правила + шаблоны, без API-ключей |
| OpenAI | `openai` | (заглушка, требует реализации) |
| Anthropic | `anthropic` | (заглушка, требует реализации) |

## Ограничения

- Расширение **не отправляет** сообщения автоматически — только генерирует предложения
- Только для внутреннего использования сотрудниками компании
- Mock-провайдер работает на основе ключевых слов, не настоящий AI
- DOM-парсеры могут потребовать обновления при изменении вёрстки маркетплейсов

## Стек

- **Extension**: Vite 5 + React 18 + TypeScript + Tailwind CSS 3
- **Backend**: Next.js 14 (App Router) + Zod 4
- **Chrome API**: Manifest V3, Side Panel, Storage, Content Scripts
