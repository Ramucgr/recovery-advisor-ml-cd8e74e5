-- Create storage bucket for medical files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-files', 'medical-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for medical files
CREATE POLICY "Users can upload medical files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medical-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their medical files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical-files' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their medical files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'medical-files' 
  AND auth.uid() IS NOT NULL
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;