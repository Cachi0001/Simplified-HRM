/**
 * IndicatorConfigService - Configuration management for message indicators
 * 
 * Handles loading, saving, and managing indicator configuration settings
 */

import { IndicatorConfig, DEFAULT_INDICATOR_CONFIG, IndicatorStyle } from '../types/indicators';

const CONFIG_STORAGE_KEY = 'message-indicator-config';

export class IndicatorConfigService {
  private config: IndicatorConfig;
  private listeners = new Set<(config: IndicatorConfig) => void>();

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from localStorage or use defaults
   */
  private loadConfig(): IndicatorConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_INDICATOR_CONFIG, ...parsed };
      }
    } catch (error) {
      console.error('❌ Failed to load indicator config:', error);
    }
    return { ...DEFAULT_INDICATOR_CONFIG };
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      console.log('💾 Indicator config saved:', this.config);
    } catch (error) {
      console.error('❌ Failed to save indicator config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): IndicatorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<IndicatorConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    // Validate configuration
    this.validateConfig();
    
    // Save to localStorage
    this.saveConfig();
    
    // Notify listeners
    this.notifyListeners();
    
    console.log('⚙️ Indicator config updated:', {
      old: oldConfig,
      new: this.config,
      changes: updates
    });
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_INDICATOR_CONFIG };
    this.saveConfig();
    this.notifyListeners();
    console.log('🔄 Indicator config reset to defaults');
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(callback: (config: IndicatorConfig) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current config
    callback(this.getConfig());
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    // Ensure duration is reasonable (500ms to 10s)
    if (this.config.duration < 500) {
      this.config.duration = 500;
    } else if (this.config.duration > 10000) {
      this.config.duration = 10000;
    }

    // Ensure fade duration is reasonable (100ms to 2s)
    if (this.config.fadeOutDuration < 100) {
      this.config.fadeOutDuration = 100;
    } else if (this.config.fadeOutDuration > 2000) {
      this.config.fadeOutDuration = 2000;
    }

    // Ensure valid style
    const validStyles: IndicatorStyle[] = ['pulse', 'glow', 'badge', 'ring'];
    if (!validStyles.includes(this.config.style)) {
      this.config.style = 'pulse';
    }
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    const currentConfig = this.getConfig();
    this.listeners.forEach(callback => {
      try {
        callback(currentConfig);
      } catch (error) {
        console.error('❌ Error in config listener:', error);
      }
    });
  }

  /**
   * Get configuration presets
   */
  getPresets(): Record<string, Partial<IndicatorConfig>> {
    return {
      subtle: {
        duration: 2000,
        fadeOutDuration: 300,
        style: 'pulse' as IndicatorStyle
      },
      normal: {
        duration: 3000,
        fadeOutDuration: 500,
        style: 'pulse' as IndicatorStyle
      },
      prominent: {
        duration: 4000,
        fadeOutDuration: 700,
        style: 'glow' as IndicatorStyle
      },
      minimal: {
        duration: 1500,
        fadeOutDuration: 200,
        style: 'badge' as IndicatorStyle
      },
      accessibility: {
        duration: 5000,
        fadeOutDuration: 1000,
        style: 'badge' as IndicatorStyle,
        respectReducedMotion: true
      }
    };
  }

  /**
   * Apply a preset configuration
   */
  applyPreset(presetName: string): void {
    const presets = this.getPresets();
    const preset = presets[presetName];
    
    if (preset) {
      this.updateConfig(preset);
      console.log(`🎨 Applied preset "${presetName}":`, preset);
    } else {
      console.warn(`⚠️ Unknown preset: ${presetName}`);
    }
  }

  /**
   * Export configuration for backup
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      this.updateConfig(imported);
      return true;
    } catch (error) {
      console.error('❌ Failed to import config:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.listeners.clear();
  }
}

// Singleton instance
let configServiceInstance: IndicatorConfigService | null = null;

/**
 * Get or create the global IndicatorConfigService instance
 */
export function getIndicatorConfigService(): IndicatorConfigService {
  if (!configServiceInstance) {
    configServiceInstance = new IndicatorConfigService();
  }
  return configServiceInstance;
}

/**
 * Reset the global IndicatorConfigService instance (useful for testing)
 */
export function resetIndicatorConfigService(): void {
  if (configServiceInstance) {
    configServiceInstance.cleanup();
    configServiceInstance = null;
  }
}

export default IndicatorConfigService;