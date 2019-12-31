import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BinderState } from '../../models/mainwindow/binder-state';
import { Navigation } from '../../models/mainwindow/navigation';
import { Set } from '../../models/set';
import { AllCardsService } from '../../services/all-cards.service';

const COLLECTION_HIDE_TRANSITION_DURATION_IN_MS = 150;

@Component({
	selector: 'collection',
	styleUrls: [
		`../../../css/component/app-section.component.scss`,
		`../../../css/component/collection/collection.component.scss`,
	],
	template: `
		<div class="app-section collection">
			<section class="main" [ngClass]="{ 'divider': _state.currentView === 'cards' }">
				<global-header [navigation]="navigation" *ngIf="navigation.text" [hidden]="_state.isLoading">
				</global-header>
				<sets
					[selectedFormat]="_state.selectedFormat"
					[standardSets]="standardSets"
					[wildSets]="wildSets"
					[hidden]="_state.currentView !== 'sets' || _state.isLoading"
				>
				</sets>
				<cards
					[cardList]="_state.cardList"
					[set]="_state.selectedSet"
					[searchString]="_state.searchString"
					[hidden]="_state.currentView !== 'cards' || _state.isLoading"
				>
				</cards>
				<full-card
					class="full-card"
					[selectedCard]="_state.selectedCard"
					[hidden]="_state.currentView !== 'card-details' || _state.isLoading"
				>
				</full-card>
				<loading-state [hidden]="!_state.isLoading"></loading-state>
			</section>
			<section class="secondary">
				<card-search [searchString]="_state.searchString" [searchResults]="_state.searchResults"></card-search>
				<card-history
					[selectedCard]="_state.selectedCard"
					[cardHistory]="_state.cardHistory"
					[shownHistory]="_state.shownCardHistory"
					[showOnlyNewCards]="_state.showOnlyNewCardsInHistory"
					[totalHistoryLength]="_state.totalHistoryLength"
				>
				</card-history>
			</section>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
	animations: [
		trigger('viewState', [
			state(
				'hidden',
				style({
					opacity: 0,
					'pointer-events': 'none',
				}),
			),
			state(
				'shown',
				style({
					opacity: 1,
				}),
			),
			transition('hidden <=> shown', animate(`${COLLECTION_HIDE_TRANSITION_DURATION_IN_MS}ms linear`)),
		]),
	],
})
export class CollectionComponent {
	_state: BinderState;
	@Input() navigation: Navigation;

	standardSets: Set[];
	wildSets: Set[];

	_viewState = 'shown';
	private refreshing = false;

	constructor(private cards: AllCardsService) {
		this.init();
	}

	private async init() {
		// First initialize the cards DB, as some of the dependencies injected in
		// app-bootstrap won't be able to start without the cards DB in place
		await this.cards.initializeCardsDb();
	}

	@Input('state') set state(state: BinderState) {
		this.standardSets = state.allSets.filter(set => set.standard);
		this.wildSets = state.allSets.filter(set => !set.standard);
		this._state = state;
		// console.log('set state in collection', this._state);
	}
}
