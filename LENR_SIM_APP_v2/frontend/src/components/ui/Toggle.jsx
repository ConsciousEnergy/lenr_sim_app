
import PropTypes from 'prop-types';

const Toggle = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = 'relative inline-flex items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50';
  
  const sizeClasses = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-12'
  };
  
  const toggleClasses = [
    baseClasses,
    sizeClasses[size],
    checked ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-200 dark:bg-gray-700',
    className
  ].join(' ');
  
  const handleSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const handlePositions = {
    sm: checked ? 'translate-x-4' : 'translate-x-1',
    md: checked ? 'translate-x-5' : 'translate-x-1',
    lg: checked ? 'translate-x-6' : 'translate-x-1'
  };
  
  const handleClasses = [
    'pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition-transform',
    handleSizes[size],
    handlePositions[size]
  ].join(' ');
  
  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  return (
    <label className="flex items-center cursor-pointer">
      <input 
        type="checkbox"
        className="sr-only" 
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        {...props}
      />
      
      <span className={toggleClasses}>
        <span className={handleClasses} />
      </span>
      
      {label && (
        <span className={`ml-2 ${labelSizes[size]} text-gray-700 dark:text-gray-300 ${disabled ? 'opacity-50' : ''}`}>
          {label}
        </span>
      )}
    </label>
  );
};

Toggle.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  label: PropTypes.node,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
};

export default Toggle; 