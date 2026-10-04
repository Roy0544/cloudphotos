import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Photo Studio',
  description: 'Enhance, restore, and transform your photos with intelligent AI tools.',
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
