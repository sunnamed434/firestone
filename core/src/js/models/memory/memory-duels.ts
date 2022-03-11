import { GameFormat } from '@firestone-hs/reference-data';

export interface DuelsInfo {
	readonly Wins: number;
	readonly Losses: number;
	readonly Rating: number;
	readonly PaidRating: number;
	readonly LastRatingChange: number;
	readonly DeckList: readonly number[];
	// Use that in priority
	readonly DeckListWithCardIds: readonly string[];
	readonly ChosenLoot: number;
	readonly ChosenTreasure: number;
	readonly LootOptionBundles: readonly OptionBundle[];
	readonly TreasureOption: readonly number[];
	readonly StartingHeroPower: number;
	// Use that in priority
	readonly StartingHeroPowerCardId: number;
	readonly PlayerClass: number;

	// Not read from memory, just there for compatiblity with standard decklists
	/** @deprecated */
	readonly FormatType: GameFormat;
	/** @deprecated */
	readonly Name: string;
	/** @deprecated */
	readonly HeroCardId: string;
}

export interface OptionBundle {
	readonly BundleId: number;
	readonly Elements: readonly number[];
}

export interface MemoryDuelsHeroPowerOption {
	readonly DatabaseId: number;
	readonly Enabled: boolean;
	readonly Visible: boolean;
	readonly Completed: boolean;
	readonly Locked: boolean;
	readonly Selected: boolean;
}