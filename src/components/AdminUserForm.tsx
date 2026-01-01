import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Shield, CheckCircle } from "lucide-react";
import { useAuthStore } from "~/stores/authStore";
import { sanitizePhoneNumber } from "~/utils/formatPhoneNumber";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["CLIENT", "CLEANER", "ADMIN", "OWNER"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  temporaryPassword: z.union([z.string().min(6, "Temporary password must be at least 6 characters"), z.literal("")]).optional(),
  color: z.union([
    z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format (use #RRGGBB)"),
    z.literal("")
  ]).optional(),
  adminPermissions: z.record(z.boolean()).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: number;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  temporaryPassword?: string | null;
  hasResetPassword?: boolean;
  color: string | null;
  adminPermissions?: Record<string, boolean> | null;
}

interface AdminUserFormProps {
  user?: User;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AdminUserForm({
  user,
  onSubmit,
  onCancel,
  isSubmitting,
}: AdminUserFormProps) {
  const isEditMode = !!user;
  const { user: currentUser } = useAuthStore();

  // Define available permissions with descriptions
  const availablePermissions = [
    { key: "manage_bookings", label: "Manage Bookings", description: "Create, edit, and delete bookings" },
    { key: "manage_customers", label: "Manage Customers", description: "Create, edit, and delete customer accounts" },
    { key: "manage_cleaners", label: "Manage Cleaners", description: "Create, edit, and delete cleaner accounts" },
    { key: "manage_admins", label: "Manage Admins", description: "Create, edit, delete admins and assign permissions" },
    { key: "manage_checklists", label: "Manage Checklists", description: "Create, edit, and delete checklist templates" },
    { key: "manage_pricing", label: "Manage Pricing", description: "Create, edit, and delete pricing rules" },
    { key: "view_reports", label: "View Reports", description: "Access revenue reports and statistics" },
    { key: "manage_time_off_requests", label: "Manage Time-Off Requests", description: "Approve/reject cleaner time-off requests" },
  ];

  // Get current user's permissions if they're an admin
  const currentUserPermissions = currentUser?.role === "ADMIN"
    ? (currentUser.adminPermissions as Record<string, boolean> | null)
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<UserFormData>({
    resolver: zodResolver(
      isEditMode
        ? userSchema.extend({
            password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
          })
        : userSchema.extend({
            password: z.string().min(6, "Password must be at least 6 characters"),
          })
    ),
    defaultValues: user
      ? {
          email: user.email,
          role: user.role as any,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phone: user.phone || "",
          password: "",
          temporaryPassword: user.temporaryPassword || "",
          color: user.color || "",
          adminPermissions: user.adminPermissions || {},
        }
      : {
          role: "CLIENT",
          temporaryPassword: "",
          adminPermissions: {},
        },
  });

  const colorValue = watch("color");
  const roleValue = watch("role");
  const adminPermissionsValue = watch("adminPermissions") || {};

  const handleFormSubmit = (data: UserFormData) => {
    // Sanitize phone number before submission
    const sanitizedData = {
      ...data,
      phone: data.phone ? sanitizePhoneNumber(data.phone) || undefined : undefined,
    };
    onSubmit(sanitizedData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[1000] p-4 pt-20">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[calc(100vh-6rem)] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6 sticky top-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {isEditMode ? "Edit User" : "Create New User"}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register("email")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="user@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password {!isEditMode && <span className="text-red-500">*</span>}
                {isEditMode && <span className="text-gray-500 text-xs ml-1">(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                {...register("password")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={isEditMode ? "Enter new password to change" : "Minimum 6 characters"}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                {...register("role")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="CLIENT">Client</option>
                <option value="CLEANER">Cleaner</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                {...register("firstName")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="John"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                {...register("lastName")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Doe"
              />
            </div>

            {/* Phone */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                {...register("phone")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Color Picker (for Cleaners) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Color
                <span className="text-gray-500 text-xs ml-1">(optional - for calendar color coding)</span>
              </label>

              {/* Main color picker - large and prominent */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-shrink-0">
                  <input
                    type="color"
                    value={colorValue || "#3B82F6"}
                    onChange={(e) => setValue("color", e.target.value)}
                    className="h-12 w-20 rounded-lg border-2 border-gray-300 cursor-pointer shadow-sm hover:border-primary transition-colors"
                    title="Pick a color"
                  />
                </div>

                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Or enter hex code:
                  </label>
                  <input
                    type="text"
                    {...register("color")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                    placeholder="#3B82F6"
                  />
                  {errors.color && (
                    <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-3">
                This color will be used to identify this provider's bookings on the calendar.
                Click the color square to open the color picker, or type a hex code directly.
              </p>
            </div>

            {/* Admin Permissions Section */}
            {(roleValue === "ADMIN" || roleValue === "OWNER") && (
              <div className="md:col-span-2 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {roleValue === "OWNER" ? "Owner Permissions" : "Admin Permissions"}
                  </h3>
                </div>

                {roleValue === "OWNER" ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-purple-900 mb-1">
                          Full Access
                        </p>
                        <p className="text-sm text-purple-700">
                          Owners have all permissions by default and can manage all aspects of the system, including assigning permissions to admins.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Select the permissions this admin should have.
                      {currentUser?.role === "ADMIN" && " You can only grant permissions that you have yourself."}
                    </p>

                    <div className="space-y-3">
                      {availablePermissions.map((permission) => {
                        const isChecked = adminPermissionsValue[permission.key] === true;
                        const isDisabled = currentUser?.role === "ADMIN" &&
                          currentUserPermissions &&
                          !currentUserPermissions[permission.key];

                        return (
                          <label
                            key={permission.key}
                            className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                              isDisabled
                                ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
                                : "bg-white border-gray-200 hover:border-primary/30 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked === true}
                              disabled={!!isDisabled}
                              onChange={(e) => {
                                const newPermissions = { ...adminPermissionsValue };
                                newPermissions[permission.key] = e.target.checked;
                                setValue("adminPermissions", newPermissions);
                              }}
                              className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {permission.label}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {permission.description}
                              </p>
                              {isDisabled && (
                                <p className="text-xs text-red-600 mt-1">
                                  You cannot grant this permission because you don't have it yourself
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {Object.values(adminPermissionsValue).filter(Boolean).length === 0 && (
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ This admin will have no permissions. They won't be able to access any admin features until permissions are granted.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Temporary Password (Editable) */}
            {isEditMode && (
              <div className="md:col-span-2 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                  <span className="text-gray-500 text-xs ml-1">(optional - for password recovery)</span>
                </label>
                <input
                  type="text"
                  {...register("temporaryPassword")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter temporary password (min 6 characters)"
                />
                {errors.temporaryPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.temporaryPassword.message}</p>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  This temporary password allows users to reset their main password via "Forgot Password".
                  If you set or change this, the user will be able to use it for password recovery.
                </p>
                {user?.temporaryPassword && (
                  <p className="text-xs text-yellow-700 mt-1 bg-yellow-50 p-2 rounded border border-yellow-200">
                    Current temporary password: <span className="font-mono font-semibold">{user.temporaryPassword}</span>
                    {user.hasResetPassword && " (user has already reset their password, but this temp password still works)"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Saving..."
                : isEditMode
                ? "Update User"
                : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
