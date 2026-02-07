import Image from 'next/image';
import StarRating from './StarRating';

export interface Testimonial {
  id: number;
  name: string;
  rank: string;
  quote: string;
  rating: number;
  avatar?: string;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const { name, rank, quote, rating, avatar } = testimonial;
  
  // Get rank image path
  const rankImage = `/ranks/${rank.toLowerCase().replace(/\s/g, '')}.webp`;

  return (
    <div className="cursor-default bg-card-bg rounded-2xl border-2 border-border-color p-6 md:p-8 h-full flex flex-col hover:border-red-highlight transition-colors duration-300">
      {/* Quote */}
      <div className="flex-1 mb-6">
        <svg
          className="w-10 h-10 text-red-highlight/30 mb-4"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="text-text-secondary text-lg leading-relaxed italic">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {/* Star Rating */}
      <div className="mb-4">
        <StarRating rating={rating} />
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-card-bg-light border-2 border-border-color flex items-center justify-center overflow-hidden">
          {avatar ? (
            <Image
              src={avatar}
              alt={name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-text-tertiary text-lg font-semibold">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name and Rank */}
        <div className="flex-1">
          <h4 className="text-text-primary font-semibold">{name}</h4>
          <div className="flex items-center gap-2">
            <Image
              src={rankImage}
              alt={rank}
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span className="text-text-tertiary text-sm capitalize">{rank}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
