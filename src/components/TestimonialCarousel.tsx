import { useState, useEffect } from "react";
import { Star } from "lucide-react";

interface Testimonial {
  name: string;
  role?: string;
  rating: number;
  text: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Arian Z.",
    role: "Local Guide",
    rating: 5,
    text: "My experience was fantastic. I was informed of the service through a close friend and was skeptical at first, but the quality and pricing were both very good. I'd recommend this group 10/10 times when it comes to efficient, well done work.",
    avatar: "/imported/images/user1.png",
  },
  {
    name: "Jackie C.",
    role: "",
    rating: 5,
    text: "The young man that did the cleaning did a very good job. He was on time. I would recommend others to use this company job well done.",
    avatar: "/imported/images/user2.png",
  },
  {
    name: "Bud P.",
    role: "",
    rating: 5,
    text: "Cleaners were super efficient and through. House is spotless, will definitely use Verde Luxe again.",
    avatar: "/imported/images/user1.png",
  },
  {
    name: "Georgina H.",
    role: "",
    rating: 5,
    text: "Just spoke to a gentleman that explained everything to me. He was very nice and I haven't had my cleaning done yet but just speaking to him gave me hope that I'll have a clean home again will definitely post again once it's done very reasonable price.",
    avatar: "/imported/images/user1.png",
  },
];

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(3);

  // Update items to show based on window width
  useEffect(() => {
    const updateItemsToShow = () => {
      const width = window.innerWidth;
      if (width < 600) {
        setItemsToShow(1);
      } else if (width < 1000) {
        setItemsToShow(2);
      } else {
        setItemsToShow(3);
      }
    };

    updateItemsToShow();
    window.addEventListener("resize", updateItemsToShow);
    return () => window.removeEventListener("resize", updateItemsToShow);
  }, []);

  // Autoplay functionality - 3000ms timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get visible testimonials based on current index
  const getVisibleTestimonials = () => {
    const items = [];
    for (let i = 0; i < itemsToShow; i++) {
      const index = (currentIndex + i) % testimonials.length;
      items.push({ ...testimonials[index], key: `${index}-${i}` });
    }
    return items;
  };

  const visibleItems = getVisibleTestimonials();

  return (
    <div className="relative">
      <div className={`grid gap-5 ${
        itemsToShow === 1 ? 'grid-cols-1' : 
        itemsToShow === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {visibleItems.map((testimonial, idx) => (
          <div
            key={testimonial.key}
            className="bg-white rounded-lg border border-gray-200 p-[30px] pb-[90px] relative flex flex-col"
          >
            {/* Star Rating */}
            <div className="flex gap-1 mb-[10px] text-primary">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current" />
              ))}
            </div>

            {/* Testimonial Text */}
            <div className="mb-5 flex-grow">
              <p className="text-sm text-[#565656] leading-relaxed italic mb-0">
                "{testimonial.text}"
              </p>
            </div>

            {/* Author Info */}
            <div className="absolute left-[30px] right-[30px] bottom-[30px] flex items-center">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-[60px] h-[60px] rounded-full object-cover mr-[15px] flex-shrink-0"
              />
              <div>
                <h2 className="text-lg font-bold text-black leading-tight mb-0">
                  {testimonial.name}
                  {testimonial.role && (
                    <span className="block text-sm font-normal mt-1">
                      {testimonial.role}
                    </span>
                  )}
                </h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-[5px] mt-5">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentIndex ? "bg-primary-dark" : "bg-[#999]"
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
