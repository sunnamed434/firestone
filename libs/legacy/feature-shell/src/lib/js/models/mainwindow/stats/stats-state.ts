// import { ArchetypeConfig } from '@firestone-hs/categorize-deck/dist/archetype-service';
// import { ArchetypeStats } from '@firestone-hs/cron-build-ranked-archetypes/dist/archetype-stats';
import { BgsBestStat } from '@firestone-hs/user-bgs-post-match-stats';
import { NonFunctionProperties } from '@firestone/shared/utils';
import { AppInjector } from '../../../services/app-injector';
import { LazyDataInitService } from '../../../services/lazy-data-init.service';
import { BgsPostMatchStats } from '../../battlegrounds/post-match/bgs-post-match-stats';
import { GameStats } from './game-stats';
import { StatsCategory } from './stats-category';
import { StatsFilters } from './stats-filters';

export class StatsState {
	readonly loading: boolean = true;
	readonly categories: readonly StatsCategory[] = [];
	readonly filters: StatsFilters = new StatsFilters();

	readonly gameStats: GameStats = new GameStats();
	// readonly archetypesConfig: readonly ArchetypeConfig[];
	// readonly archetypesStats: ArchetypeStats;

	readonly bestBgsUserStats: readonly BgsBestStat[] = undefined;

	public static create(base: Partial<NonFunctionProperties<StatsState>>): StatsState {
		return Object.assign(new StatsState(), base);
	}

	public update(base: Partial<NonFunctionProperties<StatsState>>): StatsState {
		return Object.assign(new StatsState(), this, base);
	}

	public getBestBgsUserStats(): readonly BgsBestStat[] {
		if (this.bestBgsUserStats === undefined) {
			console.log('bestBgsUserStats not initialized yet');
			(this.bestBgsUserStats as readonly BgsBestStat[]) = [];
			AppInjector.get<LazyDataInitService>(LazyDataInitService).requestLoad('user-bgs-best-stats');
		}
		return this.bestBgsUserStats;
	}

	public updateBgsPostMatchStats(reviewId: string, postMatchStats: BgsPostMatchStats): StatsState {
		const newGameStats: GameStats = this.gameStats.updateBgsPostMatchStats(reviewId, postMatchStats);
		return this.update({
			gameStats: newGameStats,
		} as StatsState);
	}

	public findCategory(categoryId: string): StatsCategory {
		const result = this.categories?.find((cat) => cat.id === categoryId);
		return result;
	}
}
