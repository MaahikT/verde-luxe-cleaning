import { createTRPCRouter } from "~/server/trpc/main";
import { getAccounts } from "../procedures/mercury/getAccounts";
import { syncTransactions } from "../procedures/mercury/syncTransactions";
import { getTransactions } from "../procedures/mercury/getTransactions";
import { getCategories } from "../procedures/mercury/getCategories";
import { createCategory } from "../procedures/mercury/createCategory";
import { updateCategory } from "../procedures/mercury/updateCategory";
import { deleteCategory } from "../procedures/mercury/deleteCategory";
import { updateTransaction } from "../procedures/mercury/updateTransaction";
import { getRules } from "../procedures/mercury/getRules";
import { createRule } from "../procedures/mercury/createRule";
import { updateRule } from "../procedures/mercury/updateRule";
import { deleteRule } from "../procedures/mercury/deleteRule";

export const mercuryRouter = createTRPCRouter({
  getAccounts,
  syncTransactions,
  getTransactions,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateTransaction,
  getRules,
  createRule,
  updateRule,
  deleteRule,
});
