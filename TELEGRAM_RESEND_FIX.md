# 🔧 Исправление проблемы с повторной отправкой сообщений

## 📋 Найденные проблемы

### 1. ❌ **Отсутствует endpoint для RPE опросов**
- **Проблема**: `/send-rpe-survey` возвращает 404
- **Причина**: В боте не реализован endpoint для RPE опросов
- **Влияние**: Кнопка "Отправить повторно" для RPE опросов не работает

### 2. ❌ **Ошибка авторизации в Next.js API**
- **Проблема**: API возвращает 401 Unauthorized
- **Причина**: Отсутствует токен авторизации в запросах
- **Влияние**: Повторная отправка не работает из веб-интерфейса

### 3. ✅ **Бот работает для утренних опросов**
- **Статус**: Endpoint `/send-morning-survey` работает
- **Тест**: Успешно отправлено сообщение игроку Ibrahim Sesay

## 🛠️ Решения

### 1. Добавить endpoint для RPE опросов в бота

Нужно добавить в `telegram-bot/bot_direct_db.py`:

```python
async def handle_send_rpe_survey(request):
    """HTTP endpoint для ручной отправки RPE опроса"""
    data = await request.json()
    telegram_id = data.get('telegramId')
    club_id = data.get('clubId')
    pin_code = data.get('pinCode', '------')
    lang = data.get('language', 'ru')
    training_id = data.get('trainingId')
    
    if not telegram_id or not club_id:
        return web.json_response({'error': 'telegramId и clubId обязательны'}, status=400)
    
    # Формируем ссылку для RPE опроса
    if training_id:
        link = f"https://api.uteam.club/survey?tenantId={club_id}&type=rpe&trainingId={training_id}"
    else:
        link = f"https://api.uteam.club/survey?tenantId={club_id}&type=rpe"
    
    if lang == 'en':
        text = (
            f"Please rate how hard your training was (RPE).\n\n"
            f"Your pin code for login:\n<code>{pin_code}</code>"
        )
        button_text = "📝 Rate RPE"
    else:
        text = (
            f"Пожалуйста, оцени, насколько тяжёлой была твоя тренировка (RPE).\n\n"
            f"Твой пинкод для входа:\n<code>{pin_code}</code>"
        )
        button_text = "📝 Оценить RPE"
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=button_text, url=link)]
    ])
    
    try:
        await bot.send_message(
            telegram_id,
            text,
            reply_markup=keyboard,
            parse_mode="HTML"
        )
        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

# Добавить в main():
app.router.add_post('/send-rpe-survey', handle_send_rpe_survey)
```

### 2. Исправить Next.js API для RPE опросов

В `src/app/api/surveys/rpe/route.ts` нужно добавить отправку через бота:

```typescript
// POST /api/surveys/rpe
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, teamId, date, trainingId } = body;

    if (!playerId || !teamId || !date) {
      return NextResponse.json({ error: 'playerId, teamId и date обязательны' }, { status: 400 });
    }

    // Получаем игрока из базы
    const players = await db.select().from(player).where(eq(player.id, playerId));
    const playerRow = players[0];
    if (!playerRow || !playerRow.telegramId) {
      return NextResponse.json({ error: 'У игрока нет Telegram ID' }, { status: 400 });
    }

    // Получаем команду
    const teams = await db.select().from(team).where(eq(team.id, teamId));
    const teamRow = teams[0];
    if (!teamRow) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
    }

    // Отправляем через бота
    try {
      const botRes = await fetch('http://158.160.189.99:8080/send-rpe-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegramId: playerRow.telegramId, 
          clubId: teamRow.clubId, 
          teamId: teamId, 
          date,
          trainingId: trainingId || null,
          surveyType: 'rpe'
        })
      });
      
      const botData = await botRes.json();
      if (!botRes.ok || !botData.success) {
        return NextResponse.json({ error: botData.error || 'Ошибка при отправке через бота' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
      
    } catch (botError) {
      console.error('RPE: Error calling bot server:', botError);
      return NextResponse.json({ error: 'Ошибка при обращении к серверу бота', details: String(botError) }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при повторной отправке', details: String(error) }, { status: 500 });
  }
}
```

## 🚀 Порядок применения исправлений

### Шаг 1: Обновить Telegram бота
1. Добавить endpoint `/send-rpe-survey` в `bot_direct_db.py`
2. Перезапустить бота
3. Проверить, что endpoint работает

### Шаг 2: Обновить Next.js API
1. Обновить `src/app/api/surveys/rpe/route.ts`
2. Перезапустить Next.js сервер
3. Проверить работу кнопки "Отправить повторно"

### Шаг 3: Тестирование
1. Зайти в админ-панель
2. Выбрать команду с игроками
3. Нажать "Отправить повторно" для RPE опроса
4. Проверить, что сообщение пришло игроку

## 🔍 Диагностика

Для проверки исправлений используйте:

```bash
# Проверить endpoints бота
python3 debug-api-endpoints.py

# Проверить конкретного игрока
python3 check-player-550595-no-ssl.py

# Отправить тестовое сообщение
python3 send-test-message.py
```

## 📋 Чек-лист исправлений

- [ ] Добавлен endpoint `/send-rpe-survey` в бота
- [ ] Обновлен Next.js API для RPE опросов
- [ ] Перезапущен Telegram бот
- [ ] Перезапущен Next.js сервер
- [ ] Протестирована кнопка "Отправить повторно"
- [ ] Проверено получение сообщений игроками

## 🎯 Ожидаемый результат

После применения исправлений:
- ✅ Кнопка "Отправить повторно" работает для утренних опросов
- ✅ Кнопка "Отправить повторно" работает для RPE опросов
- ✅ Игроки получают сообщения в Telegram
- ✅ Нет ошибок 500 в консоли браузера
