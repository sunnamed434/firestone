import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { BgsCompositionStat } from '../../../../models/mainwindow/battlegrounds/bgs-composition-stat';
import { ConstructedWindowHandler } from '../../../../services/decktracker/overlays/constructed-window-handler';
import { BgsTribesFilterSelectedEvent } from '../../../../services/mainwindow/store/events/battlegrounds/bgs-tribes-filter-selected-event';
import { MainWindowStoreEvent } from '../../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../../services/overwolf.service';
import { AppUiStoreService, cdLog } from '../../../../services/ui-store/app-ui-store.service';
import { areDeepEqual } from '../../../../services/utils';

@Component({
	selector: 'battlegrounds-compositions',
	styleUrls: [
		`../../../../../css/global/components-global.scss`,
		`../../../../../css/component/battlegrounds/desktop/categories/battlegrounds-compositions.component.scss`,
	],
	template: `
		<div class="battlegrounds-compositions">
			<div class="button" (click)="reload()">Reload</div>
			<ng-container *ngIf="{ stats: stats$ | async } as value">
				<ng-container *ngIf="value.stats">
					<battlegrounds-composition-recap
						*ngFor="let stat of value.stats; trackBy: trackByFn"
						[stat]="stat"
					></battlegrounds-composition-recap>
				</ng-container>
				<ng-container *ngIf="!value.stats">
					<div class="loading">Nothing here</div>
				</ng-container>
			</ng-container>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsCompositionsComponent implements AfterViewInit {
	stats$: Observable<readonly BgsCompositionStat[]>;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(
		private readonly ow: OverwolfService,
		private readonly store: AppUiStoreService,
		private readonly cdr: ChangeDetectorRef,
	) {
		this.stats$ = this.store
			.listen$(([main, nav]) => main.battlegrounds.compositions)
			.pipe(
				map(([stats]) => stats?.filter((stat) => stat)),
				distinctUntilChanged((a, b) => {
					// console.debug('changed deep?', a, b, JSON.stringify(a), JSON.stringify(b));
					return areDeepEqual(a, b);
				}),
				// FIXME
				tap((filter) => setTimeout(() => this.cdr?.detectChanges(), 0)),
				tap((stats) => cdLog('emitting stats in ', this.constructor.name, stats)),
			);
	}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	trackByFn(index: number, stat: BgsCompositionStat) {
		return stat.id;
	}

	reload() {
		console.debug('reloading');
		this.stateUpdater.next(new BgsTribesFilterSelectedEvent(null));
	}
}
