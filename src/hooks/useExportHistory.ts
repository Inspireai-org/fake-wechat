import { useState, useCallback, useEffect, useMemo } from 'react';
import { ExportConfig, ExportResult } from '../lib/exportEngine';

// 导出历史项接口
export interface ExportHistoryItem {
  id: string;
  filename: string;
  config: ExportConfig;
  fileSize: number;
  duration: number;
  exportedAt: number;
  success: boolean;
  error?: string;
  // 缓存相关
  cachedBlob?: Blob;
  cacheExpiry?: number;
}

// 导出预设接口
export interface ExportPreset {
  id: string;
  name: string;
  config: ExportConfig;
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
}

// 导出统计接口
export interface ExportStats {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  totalFileSize: number;
  totalDuration: number;
  averageFileSize: number;
  averageDuration: number;
  mostUsedFormat: string;
  mostUsedQuality: string;
}

// 本地存储键名
const STORAGE_KEYS = {
  HISTORY: 'wechat-simulator-export-history',
  PRESETS: 'wechat-simulator-export-presets',
  CACHE: 'wechat-simulator-export-cache'
} as const;

// 缓存配置
const CACHE_CONFIG = {
  MAX_ITEMS: 10, // 最多缓存10个文件
  EXPIRY_HOURS: 24, // 缓存24小时
  MAX_FILE_SIZE: 50 * 1024 * 1024 // 最大缓存文件大小50MB
} as const;

export const useExportHistory = () => {
  // 状态管理
  const [history, setHistory] = useState<ExportHistoryItem[]>([]);
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从本地存储加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 加载历史记录
        const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
        if (savedHistory) {
          const parsedHistory: ExportHistoryItem[] = JSON.parse(savedHistory);
          setHistory(parsedHistory);
        }

        // 加载预设
        const savedPresets = localStorage.getItem(STORAGE_KEYS.PRESETS);
        if (savedPresets) {
          const parsedPresets: ExportPreset[] = JSON.parse(savedPresets);
          setPresets(parsedPresets);
        }

        // 清理过期缓存
        await cleanupExpiredCache();
      } catch (error) {
        console.error('加载导出数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 保存历史记录到本地存储
  const saveHistoryToStorage = useCallback((newHistory: ExportHistoryItem[]) => {
    try {
      // 限制历史记录数量（保留最近100条）
      const limitedHistory = newHistory.slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }, []);

  // 保存预设到本地存储
  const savePresetsToStorage = useCallback((newPresets: ExportPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(newPresets));
    } catch (error) {
      console.error('保存预设失败:', error);
    }
  }, []);

  // 生成唯一ID
  const generateId = useCallback((): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 添加导出记录
  const addExportRecord = useCallback(async (
    result: ExportResult,
    success: boolean = true,
    error?: string
  ) => {
    const newItem: ExportHistoryItem = {
      id: generateId(),
      filename: result.filename,
      config: { ...result.config },
      fileSize: result.fileSize,
      duration: result.duration,
      exportedAt: Date.now(),
      success,
      error
    };

    // 如果成功且文件不太大，缓存文件
    if (success && result.blob.size <= CACHE_CONFIG.MAX_FILE_SIZE) {
      try {
        await cacheExportFile(newItem.id, result.blob);
        newItem.cachedBlob = result.blob;
        newItem.cacheExpiry = Date.now() + (CACHE_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000);
      } catch (error) {
        console.warn('缓存导出文件失败:', error);
      }
    }

    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    saveHistoryToStorage(newHistory);

    return newItem;
  }, [history, generateId, saveHistoryToStorage]);

  // 删除导出记录
  const deleteExportRecord = useCallback(async (itemId: string) => {
    const item = history.find(h => h.id === itemId);
    if (item) {
      // 删除缓存文件
      await removeCachedFile(itemId);
    }

    const newHistory = history.filter(item => item.id !== itemId);
    setHistory(newHistory);
    saveHistoryToStorage(newHistory);
  }, [history, saveHistoryToStorage]);

  // 清空历史记录
  const clearHistory = useCallback(async () => {
    // 清理所有缓存文件
    await clearAllCache();
    
    setHistory([]);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }, []);

  // 获取缓存的导出文件
  const getCachedFile = useCallback(async (itemId: string): Promise<Blob | null> => {
    try {
      const item = history.find(h => h.id === itemId);
      if (!item || !item.cachedBlob) {
        return null;
      }

      // 检查缓存是否过期
      if (item.cacheExpiry && Date.now() > item.cacheExpiry) {
        await removeCachedFile(itemId);
        return null;
      }

      return item.cachedBlob;
    } catch (error) {
      console.error('获取缓存文件失败:', error);
      return null;
    }
  }, [history]);

  // 重新导出
  const reExport = useCallback(async (
    historyItem: ExportHistoryItem,
    onExport: (config: ExportConfig) => Promise<ExportResult>
  ): Promise<ExportResult | null> => {
    try {
      // 首先尝试从缓存获取
      const cachedFile = await getCachedFile(historyItem.id);
      if (cachedFile) {
        // 创建下载链接
        const url = URL.createObjectURL(cachedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = historyItem.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 返回缓存的结果
        return {
          blob: cachedFile,
          filename: historyItem.filename,
          fileSize: historyItem.fileSize,
          duration: 0, // 缓存文件无需重新生成
          config: historyItem.config
        };
      }

      // 缓存不存在，重新导出
      const result = await onExport(historyItem.config);
      
      // 更新历史记录
      await addExportRecord(result, true);
      
      return result;
    } catch (error) {
      console.error('重新导出失败:', error);
      
      // 添加失败记录
      await addExportRecord({
        blob: new Blob(),
        filename: historyItem.filename,
        fileSize: 0,
        duration: 0,
        config: historyItem.config
      }, false, error instanceof Error ? error.message : '重新导出失败');
      
      return null;
    }
  }, [getCachedFile, addExportRecord]);

  // 保存预设
  const savePreset = useCallback((preset: Omit<ExportPreset, 'id' | 'createdAt' | 'usageCount'>) => {
    const newPreset: ExportPreset = {
      ...preset,
      id: generateId(),
      createdAt: Date.now(),
      usageCount: 0
    };

    const newPresets = [newPreset, ...presets];
    setPresets(newPresets);
    savePresetsToStorage(newPresets);

    return newPreset;
  }, [presets, generateId, savePresetsToStorage]);

  // 删除预设
  const deletePreset = useCallback((presetId: string) => {
    const newPresets = presets.filter(preset => preset.id !== presetId);
    setPresets(newPresets);
    savePresetsToStorage(newPresets);
  }, [presets, savePresetsToStorage]);

  // 使用预设
  const usePreset = useCallback((preset: ExportPreset) => {
    // 更新使用统计
    const updatedPreset = {
      ...preset,
      lastUsed: Date.now(),
      usageCount: preset.usageCount + 1
    };

    const newPresets = presets.map(p => 
      p.id === preset.id ? updatedPreset : p
    );
    setPresets(newPresets);
    savePresetsToStorage(newPresets);

    return updatedPreset;
  }, [presets, savePresetsToStorage]);

  // 导入/导出预设
  const exportPresets = useCallback((): string => {
    return JSON.stringify(presets, null, 2);
  }, [presets]);

  const importPresets = useCallback((presetsJson: string): boolean => {
    try {
      const importedPresets: ExportPreset[] = JSON.parse(presetsJson);
      
      // 验证数据格式
      if (!Array.isArray(importedPresets)) {
        throw new Error('无效的预设格式');
      }

      // 为导入的预设生成新ID，避免冲突
      const newPresets = importedPresets.map(preset => ({
        ...preset,
        id: generateId(),
        createdAt: Date.now(),
        usageCount: 0
      }));

      const mergedPresets = [...newPresets, ...presets];
      setPresets(mergedPresets);
      savePresetsToStorage(mergedPresets);

      return true;
    } catch (error) {
      console.error('导入预设失败:', error);
      return false;
    }
  }, [presets, generateId, savePresetsToStorage]);

  // 缓存管理函数
  const cacheExportFile = useCallback(async (itemId: string, blob: Blob): Promise<void> => {
    try {
      // 检查缓存空间
      await ensureCacheSpace();

      // 使用IndexedDB存储大文件
      if ('indexedDB' in window) {
        await storeInIndexedDB(itemId, blob);
      }
    } catch (error) {
      console.warn('缓存文件失败:', error);
    }
  }, []);

  const removeCachedFile = useCallback(async (itemId: string): Promise<void> => {
    try {
      if ('indexedDB' in window) {
        await removeFromIndexedDB(itemId);
      }

      // 更新历史记录，移除缓存引用
      const newHistory = history.map(item => 
        item.id === itemId 
          ? { ...item, cachedBlob: undefined, cacheExpiry: undefined }
          : item
      );
      setHistory(newHistory);
      saveHistoryToStorage(newHistory);
    } catch (error) {
      console.warn('删除缓存文件失败:', error);
    }
  }, [history, saveHistoryToStorage]);

  const clearAllCache = useCallback(async (): Promise<void> => {
    try {
      if ('indexedDB' in window) {
        await clearIndexedDB();
      }
    } catch (error) {
      console.warn('清理缓存失败:', error);
    }
  }, []);

  const cleanupExpiredCache = useCallback(async (): Promise<void> => {
    const now = Date.now();
    const expiredItems = history.filter(item => 
      item.cacheExpiry && now > item.cacheExpiry
    );

    for (const item of expiredItems) {
      await removeCachedFile(item.id);
    }
  }, [history, removeCachedFile]);

  const ensureCacheSpace = useCallback(async (): Promise<void> => {
    const cachedItems = history.filter(item => item.cachedBlob);
    
    if (cachedItems.length >= CACHE_CONFIG.MAX_ITEMS) {
      // 删除最旧的缓存项
      const oldestItem = cachedItems
        .sort((a, b) => a.exportedAt - b.exportedAt)[0];
      
      if (oldestItem) {
        await removeCachedFile(oldestItem.id);
      }
    }
  }, [history, removeCachedFile]);

  // IndexedDB 操作函数
  const storeInIndexedDB = useCallback(async (itemId: string, blob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WeChatSimulatorCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('exports')) {
          db.createObjectStore('exports', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['exports'], 'readwrite');
        const store = transaction.objectStore('exports');
        
        store.put({
          id: itemId,
          blob: blob,
          timestamp: Date.now()
        });
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  }, []);

  const removeFromIndexedDB = useCallback(async (itemId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WeChatSimulatorCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['exports'], 'readwrite');
        const store = transaction.objectStore('exports');
        
        store.delete(itemId);
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  }, []);

  const clearIndexedDB = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WeChatSimulatorCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['exports'], 'readwrite');
        const store = transaction.objectStore('exports');
        
        store.clear();
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  }, []);

  // 计算统计信息
  const stats = useMemo((): ExportStats => {
    const successfulExports = history.filter(item => item.success);
    const failedExports = history.filter(item => !item.success);
    
    const totalFileSize = successfulExports.reduce((sum, item) => sum + item.fileSize, 0);
    const totalDuration = successfulExports.reduce((sum, item) => sum + item.duration, 0);
    
    // 统计最常用的格式和质量
    const formatCounts = successfulExports.reduce((counts, item) => {
      counts[item.config.format] = (counts[item.config.format] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const qualityCounts = successfulExports.reduce((counts, item) => {
      counts[item.config.quality] = (counts[item.config.quality] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const mostUsedFormat = Object.entries(formatCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'gif';
    
    const mostUsedQuality = Object.entries(qualityCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'medium';

    return {
      totalExports: history.length,
      successfulExports: successfulExports.length,
      failedExports: failedExports.length,
      totalFileSize,
      totalDuration,
      averageFileSize: successfulExports.length > 0 ? totalFileSize / successfulExports.length : 0,
      averageDuration: successfulExports.length > 0 ? totalDuration / successfulExports.length : 0,
      mostUsedFormat,
      mostUsedQuality
    };
  }, [history]);

  // 获取推荐配置（基于历史使用情况）
  const getRecommendedConfig = useCallback((): Partial<ExportConfig> => {
    if (history.length === 0) {
      return {
        format: 'gif',
        quality: 'medium',
        resolution: { width: 375, height: 667 },
        framerate: 20
      };
    }

    return {
      format: stats.mostUsedFormat as any,
      quality: stats.mostUsedQuality as any
    };
  }, [history.length, stats]);

  // 搜索和过滤功能
  const searchHistory = useCallback((query: string): ExportHistoryItem[] => {
    if (!query.trim()) return history;
    
    const lowerQuery = query.toLowerCase();
    return history.filter(item => 
      item.filename.toLowerCase().includes(lowerQuery) ||
      item.config.format.toLowerCase().includes(lowerQuery) ||
      item.config.quality.toLowerCase().includes(lowerQuery) ||
      (item.error && item.error.toLowerCase().includes(lowerQuery))
    );
  }, [history]);

  const filterHistory = useCallback((filters: {
    format?: string;
    quality?: string;
    success?: boolean;
    dateRange?: { start: number; end: number };
  }): ExportHistoryItem[] => {
    return history.filter(item => {
      if (filters.format && item.config.format !== filters.format) return false;
      if (filters.quality && item.config.quality !== filters.quality) return false;
      if (filters.success !== undefined && item.success !== filters.success) return false;
      if (filters.dateRange) {
        if (item.exportedAt < filters.dateRange.start || item.exportedAt > filters.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }, [history]);

  return {
    // 数据
    history,
    presets,
    stats,
    isLoading,
    
    // 历史记录管理
    addExportRecord,
    deleteExportRecord,
    clearHistory,
    reExport,
    getCachedFile,
    
    // 预设管理
    savePreset,
    deletePreset,
    usePreset,
    exportPresets,
    importPresets,
    
    // 搜索和过滤
    searchHistory,
    filterHistory,
    
    // 推荐和统计
    getRecommendedConfig,
    
    // 缓存管理
    cleanupExpiredCache
  };
};

export default useExportHistory;