/**
 * TouchControls.jsx
 * 
 * Mobile-optimized touch controls for 3D visualization.
 * Provides pinch-to-zoom, two-finger rotation, swipe gestures,
 * and tap selection for LENR simulation interactions.
 * 
 * v0.2.2-beta: Initial implementation for mobile optimization
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Fade, Chip } from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  TouchApp as TouchIcon,
  Gesture as GestureIcon,
} from '@mui/icons-material';

/**
 * Touch state enum
 */
const TouchState = {
  IDLE: 'idle',
  SINGLE_TAP: 'single_tap',
  DOUBLE_TAP: 'double_tap',
  PINCH: 'pinch',
  ROTATE: 'rotate',
  PAN: 'pan',
  SWIPE: 'swipe',
};

/**
 * Detect device type
 */
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Calculate distance between two touch points
 */
function getTouchDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two touch points (radians)
 */
function getTouchAngle(touch1, touch2) {
  return Math.atan2(
    touch2.clientY - touch1.clientY,
    touch2.clientX - touch1.clientX
  );
}

/**
 * Calculate center point between two touches
 */
function getTouchCenter(touch1, touch2) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

/**
 * TouchControls component
 * 
 * @param {Object} props
 * @param {React.RefObject} props.containerRef - Ref to the container element
 * @param {Function} props.onZoom - Callback for zoom changes (delta)
 * @param {Function} props.onRotate - Callback for rotation (deltaX, deltaY)
 * @param {Function} props.onPan - Callback for panning (deltaX, deltaY)
 * @param {Function} props.onTap - Callback for tap selection (x, y)
 * @param {Function} props.onDoubleTap - Callback for double-tap (x, y)
 * @param {Function} props.onReset - Callback to reset view
 * @param {boolean} props.showHints - Show touch gesture hints
 * @param {boolean} props.showControls - Show floating control buttons
 * @param {number} props.zoomSensitivity - Zoom sensitivity multiplier
 * @param {number} props.rotateSensitivity - Rotation sensitivity multiplier
 */
function TouchControls({
  containerRef,
  onZoom,
  onRotate,
  onPan,
  onTap,
  onDoubleTap,
  onReset,
  showHints = true,
  showControls = true,
  zoomSensitivity = 1.0,
  rotateSensitivity = 1.0,
  enabled = true,
}) {
  // Touch state tracking
  const touchStateRef = useRef(TouchState.IDLE);
  const lastTouchRef = useRef(null);
  const initialPinchDistanceRef = useRef(0);
  const initialPinchAngleRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const touchMovedRef = useRef(false);
  
  // UI state
  const [currentGesture, setCurrentGesture] = useState(null);
  const [showGestureHint, setShowGestureHint] = useState(false);
  const [isTouchEnabled] = useState(isTouchDevice());
  
  // Double-tap detection constants
  const DOUBLE_TAP_DELAY = 300; // ms
  const TAP_MOVE_THRESHOLD = 10; // pixels
  const _SWIPE_THRESHOLD = 50; // pixels
  const SWIPE_VELOCITY_THRESHOLD = 0.5; // pixels/ms

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    
    const touches = e.touches;
    touchStartTimeRef.current = Date.now();
    touchMovedRef.current = false;
    
    if (touches.length === 1) {
      // Single touch - potential tap or pan
      touchStateRef.current = TouchState.SINGLE_TAP;
      lastTouchRef.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
        time: Date.now(),
      };
      setCurrentGesture('tap');
      
    } else if (touches.length === 2) {
      // Two touches - pinch/zoom or rotate
      const distance = getTouchDistance(touches[0], touches[1]);
      const angle = getTouchAngle(touches[0], touches[1]);
      
      initialPinchDistanceRef.current = distance;
      initialPinchAngleRef.current = angle;
      lastTouchRef.current = {
        distance,
        angle,
        center: getTouchCenter(touches[0], touches[1]),
      };
      
      touchStateRef.current = TouchState.PINCH;
      setCurrentGesture('pinch');
    }
    
    setShowGestureHint(true);
  }, [enabled]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((e) => {
    if (!enabled || !lastTouchRef.current) return;
    
    const touches = e.touches;
    
    if (touches.length === 1 && lastTouchRef.current.x !== undefined) {
      // Single touch movement - pan or swipe detection
      const deltaX = touches[0].clientX - lastTouchRef.current.x;
      const deltaY = touches[0].clientY - lastTouchRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > TAP_MOVE_THRESHOLD) {
        touchMovedRef.current = true;
        touchStateRef.current = TouchState.PAN;
        setCurrentGesture('pan');
        
        // Call pan callback
        if (onPan) {
          onPan(deltaX * rotateSensitivity, deltaY * rotateSensitivity);
        }
        
        // Call rotate callback (for 3D rotation)
        if (onRotate) {
          onRotate(deltaX * 0.01 * rotateSensitivity, deltaY * 0.01 * rotateSensitivity);
        }
      }
      
      lastTouchRef.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
        time: Date.now(),
      };
      
    } else if (touches.length === 2) {
      // Two-finger gesture
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentAngle = getTouchAngle(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches[0], touches[1]);
      
      // Calculate deltas
      const distanceDelta = currentDistance - lastTouchRef.current.distance;
      const angleDelta = currentAngle - lastTouchRef.current.angle;
      
      // Determine gesture type based on which delta is larger
      const zoomFactor = Math.abs(distanceDelta);
      const rotateFactor = Math.abs(angleDelta) * 100;
      
      if (zoomFactor > rotateFactor) {
        // Pinch to zoom
        touchStateRef.current = TouchState.PINCH;
        setCurrentGesture('zoom');
        
        if (onZoom) {
          const zoomDelta = distanceDelta * 0.01 * zoomSensitivity;
          onZoom(zoomDelta);
        }
      } else {
        // Two-finger rotate
        touchStateRef.current = TouchState.ROTATE;
        setCurrentGesture('rotate');
        
        if (onRotate) {
          onRotate(angleDelta * rotateSensitivity, 0);
        }
      }
      
      // Update last touch state
      lastTouchRef.current = {
        distance: currentDistance,
        angle: currentAngle,
        center: currentCenter,
      };
    }
    
    // Prevent default to stop scrolling
    e.preventDefault();
  }, [enabled, onPan, onRotate, onZoom, zoomSensitivity, rotateSensitivity]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((e) => {
    if (!enabled) return;
    
    const now = Date.now();
    const touchDuration = now - touchStartTimeRef.current;
    
    // Check for tap (short duration, no movement)
    if (touchStateRef.current === TouchState.SINGLE_TAP && !touchMovedRef.current && touchDuration < 300) {
      const touch = lastTouchRef.current;
      
      // Check for double tap
      if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
        if (onDoubleTap && touch) {
          onDoubleTap(touch.x, touch.y);
        }
        lastTapTimeRef.current = 0;
      } else {
        // Single tap
        if (onTap && touch) {
          onTap(touch.x, touch.y);
        }
        lastTapTimeRef.current = now;
      }
    }
    
    // Check for swipe
    if (touchStateRef.current === TouchState.PAN && lastTouchRef.current) {
      const velocity = touchMovedRef.current ? 
        Math.sqrt(
          Math.pow(lastTouchRef.current.x - (lastTouchRef.current.prevX || lastTouchRef.current.x), 2) +
          Math.pow(lastTouchRef.current.y - (lastTouchRef.current.prevY || lastTouchRef.current.y), 2)
        ) / Math.max(1, now - lastTouchRef.current.time) : 0;
      
      if (velocity > SWIPE_VELOCITY_THRESHOLD) {
        touchStateRef.current = TouchState.SWIPE;
        setCurrentGesture('swipe');
      }
    }
    
    // Reset state
    touchStateRef.current = TouchState.IDLE;
    setCurrentGesture(null);
    setShowGestureHint(false);
    
    // Clear refs if no more touches
    if (e.touches.length === 0) {
      lastTouchRef.current = null;
    }
  }, [enabled, onTap, onDoubleTap]);

  /**
   * Attach/detach touch event listeners
   */
  useEffect(() => {
    const container = containerRef?.current;
    if (!container || !isTouchEnabled) return;
    
    // Options for passive: false to allow preventDefault
    const options = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, options);
    container.addEventListener('touchcancel', handleTouchEnd, options);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, isTouchEnabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  /**
   * Handle button controls
   */
  const handleZoomIn = useCallback(() => {
    if (onZoom) onZoom(0.1);
  }, [onZoom]);

  const handleZoomOut = useCallback(() => {
    if (onZoom) onZoom(-0.1);
  }, [onZoom]);

  const handleResetView = useCallback(() => {
    if (onReset) onReset();
  }, [onReset]);

  // Don't render on non-touch devices unless controls are requested
  if (!isTouchEnabled && !showControls) {
    return null;
  }

  return (
    <>
      {/* Gesture hint overlay */}
      {showHints && isTouchEnabled && (
        <Fade in={showGestureHint && currentGesture !== null}>
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <Chip
              icon={<GestureIcon />}
              label={
                currentGesture === 'tap' ? 'Tap to select' :
                currentGesture === 'pan' ? 'Panning' :
                currentGesture === 'zoom' ? 'Pinch to zoom' :
                currentGesture === 'rotate' ? 'Rotating' :
                currentGesture === 'swipe' ? 'Swiping' : 'Touch'
              }
              color="primary"
              size="small"
              sx={{
                backgroundColor: 'rgba(25, 118, 210, 0.9)',
                color: 'white',
              }}
            />
          </Box>
        </Fade>
      )}

      {/* Floating control buttons */}
      {showControls && (
        <Box
          sx={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            zIndex: 1000,
          }}
        >
          <IconButton
            size="small"
            onClick={handleZoomIn}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              boxShadow: 1,
            }}
            aria-label="Zoom in"
          >
            <ZoomInIcon fontSize="small" />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={handleZoomOut}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              boxShadow: 1,
            }}
            aria-label="Zoom out"
          >
            <ZoomOutIcon fontSize="small" />
          </IconButton>
          
          <IconButton
            size="small"
            onClick={handleResetView}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              boxShadow: 1,
            }}
            aria-label="Reset view"
          >
            <CenterIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Touch instructions for first-time mobile users */}
      {showHints && isTouchEnabled && (
        <Box
          sx={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            zIndex: 999,
            opacity: 0.7,
            '&:hover': { opacity: 1 },
          }}
        >
          <TouchIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Touch enabled
          </Typography>
        </Box>
      )}
    </>
  );
}

/**
 * Hook for touch gesture state
 * Can be used independently of TouchControls component
 */
export function useTouchGestures(containerRef, options = {}) {
  const {
    enabled = true,
    onZoom,
    onRotate,
    onPan,
    onTap,
    onDoubleTap,
  } = options;
  
  const [gesture, setGesture] = useState(null);
  const [isTouching, setIsTouching] = useState(false);
  
  // ... implementation similar to above
  // Simplified hook version for custom usage
  
  useEffect(() => {
    const container = containerRef?.current;
    if (!container || !enabled || !isTouchDevice()) return;
    
    let lastTouch = null;
    let lastTapTime = 0;
    
    const handleStart = (e) => {
      setIsTouching(true);
      lastTouch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };
    
    const handleMove = (e) => {
      if (!lastTouch) return;
      
      const dx = e.touches[0].clientX - lastTouch.x;
      const dy = e.touches[0].clientY - lastTouch.y;
      
      if (e.touches.length === 1) {
        setGesture('pan');
        if (onPan) onPan(dx, dy);
        if (onRotate) onRotate(dx * 0.01, dy * 0.01);
      }
      
      lastTouch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      
      e.preventDefault();
    };
    
    const handleEnd = (_e) => {
      setIsTouching(false);
      setGesture(null);
      
      const now = Date.now();
      if (lastTouch && now - lastTouch.time < 300) {
        if (now - lastTapTime < 300) {
          if (onDoubleTap) onDoubleTap(lastTouch.x, lastTouch.y);
          lastTapTime = 0;
        } else {
          if (onTap) onTap(lastTouch.x, lastTouch.y);
          lastTapTime = now;
        }
      }
      
      lastTouch = null;
    };
    
    const opts = { passive: false };
    container.addEventListener('touchstart', handleStart, opts);
    container.addEventListener('touchmove', handleMove, opts);
    container.addEventListener('touchend', handleEnd, opts);
    
    return () => {
      container.removeEventListener('touchstart', handleStart);
      container.removeEventListener('touchmove', handleMove);
      container.removeEventListener('touchend', handleEnd);
    };
  }, [containerRef, enabled, onZoom, onRotate, onPan, onTap, onDoubleTap]);
  
  return { gesture, isTouching, isTouchDevice: isTouchDevice() };
}

/**
 * Utility: Check if device is mobile
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Utility: Get device pixel ratio for quality scaling
 */
export function getDevicePixelRatio() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * Utility: Get recommended quality settings for device
 */
export function getRecommendedQualitySettings() {
  const isMobile = isMobileDevice();
  const pixelRatio = getDevicePixelRatio();
  
  return {
    particleCount: isMobile ? 15 : 30,
    shadowsEnabled: !isMobile,
    antialias: !isMobile,
    pixelRatio: isMobile ? Math.min(pixelRatio, 1.5) : pixelRatio,
    maxFPS: isMobile ? 30 : 60,
    useSimplifiedShaders: isMobile,
    vortexVisualizationEnabled: !isMobile,
  };
}

export default TouchControls;
