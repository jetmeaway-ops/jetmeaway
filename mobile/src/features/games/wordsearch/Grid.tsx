/**
 * Word-search Grid — pan-gesture-driven cell selector. The user drags
 * across letters; we track the cell under their finger via geometry
 * (Math.floor of position / cellSize) and highlight the start→current
 * straight-line path. On gesture end the parent decides whether the
 * line resolves to a remaining word.
 *
 * Visual approach is deliberately minimalist: a single-pixel hairline
 * grid, no inner borders, brand-blue active highlight that fills the
 * cell with a soft tint, and a green found-state. Letters use Poppins
 * SemiBold for crisp legibility at every grid size from 6×6 to 15×15.
 */

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { colors, radii } from '../../../theme';
import { gameColors } from '../theme';
import type { Cell } from './wordsearchEngine';

type Props = {
  grid: string[][];
  size: number;          // pixel size of the whole grid (square)
  foundCells: Set<string>; // "row,col" keys
  onLineSubmit: (start: Cell, end: Cell) => void;
};

const cellKey = (r: number, c: number) => `${r},${c}`;

export default function WordSearchGrid({ grid, size, foundCells, onLineSubmit }: Props) {
  const N = grid.length;
  const cellSize = size / N;

  const [start, setStart] = useState<Cell | null>(null);
  const [current, setCurrent] = useState<Cell | null>(null);

  const setStartJS = useCallback((r: number, c: number) => {
    setStart({ row: r, col: c });
    setCurrent({ row: r, col: c });
  }, []);
  const setCurrentJS = useCallback((r: number, c: number) => {
    setCurrent({ row: r, col: c });
  }, []);
  const submitJS = useCallback(() => {
    if (start && current) onLineSubmit(start, current);
    setStart(null);
    setCurrent(null);
  }, [start, current, onLineSubmit]);

  const pan = useMemo(() => {
    return Gesture.Pan()
      .minDistance(0)
      .onBegin((e) => {
        const r = Math.floor(e.y / cellSize);
        const c = Math.floor(e.x / cellSize);
        if (r < 0 || c < 0 || r >= N || c >= N) return;
        runOnJS(setStartJS)(r, c);
      })
      .onUpdate((e) => {
        const r = Math.floor(e.y / cellSize);
        const c = Math.floor(e.x / cellSize);
        if (r < 0 || c < 0 || r >= N || c >= N) return;
        runOnJS(setCurrentJS)(r, c);
      })
      .onEnd(() => {
        runOnJS(submitJS)();
      })
      .onFinalize(() => {
        runOnJS(submitJS)();
      });
  }, [cellSize, N, setStartJS, setCurrentJS, submitJS]);

  const activeCells = useMemo(() => {
    if (!start || !current) return new Set<string>();
    const out = new Set<string>();
    const dr = Math.sign(current.row - start.row);
    const dc = Math.sign(current.col - start.col);
    const rowSpan = Math.abs(current.row - start.row);
    const colSpan = Math.abs(current.col - start.col);
    const isStraight =
      (dr === 0 && dc !== 0) ||
      (dc === 0 && dr !== 0) ||
      rowSpan === colSpan ||
      (rowSpan === 0 && colSpan === 0);
    if (!isStraight) {
      out.add(cellKey(start.row, start.col));
      return out;
    }
    const length = Math.max(rowSpan, colSpan) + 1;
    for (let i = 0; i < length; i++) {
      out.add(cellKey(start.row + dr * i, start.col + dc * i));
    }
    return out;
  }, [start, current]);

  // Letter sizing: scale with cell width but cap so 15×15 stays readable
  // and 6×6 doesn't look ridiculous. SemiBold for clean legibility.
  const letterFontSize = Math.max(12, Math.min(cellSize * 0.5, 22));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.grid, { width: size, height: size }]}>
        {grid.map((row, r) => (
          <View key={`row-${r}`} style={styles.row}>
            {row.map((letter, c) => {
              const key = cellKey(r, c);
              const isFound = foundCells.has(key);
              const isActive = activeCells.has(key);
              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                    isFound && styles.cellFound,
                    !isFound && isActive && styles.cellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.letter,
                      { fontSize: letterFontSize },
                      isFound && styles.letterFound,
                      !isFound && isActive && styles.letterActive,
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    // Hairline lines on bottom + right; the outer border handles top + left.
    // Result: a single uniform 1-pixel grid with no doubled-up edges.
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cellActive: {
    backgroundColor: gameColors.highlightSoft,
  },
  cellFound: {
    backgroundColor: gameColors.foundSoft,
  },
  letter: {
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  letterActive: { color: gameColors.highlight },
  letterFound: {
    color: gameColors.found,
    fontFamily: 'Poppins_700Bold',
  },
});
