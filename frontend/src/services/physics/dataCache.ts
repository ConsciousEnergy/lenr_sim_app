/**
 * Physics Data Cache
 * 
 * Provides caching for physics simulation data to improve performance
 * and reduce unnecessary WebSocket traffic or data processing.
 */

import {
  SimulationUpdateMessage,
  LatticeState,
  SimulationSummary
} from '../../api/physics/types';
import {
  TimeSeriesData,
  MultiSeriesData,
  VisualizationPoint
} from './dataTransformations';

/**
 * LRU Cache implementation for generic data
 */
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private keyOrder: K[];
  
  constructor(capacity: number = 100) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
    this.keyOrder = [];
  }
  
  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move key to the end (most recently used)
      this.keyOrder = this.keyOrder.filter(k => k !== key);
      this.keyOrder.push(key);
    }
    
    return value;
  }
  
  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    // If key already exists, update the value and move to end
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.keyOrder = this.keyOrder.filter(k => k !== key);
      this.keyOrder.push(key);
      return;
    }
    
    // If cache is at capacity, remove the least recently used item
    if (this.keyOrder.length >= this.capacity) {
      const lruKey = this.keyOrder.shift();
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
      }
    }
    
    // Add the new item
    this.cache.set(key, value);
    this.keyOrder.push(key);
  }
  
  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.keyOrder = [];
  }
  
  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Get all values in the cache
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }
  
  /**
   * Get all entries in the cache
   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries());
  }
}

/**
 * Physics Data Cache - Manages caching of physics simulation data
 */
export class PhysicsDataCache {
  // Maximum number of simulation updates to keep
  private readonly MAX_UPDATES = 1000;
  
  // Time-series data expiration (ms)
  private readonly TIME_SERIES_EXPIRATION = 5 * 60 * 1000; // 5 minutes
  
  // Cache for simulation updates
  private updateCache: SimulationUpdateMessage[] = [];
  
  // Cache for derived data with timestamps
  private timeSeriesCache: Map<string, { data: TimeSeriesData, timestamp: number }> = new Map();
  private multiSeriesCache: Map<string, { data: MultiSeriesData, timestamp: number }> = new Map();
  
  // LRU cache for transformed visualization data
  private visualizationCache: LRUCache<string, VisualizationPoint[]> = new LRUCache(20);
  
  // Current lattice state and summary
  private currentLatticeState: LatticeState | null = null;
  private currentSummary: SimulationSummary | null = null;
  
  /**
   * Add a simulation update to the cache
   */
  public addSimulationUpdate(update: SimulationUpdateMessage): void {
    // Update the current lattice state and summary
    this.currentLatticeState = update.lattice;
    this.currentSummary = update.summary;
    
    // Add to update cache
    this.updateCache.push(update);
    
    // Trim cache if it exceeds the maximum size
    if (this.updateCache.length > this.MAX_UPDATES) {
      this.updateCache = this.updateCache.slice(-this.MAX_UPDATES);
    }
    
    // Invalidate derived data caches
    this.invalidateDerivedCaches();
  }
  
  /**
   * Get the current lattice state
   */
  public getLatticeState(): LatticeState | null {
    return this.currentLatticeState;
  }
  
  /**
   * Get the current simulation summary
   */
  public getSimulationSummary(): SimulationSummary | null {
    return this.currentSummary;
  }
  
  /**
   * Get all cached simulation updates
   */
  public getSimulationUpdates(): SimulationUpdateMessage[] {
    return [...this.updateCache];
  }
  
  /**
   * Get a time window of simulation updates
   */
  public getUpdateTimeWindow(
    durationMs: number
  ): SimulationUpdateMessage[] {
    if (this.updateCache.length === 0) {
      return [];
    }
    
    const now = Date.now();
    const cutoff = now - durationMs;
    
    return this.updateCache.filter(update => {
      const updateTime = update.time * 1000; // Convert to ms
      return updateTime >= cutoff;
    });
  }
  
  /**
   * Get time series data from cache or add it
   */
  public getTimeSeriesData(
    key: string,
    generator: () => TimeSeriesData
  ): TimeSeriesData {
    const cachedItem = this.timeSeriesCache.get(key);
    const now = Date.now();
    
    // Return cached data if it exists and isn't expired
    if (cachedItem && (now - cachedItem.timestamp) < this.TIME_SERIES_EXPIRATION) {
      return cachedItem.data;
    }
    
    // Generate new data, cache it, and return
    const newData = generator();
    this.timeSeriesCache.set(key, { data: newData, timestamp: now });
    return newData;
  }
  
  /**
   * Get multi-series data from cache or add it
   */
  public getMultiSeriesData(
    key: string,
    generator: () => MultiSeriesData
  ): MultiSeriesData {
    const cachedItem = this.multiSeriesCache.get(key);
    const now = Date.now();
    
    // Return cached data if it exists and isn't expired
    if (cachedItem && (now - cachedItem.timestamp) < this.TIME_SERIES_EXPIRATION) {
      return cachedItem.data;
    }
    
    // Generate new data, cache it, and return
    const newData = generator();
    this.multiSeriesCache.set(key, { data: newData, timestamp: now });
    return newData;
  }
  
  /**
   * Get visualization points from cache or add them
   */
  public getVisualizationPoints(
    key: string,
    generator: () => VisualizationPoint[]
  ): VisualizationPoint[] {
    const cachedData = this.visualizationCache.get(key);
    
    if (cachedData) {
      return cachedData;
    }
    
    const newData = generator();
    this.visualizationCache.set(key, newData);
    return newData;
  }
  
  /**
   * Invalidate derived data caches
   */
  private invalidateDerivedCaches(): void {
    // Check if any time series cache items have expired
    const now = Date.now();
    
    // Convert to array before iterating
    const timeSeriesEntries = Array.from(this.timeSeriesCache.entries());
    for (const [key, { timestamp }] of timeSeriesEntries) {
      if (now - timestamp > this.TIME_SERIES_EXPIRATION) {
        this.timeSeriesCache.delete(key);
      }
    }
    
    // Convert to array before iterating
    const multiSeriesEntries = Array.from(this.multiSeriesCache.entries());
    for (const [key, { timestamp }] of multiSeriesEntries) {
      if (now - timestamp > this.TIME_SERIES_EXPIRATION) {
        this.multiSeriesCache.delete(key);
      }
    }
  }
  
  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.updateCache = [];
    this.timeSeriesCache.clear();
    this.multiSeriesCache.clear();
    this.visualizationCache.clear();
    this.currentLatticeState = null;
    this.currentSummary = null;
  }
  
  /**
   * Get current cache statistics
   */
  public getCacheStats(): {
    updates: number;
    timeSeries: number;
    multiSeries: number;
    visualization: number;
  } {
    return {
      updates: this.updateCache.length,
      timeSeries: this.timeSeriesCache.size,
      multiSeries: this.multiSeriesCache.size,
      visualization: this.visualizationCache.size()
    };
  }
} 