import { EventEmitter, Injectable } from '@angular/core';
import { CardsFacadeService } from '@services/cards-facade.service';
import { BgsStats } from '../../models/battlegrounds/stats/bgs-stats';
import { BattlegroundsAppState } from '../../models/mainwindow/battlegrounds/battlegrounds-app-state';
import { BattlegroundsCategory } from '../../models/mainwindow/battlegrounds/battlegrounds-category';
import {
	BgsCompositionStat,
	BgsCompositionStatBuildExample,
	BgsCompositionStatCard,
} from '../../models/mainwindow/battlegrounds/bgs-composition-stat';
import { BattlegroundsCompositionsCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-compositions-category';
import { BattlegroundsPerfectGamesCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-perfect-games-category';
import { BattlegroundsPersonalHeroesCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-heroes-category';
import { BattlegroundsPersonalRatingCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-rating-category';
import { BattlegroundsPersonalStatsCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-stats-category';
import { BattlegroundsPersonalStatsHeroDetailsCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-stats-hero-details-category';
import { BattlegroundsSimulatorCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-simulator-category';
import { BgsHeroStatsFilterId } from '../../models/mainwindow/battlegrounds/categories/bgs-hero-stats-filter-id';
import { GameStat } from '../../models/mainwindow/stats/game-stat';
import { GameStats } from '../../models/mainwindow/stats/game-stats';
import { PatchInfo } from '../../models/patches';
import { ApiRunner } from '../api-runner';
import { Events } from '../events.service';
import { FeatureFlags } from '../feature-flags';
import { OverwolfService } from '../overwolf.service';
import centroidDefinitions from './centroids-definition.json';
import compositions from './compositions.json';
import { BgsStatUpdateEvent } from './store/events/bgs-stat-update-event';
import { BattlegroundsStoreEvent } from './store/events/_battlegrounds-store-event';

const RETRIEVE_PERFECT_GAMES_ENDPOINT = 'https://static.zerotoheroes.com/api/bgs-perfect-games.json?v=5';

@Injectable()
export class BgsInitService {
	private bgsStateUpdater: EventEmitter<BattlegroundsStoreEvent>;

	constructor(
		private readonly events: Events,
		private readonly ow: OverwolfService,
		private readonly cards: CardsFacadeService,
		private readonly api: ApiRunner,
	) {
		this.events.on(Events.GAME_STATS_UPDATED).subscribe((event) => {
			const newGameStats: GameStats = event.data[0];
			console.log('[bgs-init] match stats updated');
			this.bgsStateUpdater?.next(new BgsStatUpdateEvent(newGameStats));
		});
		setTimeout(() => {
			this.bgsStateUpdater = this.ow.getMainWindow().battlegroundsUpdater;
		});
		window['reloadCompositions'] = (sensitivy: number) => this.loadCompositions(sensitivy);
	}

	public async loadPerfectGames(): Promise<readonly GameStat[]> {
		const result = await this.api.callGetApi<readonly GameStat[]>(RETRIEVE_PERFECT_GAMES_ENDPOINT);
		console.debug('[bgs-init] perfect games', result);
		return (result ?? [])
			.map((res) =>
				GameStat.create({
					...res,
					gameFormat: 'wild',
					gameMode: 'battlegrounds',
					additionalResult: '1',
					bgsPerfectGame: true,
				} as GameStat),
			)
			.filter((stat) => stat.playerRank);
	}

	public async loadCompositions(sensitity = 1): Promise<readonly BgsCompositionStat[]> {
		console.debug('starting reload');
		const compositionsFromService: readonly CompositionsFromRemote[] =
			(await this.api.callGetApi('./compositions.json?v=2')) ?? compositions;
		const centroids: { [key: string]: number } =
			(await this.api.callGetApi('./centroid-definitions.json')) ?? centroidDefinitions;
		const result = this.transformCompositions(compositionsFromService[0]);
		console.debug('[bgs-init] loaded compositions', result);
		const merged: readonly BgsCompositionStat[] = this.mergeCompositions(result, centroids, sensitity);
		return merged;
	}

	private mergeCompositions(
		result: readonly BgsCompositionStat[],
		centroids: { [key: string]: number },
		sensitity: number,
	): readonly BgsCompositionStat[] {
		return result;
	}

	public async initBattlegoundsAppState(
		bgsGlobalStats: BgsStats,
		perfectGames: readonly GameStat[],
		compositions: readonly BgsCompositionStat[],
		patch: PatchInfo,
	): Promise<BattlegroundsAppState> {
		const categories: readonly BattlegroundsCategory[] = [
			this.buildPersonalHeroesCategory(bgsGlobalStats),
			this.buildCompositionsCategory(),
			this.buildPersonalRatingCategory(),
			this.buildPersonalStatsCategory(),
			this.buildPerfectGamesCategory(),
			this.buildSimulatorCategory(),
		].filter((cat) => cat);
		return BattlegroundsAppState.create({
			categories: categories,
			globalStats: bgsGlobalStats,
			perfectGames: perfectGames,
			compositions: compositions,
			loading: false,
			currentBattlegroundsMetaPatch: patch,
		} as BattlegroundsAppState);
	}

	private buildPersonalHeroesCategory(bgsGlobalStats: BgsStats): BattlegroundsCategory {
		const uniqueHeroes = [...new Set(bgsGlobalStats?.heroStats?.map((heroStat) => heroStat.cardId) ?? [])];
		const heroDetailCategories: readonly BattlegroundsCategory[] = uniqueHeroes.map((heroCardId) =>
			BattlegroundsPersonalStatsHeroDetailsCategory.create({
				id: 'bgs-category-personal-hero-details-' + heroCardId,
				name: this.cards.getCard(heroCardId)?.name,
				heroId: heroCardId,
				tabs: [
					'winrate-stats',
					// Graph is buggy at the moment, and is not super useful, so let's scrap it for now
					// 'mmr',
					'warband-stats',
					'final-warbands',
				] as readonly BgsHeroStatsFilterId[],
			} as BattlegroundsPersonalStatsHeroDetailsCategory),
		);
		return BattlegroundsPersonalHeroesCategory.create({
			enabled: true,
			categories: heroDetailCategories,
		} as BattlegroundsPersonalHeroesCategory);
	}

	private buildCompositionsCategory(): BattlegroundsCategory {
		return BattlegroundsCompositionsCategory.create({
			enabled: true,
		} as BattlegroundsCompositionsCategory);
	}

	private buildPersonalRatingCategory(): BattlegroundsCategory {
		return BattlegroundsPersonalRatingCategory.create({
			enabled: true,
		} as BattlegroundsPersonalRatingCategory);
	}

	private buildPerfectGamesCategory(): BattlegroundsCategory {
		return BattlegroundsPerfectGamesCategory.create({
			enabled: true,
		} as BattlegroundsPerfectGamesCategory);
	}

	private buildPersonalStatsCategory(): BattlegroundsCategory {
		return BattlegroundsPersonalStatsCategory.create({
			enabled: true,
		} as BattlegroundsPersonalStatsCategory);
	}

	private buildSimulatorCategory(): BattlegroundsCategory {
		if (!FeatureFlags.ENABLE_BGS_FULL_SIMULATOR) {
			return null;
		}
		return BattlegroundsSimulatorCategory.create({
			enabled: true,
		} as BattlegroundsSimulatorCategory);
	}

	private transformCompositions(compositionsFromService: CompositionsFromRemote): readonly BgsCompositionStat[] {
		return compositionsFromService.round_builds
			.map((build) => {
				const cards = this.buildCards(build.common_cards);
				return {
					id: build.cluster,
					name: null,
					top1: build.stats.winrate,
					top4: build.stats.top4_rate,
					averagePosition: build.stats.average_place,
					// For now we hardcode this
					mmrPercentile: 100,
					cards: cards,
					buildExamples: this.buildBuildExamples(build.top_10_build_stats, cards, build),
				};
			})
			.filter((comp) => !!comp.buildExamples.length)
			.sort((a, b) => a.averagePosition - b.averagePosition);
	}

	private buildBuildExamples(
		builds: { [jsonStr: string]: Stat },
		cards: readonly BgsCompositionStatCard[],
		finalBuild: any,
	): readonly BgsCompositionStatBuildExample[] {
		const debug = finalBuild.cluster === 18;
		const refCardIds = cards.map((card) => card.cardId);
		return Object.keys(builds)
			.map((identifier) => {
				const idObj = JSON.parse(identifier);
				const cardIds = this.extractCardIds(idObj);
				if (!cardIds.every((id) => refCardIds.includes(id))) {
					if (debug) {
						console.warn('missing reference cards', cardIds, refCardIds, cards, idObj, finalBuild);
					}
					return null;
				}
				const build = builds[identifier];
				return {
					cardIds: cardIds,
					top1: build.winrate,
					top4: build.top4_rate,
					averagePosition: build.average_place,
				};
			})
			.filter((build) => !!build && build.cardIds.length === 7)
			.sort((a, b) => a.averagePosition - b.averagePosition)
			.slice(0, 10);
	}

	private extractCardIds(idObj: { [position: string]: string }): readonly string[] {
		return Object.values(idObj)
			.map((id: string) => {
				const card = this.cards.getCard(id);
				if (!card?.id) {
					return null;
				}
				return id;
			})
			.filter((cardId) => !!cardId);
	}

	private buildCards(common_cards: { [cardIdentifier: string]: Card }): readonly BgsCompositionStatCard[] {
		return Object.keys(common_cards).map((identifier) => {
			const reResult = /(.*)_\d+/.exec(identifier);
			const cardId = reResult[1];
			const cardStat = common_cards[identifier];
			return {
				cardId: cardId,
				attack: cardStat.attack,
				health: cardStat.health,
				divineShield: cardStat.divineShield,
				poisonous: cardStat.poisonous,
				taunt: cardStat.taunt,
				reborn: cardStat.reborn,
				cleave: cardStat.cleave,
				windfury: cardStat.windfury,
				megaWindfury: cardStat.megaWindfury,
				frequency: cardStat.frequency,
			};
		});
	}
}

interface CompositionsFromRemote {
	readonly final_builds: readonly FinalBuild[];
	readonly round_builds: readonly FinalBuild[];
}

interface FinalBuild {
	readonly cluster: number;
	readonly stats: Stat;
	readonly hero_stats: {
		[cardId: string]: Stat;
	};
	readonly top_10_build_stats: {
		[jsonStr: string]: Stat;
	};
	readonly common_cards: {
		[cardIdentifier: string]: Card;
	};
}

interface Card {
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
	readonly tribe: string;
}

interface Stat {
	readonly winrate: number;
	readonly top4_rate: number;
	readonly average_place: number;
	readonly frequency: number;
}
