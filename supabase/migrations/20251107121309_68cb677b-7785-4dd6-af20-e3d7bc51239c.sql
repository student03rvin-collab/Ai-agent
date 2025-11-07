-- Add DELETE policy for messages table to allow users to delete their own messages
CREATE POLICY "Users can delete messages from their conversations"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
  )
);