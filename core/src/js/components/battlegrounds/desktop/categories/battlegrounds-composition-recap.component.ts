import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Entity } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { GameTag } from '@firestone-hs/reference-data';
import { Map } from 'immutable';
import {
	BgsCompositionStat,
	BgsCompositionStatCard,
} from '../../../../models/mainwindow/battlegrounds/bgs-composition-stat';
import { CardsFacadeService } from '../../../../services/cards-facade.service';
import { pickRandomElementInArray } from '../../../../services/utils';

@Component({
	selector: 'battlegrounds-composition-recap',
	styleUrls: [
		`../../../../../css/global/components-global.scss`,
		`../../../../../css/component/battlegrounds/desktop/categories/battlegrounds-composition-recap.component.scss`,
	],
	template: `
		<div class="battlegrounds-composition-recap">
			<div class="name">Unnamed comp</div>
			<div class="minions">
				<bgs-board [entities]="entities" [maxBoardHeight]="-1"></bgs-board>
			</div>
			<div class="stats">
				<div class="stat" *ngIf="averagePosition != null">
					<div class="label">Avg. position</div>
					<div class="value">{{ averagePosition.toFixed(2) }}</div>
				</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsCompositionRecapComponent {
	@Input() set stat(value: BgsCompositionStat) {
		this.entities = this.buildBoard(value);
		console.debug('built board', this.entities, value);
		this.averagePosition = value.averagePosition;
	}

	entities: readonly Entity[];
	averagePosition: number;

	constructor(private readonly allCards: CardsFacadeService) {}

	private buildBoard(value: BgsCompositionStat): readonly Entity[] {
		const boardExample = pickRandomElementInArray(value.buildExamples);
		let entityId = 1;
		if (!boardExample) {
			console.warn('empty example', value);
		}
		return boardExample.cardIds.map((cardId) => {
			const cardTemplate = value.cards.find((card) => card.cardId === cardId);
			const tags = this.buildTags(cardTemplate);
			// console.debug('cardTemplate', cardId, cardTemplate, tags.toJS(), value.cards, value);
			return {
				cardID: cardId,
				id: entityId++,
				damageForThisAction: null,
				tags: tags,
			};
		});
	}

	private buildTags(card: BgsCompositionStatCard): Map<string, number> {
		const refCard = this.allCards.getCard(card.cardId);
		return Map([
			[GameTag[GameTag.PREMIUM], !!refCard.battlegroundsNormalDbfId ? 1 : 0],
			[GameTag[GameTag.ATK], Math.floor(card.attack)],
			[GameTag[GameTag.HEALTH], Math.floor(card.health)],
			[GameTag[GameTag.DIVINE_SHIELD], Math.random() <= card.divineShield ? 1 : 0],
			[GameTag[GameTag.POISONOUS], Math.random() <= card.poisonous ? 1 : 0],
			[GameTag[GameTag.TAUNT], Math.random() <= card.taunt ? 1 : 0],
			[GameTag[GameTag.REBORN], Math.random() <= card.reborn ? 1 : 0],
			[GameTag[GameTag.WINDFURY], Math.random() <= card.windfury ? 1 : 0],
			[GameTag[GameTag.MEGA_WINDFURY], Math.random() <= card.megaWindfury ? 1 : 0],
		]);
	}
}
