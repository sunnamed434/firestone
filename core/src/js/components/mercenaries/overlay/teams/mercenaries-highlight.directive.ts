import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, HostListener, Input, Renderer2 } from '@angular/core';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { Preferences } from '../../../../models/preferences';
import { CardsFacadeService } from '../../../../services/cards-facade.service';
import {
	HighlightSelector,
	MercenariesSynergiesHighlightService,
} from '../../../../services/mercenaries/highlights/mercenaries-synergies-highlight.service';
import { OverwolfService } from '../../../../services/overwolf.service';
import { AppUiStoreService } from '../../../../services/ui-store/app-ui-store.service';

@Directive({
	selector: '[mercenariesHighlight]',
})
// See https://blog.angularindepth.com/building-tooltips-for-angular-3cdaac16d138
export class MercenariesHighlightDirective implements AfterViewInit {
	@Input('mercenariesHighlight') cardId = undefined;

	private highlightElement;
	private highlightService: MercenariesSynergiesHighlightService;

	constructor(
		private readonly store: AppUiStoreService,
		private readonly ow: OverwolfService,
		private readonly allCards: CardsFacadeService,
		private readonly cdr: ChangeDetectorRef,
		private readonly el: ElementRef,
		private readonly renderer: Renderer2,
	) {
		this.highlightService = this.ow.getMainWindow().mercenariesSynergiesHighlightService;

		this.store
			.listenMercenariesHighlights$(([selector, prefs]) => [selector, prefs] as [HighlightSelector, Preferences])
			.pipe(
				tap((info) => console.debug('tap 1', info)),
				filter(([[selector, prefs]]) => !!selector && !!prefs),
				tap((info) => console.debug('tap 2', info)),
				map(
					([[selector, prefs]]) =>
						prefs.mercenariesHighlightSynergies && selector(this.allCards.getCard(this.cardId)),
				),
				tap((info) => console.debug('tap 3', info)),
				distinctUntilChanged(),
			)
			.subscribe((highlighted) => this.highlight(highlighted));
	}

	ngAfterViewInit() {
		this.highlightElement = this.renderer.createElement('div');
		this.renderer.appendChild(this.el.nativeElement, this.highlightElement);
		this.renderer.addClass(this.highlightElement, 'highlight-overlay');
	}

	@HostListener('mouseenter')
	mouseEnterAbility() {
		this.highlightService.selectCardId(this.cardId);
	}

	@HostListener('mouseleave')
	mouseLeaveAbility() {
		this.highlightService.unselectCardId();
	}

	private highlight(shouldHighlight: boolean) {
		if (this.highlightElement) {
			this.renderer.removeClass(this.highlightElement, 'active');
			if (shouldHighlight) {
				this.renderer.addClass(this.highlightElement, 'active');
			}
		}
	}
}