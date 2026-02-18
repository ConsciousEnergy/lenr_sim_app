import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const Table = ({
  columns = [],
  dataSource = [],
  loading = false,
  rowKey = 'id',
  pagination = true,
  pageSize = 10,
  onRowClick,
  className = '',
  ...props
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [paginatedData, setPaginatedData] = useState([]);
  
  // Process data with sorting and pagination
  useEffect(() => {
    let processedData = [...dataSource];
    
    // Apply sorting if a sort field is set
    if (sortField) {
      const sortColumn = columns.find(col => col.key === sortField || col.dataIndex === sortField);
      if (sortColumn && sortColumn.sorter) {
        processedData.sort(sortColumn.sorter);
        if (sortDirection === 'desc') {
          processedData.reverse();
        }
      } else {
        processedData.sort((a, b) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc' 
              ? aValue.localeCompare(bValue) 
              : bValue.localeCompare(aValue);
          }
          return sortDirection === 'asc' 
            ? (aValue > bValue ? 1 : -1) 
            : (bValue > aValue ? 1 : -1);
        });
      }
    }
    
    // Apply pagination
    if (pagination) {
      const startIndex = (currentPage - 1) * pageSize;
      processedData = processedData.slice(startIndex, startIndex + pageSize);
    }
    
    setPaginatedData(processedData);
  }, [dataSource, sortField, sortDirection, currentPage, pageSize, pagination, columns]);
  
  // Handle sorting
  const handleSort = (column) => {
    if (!column.sorter) return;
    
    if (sortField === column.key || sortField === column.dataIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(column.key || column.dataIndex);
      setSortDirection('asc');
    }
  };
  
  // Pagination controls
  const totalPages = pagination ? Math.ceil(dataSource.length / pageSize) : 1;
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Get cell content with render function support
  const getCellContent = (column, record, index) => {
    if (column.render) {
      return column.render(record[column.dataIndex], record, index);
    }
    return record[column.dataIndex];
  };
  
  return (
    <div className={`w-full overflow-x-auto ${className}`} {...props}>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      ) : (
        <>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key || column.dataIndex || index}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      column.sorter ? 'cursor-pointer select-none' : ''
                    }`}
                    onClick={() => column.sorter && handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      {(sortField === column.key || sortField === column.dataIndex) && (
                        <span>
                          {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {paginatedData.length > 0 ? (
                paginatedData.map((record, rowIndex) => (
                  <tr
                    key={record[rowKey] || rowIndex}
                    className={`${
                      onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''
                    }`}
                    onClick={() => onRowClick && onRowClick(record)}
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={`${record[rowKey] || rowIndex}-${column.key || column.dataIndex || colIndex}`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                      >
                        {getCellContent(column, record, rowIndex)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {pagination && totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 px-6 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      dataIndex: PropTypes.string,
      title: PropTypes.node.isRequired,
      render: PropTypes.func,
      sorter: PropTypes.oneOfType([PropTypes.func, PropTypes.bool])
    })
  ).isRequired,
  dataSource: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  rowKey: PropTypes.string,
  pagination: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  pageSize: PropTypes.number,
  onRowClick: PropTypes.func,
  className: PropTypes.string
};

export default Table; 