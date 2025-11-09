
import PropTypes from 'prop-types';

const Card = ({
  children,
  title,
  subtitle,
  footer,
  variant = 'default',
  bordered = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  ...props
}) => {
  const baseClasses = 'rounded-lg overflow-hidden';
  
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800',
    elevated: 'bg-white shadow-md dark:bg-gray-800 dark:shadow-gray-900/30',
    outline: bordered 
      ? 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700' 
      : 'bg-white dark:bg-gray-800',
    flat: 'bg-gray-50 dark:bg-gray-900'
  };
  
  const headerClasses = 'px-6 py-4 border-b border-gray-200 dark:border-gray-700';
  const bodyClasses = 'px-6 py-4';
  const footerClasses = 'px-6 py-4 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900';
  
  const cardClasses = [
    baseClasses,
    variantClasses[variant],
    className
  ].join(' ');
  
  const hasHeader = title || subtitle;
  
  return (
    <div className={cardClasses} {...props}>
      {hasHeader && (
        <div className={`${headerClasses} ${headerClassName}`}>
          {title && <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      )}
      
      <div className={`${bodyClasses} ${bodyClassName}`}>
        {children}
      </div>
      
      {footer && (
        <div className={`${footerClasses} ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  footer: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'elevated', 'outline', 'flat']),
  bordered: PropTypes.bool,
  className: PropTypes.string,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  footerClassName: PropTypes.string
};

export default Card; 