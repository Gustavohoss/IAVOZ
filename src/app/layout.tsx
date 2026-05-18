import type {Metadata} from 'next';
import './globals.css';

const APP_IMAGE_URL = 'https://s3.typebotstorage.com/public/workspaces/cm87fx6c6001i920ze1ryoryq/typebots/cmpb8altd00020bkmal2nn1wc/blocks/d6qo6ewgeh0gsn9os7ye6xsi?v=1779110234413';

export const metadata: Metadata = {
  title: 'Obscura | AI English Tutor',
  description: 'Sophisticated AI-powered English learning experience.',
  icons: {
    icon: APP_IMAGE_URL,
    apple: APP_IMAGE_URL,
  },
  openGraph: {
    title: 'Obscura | AI English Tutor',
    description: 'Sophisticated AI-powered English learning experience.',
    images: [APP_IMAGE_URL],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
