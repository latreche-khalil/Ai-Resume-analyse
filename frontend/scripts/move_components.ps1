$base = "c:\Users\Administrator\Desktop\final-ai-resume-analyzer\frontend\src\components"
mkdir -Force "$base\candidate\analysis"
mkdir -Force "$base\recruiter\analysis"
mkdir -Force "$base\admin\analysis"
mkdir -Force "$base\shared\analysis"

# Move Candidate Components
Move-Item "$base\analysis\CounterfactualsCard.tsx" "$base\candidate\analysis\"
Move-Item "$base\analysis\LearningTimeline.tsx" "$base\candidate\analysis\"
Move-Item "$base\analysis\MatchScoreGauge.tsx" "$base\candidate\analysis\"
Move-Item "$base\analysis\SkillMatrix.tsx" "$base\candidate\analysis\"
Move-Item "$base\analysis\WhatIfSimulator.tsx" "$base\candidate\analysis\"

# Move Recruiter Components
Move-Item "$base\analysis\CandidateComparisonMatrix.tsx" "$base\recruiter\analysis\"
Move-Item "$base\analysis\ExperienceHeatmap.tsx" "$base\recruiter\analysis\"
Move-Item "$base\analysis\InterviewGuide.tsx" "$base\recruiter\analysis\"
Move-Item "$base\analysis\RedFlagDetection.tsx" "$base\recruiter\analysis\"
Move-Item "$base\analysis\SemanticProximityPlot.tsx" "$base\recruiter\analysis\"
Move-Item "$base\analysis\SkillRadarChart.tsx" "$base\recruiter\analysis\"

# Move Admin Components
Move-Item "$base\analysis\AIConfidenceScore.tsx" "$base\admin\analysis\"
Move-Item "$base\analysis\BiasCheckSummary.tsx" "$base\admin\analysis\"
Move-Item "$base\analysis\HallucinationGuard.tsx" "$base\admin\analysis\"
Move-Item "$base\analysis\ProcessingStats.tsx" "$base\admin\analysis\"

# Move Shared Components
Move-Item "$base\analysis\CVPreview.tsx" "$base\shared\analysis\"
Move-Item "$base\analysis\EvidenceView.tsx" "$base\shared\analysis\"
Move-Item "$base\analysis\LanguageSelector.tsx" "$base\shared\analysis\"
Move-Item "$base\analysis\QuickActionsBar.tsx" "$base\shared\analysis\"
Move-Item "$base\analysis\SHAPVisualizations.tsx" "$base\shared\analysis\"
Move-Item "$base\analysis\analysis-results-display.tsx" "$base\shared\analysis\"
Move-Item "$base\analysis\enhanced-analysis-view.tsx" "$base\shared\analysis\"

# Check what's left
Get-ChildItem "$base\analysis"
