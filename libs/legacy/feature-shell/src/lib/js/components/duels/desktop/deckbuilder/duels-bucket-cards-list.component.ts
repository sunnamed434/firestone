import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { sortByProperties } from '@firestone/shared/utils';
import { SetCard } from '@models/set';

@Component({
	selector: 'duels-bucket-cards-list',
	styleUrls: [
		'../../../../../css/global/components-global.scss',
		`../../../../../css/global/scrollbar-decktracker-overlay.scss`,
		'../../../../../css/component/duels/desktop/deckbuilder/duels-bucket-cards-list.component.scss',
	],
	template: `
		<ng-scrollbar class="cards-list active" scrollable>
			<duels-bucket-card
				class="card"
				*ngFor="let card of _cards; trackBy: trackByCard"
				[ngClass]="{ dimmed: card.dimmed }"
				[card]="card"
				(click)="onBucketCardClick(card)"
			></duels-bucket-card>
		</ng-scrollbar>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelsBucketCardsListComponent {
	@Output() cardClick = new EventEmitter<BucketCard>();
	@Input() set cards(value: readonly BucketCard[]) {
		this._cards = [...value].sort(sortByProperties((c: BucketCard) => [c.dimmed]));
	}

	@Input() collection: readonly SetCard[];

	_cards: readonly BucketCard[];
	isScroll: boolean;

	constructor(private readonly el: ElementRef, private readonly cdr: ChangeDetectorRef) {}

	trackByCard(index: number, item: BucketCard) {
		return item.cardId;
	}

	onBucketCardClick(card: BucketCard) {
		this.cardClick.next(card);
	}
}

export interface BucketCard {
	readonly cardId: string;
	readonly cardName: string;
	readonly manaCost: number;
	readonly rarity: string;
	readonly offeringRate: number;
	readonly totalBuckets: number;
	readonly dimmed?: boolean;
}
