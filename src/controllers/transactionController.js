import prisma from "../config/db.js";

const startOfWeek = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const formatMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatWeekKey = (date) => {
  const weekStart = startOfWeek(date);
  return weekStart.toISOString().split("T")[0];
};

export const createTransaction = async (req, res) => {
  try {
    const { amount, type, category, date, notes } = req.body;

    // validation
    if (amount === undefined || !type || !category || !date) {
      return res.status(400).json({
        message: "amount, type, category, and date are required",
      });
    }

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be a valid number greater than 0",
      });
    }

    const allowedTypes = ["INCOME", "EXPENSE"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid transaction type. Must be INCOME or EXPENSE",
      });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format",
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized: user not found in request",
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: numericAmount,
        type,
        category: category.trim(),
        date: parsedDate,
        notes: notes?.trim() || null,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    console.error("createTransaction error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getTransactions = async (req, res) => {
  try{
    const userId = req.user?.id;
    if(!userId){
      return res.status(401).json({
        message: "Unauthorized user, not found in the request while fetching the records",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    // const limit = Math.max(Number(req.query.limit) || 10, 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const where = {
      userId,
    };

    if (req.query.category) {
      where.category = req.query.category;
    }

    if (req.query.type) {
      where.type = req.query.type;
    }

    if (req.query.date) {
      const selectedDate = new Date(req.query.date);

      if (!Number.isNaN(selectedDate.getTime())) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        where.date = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
    }

    const [transactions, totalRecords] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy:{
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.status(200).json({
      transactions,
      totalRecords,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    });

  } catch(err){
      console.error("getTransactions failed:", err);
      return res.status(500).json({
          message: "internal Server error",
      });
  }
}

export const deleteTransaction = async (req, res) => {
  try {
    const transactionId = Number(req.params.id);

    if (!transactionId || isNaN(transactionId)) {
      return res.status(400).json({
        message: "Valid transaction id is required",
      });
    }

    const existingTransaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
      },
    });

    return res.status(200).json({
      message: "Transaction deleted successfully",
      id: transactionId,
    });
  } catch (error) {
    console.error("deleteTransaction error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const transactionId = Number(req.params.id);
    const { amount, type, category, date, notes } = req.body;

    if (!transactionId || isNaN(transactionId)) {
      return res.status(400).json({
        message: "Valid transaction id is required",
      });
    }

    if (amount === undefined || !type || !category || !date) {
      return res.status(400).json({
        message: "amount, type, category, and date are required",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be a valid number greater than 0",
      });
    }

    const allowedTypes = ["INCOME", "EXPENSE"];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid transaction type. Must be INCOME or EXPENSE",
      });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format",
      });
    }

    const existingTransaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    if (!req.user?.id || existingTransaction.userId !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to edit this transaction",
      });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        amount: numericAmount,
        type,
        category: category.trim(),
        date: parsedDate,
        notes: notes?.trim() || null,
      },
    });

    return res.status(200).json({
      message: "Transaction updated successfully",
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error("updateTransaction error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getSummary = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized user, not found in the request while fetching summary",
      });
    }

    const monthlyCutoff = new Date();
    monthlyCutoff.setMonth(monthlyCutoff.getMonth() - 5);
    monthlyCutoff.setDate(1);
    monthlyCutoff.setHours(0, 0, 0, 0);

    const weeklyCutoff = startOfWeek(new Date());
    weeklyCutoff.setDate(weeklyCutoff.getDate() - 7 * 7);

    const [
      totalsByType,
      categoryGroups,
      recentActivity,
      monthlyTransactions,
      weeklyTransactions,
    ] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["category", "type"],
        where: { userId },
        _sum: { amount: true },
        orderBy: {
          category: "asc",
        },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: monthlyCutoff,
          },
        },
        select: {
          amount: true,
          type: true,
          date: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: weeklyCutoff,
          },
        },
        select: {
          amount: true,
          type: true,
          date: true,
        },
      }),
    ]);

    const totalIncome = totalsByType.find((item) => item.type === "INCOME")?._sum.amount || 0;
    const totalExpenses = totalsByType.find((item) => item.type === "EXPENSE")?._sum.amount || 0;

    const categoryWiseTotals = categoryGroups.reduce((acc, item) => {
      const existingCategory = acc.find((entry) => entry.category === item.category);

      if (existingCategory) {
        existingCategory[item.type === "INCOME" ? "income" : "expense"] = item._sum.amount || 0;
        existingCategory.total =
          (existingCategory.income || 0) + (existingCategory.expense || 0);
      } else {
        acc.push({
          category: item.category,
          income: item.type === "INCOME" ? item._sum.amount || 0 : 0,
          expense: item.type === "EXPENSE" ? item._sum.amount || 0 : 0,
          total: item._sum.amount || 0,
        });
      }

      return acc;
    }, []);

    const monthlyMap = new Map();
    monthlyTransactions.forEach((transaction) => {
      const key = formatMonthKey(new Date(transaction.date));
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { period: key, income: 0, expense: 0 });
      }

      const bucket = monthlyMap.get(key);
      if (transaction.type === "INCOME") {
        bucket.income += transaction.amount;
      } else {
        bucket.expense += transaction.amount;
      }
    });

    const weeklyMap = new Map();
    weeklyTransactions.forEach((transaction) => {
      const key = formatWeekKey(new Date(transaction.date));
      if (!weeklyMap.has(key)) {
        weeklyMap.set(key, { period: key, income: 0, expense: 0 });
      }

      const bucket = weeklyMap.get(key);
      if (transaction.type === "INCOME") {
        bucket.income += transaction.amount;
      } else {
        bucket.expense += transaction.amount;
      }
    });

    return res.status(200).json({
      overview: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
      },
      categoryWiseTotals,
      recentActivity,
      monthlyTrends: Array.from(monthlyMap.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
      ),
      weeklyTrends: Array.from(weeklyMap.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
      ),
    });
  } catch (error) {
    console.error("getSummary failed:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
