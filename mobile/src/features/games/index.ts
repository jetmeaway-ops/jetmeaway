/**
 * Games feature barrel — keep import paths stable as the internal
 * structure evolves.
 */

export { default as GameHub } from './GameHub';
export { default as PuzzleScreen } from './puzzle/PuzzleScreen';
export { default as WordSearchScreen } from './wordsearch/WordSearchScreen';
export { default as TriviaScreen } from './trivia/TriviaScreen';

export {
  useGamesStore,
  DIFFICULTY_LABELS,
  type Difficulty,
  type GameKey,
} from './state/gamesStore';
