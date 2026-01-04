-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Enable full replica identity for complete payloads on UPDATE
ALTER TABLE public.transactions REPLICA IDENTITY FULL;