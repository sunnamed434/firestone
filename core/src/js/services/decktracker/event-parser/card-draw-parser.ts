import { CardIds, GameTag } from '@firestone-hs/reference-data';
import { DeckCard } from '../../../models/decktracker/deck-card';
import { DeckState } from '../../../models/decktracker/deck-state';
import { GameState } from '../../../models/decktracker/game-state';
import { GameEvent } from '../../../models/game-event';
import { CardsFacadeService } from '../../cards-facade.service';
import { cardsRevealedWhenDrawn, forceHideInfoWhenDrawnInfluencers, publicCardCreators } from '../../hs-utils';
import { LocalizationFacadeService } from '../../localization-facade.service';
import { DeckManipulationHelper } from './deck-manipulation-helper';
import { EventParser } from './event-parser';

export class CardDrawParser implements EventParser {
	constructor(
		private readonly helper: DeckManipulationHelper,
		private readonly allCards: CardsFacadeService,
		private readonly i18n: LocalizationFacadeService,
	) {}

	applies(gameEvent: GameEvent, state: GameState): boolean {
		return state && gameEvent.type === GameEvent.CARD_DRAW_FROM_DECK;
	}

	async parse(currentState: GameState, gameEvent: GameEvent): Promise<GameState> {
		const [cardId, controllerId, localPlayer, entityId] = gameEvent.parse();
		console.log('drawing from deck', cardId, gameEvent, currentState);
		const isPlayer = controllerId === localPlayer.PlayerId;
		const deck = isPlayer ? currentState.playerDeck : currentState.opponentDeck;

		const card = this.helper.findCardInZone(deck.deck, cardId, entityId, true);
		console.log('card in deck', card);

		const lastInfluencedByCardId = gameEvent.additionalData?.lastInfluencedByCardId ?? card.lastAffectedByCardId;

		const isCardDrawnBySecretPassage = forceHideInfoWhenDrawnInfluencers.includes(
			gameEvent.additionalData?.lastInfluencedByCardId,
		);
		const isTradable = !!this.allCards.getCard(cardId).mechanics?.includes(GameTag[GameTag.TRADEABLE]);
		console.log('drawing from deck', isTradable, this.allCards.getCard(cardId));
		const isCardInfoPublic =
			// Also includes a publicCardCreator so that cards drawn from deck when we know what they are (eg
			// Southsea Scoundrel) are flagged
			// Hide the info when card is drawn by Secret Passage? The scenario is:
			// 1. Add a card revealed when drawn to your deck
			// 2. Cast Secret Passage: the card is added to your hand, but the "cast when drawn" effect doesn't trigger
			// (no idea why it behaves like that)
			// 3. As a result, the card info is considered public, and we show it
			isPlayer ||
			(!isCardDrawnBySecretPassage &&
				(cardsRevealedWhenDrawn.includes(cardId as CardIds) ||
					// So that we prevent an info leak when a card traded back into the deck is drawn via a tutor
					(!isTradable && publicCardCreators.includes(lastInfluencedByCardId))));
		const isCreatorPublic =
			isCardInfoPublic || (!isTradable && publicCardCreators.includes(lastInfluencedByCardId));

		console.log('found card in zone', card, deck, cardId, entityId, isCardInfoPublic);

		const creatorCardId = gameEvent.additionalData?.creatorCardId;
		const cardWithCreator = card.update({
			creatorCardId: isCardInfoPublic ? creatorCardId : undefined,
			cardId: isCardInfoPublic ? card.cardId : undefined,
			// cardName: isCardInfoPublic ? card.cardName : undefined,
			cardName: isCardInfoPublic ? this.i18n.getCardName(card?.cardId) : undefined,
			lastAffectedByCardId: isCreatorPublic ? lastInfluencedByCardId : undefined,
		} as DeckCard);
		console.log('cardWithCreator', cardWithCreator, isCreatorPublic, publicCardCreators, lastInfluencedByCardId);
		const previousDeck = deck.deck;

		const newDeck: readonly DeckCard[] = isCardInfoPublic
			? this.helper.removeSingleCardFromZone(previousDeck, cardId, entityId, deck.deckList.length === 0, true)[0]
			: this.helper.removeSingleCardFromZone(previousDeck, null, -1, deck.deckList.length === 0, true)[0];
		//console.debug('newDeck', newDeck, isCardInfoPublic, previousDeck);
		const previousHand = deck.hand;
		const newHand: readonly DeckCard[] = this.helper.addSingleCardToZone(previousHand, cardWithCreator);
		console.log('added card to hand', newHand);
		const newPlayerDeck = Object.assign(new DeckState(), deck, {
			deck: newDeck,
			hand: newHand,
		});
		console.log('newPlayerDeck', newPlayerDeck);
		const result = Object.assign(new GameState(), currentState, {
			[isPlayer ? 'playerDeck' : 'opponentDeck']: newPlayerDeck,
		});
		console.log('result', result);
		return result;
	}

	event(): string {
		return GameEvent.CARD_DRAW_FROM_DECK;
	}
}
