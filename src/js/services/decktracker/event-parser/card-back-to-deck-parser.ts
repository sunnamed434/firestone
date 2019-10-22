import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { ReferenceCard } from '../../../models/reference-cards/reference-card';
import { AllCardsService } from '../../all-cards.service';
import { DeckParserService } from '../deck-parser.service';
import { DeckEvents } from './deck-events';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class CardBackToDeckParser implements EventParser {
	constructor(private deckParser: DeckParserService, private allCards: AllCardsService) {}

	applies(gameEvent: GameEvent): boolean {
		return gameEvent.type === GameEvent.CARD_BACK_TO_DECK;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();
		const initialZone: string = gameEvent.additionalData.initialZone;

		const isPlayer = cardId && controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;
		const card = this.findCard(initialZone, deck, cardId, entityId);

		const newHand: readonly DeckCard[] = this.buildNewHand(initialZone, deck.hand, card);
		const newBoard: readonly DeckCard[] = this.buildNewBoard(initialZone, deck.board, card);
		const newOther: readonly DeckCard[] = this.buildNewOther(initialZone, deck.otherZone, card);
		const previousDeck = deck.deck;
		const newDeck: readonly DeckCard[] = DeckManipulationHelper.addSingleCardToZone(
			previousDeck,
			isPlayer ? card : DeckManipulationHelper.obfuscateCard(card),
		);
		// console.log('updated deck', isPlayer, newDeck, card);
		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			deck: newDeck,
			hand: newHand,
			board: newBoard,
			otherZone: newOther,
		} as DeckState);
		return Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
	}

	event(): string {
		return DeckEvents.CARD_BACK_TO_DECK;
	}

	private findCard(initialZone: string, deckState: DeckState, cardId: string, entityId: number): DeckCard {
		if (initialZone === 'HAND') {
			return DeckManipulationHelper.findCardInZone(deckState.hand, cardId, entityId);
		} else if (initialZone === 'PLAY') {
			return DeckManipulationHelper.findCardInZone(deckState.board, cardId, entityId);
		}
		if (['GRAVEYARD', 'REMOVEDFROMGAME', 'SETASIDE', 'SECRET'].indexOf(initialZone) !== -1) {
			return DeckManipulationHelper.findCardInZone(deckState.otherZone, cardId, entityId);
		}
		console.warn('could not find card in card-back-to-deck', initialZone, cardId, deckState);
		const dbCard = this.allCards.getCard(cardId) || ({} as ReferenceCard);
		return {
			cardId: cardId,
			entityId: entityId,
			cardName: dbCard.name,
			manaCost: dbCard.cost,
			rarity: dbCard.rarity ? dbCard.rarity.toLowerCase() : null,
		} as DeckCard;
	}

	private buildNewHand(
		initialZone: string,
		previousHand: readonly DeckCard[],
		movedCard: DeckCard,
	): readonly DeckCard[] {
		if (initialZone !== 'HAND') {
			return previousHand;
		}
		return DeckManipulationHelper.removeSingleCardFromZone(previousHand, movedCard.cardId, movedCard.entityId);
	}

	private buildNewOther(
		initialZone: string,
		previousOther: readonly DeckCard[],
		movedCard: DeckCard,
	): readonly DeckCard[] {
		if (['GRAVEYARD', 'REMOVEDFROMGAME', 'SETASIDE', 'SECRET'].indexOf(initialZone) !== -1) {
			return DeckManipulationHelper.removeSingleCardFromZone(previousOther, movedCard.cardId, movedCard.entityId);
		}
		return previousOther;
	}

	private buildNewBoard(
		initialZone: string,
		previousBOard: readonly DeckCard[],
		movedCard: DeckCard,
	): readonly DeckCard[] {
		if (initialZone !== 'PLAY') {
			return previousBOard;
		}
		return DeckManipulationHelper.removeSingleCardFromZone(previousBOard, movedCard.cardId, movedCard.entityId);
	}
}
