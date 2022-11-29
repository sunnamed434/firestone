import { Injectable } from '@angular/core';
import { BattlegroundsStoreService } from '../../js/services/battlegrounds/store/battlegrounds-store.service';
import { GameStateService } from '../../js/services/decktracker/game-state.service';
import { DecksProviderService } from '../../js/services/decktracker/main/decks-provider.service';
import { OverlayDisplayService } from '../../js/services/decktracker/overlay-display.service';
import { DuelsDecksProviderService } from '../../js/services/duels/duels-decks-provider.service';
import { GameNativeStateStoreService } from '../../js/services/game/game-native-state-store.service';
import { MainWindowStoreService } from '../../js/services/mainwindow/store/main-window-store.service';
import { MercenariesSynergiesHighlightService } from '../../js/services/mercenaries/highlights/mercenaries-synergies-highlight.service';
import { MercenariesStoreService } from '../../js/services/mercenaries/mercenaries-store.service';
import { MercenariesOutOfCombatService } from '../../js/services/mercenaries/out-of-combat/mercenaries-out-of-combat.service';
import { PreferencesService } from '../../js/services/preferences.service';
import { GameStatsProviderService } from '../../js/services/stats/game/game-stats-provider.service';
import { AppUiStoreService } from '../../js/services/ui-store/app-ui-store.service';
import { MailsService } from '../mails/services/mails.service';
import { TavernBrawlService } from '../tavern-brawl/services/tavern-brawl.service';

@Injectable()
export class BootstrapStoreServicesService {
	// All the constructors are there to start bootstrapping / registering everything
	constructor(
		private readonly store: AppUiStoreService,
		// TODO: this has a lot of dependencies, it should be refactored to limit the impact
		// and let the store be started up as soon as possible
		private readonly mainWindowStore: MainWindowStoreService,
		private readonly prefs: PreferencesService,
		private readonly gameState: GameStateService,
		private readonly gameNativeState: GameNativeStateStoreService,
		private readonly battlegroundsStore: BattlegroundsStoreService,
		private readonly mercenariesStore: MercenariesStoreService,
		private readonly mercenariesOutOfCombatStore: MercenariesOutOfCombatService,
		private readonly mercenariesSynergiesStore: MercenariesSynergiesHighlightService,
		private readonly mails: MailsService,
		private readonly tavernBrawl: TavernBrawlService,
		private readonly duelsDecksProviderService: DuelsDecksProviderService,
		private readonly decksProviderService: DecksProviderService,
		private readonly gameStatsProviderService: GameStatsProviderService,
		// Other dependencies
		private readonly decktrackerDisplayEventBus: OverlayDisplayService,
	) {}

	public async bootstrapServices(): Promise<void> {
		await this.initStore();
	}

	private async initStore() {
		this.store.start();
		await this.store.initComplete();
	}
}
