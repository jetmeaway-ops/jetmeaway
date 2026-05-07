/**
 * PuzzleBoard — renders the sliding-puzzle tiles. Each tile is a clipped
 * View that contains the FULL image translated by `(-col × tileW, -row ×
 * tileH)` so the OS does the slicing — zero CPU cost, no pre-cut assets.
 *
 * Tiles are keyed by their VALUE (1..N-1) so React preserves the same
 * component instance across moves. Each tile owns shared values for its
 * `left/top` position; on a board change those animate via withTiming
 * on the UI thread, giving a smooth slide independent of JS load.
 *
 * The blank cell is implicit — we just don't render a tile for value 0.
 */

import { memo, useEffect, useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, motion, radii } from '../../../theme';
import {
  type Board,
  type BoardSpec,
  tileSolvedPosition,
} from './puzzleEngine';

const SLIDE_DURATION_MS = motion.durationMs.medium; // 250ms — feels physical without lag

type BoardProps = {
  board: Board;
  spec: BoardSpec;
  size: number;
  image: ImageSourcePropType;
  onTapTile: (index: number) => void;
};

export default function PuzzleBoard({ board, spec, size, image, onTapTile }: BoardProps) {
  const tileW = size / spec.cols;
  const tileH = size / spec.rows;

  // value (1..N-1) → current cell index in `board`
  const positions = useMemo(() => {
    const map = new Map<number, number>();
    board.forEach((value, idx) => {
      if (value !== 0) map.set(value, idx);
    });
    return map;
  }, [board]);

  // Stable list of tile values so React reuses component instances and
  // each Tile's shared values persist across re-renders.
  const tileValues = useMemo(() => {
    const total = spec.rows * spec.cols;
    const out: number[] = [];
    for (let v = 1; v < total; v++) out.push(v);
    return out;
  }, [spec.rows, spec.cols]);

  return (
    <View style={[styles.board, { width: size, height: size }]}>
      {tileValues.map((value) => {
        const cellIdx = positions.get(value);
        if (cellIdx === undefined) return null;
        const row = Math.floor(cellIdx / spec.cols);
        const col = cellIdx % spec.cols;
        return (
          <Tile
            key={value}
            value={value}
            row={row}
            col={col}
            tileW={tileW}
            tileH={tileH}
            spec={spec}
            boardSize={size}
            image={image}
            onPress={() => onTapTile(cellIdx)}
          />
        );
      })}
    </View>
  );
}

type TileProps = {
  value: number;
  row: number;
  col: number;
  tileW: number;
  tileH: number;
  spec: BoardSpec;
  boardSize: number;
  image: ImageSourcePropType;
  onPress: () => void;
};

const Tile = memo(function Tile({
  value,
  row,
  col,
  tileW,
  tileH,
  spec,
  boardSize,
  image,
  onPress,
}: TileProps) {
  const left = useSharedValue(col * tileW);
  const top = useSharedValue(row * tileH);

  // Animate to new target whenever row/col change. First mount also
  // hits this effect — `withTiming` from the same value to the same
  // value is a no-op so there's no spurious initial animation.
  useEffect(() => {
    left.value = withTiming(col * tileW, {
      duration: SLIDE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    top.value = withTiming(row * tileH, {
      duration: SLIDE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [row, col, tileW, tileH, left, top]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
  }));

  const [solvedRow, solvedCol] = tileSolvedPosition(value, spec);
  const offsetX = -solvedCol * tileW;
  const offsetY = -solvedRow * tileH;

  return (
    <Animated.View
      style={[
        styles.tile,
        { width: tileW, height: tileH },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel={`Tile ${value}`}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.tilePressable,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Image
          source={image}
          style={{
            width: boardSize,
            height: boardSize,
            transform: [{ translateX: offsetX }, { translateY: offsetY }],
          }}
          resizeMode="cover"
        />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  board: {
    position: 'relative',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  tilePressable: {
    flex: 1,
  },
});
