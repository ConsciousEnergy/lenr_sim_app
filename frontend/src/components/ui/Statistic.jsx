
import PropTypes from 'prop-types';

const Statistic = ({
  title,
  value,
  precision = 0,
  prefix,
  suffix,
  loading = false,
  valueStyle = {},
  className = '',
  ...props
}) => {
  // Format the value based on precision
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString(undefined, { 
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      }) 
    : value;

  return (
    <div className={`flex flex-col ${className}`} {...props}>
      {title && (
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          {title}
        </div>
      )}
      
      <div className="flex items-center">
        {loading ? (
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        ) : (
          <>
            {prefix && (
              <span className="mr-1 text-gray-500 dark:text-gray-400">{prefix}</span>
            )}
            
            <span 
              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
              style={valueStyle}
            >
              {formattedValue}
            </span>
            
            {suffix && (
              <span className="ml-1 text-gray-500 dark:text-gray-400">{suffix}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

Statistic.propTypes = {
  title: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  precision: PropTypes.number,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  loading: PropTypes.bool,
  valueStyle: PropTypes.object,
  className: PropTypes.string
};

export default Statistic; 