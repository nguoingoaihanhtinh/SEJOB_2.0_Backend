// import nodemailer from "nodemailer";

// Cấu hình từ .env
// const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
// const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
// const SMTP_USER = process.env.SMTP_USER;
// const SMTP_PASS = process.env.SMTP_PASS;

// if (!SMTP_USER || !SMTP_PASS) {
//   console.warn("SMTP config missing — email will be logged to console instead");
// }

// const transporter =
//   SMTP_USER && SMTP_PASS
//     ? nodemailer.createTransport({
//         host: SMTP_HOST,
//         port: SMTP_PORT,
//         secure: false, // true cho port 465, false cho 587
//         auth: {
//           user: SMTP_USER,
//           pass: SMTP_PASS,
//         },
//       })
//     : null;

async function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  try {
    // Dynamic import - chỉ load khi cần
    const nodemailer = await import("nodemailer");

    return nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: { user, pass },
    });
  } catch (error) {
    console.warn("⚠️ nodemailer not installed - emails will be mocked");
    return null;
  }
}

// Email Templates
class EmailTemplates {
  private static baseTemplate(content: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        ${content}
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #777; font-size: 12px; text-align: center;">© 2026 SEJobs. All rights reserved.</p>
      </div>
    `;
  }

  static resetPasswordOtp(otp: string): string {
    const content = `
      <h2 style="color: #333;">Đặt lại mật khẩu</h2>
      <p>Xin chào,</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản SEJobs.</p>
      <p><strong>Mã OTP của bạn là:</strong></p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #d32f2f;">${otp}</span>
      </div>
      <p>Mã này sẽ hết hạn sau <strong>10 phút</strong>.</p>
      <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.</p>
    `;
    return this.baseTemplate(content);
  }

  static jobNotification(params: {
    firstName: string;
    jobTitle: string;
    company: string;
    companyLogo?: string;
    salaryText: string;
    description: string;
    jobId: number;
    location?: string;
  }): string {
    const frontendUrl = process.env.FRONTEND_URL || "https://sejobs.vercel.app";
    const jobUrl = `${frontendUrl}/job?id=${params.jobId}`;
    const locationText = params.location || "Hồ Chí Minh";

    // Logo: dùng URL nếu có, không thì dùng chữ cái đầu
    const logoHtml = params.companyLogo
      ? `<img src="${params.companyLogo}" alt="${params.company}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />`
      : `
        <div style="
          width: 60px; 
          height: 60px; 
          background: linear-gradient(135deg, #0041D9 0%, #0031A2 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="color: white; font-size: 24px; font-weight: bold;">
            ${params.company.charAt(0).toUpperCase()}
          </span>
        </div>
      `;

    const content = `
      <h2 style="color: #1976d2; margin-bottom: 10px;">Cơ hội việc làm mới cho bạn!</h2>
      <p style="color: #666;">Xin chào <strong>${params.firstName}</strong>,</p>
      <p style="color: #666;">Chúng tôi tìm thấy một công việc mới rất phù hợp với kỹ năng của bạn:</p>
      
      <!-- Job Card -->
      <a href="${jobUrl}" style="text-decoration: none; color: inherit;">
        <div style="
          background-color: #ffffff; 
          border: 1px solid #e5e5e5; 
          border-radius: 8px; 
          padding: 20px 24px; 
          margin: 16px 0;
          transition: all 0.2s ease;
        " onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.borderColor='#d0d0d0'" onmouseout="this.style.boxShadow='none'; this.style.borderColor='#e5e5e5'">
          
          <div style="display: flex; align-items: flex-start; gap: 20px;">
            <!-- Company Logo -->
            <div style="flex-shrink: 0;">
              ${logoHtml}
            </div>
            
            <!-- Job Details -->
            <div style="flex: 1; min-width: 0; padding-left: 4px;">
              <!-- Job Title -->
              <h3 style="
                color: #000000; 
                margin: 0 0 8px 0; 
                font-size: 20px;
                font-weight: 600;
                line-height: 1.4;
              ">${params.jobTitle}</h3>
              
              <!-- Company Name -->
              <p style="
                color: #6b7280; 
                margin: 0 0 16px 0;
                font-size: 15px;
                font-weight: 400;
                line-height: 1.5;
              ">${params.company}</p>
              
              <!-- Salary and Location Row -->
              <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                <!-- Salary Badge -->
                <div style="
                  display: inline-flex;
                  align-items: center;
                  background-color: #0052FF;
                  color: #ffffff;
                  padding: 8px 16px;
                  border-radius: 4px;
                  font-size: 14px;
                  font-weight: 600;
                  white-space: nowrap;
                ">
                  ${params.salaryText}
                </div>
                
                <!-- Location Badge -->
                <div style="
                  display: inline-flex;
                  align-items: center;
                  background-color: transparent;
                  color: #0052FF;
                  padding: 8px 16px;
                  padding-left: 12px;
                  border: 1px solid #0052FF;
                  border-radius: 4px;
                  font-size: 14px;
                  font-weight: 500;
                  white-space: nowrap;
                  gap: 4px;
                ">
                  ${locationText}
                </div>
              </div>
            </div>
          </div>
        </div>
      </a>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0 20px 0;">
        <a href="${jobUrl}" 
           style="
             display: inline-block; 
             background-color: #10b981; 
             color: white; 
             padding: 14px 40px; 
             text-decoration: none; 
             border-radius: 6px; 
             font-weight: 600;
             font-size: 16px;
             box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
           ">
          Ứng tuyển ngay
        </a>
      </div>

      <p style="color: #888; font-size: 13px; text-align: center; margin-top: 20px;">
        Hoặc click vào thẻ công việc ở trên để xem chi tiết
      </p>
    `;
    return this.baseTemplate(content);
  }
  static genericNotification(params: {
    title: string;
    content: string;
    actionUrl?: string;
    actionText?: string;
  }): string {
    const content = `
      <h2 style="color: #1976d2; margin-bottom: 20px;">${params.title}</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">${params.content}</p>
      
      ${params.actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${params.actionUrl}" 
             style="
               display: inline-block; 
               background-color: #10b981; 
               color: white; 
               padding: 12px 30px; 
               text-decoration: none; 
               border-radius: 6px; 
               font-weight: 600;
             ">
            ${params.actionText || 'Xem chi tiết'}
          </a>
        </div>
      ` : ''}
    `;
    return this.baseTemplate(content);
  }
}

export class EmailService {
  /**
   * Send email helper
   */
  private static async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    logPrefix: string;
  }): Promise<void> {
    const { to, subject, html, logPrefix } = options;

    try {
      const transporter = await getTransporter();
      const fromEmail = process.env.SMTP_USER || "no-reply@sejobs.edu.vn";

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"SEJobs" <${fromEmail}>`,
            to,
            subject,
            html,
          });
          console.log(`✅ ${logPrefix} thành công: ${to}`);
        } catch (error) {
          console.error(`❌ Lỗi ${logPrefix}:`, error);
          console.warn(`⚠️ Email failed but app continues`);
        }
      } else {
        console.log(`📧 [EMAIL MOCK] ${logPrefix} → ${to}`);
        console.log(`📧 Subject: ${subject}`);
      }
    } catch (error) {
      console.error(`❌ Email service error:`, error);
    }
  }

  /**
   * Send generic notification email
   */
  static async sendNotificationEmail(input: {
    email: string;
    title: string;
    content: string;
    actionUrl?: string;
    actionText?: string;
  }): Promise<void> {
    await this.sendEmail({
      to: input.email,
      subject: input.title,
      html: EmailTemplates.genericNotification(input),
      logPrefix: "Gửi thông báo",
    });
  }

  /**
   * Send OTP for password reset
   */
  static async sendResetOtp(email: string, otp: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: "Mã OTP đặt lại mật khẩu - SEJobs",
      html: EmailTemplates.resetPasswordOtp(otp),
      logPrefix: "Gửi OTP",
    });
  }

  /**
   * Send job notification to student
   */
  static async sendJobNotification(input: {
    email: string;
    firstName: string;
    job: {
      id: number;
      title: string;
      description: string;
      company: string;
      companyLogo?: string | null;
      salary_from?: number | null;
      salary_to?: number | null;
      salary_text?: string | null;
      location?: string | null;
    };
  }): Promise<void> {
    const { email, firstName, job } = input;

    const salaryFrom = job.salary_from && job.salary_from > 0 ? job.salary_from : null;
    const salaryTo = job.salary_to && job.salary_to > 0 ? job.salary_to : null;

    let salaryText = "Thỏa thuận";

    const invalidSalaryPatterns = ["0 - 0", "0-0", "0 vnd", "0 - 0 vnd"];
    const hasSalaryText =
      job.salary_text &&
      job.salary_text.trim() !== "" &&
      !invalidSalaryPatterns.some((pattern) => job.salary_text?.toLowerCase().includes(pattern));

    if (hasSalaryText) {
      salaryText = job.salary_text!;
    } else if (salaryFrom && salaryTo) {
      salaryText = `${salaryFrom.toLocaleString()} - ${salaryTo.toLocaleString()} VND`;
    } else if (salaryFrom) {
      salaryText = `Từ ${salaryFrom.toLocaleString()} VND`;
    } else if (salaryTo) {
      salaryText = `Đến ${salaryTo.toLocaleString()} VND`;
    }

    await this.sendEmail({
      to: email,
      subject: `🎯 Công việc mới phù hợp: ${job.title}`,
      html: EmailTemplates.jobNotification({
        firstName,
        jobTitle: job.title,
        company: job.company,
        ...(job.companyLogo && { companyLogo: job.companyLogo }),
        salaryText,
        description: job.description || "Không có mô tả",
        jobId: job.id,
        ...(job.location && { location: job.location }),
      }),
      logPrefix: "Gửi job notification",
    });
  }
}
