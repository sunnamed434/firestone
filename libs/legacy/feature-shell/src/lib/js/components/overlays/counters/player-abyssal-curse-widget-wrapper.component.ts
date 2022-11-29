import {
	AfterContentInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	Renderer2,
} from '@angular/core';
import { CardIds } from '@firestone-hs/reference-data';
import { sumOnArray } from '@firestone/shared/utils';
import { CardsFacadeService } from '../../../services/cards-facade.service';
import { OverwolfService } from '../../../services/overwolf.service';
import { PreferencesService } from '../../../services/preferences.service';
import { AppUiStoreFacadeService } from '../../../services/ui-store/app-ui-store-facade.service';
import { AbstractCounterWidgetWrapperComponent, templateBase } from './abstract-counter-widget-wrapper.component';

@Component({
	selector: 'player-abyssal-curse-widget-wrapper',
	styleUrls: ['../../../../css/component/overlays/decktracker-player-widget-wrapper.component.scss'],
	template: templateBase,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerAbyssalCurseWidgetWrapperComponent
	extends AbstractCounterWidgetWrapperComponent
	implements AfterContentInit
{
	constructor(
		private readonly allCards: CardsFacadeService,
		protected readonly ow: OverwolfService,
		protected readonly el: ElementRef,
		protected readonly prefs: PreferencesService,
		protected readonly renderer: Renderer2,
		protected readonly store: AppUiStoreFacadeService,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(ow, el, prefs, renderer, store, cdr);
		this.side = 'player';
		this.activeCounter = 'abyssalCurse';
	}

	ngAfterContentInit(): void {
		this.prefExtractor = (prefs) => prefs.playerAbyssalCurseCounter;
		this.deckStateExtractor = (state) =>
			!!state.playerDeck?.abyssalCurseHighestValue ||
			!!sumOnArray(
				state.playerDeck?.hand.filter((c) => c.cardId == CardIds.SirakessCultist_AbyssalCurseToken),
				(c) => c.mainAttributeChange + 1,
			);
		super.ngAfterContentInit();
	}
}
