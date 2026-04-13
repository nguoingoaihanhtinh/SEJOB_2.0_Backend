// src/createApp.ts
import "express-async-errors";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Initialize event observers (Observer Pattern)
import "@/events/observers";

import testRoutes from "./routes/test.route";
import userRoutes from "./routes/users.route";
import addressRoutes from "./routes/address.route";
import companyRoutes from "./routes/companies.route";
import companyTypeRoutes from "./routes/company_types.route";
import companyBranchesRoutes from "./routes/company_branches.route";
import authRoutes from "./routes/auth.route";
import jobRoutes from "./routes/jobs.route";
import categoryRoutes from "./routes/categories.route";
import skillRoutes from "./routes/skills.route";
import employmentTypeRoutes from "./routes/employment_types.route";
import levelRoutes from "./routes/levels.route";
import topcvRoutes from "./routes/topcv.route";
import mediaRoutes from "./routes/media.route";
import socialLinkRoutes from "./routes/social_links.route";
import educationsRoutes from "./routes/educations.route";
import savedJobsRoutes from "./routes/saved_jobs.route";
import experiencesRoutes from "./routes/experiences.route";
import projectRoutes from "./routes/projects.route";
import cvRoutes from "./routes/cv.route";
import notificationRoutes from "./routes/notifications.route";
import certificationRoutes from "./routes/certifications.route";
import applicationRoutes from "./routes/applications.route";
import studentRoutes from "./routes/student.route";
import adminRoutes from "./routes/admin.route";
import chatbotRoutes from "./chatbot/chatbot.route";
import jobNotificationSubscriptionsRoutes from "./routes/job_notification_subscriptions.route";
import skillMappingRoutes from "./routes/skill_mapping.route";
import chatRoutes from "./routes/chat.route";
import { requestLogger, errorHandler } from "@/middlewares";
import { specs, swaggerUi } from "./config/swagger";
import logger from "./utils/logger";

export const createApp = () => {
  const app = express();

  const allowedOrigins = ["http://localhost:5173", "https://sejobs.vercel.app", /https:\/\/.*\.ngrok-free\.app$/];

  // Middlewares
  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(null, false);
        }
      },
      credentials: true,
      exposedHeaders: ["Authorization"],
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(requestLogger);

  // API Documentation
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
  logger.info("📚 Swagger API documentation is available at http://localhost:3000/api-docs");

  // Routes
  app.use("/api/test", testRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/address", addressRoutes);
  app.use("/api/companies", companyRoutes);
  app.use("/api/company_types", companyTypeRoutes);
  app.use("/api/company-branches", companyBranchesRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/skills", skillRoutes);
  app.use("/api/employment-types", employmentTypeRoutes);
  app.use("/api/levels", levelRoutes);
  app.use("/api/topcv", topcvRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/social-links", socialLinkRoutes);
  app.use("/api/educations", educationsRoutes);
  app.use("/api/saved-jobs", savedJobsRoutes);
  app.use("/api/experiences", experiencesRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/certifications", certificationRoutes);
  app.use("/api/cvs", cvRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/applications", applicationRoutes);
  // app.use("/api/recommendations", recommendationRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/chatbot", chatbotRoutes);
  app.use("/api/job-notification-subscriptions", jobNotificationSubscriptionsRoutes);
  app.use("/api/skill-mappings", skillMappingRoutes);
  app.use("/api/chat", chatRoutes);

  // app.use("/api/experiences", experiencesRoutes);
  // Error handler
  app.use(errorHandler);
  return app;
};
