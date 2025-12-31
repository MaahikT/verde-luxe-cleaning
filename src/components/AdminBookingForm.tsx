import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Trash2, Calculator, User, Calendar, Home, Package, DollarSign, CreditCard, MapPin, FileText, Users, Building2, AlertTriangle, CheckCircle, XCircle, CalendarOff, Shield } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { BookingCalendarPicker } from "~/components/BookingCalendarPicker";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { InlineStripeForm } from "~/components/InlineStripeForm";
import { toast } from "react-hot-toast";
import { sanitizePhoneNumber } from "~/utils/formatPhoneNumber";
import { formatDurationHours } from "~/utils/formatTime";

// Helper function to split float hours into hours and minutes for input fields
const floatHoursToHMS = (duration: number | null | undefined) => {
  if (!duration || duration <= 0) return { h: undefined, m: undefined };
  const h = Math.floor(duration);
  const m = Math.round((duration - h) * 60);
  return { h: h || undefined, m: m === 0 ? undefined : m };
};

const bookingSchema = z.object({
  clientId: z.number().optional(),
  clientEmail: z.string().email("Invalid email address").optional(),
  clientFirstName: z.string().optional(),
  clientLastName: z.string().optional(),
  clientPhone: z.string().optional(),
  cleanerId: z.number().nullable().optional(),
  serviceType: z.string().min(1, "Service type is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  durationHours: z.number().positive().optional(),
  durationHoursInput: z.number().int("Hours must be an integer").min(0, "Hours cannot be negative").nullable().optional(),
  durationMinutesInput: z.number().int("Minutes must be an integer").min(0, "Minutes must be between 0 and 59").max(59, "Minutes must be between 0 and 59").nullable().optional(),
  address: z.string().min(1, "Address is required"),
  specialInstructions: z.string().optional(),
  finalPrice: z.number().positive().optional(),
  serviceFrequency: z.enum(["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  houseSquareFootage: z.number().int().positive().optional(),
  basementSquareFootage: z.number().int().positive().optional(),
  numberOfBedrooms: z.number().int().positive().optional(),
  numberOfBathrooms: z.number().int().positive().optional(),
  numberOfCleanersRequested: z.number().int().positive().optional(),
  cleanerPaymentAmount: z.number().positive().optional(),
  paymentMethod: z.enum(["NEW_CREDIT_CARD", "SAVED_CARD", "CASH", "CREDIT_CARD"]).default("NEW_CREDIT_CARD"),
  savedPaymentMethodId: z.number().optional(),
  saveCardForFuture: z.boolean().default(false),
  replacePaymentMethod: z.boolean().default(false),
  paymentDetails: z.string().optional(),
  selectedExtras: z.array(z.number()).optional(),
  overrideConflict: z.boolean().optional(),
}).refine((data) => data.clientId || data.clientEmail, {
  message: "Either select an existing client or provide email for new client",
  path: ["clientId"],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface Booking {
  id: number;
  clientId: number;
  cleanerId: number | null;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  durationHours: number | null;
  address: string;
  specialInstructions: string | null;
  finalPrice: number | null;
  serviceFrequency: string | null;
  houseSquareFootage: number | null;
  basementSquareFootage: number | null;
  numberOfBedrooms: number | null;
  numberOfBathrooms: number | null;
  numberOfCleanersRequested: number | null;
  cleanerPaymentAmount: number | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  selectedExtras?: string | null;
  clientEmail?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
}

interface AdminBookingFormProps {
  clients: User[];
  cleaners: User[];
  booking?: Booking;
  onSubmit: (data: BookingFormData) => void;
  onSaveAsLead?: (data: BookingFormData) => void;
  onCancel: () => void;
  onDelete?: (bookingId: number, clientName: string) => void;
  isSubmitting: boolean;
  isDeleting?: boolean;
  mode?: "booking" | "lead";
  initialClientId?: number;
  initialCleanerId?: number;
}

// Wrapper component that handles Stripe payment logic
function AdminBookingFormWithPayment(props: AdminBookingFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Set up mutations
  const createStripeCustomerMutation = useMutation(
    trpc.payment.createStripeCustomer.mutationOptions()
  );

  const createPaymentIntentMutation = useMutation(
    trpc.payment.createPaymentIntent.mutationOptions()
  );

  const attachPaymentMethodMutation = useMutation(
    trpc.payment.attachPaymentMethodToCustomer.mutationOptions()
  );

  const savePaymentMethodMutation = useMutation(
    trpc.payment.savePaymentMethod.mutationOptions()
  );

  const handleSubmitWithPayment = async (data: BookingFormData) => {
    // Calculate final durationHours from inputs
    const hours = data.durationHoursInput || 0;
    const minutes = data.durationMinutesInput || 0;
    const calculatedDurationHours = hours + (minutes / 60);

    const submissionData = {
        ...data,
        durationHours: calculatedDurationHours > 0 ? calculatedDurationHours : undefined,
        clientPhone: data.clientPhone ? sanitizePhoneNumber(data.clientPhone) || undefined : undefined,
    };

    // Remove temporary input fields before submission
    delete (submissionData as any).durationHoursInput;
    delete (submissionData as any).durationMinutesInput;

    // If payment method is CASH, just submit normally
    if (submissionData.paymentMethod === "CASH") {
      props.onSubmit(submissionData);
      return;
    }

    // If using a saved card, submit with the saved payment method ID
    if (submissionData.paymentMethod === "SAVED_CARD" && submissionData.savedPaymentMethodId) {
      props.onSubmit({
        ...submissionData,
        paymentMethod: "CREDIT_CARD" as const,
        replacePaymentMethod: props.booking ? true : false,
      });
      return;
    }

    // If payment method is NEW_CREDIT_CARD, process payment first
    if (submissionData.paymentMethod === "NEW_CREDIT_CARD") {
      if (!stripe || !elements || !submissionData.finalPrice) {
        toast.error("Payment system not ready or no amount specified");
        return;
      }

      setIsProcessingPayment(true);
      try {
        // Step 1: Determine client info and prepare for Stripe customer creation
        let clientEmail: string | undefined;
        let clientName: string | undefined;
        let clientId: number | undefined;
        let clientFirstName: string | undefined;
        let clientLastName: string | undefined;
        let clientPhone: string | undefined;

        if (submissionData.clientId) {
          // Existing client selected
          const client = props.clients.find(c => c.id === submissionData.clientId);
          if (!client) {
            toast.error("Selected client not found");
            setIsProcessingPayment(false);
            return;
          }
          clientEmail = client.email;
          clientName = client.firstName && client.lastName
            ? `${client.firstName} ${client.lastName}`
            : undefined;
          clientId = submissionData.clientId;
        } else if (submissionData.clientEmail) {
          // New client - will be created during Stripe customer creation
          clientEmail = submissionData.clientEmail;
          clientFirstName = submissionData.clientFirstName;
          clientLastName = submissionData.clientLastName;
          clientPhone = submissionData.clientPhone;
          clientName = clientFirstName && clientLastName
            ? `${clientFirstName} ${clientLastName}`
            : undefined;
        } else {
          toast.error("Client information is required");
          setIsProcessingPayment(false);
          return;
        }

        if (!clientEmail) {
          toast.error("Client email is required for payment processing");
          setIsProcessingPayment(false);
          return;
        }

        // Step 2: Create or get Stripe customer FOR THE CLIENT (not the admin)
        // This is the critical fix - we pass clientId or clientEmail so the customer
        // is created for the client, not the authenticated admin user
        const customerResult = await createStripeCustomerMutation.mutateAsync({
          authToken: token || "",
          clientId: clientId, // Pass existing client ID if available
          clientEmail: clientId ? undefined : clientEmail, // Pass email for new clients
          clientFirstName: clientId ? undefined : clientFirstName,
          clientLastName: clientId ? undefined : clientLastName,
          clientPhone: clientId ? undefined : clientPhone,
          name: clientName,
        });

        // Store the clientId returned from customer creation (important for new clients)
        const finalClientId = customerResult.clientId;

        // Step 3: Create payment method from card element
        const cardNumberElement = elements.getElement("cardNumber");
        if (!cardNumberElement) {
          throw new Error("Card element not found");
        }

        const { error: pmError, paymentMethod: createdPaymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardNumberElement,
          billing_details: {
            name: clientName,
            email: clientEmail,
          },
        });

        if (pmError || !createdPaymentMethod) {
          throw new Error(pmError?.message || "Failed to create payment method");
        }

        // Step 4: Attach payment method to customer (CRITICAL - must happen before creating PaymentIntent)
        // This prevents the error: "The PaymentMethod does not belong to the Customer you supplied"
        await attachPaymentMethodMutation.mutateAsync({
          authToken: token || "",
          stripeCustomerId: customerResult.customerId,
          paymentMethodId: createdPaymentMethod.id,
        });

        // Step 5: Create payment intent with the attached payment method
        // Now the PaymentMethod is guaranteed to belong to the Customer
        const paymentIntentResult = await createPaymentIntentMutation.mutateAsync({
          authToken: token || "",
          amount: Math.round(submissionData.finalPrice * 100), // Convert to cents
          currency: "usd",
          customerId: customerResult.customerId,
          paymentMethodId: createdPaymentMethod.id,
          description: `Booking: ${submissionData.serviceType} on ${submissionData.scheduledDate}`,
        });

        if (!paymentIntentResult.clientSecret) {
          throw new Error("Failed to create payment intent");
        }

        // Step 6: Retrieve the payment intent to check its status
        const { paymentIntent: retrievedIntent } = await stripe.retrievePaymentIntent(
          paymentIntentResult.clientSecret
        );

        let paymentIntent = retrievedIntent;

        // Confirm if the payment intent requires confirmation or additional action (3DS)
        if (paymentIntent?.status === "requires_confirmation" || paymentIntent?.status === "requires_action") {
          const { error: confirmError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
            paymentIntentResult.clientSecret,
            {
              payment_method: createdPaymentMethod.id,
            }
          );

          if (confirmError) {
            throw new Error(confirmError.message);
          }

          paymentIntent = confirmedIntent;
        }

        if (!paymentIntent || !["succeeded", "requires_capture", "processing"].includes(paymentIntent.status)) {
          throw new Error(
            `Payment authorization failed. Status: ${paymentIntent?.status || "unknown"}.`
          );
        }

        // Step 7: Save payment method for future use if requested
        // This happens AFTER attachment, so savePaymentMethod will handle the resource_already_exists error
        if (submissionData.saveCardForFuture && finalClientId) {
          try {
            await savePaymentMethodMutation.mutateAsync({
              authToken: token || "",
              clientId: finalClientId,
              paymentMethodId: createdPaymentMethod.id,
              setAsDefault: false,
            });
            toast.success("Card saved successfully for future use");
          } catch (saveError) {
            console.error("Failed to save payment method:", saveError);
            // Don't fail the booking if saving fails
            toast.error("Booking created but card could not be saved for future use");
          }
        }

        // Step 8: Submit the booking with payment details
        const bookingData = {
          ...submissionData,
          clientId: finalClientId, // Use the clientId from customer creation (important for new clients)
          paymentMethod: "CREDIT_CARD" as const,
          paymentDetails: `Stripe Payment Intent: ${paymentIntent.id}`,
          replacePaymentMethod: props.booking ? true : false,
        };

        props.onSubmit(bookingData);
        toast.success("Payment authorized successfully!");
      } catch (error) {
        console.error("Payment error:", error);
        toast.error(error instanceof Error ? error.message : "Payment failed");
      } finally {
        setIsProcessingPayment(false);
      }
    }
  };

  return (
    <AdminBookingFormInner
      {...props}
      onSubmit={handleSubmitWithPayment}
      isSubmitting={props.isSubmitting || isProcessingPayment}
    />
  );
}

function AdminBookingFormInner({
  clients,
  cleaners,
  booking,
  onSubmit,
  onSaveAsLead,
  onCancel,
  onDelete,
  isSubmitting,
  isDeleting,
  mode = "booking",
  initialClientId,
  initialCleanerId,
}: AdminBookingFormProps) {
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [isNewClient, setIsNewClient] = useState(
    booking && !booking.clientId ? true : false
  );
  const [selectedExtras, setSelectedExtras] = useState<number[]>(() => {
    if (!booking?.selectedExtras) return [];
    try {
      return JSON.parse(booking.selectedExtras as any) as number[];
    } catch (e) {
      console.error("Failed to parse selectedExtras:", e);
      return [];
    }
  });
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"NEW_CREDIT_CARD" | "SAVED_CARD" | "CASH">(
    booking?.paymentMethod === "CASH" ? "CASH" : "NEW_CREDIT_CARD"
  );
  const [selectedSavedCard, setSelectedSavedCard] = useState<number | null>(null);
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);

  // Calculate initial hours and minutes from booking data for editing
  const initialTime = floatHoursToHMS(booking?.durationHours);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: booking
      ? {
          clientId: booking.clientId || undefined,
          clientEmail: booking.clientEmail,
          clientFirstName: booking.clientFirstName,
          clientLastName: booking.clientLastName,
          clientPhone: booking.clientPhone,
          cleanerId: booking.cleanerId,
          serviceType: booking.serviceType,
          scheduledDate: new Date(booking.scheduledDate).toISOString().split("T")[0],
          scheduledTime: booking.scheduledTime,
          durationHoursInput: initialTime.h,
          durationMinutesInput: initialTime.m,
          address: booking.address,
          specialInstructions: booking.specialInstructions || "",
          finalPrice: booking.finalPrice || undefined,
          serviceFrequency: booking.serviceFrequency as any,
          houseSquareFootage: booking.houseSquareFootage || undefined,
          basementSquareFootage: booking.basementSquareFootage || undefined,
          numberOfBedrooms: booking.numberOfBedrooms || undefined,
          numberOfBathrooms: booking.numberOfBathrooms || undefined,
          numberOfCleanersRequested: booking.numberOfCleanersRequested || undefined,
          cleanerPaymentAmount: booking.cleanerPaymentAmount || undefined,
          paymentMethod: (booking.paymentMethod === "CASH" ? "CASH" : "NEW_CREDIT_CARD") as any,
          paymentDetails: booking.paymentDetails || "",
          selectedExtras: (() => {
            if (!booking.selectedExtras) return [];
            try {
              return JSON.parse(booking.selectedExtras);
            } catch (e) {
              console.error("Failed to parse selectedExtras:", e);
              return [];
            }
          })(),
        }
      : {
          paymentMethod: "NEW_CREDIT_CARD" as any,
          clientId: initialClientId,
          cleanerId: initialCleanerId,
        },
  });

  // Fetch pricing rules to get available extras
  const pricingRulesQuery = useQuery(
    trpc.getPricingRules.queryOptions({
      authToken: token || "",
    })
  );

  const extraServices = pricingRulesQuery.data?.pricingRules.filter(
    (rule) => rule.ruleType === "EXTRA_SERVICE" && rule.isActive
  ) || [];

  // Watch form fields for automatic price calculation
  const serviceType = watch("serviceType");
  const houseSquareFootage = watch("houseSquareFootage");
  const basementSquareFootage = watch("basementSquareFootage");
  const numberOfBedrooms = watch("numberOfBedrooms");
  const numberOfBathrooms = watch("numberOfBathrooms");
  const selectedCleanerId = watch("cleanerId");

  // Watch form fields for cleaner availability check
  const scheduledDate = watch("scheduledDate");
  const scheduledTime = watch("scheduledTime");
  const durationHoursInput = watch("durationHoursInput");
  const durationMinutesInput = watch("durationMinutesInput");

  // Calculate combined duration for availability query
  const durationHours = (durationHoursInput || 0) + (durationMinutesInput || 0) / 60;
  const durationForQuery = durationHours > 0 ? durationHours : undefined;

  // Watch payment method
  const formPaymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (formPaymentMethod) {
      setPaymentMethod(formPaymentMethod as "NEW_CREDIT_CARD" | "SAVED_CARD" | "CASH");
    }
  }, [formPaymentMethod]);

  // Watch clientId to fetch saved payment methods
  const clientId = watch("clientId");

  // Fetch saved payment methods for the selected client
  const savedPaymentMethodsQuery = useQuery({
    ...trpc.payment.getSavedPaymentMethods.queryOptions({
      authToken: token || "",
      clientId: clientId || 0,
    }),
    enabled: !!token && !!clientId,
  });

  const savedCards = savedPaymentMethodsQuery.data?.paymentMethods || [];

  // Reset saved card selection when client changes
  useEffect(() => {
    setSelectedSavedCard(null);
    setValue("savedPaymentMethodId", undefined);
  }, [clientId, setValue]);

  // Update form value when saved card selection changes
  useEffect(() => {
    if (selectedSavedCard) {
      setValue("savedPaymentMethodId", selectedSavedCard);
      setValue("paymentMethod", "SAVED_CARD");
      setPaymentMethod("SAVED_CARD" as any);
    }
  }, [selectedSavedCard, setValue]);

  // Fetch cleaner availability details
  const cleanerAvailabilityQuery = useQuery({
    ...trpc.getCleanerAvailabilityDetails.queryOptions({
      authToken: token || "",
      scheduledDate: scheduledDate || "",
      scheduledTime: scheduledTime || "",
      durationHours: durationForQuery,
      excludeBookingId: booking?.id,
    }),
    enabled: !!token && !!scheduledDate && !!scheduledTime,
  });

  const cleanersWithAvailability = cleanerAvailabilityQuery.data?.cleaners || [];

  // Find the selected cleaner's availability status
  const selectedCleaner = cleanersWithAvailability.find(c => c.id === selectedCleanerId);
  const isSelectedCleanerUnavailable = selectedCleaner && !selectedCleaner.isAvailable;

  // Calculate price whenever relevant fields change
  const priceCalculationQuery = useQuery({
    ...trpc.calculateBookingPrice.queryOptions({
      authToken: token || "",
      serviceType: serviceType || "",
      houseSquareFootage: houseSquareFootage || undefined,
      basementSquareFootage: basementSquareFootage || undefined,
      numberOfBedrooms: numberOfBedrooms || undefined,
      numberOfBathrooms: numberOfBathrooms || undefined,
      selectedExtras: selectedExtras,
    }),
    enabled: !!token && !!serviceType,
  });

  // Note: Removed the useEffect that auto-updates finalPrice and durationHours
  // This allows manual override while still showing calculated estimates for reference

  // Reset override when cleaner changes
  useEffect(() => {
    if (selectedCleaner?.isAvailable) {
      setOverrideConflict(false);
    }
  }, [selectedCleanerId, selectedCleaner?.isAvailable]);

  // Handler for toggling extras
  const handleToggleExtra = (extraId: number) => {
    setSelectedExtras((prev) => {
      if (prev.includes(extraId)) {
        return prev.filter((id) => id !== extraId);
      } else {
        return [...prev, extraId];
      }
    });
  };

  // Update form value when selectedExtras changes
  useEffect(() => {
    setValue("selectedExtras", selectedExtras);
  }, [selectedExtras, setValue]);

  // Handler for save as lead button
  const handleSaveAsLead = async () => {
    if (!onSaveAsLead) return;

    // Use handleSubmit to trigger validation and process the form
    await handleSubmit((data) => {
      // Calculate final durationHours from inputs
      const hours = data.durationHoursInput || 0;
      const minutes = data.durationMinutesInput || 0;
      const calculatedDurationHours = hours + (minutes / 60);

      const submissionData = {
        ...data,
        durationHours: calculatedDurationHours > 0 ? calculatedDurationHours : undefined,
      };

      // Remove temporary input fields before submission
      delete (submissionData as any).durationHoursInput;
      delete (submissionData as any).durationMinutesInput;

      onSaveAsLead(submissionData);
    })();
  };

  const serviceTypes = [
    "Standard Home Cleaning",
    "Deep Home Cleaning",
    "Vacation Rental Cleaning",
    "Commercial Cleaning",
    "Move-In/Out Cleaning",
    "Post Construction Cleaning",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Sticky Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-5 flex-shrink-0 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {booking ? "Edit Booking" : "Create New Booking"}
              </h2>
              <p className="text-green-100 text-sm">
                {booking ? `Booking #${booking.id}` : "Fill in the details below"}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit((data) => onSubmit({ ...data, overrideConflict }))} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Client Selection Mode Toggle */}
            {!booking && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Client Selection</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewClient(false)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      !isNewClient
                        ? "bg-primary text-white shadow-md"
                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Select Existing Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewClient(true)}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      isNewClient
                        ? "bg-primary text-white shadow-md"
                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    Create New Client
                  </button>
                </div>
              </div>
            )}

            {/* Client Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isNewClient ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register("clientId", {
                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                      })}
                      className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.firstName} {client.lastName} ({client.email})
                        </option>
                      ))}
                    </select>
                    {errors.clientId && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <span className="text-red-500">•</span> {errors.clientId.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        {...register("clientEmail")}
                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                        placeholder="client@example.com"
                      />
                      {errors.clientEmail && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                          <span className="text-red-500">•</span> {errors.clientEmail.message}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                        💡 A temporary password will be generated and displayed after booking creation
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        {...register("clientFirstName")}
                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        {...register("clientLastName")}
                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                        placeholder="Doe"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        {...register("clientPhone")}
                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Service Details Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Service Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("serviceType")}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  >
                    <option value="">Select a service</option>
                    {serviceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.serviceType && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <span className="text-red-500">•</span> {errors.serviceType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Frequency
                  </label>
                  <select
                    {...register("serviceFrequency")}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  >
                    <option value="">Select frequency (optional)</option>
                    <option value="ONE_TIME">One-Time</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cleaner (Optional)
                  </label>

                  {cleanerAvailabilityQuery.isLoading ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      <span className="text-sm text-gray-600">Checking availability...</span>
                    </div>
                  ) : cleanersWithAvailability.length === 0 ? (
                    <select
                      {...register("cleanerId", {
                        setValueAs: (v) => (v === "" ? null : Number(v)),
                      })}
                      className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    >
                      <option value="">Unassigned</option>
                      {cleaners.map((cleaner) => (
                        <option key={cleaner.id} value={cleaner.id}>
                          {cleaner.firstName} {cleaner.lastName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <select
                        {...register("cleanerId", {
                          setValueAs: (v) => (v === "" ? null : Number(v)),
                        })}
                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                      >
                        <option value="">Unassigned</option>
                        {cleanersWithAvailability.map((cleaner) => (
                          <option key={cleaner.id} value={cleaner.id}>
                            {cleaner.isAvailable ? "✓" : "⚠"} {cleaner.firstName} {cleaner.lastName}
                            {!cleaner.isAvailable && cleaner.conflictType === "BOOKED" && " (Booked)"}
                            {!cleaner.isAvailable && cleaner.conflictType === "TIME_OFF" && " (Time Off)"}
                          </option>
                        ))}
                      </select>

                      {/* Availability Legend */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3 h-3" />
                          <span>Booked</span>
                        </div>
                        <div className="flex items-center gap-1 text-orange-600">
                          <CalendarOff className="w-3 h-3" />
                          <span>Time Off</span>
                        </div>
                      </div>

                      {/* Show conflict details for selected cleaner */}
                      {selectedCleaner && !selectedCleaner.isAvailable && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-red-900 mb-1">
                                Cleaner Unavailable
                              </p>
                              <p className="text-sm text-red-700">
                                {selectedCleaner.conflictDetails}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Admin Override Section */}
                {isSelectedCleanerUnavailable && (
                  <div className="md:col-span-2 mt-2">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={overrideConflict}
                              onChange={(e) => setOverrideConflict(e.target.checked)}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm font-semibold text-yellow-900">
                              Override conflict and assign anyway (Admin)
                            </span>
                          </label>
                          <p className="text-xs text-yellow-700 mt-1 ml-6">
                            Check this box to assign this cleaner despite the scheduling conflict. Use with caution.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="scheduledDate"
                    control={control}
                    render={({ field }) => (
                      <BookingCalendarPicker
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.scheduledDate?.message}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    {...register("scheduledTime")}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  />
                  {errors.scheduledTime && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <span className="text-red-500">•</span> {errors.scheduledTime.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Property Details Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    House Square Footage
                  </label>
                  <input
                    type="number"
                    {...register("houseSquareFootage", { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="e.g., 2000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Basement Square Footage
                  </label>
                  <input
                    type="number"
                    {...register("basementSquareFootage", { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="e.g., 500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Bedrooms
                  </label>
                  <input
                    type="number"
                    {...register("numberOfBedrooms", { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="e.g., 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Bathrooms
                  </label>
                  <input
                    type="number"
                    {...register("numberOfBathrooms", { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="e.g., 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Cleaners Requested
                  </label>
                  <input
                    type="number"
                    {...register("numberOfCleanersRequested", { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="e.g., 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cleaner Payment Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("cleanerPaymentAmount", { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="e.g., 90.00"
                  />
                </div>
              </div>
            </div>

            {/* Extras Section */}
            {extraServices.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Extra Services</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Select additional services to include</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {extraServices.map((extra) => (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => handleToggleExtra(extra.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedExtras.includes(extra.id)
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                            {extra.extraName}
                          </h4>
                          {extra.extraDescription && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {extra.extraDescription}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs">
                            {extra.priceAmount !== null && (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                                +${extra.priceAmount.toFixed(2)}
                              </span>
                            )}
                            {extra.timeAmount !== null && (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                                +{extra.timeAmount}h
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            selectedExtras.includes(extra.id)
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedExtras.includes(extra.id) && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Section */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pricing & Duration</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Automatically calculated based on pricing rules</p>
                </div>
              </div>

              {/* Auto-calculated price display */}
              {priceCalculationQuery.data && serviceType && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Calculator className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-gray-900">Calculated Totals</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
                          <p className="text-xs text-gray-600 mb-1 font-medium">Total Price</p>
                          <p className="text-2xl font-bold text-green-700">
                            ${priceCalculationQuery.data.price.toFixed(2)}
                          </p>
                        </div>
                        {priceCalculationQuery.data.durationHours && (
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-600 mb-1 font-medium">Est. Duration</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {formatDurationHours(priceCalculationQuery.data.durationHours)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {priceCalculationQuery.data.breakdown.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                        className="text-sm text-primary hover:text-primary-dark font-medium whitespace-nowrap px-3 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                      >
                        {showPriceBreakdown ? "Hide" : "Show"} Breakdown
                      </button>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  {showPriceBreakdown && priceCalculationQuery.data.breakdown.length > 0 && (
                    <div className="pt-4 border-t border-green-200">
                      <p className="text-sm font-semibold text-gray-900 mb-3">Price Breakdown:</p>
                      <div className="space-y-2">
                        {priceCalculationQuery.data.breakdown.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm py-2 px-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-700">{item.description}</span>
                            <span className="font-semibold text-gray-900">
                              ${item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {priceCalculationQuery.isLoading && serviceType && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent"></div>
                    <p className="text-sm text-gray-600 font-medium">Calculating price...</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duration (editable with manual override) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration Override
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Hours</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        {...register("durationHoursInput", {
                          valueAsNumber: true,
                          setValueAs: v => v === "" ? null : Number(v)
                        })}
                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                        placeholder="e.g., 2"
                      />
                      {errors.durationHoursInput && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <span className="text-red-500">•</span> {errors.durationHoursInput.message}
                        </p>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Minutes (0-59)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="59"
                        {...register("durationMinutesInput", {
                          valueAsNumber: true,
                          setValueAs: v => v === "" ? null : Number(v)
                        })}
                        className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                        placeholder="e.g., 30"
                      />
                      {errors.durationMinutesInput && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <span className="text-red-500">•</span> {errors.durationMinutesInput.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    💡 Calculated Estimate: {priceCalculationQuery.data?.durationHours ? formatDurationHours(priceCalculationQuery.data.durationHours) : 'N/A'}
                  </p>
                </div>

                {/* Price (editable with manual override) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("finalPrice", { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="Enter price or use calculated value"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    💡 Manual override available. Calculated: {priceCalculationQuery.data?.price ? `$${priceCalculationQuery.data.price.toFixed(2)}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Choose how the customer will pay for this booking</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {/* Saved Cards - Only show if client is selected and has saved cards */}
                    {!!clientId && savedCards.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Saved Cards</p>
                        {savedCards.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => {
                              setSelectedSavedCard(card.id);
                              setValue("paymentMethod", "SAVED_CARD");
                              setValue("savedPaymentMethodId", card.id);
                              setPaymentMethod("SAVED_CARD" as any);
                            }}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              selectedSavedCard === card.id
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  selectedSavedCard === card.id
                                    ? "bg-primary border-primary"
                                    : "border-gray-300"
                                }`}
                              >
                                {selectedSavedCard === card.id && (
                                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900 text-sm capitalize">
                                    {card.brand}
                                  </h4>
                                  <span className="text-sm text-gray-600">•••• {card.last4}</span>
                                  {card.isDefault && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Expires {card.expiryMonth}/{card.expiryYear}
                                </p>
                              </div>
                              <CreditCard className="w-5 h-5 text-gray-400" />
                            </div>
                          </button>
                        ))}
                        <div className="border-t border-gray-200 pt-3 mt-3">
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Or use a different payment method</p>
                        </div>
                      </div>
                    )}

                    {/* New Credit Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setValue("paymentMethod", "NEW_CREDIT_CARD");
                        setPaymentMethod("NEW_CREDIT_CARD");
                        setSelectedSavedCard(null);
                        setValue("savedPaymentMethodId", undefined);
                      }}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        paymentMethod === "NEW_CREDIT_CARD"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            paymentMethod === "NEW_CREDIT_CARD"
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {paymentMethod === "NEW_CREDIT_CARD" && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm">New Credit Card</h4>
                          <p className="text-xs text-gray-600 mt-0.5">Authorize funds now (will charge later)</p>
                        </div>
                        <CreditCard className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>

                    {/* Cash */}
                    <button
                      type="button"
                      onClick={() => {
                        setValue("paymentMethod", "CASH");
                        setPaymentMethod("CASH");
                        setSelectedSavedCard(null);
                        setValue("savedPaymentMethodId", undefined);
                      }}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        paymentMethod === "CASH"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            paymentMethod === "CASH"
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {paymentMethod === "CASH" && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm">Cash</h4>
                          <p className="text-xs text-gray-600 mt-0.5">Pay in person</p>
                        </div>
                        <DollarSign className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Credit Card Form - Only show when NEW_CREDIT_CARD is selected */}
                {paymentMethod === "NEW_CREDIT_CARD" && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <InlineStripeForm />

                    {/* Option to save card for future use - only show if client is selected */}
                    {!!clientId && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveCardForFuture}
                            onChange={(e) => {
                              setSaveCardForFuture(e.target.checked);
                              setValue("saveCardForFuture", e.target.checked);
                            }}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            Save this card for future bookings
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          The card will be securely saved and can be reused for future bookings without re-entering details.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Saved card selected notice */}
                {paymentMethod === "SAVED_CARD" && selectedSavedCard && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-2">
                      <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Saved Card Selected</p>
                        <p className="text-xs text-green-700 mt-1">
                          {booking
                            ? "The existing payment hold (if any) will be canceled and a new hold will be placed on the selected card."
                            : "A payment hold will be placed on the selected card when the booking is created."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash payment note */}
                {paymentMethod === "CASH" && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Cash Payment Selected</p>
                        <p className="text-xs text-green-700 mt-1">
                          {booking
                            ? "Any existing payment hold will be canceled. Customer will pay in cash."
                            : "Customer will pay in cash. No card will be charged at this time."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address & Instructions Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Location & Notes</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("address")}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    placeholder="123 Main St, City, State ZIP"
                  />
                  {errors.address && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <span className="text-red-500">•</span> {errors.address.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    {...register("specialInstructions")}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none"
                    placeholder="Any special instructions for the cleaner..."
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Footer Actions */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-2">
            {isSelectedCleanerUnavailable && !overrideConflict && (
              <p className="text-xs text-red-600 text-right flex items-center justify-end gap-1">
                <AlertTriangle className="w-3 h-3" />
                Please check "Override conflict" to assign an unavailable cleaner
              </p>
            )}
            <div className="flex gap-3">
              {booking && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    const clientName = clients.find(c => c.id === booking.clientId);
                    const name = clientName ? `${clientName.firstName} ${clientName.lastName}` : 'this client';
                    onDelete(booking.id, name);
                  }}
                  disabled={isDeleting}
                  className="px-5 py-2.5 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-300 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              )}
              <div className="flex-1"></div>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>

              {/* Show Save as Lead button when creating a new booking and onSaveAsLead is provided */}
              {!booking && onSaveAsLead && (
                <button
                  type="button"
                  onClick={handleSaveAsLead}
                  disabled={isSubmitting || isDeleting}
                  className="px-6 py-2.5 bg-[#EDEAE1] text-gray-800 rounded-lg hover:bg-[#DDD9CC] transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isSubmitting ? "Saving Lead..." : "Save as Lead"}
                </button>
              )}

              <button
                type="submit"
                onClick={handleSubmit((data) => onSubmit({ ...data, overrideConflict }))}
                disabled={isSubmitting || isDeleting || (isSelectedCleanerUnavailable && !overrideConflict)}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {isSubmitting
                  ? paymentMethod === "NEW_CREDIT_CARD"
                    ? "Processing Payment..."
                    : "Saving..."
                  : booking
                  ? "Update Booking"
                  : paymentMethod === "NEW_CREDIT_CARD"
                  ? "Authorize Card & Create Booking"
                  : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminBookingForm(props: AdminBookingFormProps) {
  const trpc = useTRPC();
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  // Fetch publishable key using proper useQuery pattern
  const publishableKeyQuery = useQuery(
    trpc.payment.getPublishableKey.queryOptions()
  );

  // Initialize Stripe when we have the publishable key
  useEffect(() => {
    if (publishableKeyQuery.data?.publishableKey) {
      setStripePromise(loadStripe(publishableKeyQuery.data.publishableKey));
    }
  }, [publishableKeyQuery.data]);

  // Show error state if query fails
  if (publishableKeyQuery.error) {
    toast.error("Failed to initialize payment system");
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Payment System Error</h3>
          <p className="text-gray-600 text-center">
            Failed to initialize payment system. Please try again later.
          </p>
          <button
            onClick={props.onCancel}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while fetching key or initializing Stripe
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-gray-600 font-medium">Loading payment system...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <AdminBookingFormWithPayment {...props} />
    </Elements>
  );
}
