import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { GameStat } from '../../../../models/mainwindow/stats/game-stat';
import { AppUiStoreService, cdLog } from '../../../../services/ui-store/app-ui-store.service';

@Component({
	selector: 'duels-replays-recap',
	styleUrls: [
		`../../../../../css/global/components-global.scss`,
		`../../../../../css/component/duels/desktop/secondary/duels-replays-recap.component.scss`,
	],
	template: `
		<div class="duels-replays-recap" *ngIf="replays$ | async as replays">
			<div class="title">Last {{ replays.length }} replays</div>
			<ul class="list">
				<li *ngFor="let replay of replays">
					<replay-info [replay]="replay" [showStatsLabel]="null" [showReplayLabel]="null"></replay-info>
				</li>
			</ul>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelsReplaysRecapComponent {
	replays$: Observable<readonly GameStat[]>;

	constructor(private readonly store: AppUiStoreService) {
		this.replays$ = this.store
			.listen$(([main, nav]) => main.duels.personalDeckStats)
			.pipe(
				filter(([decks]) => !!decks?.length),
				map(([decks]) =>
					decks
						.map((deck) => deck.runs)
						.reduce((a, b) => a.concat(b), [])
						.map((run) => run.steps)
						.reduce((a, b) => a.concat(b), [])
						.filter((step) => (step as GameStat).opponentCardId)
						.map((step) => step as GameStat)
						.sort((a: GameStat, b: GameStat) => {
							if (a.creationTimestamp <= b.creationTimestamp) {
								return 1;
							}
							return -1;
						})
						.slice(0, 20),
				),
				tap((stat) => cdLog('emitting in ', this.constructor.name, stat)),
			);
	}
}
