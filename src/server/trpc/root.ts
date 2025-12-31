import {
  createCallerFactory,
  createTRPCRouter,
  baseProcedure,
} from "~/server/trpc/main";
import { bookingRouter } from "./routers/booking";
import { paymentRouter } from "./routers/payment";
import { mercuryRouter } from "./routers/mercury";
import { emailTemplateRouter } from "./routers/emailTemplates";
import { login } from "./procedures/auth/login";
import { getCurrentUser } from "./procedures/auth/getCurrentUser";
import { forgotPassword } from "./procedures/auth/forgotPassword";
import { getSchedule } from "./procedures/cleaner/getSchedule";
import { getPayments } from "./procedures/cleaner/getPayments";
import { getUpcomingBookings } from "./procedures/client/getUpcomingBookings";
import { getAllBookings } from "./procedures/client/getAllBookings";
import { getAllBookingsAdmin } from "./procedures/admin/getAllBookingsAdmin";
import { getAllUsersAdmin } from "./procedures/admin/getAllUsersAdmin";
import { getCustomerDetailsAdmin } from "./procedures/admin/getCustomerDetailsAdmin";
import { createBookingAdmin } from "./procedures/admin/createBookingAdmin";
import { updateBookingAdmin } from "./procedures/admin/updateBookingAdmin";
import { deleteBookingAdmin } from "./procedures/admin/deleteBookingAdmin";
import { cancelPaymentHold } from "./procedures/admin/cancelPaymentHold";
import { getBookingStatsAdmin } from "./procedures/admin/getBookingStatsAdmin";
import { getRevenueReport } from "./procedures/admin/getRevenueReport";
import { createUserAdmin } from "./procedures/admin/createUserAdmin";
import { updateUserAdmin } from "./procedures/admin/updateUserAdmin";
import { deleteUserAdmin } from "./procedures/admin/deleteUserAdmin";
import { createChecklistTemplate } from "./procedures/admin/createChecklistTemplate";
import { getChecklistTemplates } from "./procedures/admin/getChecklistTemplates";
import { updateChecklistTemplate } from "./procedures/admin/updateChecklistTemplate";
import { deleteChecklistTemplate } from "./procedures/admin/deleteChecklistTemplate";
import { getBookingChecklist } from "./procedures/admin/getBookingChecklist";
import { updateBookingChecklistItem } from "./procedures/admin/updateBookingChecklistItem";
import { getPricingRules } from "./procedures/admin/getPricingRules";
import { createPricingRule } from "./procedures/admin/createPricingRule";
import { updatePricingRule } from "./procedures/admin/updatePricingRule";
import { deletePricingRule } from "./procedures/admin/deletePricingRule";
import { calculateBookingPrice } from "./procedures/admin/calculateBookingPrice";
import { getBookingAvailability } from "./procedures/admin/getBookingAvailability";
import { getCleanerAvailabilityDetails } from "./procedures/admin/getCleanerAvailabilityDetails";
import { submitTimeOffRequest } from "./procedures/cleaner/submitTimeOffRequest";
import { getTimeOffRequests } from "./procedures/cleaner/getTimeOffRequests";
import { deleteTimeOffRequest } from "./procedures/cleaner/deleteTimeOffRequest";
import { updateTimeOffRequest } from "./procedures/cleaner/updateTimeOffRequest";
import { getAllTimeOffRequests } from "./procedures/admin/getAllTimeOffRequests";
import { updateTimeOffRequestStatus } from "./procedures/admin/updateTimeOffRequestStatus";
import { clearTimeOffRequestAdmin } from "./procedures/admin/clearTimeOffRequestAdmin";
import { getPendingChargesAdmin } from "./procedures/admin/getPendingChargesAdmin";
import { capturePaymentHold } from "./procedures/admin/capturePaymentHold";
import { retryChargeOrHold } from "./procedures/admin/retryChargeOrHold";
import { getUpcomingCardHolds } from "./procedures/admin/getUpcomingCardHolds";
import { getDeclinedCharges } from "./procedures/admin/getDeclinedCharges";
import { getAllCapturedCharges } from "./procedures/admin/getAllCapturedCharges";
import { issueRefund } from "./procedures/admin/issueRefund";
import { getConfiguration } from "./procedures/admin/getConfiguration";
import { updateConfiguration } from "./procedures/admin/updateConfiguration";
import { getAllLeadsAdmin } from "./procedures/admin/getAllLeadsAdmin";
import { updateLeadStatus } from "./procedures/admin/updateLeadStatus";
import { createLeadFromBooking } from "./procedures/admin/createLeadFromBooking";
import { getMonthlyDashboardMetrics } from "./procedures/admin/getMonthlyDashboardMetrics";
import { deleteLeadAdmin } from "./procedures/admin/deleteLeadAdmin";
import { updateLeadAdmin } from "./procedures/admin/updateLeadAdmin";


export const appRouter = createTRPCRouter({
  booking: bookingRouter,
  payment: paymentRouter,
  mercury: mercuryRouter,
  emailTemplates: emailTemplateRouter, // Router for email templates
  // Auth procedures
  login,
  getCurrentUser,
  forgotPassword,
  // Cleaner procedures
  getSchedule,
  getPayments,
  submitTimeOffRequest,
  getTimeOffRequests,
  deleteTimeOffRequest,
  updateTimeOffRequest,
  // Client procedures
  getUpcomingBookings,
  getAllBookings,
  // Admin procedures
  getAllBookingsAdmin,
  getAllUsersAdmin,
  getCustomerDetailsAdmin,
  createBookingAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  cancelPaymentHold,
  getPendingChargesAdmin,
  getUpcomingCardHolds,
  getDeclinedCharges,
  getAllCapturedCharges,
  capturePaymentHold,
  retryChargeOrHold,
  issueRefund,
  getBookingStatsAdmin,
  getRevenueReport,
  getMonthlyDashboardMetrics,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  getAllTimeOffRequests,
  updateTimeOffRequestStatus,
  clearTimeOffRequestAdmin,
  getConfiguration,
  updateConfiguration,
  getAllLeadsAdmin,
  updateLeadStatus,
  createLeadFromBooking,
  updateLeadAdmin, // Added updateLeadAdmin here
  // Checklist procedures
  createChecklistTemplate,
  getChecklistTemplates,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  getBookingChecklist,
  updateBookingChecklistItem,
  // Pricing procedures
  getPricingRules,
  deleteLeadAdmin,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  calculateBookingPrice,
  // Availability procedures
  getBookingAvailability,
  getCleanerAvailabilityDetails,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
