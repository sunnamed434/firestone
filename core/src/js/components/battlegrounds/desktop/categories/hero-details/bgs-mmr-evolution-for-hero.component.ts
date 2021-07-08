import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	OnDestroy,
	ViewChild,
	ViewRef
} from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import { fromEvent, Subscription } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';
import { debounceTime, distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { GameStat } from '../../../../../models/mainwindow/stats/game-stat';
import { AppUiStoreService, cdLog, currentBgHeroId } from '../../../../../services/app-ui-store.service';
import { arraysEqual } from '../../../../../services/utils';

@Component({
	selector: 'bgs-mmr-evolution-for-hero',
	styleUrls: [
		`../../../../../../css/global/components-global.scss`,
		`../../../../../../css/component/battlegrounds/desktop/categories/hero-details/bgs-mmr-evolution-for-hero.component.scss`,
	],
	template: `
		<div class="bgs-mmr-evolution-for-hero">
			<div class="container-1">
				<div style="display: flex; position: relative; height: 100%; width: 100%;">
					<canvas
						#chart
						*ngIf="value$ | async as value; else emptyState"
						baseChart
						[datasets]="value.data"
						[labels]="value.labels"
						[options]="lineChartOptions"
						[colors]="colors"
						[legend]="false"
						[chartType]="'line'"
					></canvas>
					<ng-template #emptyState>
						<battlegrounds-empty-state
							subtitle="Start playing Battlegrounds with this hero to collect some information"
						></battlegrounds-empty-state
					></ng-template>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsMmrEvolutionForHeroComponent implements AfterViewInit, OnDestroy {
	@ViewChild('chart', { static: false }) chart: ElementRef;

	value$: Observable<Value>;
	colors: Color[] = [];
	colors$$: Subscription;
	lineChartOptions: ChartOptions = this.buildOptions();

	constructor(
		private readonly el: ElementRef,
		private readonly cdr: ChangeDetectorRef,
		private readonly store: AppUiStoreService,
	) {
		this.value$ = this.store
			.listen$(
				([main, nav]) => main.stats.gameStats.stats.filter((stat) => stat.gameMode === 'battlegrounds'),
				([main, nav]) => currentBgHeroId(main, nav),
			)
			.pipe()
			.pipe(
				filter(([heroStats, heroId]) => !!heroStats && !!heroId),
				distinctUntilChanged((a, b) => arraysEqual(a, b)),
				map(([heroStats, heroId]) => this.buildValue(heroStats, heroId)),
				tap((values: Value) => cdLog('emitting in ', this.constructor.name, values)),
			);
		this.colors$$ = fromEvent(window, 'resize')
			.pipe(
				debounceTime(100),
				distinctUntilChanged(),
				map(() => this.getColors()),
				tap((colors: Color[]) => cdLog('emitting colors in ', this.constructor.name, colors)),
			)
			// Do this because using the observable directly makes it difficult to have an
			// initial value (I tried several approaches but didn't manage to have one)
			.subscribe((colors) => {
				this.colors = colors;
				if (!(this.cdr as ViewRef)?.destroyed) {
					this.cdr.detectChanges();
				}
			});
	}

	ngOnDestroy() {
		this.colors$$?.unsubscribe();
	}

	ngAfterViewInit() {
		setTimeout(() => {
			// Because the gradient requires an absolute value in pixels, we need to get
			// the size of the container, which in turn means we need to wait until the
			// canvas has been fully rendered
			this.colors = this.getColors();
			if (!(this.cdr as ViewRef)?.destroyed) {
				this.cdr.detectChanges();
			}
		});
	}

	private buildValue(matchStats: readonly GameStat[], heroId: string) {
		const mmrDeltas = matchStats
			.filter((match) => match.playerCardId === heroId)
			.filter((match) => match.playerRank && match.newPlayerRank)
			.map((match) => parseInt(match.newPlayerRank) - parseInt(match.playerRank))
			.reverse();
		const finalResult = [0];
		for (let i = 0; i < mmrDeltas?.length; i++) {
			finalResult[i + 1] = finalResult[i] + mmrDeltas[i];
		}
		const result = {
			data: [
				{
					data: finalResult,
					label: 'Rating',
				},
			],
			labels: Array.from(Array(finalResult.length), (_, i) => i + 1).map((matchIndex) => '' + matchIndex),
		};
		console.debug('result', result);
		return result;
	}

	private getColors(label?: string): Color[] {
		return [
			{
				backgroundColor: this.getBackgroundColor(),
				borderColor: '#CE73B4',
				pointBackgroundColor: 'transparent',
				pointBorderColor: 'transparent',
				pointHoverBackgroundColor: 'transparent',
				pointHoverBorderColor: 'transparent',
			},
		];
	}

	private getBackgroundColor(): string {
		if (!this.chart?.nativeElement) {
			console.debug('no native element, not returning gradient', this.chart);
			return;
		}

		const chartContainer = this.el.nativeElement.querySelector('.container-1');
		const rect = chartContainer?.getBoundingClientRect();
		const chartHeight = rect.height;
		const gradient = this.chart.nativeElement
			?.getContext('2d')
			?.createLinearGradient(0, 0, 0, Math.round(chartHeight));
		if (!gradient) {
			console.debug('no gradient, returning', chartHeight);
			return;
		}

		gradient.addColorStop(0, 'rgba(206, 115, 180, 0.8)'); // #CE73B4
		gradient.addColorStop(0.4, 'rgba(206, 115, 180, 0.4)');
		gradient.addColorStop(1, 'rgba(206, 115, 180, 0)');
		return gradient as any;
	}

	private buildOptions(): ChartOptions {
		return {
			responsive: true,
			maintainAspectRatio: false,
			layout: {
				padding: 0,
			},
			plugins: {
				datalabels: {
					display: false,
				},
			},
			scales: {
				xAxes: [
					{
						gridLines: {
							color: '#841063',
						},
						ticks: {
							fontColor: '#D9C3AB',
							fontFamily: 'Open Sans',
							fontStyle: 'normal',
							maxTicksLimit: 15,
						},
					},
				],
				yAxes: [
					{
						id: 'delta-stats',
						position: 'left',
						gridLines: {
							color: '#40032E',
						},
						ticks: {
							fontColor: '#D9C3AB',
							fontFamily: 'Open Sans',
							fontStyle: 'normal',
							beginAtZero: true,
						},
					},
				],
			},
			tooltips: {
				mode: 'index',
				position: 'nearest',
				intersect: false,
				backgroundColor: '#CE73B4',
				// titleFontSize: 0,
				titleFontFamily: 'Open Sans',
				titleFontColor: '#40032E',
				bodyFontFamily: 'Open Sans',
				bodyFontColor: '#40032E',
				xPadding: 5,
				yPadding: 5,
				caretSize: 10,
				caretPadding: 2,
				cornerRadius: 0,
				displayColors: false,
				enabled: true,
			},
		};
	}
}

interface Value {
	readonly data: ChartDataSets[];
	readonly labels: Label;
}
