import { MainWindowStoreEvent } from '../main-window-store-event';

export class BgsReloadCompositionsEvent implements MainWindowStoreEvent {
	public static eventName(): string {
		return 'BgsReloadCompositionsEvent';
	}

	public eventName(): string {
		return 'BgsReloadCompositionsEvent';
	}

	public isNavigationEvent(): boolean {
		return false;
	}
}
