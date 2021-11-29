import { MainWindowStoreEvent } from '../main-window-store-event';

export class BgsReloadCompositionsEvent implements MainWindowStoreEvent {
	constructor(public readonly sensitivity: number) {}

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
