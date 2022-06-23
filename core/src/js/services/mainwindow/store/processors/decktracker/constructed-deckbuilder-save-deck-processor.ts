import { MainWindowState } from '@models/mainwindow/main-window-state';
import { NavigationState } from '@models/mainwindow/navigation/navigation-state';
import { Processor } from '@services/mainwindow/store/processors/processor';
import { PreferencesService } from '@services/preferences.service';
import { DeckSummary } from '../../../../../models/mainwindow/decktracker/deck-summary';
import { DecksStateBuilderService } from '../../../../decktracker/main/decks-state-builder.service';
import { ConstructedDeckbuilderSaveDeckEvent } from '../../events/decktracker/constructed-deckbuilder-save-deck-event';

export class ConstructedDeckbuilderSaveDeckProcessor implements Processor {
	constructor(private readonly prefs: PreferencesService, private readonly stateBuilder: DecksStateBuilderService) {}

	public async process(
		event: ConstructedDeckbuilderSaveDeckEvent,
		currentState: MainWindowState,
		history,
		navigationState: NavigationState,
	): Promise<[MainWindowState, NavigationState]> {
		console.debug('saving deck', event);
		const prefs = await this.prefs.getPreferences();
		const newDeck: DeckSummary = {
			class: currentState.decktracker.deckbuilder.currentClass,
			format: currentState.decktracker.deckbuilder.currentFormat,
			deckstring: event.deckstring,
			isPersonalDeck: true,
			deckName: event.deckName,
			lastUsedTimestamp: new Date().getTime(),
		} as DeckSummary;
		const existingDecks = [...prefs.constructedPersonalAdditionalDecks, newDeck].map((deck) =>
			deck.deckstring !== event.deckstring ? deck : { ...deck, ...newDeck },
		);
		console.debug('existingDecks', existingDecks, newDeck);
		const newPrefs = { ...prefs, constructedPersonalAdditionalDecks: existingDecks };
		await this.prefs.savePreferences(newPrefs);
		console.debug('newPrefs', newPrefs);
		const newDecks = this.stateBuilder.buildState(
			currentState.stats,
			currentState.decktracker.filters,
			currentState.decktracker.patch,
			newPrefs,
		);
		console.debug('newDecks', newDecks);
		const newDecktrackerState = currentState.decktracker.update({
			decks: newDecks,
		});
		return [
			currentState.update({
				decktracker: newDecktrackerState,
			}),
			null,
		];
	}
}