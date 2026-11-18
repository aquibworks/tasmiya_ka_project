
import React, { useEffect, useState, useCallback } from 'react';
import { History, RefreshCw, Eye, Search, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  // Fetch all training runs from the backend
  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.listReports();

      // Ensure API response contains a valid runs array
      const fetchedRuns = Array.isArray(data?.runs) ? data.runs : [];

      setRuns(fetchedRuns);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch run history:', err);

      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Unable to load run history. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Filter runs by run ID
  const filtered = runs.filter((run) =>
    String(run?.run_id ?? '')
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const pageData = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Format timestamp safely
  const formatDate = (timestamp) => {
    if (!timestamp) return '—';

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString();
  };

  // Navigate to individual run report
  const handleViewReport = (runId) => {
    if (!runId) return;

    navigate(`/report/${encodeURIComponent(runId)}`);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="text-quantum-blue" />
            Run History
          </h1>

          <p className="text-slate-500 text-sm">
            All past training runs stored in the database
          </p>
        </div>

        <button
          onClick={fetchRuns}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw
            size={14}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 max-w-sm">
          <Search size={14} className="text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by run ID..."
            className="bg-transparent outline-none text-sm flex-1 min-w-0"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle
            size={18}
            className="text-red-500 mt-0.5 shrink-0"
          />

          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">
              Failed to load run history
            </p>

            <p className="text-sm text-red-600 mt-1">
              {error}
            </p>

            <button
              onClick={fetchRuns}
              className="text-sm text-red-700 font-medium hover:underline mt-2"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">
          <RefreshCw
            size={22}
            className="animate-spin mx-auto mb-3"
          />
          <p className="text-sm">Loading runs...</p>
        </div>

      ) : error ? null : filtered.length === 0 ? (

        /* Empty State */
        <EmptyState
          icon={History}
          title={search ? 'No matching runs found' : 'No runs yet'}
          description={
            search
              ? 'Try searching with a different run ID.'
              : 'Run a comparison from the Dashboard or Training Lab to create your first run.'
          }
        />

      ) : (

        /* Run History Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 whitespace-nowrap">
                    Run ID
                  </th>

                  <th className="text-left px-4 py-3 whitespace-nowrap">
                    Started At
                  </th>

                  <th className="text-center px-4 py-3">
                    Models
                  </th>

                  <th className="text-center px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {pageData.map((run, index) => (
                  <tr
                    key={run.run_id || `run-${index}`}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {/* Run ID */}
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {run.run_id || (
                        <span className="text-slate-400">
                          (legacy run)
                        </span>
                      )}
                    </td>

                    {/* Started At */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-slate-600">
                      {formatDate(run.started_at)}
                    </td>

                    {/* Model Count */}
                    <td className="text-center px-4 py-3">
                      {Number.isFinite(Number(run.model_count))
                        ? Number(run.model_count)
                        : 0}
                    </td>

                    {/* Action */}
                    <td className="text-center px-4 py-3">
                      {run.run_id ? (
                        <button
                          onClick={() => handleViewReport(run.run_id)}
                          className="text-quantum-blue hover:underline text-xs flex items-center gap-1 mx-auto"
                        >
                          <Eye size={12} />
                          View Report
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          No report
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}

        </div>
      )}

    </div>
  );
}
