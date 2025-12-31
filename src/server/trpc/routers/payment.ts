import { createTRPCRouter } from "../main";
import { getPublishableKey } from "../procedures/payment/getPublishableKey";
import { createPaymentIntent } from "../procedures/payment/createPaymentIntent";
import { recordSuccessfulPayment } from "../procedures/payment/recordSuccessfulPayment";
import { createStripeCustomer } from "../procedures/payment/createStripeCustomer";
import { savePaymentMethod } from "../procedures/payment/savePaymentMethod";
import { getSavedPaymentMethods } from "../procedures/payment/getSavedPaymentMethods";
import { deleteSavedPaymentMethod } from "../procedures/payment/deleteSavedPaymentMethod";
import { setDefaultPaymentMethod } from "../procedures/payment/setDefaultPaymentMethod";
import { attachPaymentMethodToCustomer } from "../procedures/payment/attachPaymentMethodToCustomer";

export const paymentRouter = createTRPCRouter({
  getPublishableKey,
  createPaymentIntent,
  recordSuccessfulPayment,
  createStripeCustomer,
  savePaymentMethod,
  getSavedPaymentMethods,
  deleteSavedPaymentMethod,
  setDefaultPaymentMethod,
  attachPaymentMethodToCustomer,
});
