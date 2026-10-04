import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Album',
  description: 'Create and curate a new album for your photos and videos.',
};

export default function CreateAlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
