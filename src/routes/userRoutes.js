import express from "express";
import {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  createUser
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ADMIN and SUPER_ADMIN can manage users
router.get("/", protect, allowRoles("ADMIN", "SUPER_ADMIN"), getAllUsers);

router.post("/create", protect, allowRoles("ADMIN", "SUPER_ADMIN"), createUser);

router.put("/role", protect, allowRoles("ADMIN", "SUPER_ADMIN"), updateUserRole);

router.put("/status", protect, allowRoles("ADMIN", "SUPER_ADMIN"), updateUserStatus);

export default router;