/**
 * Скрипт для создания клуба и суперадмина (Drizzle ORM)
 *
 * Запуск:
 * npx tsx scripts/create-superadmin.ts --db-url="postgresql://user:password@host:port/database"
 *
 * Или использовать URL из .env, если он правильный:
 * npx tsx scripts/create-superadmin.ts
 */
import * as dotenv from 'dotenv';
import { db } from '../src/lib/db';
import { club, user } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
// Загружаем переменные окружения
dotenv.config();
// Получаем URL базы данных из аргументов командной строки или из .env
const args = process.argv.slice(2);
let databaseUrl = process.env.DATABASE_URL;
for (const arg of args) {
    if (arg.startsWith('--db-url=')) {
        databaseUrl = arg.substring('--db-url='.length);
        break;
    }
}
if (!databaseUrl) {
    console.error('Ошибка: URL базы данных не указан!');
    console.error('Использование: npx tsx scripts/create-superadmin.ts --db-url="postgresql://user:password@host:port/database"');
    process.exit(1);
}
console.log('Используем следующий URL для подключения к базе данных:');
console.log(databaseUrl.replace(/\/\/(.+?):(.+?)@/, '//***:***@')); // Скрываем учетные данные в логах
// Настройки для создания
const CLUB_NAME = 'FDC Vista';
const CLUB_SUBDOMAIN = 'fdcvista';
const ADMIN_EMAIL = 'admin@fdcvista.com';
const ADMIN_PASSWORD = 'admin123!';
const ADMIN_NAME = 'Администратор';
async function main() {
    console.log('Начинаем создание клуба и суперадмина...');
    try {
        // Проверяем соединение с базой данных
        console.log('Проверяем соединение с базой данных...');
        // Drizzle ORM управляет соединением автоматически
        console.log('✅ Соединение с базой данных установлено!');
        // Проверяем, есть ли уже клуб с таким поддоменом
        const [existingClub] = await db.select().from(club).where(eq(club.subdomain, CLUB_SUBDOMAIN));
        let clubId;
        if (existingClub) {
            console.log(`Клуб с поддоменом '${CLUB_SUBDOMAIN}' уже существует, ID: ${existingClub.id}`);
            clubId = existingClub.id;
        }
        else {
            // Создаем новый клуб
            console.log(`Создаем новый клуб '${CLUB_NAME}'...`);
            const [newClub] = await db.insert(club).values({
                name: CLUB_NAME,
                subdomain: CLUB_SUBDOMAIN,
                id: uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();
            clubId = newClub.id;
            console.log(`✅ Клуб успешно создан с ID: ${clubId}`);
        }
        // Проверяем, есть ли уже пользователь с такой почтой
        const [existingUser] = await db.select().from(user).where(eq(user.email, ADMIN_EMAIL));
        if (existingUser) {
            console.log(`Пользователь с почтой '${ADMIN_EMAIL}' уже существует, ID: ${existingUser.id}`);
            console.log(`Роль пользователя: ${existingUser.role}`);
            // Если пользователь существует, но не SUPER_ADMIN, обновляем его роль
            if (existingUser.role !== 'SUPER_ADMIN') {
                const [updatedUser] = await db.update(user)
                    .set({ role: 'SUPER_ADMIN' })
                    .where(eq(user.id, existingUser.id))
                    .returning();
                console.log(`✅ Роль пользователя обновлена до SUPER_ADMIN`);
            }
        }
        else {
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            // Создаем суперадмина
            console.log(`Создаем суперадмина с почтой '${ADMIN_EMAIL}'...`);
            const [newUser] = await db.insert(user).values({
                email: ADMIN_EMAIL,
                name: ADMIN_NAME,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                clubId: clubId,
                id: uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();
            console.log(`✅ Суперадмин успешно создан с ID: ${newUser.id}`);
            console.log(`Данные для входа:`);
            console.log(`Email: ${ADMIN_EMAIL}`);
            console.log(`Пароль: ${ADMIN_PASSWORD}`);
        }
        console.log('✅ Операция успешно завершена!');
    }
    catch (error) {
        console.error('❌ Ошибка при создании клуба или суперадмина:', error);
        process.exit(1);
    }
    finally {
        // Drizzle ORM управляет соединением автоматически
    }
}
main();
