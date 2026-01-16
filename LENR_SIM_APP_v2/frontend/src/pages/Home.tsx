import { Link } from 'react-router-dom';
import { APP_VERSION } from '../config/version';

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center items-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-primary-800 dark:text-primary-300 mb-6">
          LENR Simulation Application
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          Advanced Low Energy Nuclear Reaction Simulation and Visualization
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <Link 
            to="/dashboard" 
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md"
          >
            Launch Simulation
          </Link>
          <Link 
            to="/results" 
            className="bg-secondary-600 hover:bg-secondary-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md"
          >
            View Results
          </Link>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400 mb-2">
              Advanced Physics Models
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Simulate quantum tunneling, electron screening, and phonon interactions with high precision.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400 mb-2">
              3D Visualizations
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Interactive 3D visualization of lattice structures and fusion processes.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400 mb-2">
              Custom Reactions
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Create and analyze custom fusion reactions with automatic validation.
            </p>
            <Link 
              to="/custom-reactions" 
              className="inline-block text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Manage Custom Reactions →
            </Link>
          </div>
        </div>
        
        <footer className="mt-16 text-sm text-gray-600 dark:text-gray-400">
          &copy; {new Date().getFullYear()} LENR Simulation Application | Version {APP_VERSION}
        </footer>
      </div>
    </div>
  );
}

export default Home; 