// ===========================
// Data Models
// ===========================

export interface Story {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  rating: number;
  chapterCount: number;
  slug?: string;
  categories?: { id: string; name: string }[];
}

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role?: string;
}

// ===========================
// Component Props
// ===========================

export interface HeaderProps {
  isLoggedIn: boolean;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  selectedCategory?: string;
}

export interface StoryCardProps {
  slug: string;
  coverImageUrl: string | null;
  title: string;
  author: string;
  rating: number;
  chapterCount: number;
  categories?: { id: string; name: string }[];
}

export interface StoryGridProps {
  stories: Story[];
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
