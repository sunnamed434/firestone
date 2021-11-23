import {
	AfterContentInit,
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
} from '@angular/core';
import { IOption } from 'ng-select';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil, tap } from 'rxjs/operators';
import { BgsActiveTimeFilterType } from '../../../../models/mainwindow/battlegrounds/bgs-active-time-filter.type';
import { NavigationBattlegrounds } from '../../../../models/mainwindow/navigation/navigation-battlegrounds';
import { BgsTimeFilterSelectedEvent } from '../../../../services/mainwindow/store/events/battlegrounds/bgs-time-filter-selected-event';
import { MainWindowStoreEvent } from '../../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../../services/overwolf.service';
import { AppUiStoreFacadeService } from '../../../../services/ui-store/app-ui-store-facade.service';
import { arraysEqual, formatPatch } from '../../../../services/utils';
import { AbstractSubscriptionComponent } from '../../../abstract-subscription.component';

@Component({
	selector: 'battlegrounds-time-filter-dropdown',
	styleUrls: [
		`../../../../../css/global/filters.scss`,
		`../../../../../css/component/app-section.component.scss`,
		`../../../../../css/component/filter-dropdown.component.scss`,
	],
	template: `
		<filter-dropdown
			*ngIf="filter$ | async as value"
			class="battlegrounds-time-filter-dropdown"
			[options]="value.options"
			[filter]="value.filter"
			[placeholder]="value.placeholder"
			[visible]="value.visible"
			(onOptionSelected)="onSelected($event)"
		></filter-dropdown>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsTimeFilterDropdownComponent
	extends AbstractSubscriptionComponent
	implements AfterContentInit, AfterViewInit {
	filter$: Observable<{ filter: string; placeholder: string; options: readonly IOption[]; visible: boolean }>;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(
		private readonly ow: OverwolfService,
		protected readonly store: AppUiStoreFacadeService,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(store, cdr);
	}

	ngAfterContentInit() {
		this.filter$ = this.store
			.listen$(
				([main, nav, prefs]) => prefs.bgsActiveTimeFilter,
				([main, nav]) => main.battlegrounds.currentBattlegroundsMetaPatch,
				([main, nav]) => nav.navigationBattlegrounds.selectedCategoryId,
				([main, nav]) => nav.navigationBattlegrounds.currentView,
			)
			.pipe(
				filter(
					([filter, patch, selectedCategoryId, currentView]) =>
						!!filter && !!patch && !!selectedCategoryId && !!currentView,
				),
				distinctUntilChanged((a, b) => arraysEqual(a, b)),
				map(([filter, patch, selectedCategoryId, currentView]) => {
					const options: readonly TimeFilterOption[] = [
						{
							value: 'all-time',
							label: getBgsTimeFilterLabelFor('all-time', selectedCategoryId),
						} as TimeFilterOption,
						{
							value: 'past-seven',
							label: getBgsTimeFilterLabelFor('past-seven', selectedCategoryId),
						} as TimeFilterOption,
						{
							value: 'past-three',
							label: getBgsTimeFilterLabelFor('past-three', selectedCategoryId),
						} as TimeFilterOption,
						{
							value: 'last-patch',
							label: getBgsTimeFilterLabelFor('last-patch', selectedCategoryId),
							tooltip: formatPatch(patch),
						} as TimeFilterOption,
					];
					return {
						filter: filter,
						options: options,
						placeholder: options.find((option) => option.value === filter)?.label,
						visible:
							!['categories', 'category'].includes(currentView) &&
							![
								'bgs-category-personal-stats',
								'bgs-category-perfect-games',
								'bgs-category-simulator',
							].includes(selectedCategoryId),
					};
				}),
				// FIXME
				tap((filter) => setTimeout(() => this.cdr?.detectChanges(), 0)),
				// tap((filter) => cdLog('emitting filter in ', this.constructor.name, filter)),
				takeUntil(this.destroyed$),
			);
	}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	onSelected(option: TimeFilterOption) {
		this.stateUpdater.next(new BgsTimeFilterSelectedEvent(option.value));
	}
}

interface TimeFilterOption extends IOption {
	value: BgsActiveTimeFilterType;
}

export const getBgsTimeFilterLabelFor = (
	filter: BgsActiveTimeFilterType,
	selectedCategoryId: NavigationBattlegrounds['selectedCategoryId'],
): string => {
	switch (filter) {
		case 'past-seven':
			return 'Past 7 days';
		case 'past-three':
			return 'Past 3 days';
		case 'last-patch':
			return 'Last patch';
		case 'all-time':
		default:
			return selectedCategoryId === 'bgs-category-personal-rating' ? 'Past 100 days' : 'Past 30 days';
	}
};
