import { AfterContentInit, ChangeDetectorRef, Directive, ElementRef, Renderer2 } from '@angular/core';
import { AppUiStoreFacadeService } from '../../services/ui-store/app-ui-store-facade.service';
import { AbstractSubscriptionComponent } from '../abstract-subscription.component';

@Directive({
	selector: '[advancedSetting]',
})
export class AdvancedSettingDirective extends AbstractSubscriptionComponent implements AfterContentInit {
	constructor(
		private readonly renderer: Renderer2,
		private readonly el: ElementRef,
		protected readonly store: AppUiStoreFacadeService,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(store, cdr);
	}

	ngAfterContentInit() {
		this.store
			.listenPrefs$((prefs) => prefs.advancedModeToggledOn)
			.pipe(this.mapData(([pref]) => pref))
			.subscribe((value) => this.updateVisibility(value));
	}

	private updateVisibility(advancedModeToggledOn: boolean) {
		this.renderer.setStyle(this.el.nativeElement, 'display', advancedModeToggledOn ? 'initial' : 'none');
	}
}
