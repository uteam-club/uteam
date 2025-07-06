   #!/bin/bash
   echo "PYTHON: $(which python)"
   echo "PATH: $PATH"
   echo "VIRTUAL_ENV: $VIRTUAL_ENV"
   /home/uteam-admin/uteam/telegram-bot/venv/bin/python -m pip show aiogram
   /home/uteam-admin/uteam/telegram-bot/venv/bin/python /home/uteam-admin/uteam/telegram-bot/bot.py
