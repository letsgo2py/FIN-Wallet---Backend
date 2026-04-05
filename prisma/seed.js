import pkg from "@prisma/client";
import bcrypt from "bcryptjs";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME;
  
  if (!email || !password || !name) {
    throw new Error("Missing SUPER_ADMIN env variables");
  }

  const existing = await prisma.user.findUnique({
    where: { email: email },
  });

  if (existing) {
    console.log("Super admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("Super admin created");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());