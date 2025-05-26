'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoachingExercisesPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the existing exercises page
    router.push('/dashboard/training/exercises');
  }, [router]);
  
  // Return a simple loading state while redirecting
  return (
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-vista-light/60">Перенаправление...</p>
    </div>
  );
} 