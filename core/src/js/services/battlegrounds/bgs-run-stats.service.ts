import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { BgsBestStat } from '@firestone-hs/compute-bgs-run-stats/dist/model/bgs-best-stat';
import { Input as BgsComputeRunStatsInput } from '@firestone-hs/compute-bgs-run-stats/dist/model/input';
import { buildNewStats } from '@firestone-hs/compute-bgs-run-stats/dist/stats-builder';
import { BgsPostMatchStats as IBgsPostMatchStats } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import Worker from 'worker-loader!../../workers/bgs-post-match-stats.worker';
import { BgsGame } from '../../models/battlegrounds/bgs-game';
import { BgsPostMatchStatsForReview } from '../../models/battlegrounds/bgs-post-match-stats-for-review';
import { BgsPostMatchStats } from '../../models/battlegrounds/post-match/bgs-post-match-stats';
import { ApiRunner } from '../api-runner';
import { Events } from '../events.service';
import { BgsPersonalStatsSelectHeroDetailsWithRemoteInfoEvent } from '../mainwindow/store/events/battlegrounds/bgs-personal-stats-select-hero-details-with-remote-info-event';
import { BgsPostMatchStatsComputedEvent } from '../mainwindow/store/events/battlegrounds/bgs-post-match-stats-computed-event';
import { MainWindowStoreEvent } from '../mainwindow/store/events/main-window-store-event';
import { ShowMatchStatsEvent } from '../mainwindow/store/events/replays/show-match-stats-event';
import { GameForUpload } from '../manastorm-bridge/game-for-upload';
import { OverwolfService } from '../overwolf.service';
import { MemoryInspectionService } from '../plugins/memory-inspection.service';
import { PreferencesService } from '../preferences.service';
import { UserService } from '../user.service';
import { sleep } from '../utils';
import { BgsGameEndEvent } from './store/events/bgs-game-end-event';
import { BattlegroundsStoreEvent } from './store/events/_battlegrounds-store-event';

const BGS_UPLOAD_RUN_STATS_ENDPOINT = 'https://6x37md7760.execute-api.us-west-2.amazonaws.com/Prod/{proxy+}';
const BGS_RETRIEVE_RUN_STATS_ENDPOINT = ' https://pbd6q0rx4h.execute-api.us-west-2.amazonaws.com/Prod/{proxy+}';

@Injectable()
export class BgsRunStatsService {
	private bgsStateUpdater: EventEmitter<BattlegroundsStoreEvent>;
	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	private worker: Worker = new Worker();

	constructor(
		private readonly apiRunner: ApiRunner,
		private readonly http: HttpClient,
		private readonly events: Events,
		private readonly ow: OverwolfService,
		private readonly prefs: PreferencesService,
		private readonly userService: UserService,
		private readonly memoryService: MemoryInspectionService,
	) {
		this.events.on(Events.START_BGS_RUN_STATS).subscribe(async event => {
			this.computeRunStats(event.data[0], event.data[1], event.data[2], event.data[3]);
		});
		this.events.on(Events.POPULATE_HERO_DETAILS_FOR_BG).subscribe(async event => {
			this.computeHeroDetailsForBg(event.data[0]);
		});
		setTimeout(() => {
			this.bgsStateUpdater = this.ow.getMainWindow().battlegroundsUpdater;
			this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
		});
	}

	public async retrieveReviewPostMatchStats(reviewId: string): Promise<void> {
		const results = await this.apiRunner.callPostApiWithRetries<readonly BgsPostMatchStatsForReview[]>(
			`${BGS_RETRIEVE_RUN_STATS_ENDPOINT}`,
			{
				reviewId: reviewId,
			},
		);
		const result = results && results.length > 0 ? results[0] : null;
		console.log('[bgs-run-stats] post-match results for review', reviewId, results && results.length > 0);
		this.stateUpdater.next(new ShowMatchStatsEvent(reviewId, result?.stats));
	}

	private async computeHeroDetailsForBg(heroCardId: string) {
		const lastHeroPostMatchStats = await this.retrieveLastBgsRunStats(heroCardId);
		this.stateUpdater.next(new BgsPersonalStatsSelectHeroDetailsWithRemoteInfoEvent(lastHeroPostMatchStats));
	}

	private async retrieveLastBgsRunStats(
		heroCardId: string,
		numberOfStats?: number,
	): Promise<readonly BgsPostMatchStatsForReview[]> {
		const user = await this.userService.getCurrentUser();
		const input = {
			userId: user.userId,
			userName: user.username,
			heroCardId: heroCardId,
			limitResults: numberOfStats,
		};
		const results = await this.apiRunner.callPostApiWithRetries<readonly BgsPostMatchStatsForReview[]>(
			`${BGS_RETRIEVE_RUN_STATS_ENDPOINT}`,
			input,
		);
		console.log('[bgs-run-stats] last run stats', results);
		return results;
	}

	private async computeRunStats(
		reviewId: string,
		currentGame: BgsGame,
		bestBgsUserStats: readonly BgsBestStat[],
		game: GameForUpload,
	) {
		console.log('[bgs-run-stats] starting to compute run stats');
		const prefs = await this.prefs.getPreferences();
		const user = await this.userService.getCurrentUser();
		const newMmr = parseInt(game.newPlayerRank);
		// const newMmr = await this.getNewRating(currentGame.mmrAtStart);

		const input: BgsComputeRunStatsInput = {
			reviewId: reviewId,
			heroCardId: currentGame.getMainPlayer()?.cardId,
			userId: user.userId,
			userName: user.username,
			battleResultHistory: currentGame.battleResultHistory.map(history => ({
				...history,
				simulationResult: { ...history.simulationResult, outcomeSamples: undefined },
			})),
			mainPlayer: currentGame.getMainPlayer(),
			faceOffs: currentGame.faceOffs,
			oldMmr: currentGame.mmrAtStart,
			newMmr: isNaN(newMmr) ? null : newMmr,
		};
		console.log('[bgs-run-stats] computing post-match stats input', input);

		const [postMatchStats, newBestValues] = this.populateObject(
			prefs.bgsUseLocalPostMatchStats
				? await this.buildStatsLocally(currentGame, game.uncompressedXmlReplay)
				: await this.buildStatsRemotely(input),
			input,
			bestBgsUserStats || [],
		);
		console.log('[bgs-run-stats] newBestVaues', newBestValues, postMatchStats);

		// Even if stats are computed locally, we still do it on the server so that we can
		// archive the data. However, this is non-blocking
		if (prefs.bgsUseLocalPostMatchStats) {
			// console.log('posting to endpoint');
			this.buildStatsRemotely(input);
		}
		console.log('[bgs-run-stats] postMatchStats built');
		this.bgsStateUpdater.next(new BgsGameEndEvent(postMatchStats, newBestValues, reviewId));
		this.stateUpdater.next(new BgsPostMatchStatsComputedEvent(postMatchStats, newBestValues));
	}

	private async buildStatsRemotely(input: BgsComputeRunStatsInput): Promise<IBgsPostMatchStats> {
		console.log('[bgs-run-stats] preparing to build stats remotely', input.reviewId);
		// Because it takes some time for the review to be processed, and we don't want to
		// use a lambda simply to wait, as it costs money :)
		await sleep(5000);
		console.log('[bgs-run-stats] contacting remote endpoint', input.reviewId);
		try {
			return (await this.http.post(BGS_UPLOAD_RUN_STATS_ENDPOINT, input).toPromise()) as IBgsPostMatchStats;
		} catch (e) {
			console.error('[bgs-run-stats] issue while posting post-match stats', input.reviewId, e);
		}
	}

	private async buildStatsLocally(currentGame: BgsGame, replayXml: string): Promise<IBgsPostMatchStats> {
		return new Promise<IBgsPostMatchStats>(resolve => {
			// const worker = new Worker();
			this.worker.onmessage = (ev: MessageEvent) => {
				// console.log('received worker message', ev);
				let resultData: IBgsPostMatchStats = JSON.parse(ev.data);
				resolve(resultData);
				resultData = null;
				// worker.terminate();
			};

			const input = {
				replayXml: replayXml,
				mainPlayer: currentGame.getMainPlayer(),
				battleResultHistory: currentGame.battleResultHistory,
				faceOffs: currentGame.faceOffs,
			};
			console.log('[bgs-run-stats] created worker');
			this.worker.postMessage(input);
			console.log('[bgs-run-stats] posted worker message');
		});
	}

	private populateObject(
		data: IBgsPostMatchStats,
		input: BgsComputeRunStatsInput,
		existingBestStats: readonly BgsBestStat[],
	): [BgsPostMatchStats, readonly BgsBestStat[]] {
		const result: BgsPostMatchStats = BgsPostMatchStats.create({
			...data,
			// We do this because the immutable maps are all messed up when going back and forth
			boardHistory: input.mainPlayer.boardHistory,
		});
		//console.log('computing new best stats', data, input, existingBestStats);
		const newBestStats = buildNewStats(
			existingBestStats,
			data,
			({
				mainPlayer: input.mainPlayer,
				reviewId: input.reviewId,
				userId: input.userName || input.userId,
			} as any) as BgsComputeRunStatsInput,
			`${new Date()
				.toISOString()
				.slice(0, 19)
				.replace('T', ' ')}.${new Date().getMilliseconds()}`,
		);
		const finalStats = this.mergeStats(existingBestStats, newBestStats);
		//console.log('built new best stats', newBestStats, finalStats);

		return [result, finalStats];
	}

	private mergeStats(existingBestStats: readonly BgsBestStat[], newBestStats: readonly BgsBestStat[]) {
		const statsToKeep = existingBestStats.filter(existing => !this.isStatIncluded(existing, newBestStats));
		//console.log('statsToKeep', newBestStats, statsToKeep);
		return [...newBestStats, ...statsToKeep];
	}

	private isStatIncluded(toFind: BgsBestStat, list: readonly BgsBestStat[]) {
		return list.find(existing => existing.statName === toFind.statName) != null;
	}

	private async getNewRating(previousRating: number): Promise<number> {
		return new Promise<number>(resolve => {
			this.getNewRatingInternal(previousRating, newRating => resolve(newRating));
		});
	}

	private async getNewRatingInternal(previousRating: number, callback, retriesLeft = 10) {
		if (retriesLeft <= 0) {
			// This actually happens quite a lot, as you can't get the new rating before
			// moving on to the next screen?
			// Check BaconEndGameScreen
			console.warn('[bgs-run-stats] Could not get new rating', previousRating);
			callback(previousRating);
			return;
		}
		const battlegroundsInfo = await this.memoryService.getBattlegroundsEndGame();
		const newRating = battlegroundsInfo ? battlegroundsInfo.newRating : undefined;
		if (newRating === previousRating) {
			setTimeout(() => this.getNewRatingInternal(previousRating, callback, retriesLeft - 1), 500);
			return;
		}
		callback(newRating);
	}
}
