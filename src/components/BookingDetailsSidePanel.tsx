import { X, Edit, Calendar, Clock, MapPin, User, DollarSign, Home, Briefcase, CreditCard, FileText, Hash, Mail, Phone } from "lucide-react";
import { formatTime12Hour, formatDurationHours } from "~/utils/formatTime";
import { formatPhoneNumber } from "~/utils/formatPhoneNumber";

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
  client: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
  cleaner: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  } | null;
}

import { CancellationModal } from "./CancellationModal";
import { useState } from "react";

interface BookingDetailsSidePanelProps {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
}

export function BookingDetailsSidePanel({
  booking,
  onClose,
  onEdit,
}: BookingDetailsSidePanelProps) {
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getServiceFrequencyDisplay = () => {
    // For Standard Home Cleaning, show the actual frequency
    if (booking.serviceType === "Standard Home Cleaning" && booking.serviceFrequency) {
      const frequencyMap: { [key: string]: string } = {
        ONE_TIME: "One-Time",
        WEEKLY: "Weekly",
        BIWEEKLY: "Bi-Weekly",
        MONTHLY: "Monthly",
      };
      return frequencyMap[booking.serviceFrequency] || "One-Time";
    }
    // For other service types, always show "One-Time"
    return "One-Time";
  };

  const getPaymentMethodDisplay = (method: string | null) => {
    if (!method) return "N/A";
    const methodMap: { [key: string]: string } = {
      CREDIT_CARD: "Credit Card",
      CASH: "Cash",
    };
    return methodMap[method] || method;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[1000] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[1001] overflow-y-auto animate-slide-in-right">
        {/* Close Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
          aria-label="Close panel"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Customer Header */}
          <div className="space-y-3 pb-5 border-b border-gray-200">
            {/* Avatar and Name */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {booking.client.firstName} {booking.client.lastName}
                </h2>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{booking.client.email}</span>
              </div>
              {booking.client.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{formatPhoneNumber(booking.client.phone)}</span>
                </div>
              )}
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{booking.address}</span>
              </div>
            </div>
          </div>

          {/* Booking ID */}
          <div className="pb-5 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Booking ID</span>
              <span className="font-semibold text-gray-900">#{booking.id}</span>
            </div>
          </div>

          {/* Service Information */}
          <div className="space-y-3 pb-5 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100">
              Service Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Service Type</span>
                <span className="font-medium text-gray-900 text-right">{booking.serviceType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Frequency</span>
                <span className="font-medium text-gray-900">{getServiceFrequencyDisplay()}</span>
              </div>
              {booking.durationHours && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Time Estimate</span>
                  <span className="font-medium text-gray-900">
                    {formatDurationHours(booking.durationHours)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3 pb-5 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100">
              Schedule
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-gray-900 text-right">{formatDate(booking.scheduledDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-medium text-gray-900">{formatTime12Hour(booking.scheduledTime)}</span>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-3 pb-5 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100">
              Property Details
            </h3>
            <div className="space-y-2 text-sm">
              {booking.houseSquareFootage && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">House Sq Ft</span>
                  <span className="font-medium text-gray-900">{booking.houseSquareFootage.toLocaleString()}</span>
                </div>
              )}
              {booking.basementSquareFootage && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Basement Sq Ft</span>
                  <span className="font-medium text-gray-900">{booking.basementSquareFootage.toLocaleString()}</span>
                </div>
              )}
              {booking.numberOfBedrooms && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Bedrooms</span>
                  <span className="font-medium text-gray-900">{booking.numberOfBedrooms}</span>
                </div>
              )}
              {booking.numberOfBathrooms && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Bathrooms</span>
                  <span className="font-medium text-gray-900">{booking.numberOfBathrooms}</span>
                </div>
              )}
              {booking.numberOfCleanersRequested && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cleaners Requested</span>
                  <span className="font-medium text-gray-900">{booking.numberOfCleanersRequested}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Cleaner */}
          <div className="space-y-3 pb-5 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100">
              Assigned Cleaner
            </h3>
            {booking.cleaner ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium text-gray-900">
                    {booking.cleaner.firstName} {booking.cleaner.lastName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium text-gray-900 text-right text-xs">{booking.cleaner.email}</span>
                </div>
                {booking.cleaner.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Phone</span>
                    <span className="font-medium text-gray-900">{formatPhoneNumber(booking.cleaner.phone)}</span>
                  </div>
                )}
                {booking.cleanerPaymentAmount && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Amount</span>
                    <span className="font-medium text-gray-900">${booking.cleanerPaymentAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No cleaner assigned</p>
            )}
          </div>

          {/* Payment Information */}
          <div className="space-y-3 pb-5 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100">
              Payment
            </h3>
            <div className="space-y-2 text-sm">
              {booking.finalPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Price</span>
                  <span className="font-bold text-gray-900 text-lg">${booking.finalPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium text-gray-900">
                  {getPaymentMethodDisplay(booking.paymentMethod)}
                </span>
              </div>
              {booking.paymentDetails && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Details</span>
                  <span className="font-medium text-gray-900 text-right text-xs">{booking.paymentDetails}</span>
                </div>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          {booking.specialInstructions && (
            <div className="space-y-3 pb-5 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100">
                Special Instructions
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {booking.specialInstructions}
              </p>
            </div>
          )}

          {/* Edit Button - Bottom */}
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit Booking
            </button>
            <button
              onClick={() => setIsCancellationModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
            >
              <X className="w-4 h-4" />
              Cancel Booking
            </button>
          </div>
        </div>
      </div>

      <CancellationModal
        isOpen={isCancellationModalOpen}
        onClose={() => setIsCancellationModalOpen(false)}
        booking={booking}
        onSuccess={() => {
           onClose(); // Close the side panel on successful cancellation
        }}
      />
    </>
  );
}
