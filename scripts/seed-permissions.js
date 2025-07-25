"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("@/lib/db");
var schema_1 = require("@/db/schema");
var user_1 = require("@/db/schema/user");
// Новый минимальный список прав по разделам
var permissions = [
    { code: 'teams.read', description: 'Команды (просмотр)' },
    { code: 'teams.update', description: 'Команды (редактирование)' },
    { code: 'exercises.read', description: 'Упражнения (просмотр)' },
    { code: 'exercises.update', description: 'Упражнения (редактирование)' },
    { code: 'trainings.read', description: 'Тренировки (просмотр)' },
    { code: 'trainings.update', description: 'Тренировки (редактирование)' },
    { code: 'matches.read', description: 'Матчи (просмотр)' },
    { code: 'matches.update', description: 'Матчи (редактирование)' },
    { code: 'attendance.read', description: 'Посещаемость (просмотр)' },
    { code: 'attendance.update', description: 'Посещаемость (редактирование)' },
    { code: 'fitnessTests.read', description: 'Фитнес тесты (просмотр)' },
    { code: 'fitnessTests.update', description: 'Фитнес тесты (редактирование)' },
    { code: 'calendar.read', description: 'Календарь (просмотр)' },
    { code: 'calendar.update', description: 'Календарь (редактирование)' },
    { code: 'morningSurvey.read', description: 'Утренний опрос (просмотр)' },
    { code: 'morningSurvey.update', description: 'Утренний опрос (редактирование)' },
    { code: 'rpeSurvey.read', description: 'Оценка RPE (просмотр)' },
    { code: 'rpeSurvey.update', description: 'Оценка RPE (редактирование)' },
    { code: 'documents.read', description: 'Документы (просмотр)' },
    { code: 'documents.update', description: 'Документы (редактирование)' },
    { code: 'adminPanel.read', description: 'Админка (просмотр)' },
    { code: 'adminPanel.update', description: 'Админка (редактирование)' },
];
var roles = user_1.roleEnum.enumValues;
// Пример назначения прав ролям (можно скорректировать по пожеланиям)
var rolePermissions = {
    SUPER_ADMIN: permissions.map(function (p) { return p.code; }),
    ADMIN: permissions.map(function (p) { return p.code; }),
    COACH: [
        'teams.read', 'teams.update',
        'exercises.read', 'exercises.update',
        'trainings.read', 'trainings.update',
        'matches.read', 'matches.update',
        'attendance.read', 'attendance.update',
        'fitnessTests.read', 'fitnessTests.update',
        'calendar.read', 'calendar.update',
        'morningSurvey.read', 'morningSurvey.update',
        'rpeSurvey.read', 'rpeSurvey.update',
        'documents.read', 'documents.update',
    ],
    MEMBER: [
        'teams.read',
        'exercises.read',
        'trainings.read',
        'matches.read',
        'attendance.read',
        'fitnessTests.read',
        'calendar.read',
        'morningSurvey.read',
        'rpeSurvey.read',
        'documents.read',
    ],
    SCOUT: [
        'teams.read',
        'exercises.read',
        'trainings.read',
        'matches.read',
        'attendance.read',
        'fitnessTests.read',
        'calendar.read',
        'documents.read',
    ],
    DOCTOR: [
        'teams.read',
        'trainings.read',
        'attendance.read',
        'documents.read',
    ],
    DIRECTOR: [
        'teams.read',
        'exercises.read',
        'trainings.read',
        'matches.read',
        'attendance.read',
        'fitnessTests.read',
        'calendar.read',
        'documents.read',
        'adminPanel.read',
    ],
};
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, permissions_1, perm, allPerms, _a, roles_1, role, allowedCodes, _b, allPerms_1, perm;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // 0. Очистить старые права и связи
                return [4 /*yield*/, db_1.db.delete(schema_1.rolePermission).execute()];
                case 1:
                    // 0. Очистить старые права и связи
                    _c.sent();
                    return [4 /*yield*/, db_1.db.delete(schema_1.permission).execute()];
                case 2:
                    _c.sent();
                    _i = 0, permissions_1 = permissions;
                    _c.label = 3;
                case 3:
                    if (!(_i < permissions_1.length)) return [3 /*break*/, 6];
                    perm = permissions_1[_i];
                    return [4 /*yield*/, db_1.db
                            .insert(schema_1.permission)
                            .values(perm)
                            .onConflictDoNothing()];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, db_1.db.select().from(schema_1.permission)];
                case 7:
                    allPerms = _c.sent();
                    _a = 0, roles_1 = roles;
                    _c.label = 8;
                case 8:
                    if (!(_a < roles_1.length)) return [3 /*break*/, 13];
                    role = roles_1[_a];
                    allowedCodes = rolePermissions[role] || [];
                    _b = 0, allPerms_1 = allPerms;
                    _c.label = 9;
                case 9:
                    if (!(_b < allPerms_1.length)) return [3 /*break*/, 12];
                    perm = allPerms_1[_b];
                    return [4 /*yield*/, db_1.db
                            .insert(schema_1.rolePermission)
                            .values({
                            role: role,
                            permissionId: perm.id,
                            allowed: allowedCodes.includes(perm.code),
                        })
                            .onConflictDoNothing()];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11:
                    _b++;
                    return [3 /*break*/, 9];
                case 12:
                    _a++;
                    return [3 /*break*/, 8];
                case 13: return [2 /*return*/];
            }
        });
    });
}
main().then(function () {
    console.log('Permissions seeded');
    process.exit(0);
});
