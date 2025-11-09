import { forwardRef, useId } from 'react';
import PropTypes from 'prop-types';

const Input = forwardRef(({
  type = 'text',
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  helper,
  className = '',
  variant = 'default',
  fullWidth = false,
  prefix,
  suffix,
  onChange,
  id: providedId,
  name,
  ...props
}, ref) => {
  // Generate unique IDs for accessibility
  const generatedId = useId();
  const inputId = providedId || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  
  const baseClasses = 'rounded-md border bg-white px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100';
  
  const variantClasses = {
    default: 'border-gray-300 focus-visible:ring-primary-500 dark:border-gray-600 dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-gray-900',
    error: 'border-red-500 focus-visible:ring-red-500 text-red-900 dark:border-red-600 dark:text-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900',
    success: 'border-green-500 focus-visible:ring-green-500 dark:border-green-600 dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-gray-900'
  };
  
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const inputClasses = [
    baseClasses,
    variantClasses[error ? 'error' : variant],
    widthClasses,
    className
  ].join(' ');
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 dark:text-red-400"> *</span>}
        </label>
      )}
      
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{prefix}</span>
          </div>
        )}
        
        <input
          id={inputId}
          name={name || inputId}
          type={type}
          className={`${inputClasses} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''}`}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          ref={ref}
          onChange={onChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : (helper ? helperId : undefined)}
          aria-errormessage={error ? errorId : undefined}
          {...props}
        />
        
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{suffix}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={errorId}
          role="alert"
          className="mt-1 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
      
      {!error && helper && (
        <p 
          id={helperId}
          className="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  type: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  helper: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'error', 'success']),
  fullWidth: PropTypes.bool,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  onChange: PropTypes.func,
  id: PropTypes.string,
  name: PropTypes.string
};

export default Input; 