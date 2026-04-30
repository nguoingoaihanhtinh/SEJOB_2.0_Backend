/**
 * Scoring weights configuration for CV assessment.
 */
export interface ScoringWeights {
  A1_REQUIRED: number;
  A2_NICE: number;
  A3_SKILL_DEPTH: number;
  B1_MAJOR: number;
  B2_COURSES: number;
  C1_PROJECT_COUNT: number;
  C2_PROJECT_RELEVANCE: number;
  C3_PROJECT_COMPLEXITY: number;
  D_CERTIFICATIONS: number;
  E_EXPERIENCE: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  A1_REQUIRED: 30,
  A2_NICE: 10,
  A3_SKILL_DEPTH: 5,
  B1_MAJOR: 10,
  B2_COURSES: 15,
  C1_PROJECT_COUNT: 5,
  C2_PROJECT_RELEVANCE: 10,
  C3_PROJECT_COMPLEXITY: 5,
  D_CERTIFICATIONS: 5,
  E_EXPERIENCE: 5,
};

/**
 * When a student has 0 projects, the entire C category (20 points: C1=5, C2=10, C3=5) is
 * redistributed to A1 (+10), B1 (+5), and E (+5). This ensures the total always equals 100 
 * without awarding "free" points.
 */
export function getDynamicWeights(hasProjects: boolean): ScoringWeights {
  if (hasProjects) {
    return { ...DEFAULT_WEIGHTS };
  }

  return {
    ...DEFAULT_WEIGHTS,
    A1_REQUIRED: DEFAULT_WEIGHTS.A1_REQUIRED + 10,
    B1_MAJOR: DEFAULT_WEIGHTS.B1_MAJOR + 5,
    E_EXPERIENCE: DEFAULT_WEIGHTS.E_EXPERIENCE + 5,
    C1_PROJECT_COUNT: 0,
    C2_PROJECT_RELEVANCE: 0,
    C3_PROJECT_COMPLEXITY: 0,
  };
}

export function verifyWeights(weights: ScoringWeights): void {
  const total =
    weights.A1_REQUIRED +
    weights.A2_NICE +
    weights.A3_SKILL_DEPTH +
    weights.B1_MAJOR +
    weights.B2_COURSES +
    weights.C1_PROJECT_COUNT +
    weights.C2_PROJECT_RELEVANCE +
    weights.C3_PROJECT_COMPLEXITY +
    weights.D_CERTIFICATIONS +
    weights.E_EXPERIENCE;

  if (total !== 100) {
    throw new Error(`Weight total is ${total}, expected 100!`);
  }
}
