-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  location TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('recovery', 'performance', 'prevention', 'strength', 'flexibility')),
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal milestones table
CREATE TABLE public.goal_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC,
  achieved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise library table
CREATE TABLE public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('stretching', 'strengthening', 'cardio', 'balance', 'mobility', 'plyometric')),
  body_part TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  video_url TEXT,
  image_url TEXT,
  instructions TEXT[],
  sets_recommended INTEGER,
  reps_recommended INTEGER,
  duration_seconds INTEGER,
  equipment TEXT[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training load table
CREATE TABLE public.training_load (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  session_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  load_score INTEGER GENERATED ALWAYS AS (duration_minutes * intensity) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_load ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Users can view appointments they created or are assigned to"
ON public.appointments FOR SELECT
USING (created_by = auth.uid() OR doctor_id = auth.uid());

CREATE POLICY "Users can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own appointments"
ON public.appointments FOR UPDATE
USING (created_by = auth.uid() OR doctor_id = auth.uid());

CREATE POLICY "Users can delete their own appointments"
ON public.appointments FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- RLS Policies for goals
CREATE POLICY "Users can view goals they created"
ON public.goals FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can create goals"
ON public.goals FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own goals"
ON public.goals FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own goals"
ON public.goals FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for goal milestones
CREATE POLICY "Users can view milestones for their goals"
ON public.goal_milestones FOR SELECT
USING (EXISTS (SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.created_by = auth.uid()));

CREATE POLICY "Users can create milestones for their goals"
ON public.goal_milestones FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.created_by = auth.uid()));

CREATE POLICY "Users can update milestones for their goals"
ON public.goal_milestones FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.created_by = auth.uid()));

CREATE POLICY "Users can delete milestones for their goals"
ON public.goal_milestones FOR DELETE
USING (EXISTS (SELECT 1 FROM public.goals WHERE goals.id = goal_milestones.goal_id AND goals.created_by = auth.uid()));

-- RLS Policies for exercise library (public read, authenticated write)
CREATE POLICY "Anyone can view exercises"
ON public.exercise_library FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create exercises"
ON public.exercise_library FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update exercises they created"
ON public.exercise_library FOR UPDATE
USING (created_by = auth.uid());

-- RLS Policies for training load
CREATE POLICY "Users can view training load for athletes they manage"
ON public.training_load FOR SELECT
USING (EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = training_load.athlete_id AND athletes.user_id = auth.uid()));

CREATE POLICY "Users can create training load entries"
ON public.training_load FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update training load for athletes they manage"
ON public.training_load FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = training_load.athlete_id AND athletes.user_id = auth.uid()));

CREATE POLICY "Users can delete training load for athletes they manage"
ON public.training_load FOR DELETE
USING (EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = training_load.athlete_id AND athletes.user_id = auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercise_library_updated_at
BEFORE UPDATE ON public.exercise_library
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;