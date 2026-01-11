import React, { useEffect } from 'react';
import { usePhysics } from '../contexts/PhysicsContext';
import { format } from 'date-fns';

const SimulationHistory = () => {
  const { 
    simulationHistory, 
    fetchSimulationHistory, 
    loadSimulation,
    simulationId
  } = usePhysics();

  useEffect(() => {
    // Refresh history after completing a simulation
    fetchSimulationHistory();
  }, [simulationId, fetchSimulationHistory]);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'stopped':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Simulation History</h2>
        <button
          onClick={fetchSimulationHistory}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {simulationHistory.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No simulation history found
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {simulationHistory.map((simulation) => (
                  <tr 
                    key={simulation.id}
                    className={simulation.id === simulationId ? 'bg-blue-50' : ''}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(simulation.createdAt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(simulation.status)}`}>
                        {simulation.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {simulation.parameters.latticeType}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => loadSimulation(simulation.id)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                        disabled={simulation.id === simulationId}
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationHistory;