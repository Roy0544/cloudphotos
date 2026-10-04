import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Timeline',
  description: 'Chronological timeline of all your preserved photos and streaming videos.',
};

export default function TimelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
