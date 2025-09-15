import { useCallback, useRef, useEffect } from 'react';

// 滚动配置接口
export interface ScrollConfig {
  // 滚动行为
  behavior: 'auto' | 'smooth';
  // 滚动位置
  block: 'start' | 'center' | 'end' | 'nearest';
  // 滚动速度（毫秒）
  duration: number;
  // 滚动缓动函数
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// 滚动状态接口
export interface ScrollState {
  // 当前滚动位置
  scrollTop: number;
  // 滚动容器高度
  containerHeight: number;
  // 内容总高度
  contentHeight: number;
  // 是否正在滚动
  isScrolling: boolean;
  // 是否可以向上滚动
  canScrollUp: boolean;
  // 是否可以向下滚动
  canScrollDown: boolean;
}

// 滚动控制接口
export interface ScrollControls {
  // 滚动到指定位置
  scrollTo: (position: number, config?: Partial<ScrollConfig>) => void;
  // 滚动到指定元素
  scrollToElement: (element: HTMLElement, config?: Partial<ScrollConfig>) => void;
  // 滚动到顶部
  scrollToTop: (config?: Partial<ScrollConfig>) => void;
  // 滚动到底部
  scrollToBottom: (config?: Partial<ScrollConfig>) => void;
  // 平滑滚动到指定位置
  smoothScrollTo: (position: number, duration?: number) => Promise<void>;
  // 停止滚动动画
  stopScrolling: () => void;
  // 获取当前滚动状态
  getScrollState: () => ScrollState;
}

// Hook 参数接口
interface UseAutoScrollProps {
  // 滚动容器引用
  containerRef: React.RefObject<HTMLElement>;
  // 是否启用自动滚动
  enabled?: boolean;
  // 默认滚动配置
  defaultConfig?: Partial<ScrollConfig>;
  // 滚动状态变化回调
  onScrollStateChange?: (state: ScrollState) => void;
  // 滚动开始回调
  onScrollStart?: () => void;
  // 滚动结束回调
  onScrollEnd?: () => void;
}

/**
 * 智能滚动控制 Hook
 * 提供平滑的自动滚动动画、滚动位置的精确计算和控制、滚动状态与播放状态的同步
 */
export function useAutoScroll({
  containerRef,
  enabled = true,
  defaultConfig = {},
  onScrollStateChange,
  onScrollStart,
  onScrollEnd
}: UseAutoScrollProps): ScrollControls {
  const animationFrameRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  // 默认滚动配置
  const config: ScrollConfig = {
    behavior: 'smooth',
    block: 'end',
    duration: 300,
    easing: 'ease-out',
    ...defaultConfig
  };

  // 获取当前滚动状态
  const getScrollState = useCallback((): ScrollState => {
    const container = containerRef.current;
    if (!container) {
      return {
        scrollTop: 0,
        containerHeight: 0,
        contentHeight: 0,
        isScrolling: false,
        canScrollUp: false,
        canScrollDown: false
      };
    }

    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const contentHeight = container.scrollHeight;

    return {
      scrollTop,
      containerHeight,
      contentHeight,
      isScrolling: isScrollingRef.current,
      canScrollUp: scrollTop > 0,
      canScrollDown: scrollTop < contentHeight - containerHeight
    };
  }, [containerRef]);

  // 缓动函数
  const getEasingFunction = useCallback((easing: string) => {
    switch (easing) {
      case 'linear':
        return (t: number) => t;
      case 'ease':
        return (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'ease-in':
        return (t: number) => t * t;
      case 'ease-out':
        return (t: number) => t * (2 - t);
      case 'ease-in-out':
        return (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return (t: number) => t;
    }
  }, []);

  // 停止滚动动画
  const stopScrolling = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    if (isScrollingRef.current) {
      isScrollingRef.current = false;
      onScrollEnd?.();
    }
  }, [onScrollEnd]);

  // 平滑滚动到指定位置
  const smoothScrollTo = useCallback((
    targetPosition: number, 
    duration: number = config.duration
  ): Promise<void> => {
    return new Promise((resolve) => {
      const container = containerRef.current;
      if (!container || !enabled) {
        resolve();
        return;
      }

      const startPosition = container.scrollTop;
      const distance = targetPosition - startPosition;
      
      if (Math.abs(distance) < 1) {
        resolve();
        return;
      }

      const startTime = performance.now();
      const easingFunction = getEasingFunction(config.easing);
      
      // 开始滚动
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        onScrollStart?.();
      }

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easingFunction(progress);
        
        const currentPosition = startPosition + distance * easedProgress;
        container.scrollTop = currentPosition;

        // 更新滚动状态
        const scrollState = getScrollState();
        onScrollStateChange?.(scrollState);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animateScroll);
        } else {
          // 滚动完成
          stopScrolling();
          resolve();
        }
      };

      animationFrameRef.current = requestAnimationFrame(animateScroll);
    });
  }, [containerRef, enabled, config, getEasingFunction, getScrollState, onScrollStateChange, onScrollStart, stopScrolling]);

  // 滚动到指定位置
  const scrollTo = useCallback((
    position: number, 
    scrollConfig?: Partial<ScrollConfig>
  ) => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const finalConfig = { ...config, ...scrollConfig };
    
    if (finalConfig.behavior === 'smooth') {
      smoothScrollTo(position, finalConfig.duration);
    } else {
      container.scrollTop = position;
      const scrollState = getScrollState();
      onScrollStateChange?.(scrollState);
    }
  }, [containerRef, enabled, config, smoothScrollTo, getScrollState, onScrollStateChange]);

  // 滚动到指定元素
  const scrollToElement = useCallback((
    element: HTMLElement, 
    scrollConfig?: Partial<ScrollConfig>
  ) => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const finalConfig = { ...config, ...scrollConfig };
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    let targetPosition = container.scrollTop;
    
    switch (finalConfig.block) {
      case 'start':
        targetPosition = container.scrollTop + elementRect.top - containerRect.top;
        break;
      case 'center':
        targetPosition = container.scrollTop + elementRect.top - containerRect.top - 
                        (containerRect.height - elementRect.height) / 2;
        break;
      case 'end':
        targetPosition = container.scrollTop + elementRect.bottom - containerRect.bottom;
        break;
      case 'nearest':
        // 计算最近的滚动位置
        const elementTop = container.scrollTop + elementRect.top - containerRect.top;
        const elementBottom = container.scrollTop + elementRect.bottom - containerRect.bottom;
        
        if (elementRect.top < containerRect.top) {
          targetPosition = elementTop;
        } else if (elementRect.bottom > containerRect.bottom) {
          targetPosition = elementBottom;
        }
        break;
    }
    
    // 确保目标位置在有效范围内
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    targetPosition = Math.max(0, Math.min(targetPosition, maxScrollTop));
    
    scrollTo(targetPosition, scrollConfig);
  }, [containerRef, enabled, config, scrollTo]);

  // 滚动到顶部
  const scrollToTop = useCallback((scrollConfig?: Partial<ScrollConfig>) => {
    scrollTo(0, scrollConfig);
  }, [scrollTo]);

  // 滚动到底部
  const scrollToBottom = useCallback((scrollConfig?: Partial<ScrollConfig>) => {
    const container = containerRef.current;
    if (!container) return;
    
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    scrollTo(maxScrollTop, scrollConfig);
  }, [containerRef, scrollTo]);

  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      
      // 检测滚动方向和状态变化
      if (Math.abs(currentScrollTop - lastScrollTopRef.current) > 1) {
        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          onScrollStart?.();
        }
        
        lastScrollTopRef.current = currentScrollTop;
        
        // 更新滚动状态
        const scrollState = getScrollState();
        onScrollStateChange?.(scrollState);
        
        // 设置滚动结束检测
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (isScrollingRef.current) {
            isScrollingRef.current = false;
            onScrollEnd?.();
          }
        }, 150);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      stopScrolling();
    };
  }, [containerRef, getScrollState, onScrollStateChange, onScrollStart, onScrollEnd, stopScrolling]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopScrolling();
    };
  }, [stopScrolling]);

  return {
    scrollTo,
    scrollToElement,
    scrollToTop,
    scrollToBottom,
    smoothScrollTo,
    stopScrolling,
    getScrollState
  };
}