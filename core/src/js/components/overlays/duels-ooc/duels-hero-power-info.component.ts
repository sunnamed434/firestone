import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SimpleBarChartData } from '@components/common/chart/simple-bar-chart-data';
import { DuelsHeroInfoTopDeck, DuelsHeroPowerInfo } from '@components/overlays/duels-ooc/duels-hero-info';
import { LocalizationFacadeService } from '@services/localization-facade.service';

@Component({
	selector: 'duels-hero-power-info',
	styleUrls: [
		'../../../../css/global/components-global.scss',
		'../../../../css/component/overlays/duels-ooc/duels-hero-power-info.component.scss',
	],
	template: `
		<div class="hero-power-info">
			<div class="bio">
				<div class="name">{{ name }}</div>
				<div class="images-container">
					<div class="images">
						<img [src]="heroPortrait" class="portrait" />
						<div class="hero-power">
							<div class="hero-power-container">
								<img [src]="heroPowerImage" class="image" />
								<img
									src="https://static.zerotoheroes.com/hearthstone/asset/coliseum/images/hero/hero_power.png"
									class="frame"
								/>
							</div>
						</div>
					</div>
				</div>
				<div class="stats">
					<div class="stat">
						<div class="header" [owTranslate]="'duels.hero-info.winrate-label'"></div>
						<div class="values">
							<div
								class="global-value"
								[helpTooltip]="'duels.hero-info.community-value-tooltip' | owTranslate"
							>
								{{ buildValue(globalWinrate, 1) }}%
							</div>
							<div class="my-value" [helpTooltip]="'duels.hero-info.your-value-tooltip' | owTranslate">
								({{ buildValue(playerWinrate, 1) }}%)
							</div>
						</div>
					</div>
					<div class="stat">
						<div class="header" [owTranslate]="'duels.hero-info.popularity-label'"></div>
						<div class="values">
							<div
								class="global-value"
								[helpTooltip]="'duels.hero-info.community-value-tooltip' | owTranslate"
							>
								{{ buildValue(globalPopularity, 1) }}%
							</div>
							<div class="my-value" [helpTooltip]="'duels.hero-info.your-value-tooltip' | owTranslate">
								({{ playerMatches }})
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="win-distribution-section">
				<div
					class="section-header"
					[owTranslate]="'duels.hero-info.win-distribution-header' | owTranslate"
				></div>
				<basic-bar-chart
					*ngIf="globalWinDistribution?.data?.length > 0"
					class="win-distribution"
					[data]="globalWinDistribution"
					[id]="'duels-hero-vignette-overlay' + name"
					[tooltipTitle]="'duels.hero-info.win-distribution-tooltip' | owTranslate"
				></basic-bar-chart>
			</div>
			<div class="top-decks-section">
				<div
					class="section-header top-decks-header"
					[owTranslate]="'duels.hero-info.top-decks-header' | owTranslate"
				></div>
				<div class="top-decks" *ngIf="decks?.length">
					<div class="deck" *ngFor="let deck of decks; trackBy: trackByDeck">
						<div class="icons">
							<img [src]="getArt(deck.heroCardId)" class="hero-icon" />
							<img [src]="getArt(deck.heroPowerCardId)" class="hero-power-icon" />
							<img [src]="getArt(deck.signatureTreasureCardId)" class="signature-treasure-icon" />
						</div>
						<div class="recap">
							<div class="wins">{{ deck.wins }}</div>
							<div class="wins-separator">-</div>
							<div class="losses">{{ deck.losses }}</div>
							<div class="dust-separator"></div>
							<div class="dust">
								<div class="dust-amount">{{ deck.dust }}</div>
								<div class="dust-icon" inlineSVG="assets/svg/rewards/reward_dust.svg"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelsHeroPowerInfoComponent {
	@Input() set heroPowerInfo(value: DuelsHeroPowerInfo) {
		// console.debug('setting hero info', value);
		this.heroPortrait = this.i18n.getCardImage(value.heroCardId, { isHighRes: true, isHeroSkin: true });
		this.heroPowerImage = `https://static.zerotoheroes.com/hearthstone/cardart/256x/${value.cardId}.jpg`;
		this.name = value.name;
		this.globalWinrate = value.globalWinrate;
		this.playerWinrate = value.playerWinrate;
		this.globalPopularity = value.globalPopularity;
		this.playerMatches = this.i18n.translateString('duels.hero-info.player-matches', {
			value: value.playerMatches,
		});
		this.globalWinDistribution = {
			data:
				value.globalWinDistribution?.map((input) => ({
					label: '' + input.winNumber,
					// To never show an empty bar
					value: Math.max(input.value, 0.5),
				})) ?? [],
		} as SimpleBarChartData;
		this.decks = value.topDecks.slice(0, 6);
	}

	heroPortrait: string;
	heroPowerImage: string;
	name: string;
	globalWinrate: number;
	playerWinrate: number;
	globalPopularity: number;
	playerMatches: string;
	globalWinDistribution: SimpleBarChartData;
	decks: readonly DuelsHeroInfoTopDeck[];

	constructor(private readonly i18n: LocalizationFacadeService) {}

	buildValue(value: number, decimals = 2): string {
		if (value === 100) {
			return '100';
		}
		return !value ? '-' : value.toFixed(decimals);
	}

	getArt(cardId: string): string {
		return `https://static.zerotoheroes.com/hearthstone/cardart/256x/${cardId}.jpg`;
	}
}
