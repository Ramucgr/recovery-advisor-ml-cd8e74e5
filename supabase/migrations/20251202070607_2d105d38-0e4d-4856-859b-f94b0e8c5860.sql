-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('athlete', 'doctor', 'admin');
CREATE TYPE injury_severity AS ENUM ('minor', 'moderate', 'severe', 'critical');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE notification_type AS ENUM ('alert', 'reminder', 'milestone', 'risk_warning');
CREATE TYPE rehab_status AS ENUM ('planned', 'in_progress', 'completed', 'paused');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Athlete profiles
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  date_of_birth DATE NOT NULL,
  gender TEXT,
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  sport TEXT NOT NULL,
  position TEXT,
  training_hours_per_week DECIMAL(4,1),
  fitness_level TEXT,
  medical_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Injuries table
CREATE TABLE public.injuries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  injury_type TEXT NOT NULL,
  body_location TEXT NOT NULL,
  severity injury_severity NOT NULL,
  injury_date DATE NOT NULL,
  diagnosis TEXT,
  expected_recovery_days INTEGER,
  actual_recovery_days INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Medical records
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  injury_id UUID REFERENCES public.injuries(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES auth.users(id),
  record_date DATE NOT NULL,
  diagnosis TEXT NOT NULL,
  treatment_plan TEXT,
  notes TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Rehabilitation plans
CREATE TABLE public.rehab_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  injury_id UUID REFERENCES public.injuries(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  plan_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  target_end_date DATE NOT NULL,
  actual_end_date DATE,
  status rehab_status DEFAULT 'planned',
  exercises JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Rehabilitation progress tracking
CREATE TABLE public.rehab_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rehab_plan_id UUID REFERENCES public.rehab_plans(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  progress_date DATE NOT NULL,
  completion_percentage DECIMAL(5,2) CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  notes TEXT,
  exercises_completed JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ML Predictions
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  injury_id UUID REFERENCES public.injuries(id) ON DELETE CASCADE NOT NULL,
  predicted_recovery_days INTEGER,
  setback_probability DECIMAL(5,4),
  risk_level risk_level NOT NULL,
  confidence_score DECIMAL(5,4),
  model_version TEXT,
  input_features JSONB,
  prediction_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Training recommendations
CREATE TABLE public.training_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  injury_id UUID REFERENCES public.injuries(id) ON DELETE SET NULL,
  prediction_id UUID REFERENCES public.predictions(id) ON DELETE SET NULL,
  recommendation_date DATE NOT NULL,
  training_load_percentage DECIMAL(5,2),
  recommended_activities TEXT[],
  restrictions TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_injuries_updated_at BEFORE UPDATE ON public.injuries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rehab_plans_updated_at BEFORE UPDATE ON public.rehab_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, check_role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id
    AND user_roles.role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Profiles: Users can view and update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles: Users can view their own roles, admins can manage all
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Athletes: Athletes see their own, doctors and admins see all
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view their own profile"
  ON public.athletes FOR SELECT
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Athletes can update their own profile"
  ON public.athletes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Athletes can insert their own profile"
  ON public.athletes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors and admins can update athlete profiles"
  ON public.athletes FOR UPDATE
  USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- Injuries: Athletes see their own, doctors and admins see all
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View injuries"
  ON public.injuries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = injuries.athlete_id AND athletes.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can insert injuries"
  ON public.injuries FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update injuries"
  ON public.injuries FOR UPDATE
  USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- Medical records: Same as injuries
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View medical records"
  ON public.medical_records FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = medical_records.athlete_id AND athletes.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can manage medical records"
  ON public.medical_records FOR ALL
  USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- Rehab plans: Athletes see their own, doctors manage
ALTER TABLE public.rehab_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View rehab plans"
  ON public.rehab_plans FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = rehab_plans.athlete_id AND athletes.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can manage rehab plans"
  ON public.rehab_plans FOR ALL
  USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- Rehab progress: Athletes can track their own
ALTER TABLE public.rehab_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View rehab progress"
  ON public.rehab_progress FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = rehab_progress.athlete_id AND athletes.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Athletes can track progress"
  ON public.rehab_progress FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = rehab_progress.athlete_id AND athletes.user_id = auth.uid()));

CREATE POLICY "Doctors can manage progress"
  ON public.rehab_progress FOR ALL
  USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- Predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View predictions"
  ON public.predictions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = predictions.athlete_id AND athletes.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can insert predictions"
  ON public.predictions FOR INSERT
  WITH CHECK (true);

-- Training recommendations
ALTER TABLE public.training_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View training recommendations"
  ON public.training_recommendations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.athletes WHERE athletes.id = training_recommendations.athlete_id AND athletes.user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'doctor') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can manage recommendations"
  ON public.training_recommendations FOR ALL
  USING (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_injuries_athlete_id ON public.injuries(athlete_id);
CREATE INDEX idx_injuries_status ON public.injuries(status);
CREATE INDEX idx_rehab_plans_athlete_id ON public.rehab_plans(athlete_id);
CREATE INDEX idx_rehab_progress_plan_id ON public.rehab_progress(rehab_plan_id);
CREATE INDEX idx_predictions_athlete_id ON public.predictions(athlete_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);