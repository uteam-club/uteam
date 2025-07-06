import psycopg2
conn = psycopg2.connect(
    host='rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    port=6432,
    database='uteam',
    user='uteam_bot_reader',
    password='uteambot567234!',
    sslmode='verify-ca',
    sslrootcert='./CA.pem'
)
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM "SurveySchedule" WHERE enabled = true')
print('Active schedules:', cur.fetchone()[0])
cur.execute('SELECT COUNT(*) FROM "Player" WHERE "telegramId" IS NOT NULL')
print('Players with Telegram:', cur.fetchone()[0])
cur.execute('SELECT "teamId", "sendTime", "surveyType" FROM "SurveySchedule" WHERE enabled = true')
schedules = cur.fetchall()
print('Schedules:', schedules)
conn.close()
