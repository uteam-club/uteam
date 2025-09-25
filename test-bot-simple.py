#!/usr/bin/env python3
"""
Упрощенный тестовый бот для проверки исправлений
"""

import asyncio
import json
from aiohttp import web, ClientSession

# Глобальная переменная для хранения данных
test_data = {}

async def handle_send_morning_survey(request):
    """HTTP endpoint для ручной отправки утреннего опроса"""
    data = await request.json()
    telegram_id = data.get('telegramId')
    club_id = data.get('clubId')
    team_id = data.get('teamId')
    date = data.get('date')
    
    if not telegram_id or not club_id:
        return web.json_response({'error': 'telegramId и clubId обязательны'}, status=400)
    
    # Сохраняем данные для проверки
    test_data['morning'] = {
        'telegram_id': telegram_id,
        'club_id': club_id,
        'team_id': team_id,
        'date': date,
        'timestamp': asyncio.get_event_loop().time()
    }
    
    print(f"[MORNING] Получен запрос: {data}")
    return web.json_response({'success': True})

async def handle_send_rpe_survey(request):
    """HTTP endpoint для ручной отправки RPE опроса"""
    data = await request.json()
    telegram_id = data.get('telegramId')
    club_id = data.get('clubId')
    team_id = data.get('teamId')
    date = data.get('date')
    training_id = data.get('trainingId')
    
    if not telegram_id or not club_id:
        return web.json_response({'error': 'telegramId и clubId обязательны'}, status=400)
    
    # Сохраняем данные для проверки
    test_data['rpe'] = {
        'telegram_id': telegram_id,
        'club_id': club_id,
        'team_id': team_id,
        'date': date,
        'training_id': training_id,
        'timestamp': asyncio.get_event_loop().time()
    }
    
    print(f"[RPE] Получен запрос: {data}")
    return web.json_response({'success': True})

async def handle_send_survey_success(request):
    """HTTP endpoint для отправки сообщения об успешном прохождении опроса"""
    data = await request.json()
    telegram_id = data.get('telegramId')
    lang = data.get('language', 'ru')
    survey_date = data.get('surveyDate')
    
    if not telegram_id:
        return web.json_response({'error': 'telegramId обязателен'}, status=400)
    
    # Сохраняем данные для проверки
    test_data['success'] = {
        'telegram_id': telegram_id,
        'language': lang,
        'survey_date': survey_date,
        'timestamp': asyncio.get_event_loop().time()
    }
    
    print(f"[SUCCESS] Получен запрос: {data}")
    return web.json_response({'success': True})

async def handle_status(request):
    """HTTP endpoint для проверки статуса"""
    return web.json_response({
        'status': 'running',
        'endpoints': {
            'morning': '/send-morning-survey',
            'rpe': '/send-rpe-survey',
            'success': '/send-survey-success'
        },
        'test_data': test_data
    })

async def main():
    """Запуск тестового сервера"""
    app = web.Application()
    
    # Добавляем endpoints
    app.router.add_post('/send-morning-survey', handle_send_morning_survey)
    app.router.add_post('/send-rpe-survey', handle_send_rpe_survey)
    app.router.add_post('/send-survey-success', handle_send_survey_success)
    app.router.add_get('/status', handle_status)
    
    # Запускаем сервер
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    
    print('🚀 Тестовый бот запущен на порту 8080')
    print('📋 Доступные endpoints:')
    print('   POST /send-morning-survey')
    print('   POST /send-rpe-survey')
    print('   POST /send-survey-success')
    print('   GET /status')
    print('')
    print('🔄 Ожидание запросов...')
    
    # Ждем бесконечно
    try:
        await asyncio.Future()
    except KeyboardInterrupt:
        print('\n🛑 Остановка сервера...')
    finally:
        await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())
