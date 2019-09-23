import { RawRequirement } from '../../../../../models/achievement/raw-requirement';
import { GameEvent } from '../../../../../models/game-event';
import { AllCardsService } from '../../../../all-cards.service';
import { Requirement } from '../_requirement';

export class DeckbuildingClassicReq implements Requirement {
	private doesDeckMeetSpec: boolean;

	constructor(private readonly cards: AllCardsService) {}

	public static create(rawReq: RawRequirement, cards: AllCardsService): Requirement {
		return new DeckbuildingClassicReq(cards);
	}

	reset(): void {
		this.doesDeckMeetSpec = undefined;
	}

	afterAchievementCompletionReset(): void {
		this.doesDeckMeetSpec = undefined;
	}

	isCompleted(): boolean {
		return this.doesDeckMeetSpec;
	}

	test(gameEvent: GameEvent): void {
		if (gameEvent.type === GameEvent.LOCAL_PLAYER) {
			this.handleEvent(gameEvent);
		}
	}

	private handleEvent(gameEvent: GameEvent) {
		const deck = gameEvent.localPlayer.deck ? gameEvent.localPlayer.deck.deck : null;
		if (deck && deck.cards && deck.cards.length > 0) {
			const dbfIds = deck.cards.map(pair => pair[0]);
			const cards: any[] = this.cards.getCardsFromDbfIds(dbfIds);
			this.doesDeckMeetSpec = cards.every(
				card => card.set && ['core', 'expert1'].indexOf(card.set.toLowerCase()) !== -1,
			);
		} else {
			this.doesDeckMeetSpec = false;
		}
	}
}
