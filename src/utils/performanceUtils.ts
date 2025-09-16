/**
 * 性能优化工具集
 * 提供防抖、节流、帧率控制等性能优化功能
 */

// 防抖函数类型定义
type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

// 节流函数类型定义
type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

/**
 * 防抖函数 - 延迟执行，在指定时间内多次调用只执行最后一次
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @param immediate 是否立即执行第一次调用
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  immediate = false
): DebouncedFunction<T> {
  let timeoutId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      if (!immediate && lastArgs) {
        func.apply(lastThis, lastArgs);
      }
    }, delay);

    if (callNow) {
      func.apply(this, args);
    }
  } as DebouncedFunction<T>;

  // 取消防抖
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  // 立即执行
  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      func.apply(lastThis, lastArgs);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return debounced;
}

/**
 * 节流函数 - 限制执行频率，在指定时间内最多执行一次
 * @param func 要节流的函数
 * @param delay 节流间隔（毫秒）
 * @param options 配置选项
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;  // 是否在开始时执行
    trailing?: boolean; // 是否在结束时执行
  } = {}
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;
  
  let timeoutId: number | null = null;
  let lastExecTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    lastArgs = args;
    lastThis = this;

    // 如果是第一次调用且不需要立即执行
    if (!lastExecTime && !leading) {
      lastExecTime = now;
      return;
    }

    const remaining = delay - (now - lastExecTime);

    if (remaining <= 0 || remaining > delay) {
      // 可以执行
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      lastExecTime = now;
      func.apply(this, args);
      lastArgs = null;
      lastThis = null;
    } else if (!timeoutId && trailing) {
      // 设置延迟执行
      timeoutId = window.setTimeout(() => {
        lastExecTime = leading ? Date.now() : 0;
        timeoutId = null;
        if (lastArgs) {
          func.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, remaining);
    }
  } as ThrottledFunction<T>;

  // 取消节流
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastExecTime = 0;
    lastArgs = null;
    lastThis = null;
  };

  // 立即执行
  throttled.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      lastExecTime = Date.now();
      func.apply(lastThis, lastArgs);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return throttled;
}

/**
 * 基于 requestAnimationFrame 的节流函数
 * 确保函数在每个动画帧最多执行一次
 * @param func 要节流的函数
 * @returns 节流后的函数
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): DebouncedFunction<T> {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func.apply(lastThis, lastArgs);
        }
        rafId = null;
        lastArgs = null;
        lastThis = null;
      });
    }
  } as DebouncedFunction<T>;

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  throttled.flush = () => {
    if (rafId !== null && lastArgs) {
      cancelAnimationFrame(rafId);
      func.apply(lastThis, lastArgs);
      rafId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  return throttled;
}

/**
 * 帧率自适应控制器
 * 根据当前帧率动态调整渲染质量和频率
 */
export class FrameRateController {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private targetFps = 60;
  private qualityLevel = 1; // 0.5 - 1.0
  private callbacks: Array<(fps: number, quality: number) => void> = [];

  constructor(targetFps = 60) {
    this.targetFps = targetFps;
    this.startMonitoring();
  }

  /**
   * 开始监控帧率
   */
  private startMonitoring() {
    const monitor = () => {
      const now = performance.now();
      this.frameCount++;

      if (now - this.lastTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastTime = now;

        // 根据帧率调整质量
        this.adjustQuality();
        
        // 通知回调
        this.callbacks.forEach(callback => {
          callback(this.fps, this.qualityLevel);
        });
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }

  /**
   * 根据当前帧率调整渲染质量
   */
  private adjustQuality() {
    const fpsRatio = this.fps / this.targetFps;

    if (fpsRatio < 0.8) {
      // 帧率过低，降低质量
      this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
    } else if (fpsRatio > 0.95) {
      // 帧率良好，可以提高质量
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
    }
  }

  /**
   * 获取当前帧率
   */
  getCurrentFPS(): number {
    return this.fps;
  }

  /**
   * 获取当前质量等级
   */
  getQualityLevel(): number {
    return this.qualityLevel;
  }

  /**
   * 添加帧率变化回调
   */
  onFrameRateChange(callback: (fps: number, quality: number) => void) {
    this.callbacks.push(callback);
  }

  /**
   * 移除帧率变化回调
   */
  removeFrameRateCallback(callback: (fps: number, quality: number) => void) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 根据当前质量等级决定是否应该跳过渲染
   */
  shouldSkipFrame(): boolean {
    return Math.random() > this.qualityLevel;
  }
}

/**
 * 内存使用监控器
 */
export class MemoryMonitor {
  private callbacks: Array<(usage: MemoryInfo) => void> = [];
  private monitoringInterval: number | null = null;

  /**
   * 开始监控内存使用
   * @param interval 监控间隔（毫秒）
   */
  startMonitoring(interval = 5000) {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = window.setInterval(() => {
      const memoryInfo = this.getMemoryInfo();
      if (memoryInfo) {
        this.callbacks.forEach(callback => callback(memoryInfo));
      }
    }, interval);
  }

  /**
   * 停止监控内存使用
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 获取内存使用信息
   */
  getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  /**
   * 添加内存使用变化回调
   */
  onMemoryChange(callback: (usage: MemoryInfo) => void) {
    this.callbacks.push(callback);
  }

  /**
   * 移除内存使用变化回调
   */
  removeMemoryCallback(callback: (usage: MemoryInfo) => void) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 检查是否需要进行垃圾回收
   */
  shouldTriggerGC(): boolean {
    const memoryInfo = this.getMemoryInfo();
    if (!memoryInfo) return false;

    // 如果已使用内存超过总内存的 80%，建议进行垃圾回收
    return memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize > 0.8;
  }
}

/**
 * 批量处理器 - 将多个操作批量执行以提高性能
 */
export class BatchProcessor<T> {
  private queue: T[] = [];
  private processor: (items: T[]) => void;
  private batchSize: number;
  private delay: number;
  private timeoutId: number | null = null;

  constructor(
    processor: (items: T[]) => void,
    batchSize = 10,
    delay = 16 // 约60fps
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delay = delay;
  }

  /**
   * 添加项目到批处理队列
   */
  add(item: T) {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timeoutId) {
      this.timeoutId = window.setTimeout(() => {
        this.flush();
      }, this.delay);
    }
  }

  /**
   * 立即处理队列中的所有项目
   */
  flush() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.queue.length > 0) {
      const items = this.queue.splice(0);
      this.processor(items);
    }
  }

  /**
   * 清空队列
   */
  clear() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.queue.length = 0;
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

/**
 * 预览生成节流控制器
 * 专门用于控制预览生成的频率，避免过度计算
 */
export class PreviewThrottleController {
  private throttledGenerate: ThrottledFunction<(time: number) => void>;
  private debouncedGenerate: DebouncedFunction<(time: number) => void>;
  private rafThrottledGenerate: DebouncedFunction<(time: number) => void>;

  constructor(
    generatePreview: (time: number) => void,
    options: {
      throttleDelay?: number;
      debounceDelay?: number;
      useRAF?: boolean;
    } = {}
  ) {
    const { throttleDelay = 100, debounceDelay = 300, useRAF = true } = options;

    // 节流版本 - 用于拖拽过程中的实时预览
    this.throttledGenerate = throttle(generatePreview, throttleDelay, {
      leading: true,
      trailing: true
    });

    // 防抖版本 - 用于拖拽结束后的最终预览
    this.debouncedGenerate = debounce(generatePreview, debounceDelay);

    // RAF节流版本 - 用于动画过程中的预览
    this.rafThrottledGenerate = useRAF 
      ? rafThrottle(generatePreview)
      : this.throttledGenerate;
  }

  /**
   * 拖拽过程中的预览生成（节流）
   */
  generateDuringDrag(time: number) {
    this.throttledGenerate(time);
  }

  /**
   * 拖拽结束后的预览生成（防抖）
   */
  generateAfterDrag(time: number) {
    this.debouncedGenerate(time);
  }

  /**
   * 动画过程中的预览生成（RAF节流）
   */
  generateDuringAnimation(time: number) {
    this.rafThrottledGenerate(time);
  }

  /**
   * 取消所有待执行的预览生成
   */
  cancelAll() {
    this.throttledGenerate.cancel();
    this.debouncedGenerate.cancel();
    this.rafThrottledGenerate.cancel();
  }

  /**
   * 立即执行所有待执行的预览生成
   */
  flushAll() {
    this.throttledGenerate.flush();
    this.debouncedGenerate.flush();
    this.rafThrottledGenerate.flush();
  }
}

// 导出类型定义
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// 导出常用的预设配置
export const PERFORMANCE_PRESETS = {
  // 拖拽操作防抖配置
  DRAG_DEBOUNCE: {
    delay: 16, // 约60fps
    immediate: false
  },
  
  // 预览生成节流配置
  PREVIEW_THROTTLE: {
    delay: 100,
    leading: true,
    trailing: true
  },
  
  // 搜索输入防抖配置
  SEARCH_DEBOUNCE: {
    delay: 300,
    immediate: false
  },
  
  // 窗口大小调整防抖配置
  RESIZE_DEBOUNCE: {
    delay: 250,
    immediate: false
  }
} as const;