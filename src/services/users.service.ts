import _ from "lodash";
import * as bcrypt from "bcrypt";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import userRepository from "@/repositories/user.repository";
import { CreateUserDto } from "@/dtos/user/CreateUser.dto";
import { UpdateUserDto } from "@/dtos/user/UpdateUser.dto";
import { LoginDto } from "@/dtos/user/Login.dto";
import { Company, NotificationType, Student, User, UserQueryParams } from "@/types/common";
import { RegisterDto } from "@/dtos/user/Register.dto";
import { generateToken } from "@/utils/jwt.util";
import companyRepository from "@/repositories/company.repository";
import studentRepository from "@/repositories/student.repository";
import companyService from "@/services/company.service";
import { EmailService } from "@/services/email.service";
import educationsRepository from "@/repositories/educations.repository";
import certificationsRepository from "@/repositories/certifications.repository";
import socialLinksRepository from "@/repositories/social_links.repository";
import experiencesRepository from "@/repositories/experiences.repository";
import projectsRepository from "@/repositories/projects.repository";
import NotificationService from "@/services/notifications.service";
import { supabase } from "@/config/supabase";
import { MessageUtil } from "@/utils/MessageUtil";
export class UserService {
  async login(input: { loginData: LoginDto }) {
    const { loginData } = input;

    const curUser = await userRepository.findOne({
      email: loginData.email,
      fields: userRepository.fields + ", password, is_active",
    });

    if (!curUser) {
      throw new BadRequestError({ message: MessageUtil.get("INVALID_EMAIL_OR_PASSWORD") });
    }
    if (curUser.is_active === false) {
      throw new BadRequestError({ message: MessageUtil.get("ACCOUNT_IS_DEACTIVATED") });
    }

    const isValidPassword = await bcrypt.compare(loginData.password, curUser.password);

    if (!isValidPassword) {
      throw new BadRequestError({ message: MessageUtil.get("INVALID_EMAIL_OR_PASSWORD") });
    }

    const { password, ...user } = curUser;

    const token = generateToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      token,
    };
  }

  async register(input: { registerData: RegisterDto }) {
    const { registerData } = input;

    if (registerData.password !== registerData.confirm_password) {
      throw new BadRequestError({ message: MessageUtil.get("CONFIRM_PASSWORD_IS_NOT_CORRECT") });
    }

    const hashedPassword = await bcrypt.hash(registerData.password, 10);

    const { email, first_name, last_name, role, company, student_info, confirm_password, ...rest } = registerData;

    const newUser = await userRepository.create({
      userData: {
        email,
        first_name,
        last_name,
        role,
        password: hashedPassword,
      },
    });

    if (newUser.role === "Employer") {
      if (!company) {
        throw new BadRequestError({ message: MessageUtil.get("COMPANY_PROFILE_IS_REQUIRED_FOR_EMPLOYER_ACCOUNTS") });
      }

      const {
        name,
        logo,
        background,
        description,
        phone,
        email: companyEmail,
        website_url,
        images,
        tech_stack,
        employee_count,
        company_types,
        company_branches,
      } = company;

      await companyService.createCompany({
        companyData: {
          name,
          user_id: newUser.user_id,
          email: companyEmail || email,
          logo: logo ?? null,
          background: background ?? null,
          description: description ?? null,
          phone: phone,
          website_url: website_url ?? null,
          images: images ?? null,
          tech_stack: tech_stack ?? null,
          employee_count: employee_count ?? null,
          company_types: company_types,
          external_id: null,
          company_branches,
        },
      });
    }

    if (newUser.role === "Student") {
      const { about, location, skills, open_for_opportunities } = student_info || {};

      await studentRepository.create({
        studentData: {
          user_id: newUser.user_id,
          about: about || null,
          location: location || null,
          open_for_opportunities: open_for_opportunities || null,
          skills: skills || null,
        },
      });
    }

    await NotificationService.create({
      data: {
        title: "Welcome to SEJobs!",
        content:
          "Welcome to SEJobs! 🎉 Your account has been successfully created. Complete your profile and start exploring job opportunities that match your skills.",
        type: NotificationType.UserCreated,
        status: "sent",
        receiver_id: newUser.user_id,
        sender_id: 1,
      },
    });

    return newUser;
  }

  async findAll(input: UserQueryParams) {
    const { data: users, pagination } = await userRepository.findAll<User>(input);

    return {
      data: await this.joinData({ users: users }),
      pagination,
    };
  }

  async findOne(input: { userId: number }) {
    const { userId } = input;

    const user = await userRepository.findOne({ user_id: userId });
    if (!user) {
      throw new NotFoundError({ message: `User with ID ${userId} not found` });
    }

    const joinedUser = await this.joinData({ users: [user] });

    return joinedUser[0];
  }
  async findStudentsWithFullProfile(userIds: number[]) {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("users")
      .select(
        `
      user_id,
      student:student!inner(
        id,
        user_id,
        about,
        location,
        skills,
        open_for_opportunities,
        created_at,
        updated_at,
        desired_positions,
        gender,
        date_of_birth,
        phone_number,
        experiences:experiences(
          id, student_id, company, position, location, start_date, end_date, description, is_current
        ),
        educations:educations(
          id, student_id, school, degree, major, start_date, end_date, description
        ),
        certifications:certifications(
          id, student_id, name, organization, issue_date, certification_url, description
        ),
        projects:projects(
          id, student_id, name, is_working_on, start_date, end_date, description, website_link
        ),
        social_links:social_links(
          id, student_id, platform, url
        ),
        cv:cv( 
          cvid, studentid, title, filepath, createdat
        )
      )
    `,
        { count: "exact" }
      )
      .in("user_id", userIds);

    if (error) throw error;
    return data;
  }
  async joinData(input: { users: User[] }) {
    const studentUsers = input.users.filter((u) => u.role === "Student");
    const employerUsers = input.users.filter((u) => u.role === "Employer");

    let studentProfileMap: Record<number, any> = {};
    if (studentUsers.length > 0) {
      const userIds = studentUsers.map((u) => u.user_id);
      const enriched = await this.findStudentsWithFullProfile(userIds);
      studentProfileMap = _.keyBy(enriched, "user_id");
    }

    let companiesMap: Record<number, Company> = {};
    if (employerUsers.length > 0) {
      const { data: companies } = await companyRepository.findAll({
        user_ids: employerUsers.map((u) => u.user_id),
      });
      companiesMap = _.keyBy(companies, "user_id");
    }

    return input.users.map((user) => {
      if (user.role === "Student") {
        const full = studentProfileMap[user.user_id];
        return {
          ...user,
          student_info: full?.student || null,
        };
      } else if (user.role === "Employer") {
        return {
          ...user,
          company: companiesMap[user.user_id] || null,
        };
      }
      return user;
    });
  }

  async createUser(input: { userData: CreateUserDto }) {
    const { userData } = input;
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = await userRepository.create({
      userData: {
        ...userData,
        password: hashedPassword,
        avatar: _.get(userData, "avatar", null),
      },
    });

    // Auto-create company profile for Employer (empty)
    if (newUser.role === "Employer") {
      await companyService.createCompany({
        companyData: {
          name: "",
          user_id: newUser.user_id,
          email: newUser.email,
          logo: null,
          background: null,
          description: null,
          phone: "",
          website_url: null,
          images: null,
          tech_stack: null,
          employee_count: null,
          company_types: [],
          external_id: null,
          company_branches: [],
        },
      });
    }

    // Auto-create student profile for Student (empty)
    if (newUser.role === "Student") {
      await studentRepository.create({
        studentData: {
          user_id: newUser.user_id,
          about: null,
          location: null,
          open_for_opportunities: null,
          skills: null,
        },
      });
    }

    await NotificationService.create({
      data: {
        title: "Your account has been created!",
        content:
          "Your account has been created by an administrator. Please complete your profile to get started.",
        type: NotificationType.UserCreated,
        status: "sent",
        receiver_id: newUser.user_id,
        sender_id: 1,
      },
    });

    return newUser;
  }

  async updateUser(input: { userId: number; userData: UpdateUserDto }) {
    const { userId, userData } = input;

    const existingUser = await this.findOne({ userId });
    if (!existingUser) {
      throw new NotFoundError({ message: `User with ID ${input.userId} not found` });
    }

    if (userData.email) {
      const userWithEmail = await userRepository.findOne({ email: userData.email });
      if (userWithEmail && userWithEmail.user_id !== userId) {
        throw new BadRequestError({ message: MessageUtil.get("EMAIL_ALREADY_EXISTS") });
      }
    }

    if (userData.updated_at && userData.updated_at !== existingUser.updated_at) {
      throw new BadRequestError({
        message: MessageUtil.get("RECORD_WAS_MODIFIED_BY_ANOTHER_USER_PLEASE_REFRESH"),
      });
    }

    const updateData = _.pickBy(
      {
        avatar: userData.avatar ?? null,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        updated_at: new Date().toISOString(),
      },
      (value) => value !== undefined
    );

    const updatedUser = await userRepository.update({
      userId,
      userData: updateData,
    });

    if (userData.student_info && updatedUser?.role === "Student") {
      const {
        about,
        location,
        location_id,
        skills,
        open_for_opportunities,
        phone_number,
        desired_positions,
        gender,
        date_of_birth,
      } = userData.student_info;

      const existingStudent = await studentRepository.findByUserId(userId);
      const studentDataPayload = _.pickBy(
          {
            about: about || null,
            location: location || null,
            location_id: location_id || null,
            open_for_opportunities: open_for_opportunities !== undefined ? open_for_opportunities : null,
            skills: skills || null,
            phone_number: phone_number || null,
            desired_positions: desired_positions || null,
            date_of_birth: date_of_birth || null,
            gender: gender || null,
          },
          (value) => value !== undefined && value !== null
      );

      if (existingStudent) {
        await studentRepository.update({
          userId,
          studentData: studentDataPayload,
        });
      } else {
        await studentRepository.create({
          studentData: {
            user_id: userId,
            ...studentDataPayload,
          },
        });
      }
    }

    await NotificationService.create({
      data: {
        title: "Your profile has been updated!",
        content:
          "Your profile has been updated successfully. Make sure your information is accurate to get the best job recommendations.",
        type: NotificationType.UserCreated,
        status: "sent",
        receiver_id: updatedUser?.user_id,
        sender_id: 1,
      },
    });

    return this.findOne({ userId });
  }

  async deleteUser(userId: number) {
    const deletedUser = await userRepository.delete(userId);

    if (!deletedUser) {
      throw new NotFoundError({ message: `User with ID ${userId} not found` });
    }

    return deletedUser;
  }

  async requestPasswordReset(input: { email: string }) {
    const { email } = input;

    const user = await userRepository.findOne({
      email,
      fields: "user_id, email, is_active",
    });

    if (!user || user.is_active === false) {
      throw new NotFoundError({ message: MessageUtil.get("USER_WITH_THE_PROVIDED_EMAIL_DOES_NOT_EXIST") });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 phút

    await userRepository.update({
      userId: user.user_id,
      userData: {
        reset_token: otp,
        reset_token_expires: expires,
        updated_at: new Date().toISOString(),
      } as any,
    });

    await EmailService.sendResetOtp(email, otp);

    return { success: true };
  }

  async resetPassword(input: {
    email?: string;
    otp?: string;
    old_password?: string;
    new_password: string;
    userId?: number;
  }) {
    const { email, otp, old_password, new_password, userId } = input;
    let targetUserId: number;

    if (email && otp) {
      const user = await userRepository.findOne({
        email,
        fields: "user_id, reset_token, reset_token_expires, is_active",
      });

      if (!user || user.is_active === false) {
        throw new BadRequestError({ message: MessageUtil.get("INVALID_OR_EXPIRED_OTP") });
      }

      const expiresAt = user.reset_token_expires ? new Date(user.reset_token_expires).getTime() : 0;
      if (Date.now() > expiresAt || user.reset_token !== otp) {
        throw new BadRequestError({ message: MessageUtil.get("INVALID_OR_EXPIRED_OTP") });
      }

      targetUserId = user.user_id;
    } else if (old_password && userId) {
      const user = await userRepository.findOne({
        user_id: userId,
        fields: "user_id, password, is_active",
      });

      if (!user || user.is_active === false) {
        throw new NotFoundError({ message: MessageUtil.get("USER_NOT_FOUND") });
      }

      const isValid = await bcrypt.compare(old_password, user.password);
      if (!isValid) {
        throw new BadRequestError({ message: MessageUtil.get("OLD_PASSWORD_IS_INCORRECT") });
      }

      targetUserId = user.user_id;
    } else {
      throw new BadRequestError({ message: MessageUtil.get("INVALID_PARAMETERS") });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await userRepository.update({
      userId: targetUserId,
      userData: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date().toISOString(),
      } as any,
    });

    return { success: true };
  }
}

export default new UserService();
