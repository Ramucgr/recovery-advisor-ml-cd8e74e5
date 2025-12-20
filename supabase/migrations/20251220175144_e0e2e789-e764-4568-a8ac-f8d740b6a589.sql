-- Create table to track exercise completions per session
CREATE TABLE public.exercise_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rehab_plan_id UUID NOT NULL REFERENCES public.rehab_plans(id) ON DELETE CASCADE,
  plan_exercise_id UUID NOT NULL REFERENCES public.rehab_plan_exercises(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sets_completed INTEGER,
  reps_completed INTEGER,
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_exercise_id, session_date)
);

-- Enable RLS
ALTER TABLE public.exercise_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view exercise completions for their plans"
ON public.exercise_completions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = exercise_completions.rehab_plan_id 
  AND (rehab_plans.created_by = auth.uid() OR rehab_plans.athlete_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  ))
));

CREATE POLICY "Users can mark exercises complete"
ON public.exercise_completions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = exercise_completions.rehab_plan_id 
  AND (rehab_plans.created_by = auth.uid() OR rehab_plans.athlete_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  ))
));

CREATE POLICY "Users can update their exercise completions"
ON public.exercise_completions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = exercise_completions.rehab_plan_id 
  AND (rehab_plans.created_by = auth.uid() OR rehab_plans.athlete_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  ))
));

CREATE POLICY "Users can delete their exercise completions"
ON public.exercise_completions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = exercise_completions.rehab_plan_id 
  AND (rehab_plans.created_by = auth.uid() OR rehab_plans.athlete_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  ))
));