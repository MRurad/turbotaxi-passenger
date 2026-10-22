import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

// Drawing data, like an icon path: a car seen from above in a 40 × 80 box, nose up.
const VIEW_BOX = '0 0 40 80';
const BODY = 'M12 3 H28 Q34.5 3 35 10 L35.5 68 Q35 77 28 77 H12 Q5 77 4.5 68 L5 10 Q5.5 3 12 3 Z';
const WINDSHIELD = 'M10 24 Q20 19 30 24 L28.5 33 Q20 30.5 11.5 33 Z';
const REAR_WINDOW = 'M11.5 58 Q20 60.5 28.5 58 L30 64.5 Q20 67.5 10 64.5 Z';
const WHEELS = [
  { x: 2.5, y: 13 },
  { x: 32.5, y: 13 },
  { x: 2.5, y: 54 },
  { x: 32.5, y: 54 },
] as const;
const WHEEL = { width: 5, height: 13, radius: 2 };
const SIDE_WINDOWS = [
  { x: 7.6, y: 34 },
  { x: 30.2, y: 34 },
] as const;
const SIDE_WINDOW = { width: 2.2, height: 21, radius: 1 };
const MIRRORS = [{ cx: 4 }, { cx: 36 }] as const;
const MIRROR = { cy: 27, rx: 2.6, ry: 1.6 };
const HEADLIGHTS = [{ x: 9.5 }, { x: 24.5 }] as const;
const TAILLIGHTS = [{ x: 9 }, { x: 25 }] as const;
const LIGHT = { width: 6, height: 2.4, radius: 1.2, frontY: 4.6, rearY: 73.4 };
const ROOF = { x: 11.5, y: 34.5, width: 17, height: 21.5, radius: 3.5, sheen: 0.18 };
const OUTLINE_WIDTH = 2;
const MIRROR_OUTLINE_WIDTH = 1;

export interface TopDownCarProps {
  width: number;
  height: number;
}

/** A car seen from above (nose = top), in the map-car theme colors. Decorative. */
export function TopDownCar({ width, height }: TopDownCarProps) {
  const { colors } = useTheme();

  return (
    <Svg width={width} height={height} viewBox={VIEW_BOX} accessible={false}>
      {WHEELS.map(({ x, y }) => (
        <Rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={WHEEL.width}
          height={WHEEL.height}
          rx={WHEEL.radius}
          fill={colors.mapCarWheel}
        />
      ))}
      {MIRRORS.map(({ cx }) => (
        <Ellipse
          key={cx}
          cx={cx}
          cy={MIRROR.cy}
          rx={MIRROR.rx}
          ry={MIRROR.ry}
          fill={colors.mapCar}
          stroke={colors.mapCarOutline}
          strokeWidth={MIRROR_OUTLINE_WIDTH}
        />
      ))}
      <Path
        d={BODY}
        fill={colors.mapCar}
        stroke={colors.mapCarOutline}
        strokeWidth={OUTLINE_WIDTH}
      />
      <Path d={WINDSHIELD} fill={colors.mapCarGlass} />
      <Rect
        x={ROOF.x}
        y={ROOF.y}
        width={ROOF.width}
        height={ROOF.height}
        rx={ROOF.radius}
        fill={colors.mapCarGlass}
        fillOpacity={ROOF.sheen}
      />
      {SIDE_WINDOWS.map(({ x, y }) => (
        <Rect
          key={x}
          x={x}
          y={y}
          width={SIDE_WINDOW.width}
          height={SIDE_WINDOW.height}
          rx={SIDE_WINDOW.radius}
          fill={colors.mapCarGlass}
        />
      ))}
      <Path d={REAR_WINDOW} fill={colors.mapCarGlass} />
      {HEADLIGHTS.map(({ x }) => (
        <Rect
          key={x}
          x={x}
          y={LIGHT.frontY}
          width={LIGHT.width}
          height={LIGHT.height}
          rx={LIGHT.radius}
          fill={colors.mapCarHeadlight}
        />
      ))}
      {TAILLIGHTS.map(({ x }) => (
        <Rect
          key={x}
          x={x}
          y={LIGHT.rearY}
          width={LIGHT.width}
          height={LIGHT.height}
          rx={LIGHT.radius}
          fill={colors.mapCarTaillight}
        />
      ))}
    </Svg>
  );
}
