"use client";
import { useState, useEffect } from 'react';

interface PerformanceMetrics {
  cacheHitRate: string;
  changeDetection: string;
  smartRefresh: string;
  totalItems: number;
  totalChangeEvents: number;
  uptime: number;
  changeEventRate: string;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/admin/smart-cache', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setMetrics({
            cacheHitRate: data.performance?.cacheHitRate || 'Unknown',
            changeDetection: data.performance?.changeDetection || 'Unknown',
            smartRefresh: data.performance?.smartRefresh || 'Unknown',
            totalItems: data.cache?.totalItems || 0,
            totalChangeEvents: data.cache?.totalChangeEvents || 0,
            uptime: data.cache?.uptime || 0,
            changeEventRate: data.cache?.changeEventRate || '0'
          });
        } else {
          setError('Failed to fetch metrics');
        }
      } catch (err) {
        setError('Error fetching metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-3 bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
        <div className="text-red-400 text-sm">Performance monitoring unavailable</div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Smart Cache Performance</h3>
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Cache Items:</span>
          <span className="text-white font-mono">{metrics.totalItems}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Change Events:</span>
          <span className="text-white font-mono">{metrics.totalChangeEvents}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Event Rate:</span>
          <span className="text-white font-mono">{metrics.changeEventRate}/s</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Uptime:</span>
          <span className="text-white font-mono">{Math.floor(metrics.uptime / 1000)}s</span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-400">Status:</span>
            <span className="text-green-400 font-medium">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
