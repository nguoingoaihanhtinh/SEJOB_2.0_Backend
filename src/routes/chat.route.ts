import { Router } from "express";
import { ChatHandler } from "../handlers/chat.handler";
import { authenticate } from "../middlewares/auth.middleware"; 

const chatRoutes = Router();

chatRoutes.use(authenticate);

chatRoutes.get("/conversations", ChatHandler.getConversations);
chatRoutes.post("/conversations", ChatHandler.initiateConversation);
chatRoutes.get("/conversations/:conversationId/messages", ChatHandler.getMessages);

export default chatRoutes;
