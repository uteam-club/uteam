#!/bin/bash

# Устанавливаем переменную окружения
export DATABASE_URL="postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=disable"

echo "Testing GPS events API with environment variable set..."

# Тестируем API
curl -X GET "http://localhost:3000/api/gps/events?teamId=7e745809-4734-4c67-9c10-1de213261fb4&eventType=match" \
  -H "Content-Type: application/json" \
  -v
