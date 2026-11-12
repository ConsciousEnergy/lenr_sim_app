
function AppFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white dark:bg-gray-800 py-3 px-4 md:px-6 border-t border-neutral-200 dark:border-gray-700 text-center md:text-left">
      <div className="flex flex-col md:flex-row md:justify-between items-center text-sm text-neutral-600 dark:text-gray-400">
        <div>
          &copy; {currentYear} LENR Simulation App.{' '}
          <a href="/license" className="hover:text-primary-600">GPL-3.0</a>.
        </div>
        <div className="mt-2 md:mt-0">
          <a href="/about" className="hover:text-primary-600 mr-4">About</a>
          <a href="/privacy" className="hover:text-primary-600 mr-4">Privacy</a>
          <a href="/docs" className="hover:text-primary-600">Documentation</a>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter; 
