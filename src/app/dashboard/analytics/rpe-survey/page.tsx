'use client';

import { SurveyTabs } from "@/components/surveys/SurveyTabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RPESurveyPage() {
  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">Оценка RPE</CardTitle>
        </CardHeader>
        <CardContent className="custom-scrollbar">
          <SurveyTabs type="rpe" />
        </CardContent>
      </Card>
    </div>
  );
} 