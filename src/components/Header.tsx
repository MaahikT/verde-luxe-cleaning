import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, X, ChevronDown, LogIn, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "~/stores/authStore";
import toast from "react-hot-toast";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const router = useRouterState();
  const navigate = useNavigate();
  const currentPath = router.location.pathname;
  const { token, user, clearAuth } = useAuthStore();

  const isActive = (path: string) => currentPath === path;

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out successfully");
    setMobileMenuOpen(false);
    navigate({ to: "/" });
  };

  const getPortalLink = () => {
    if (!user) return "/login";
    if (user.role === "ADMIN" || user.role === "OWNER") return "/admin-portal";
    return user.role === "CLEANER" ? "/cleaner-portal" : "/client-portal";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] bg-white shadow-[0_8px_13px_-10px_#eee]">
      <nav className="container mx-auto px-4 py-[10px]">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 max-w-[75px] mr-10">
            <img
              src="/verde-leaf-logo.png"
              alt="Verde Luxe Cleaning"
              className="w-full"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center flex-1">
            <ul className="flex items-center space-x-[5px] mr-auto">
              <li className="relative px-[5px]">
                <Link
                  to="/"
                  className={`block py-[6px] px-5 text-[15px] font-medium transition-colors ${
                    isActive("/") ? "text-primary-dark" : "text-black hover:text-primary-dark"
                  }`}
                >
                  Home
                </Link>
              </li>

              {/* Services Dropdown */}
              <li className="relative px-[5px] group">
                <button className="flex items-center space-x-1 py-[6px] px-5 text-[15px] font-medium text-black hover:text-primary-dark transition-colors">
                  <span>Services</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <ul className="absolute top-[35px] left-0 min-w-[260px] bg-white border border-gray-200 rounded-none py-[10px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[99]">
                  <li>
                    <Link
                      to="/services/standard-home-cleaning"
                      className="block w-full py-2 px-4 text-[15px] font-medium text-black hover:text-primary-dark transition-colors"
                    >
                      Standard Home Cleaning
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/services/deep-home-cleaning"
                      className="block w-full py-2 px-4 text-[15px] font-medium text-black hover:text-primary-dark transition-colors"
                    >
                      Deep Home Cleaning
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/services/vacation-rental-cleaning"
                      className="block w-full py-2 px-4 text-[15px] font-medium text-black hover:text-primary-dark transition-colors"
                    >
                      Vacation Rental Cleaning
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/services/commercial-cleaning"
                      className="block w-full py-2 px-4 text-[15px] font-medium text-black hover:text-primary-dark transition-colors"
                    >
                      Commercial Cleaning
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/services/moving-cleaning"
                      className="block w-full py-2 px-4 text-[15px] font-medium text-black hover:text-primary-dark transition-colors"
                    >
                      Move-In/Out Cleaning
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/services/post-construction-cleaning"
                      className="block w-full py-2 px-4 text-[15px] font-medium text-black hover:text-primary-dark transition-colors"
                    >
                      Post Construction Cleaning
                    </Link>
                  </li>
                </ul>
              </li>

              <li className="relative px-[5px]">
                <Link
                  to="/checklist"
                  className={`block py-[6px] px-5 text-[15px] font-medium transition-colors ${
                    isActive("/checklist") ? "text-primary-dark" : "text-black hover:text-primary-dark"
                  }`}
                >
                  Checklist
                </Link>
              </li>

              <li className="relative px-[5px]">
                <Link
                  to="/service-areas"
                  className={`block py-[6px] px-5 text-[15px] font-medium transition-colors ${
                    isActive("/service-areas") ? "text-primary-dark" : "text-black hover:text-primary-dark"
                  }`}
                >
                  Service Areas
                </Link>
              </li>
            </ul>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-1">
              <a
                href="tel:7348920931"
                className="inline-block px-[25px] py-[10px] text-[13px] font-semibold text-primary-dark bg-transparent border border-gray-200 rounded-full hover:border-primary-dark transition-all uppercase"
              >
                Contact Us
              </a>
              <Link
                to="/book-now"
                className="inline-block px-[25px] py-[10px] text-[13px] font-semibold text-white bg-primary border border-primary rounded-full hover:bg-primary-dark hover:border-primary-dark transition-all uppercase"
              >
                Book Now
              </Link>
              
              {/* Auth Links */}
              {token && user ? (
                <>
                  <Link
                    to={getPortalLink()}
                    className="flex items-center gap-1 px-[20px] py-[10px] text-[13px] font-semibold text-primary-dark bg-transparent border border-gray-200 rounded-full hover:border-primary-dark transition-all uppercase"
                  >
                    <User className="w-4 h-4" />
                    Portal
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-[20px] py-[10px] text-[13px] font-semibold text-red-600 bg-transparent border border-gray-200 rounded-full hover:border-red-600 transition-all uppercase"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1 px-[20px] py-[10px] text-[13px] font-semibold text-primary-dark bg-transparent border border-gray-200 rounded-full hover:border-primary-dark transition-all uppercase"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-900 border-0 outline-none"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-5 pb-4">
            <ul className="space-y-[15px] mt-5 mb-[15px]">
              <li>
                <Link
                  to="/"
                  className="block text-[15px] font-medium text-black hover:text-primary-dark"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
              </li>

              <li>
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className="flex items-center space-x-1 text-[15px] font-medium text-black hover:text-primary-dark w-full"
                >
                  <span>Services</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {servicesOpen && (
                  <ul className="ml-[5px] mt-2 space-y-2 pl-0 border-0">
                    <li>
                      <Link
                        to="/services/standard-home-cleaning"
                        className="block text-[15px] font-medium text-black hover:text-primary-dark py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Standard Home Cleaning
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/services/deep-home-cleaning"
                        className="block text-[15px] font-medium text-black hover:text-primary-dark py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Deep Home Cleaning
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/services/vacation-rental-cleaning"
                        className="block text-[15px] font-medium text-black hover:text-primary-dark py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Vacation Rental Cleaning
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/services/commercial-cleaning"
                        className="block text-[15px] font-medium text-black hover:text-primary-dark py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Commercial Cleaning
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/services/moving-cleaning"
                        className="block text-[15px] font-medium text-black hover:text-primary-dark py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Move-In/Out Cleaning
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/services/post-construction-cleaning"
                        className="block text-[15px] font-medium text-black hover:text-primary-dark py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Post Construction Cleaning
                      </Link>
                    </li>
                  </ul>
                )}
              </li>

              <li>
                <Link
                  to="/checklist"
                  className="block text-[15px] font-medium text-black hover:text-primary-dark"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Checklist
                </Link>
              </li>

              <li>
                <Link
                  to="/service-areas"
                  className="block text-[15px] font-medium text-black hover:text-primary-dark"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Service Areas
                </Link>
              </li>
            </ul>

            <div className="flex flex-row space-x-1 pt-0 mb-[15px]">
              <a
                href="tel:7348920931"
                className="inline-block px-[25px] py-[10px] text-[13px] font-semibold text-primary-dark bg-transparent border border-gray-200 rounded-full hover:border-primary-dark transition-all uppercase text-center"
              >
                Contact Us
              </a>
              <Link
                to="/book-now"
                className="inline-block px-[25px] py-[10px] text-[13px] font-semibold text-white bg-primary border border-primary rounded-full hover:bg-primary-dark hover:border-primary-dark transition-all uppercase text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Book Now
              </Link>
            </div>
            
            {/* Mobile Auth Links */}
            <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200">
              {token && user ? (
                <>
                  <Link
                    to={getPortalLink()}
                    className="flex items-center justify-center gap-2 px-[25px] py-[10px] text-[13px] font-semibold text-primary-dark bg-transparent border border-gray-200 rounded-full hover:border-primary-dark transition-all uppercase"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    My Portal
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-[25px] py-[10px] text-[13px] font-semibold text-red-600 bg-transparent border border-gray-200 rounded-full hover:border-red-600 transition-all uppercase"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-[25px] py-[10px] text-[13px] font-semibold text-primary-dark bg-transparent border border-gray-200 rounded-full hover:border-primary-dark transition-all uppercase w-full"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
