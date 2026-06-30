import type { StoryCardProps } from "@/app/types";
import Link from "next/link";

// ===========================
// SVG Icons
// ===========================

function StarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-star-yellow shrink-0"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-light shrink-0"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

// ===========================
// Cover Placeholder (when no image URL)
// ===========================

function CoverPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-gray-400"
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M8 7h6" />
        <path d="M8 11h4" />
      </svg>
    </div>
  );
}

// ===========================
// StoryCard Component
// ===========================

export default function StoryCard({
  slug,
  coverImageUrl,
  title,
  author,
  rating,
  chapterCount,
  categories,
}: StoryCardProps) {
  return (
    <Link 
      href={`/stories/${slug}`}
      className="group flex flex-col overflow-hidden rounded-lg bg-card-bg shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer text-inherit no-underline"
    >
      {/* ── Cover Image (2:3 ratio) ── */}
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {coverImageUrl ? (
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
            role="img"
            aria-label={`Ảnh bìa truyện ${title}`}
          />
        ) : (
          <CoverPlaceholder />
        )}

        {/* Rating badge overlay */}
        <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
          <StarIcon />
          <span className="text-[10px] font-semibold text-white">
            {rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* ── Info Section ── */}
      <div className="flex flex-1 flex-col justify-between px-2.5 py-2">
        {/* Title — max 2 lines */}
        <h3
          className="mb-1 text-sm font-semibold leading-snug text-text-heading line-clamp-2"
          title={title}
        >
          {title}
        </h3>

        {/* Author */}
        <p className="mb-1 text-xs text-text-muted truncate">{author}</p>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {categories.slice(0, 2).map((cat) => (
              <span
                key={cat.id}
                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-600 border border-purple-100"
              >
                {cat.name}
              </span>
            ))}
            {categories.length > 2 && (
              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-50 text-gray-500 border border-gray-200">
                +{categories.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Chapter count */}
        <div className="flex items-center gap-1.5">
          <BookOpenIcon />
          <span className="text-[10px] text-text-light">
            {chapterCount} chương
          </span>
        </div>
      </div>
    </Link>
  );
}
