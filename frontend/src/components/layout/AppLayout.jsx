import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Enterprise Application Layout Container
 * Provides Aurora subtle backdrop mesh, navbar, responsive container, and footer.
 */
export default function AppLayout({
  children,
  maxWidth = 'max-w-7xl',
  showFooter = true,
  className = '',
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 selection:bg-indigo-500 selection:text-white">
      <Navbar />

      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 ${maxWidth} ${className}`}>
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
