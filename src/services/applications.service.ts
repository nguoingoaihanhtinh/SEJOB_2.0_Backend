import ApplicationRepository from "@/repositories/application.repository";
import { CreateApplicationDTO, UpdateApplicationStatusDTO } from "@/dtos/user/Application.dto";
import { NotFoundError, ConflictError, BadRequestError } from "@/utils/errors";
import JobRepository from "@/repositories/job.repository";
import CompanyRepository from "@/repositories/company.repository";
import { ApplicationQueryAllParams, ApplicationQueryParams, NotificationType } from "@/types/common";
import { supabase } from "@/config/supabase";
import studentRepository from "@/repositories/student.repository";
import path from "path";
import { MediaService } from "@/services/media.service";
import _ from "lodash";
import ApplicationStatusDetailsRepository from "@/repositories/application_status_details.repository";
import { MessageUtil } from "@/utils/MessageUtil";
import companyService from "./company.service";
import notificationService from "./notifications.service";

function toDatabaseFormat<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const key in obj) {
    result[key] = obj[key] === undefined ? null : obj[key];
  }
  return result;
}

export const ApplicationService = {
  async findAll(params: ApplicationQueryAllParams) {
    return await ApplicationRepository.findAll(params);
  },

  async findOne(params: ApplicationQueryParams) {
    const app = await ApplicationRepository.findOne(params);

    if (!app) throw new NotFoundError({ message: MessageUtil.get("APPLICATION_NOT_FOUND") });

    return app;
  },

  async create(payload: CreateApplicationDTO & { user_id: number }) {
    const existing = await ApplicationRepository.findOne({
      user_id: payload.user_id,
      job_id: payload.job_id,
    });

    if (existing) {
      throw new ConflictError({ message: MessageUtil.get("YOU_HAVE_ALREADY_APPLIED_TO_THIS_JOB") });
    }

    const { job } = await JobRepository.findOne(payload.job_id);

    if (!job) {
      throw new BadRequestError({ message: MessageUtil.get("JOB_ID_NOT_FOUND_FOR_THIS_APPLICATION") });
    }

    if (!payload.resume_url) {
      const student = await studentRepository.findOne({ user_id: payload.user_id });

      if (!student || !student.id) {
        throw new BadRequestError({ message: MessageUtil.get("INVALID_USER_ID") });
      }

      const { data: cv, error } = await supabase.from("cv").select("*").eq("studentid", student.id).single();

      if (error) throw error;
      const oldFilename = path.basename(cv?.filepath ?? "");

      if (!oldFilename) {
        throw new BadRequestError({ message: MessageUtil.get("USER_DON_T_HAVE_CV") });
      }
      
      const { url } = await MediaService.clone(oldFilename);
      payload.resume_url = url;
    }

    if (!payload.resume_url) {
      throw new BadRequestError({ message: MessageUtil.get("MISSING_RESUME_URL") });
    }

    const dbPayload = toDatabaseFormat({
      ...payload,
      company_id: job.company_id
    });

    const application = await ApplicationRepository.create(dbPayload);


    try {
      const company = await companyService.findOne({ company_id: job.company_id });
      
      if (company.user_id) {
        await notificationService.create({
          data: {
            title: "New Application",
            content: `You have received a new application for the job "${job.title}".`,
            type: NotificationType.NewApplication,
            status: "sent",
            receiver_id: company.user_id,
            sender_id: payload.user_id,
            data: {
              application_id: application.id,
            }
          },
        });
      }
    } catch (error) {
      console.log(error);
      // TODO: USING QUEUE
    }
    return application;
  },

  async update(id: number, payload: UpdateApplicationStatusDTO) {
    const applicationPayload = {
      status: payload.status,
      feedback: payload.feedback,
      updated_at: new Date()
    };

    const dbPayload = toDatabaseFormat(applicationPayload);

    const resultUpdate = await ApplicationRepository.updateStatus(id, dbPayload);

    if (payload.status) {
      const statusDetailsData: any = {
        application_id: id,
        status: payload.status
      };

      if (payload.status === 'Interview_Scheduled') {
        statusDetailsData.interview_time = payload.interview_time;
        statusDetailsData.interview_location = payload.interview_location;
      }

      if (payload.status === 'Offered') {
        statusDetailsData.offered_salary = payload.offered_salary;
      }

      try {
        const existingStatusDetails = await ApplicationStatusDetailsRepository.getLatestByApplicationId(id);
        
        if (existingStatusDetails) {
          await ApplicationStatusDetailsRepository.update(existingStatusDetails.id, statusDetailsData);
        } else {
          await ApplicationStatusDetailsRepository.create(statusDetailsData);
        }
      } catch (error: any) {
        if (error.code === 'PGRST116') {
          await ApplicationStatusDetailsRepository.create(statusDetailsData);
        } else {
          throw error;
        }
      }
    }

    const result = await ApplicationRepository.findOne({ id });

    if (!result) {
      throw new NotFoundError({ message: MessageUtil.get("APPLICATION_NOT_FOUND_AFTER_UPDATE") });
    }

    return result;
  },

  async delete(id: number) {
    return ApplicationRepository.delete(id);
  },
};
