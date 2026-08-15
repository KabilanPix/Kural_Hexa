import './main.css';

export const metadata = {
  title: 'Kural — AI Citizen Call & Grievance Intelligence Platform',
  description: 'AI-Powered Citizen Call & Message Intelligence Platform for real-time complaint classification, prioritization, deduplication, and routing.',
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="en">
      <body className="bg-navy-900 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
