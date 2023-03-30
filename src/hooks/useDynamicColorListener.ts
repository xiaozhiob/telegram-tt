import {
  useCallback, useEffect, useRef, useState,
} from '../lib/teact/teact';
import { hexToRgb } from '../util/switchTheme';
import { getPropertyHexColor } from '../util/themeStyle';
import useResizeObserver from './useResizeObserver';
import useSyncEffect from './useSyncEffect';

// Transition required to detect `color` property change.
// Duration parameter describes a delay between color change and color state update.
// Small values may cause large amount of re-renders.
const TRANSITION_PROPERTY = 'color';
const TRANSITION_STYLE = `60ms ${TRANSITION_PROPERTY} linear`;

export default function useDynamicColorListener(ref?: React.RefObject<HTMLElement>, isDisabled?: boolean) {
  const [hexColor, setHexColor] = useState<string | undefined>();
  const rgbColorRef = useRef<[number, number, number] | undefined>();

  const updateColor = useCallback(() => {
    if (!ref?.current || isDisabled) {
      setHexColor(undefined);
      return;
    }

    const currentHexColor = getPropertyHexColor(getComputedStyle(ref.current), TRANSITION_PROPERTY);
    setHexColor(currentHexColor);
  }, [isDisabled, ref]);

  // Element does not receive `transitionend` event if parent has `display: none`.
  // We will receive `resize` event when parent is shown again.
  useResizeObserver(!isDisabled ? ref : undefined, updateColor);

  // Update RGB color only when hex color changes
  useSyncEffect(() => {
    if (!hexColor) {
      rgbColorRef.current = undefined;
      return;
    }

    const { r, g, b } = hexToRgb(hexColor);
    rgbColorRef.current = [r, g, b];
  }, [hexColor]);

  useEffect(() => {
    if (!ref?.current) {
      return undefined;
    }

    updateColor();

    if (isDisabled) {
      return undefined;
    }

    function handleTransitionEnd(e: TransitionEvent) {
      if (e.propertyName !== TRANSITION_PROPERTY) return;
      updateColor();
    }

    const el = ref.current;
    el.addEventListener('transitionend', handleTransitionEnd);
    el.style.setProperty('transition', TRANSITION_STYLE, 'important');
    return () => {
      el.removeEventListener('transitionend', handleTransitionEnd);
      el.style.removeProperty('transition');
    };
  }, [isDisabled, ref, updateColor]);

  return {
    hexColor,
    rgbColor: rgbColorRef.current,
  };
}
