import { AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { groupByFunction } from '@firestone/shared/utils';
import { combineLatest, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { GameStat } from '../../../models/mainwindow/stats/game-stat';
import { MercenariesReferenceData } from '../../../services/mercenaries/mercenaries-state-builder.service';
import { isMercenariesPvP, normalizeMercenariesCardId } from '../../../services/mercenaries/mercenaries-utils';
import { AppUiStoreFacadeService } from '../../../services/ui-store/app-ui-store-facade.service';
import { AbstractSubscriptionComponent } from '../../abstract-subscription.component';
import { MercenaryPersonalTeamInfo } from './mercenary-info';

@Component({
	selector: 'mercenaries-my-teams',
	styleUrls: [
		`../../../../css/global/components-global.scss`,
		`../../../../css/component/mercenaries/desktop/mercenaries-my-teams.component.scss`,
	],
	template: `
		<div class="mercenaries-my-teams" scrollable>
			<ng-container *ngIf="teams$ | async as teams; else emptyState">
				<ul class="teams-list" scrollable>
					<mercenaries-personal-team-summary
						class="team"
						*ngFor="let team of teams"
						[team]="team"
					></mercenaries-personal-team-summary>
				</ul>
			</ng-container>
			<ng-template #emptyState> <mercenaries-empty-state></mercenaries-empty-state></ng-template>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MercenariesMyTeamsComponent extends AbstractSubscriptionComponent implements AfterContentInit {
	teams$: Observable<readonly MercenaryPersonalTeamInfo[]>;

	constructor(protected readonly store: AppUiStoreFacadeService, protected readonly cdr: ChangeDetectorRef) {
		super(store, cdr);
	}

	ngAfterContentInit() {
		this.teams$ = combineLatest(
			this.store.gameStats$(),
			this.store.listen$(
				([main, nav]) => main.mercenaries.getReferenceData(),
				([main, nav]) => main.mercenaries.getGlobalStats(),
				([main, nav, prefs]) => prefs.mercenariesActivePvpMmrFilter,
				([main, nav, prefs]) => prefs.mercenariesHiddenTeamIds,
				([main, nav, prefs]) => prefs.mercenariesShowHiddenTeams,
			),
		).pipe(
			filter(
				([gameStats, [referenceData, globalStats, mmrFilter, hiddenTeamIds, showHiddenTeams]]) =>
					!!referenceData?.mercenaries?.length,
			),
			this.mapData(([gameStats, [referenceData, globalStats, mmrFilter, hiddenTeamIds, showHiddenTeams]]) => {
				const mmrThreshold =
					globalStats?.pvp?.mmrPercentiles?.find((percentile) => percentile.percentile === mmrFilter)?.mmr ??
					0;
				const relevantStats = gameStats
					// Include the AI games here, as otherwise this is confusing
					?.filter((stat) => isMercenariesPvP(stat.gameMode))
					.filter((stat) => (mmrThreshold === 0 ? true : stat.playerRank && +stat.playerRank >= mmrThreshold))
					.filter((stat) => !!stat.mercHeroTimings?.length);
				const groupedByTeam = groupByFunction((stat: GameStat) =>
					this.normalizeMercDecklist(stat.mercHeroTimings, referenceData),
				)(relevantStats);
				const teams = Object.keys(groupedByTeam)
					.map((mercIds) => {
						const gamesForTeam = groupedByTeam[mercIds];
						const mercenariesCardIds = mercIds.split(',');
						return {
							id: mercIds,
							hidden: hiddenTeamIds.includes(mercIds),
							mercenariesCardIds: mercenariesCardIds,
							games: gamesForTeam,
						} as MercenaryPersonalTeamInfo;
					})
					.filter((team) => showHiddenTeams || !team.hidden);
				return teams.length === 0 ? null : teams;
			}),
		);
	}

	trackByFn(index: number, item: MercenaryPersonalTeamInfo) {
		return item.id;
	}

	private normalizeMercDecklist(
		timings: readonly {
			cardId: string;
			turnInPlay: number;
		}[],
		referenceData: MercenariesReferenceData,
	): string {
		return timings
			.map((info) => info.cardId)
			.map((cardId) => normalizeMercenariesCardId(cardId))
			.sort()
			.join(',');
	}
}
