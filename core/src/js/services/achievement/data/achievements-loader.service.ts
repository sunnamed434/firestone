import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Achievement } from '../../../models/achievement';
import { RawAchievement } from '../../../models/achievement/raw-achievement';
import { Challenge } from '../achievements/challenges/challenge';
import { ChallengeBuilderService } from '../achievements/challenges/challenge-builder.service';

const ACHIEVEMENTS_URL = 'https://static.zerotoheroes.com/hearthstone/data/achievements';

@Injectable()
export class AchievementsLoaderService {
	public challengeModules: readonly Challenge[];

	private achievements: readonly Achievement[];

	constructor(private http: HttpClient, private challengeBuilder: ChallengeBuilderService) {}

	public async getAchievement(achievementId: string): Promise<Achievement> {
		await this.waitForInit();
		return this.achievements.find(achievement => achievement.id === achievementId);
	}

	public async getAchievementsById(achievementIds: readonly string[]): Promise<readonly Achievement[]> {
		if (!achievementIds) {
			return [];
		}
		await this.waitForInit();
		return this.achievements.filter(achievement => achievementIds.indexOf(achievement.id) !== -1);
	}

	public async getAchievements(): Promise<readonly Achievement[]> {
		// console.log('[achievements-loader] Getting achievements');
		await this.waitForInit();
		return this.achievements;
	}

	public async getChallengeModules(): Promise<readonly Challenge[]> {
		// console.log('[achievements-loader] Getting modules');
		await this.waitForInit();
		return this.challengeModules;
	}

	public async initializeAchievements(): Promise<[readonly Achievement[], readonly Challenge[]]> {
		console.log('[achievements-loader] Initializing achievements');
		const rawAchievements: readonly RawAchievement[] = await this.loadAll();
		console.log('[achievements-loader] loaded all', rawAchievements.length);
		return new Promise<[readonly Achievement[], readonly Challenge[]]>(resolve => {
			this.achievements = rawAchievements.map(rawAchievement => this.wrapRawAchievement(rawAchievement));
			this.challengeModules = rawAchievements
				.map(rawAchievement => this.challengeBuilder.buildChallenge(rawAchievement))
				.filter(challenge => challenge);
			console.log('[achievements-loader] init over', this.achievements.length, this.challengeModules.length);
			resolve([this.achievements, this.challengeModules]);
		});
	}

	private async loadAll(): Promise<readonly RawAchievement[]> {
		console.log('[achievements-loader] loading all achievements');
		const achievementFiles = [
			'hearthstone_game',
			'global',
			'battlegrounds2',
			'dungeon_run',
			'monster_hunt',
			'rumble_run',
			'dalaran_heist',
			'tombs_of_terror',
			'amazing_plays',
			'competitive_ladder',
			'deckbuilding',
			'galakrond',
			'thijs',
		];
		const achievementsArray = await Promise.all(achievementFiles.map(fileName => this.loadAchievements(fileName)));
		const result = achievementsArray.reduce((a, b) => a.concat(b), []);
		console.log('[achievements-loader] returning full achievements', result && result.length);
		return result;
	}

	private async loadAchievements(fileName: string): Promise<readonly RawAchievement[]> {
		return new Promise<readonly RawAchievement[]>((resolve, reject) => {
			console.log('[achievements-loader] retrieving local achievements', fileName);
			this.http.get(`${ACHIEVEMENTS_URL}/${fileName}.json?v=8`).subscribe(
				(result: any[]) => {
					console.log('[achievements-loader] retrieved all achievements from CDN', fileName);
					resolve(result);
				},
				error => {
					console.error('[achievements-loader] Could not retrieve achievements from CDN', fileName, error);
				},
			);
		});
	}

	private wrapRawAchievement(raw: RawAchievement): Achievement {
		const { requirements, resetEvents, ...achievement } = raw;
		return Object.assign(new Achievement(), achievement, {
			numberOfCompletions: 0,
		} as Achievement);
	}

	private waitForInit(): Promise<void> {
		return new Promise<void>(resolve => {
			const dbWait = () => {
				if (this.achievements && this.challengeModules) {
					resolve();
				} else {
					// console.log('[achievements-loader] waiting for init');
					setTimeout(() => dbWait(), 50);
				}
			};
			dbWait();
		});
	}
}
