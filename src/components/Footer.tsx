import { Link } from "@tanstack/react-router";
import { Mail, MapPin } from "lucide-react";
import { useAuthStore } from "~/stores/authStore";
import { useUiStore } from "~/stores/uiStore";

export function Footer() {
  const { token } = useAuthStore();
  const openLoginModal = useUiStore((state) => state.openLoginModal);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (!token) {
      e.preventDefault();
      openLoginModal();
    }
  };

  return (
    <footer className="bg-gray-bg pt-[60px] pb-[30px]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-[30px]">
          {/* Company Info */}
          <div className="lg:col-span-4">
            <Link
              to="/"
              className="inline-block w-[100px] mb-5 cursor-pointer"
              onClick={handleLogoClick}
            >
              <img
                src="/verde-leaf-logo.png"
                alt="Verde Luxe Cleaning"
                className="w-full"
              />
            </Link>
            <p className="text-sm text-gray-text leading-relaxed font-normal mb-[30px]">
              Our cleaners are professionally trained, background-checked, and
              fully equipped to provide top-quality service through Verde Luxe
              Cleaning, ensuring a reliable and consistent cleaning experience
              for every client.
            </p>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {/* Useful Links */}
              <div className="mb-[30px]">
                <h2 className="text-base font-bold text-black mb-5">
                  Useful Links
                </h2>
                <ul className="space-y-0">
                  <li>
                    <Link
                      to="/"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/checklist"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Checklist
                    </Link>
                  </li>
                  <li>
                    <a
                      href="tel:7348920931"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Contact Us
                    </a>
                  </li>
                  <li>
                    <Link
                      to="/privacy-policy"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/terms-of-service"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Service Areas */}
              <div className="mb-[30px]">
                <h2 className="text-base font-bold text-black mb-5">
                  Service Areas
                </h2>
                <ul className="space-y-0">
                  <li>
                    <Link
                      to="/service-areas"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Canton
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/service-areas"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Novi
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/service-areas"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Wayne
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/service-areas"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Westland
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/service-areas"
                      className="block py-[5px] text-sm text-gray-text hover:text-primary-dark transition-colors"
                    >
                      Plymouth
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact */}
              <div className="mb-[30px]">
                <h2 className="text-base font-bold text-black mb-5">Contact</h2>
                <p className="text-sm text-gray-text font-normal mb-[15px]">
                  <Mail className="w-[14px] h-[14px] text-primary-dark inline-block mr-1" />
                  contact@verdeluxecleaning.com
                </p>
                <p className="text-sm text-gray-text font-normal mb-0">
                  <MapPin className="w-[14px] h-[14px] text-primary-dark inline-block mr-1" />
                  Southeast Michigan
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <hr className="border-gray-300 mb-6" />
        <div className="text-center">
          <p className="text-sm text-gray-text">
            © 2025 Verde Luxe Cleaning. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
