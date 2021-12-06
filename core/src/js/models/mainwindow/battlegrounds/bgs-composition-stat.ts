export interface BgsCompositionStat {
	readonly id: number;
	readonly name: string;
	readonly top1: number;
	readonly top4: number;
	readonly averagePosition: number;
	readonly dataPoints: number;
	readonly mmrPercentile: number;
	readonly cards: readonly BgsCompositionStatCard[];
	readonly buildExamples: readonly BgsCompositionStatBuildExample[];
	readonly centroid: { [cardId: string]: number };
}

export interface BgsCompositionStatBuildExample {
	readonly cardIds: readonly string[];
	readonly top1: number;
	readonly top4: number;
	readonly averagePosition: number;
}

export interface BgsCompositionStatCard {
	readonly cardId: string;
	// readonly premium: boolean;
	readonly attack: number;
	readonly health: number;
	readonly divineShield: number;
	readonly poisonous: number;
	readonly taunt: number;
	readonly reborn: number;
	readonly cleave: number;
	readonly windfury: number;
	readonly megaWindfury: number;
	readonly frequency: number;
}
