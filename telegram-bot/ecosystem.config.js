module.exports = {
  apps: [
    {
      name: "telegram-bot",
      script: "bot_direct_db.py",
      interpreter: "venv/bin/python",
      env: {
        DB_HOST: "rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net",
        DB_PORT: "6432",
        DB_NAME: "uteam",
        DB_USER: "uteam_bot_reader",
        DB_PASSWORD: "uteambot567234!",
        DB_SSLMODE: "verify-full",
        DB_SSLCERT: ".yandex_root.crt"
      }
    }
  ]
}; 