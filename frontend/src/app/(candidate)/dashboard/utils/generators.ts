interface Skill {
  name: string
  level: number
  category: string
  demand: number
}

interface MentorCard {
  type: 'tip' | 'gap' | 'achievement'
  icon: string
  title: string
  body: string
  action?: string
  color: string
}

interface RoadmapStep {
  step: number
  title: string
  description: string
  status: 'done' | 'active' | 'upcoming'
  icon: string
}

interface UserStats {
  profile_strength: number
  total_analyses: number
  avg_match_score: number
  [key: string]: any
}

export function generateMentorCards(skills: Skill[], stats: UserStats | null): MentorCard[] {
  const cards: MentorCard[] = []
  
  // Tip: Based on skills
  if (skills.length > 1) {
    const topSkill = skills[0]
    const weakSkill = skills.find(s => s.level < 50) || skills[skills.length - 1]
    cards.push({
      type: 'tip',
      icon: '💡',
      title: "Today's Insight",
      body: `You master ${topSkill.name} — adding ${weakSkill.name} will boost your hiring chances.`,
      action: `Start ${weakSkill.name} course →`,
      color: 'from-purple-500/20 to-pink-500/20',
    })
  }
  
  // Achievement: Based on profile strength
  if (stats && stats.profile_strength > 70) {
    cards.push({
      type: 'achievement',
      icon: '🏆',
      title: 'Achievement Unlocked',
      body: `Your profile completeness is ${stats.profile_strength}% — you're in the top 30%!`,
      color: 'from-green-500/20 to-emerald-500/20',
    })
  }
  
  // Gap: Based on analyses
  if (stats && stats.total_analyses > 0 && stats.avg_match_score < 80) {
    cards.push({
      type: 'gap',
      icon: '⚠️',
      title: 'Skill Gap Alert',
      body: `Your average match score is ${Math.round(stats.avg_match_score)}%. Focus on missing skills to improve.`,
      action: 'View recommendations →',
      color: 'from-orange-500/20 to-red-500/20',
    })
  }
  
  // Default card if no data
  if (cards.length === 0) {
    cards.push({
      type: 'tip',
      icon: '💡',
      title: "Welcome!",
      body: "Upload your CV to get personalized insights and recommendations.",
      action: 'Upload CV →',
      color: 'from-purple-500/20 to-pink-500/20',
    })
  }
  
  return cards
}

export function generateRoadmap(cvCount: number, analysisCount: number): RoadmapStep[] {
  return [
    {
      step: 1,
      icon: cvCount > 0 ? '✅' : '📄',
      title: 'Upload your CV',
      description: 'AI extracts your skills automatically.',
      status: cvCount > 0 ? 'done' : 'active'
    },
    {
      step: 2,
      icon: analysisCount > 0 ? '✅' : '🎯',
      title: 'Run a Job Match',
      description: 'Compare your CV against a real job description.',
      status: cvCount > 0 ? (analysisCount > 0 ? 'done' : 'active') : 'upcoming'
    },
    {
      step: 3,
      icon: '🧪',
      title: 'Fill the Skill Gaps',
      description: 'Follow the personalised learning roadmap.',
      status: analysisCount > 0 ? 'active' : 'upcoming'
    },
  ]
}
