import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameStat } from '@models/mainwindow/stats/game-stat';
import { AppUiStoreService, cdLog } from '@services/app-ui-store.service';
import { arraysEqual } from '@services/utils';
import { ChartDataSets } from 'chart.js';
import { Label } from 'ng2-charts';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { DeckTimeFilterType } from '../../../models/mainwindow/decktracker/deck-time-filter.type';
import { StatGameFormatType } from '../../../models/mainwindow/stats/stat-game-format.type';
import { PatchInfo } from '../../../models/patches';
import { DecksStateBuilderService } from '../../../services/decktracker/main/decks-state-builder.service';
import { ladderRankToInt } from '../../../services/hs-utils';

@Component({
	selector: 'decktracker-rating-graph',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/component/decktracker/main/decktracker-rating-graph.component.scss`,
	],
	template: `
		<div class="decktracker-rating-graph" *ngIf="value$ | async as value">
			<graph-with-single-value
				[data]="value.data"
				[labels]="value.labels"
				emptyStateMessage="Please make sure a unique game mode (Standard, Wild or Classic) is selected above"
				emptyStateIcon="assets/svg/ftue/decktracker.svg"
			></graph-with-single-value>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecktrackerRatingGraphComponent {
	value$: Observable<Value>;

	constructor(private readonly store: AppUiStoreService) {
		this.value$ = this.store
			.listen$(
				([main, nav]) =>
					main.stats.gameStats.stats
						.filter((stat) => stat.gameMode === 'ranked')
						.filter((stat) => stat.playerRank),
				// TODO: missing a way to select between non-legend and legend graphs
				// TODO: add a way to group per day?
				([main, nav]) => main.decktracker.filters.gameFormat,
				([main, nav]) => main.decktracker.filters.time,
				([main, nav]) => main.decktracker.patch,
			)
			.pipe(
				filter(([stats, formatFilter, timeFilter, patch]) => !!stats && !!patch?.number),
				distinctUntilChanged((a, b) => this.compare(a, b)),
				map(([stats, formatFilter, timeFilter, patch]) =>
					this.buildValue(stats, formatFilter, timeFilter, patch),
				),
				tap((values: Value) => cdLog('emitting in ', this.constructor.name, values)),
			);
	}

	private buildValue(
		stats: readonly GameStat[],
		formatFilter: StatGameFormatType,
		timeFilter: DeckTimeFilterType,
		patch: PatchInfo,
	): Value {
		if (formatFilter === 'all' || formatFilter === 'unknown') {
			return {
				data: [],
				labels: [],
			};
		}

		const data = [...stats].filter((stat) => stat.gameFormat === formatFilter).reverse();
		const fakeMatchWithCurrentMmr: GameStat = data[data.length - 1].newPlayerRank
			? GameStat.create({
					...data[data.length - 1],
					playerRank: data[data.length - 1].newPlayerRank,
			  } as GameStat)
			: null;
		const dataWithCurrentMmr = fakeMatchWithCurrentMmr ? [...data, fakeMatchWithCurrentMmr] : data;
		const dataWithTime = dataWithCurrentMmr.filter((stat) =>
			DecksStateBuilderService.isValidDate(stat, timeFilter, patch),
		);
		// Remove the first match if we're on a "last patch" filter
		const finalData =
			timeFilter === 'last-patch'
				? [
						GameStat.create({
							...dataWithTime[0],
							playerRank: '0',
						} as GameStat),
						...dataWithTime.slice(1),
				  ]
				: dataWithTime;
		const dataForGraph = finalData.map((match) => ladderRankToInt(match.playerRank)).filter((rank) => rank != null);
		return {
			data: [
				{
					data: dataForGraph,
					label: 'Rating',
				},
			],
			labels: Array.from(Array(dataForGraph.length), (_, i) => i + 1).map((matchIndex) => '' + matchIndex),
		} as Value;
	}

	private compare(
		a: [GameStat[], StatGameFormatType, DeckTimeFilterType, PatchInfo],
		b: [GameStat[], StatGameFormatType, DeckTimeFilterType, PatchInfo],
	): boolean {
		if (a[1] !== b[1] || a[2] !== b[2] || a[3]?.number !== b[3]?.number) {
			return false;
		}
		return arraysEqual(a[0], b[0]);
	}
}

interface Value {
	readonly data: ChartDataSets[];
	readonly labels: Label;
}
