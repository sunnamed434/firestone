import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GameStat } from '@models/mainwindow/stats/game-stat';
import { AppUiStoreService, cdLog } from '@services/app-ui-store.service';
import { addDaysToDate, arraysEqual, daysBetweenDates, formatDate, groupByFunction } from '@services/utils';
import { ChartDataSets } from 'chart.js';
import { Label } from 'ng2-charts';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { StatsXpGraphSeasonFilterType } from '../../../models/mainwindow/stats/stats-xp-graph-season-filter.type';
import {
	computeXpFromLevel,
	getSeason,
	xpSeason1,
	xpSeason2,
} from '../../../services/stats/xp/xp-tables/xp-computation';

@Component({
	selector: 'stats-xp-graph',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/component/stats/desktop/stats-xp-graph.component.scss`,
	],
	template: `
		<div class="stats-xp-graph" *ngIf="value$ | async as value">
			<graph-with-single-value
				[data]="value.data"
				[labels]="value.labels"
				emptyStateMessage="No data available for this season"
			></graph-with-single-value>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsXpGraphComponent {
	value$: Observable<Value>;

	constructor(private readonly store: AppUiStoreService) {
		this.value$ = this.store
			.listen$(
				([main, nav]) => main.stats.gameStats.stats,
				([main, nav]) => main.stats.filters.xpGraphSeasonFilter,
			)
			.pipe(
				map(
					([stats, seasonFilter]) =>
						[stats.filter((stat) => stat.levelAfterMatch), seasonFilter] as [
							GameStat[],
							StatsXpGraphSeasonFilterType,
						],
				),
				filter(([stats, seasonFilter]) => !!stats?.length && !!seasonFilter),
				distinctUntilChanged((a, b) => this.compare(a, b)),
				map(([stats, seasonFilter]) => this.buildValue(stats, seasonFilter)),
				tap((values: Value) => cdLog('emitting in ', this.constructor.name, values)),
			);
	}

	private buildValue(stats: readonly GameStat[], seasonFilter: StatsXpGraphSeasonFilterType): Value {
		const data = [...stats].reverse();
		const dataWithTime = data.filter((stat) => this.isValidDate(stat, seasonFilter));
		if (!dataWithTime?.length) {
			return { data: [], labels: [] };
		}

		const values: number[] = [];
		// let labels: readonly string[];
		// if (rakingGroup === 'per-day') {
		const groupedByDay: { [date: string]: readonly GameStat[] } = groupByFunction((match: GameStat) =>
			formatDate(new Date(match.creationTimestamp)),
		)(dataWithTime);
		console.debug('data', dataWithTime);
		const daysSinceStart = daysBetweenDates(
			formatDate(new Date(dataWithTime[0].creationTimestamp)),
			formatDate(new Date(dataWithTime[dataWithTime.length - 1].creationTimestamp)),
		);
		const labels = Array.from(Array(daysSinceStart), (_, i) =>
			addDaysToDate(dataWithTime[0].creationTimestamp, i),
		).map((date) => formatDate(date));
		for (const date of labels) {
			const valuesForDay = groupedByDay[date] ?? [];
			const firstGameOfDay = valuesForDay[0];
			const xpForDay = firstGameOfDay
				? computeXpFromLevel(firstGameOfDay.levelAfterMatch, firstGameOfDay.creationTimestamp)
				: 0;
			const previousDayXp = !!values?.length ? values[values.length - 1] : 0;
			values.push(previousDayXp + xpForDay);
		}
		// } else {
		// 	values = finalData.map((match) => ladderRankToInt(match.playerRank)).filter((rank) => rank != null);
		// 	labels = Array.from(Array(values.length), (_, i) => i + 1).map((matchIndex) => '' + matchIndex);
		// }
		return {
			data: [
				{
					data: values,
					label: 'Rating',
				},
			],
			labels: labels,
		} as Value;
	}

	private isValidDate(stat: GameStat, seasonFilter: StatsXpGraphSeasonFilterType): boolean {
		switch (seasonFilter) {
			case 'season-1':
				return getSeason(stat.creationTimestamp) === xpSeason1;
			case 'season-2':
				return getSeason(stat.creationTimestamp) === xpSeason2;
			case 'all-seasons':
			default:
				return true;
		}
	}

	private compare(
		a: [GameStat[], StatsXpGraphSeasonFilterType],
		b: [GameStat[], StatsXpGraphSeasonFilterType],
	): boolean {
		if (a[1] !== b[1]) {
			// || a[2] !== b[2] || a[3] !== b[3] || a[4] !== b[4] || a[5]?.number !== b[5]?.number) {
			return false;
		}
		return arraysEqual(a[0], b[0]);
	}
}

interface Value {
	readonly data: ChartDataSets[];
	readonly labels: Label;
	readonly labelFormattingFn?: (label: string, index: number, labels: string[]) => string;
	readonly reverse?: boolean;
}