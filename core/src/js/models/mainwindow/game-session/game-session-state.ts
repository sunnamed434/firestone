import { GameStat } from '../stats/game-stat';

export class GameSessionState {
	readonly currentMode: 'battlegrounds' = 'battlegrounds';
	readonly startingBgsMmr: number;
	// readonly startingDuelsCasualMmr: number;
	// readonly startingDuelsHeroicMmr: number;
	// readonly startingStandardRank: number;
	// readonly startingWildRank: number;
	// readonly startingClassicRank: number;
	readonly matches: readonly GameStat[] = [];

	public static create(base: GameSessionState): GameSessionState {
		return Object.assign(new GameSessionState(), base);
	}

	public update(base: GameSessionState): GameSessionState {
		return Object.assign(new GameSessionState(), this, base);
	}
}
