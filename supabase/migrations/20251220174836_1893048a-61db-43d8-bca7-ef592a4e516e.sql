-- Create junction table for rehab plans and exercises
CREATE TABLE public.rehab_plan_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rehab_plan_id UUID NOT NULL REFERENCES public.rehab_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  sets INTEGER,
  reps INTEGER,
  duration_seconds INTEGER,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rehab_plan_id, exercise_id)
);

-- Enable RLS
ALTER TABLE public.rehab_plan_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view exercises for their rehab plans"
ON public.rehab_plan_exercises FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = rehab_plan_exercises.rehab_plan_id 
  AND (rehab_plans.created_by = auth.uid() OR rehab_plans.athlete_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  ))
));

CREATE POLICY "Users can add exercises to their rehab plans"
ON public.rehab_plan_exercises FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = rehab_plan_exercises.rehab_plan_id 
  AND rehab_plans.created_by = auth.uid()
));

CREATE POLICY "Users can update exercises in their rehab plans"
ON public.rehab_plan_exercises FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = rehab_plan_exercises.rehab_plan_id 
  AND rehab_plans.created_by = auth.uid()
));

CREATE POLICY "Users can remove exercises from their rehab plans"
ON public.rehab_plan_exercises FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.rehab_plans 
  WHERE rehab_plans.id = rehab_plan_exercises.rehab_plan_id 
  AND rehab_plans.created_by = auth.uid()
));