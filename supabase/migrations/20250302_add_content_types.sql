-- Add glossary, interaction, product to knowledge_embeddings content_type

ALTER TABLE knowledge_embeddings DROP CONSTRAINT IF EXISTS knowledge_embeddings_content_type_check;
ALTER TABLE knowledge_embeddings ADD CONSTRAINT knowledge_embeddings_content_type_check
  CHECK (content_type IN ('ingredient', 'article', 'faq', 'regulation', 'glossary', 'interaction', 'product'));
