const { createBotServiceUser, generateBotServiceToken } = require('../src/services/user.service');

(async () => {
  const email = 'bot@uteam.club';
  const password = 'StrongBotPassword123!';
  const user = await createBotServiceUser(email, password);
  if (!user) {
    console.error('Не удалось создать сервисного пользователя!');
    process.exit(1);
  }
  const token = generateBotServiceToken(user);
  console.log('Сервисный пользователь создан:');
  console.log('Email:', email);
  console.log('Пароль:', password);
  console.log('TOKEN:', token);
  process.exit(0);
})(); 