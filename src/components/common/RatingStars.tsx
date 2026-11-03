import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showValue?: boolean;
}

export default function RatingStars({ rating, size = 16, showValue = false }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            className={`${
              i < Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : i < rating
                ? 'fill-yellow-400 text-yellow-400 opacity-50'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {showValue && <span className="text-sm font-semibold ml-1">{rating}</span>}
    </div>
  );
}