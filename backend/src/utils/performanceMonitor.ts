import logger from './logger';

// Lightweight performance monitor - minimal overhead
export class PerformanceMonitor {
  public static instance: PerformanceMonitor | null = null;

  constructor() {
    // No continuous monitoring - only log on startup
    logger.info('📊 Lightweight performance monitoring initialized');
  }

  /**
   * Simple execution tracking without heavy metrics
   */
  trackExecution<T>(
    componentName: string, 
    operation: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    // Just execute the function without heavy monitoring
    return fn().catch(error => {
      logger.error(`❌ ${componentName}:${operation} failed:`, error.message);
      throw error;
    });
  }

  /**
   * No-op methods for compatibility
   */
  stopMonitoring(): void {
    // No-op
  }

  reset(): void {
    // No-op
  }

  getStats(): any {
    return { message: 'Lightweight monitoring - no stats collected' };
  }
}

// Singleton instance
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!PerformanceMonitor.instance) {
    PerformanceMonitor.instance = new PerformanceMonitor();
  }
  return PerformanceMonitor.instance;
}

/**
 * Lightweight decorator - minimal overhead
 */
export function monitorPerformance(componentName: string, operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        logger.error(`❌ ${componentName}:${operation} failed:`, (error as Error).message);
        throw error;
      }
    };

    return descriptor;
  };
}