import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trash',
  description: 'Manage and restore deleted photos and videos from your vault.',
};

export default function TrashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
