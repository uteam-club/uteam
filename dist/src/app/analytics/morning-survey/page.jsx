import { SurveyTabs } from "@/components/surveys/SurveyTabs";
export default function MorningSurveyPage() {
    return (<div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Утренний опросник</h1>
      </div>
      
      <SurveyTabs />
    </div>);
}
