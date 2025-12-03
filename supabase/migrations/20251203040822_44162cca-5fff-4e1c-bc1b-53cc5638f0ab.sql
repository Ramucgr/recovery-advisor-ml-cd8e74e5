-- Add SELECT policies for athletes table
CREATE POLICY "Athletes can view their own profile"
ON public.athletes FOR SELECT
USING (auth.uid() = user_id);

-- Add DELETE policy for athletes
CREATE POLICY "Athletes can delete their own profile"
ON public.athletes FOR DELETE
USING (auth.uid() = user_id);

-- Add full policies for injuries table
CREATE POLICY "Users can view injuries for their athletes"
ON public.injuries FOR SELECT
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can insert injuries for their athletes"
ON public.injuries FOR INSERT
WITH CHECK (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR auth.uid() = created_by
);

CREATE POLICY "Users can update injuries they created"
ON public.injuries FOR UPDATE
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can delete injuries they created"
ON public.injuries FOR DELETE
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

-- Add full policies for medical_records table
CREATE POLICY "Users can view medical records for their athletes"
ON public.medical_records FOR SELECT
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR doctor_id = auth.uid()
);

CREATE POLICY "Users can insert medical records"
ON public.medical_records FOR INSERT
WITH CHECK (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR doctor_id = auth.uid()
);

CREATE POLICY "Users can update their medical records"
ON public.medical_records FOR UPDATE
USING (doctor_id = auth.uid());

CREATE POLICY "Users can delete their medical records"
ON public.medical_records FOR DELETE
USING (doctor_id = auth.uid());

-- Add full policies for rehab_plans table
CREATE POLICY "Users can view rehab plans for their athletes"
ON public.rehab_plans FOR SELECT
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can insert rehab plans"
ON public.rehab_plans FOR INSERT
WITH CHECK (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can update rehab plans they created"
ON public.rehab_plans FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete rehab plans they created"
ON public.rehab_plans FOR DELETE
USING (created_by = auth.uid());

-- Add SELECT policy for rehab_progress
CREATE POLICY "Users can view their rehab progress"
ON public.rehab_progress FOR SELECT
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their rehab progress"
ON public.rehab_progress FOR UPDATE
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
);

-- Add SELECT policy for predictions
CREATE POLICY "Users can view predictions for their athletes"
ON public.predictions FOR SELECT
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
);

-- Add full policies for training_recommendations
CREATE POLICY "Users can view their training recommendations"
ON public.training_recommendations FOR SELECT
USING (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can insert training recommendations"
ON public.training_recommendations FOR INSERT
WITH CHECK (
  athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Users can update their training recommendations"
ON public.training_recommendations FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their training recommendations"
ON public.training_recommendations FOR DELETE
USING (created_by = auth.uid());

-- Add policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);