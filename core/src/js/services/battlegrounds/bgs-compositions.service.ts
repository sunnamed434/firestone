import { Injectable } from '@angular/core';
import { CardsFacadeService } from '@services/cards-facade.service';
import {
	BgsCompositionStat,
	BgsCompositionStatBuildExample,
	BgsCompositionStatCard,
} from '../../models/mainwindow/battlegrounds/bgs-composition-stat';
import { ApiRunner } from '../api-runner';
import { groupByFunction, sumOnArray } from '../utils';
import centroidDefinitions from './centroid-vector-base.json';
import compositions from './compositions.json';

@Injectable()
export class BgsCompositionsService {
	constructor(private readonly cards: CardsFacadeService, private readonly api: ApiRunner) {}

	public async loadCompositions(sensitity = 3.6): Promise<readonly BgsCompositionStat[]> {
		console.debug('[bgs-comp] starting reload');
		const compositionsFromService: readonly CompositionsFromRemote[] =
			(await this.api.callGetApi('./compositions.json?v=3')) ?? compositions;
		const centroidVectorBase: { [key: string]: number } =
			(await this.api.callGetApi('./centroid-definitions.json')) ?? centroidDefinitions;
		const result = this.transformCompositions(compositionsFromService[0], Object.keys(centroidVectorBase));
		console.debug('[bgs-comp] loaded compositions', result);
		const merged: readonly BgsCompositionStat[] = this.mergeCompositions(result, sensitity);
		return merged;
	}

	private transformCompositions(
		compositionsFromService: CompositionsFromRemote,
		centroidVectorBase: readonly string[],
	): readonly BgsCompositionStat[] {
		console.debug('[bgs-comp] transformCompositions', compositionsFromService, centroidVectorBase);
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
				const examples = this.buildBuildExamples(build.top_10_build_stats, cards, build);
				const result = {
					id: build.cluster,
					name: null,
					top1: build.stats.winrate,
					top4: build.stats.top4_rate,
					dataPoints: build.stats.frequency,
					averagePosition: build.stats.average_place,
					// For now we hardcode this
					mmrPercentile: 100,
					cards: cards,
					buildExamples: examples,
					centroid: centroid,
				};
				console.debug('\t', '[bgs-comp] handling cluster', build.cluster, result);
				return result;
			})
			.filter((comp) => !!comp.buildExamples.length)
			.sort((a, b) => a.averagePosition - b.averagePosition);
	}

	private buildBuildExamples(
		builds: { [jsonStr: string]: Stat },
		cards: readonly BgsCompositionStatCard[],
		finalBuild: any,
	): readonly BgsCompositionStatBuildExample[] {
		const debug = false; // finalBuild.cluster === 18;
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

	private mergeCompositions(
		initial: readonly BgsCompositionStat[],
		sensitity: number,
	): readonly BgsCompositionStat[] {
		console.debug('[bgs-comp] merging', initial, sensitity);
		let merged: readonly BgsCompositionStat[] = initial;
		let i = 0;
		while (true) {
			console.debug('[bgs-comp] iteration ', i++);
			const afterMerge = this.mergeCompositionsSinglePass(merged, sensitity);
			console.debug('[bgs-comp] after merge', afterMerge);
			if (afterMerge.length === merged.length) {
				break;
			}
			merged = afterMerge;
			console.log('[bgs-comp] single pass merge for now');
			break;
		}
		return merged;
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
				console.debug(
					'[bgs-comp] distance between',
					cluster.id,
					other.id,
					cluster,
					other,
					'is',
					distance,
					sensitity,
				);
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
		return [...toKeepAsIs, ...toMerge.map((clustersToGroup) => this.mergeClusters(clustersToGroup))];
	}

	private mergeClusters(clusters: readonly BgsCompositionStat[]): BgsCompositionStat {
		console.debug(
			'[bgs-comp] merging clusters',
			clusters.map((c) => c.id),
			clusters,
		);
		const totalDataPoints = sumOnArray(clusters, (cluster) => cluster.dataPoints);
		const result = {
			id: clusters[0].id,
			cards: this.mergeCommonCards(clusters),
			averagePosition:
				sumOnArray(clusters, (cluster) => cluster.averagePosition * cluster.dataPoints) / totalDataPoints,
			top1: sumOnArray(clusters, (cluster) => cluster.top1 * cluster.dataPoints) / totalDataPoints,
			top4: sumOnArray(clusters, (cluster) => cluster.top4 * cluster.dataPoints) / totalDataPoints,
			mmrPercentile: clusters[0].mmrPercentile,
			dataPoints: sumOnArray(clusters, (cluster) => cluster.dataPoints),
			buildExamples: clusters.flatMap((cluster) => cluster.buildExamples),
			centroid: null,
			name: null,
		};
		console.debug(
			'[bgs-comp] merged clusters',
			clusters.map((c) => c.id),
			result,
		);
		return result;
	}

	private mergeCommonCards(clusters: readonly BgsCompositionStat[]): readonly BgsCompositionStatCard[] {
		const denormalizedCards = clusters.flatMap((cluster) =>
			cluster.cards.map((card) => ({
				...((Object.fromEntries([
					...Object.entries(card).map((entry) => [entry[0], entry[1] * cluster.dataPoints]),
					['dataPoints', cluster.dataPoints],
				]) as any) as BgsCompositionStatCard),
				cardId: card.cardId,
			})),
		);
		const groupedByCardId = groupByFunction((card: BgsCompositionStatCard) => card.cardId)(denormalizedCards);
		const result = Object.values(groupedByCardId).map((cards) => {
			const allEntryKeys = Object.entries(cards[0]).map((entry) => entry[0]);
			const allDataPoints = sumOnArray(cards, (card: any) => card.dataPoints);
			const newEntries = allEntryKeys.map((entryKey) => [
				entryKey,
				sumOnArray(cards, (card) => Object.entries(card).find((entry) => entry[0] === entryKey)[1]) /
					allDataPoints,
			]);
			return {
				...Object.fromEntries(newEntries),
				cardId: cards[0].cardId,
			} as BgsCompositionStatCard;
		});
		console.debug('[bgs-comp] merged comon cards', result, groupedByCardId);
		return result;
	}

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
