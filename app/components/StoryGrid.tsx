import type { StoryGridProps } from "@/app/types";
import StoryCard from "./StoryCard";

// ===========================
// Empty State
// ===========================

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20">
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-4 text-text-light"
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M8 7h6" />
        <path d="M8 11h4" />
      </svg>
      <p className="text-lg font-medium text-text-muted">
        Chưa có truyện nào
      </p>
      <p className="mt-1 text-sm text-text-light">
        Dữ liệu truyện sẽ được tải từ hệ thống
      </p>
    </div>
  );
}

// ===========================
// StoryGrid Component
// ===========================

export default function StoryGrid({ stories }: StoryGridProps) {
  return (
    <section id="story-section" className="py-8">
      {/* ── Section Heading (Magical Fantasy Style) ── */}
      <div className="mb-6 sm:mb-8 flex items-center gap-3">
        {/* Pulsing Sparkles Icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fuchsia-500 animate-pulse shrink-0 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]"
        >
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5 5 3Z" opacity="0.6" fill="currentColor" />
          <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" opacity="0.6" fill="currentColor" />
        </svg>

        {/* Gradient Text */}
        <h2 className="text-xl font-extrabold uppercase tracking-wider bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text sm:text-2xl">
          Truyện Mới Cập Nhật
        </h2>

        {/* Fading Line */}
        <div className="flex-1 h-[2px] rounded-full bg-gradient-to-r from-purple-500/50 to-transparent" />
      </div>

      {/* ── Grid ── */}
      {stories.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              slug={story.slug || ""}
              coverImageUrl={story.coverImageUrl}
              title={story.title}
              author={story.author}
              rating={story.rating}
              chapterCount={story.chapterCount}
              categories={story.categories}
            />
          ))}
        </div>
      )}
    </section>
  );
}
