import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { BgsCompositionStat } from '../../../../models/mainwindow/battlegrounds/bgs-composition-stat';
import { BgsReloadCompositionsEvent } from '../../../../services/mainwindow/store/events/battlegrounds/bgs-reload-compositions-event';
import { AppUiStoreFacadeService } from '../../../../services/ui-store/app-ui-store-facade.service';
import { cdLog } from '../../../../services/ui-store/app-ui-store.service';
import { areDeepEqual } from '../../../../services/utils';
import { AbstractSubscriptionComponent } from '../../../abstract-subscription.component';

@Component({
	selector: 'battlegrounds-compositions',
	styleUrls: [
		`../../../../../css/global/components-global.scss`,
		`../../../../../css/component/battlegrounds/desktop/categories/battlegrounds-compositions.component.scss`,
	],
	template: `
		<div class="battlegrounds-compositions">
			<input [(ngModel)]="sensitivity" />
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
export class BattlegroundsCompositionsComponent extends AbstractSubscriptionComponent implements AfterContentInit {
	stats$: Observable<readonly BgsCompositionStat[]>;
	sensitivity = 3.6;

	constructor(protected readonly store: AppUiStoreFacadeService, protected readonly cdr: ChangeDetectorRef) {
		super(store, cdr);
	}

	ngAfterContentInit(): void {
		this.stats$ = this.store
			.listen$(([main, nav]) => main.battlegrounds.compositions)
			.pipe(
				tap((info) => cdLog('info', info)),
				map(([stats]) => stats?.filter((stat) => stat)),
				// tap((info) => cdLog('info2', info)),
				distinctUntilChanged((a, b) => {
					// console.debug('changed deep?', a, b, JSON.stringify(a), JSON.stringify(b));
					return areDeepEqual(a, b);
				}),
				this.mapData((stats) => [...stats].sort((a, b) => a.averagePosition - b.averagePosition)),
				// tap((info) => cdLog('info3', info)),
				// // FIXME
				// tap((filter) => setTimeout(() => this.cdr?.detectChanges(), 0)),
				// tap((stats) => cdLog('emitting stats in ', this.constructor.name, stats)),
			);
	}

	trackByFn(index: number, stat: BgsCompositionStat) {
		return stat.id;
	}

	reload() {
		console.debug('reloading');
		this.store.send(new BgsReloadCompositionsEvent(this.sensitivity));
	}
}
