import prisma from "../config/db.js";
import bcrypt from "bcryptjs";

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user?.id;

    if(!currentUserId){
      return res.status(401).json({ message: "Unauthorized" });
    }

    const users = await prisma.user.findMany({
      where: {
        role: { not: "SUPER_ADMIN" },
        id: { not: currentUserId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching the users data!" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (role === "SUPER_ADMIN") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.role === "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Cannot modify SUPER_ADMIN",
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    res.json(updated);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, isActive } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email",
      });
    }

    const validRoles = ["VIEWER", "ANALYST", "ADMIN"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    if (req.user.role === "ADMIN") {
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        return res.status(403).json({
          message: "Admin cannot create ADMIN",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "VIEWER",
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const updateUserStatus = async (req, res) => {
  try {
    const { userId, isActive } = req.body;

    if (userId === undefined || isActive === undefined) {
      return res.status(400).json({
        message: "userId and isActive are required",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ADMIN restrictions
    if (req.user.role === "ADMIN") {
      if (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") {
        return res.status(403).json({
          message: "Admin cannot change status of ADMIN",
        });
      }
    }

    // prevent self-deactivation
    if (req.user.id === Number(userId) && isActive === false) {
      return res.status(400).json({
        message: "You cannot deactivate your own account",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: Number(userId),
      },
      data: {
        isActive,
      },
    });

    return res.status(200).json({
      message: `User has been ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("updateUserStatus error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
