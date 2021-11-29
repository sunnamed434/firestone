import { BattlegroundsAppState } from '../../../../../models/mainwindow/battlegrounds/battlegrounds-app-state';
import { MainWindowState } from '../../../../../models/mainwindow/main-window-state';
import { NavigationState } from '../../../../../models/mainwindow/navigation/navigation-state';
import { BgsInitService } from '../../../../battlegrounds/bgs-init.service';
import { BgsReloadCompositionsEvent } from '../../events/battlegrounds/bgs-reload-compositions-event';
import { Processor } from '../processor';

export class BgsReloadCompositionsProcessor implements Processor {
	constructor(private readonly bgs: BgsInitService) {}

	public async process(
		event: BgsReloadCompositionsEvent,
		currentState: MainWindowState,
		history,
		navigationState: NavigationState,
	): Promise<[MainWindowState, NavigationState]> {
		const newComps = await this.bgs.loadCompositions(event.sensitivity);
		return [
			currentState.update({
				battlegrounds: currentState.battlegrounds.update({
					compositions: newComps,
					loading: false,
				} as BattlegroundsAppState),
			} as MainWindowState),
			null,
		];
	}
}
