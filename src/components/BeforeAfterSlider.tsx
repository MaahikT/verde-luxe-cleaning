import { useState, useRef, useEffect } from "react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  alt?: string;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  alt = "Before and After Comparison",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleStart = () => setIsDragging(true);
  const handleEnd = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleEnd);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging]);

  return (
    <div className="relative w-full overflow-hidden">
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] select-none cursor-ew-resize"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          handleMove(e.clientX);
        }}
      >
        {/* Before Image (Right side) */}
        <div className="absolute inset-0">
          <img
            src={beforeImage}
            alt={`${alt} - Before`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* After Image (Left side - clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={afterImage}
            alt={`${alt} - After`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-[15] transition-opacity duration-[250ms]"
          style={{ 
            left: `${sliderPosition}%`,
            opacity: isHovering ? 1 : 0.4
          }}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Slider Handle */}
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50px] h-[50px] rounded-full border-[3px] border-primary flex items-center justify-center cursor-ew-resize transition-all ${
              isDragging ? 'scale-[0.8] bg-primary shadow-[0_0_35px_#5e870d]' : isHovering ? 'bg-primary' : 'bg-white'
            }`}
            style={{
              position: 'relative',
            }}
          >
            {/* Left Arrow using CSS borders */}
            <span
              className="absolute border-white"
              style={{
                borderWidth: '0 2px 2px 0',
                display: 'inline-block',
                padding: '4px',
                transform: 'rotate(135deg)',
                top: '58%',
                marginTop: '-10px',
                left: '10px',
              }}
            />
            {/* Right Arrow using CSS borders */}
            <span
              className="absolute border-white"
              style={{
                borderWidth: '2px 0 0 2px',
                display: 'inline-block',
                padding: '4px',
                transform: 'rotate(135deg)',
                top: '58%',
                marginTop: '-10px',
                right: '10px',
              }}
            />
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 z-[14]">
          <span className="inline-block bg-primary text-white px-[15px] py-2 font-heading text-sm leading-none uppercase rounded-tr-lg">
            Before
          </span>
        </div>
        <div className="absolute bottom-0 right-0 z-[14]">
          <span className="inline-block bg-primary text-white px-[15px] py-2 font-heading text-sm leading-none uppercase rounded-tl-lg">
            After
          </span>
        </div>
      </div>
    </div>
  );
}
