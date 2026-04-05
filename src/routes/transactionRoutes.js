import express from "express";
import {
  createTransaction,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getSummary
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// VIEWER, ANALYST, ADMIN, SUPER_ADMIN can view records
router.get("/", protect, allowRoles("VIEWER", "ANALYST", "ADMIN", "SUPER_ADMIN"), getTransactions);

// Only ADMIN and SUPER_ADMIN can create records
router.post("/create", protect, allowRoles("ADMIN", "SUPER_ADMIN"), createTransaction);

// ANALYST, ADMIN, SUPER_ADMIN can access summary
router.get("/summary", protect, allowRoles("ANALYST", "ADMIN", "SUPER_ADMIN"), getSummary);

// only ADMIN and SUPER_ADMIN can edit records
router.put("/:id", protect, allowRoles("ADMIN", "SUPER_ADMIN"), updateTransaction);

// only ADMIN and SUPER_ADMIN can delete records
router.delete("/:id", protect, allowRoles("ADMIN", "SUPER_ADMIN"), deleteTransaction);

export default router;
