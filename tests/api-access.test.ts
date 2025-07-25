import request from 'supertest';

// ВАЖНО: заменить на реальный адрес вашего dev-сервера, если тестируете не на localhost:3000
const api = request('http://localhost:3000');

describe('API Access Control', () => {
  describe('GET /api/fitness-tests', () => {
    it('должен вернуть 401 если нет токена', async () => {
      const res = await api.get('/api/fitness-tests');
      expect(res.status).toBe(401);
    });

    it('должен вернуть 401 если токен невалидный', async () => {
      const res = await api.get('/api/fitness-tests').set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    // Пример: если есть тестовые токены для разных ролей, можно добавить:
    // it('должен вернуть 403 если роль не имеет права', async () => {
    //   const res = await api.get('/api/fitness-tests').set('Authorization', 'Bearer <TOKEN_FOR_MEMBER>');
    //   expect(res.status).toBe(403);
    // });
    //
    // it('должен вернуть 200 если роль имеет право', async () => {
    //   const res = await api.get('/api/fitness-tests').set('Authorization', 'Bearer <TOKEN_FOR_ADMIN>');
    //   expect(res.status).toBe(200);
    // });
  });
}); 