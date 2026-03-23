import skillMappingRepository, {
  SkillMapping,
  SkillMappingInsert,
  SkillMappingQueryParams,
  SkillMappingUpdate,
} from "@/repositories/skill_mapping.repository";

let cachedMappings: SkillMapping[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class SkillMappingService {
  async findAll(input: SkillMappingQueryParams) {
    return skillMappingRepository.findAll(input);
  }

  async findOne(id: number) {
    return skillMappingRepository.findOne(id);
  }

  async create(input: SkillMappingInsert) {
    this.invalidateCache();
    return skillMappingRepository.create(input);
  }

  async update(id: number, input: SkillMappingUpdate) {
    this.invalidateCache();
    return skillMappingRepository.update(id, input);
  }

  async delete(id: number) {
    this.invalidateCache();
    return skillMappingRepository.delete(id);
  }

  async bulkUpsert(mappings: SkillMappingInsert[]) {
    this.invalidateCache();
    return skillMappingRepository.bulkUpsert(mappings);
  }

  // ─── HELPERS ──────────────────────────────

  private async loadMappings(): Promise<SkillMapping[]> {
    const now = Date.now();
    if (cachedMappings && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedMappings;
    }
    const data = await skillMappingRepository.findAllActive();
    cachedMappings = (data || []) as SkillMapping[];
    cacheTimestamp = now;
    return cachedMappings;
  }

  private invalidateCache() {
    cachedMappings = null;
    cacheTimestamp = 0;
  }

  /**
   * Given a list of input skills (from a CV or JD), expand each one
   * by checking against skill_name and synonyms in the mapping table.
   * Returns a deduplicated, lowercased set of: original + synonyms + related_skills.
   *
   * Example:
   *   input: ["ReactJS", ".NET"]
   *   output: ["reactjs", "react", "react.js", "react js", "frontend", "javascript", "redux", "next.js",
   *            ".net", ".net framework", ".net core", "dotnet", "dot net", "asp.net", "backend", "c#", "azure"]
   */
  async expandSkills(inputSkills: string[]): Promise<string[]> {
    const mappings = await this.loadMappings();
    const expanded = new Set<string>();

    for (const skill of inputSkills) {
      const skillLower = skill.toLowerCase().trim();
      if (!skillLower) continue;
      expanded.add(skillLower);

      const mapping = mappings.find((m) => {
        const nameMatch = m.skill_name.toLowerCase() === skillLower;
        const synonymMatch = (m.synonyms || []).some((s) => s.toLowerCase() === skillLower);
        return nameMatch || synonymMatch;
      });

      if (mapping) {
        expanded.add(mapping.skill_name.toLowerCase());
        for (const syn of mapping.synonyms || []) {
          expanded.add(syn.toLowerCase());
        }
        for (const rel of mapping.related_skills || []) {
          expanded.add(rel.toLowerCase());
        }
      }
    }

    return Array.from(expanded);
  }

  async resolveSkill(skill: string): Promise<SkillMapping | null> {
    const mappings = await this.loadMappings();
    const skillLower = skill.toLowerCase().trim();

    return (
      mappings.find((m) => {
        if (m.skill_name.toLowerCase() === skillLower) return true;
        return (m.synonyms || []).some((s) => s.toLowerCase() === skillLower);
      }) || null
    );
  }
}

export default new SkillMappingService();
