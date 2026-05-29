import { FAQ } from "./chatbot.types";

/**
 * Central FAQ knowledge base.
 * Each entry has keywords for NLP matching, a role filter, and a category.
 *
 * Categories:
 *  - general       → site-wide / guest questions
 *  - jobs          → job-search / application (students & guests)
 *  - profile       → profile & CV (students)
 *  - employer      → posting / managing jobs (employers)
 *  - account       → account & auth (all)
 *  - admin         → platform management (admin)
 */
export const FAQ_DB: FAQ[] = [
  // ─────────────────────────────────────────────
  // GENERAL (all roles / guests)
  // ─────────────────────────────────────────────
  {
    id: "gen-1",
    question: "What is SEJobs?",
    answer:
      "SEJobs is a job platform connecting students and fresh graduates with employers. You can search for jobs, apply with your profile, and get AI-powered job recommendations.",
    keywords: ["sejobs", "what is", "about", "platform", "introduce", "overview"],
    roles: [],
    category: "general",
  },
  {
    id: "gen-2",
    question: "Is SEJobs free to use?",
    answer:
      "Yes! Creating an account, browsing jobs, and applying is completely free for students. Employers have a free tier and premium options for featured job listings.",
    keywords: ["free", "cost", "price", "pricing", "charge", "fee", "pay"],
    roles: [],
    category: "general",
  },
  {
    id: "gen-3",
    question: "How do I create an account?",
    answer:
      "Click the 'Register' button on the top-right corner. Fill in your email, password, and choose your role (Student or Employer). You'll receive a verification email to activate your account.",
    keywords: ["register", "sign up", "create account", "new account", "join"],
    roles: [],
    category: "account",
  },
  {
    id: "gen-4",
    question: "I forgot my password. How do I reset it?",
    answer:
      "Go to the Login page and click 'Forgot Password'. Enter your registered email and we'll send you a password reset link valid for 30 minutes.",
    keywords: ["forgot", "reset password", "lost password", "change password", "can't login", "cannot login"],
    roles: [],
    category: "account",
  },
  {
    id: "gen-5",
    question: "How do I contact support?",
    answer:
      "You can reach our support team at support@sejobs.com or via the live chat widget at the bottom-right of every page. We typically respond within 24 hours.",
    keywords: ["contact", "support", "help", "email", "reach out", "customer service"],
    roles: [],
    category: "general",
  },

  // ─────────────────────────────────────────────
  // JOBS (students, guests)
  // ─────────────────────────────────────────────
  {
    id: "job-1",
    question: "How do I search for jobs?",
    answer:
      "Use the search bar on the homepage or the Jobs page. You can filter by keyword, location, job category, employment type, salary range, and required skills. Hit Enter or click 'Search' to see results.",
    keywords: ["search", "find job", "look for job", "job search", "filter jobs", "browse jobs"],
    roles: ["Guest", "Student"],
    category: "jobs",
  },
  {
    id: "job-2",
    question: "How do I apply for a job?",
    answer:
      "Open any job listing and click the 'Apply Now' button. You'll need to be logged in as a Student. Select the CV you want to submit and add an optional cover letter, then confirm your application.",
    keywords: ["apply", "application", "submit", "apply for job", "how to apply"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "job-3",
    question: "Can I track my job applications?",
    answer:
      "Yes! Navigate to your Dashboard → Applications. You'll see all submitted applications with their current statuses: Pending, Reviewed, Interviewing, Offered, or Rejected.",
    keywords: ["track", "application status", "my applications", "application history", "check application"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "job-4",
    question: "What does each application status mean?",
    answer:
      "• Pending – submitted, awaiting employer review\n• Reviewed – employer has seen your application\n• Interviewing – you've been shortlisted for an interview\n• Offered – you've received a job offer\n• Rejected – the employer did not proceed with your application",
    keywords: ["status", "application status meaning", "pending", "reviewed", "interviewing", "offered", "rejected"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "job-5",
    question: "How do job recommendations work?",
    answer:
      "Our AI analyses your profile skills, experience, and education then matches them against open jobs using semantic similarity. The more complete your profile, the better your recommendations.",
    keywords: ["recommendation", "suggested jobs", "ai", "match", "personalized", "for me"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "job-6",
    question: "Can I save jobs for later?",
    answer:
      "Yes. Click the bookmark icon on any job card or job detail page. Saved jobs appear in Dashboard → Saved Jobs.",
    keywords: ["save", "bookmark", "saved jobs", "wishlist", "favourite", "favorite"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "job-7",
    question: "How do I set up job alert notifications?",
    answer:
      "Go to Dashboard → Job Alerts and click 'Create Alert'. Choose your preferred keywords, location, and categories. We'll email you whenever matching jobs are posted.",
    keywords: ["alert", "notification", "job alert", "email notification", "notify", "subscribe"],
    roles: ["Student"],
    category: "jobs",
  },

  // ─────────────────────────────────────────────
  // PROFILE & CV (students)
  // ─────────────────────────────────────────────
  {
    id: "prof-1",
    question: "How do I update my profile?",
    answer:
      "Log in and click your avatar → Profile. You can edit your personal info, skills, education, experience, projects, and social links from the profile editor.",
    keywords: ["update profile", "edit profile", "profile settings", "my profile", "personal info"],
    roles: ["Student"],
    category: "profile",
  },
  {
    id: "prof-2",
    question: "How do I create or upload a CV?",
    answer:
      "Go to Dashboard → CVs. You can either upload a PDF CV or use our online CV builder to create one from scratch using your existing profile data.",
    keywords: ["cv", "resume", "upload cv", "create cv", "build cv", "curriculum vitae"],
    roles: ["Student"],
    category: "profile",
  },
  {
    id: "prof-3",
    question: "How do I add skills to my profile?",
    answer:
      "In your Profile page, scroll to the Skills section and click '+Add Skill'. Search for skills from our database or type a custom skill, then save.",
    keywords: ["skill", "add skill", "skills", "competency", "expertise"],
    roles: ["Student"],
    category: "profile",
  },
  {
    id: "feat-1",
    question: "How does the AI CV Scoring work?",
    answer:
      "Our AI analyzes your CV against the job requirements. It calculates a score based on your matched skills, education (bonus for IT-related majors), project complexity, and relevant work experience. You can see your score in the Applications dashboard.",
    keywords: ["cv score", "scoring", "ai score", "how is it calculated", "match percentage", "score breakdown"],
    roles: ["Student"],
    category: "profile",
  },
  {
    id: "feat-2",
    question: "How can I chat with an employer or student?",
    answer:
      "Students can message employers after applying for a job, and employers can initiate chats with applicants from their dashboard. Look for the message icon in your application details to start a real-time conversation.",
    keywords: ["chat", "message", "contact employer", "contact student", "inbox", "real-time chat"],
    roles: ["Student", "Employer"],
    category: "general",
  },
  {
    id: "feat-3",
    question: "How will I know if I have a new message or update?",
    answer:
      "SEJobs sends real-time notifications in your browser whenever you receive a new message or your application status changes. We also send automated email notifications to ensure you never miss an important update.",
    keywords: ["notification", "email alert", "message alert", "how to know", "stay updated"],
    roles: ["Student", "Employer"],
    category: "general",
  },

  // ─────────────────────────────────────────────
  // EMPLOYER (employers)
  // ─────────────────────────────────────────────
  {
    id: "emp-1",
    question: "How do I post a job as an employer?",
    answer:
      "Log in with your Employer account, go to Dashboard → Post a Job. Fill in the job title, description, requirements, salary range, and location, then click 'Publish'. New posts are reviewed within 24 hours.",
    keywords: ["post job", "create job", "publish job", "new job listing", "add job"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "emp-2",
    question: "How do I manage applications I've received?",
    answer:
      "In Dashboard → Applications, you can see all candidates who applied to your jobs. Filter by job, status, or date. Click an applicant to view their profile and CV, then update their status.",
    keywords: ["manage applications", "review applications", "candidates", "applicants", "shortlist"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "emp-3",
    question: "How long does job verification take?",
    answer:
      "Our team reviews job postings within 24 business hours. You'll receive an email notification once your job is Approved or if changes are requested.",
    keywords: ["verify", "verification", "review", "approve", "job approval", "pending job"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "emp-4",
    question: "Can I edit or remove a job posting?",
    answer:
      "Yes. Go to Dashboard → My Jobs, click the three-dot menu on the job card, and choose Edit or Delete. Editing a live job will re-queue it for a quick review.",
    keywords: ["edit job", "update job", "delete job", "remove job", "close job"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "emp-5",
    question: "How do I set up my company profile?",
    answer:
      "After registering as Employer, go to Dashboard → Company Profile. Add your company name, logo, description, industry, size, and social links. A complete profile improves candidate trust.",
    keywords: ["company profile", "company page", "employer profile", "company info", "company details"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "emp-6",
    question: "How can I get my company verified?",
    answer:
      "Submit your business registration documents in Dashboard → Company Profile → Verification tab. Our admin team reviews submissions within 2 business days. Verified companies bypass job-post moderation.",
    keywords: ["company verification", "verified", "trust badge", "verify company", "business registration"],
    roles: ["Employer"],
    category: "employer",
  },

  // ─────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────
  {
    id: "adm-1",
    question: "How do I approve or reject job postings?",
    answer:
      "In the Admin panel → Jobs, filter by status 'Pending'. Open a job, review the content, then click Approve or Reject with an optional note sent to the employer.",
    keywords: ["approve job", "reject job", "moderate", "admin jobs", "job review"],
    roles: ["Admin"],
    category: "admin",
  },
  {
    id: "adm-2",
    question: "How do I manage user accounts?",
    answer:
      "Admin panel → Users. You can search, filter by role, view activity, ban, or delete accounts. Use the bulk-action toolbar for mass operations.",
    keywords: ["manage users", "ban user", "delete account", "user management", "user list"],
    roles: ["Admin"],
    category: "admin",
  },

  // ─────────────────────────────────────────────
  // VIETNAMESE (parallel entries, all roles)
  // ─────────────────────────────────────────────
  // --- GENERAL ---
  {
    id: "vi-gen-1",
    question: "SEJobs là gì?",
    answer:
      "SEJobs là nền tảng việc làm kết nối sinh viên và người mới tốt nghiệp với nhà tuyển dụng. Bạn có thể tìm kiếm việc làm, ứng tuyển và nhận gợi ý việc làm thông minh dựa trên hồ sơ của mình.",
    keywords: ["sejobs là gì", "giới thiệu", "nền tảng", "về sejobs", "sejobs là"],
    roles: [],
    category: "general",
  },
  {
    id: "vi-gen-2",
    question: "SEJobs có miễn phí không?",
    answer:
      "Có! Tạo tài khoản, tìm việc và ứng tuyển hoàn toàn miễn phí cho sinh viên. Nhà tuyển dụng có gói miễn phí và các tùy chọn cao cấp cho tin tuyển dụng nổi bật.",
    keywords: ["miễn phí", "giá", "phí", "chi phí", "có mất tiền không", "free"],
    roles: [],
    category: "general",
  },
  {
    id: "vi-gen-3",
    question: "Làm thế nào để tạo tài khoản?",
    answer:
      "Nhấn nút 'Đăng ký' ở góc trên bên phải. Điền email, mật khẩu và chọn vai trò (Sinh viên hoặc Nhà tuyển dụng). Bạn sẽ nhận được email xác thực để kích hoạt tài khoản.",
    keywords: ["đăng ký", "tạo tài khoản", "đăng kí", "làm sao để tạo tài khoản"],
    roles: [],
    category: "account",
  },
  {
    id: "vi-gen-4",
    question: "Tôi quên mật khẩu. Làm thế nào để đặt lại?",
    answer:
      "Vào trang Đăng nhập và nhấn 'Quên mật khẩu'. Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu có hiệu lực trong 30 phút.",
    keywords: ["quên mật khẩu", "reset mật khẩu", "đặt lại mật khẩu", "không vào được", "quen mat khau"],
    roles: [],
    category: "account",
  },
  {
    id: "vi-gen-5",
    question: "Làm thế nào để liên hệ hỗ trợ?",
    answer:
      "Bạn có thể liên hệ đội hỗ trợ qua email support@sejobs.com hoặc widget chat trực tiếp ở góc dưới bên phải mỗi trang. Chúng tôi thường phản hồi trong vòng 24 giờ.",
    keywords: ["liên hệ", "hỗ trợ", "trợ giúp", "email hỗ trợ", "lien he", "ho tro"],
    roles: [],
    category: "general",
  },

  // --- JOBS ---
  {
    id: "vi-job-1",
    question: "Làm thế nào để tìm kiếm việc làm?",
    answer:
      "Sử dụng thanh tìm kiếm trên trang chủ hoặc trang Việc làm. Bạn có thể lọc theo từ khóa, địa điểm, ngành nghề, loại hình, mức lương và kỹ năng yêu cầu. Nhấn Enter hoặc 'Tìm kiếm' để xem kết quả.",
    keywords: ["tìm việc", "tìm kiếm việc làm", "tìm job", "việc làm", "tim viec", "job"],
    roles: ["Guest", "Student"],
    category: "jobs",
  },
  {
    id: "vi-job-2",
    question: "Làm thế nào để ứng tuyển?",
    answer:
      "Mở tin tuyển dụng và nhấn nút 'Ứng tuyển ngay'. Bạn cần đăng nhập với vai trò Sinh viên. Chọn CV muốn gửi, thêm thư xin việc (tùy chọn) và xác nhận ứng tuyển.",
    keywords: ["ứng tuyển", "nộp đơn", "apply", "ứng tuyển việc làm", "cách ứng tuyển", "ung tuyen"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "vi-job-3",
    question: "Tôi có thể theo dõi đơn ứng tuyển không?",
    answer:
      "Có! Vào Dashboard → Đơn ứng tuyển. Bạn sẽ thấy tất cả đơn đã nộp kèm trạng thái: Đang chờ, Đã xem, Phỏng vấn, Đã nhận hoặc Từ chối.",
    keywords: ["theo dõi đơn", "trạng thái ứng tuyển", "đơn ứng tuyển", "các đơn đã nộp", "theo doi"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "vi-job-4",
    question: "Gợi ý việc làm hoạt động thế nào?",
    answer:
      "AI của chúng tôi phân tích kỹ năng, kinh nghiệm và học vấn trong hồ sơ của bạn, sau đó đối sánh với các việc làm đang tuyển dụng. Hồ sơ càng đầy đủ, gợi ý càng chính xác.",
    keywords: ["gợi ý việc làm", "đề xuất", "gợi ý", "recommendation", "gợi ý công việc", "gợi ý job"],
    roles: ["Student"],
    category: "jobs",
  },
  {
    id: "vi-job-5",
    question: "Làm thế nào để lưu việc làm để xem sau?",
    answer:
      "Nhấn vào biểu tượng bookmark trên thẻ tin tuyển dụng hoặc trang chi tiết. Các việc đã lưu xuất hiện trong Dashboard → Việc làm đã lưu.",
    keywords: ["lưu việc làm", "bookmark", "việc làm đã lưu", "lưu job", "xem sau"],
    roles: ["Student"],
    category: "jobs",
  },

  // --- PROFILE & CV ---
  {
    id: "vi-prof-1",
    question: "Làm thế nào để cập nhật hồ sơ?",
    answer:
      "Đăng nhập và nhấn vào avatar → Hồ sơ. Bạn có thể chỉnh sửa thông tin cá nhân, kỹ năng, học vấn, kinh nghiệm, dự án và các liên kết mạng xã hội.",
    keywords: ["cập nhật hồ sơ", "chỉnh sửa hồ sơ", "hồ sơ", "profile", "thông tin cá nhân", "cap nhat ho so"],
    roles: ["Student"],
    category: "profile",
  },
  {
    id: "vi-prof-2",
    question: "Làm thế nào để tạo hoặc tải lên CV?",
    answer:
      "Vào Dashboard → CV. Bạn có thể tải lên CV dạng PDF hoặc sử dụng trình tạo CV trực tuyến để tạo CV từ dữ liệu hồ sơ có sẵn.",
    keywords: ["cv", "tải lên cv", "tạo cv", "upload cv", "resume", "sơ yếu lý lịch"],
    roles: ["Student"],
    category: "profile",
  },
  {
    id: "vi-prof-3",
    question: "Chấm điểm CV hoạt động như thế nào?",
    answer:
      "AI của chúng tôi phân tích CV của bạn dựa trên yêu cầu công việc. Điểm được tính dựa trên kỹ năng phù hợp, học vấn (ưu tiên ngành IT), độ phức tạp dự án và kinh nghiệm làm việc.",
    keywords: ["chấm điểm cv", "điểm cv", "cv score", "cách tính điểm", "chấm điểm", "scoring"],
    roles: ["Student"],
    category: "profile",
  },
  {
    id: "vi-prof-4",
    question: "Làm thế nào để thêm kỹ năng vào hồ sơ?",
    answer:
      "Trong trang Hồ sơ, kéo đến mục Kỹ năng và nhấn '+Thêm kỹ năng'. Tìm kiếm từ cơ sở dữ liệu hoặc nhập kỹ năng tùy chỉnh, sau đó lưu lại.",
    keywords: ["thêm kỹ năng", "kỹ năng", "skill", "thêm skill", "cập nhật kỹ năng"],
    roles: ["Student"],
    category: "profile",
  },

  // --- CHAT & NOTIFICATIONS ---
  {
    id: "vi-feat-1",
    question: "Làm thế nào để chat với nhà tuyển dụng?",
    answer:
      "Sinh viên có thể nhắn tin cho nhà tuyển dụng sau khi ứng tuyển. Nhà tuyển dụng có thể chủ động chat với ứng viên từ Dashboard. Tìm biểu tượng tin nhắn trong chi tiết đơn ứng tuyển để bắt đầu.",
    keywords: ["chat", "nhắn tin", "tin nhắn", "liên hệ nhà tuyển dụng", "message", "trò chuyện"],
    roles: ["Student", "Employer"],
    category: "general",
  },
  {
    id: "vi-feat-2",
    question: "Làm sao để biết có tin nhắn hoặc cập nhật mới?",
    answer:
      "SEJobs gửi thông báo trực tiếp trên trình duyệt khi bạn có tin nhắn mới hoặc trạng thái đơn ứng tuyển thay đổi. Chúng tôi cũng gửi email tự động để bạn không bỏ lỡ cập nhật quan trọng.",
    keywords: ["thông báo", "email thông báo", "cập nhật", "tin nhắn mới", "notifications"],
    roles: ["Student", "Employer"],
    category: "general",
  },

  // --- EMPLOYER ---
  {
    id: "vi-emp-1",
    question: "Làm thế nào để đăng tin tuyển dụng?",
    answer:
      "Đăng nhập tài khoản Nhà tuyển dụng, vào Dashboard → Đăng tin. Điền tiêu đề, mô tả, yêu cầu, mức lương và địa điểm, sau đó nhấn 'Đăng'. Tin mới sẽ được duyệt trong vòng 24 giờ.",
    keywords: ["đăng tin", "đăng tuyển", "tin tuyển dụng", "đăng job", "tạo tin tuyển dụng"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "vi-emp-2",
    question: "Làm thế nào để quản lý đơn ứng tuyển?",
    answer:
      "Trong Dashboard → Đơn ứng tuyển, bạn xem tất cả ứng viên đã nộp đơn. Lọc theo công việc, trạng thái hoặc ngày. Nhấn vào ứng viên để xem hồ sơ và CV, sau đó cập nhật trạng thái.",
    keywords: ["quản lý đơn", "ứng viên", "candidates", "xem đơn ứng tuyển", "duyệt đơn"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "vi-emp-3",
    question: "Làm thế nào để xác thực công ty?",
    answer:
      "Gửi giấy tờ đăng ký kinh doanh trong Dashboard → Hồ sơ công ty → tab Xác thực. Đội ngũ admin xem xét trong vòng 2 ngày. Công ty đã xác thực được bỏ qua kiểm duyệt tin tuyển dụng.",
    keywords: ["xác thực công ty", "verify công ty", "xác thực doanh nghiệp", "trust badge"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "vi-emp-4",
    question: "Tôi có thể sửa hoặc xóa tin tuyển dụng không?",
    answer:
      "Có. Vào Dashboard → Tin của tôi, nhấn menu ba chấm trên thẻ tin và chọn Sửa hoặc Xóa. Sửa tin đang hoạt động sẽ đưa tin vào hàng chờ duyệt lại.",
    keywords: ["sửa tin tuyển dụng", "xóa tin", "cập nhật tin", "gỡ tin tuyển dụng", "chỉnh sửa job"],
    roles: ["Employer"],
    category: "employer",
  },
  {
    id: "vi-emp-5",
    question: "Làm thế nào để thiết lập hồ sơ công ty?",
    answer:
      "Sau khi đăng ký Nhà tuyển dụng, vào Dashboard → Hồ sơ công ty. Thêm tên công ty, logo, mô tả, ngành nghề, quy mô và các liên kết mạng xã hội. Hồ sơ đầy đủ giúp tăng độ tin cậy.",
    keywords: ["hồ sơ công ty", "trang công ty", "company profile", "thông tin công ty"],
    roles: ["Employer"],
    category: "employer",
  },
];

/** Categories with display labels for the frontend */
export const CATEGORIES: Record<string, string> = {
  general: "General",
  jobs: "Jobs",
  profile: "Profile & CV",
  employer: "For Employers",
  account: "Account",
  admin: "Administration",
};
