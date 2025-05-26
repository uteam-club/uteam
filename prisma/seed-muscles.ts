import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const frontMuscles = [
  { number: 3, name: 'Правый квадрицепс' },
  { number: 4, name: 'Правый привод' },
  { number: 5, name: 'Правая стопа' },
  { number: 6, name: 'Правый голеностоп' },
  { number: 7, name: 'Правая голень' },
  { number: 8, name: 'Правая рука' },
  { number: 9, name: 'Правый бицепс' },
  { number: 10, name: 'Левый бок (верх)' },
  { number: 11, name: 'Правое плечо' },
  { number: 12, name: 'Живот' },
  { number: 13, name: 'Нижняя часть живота' },
  { number: 14, name: 'Правый бок (низ)' },
  { number: 15, name: 'Правое колено' },
  { number: 16, name: 'Правый бок' },
  { number: 17, name: 'Левый бок (низ)' },
  { number: 18, name: 'Правая грудь' },
  { number: 19, name: 'Правая кисть' },
  { number: 20, name: 'Левая грудь' },
  { number: 21, name: 'Левое плечо' },
  { number: 22, name: 'Левый бицепс' },
  { number: 23, name: 'Левая рука' },
  { number: 24, name: 'Левое колено' },
  { number: 25, name: 'Левая голень' },
  { number: 26, name: 'Левый голеностоп' },
  { number: 27, name: 'Левая стопа' },
  { number: 28, name: 'Горло' },
  { number: 29, name: 'Левая кисть' },
  { number: 30, name: 'Левый привод' },
  { number: 31, name: 'Левый квадрицепс' },
  { number: 32, name: 'Голова' },
];

const backMuscles = [
  { number: 3, name: 'Левое плечо' },
  { number: 4, name: 'Левая лопатка' },
  { number: 5, name: 'Левая часть спины' },
  { number: 6, name: 'Левая икроножная' },
  { number: 7, name: 'Левая пятка' },
  { number: 8, name: 'Левый ахил' },
  { number: 9, name: 'Левый хамстринг' },
  { number: 10, name: 'Левый трицепс' },
  { number: 11, name: 'Левый локоть' },
  { number: 12, name: 'Верхняя часть спины' },
  { number: 13, name: 'Правое плечо' },
  { number: 14, name: 'Правая лопатка' },
  { number: 15, name: 'Правая часть спины' },
  { number: 16, name: 'Правая икроножная' },
  { number: 17, name: 'Правая пятка' },
  { number: 18, name: 'Правый ахил' },
  { number: 19, name: 'Правый хамстринг' },
  { number: 20, name: 'Правый трицепс' },
  { number: 21, name: 'Правый локоть' },
  { number: 22, name: 'Левая ягодица' },
  { number: 23, name: 'Правая ягодица' },
  { number: 24, name: 'Нижняя часть спины' },
  { number: 25, name: 'Шея' },
];

async function main() {
  // Удаляем существующие записи
  await prisma.muscleArea.deleteMany();

  // Добавляем мышцы вида спереди
  for (const muscle of frontMuscles) {
    await prisma.muscleArea.create({
      data: {
        ...muscle,
        view: 'front'
      }
    });
  }

  // Добавляем мышцы вида сзади
  for (const muscle of backMuscles) {
    await prisma.muscleArea.create({
      data: {
        ...muscle,
        view: 'back'
      }
    });
  }

  console.log('База данных успешно заполнена названиями мышц');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 