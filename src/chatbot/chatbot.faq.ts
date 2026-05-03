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
