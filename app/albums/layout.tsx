import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Albums',
  description: 'Organized photo and video albums, shared collections, and memory vaults.',
};

export default function AlbumsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
