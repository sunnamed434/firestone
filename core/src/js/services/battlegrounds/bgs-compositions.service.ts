import { Injectable } from '@angular/core';
import { CardsFacadeService } from '@services/cards-facade.service';
import {
	BgsCompositionStat,
	BgsCompositionStatBuildExample,
	BgsCompositionStatCard,
} from '../../models/mainwindow/battlegrounds/bgs-composition-stat';
import { ApiRunner } from '../api-runner';
import centroidDefinitions from './centroid-vector-base.json';
import compositions from './compositions.json';

@Injectable()
export class BgsCompositionsService {
	constructor(private readonly cards: CardsFacadeService, private readonly api: ApiRunner) {}

	public async loadCompositions(sensitity = 1): Promise<readonly BgsCompositionStat[]> {
		console.debug('starting reload');
		const compositionsFromService: readonly CompositionsFromRemote[] =
			(await this.api.callGetApi('./compositions.json?v=2')) ?? compositions;
		const centroidVectorBase: { [key: string]: number } =
			(await this.api.callGetApi('./centroid-definitions.json')) ?? centroidDefinitions;
		const result = this.transformCompositions(compositionsFromService[0], Object.keys(centroidVectorBase));
		console.debug('[bgs-init] loaded compositions', result);
		const merged: readonly BgsCompositionStat[] = this.mergeCompositions(result, sensitity);
		return merged;
	}

	private transformCompositions(
		compositionsFromService: CompositionsFromRemote,
		centroidVectorBase: readonly string[],
	): readonly BgsCompositionStat[] {
		return compositionsFromService.round_builds
			.map((build) => {
				const cards = this.buildCards(build.common_cards);
				if (centroidVectorBase.length !== build.centroid.length) {
					console.warn('invalid centroid definition', build.cluster, centroidVectorBase, build.centroid);
				}
				const centroid: { [cardId: string]: number } = {};
				for (let i = 0; i < centroidVectorBase.length; i++) {
					centroid[centroidVectorBase[i]] = build.centroid[i];
				}
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
					centroid: centroid,
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

	private mergeCompositions(result: readonly BgsCompositionStat[], sensitity: number): readonly BgsCompositionStat[] {
		let merged: readonly BgsCompositionStat[] = result;
		let i = 0;
		while (true) {
			console.debug('iteration ', i++);
			const afterMerge = this.mergeCompositionsSinglePass(merged, sensitity);
			console.debug('after merge', afterMerge);
			if (afterMerge.length === merged.length) {
				break;
			}
			merged = afterMerge;
		}
		return result;
	}

	private mergeCompositionsSinglePass(
		result: readonly BgsCompositionStat[],
		sensitity: number,
	): readonly BgsCompositionStat[] {
		type ToMerge = BgsCompositionStat[];
		const toMerge: ToMerge[] = [];
		for (let i = 0; i < result.length; i++) {
			for (let j = i + 1; j < result.length; j++) {
				const cluster = result[i];
				const other = result[j];
				const distance = this.calculateDistance(cluster.centroid, other.centroid);
				console.debug('distance between', cluster, other, 'is', distance);
				if (distance < sensitity) {
					const existing = toMerge.find((merged) => merged.includes(cluster));
					if (existing) {
						existing.push(other);
					} else {
						toMerge.push([cluster, other]);
					}
				}
			}
		}

		const toKeepAsIs = result.filter((comp) => !toMerge.some((merged) => merged.includes(comp)));
		return [...toKeepAsIs, ...toMerge.map((clustersToGroup) => this.mergeClusters(...clustersToGroup))];
	}

	private mergeClusters(cluster: BgsCompositionStat, other: BgsCompositionStat) {}

	private calculateDistance(centroid1: { [cardId: string]: number }, centroid2: { [cardId: string]: number }) {
		let distance = 0;
		for (const cardId of Object.keys(centroid1)) {
			distance += Math.pow(centroid1[cardId] - centroid2[cardId], 2);
		}
		return distance;
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
	readonly centroid: readonly number[];
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
