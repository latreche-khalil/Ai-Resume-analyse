
# Global Stop Words for AI Analysis
SKILL_STOP_WORDS = {
    'using', 'into', 'across', 'skills', 'web', 'key', 'strong', 'science',
    'communication', 'management', 'ensuring', 'responsible', 'create',
    'between', 'pixel', 'job', 'interactive', 'develop', 'logic', 'various',
    'highly', 'proven', 'track', 'record', 'expert', 'proficient', 'knowledge',
    'experience', 'ability', 'work', 'team', 'fast', 'environment', 'delivery',
    'around', 'about', 'daily', 'weekly', 'monthly', 'years', 'total', 'including',
    'following', 'based', 'within', 'through', 'during', 'without', 'towards',
    'upon', 'concerning', 'regarding', 'beyond', 'throughout', 'effective',
    'excellent', 'successful', 'deep', 'mastery', 'seamless', 'layout', 'design',
    'development', 'engineering', 'solutions', 'process', 'project', 'projects',
    'technical', 'professional', 'senior', 'junior', 'lead', 'manager', 'specialist',
    'officer', 'staff', 'member', 'associate', 'consultant', 'advisor', 'analyst',
    'well', 'write', 'issues', 'approach', 'primary', 'ensuring', 'approach',
    'verbal', 'written', 'plus', 'preferred', 'required', 'ideal', 'candidate',
    'looking', 'role', 'position', 'company', 'organization', 'business',
    # ── Internal system / infrastructure tools that should never appear as skill gaps ──
    # RAG / vector store internals
    'faiss', 'chromadb', 'chroma db', 'chroma', 'pinecone', 'weaviate', 'qdrant',
    'milvus', 'pgvector', 'annoy', 'hnswlib', 'vectorstore', 'vector store',
    'vector database', 'embedding store', 'index', 'indexing',
    # Generic infra words that the LLM sometimes hallucinates as skills
    'pipeline', 'pipelines', 'workflow', 'workflows', 'framework', 'frameworks',
    'library', 'libraries', 'module', 'modules', 'package', 'packages',
    'tool', 'tools', 'tooling', 'stack', 'platform', 'platforms',
    'system', 'systems', 'infrastructure', 'architecture', 'microservice',
    'microservices', 'service', 'services', 'application', 'applications',
    'data', 'model', 'models', 'feature', 'features', 'training', 'inference',
    'production', 'deployment', 'monitoring', 'logging', 'testing',
    'implementation', 'integration', 'migration', 'configuration', 'setup',
}
