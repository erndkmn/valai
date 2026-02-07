'use client';

import { useState, useEffect, useCallback } from 'react';
import TestimonialCard, { Testimonial } from './TestimonialCard';

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  autoPlayInterval?: number;
}

export default function TestimonialsCarousel({
  testimonials,
  autoPlayInterval = 5000,
}: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [itemsPerView, setItemsPerView] = useState(3);

  // Determine items per view based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalSlides = Math.ceil(testimonials.length / itemsPerView);
  const maxIndex = Math.max(0, totalSlides - 1);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || testimonials.length <= itemsPerView) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isAutoPlaying, autoPlayInterval, goToNext, testimonials.length, itemsPerView]);

  // Pause autoplay on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  // Get visible testimonials
  const getVisibleTestimonials = () => {
    const startIndex = currentIndex * itemsPerView;
    const endIndex = Math.min(startIndex + itemsPerView, testimonials.length);
    return testimonials.slice(startIndex, endIndex);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Carousel Container */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {Array.from({ length: totalSlides }, (_, slideIndex) => {
            const startIndex = slideIndex * itemsPerView;
            const slideTestimonials = testimonials.slice(
              startIndex,
              startIndex + itemsPerView
            );

            return (
              <div
                key={slideIndex}
                className="w-full flex-shrink-0"
              >
                <div className={`grid gap-6 ${
                  itemsPerView === 1 
                    ? 'grid-cols-1' 
                    : itemsPerView === 2 
                    ? 'grid-cols-2' 
                    : 'grid-cols-3'
                }`}>
                  {slideTestimonials.map((testimonial) => (
                    <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {testimonials.length > itemsPerView && (
        <>
          <button
            onClick={goToPrev}
            className="cursor-pointer absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 w-12 h-12 bg-card-bg border-2 border-border-color rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-red-highlight transition-colors z-10"
            aria-label="Previous testimonials"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 w-12 h-12 bg-card-bg border-2 border-border-color rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-red-highlight transition-colors z-10"
            aria-label="Next testimonials"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-red-highlight w-8'
                  : 'bg-border-color hover:bg-text-tertiary'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
