import { createUser, deleteUser, getUserById, getUsers, updateUser } from "@/handlers/users.handler";
import { authenticate } from "@/middlewares/auth.middleware";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { Router } from "express";

const router = Router();

// GET /api/users - Get all users
router.get("/", getUsers);

// GET /api/users/:id - Get user by ID
router.get("/:id", getUserById);

// POST /api/users - Create new user
router.post("/", authenticate, authorizeRoles("Admin"), createUser);

// PUT /api/users/:id - Update user
router.put("/:id", authenticate, authorizeRoles("Admin", "Student"), updateUser);

// DELETE /api/users/:id - Delete user
router.delete("/:id", authenticate, authorizeRoles("Admin"), deleteUser);

export default router;
