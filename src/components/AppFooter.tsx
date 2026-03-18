export function AppFooter() {
  return (
    <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-black/5 mt-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 text-xs uppercase tracking-widest font-semibold">
        <p>© 2026 Audio Intelligence Lab</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-black transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-black transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-black transition-colors">
            API Documentation
          </a>
        </div>
      </div>
    </footer>
  );
}
