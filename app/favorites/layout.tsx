import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Favorites',
  description: 'Curated collection of your starred and favorite photos and videos.',
};

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
