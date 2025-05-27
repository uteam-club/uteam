import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSubdomain } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { ClubProvider } from '@/context/club-context';

export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return <ClubProvider club={club} isMainDomain={false}>{children}</ClubProvider>;
} 