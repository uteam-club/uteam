import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { club } from '@/db/schema';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Получение клуба по ID
export async function GET(request, { params }) {
    try {
        const [clubRow] = await db.select().from(club).where(eq(club.id, params.id));
        if (!clubRow) {
            return NextResponse.json({ error: 'Клуб не найден' }, { status: 404 });
        }
        return NextResponse.json(clubRow);
    }
    catch (error) {
        console.error('Ошибка при получении данных клуба:', error);
        return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
    }
}
// Обновление клуба
export async function PUT(request, { params }) {
    try {
        const id = params.id;
        const data = await request.json();
        // Проверяем, что клуб существует
        const [existingClub] = await db.select().from(club).where(eq(club.id, id));
        if (!existingClub) {
            return NextResponse.json({ error: 'Клуб не найден' }, { status: 404 });
        }
        // Обновляем клуб
        const [updatedClub] = await db.update(club)
            .set({
            name: data.name,
            logoUrl: data.logoUrl,
        })
            .where(eq(club.id, id))
            .returning();
        if (!updatedClub) {
            return NextResponse.json({ error: 'Не удалось обновить клуб' }, { status: 500 });
        }
        return NextResponse.json(updatedClub);
    }
    catch (error) {
        console.error('Error updating club:', error);
        return NextResponse.json({ error: 'Произошла ошибка при обновлении клуба' }, { status: 500 });
    }
}
// Удаление клуба
export async function DELETE(request, { params }) {
    try {
        const id = params.id;
        // Проверяем, что клуб существует
        const [existingClub] = await db.select().from(club).where(eq(club.id, id));
        if (!existingClub) {
            return NextResponse.json({ error: 'Клуб не найден' }, { status: 404 });
        }
        // Удаляем клуб
        await db.delete(club).where(eq(club.id, id));
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting club:', error);
        return NextResponse.json({ error: 'Произошла ошибка при удалении клуба' }, { status: 500 });
    }
}
