import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ExerciseCompletion {
  id: string;
  plan_exercise_id: string;
  session_date: string;
  completed_at: string;
  sets_completed: number | null;
  reps_completed: number | null;
  pain_level: number | null;
  notes: string | null;
}

interface PlanExercise {
  id: string;
  exercise_library: {
    name: string;
  };
}

interface CompletionHistoryProps {
  completions: ExerciseCompletion[];
  planExercises: PlanExercise[];
}

interface DayGroup {
  date: string;
  exercises: Array<{
    completion: ExerciseCompletion;
    exerciseName: string;
  }>;
}

export function CompletionHistory({ completions, planExercises }: CompletionHistoryProps) {
  // Group completions by date
  const groupedByDate = completions.reduce<Record<string, DayGroup>>((acc, completion) => {
    const date = completion.session_date;
    if (!acc[date]) {
      acc[date] = { date, exercises: [] };
    }
    
    const exercise = planExercises.find(pe => pe.id === completion.plan_exercise_id);
    acc[date].exercises.push({
      completion,
      exerciseName: exercise?.exercise_library?.name || "Unknown Exercise",
    });
    
    return acc;
  }, {});

  // Sort dates descending
  const sortedDays = Object.values(groupedByDate).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedDays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Completion History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No exercise completions recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Completion History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {sortedDays.map((day) => (
              <div key={day.date} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {format(parseISO(day.date), "EEEE, MMM d, yyyy")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {day.exercises.length} exercise{day.exercises.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-2 pl-2">
                  {day.exercises.map(({ completion, exerciseName }) => (
                    <div
                      key={completion.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="font-medium">{exerciseName}</span>
                      {completion.sets_completed && completion.reps_completed && (
                        <span className="text-muted-foreground">
                          ({completion.sets_completed} × {completion.reps_completed})
                        </span>
                      )}
                      {completion.pain_level !== null && (
                        <Badge variant="outline" className="text-xs">
                          Pain: {completion.pain_level}/10
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
