# Система прав доступа (Access Control) в UTeam

## Архитектура

- **Права (permissions)** — атомарные действия (например, `teams.read`, `teams.create`, `documents.read`), описываются в базе в таблице `Permission`.
- **Роли (roles)** — предустановленные наборы прав (SUPER_ADMIN, ADMIN, COACH, MEMBER, SCOUT, DOCTOR, DIRECTOR). Связи ролей и прав хранятся в таблице `RolePermission`.
- **Индивидуальные overrides** — для каждого пользователя можно задать индивидуальные права через таблицу `UserPermission` (например, дать доступ к созданию команд только одному тренеру).
- **Права пользователя** = права роли + индивидуальные overrides.

## Как работает проверка доступа

1. **В каждом API-роуте**:
   - Получается токен пользователя (`getToken` или аналог).
   - Получается итоговый набор прав (`getUserPermissions(token.id)`).
   - Проверка через универсальную функцию: `hasPermission(permissions, 'teams.read')`.
   - Если нет права — возвращается 403 Forbidden.
2. **В UI**:
   - Через контекст `PermissionsContext` права пользователя доступны во всех компонентах.
   - Для отображения/скрытия кнопок, разделов, действий — используйте `hasPermission`.

## Принципы и best practices

- **Все проверки доступа — только через коды прав** (никаких жёстких проверок по ролям).
- **SUPER_ADMIN и ADMIN** должны получать все права (см. seed-скрипт).
- **Для новых разделов**:
  - Всегда добавляйте новые коды прав в seed-скрипт (`scripts/seed-permissions.ts`).
  - Добавляйте права в массивы для нужных ролей.
  - В API и UI используйте только новые коды прав.
- **Для служебных/отладочных роутов** — используйте отдельные права (например, `test.access`).
- **Права должны быть атомарными** (например, `teams.read`, а не просто `teams`).

## Как добавить новый раздел/операцию

1. Придумайте код права (например, `players.stats.read`).
2. Добавьте его в массив `permissions` в `scripts/seed-permissions.ts`.
3. Добавьте этот код в нужные роли в `rolePermissions`.
4. В API-роуте используйте:
   ```ts
   const permissions = await getUserPermissions(token.id);
   if (!hasPermission(permissions, 'players.stats.read')) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   ```
5. В UI используйте:
   ```ts
   if (hasPermission(permissions, 'players.stats.read')) {
     // показать раздел/кнопку
   }
   ```
6. Запустите seed-скрипт:
   ```
   npx tsx scripts/seed-permissions.ts
   ```
7. Перезапустите сервер.

## Как тестировать права

- Используйте разные роли для входа (SUPER_ADMIN, COACH, MEMBER и т.д.).
- Проверяйте, что:
  - Нет лишних 403/401 для разрешённых действий.
  - Нет доступа к запрещённым действиям.
- Для индивидуальных overrides — используйте UI или API для назначения прав пользователю.

## Примеры кодов прав (актуальный список)

- `teams.read`, `teams.create`, `teams.update`, `teams.delete`
- `teams.players.create`, `teams.players.update`, `teams.players.delete`, `teams.players.uploadImage`
- `teams.coaches.create`, `teams.coaches.update`, `teams.coaches.delete`
- `trainings.read`, `trainings.create`, `trainings.update`, `trainings.delete`, `trainings.attendance`
- `exercises.read`, `exercises.create`, `exercises.update`, `exercises.delete`
- `documents.read`, `documents.create`
- `users.read`, `users.create`
- `matches.read`, `matches.create`, `matches.update`, `matches.delete`, `matches.players.update`, `matches.players.delete`
- `files.read`
- `surveys.read`, `surveys.create`
- `trainingCategories.read`, `trainingCategories.create`, `trainingCategories.update`, `trainingCategories.delete`
- `fitnessTests.read`, `fitnessTests.create`, `fitnessTests.update`, `fitnessTests.delete`
- `exerciseTags.read`, `exerciseTags.create`, `exerciseTags.update`, `exerciseTags.delete`
- `exerciseCategories.read`, `exerciseCategories.create`, `exerciseCategories.update`, `exerciseCategories.delete`
- `muscles.read`, `painAreas.create`, `storage.init`, `test.access`

## Как добавить новую роль

1. Добавьте роль в enum в `src/db/schema/user.ts`.
2. Добавьте роль в массив `roles` в seed-скрипте.
3. Добавьте нужные права в `rolePermissions`.
4. Запустите seed-скрипт.

## Как добавить индивидуальное право пользователю

- Через UI (если реализовано) или напрямую через API/БД:
  - В таблицу `UserPermission` добавить запись с userId, permissionId, allowed=true/false.
  - Индивидуальные права перекрывают права роли.

## FAQ

- **Что делать, если появляется новый раздел/операция?**
  - Добавить новый код права в seed-скрипт, назначить нужным ролям, использовать в API/UI.
- **Как проверить, что у роли есть нужное право?**
  - Посмотреть в таблице `RolePermission` или в seed-скрипте.
- **Как быстро выдать все права роли?**
  - В seed-скрипте: `rolePermissions[ROLE] = permissions.map(p => p.code)`.

---

> **Вся разработка ведётся с учётом этой системы. Все новые разделы и фичи должны сразу получать свои коды прав и проверки!** 