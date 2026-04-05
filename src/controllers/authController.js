import prisma from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields required" });
    }

    if (!normalizedEmail.includes("@")) {
      return res.status(400).json({ msg: "Please enter a valid email" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    res.status(201).json({
      msg: "User registered",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ msg: "User not found, Please register first!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Wrong Password!" });
    }

    if (!user.isActive) {
      return res.status(403).json({ msg: "Your account is not active" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,    
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
