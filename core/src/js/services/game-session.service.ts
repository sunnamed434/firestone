import { Injectable } from '@angular/core';
import { BattlegroundsAppState } from '../models/mainwindow/battlegrounds/battlegrounds-app-state';
import { GameSessionState } from '../models/mainwindow/game-session/game-session-state';
import { GameStat } from '../models/mainwindow/stats/game-stat';
import { Events } from './events.service';
import { OverwolfService } from './overwolf.service';

@Injectable()
export class GameSessionService {
	constructor(private readonly events: Events, private readonly ow: OverwolfService) {
		this.initControls();
	}

	public initState(bgState: BattlegroundsAppState): GameSessionState {
		const bgMatchesWithRank = bgState.matchStats.filter((stat) => stat.newPlayerRank || stat.playerRank);
		const bgLastMatchWithRank = bgMatchesWithRank?.length ? bgMatchesWithRank[0] : null;
		const startingBgsMmrStr: string = bgLastMatchWithRank?.newPlayerRank ?? bgLastMatchWithRank?.playerRank;
		return GameSessionState.create({
			startingBgsMmr: startingBgsMmrStr ? +startingBgsMmrStr : null,
			matches: [] as readonly GameStat[],
		} as GameSessionState);
	}

	// Control the overlay?
	private initControls() {
		// this.ow.onGameExit(() => {
		// 	this.hideOverlay();
		// });
		// this.ow.onGameStart(() => {
		// 	this.showOverlay();
		// });
		// this.events.on(Events.OPEN_SESSION_WINDOW).subscribe(() => this.hideOverlay());
		// this.events.on(Events.CLOSE_SESSION_WINDOW).subscribe(() => this.closeOverlay());
		// this.ow.addHotKeyPressedListener('gamesession', async (hotkeyResult) => {
		// 	const window = await this.ow.getCollectionWindow(OverwolfService.GAME_SESSION_WINDOW);
		// 	// console.log('retrieved', prefs, window);
		// 	if (window.isVisible) {
		// 		this.hideOverlay();
		// 	} else {
		// 		this.showOverlay();
		// 	}
		// });
	}
}
