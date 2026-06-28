import { JobAfterJoined } from "@/types/common";

const convert = {
  // "1,2,3" => [1, 2, 3]
  split<T = string>(input: string | undefined | null, delimiter: string = ",", formatFn?: (value: string) => T): T[] {
    if (!input?.trim()) return []; // xử lý chuỗi rỗng / chỉ có whitespace

    const items = input
      .split(delimiter)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return formatFn ? items.map(formatFn) : (items as unknown as T[]);
  },
  normalizeArray: (v?: any[]) => (Array.isArray(v) && v.length > 0 ? v : null),
  convertJobToES: (job: JobAfterJoined) => {
    const skills = job.skills ?? [];
    const categories = job.categories ?? [];
    const levels = job.levels ?? [];
    const branches = job.company_branches ?? [];
    const employment_types = job.employment_types ?? [];

    return {
      id: job.id,

      title: job.title ?? "",
      description: job.description ?? "",

      salary_from: job.salary_from ?? 0,
      salary_to: job.salary_to ?? 0,
      salary_text: job.salary_text ?? "",

      status: job.status ?? "",

      job_deadline: job.job_deadline ?? null,
      created_at: job.created_at ?? null,

      // -------- COMPANY --------
      company: {
        id: job.company?.id ?? null,
        name: job.company?.name ?? "",
        website_url: job.company?.website_url ?? "",
        is_verified: job.company?.is_verified ?? false,
        is_active: job.company?.is_active ?? false,
      },

      // -------- BRANCHES --------
      company_branches: branches.map((b: any) => ({
        id: b.id ?? null,
        name: b.name ?? "",
        address: b.address ?? "",

        ward: {
          id: b.ward?.id ?? null,
          name: b.ward?.name ?? "",
        },

        province: {
          id: b.province?.id ?? null,
          name: b.province?.name ?? "",
        },

        country: {
          id: b.country?.id ?? null,
          name: b.country?.name ?? "",
        },
      })),

      // -------- NESTED --------
      skills: skills.map((s) => ({
        id: s.id ?? null,
        name: s.name ?? "",
      })),

      categories: categories.map((c) => ({
        id: c.id ?? null,
        name: c.name ?? "",
      })),

      levels: levels.map((l) => ({
        id: l.id ?? null,
        name: l.name ?? "",
      })),

      employment_types: employment_types.map((e) => ({
        id: e.id ?? null,
        name: e.name ?? "",
      })),

      job_posted_at: job.job_posted_at ?? null,

      // -------- FLATTEN (🔥 quan trọng) --------
      skill_ids: skills.map((s) => s.id).filter(Boolean),
      category_ids: categories.map((c) => c.id).filter(Boolean),
      level_ids: levels.map((l) => l.id).filter(Boolean),

      province_ids: branches.map((b: any) => b.province?.id).filter(Boolean),

      // -------- SEARCH TEXT --------
      search_text: [job.title, job.company?.name, ...skills.map((s) => s.name)].filter(Boolean).join(" "),

      // -------- COMPLETION SUGGEST --------
      // Dùng cho ES Suggest API (autocomplete khi user gõ từng ký tự)
      suggest: {
        input: [
          // Job title — weight cao nhất
          ...(job.title ? [job.title] : []),
          // Company name
          ...(job.company?.name ? [job.company.name] : []),
          // Skills
          ...skills.map((s) => s.name).filter(Boolean),
          // Categories
          ...categories.map((c) => c.name).filter(Boolean),
        ],
        weight: 1,
      },
    };
  },
};

export default convert;
