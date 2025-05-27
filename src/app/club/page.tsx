import { headers } from 'next/headers';
import { getSubdomain } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function ClubPage() {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomain(host);

  if (!subdomain) {
    redirect('/');
  }

  const club = await prisma.club.findUnique({
    where: {
      subdomain,
    },
  });

  if (!club) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">{club.name}</h1>
      <p>Welcome to {club.name}&apos;s page!</p>
    </div>
  );
} 