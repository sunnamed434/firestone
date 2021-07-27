import { Season1 } from './season-1';
import { Season2 } from './season-2';
import { Season } from './_season';

export const xpSeason1 = new Season1();
export const xpSeason2 = new Season2();
const allSeasons: readonly Season[] = [xpSeason1, xpSeason2];

export const computeXpFromLevel = (fullLevel: string, timestamp: number): number => {
	if (!fullLevel.includes('-')) {
		return;
	}

	const [level, xpInLevel] = fullLevel.split('-').map((info) => parseInt(info));
	const season: Season = getSeason(timestamp);
	if (!season) {
		return 0;
	}

	if (season === allSeasons[0]) {
		console.log('season 1', new Date(timestamp));
	}

	const baseXp = season.xpPerLevel.get(level) ?? 0;
	return baseXp + xpInLevel;
};

export const getSeason = (timestamp: number): Season => {
	return allSeasons.find(
		(season) => season.startDate.getTime() <= timestamp && timestamp <= season.endDate.getTime(),
	);
};