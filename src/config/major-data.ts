export type SchoolTier = "S" | "A" | "B" | "C";

export interface SchoolEntry {
  name: string;
  aliases: string[];
  tier: SchoolTier;
}

export const SCHOOL_TIER_LABEL: Record<SchoolTier, string> = {
  S: "Chuyên CNTT / Kỹ thuật hàng đầu",
  A: "Đa ngành lớn, khoa CNTT mạnh",
  B: "Tư thục / ngoài công lập",
  C: "Địa phương / vùng",
};

export const IT_SCHOOLS: SchoolEntry[] = [
  // ===== TIER S: Chuyên CNTT / Kỹ thuật hàng đầu =====
  { name: "Đại học Công nghệ Thông tin – ĐHQG HCM", aliases: ["uit", "university of information technology", "đh công nghệ thông tin", "đại học công nghệ thông tin", "vnuhcm"], tier: "S" },
  { name: "Đại học Công nghệ – ĐHQG Hà Nội", aliases: ["uet", "university of engineering and technology", "đh công nghệ", "đại học công nghệ"], tier: "S" },
  { name: "Học viện Công nghệ Bưu chính Viễn thông", aliases: ["ptit", "bưu chính viễn thông", "posts and telecommunications institute of technology", "học viện bưu chính viễn thông"], tier: "S" },
  { name: "Đại học FPT", aliases: ["fpt", "fpt university", "đh fpt", "đại học fpt"], tier: "S" },
  { name: "Đại học Bách Khoa Hà Nội", aliases: ["hust", "bách khoa hà nội", "bkhn", "hanoi university of science and technology", "đh bách khoa hà nội", "đại học bách khoa hà nội"], tier: "S" },
  { name: "Đại học Bách Khoa TP.HCM", aliases: ["bku", "hcmut", "bách khoa hcm", "bach khoa university", "ho chi minh city university of technology", "đh bách khoa hcm", "đại học bách khoa hcm"], tier: "S" },
  { name: "Đại học Bách Khoa – ĐH Đà Nẵng", aliases: ["dut", "bách khoa đà nẵng", "the university of danang university of science and technology", "đh bách khoa đà nẵng"], tier: "S" },
  { name: "Đại học Khoa học Tự nhiên – ĐHQG HCM", aliases: ["hcmus", "khoa học tự nhiên hcm", "university of science vnu hcm", "đh khoa học tự nhiên hcm", "đại học khoa học tự nhiên hcm"], tier: "S" },
  { name: "Đại học Khoa học Tự nhiên – ĐHQG Hà Nội", aliases: ["hus", "khoa học tự nhiên hà nội", "university of science vnu ha noi", "đh khoa học tự nhiên hà nội", "đại học khoa học tự nhiên hà nội"], tier: "S" },
  { name: "Học viện Kỹ thuật Mật mã", aliases: ["act", "học viện kỹ thuật mật mã", "academy of cryptography techniques", "học viện mật mã", "kỹ thuật mật mã"], tier: "S" },
  { name: "Học viện Kỹ thuật Quân sự", aliases: ["mta", "học viện kỹ thuật quân sự", "military technical academy"], tier: "S" },
  { name: "Đại học Khoa học và Công nghệ Hà Nội", aliases: ["usth", "university of science and technology of ha noi", "khoa học và công nghệ hà nội", "đh khoa học công nghệ hà nội"], tier: "S" },

  // ===== TIER A: Đa ngành lớn, khoa CNTT mạnh =====
  { name: "Đại học Sư phạm Kỹ thuật TP.HCM", aliases: ["hcmute", "sư phạm kỹ thuật hcm", "ho chi minh city university of technology and education", "đh sư phạm kỹ thuật hcm"], tier: "A" },
  { name: "Đại học Công nghiệp TP.HCM", aliases: ["iuh", "công nghiệp hcm", "industrial university of ho chi minh city", "đh công nghiệp hcm"], tier: "A" },
  { name: "Đại học Công nghiệp Hà Nội", aliases: ["haUI", "công nghiệp hà nội", "hanoi university of industry", "đh công nghiệp hà nội"], tier: "A" },
  { name: "Đại học Tôn Đức Thắng", aliases: ["tdtu", "tôn đức thắng", "ton duc thang university", "đh tôn đức thắng"], tier: "A" },
  { name: "Đại học Duy Tân", aliases: ["dtu", "duy tân", "duy tan university", "đh duy tân"], tier: "A" },
  { name: "Đại học Đà Nẵng", aliases: ["ud", "đà nẵng", "the university of danang", "đh đà nẵng", "đại học đà nẵng"], tier: "A" },
  { name: "Đại học Quốc tế – ĐHQG HCM", aliases: ["hcmiu", "international university vnu hcm", "đh quốc tế hcm", "đại học quốc tế hcm"], tier: "A" },
  { name: "Đại học Cần Thơ", aliases: ["ctu", "cần thơ", "can tho university", "đh cần thơ", "đại học cần thơ"], tier: "A" },
  { name: "Đại học Giao thông Vận tải", aliases: ["utc", "giao thông vận tải", "university of transport and communications", "đh giao thông vận tải"], tier: "A" },
  { name: "Đại học Sư phạm Kỹ thuật Hưng Yên", aliases: ["utehy", "sư phạm kỹ thuật hưng yên", "hung yen university of technology and education"], tier: "A" },
  { name: "Đại học Thái Nguyên", aliases: ["tnu", "thái nguyên", "thai nguyen university", "đh thái nguyên", "đại học thái nguyên"], tier: "A" },
  { name: "Đại học Công nghệ Thông tin và Truyền thông – ĐH Thái Nguyên", aliases: ["ictu", "công nghệ thông tin thái nguyên", "university of information and communication technology", "đh cntt thái nguyên"], tier: "A" },

  // ===== TIER B: Tư thục / ngoài công lập =====
  { name: "Đại học Hutech", aliases: ["hutech", "ho chi minh city university of technology", "đh hutech", "đại học hutech"], tier: "B" },
  { name: "Đại học Văn Lang", aliases: ["vlu", "văn lang", "van lang university", "đh văn lang", "đại học văn lang"], tier: "B" },
  { name: "Đại học Nguyễn Tất Thành", aliases: ["nttu", "nguyễn tất thành", "nguyen tat thanh university", "đh nguyễn tất thành"], tier: "B" },
  { name: "Đại học Công nghệ TP.HCM", aliases: ["hutech", "công nghệ hcm", "đh công nghệ hcm"], tier: "B" },
  { name: "Đại học Gia Định", aliases: ["gdu", "gia định", "gia dinh university", "đh gia định"], tier: "B" },
  { name: "Đại học Sài Gòn", aliases: ["sgu", "sài gòn", "sai gon university", "đh sài gòn"], tier: "B" },
  { name: "Đại học Kinh tế – Kỹ thuật Công nghiệp", aliases: ["uneti", "kinh tế kỹ thuật công nghiệp", "university of economics technology for industries", "đh kinh tế kỹ thuật công nghiệp"], tier: "B" },
  { name: "Đại học Thăng Long", aliases: ["tlu", "thăng long", "thang long university", "đh thăng long"], tier: "B" },
  { name: "Đại học Phenikaa", aliases: ["phenikaa", "đh phenikaa", "đại học phenikaa"], tier: "B" },
  { name: "Đại học VinUni", aliases: ["vinuni", "vinuni", "vinuniversity", "đh vinuni", "đại học vinuni"], tier: "B" },
  { name: "Đại học RMIT Việt Nam", aliases: ["rmit", "rmit vietnam", "rmit university vietnam", "đh rmit"], tier: "B" },

  // ===== TIER C: Địa phương / vùng =====
  { name: "Đại học Quy Nhơn", aliases: ["qnu", "quy nhơn", "quy nhon university", "đh quy nhơn"], tier: "C" },
  { name: "Đại học Vinh", aliases: ["vu", "vinh", "vinh university", "đh vinh", "đại học vinh"], tier: "C" },
  { name: "Đại học Huế", aliases: ["hu", "huế", "hue university", "đh huế", "đại học huế"], tier: "C" },
  { name: "Đại học Khoa học – ĐH Huế", aliases: ["husc", "khoa học huế", "hue university of science", "đh khoa học huế"], tier: "C" },
  { name: "Đại học Nha Trang", aliases: ["ntu", "nha trang", "nha trang university", "đh nha trang"], tier: "C" },
  { name: "Đại học Tây Nguyên", aliases: ["tnu", "tây nguyên", "tay nguyen university", "đh tây nguyên"], tier: "C" },
  { name: "Đại học An Giang", aliases: ["agu", "an giang", "an giang university", "đh an giang"], tier: "C" },
  { name: "Đại học Trà Vinh", aliases: ["tvu", "trà vinh", "tra vinh university", "đh trà vinh"], tier: "C" },
  { name: "Đại học Tiền Giang", aliases: ["tgu", "tiền giang", "tien giang university", "đh tiền giang"], tier: "C" },
  { name: "Đại học Lạc Hồng", aliases: ["lhu", "lạc hồng", "lac hong university", "đh lạc hồng"], tier: "C" },
  { name: "Đại học Bà Rịa – Vũng Tàu", aliases: ["bvu", "bà rịa vũng tàu", "ba ria vung tau university", "đh bà rịa vũng tàu"], tier: "C" },
];

export const IT_MAJORS = [
  // Vietnamese
  "công nghệ thông tin",
  "khoa học máy tính",
  "kỹ thuật phần mềm",
  "công nghệ phần mềm",
  "hệ thống thông tin",
  "hệ thống thông tin quản lý",
  "an toàn thông tin",
  "mạng máy tính",
  "máy tính",
  "truyền thông đa phương tiện",
  "công nghệ đa phương tiện",
  "trí tuệ nhân tạo",
  "khoa học dữ liệu",
  "phân tích dữ liệu",
  "kỹ thuật máy tính",
  "khoa học dữ liệu và trí tuệ nhân tạo",
  "thương mại điện tử",
  "kỹ thuật dữ liệu",
  // English
  "computer science",
  "software engineering",
  "information technology",
  "information systems",
  "management information systems",
  "cybersecurity",
  "data science",
  "data analytics",
  "artificial intelligence",
  "computer engineering",
  "web development",
  "mobile development",
  "cloud computing",
  "ui/ux",
  "software engineer",
  "it engineer",
  "cs engineer",
  "se engineer",
  "mis",
  "ict",
];

export const RELATED_MAJORS = [
  // Vietnamese
  "toán tin",
  "toán ứng dụng",
  "điện tử",
  "viễn thông",
  "kỹ thuật điện",
  "kỹ thuật điều khiển",
  "tự động hóa",
  "cơ điện tử",
  "vật lý tin học",
  // English
  "applied mathematics",
  "electronics",
  "telecommunications",
  "electrical engineering",
  "mechatronics",
  "automation",
  "physics",
  "business information systems",
  "digital marketing",
  "management information systems",
];

export type MajorType = "it" | "related" | "unrelated" | "unknown";

export function classifyMajor(combined: string): MajorType {
  const c = combined.toLowerCase().trim();
  if (!c) return "unknown";
  if (IT_MAJORS.some((m) => c.includes(m))) return "it";
  if (RELATED_MAJORS.some((m) => c.includes(m))) return "related";
  return "unrelated";
}

/**
 * Tier × Major scoring matrix (% of maxScore)
 *
 *             IT major  Related  Unrelated  Unknown
 * Tier S      100%      80%      40%        50%
 * Tier A      90%       70%      30%        35%
 * Tier B      75%       55%      15%        20%
 * Tier C      65%       40%       0%        10%
 * No school   80%       50%       0%        10%
 */
const MATRIX: Record<SchoolTier | "NONE", Record<MajorType, number>> = {
  S: { it: 1.0, related: 0.8, unrelated: 0.4, unknown: 0.5 },
  A: { it: 0.9, related: 0.7, unrelated: 0.3, unknown: 0.35 },
  B: { it: 0.75, related: 0.55, unrelated: 0.15, unknown: 0.2 },
  C: { it: 0.65, related: 0.4, unrelated: 0.0, unknown: 0.1 },
  NONE: { it: 0.8, related: 0.5, unrelated: 0.0, unknown: 0.1 },
};

export function getScoreMultiplier(tier: SchoolTier | null, majorType: MajorType): number {
  return (tier ? MATRIX[tier] : MATRIX.NONE)[majorType];
}

const VIETNAMESE_TONE_MAP: Record<string, string> = {
  "à": "a", "á": "a", "ả": "a", "ã": "a", "ạ": "a",
  "â": "a", "ầ": "a", "ấ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
  "ă": "a", "ằ": "a", "ắ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
  "è": "e", "é": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
  "ê": "e", "ề": "e", "ế": "e", "ể": "e", "ễ": "e", "ệ": "e",
  "ì": "i", "í": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
  "ò": "o", "ó": "o", "ỏ": "o", "õ": "o", "ọ": "o",
  "ô": "o", "ồ": "o", "ố": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
  "ơ": "o", "ờ": "o", "ớ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
  "ù": "u", "ú": "u", "ủ": "u", "ũ": "u", "ụ": "u",
  "ư": "u", "ừ": "u", "ứ": "u", "ử": "u", "ữ": "u", "ự": "u",
  "ỳ": "y", "ý": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
  "đ": "d",
};

export function removeVietnameseTones(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split("")
    .map((ch) => VIETNAMESE_TONE_MAP[ch] ?? ch)
    .join("");
}

export function normalizeSchoolName(text: string): string {
  if (!text) return "";
  let s = removeVietnameseTones(text);
  s = s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

export function findSchool(input: string): { entry: SchoolEntry; normalized: string } | null {
  const normalized = normalizeSchoolName(input);
  if (!normalized) return null;

  for (const entry of IT_SCHOOLS) {
    for (const alias of entry.aliases) {
      const aliasNorm = normalizeSchoolName(alias);
      if (
        normalized === aliasNorm ||
        normalized.includes(aliasNorm) ||
        aliasNorm.includes(normalized)
      ) {
        return { entry, normalized };
      }
    }
  }
  return null;
}

/** Convert university name to English abbreviation if known (HUST, UIT, etc.) */
export function getSchoolAbbreviation(input: string): string | null {
  const found = findSchool(input);
  if (!found) return null;
  if (found.entry.aliases.length === 0) return null;
  return found.entry.aliases[0]!.toUpperCase();
}
