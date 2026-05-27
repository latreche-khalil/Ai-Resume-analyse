# Types Directory

This directory contains TypeScript type definitions for the AI Resume Analyzer frontend application.

## Structure

- **`candidate.ts`**: Contains all types related to candidates, CVs, job descriptions, analyses, interviews, talent pools, and advanced analytics
- **`index.ts`**: Re-exports all types and provides shared utility types, enums, and common interfaces

## Usage

Import types from the types directory using the `@/types` alias:

```typescript
import { User, CVDocument, Analysis } from '@/types'
import type { JobDescription, SkillAnalysis } from '@/types/candidate'
```

## Type Categories

### User & Authentication
- `User`
- `LoginData`
- `RegisterData`
- `ProfileUpdateData`
- `PasswordChangeData`

### Documents & Job Descriptions
- `CVDocument`
- `JobDescription`
- `JobDescriptionFormData`

### Analysis
- `Analysis`
- `EnhancedAnalysis`
- `MatchDetails`
- `SkillAnalysis`
- `ExperienceAnalysis`
- `RedFlag`

### Interview & Coaching
- `InterviewSession`
- `InterviewQuestion`
- `InterviewAnswer`
- `InterviewReport`
- `ChatSession`
- `ChatMessage`

### Talent Pool
- `TalentPool`
- `PoolCandidate`
- `AnonymizedProfile`

### Advanced Analytics
- `SkillRadarData`
- `ExperienceHeatmap`
- `SemanticProximity`
- `AIConfidence`
- `BiasCheck`
- `HallucinationGuard`

### API Responses
- `ApiResponse<T>`
- `PaginatedResponse<T>`
- `DocumentsResponse`
- `AnalysesResponse`
- `JobDescriptionsResponse`

### Utility Types
- `Role`
- `Language`
- `ProcessingStatus`
- `AnalysisStatus`
- `LoadingState`
- `AsyncState<T>`
- `ApiError`
- `ValidationError`

## Adding New Types

When adding new types:

1. Add the type definition to the appropriate file (`candidate.ts` for domain types)
2. Export it from `index.ts` if it should be publicly available
3. Document complex types with JSDoc comments
4. Keep related types grouped together

## Best Practices

- Use `interface` for object shapes that may be extended
- Use `type` for unions, intersections, and utility types
- Prefer explicit types over `any`
- Use optional properties (`?`) instead of `| undefined` when appropriate
- Document complex types with comments
- Keep types DRY by composing smaller types into larger ones
