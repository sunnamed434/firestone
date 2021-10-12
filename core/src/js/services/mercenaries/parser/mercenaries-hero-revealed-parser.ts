import { GameEvent } from '../../../models/game-event';
import { MainWindowState } from '../../../models/mainwindow/main-window-state';
import {
	BattleAbility,
	BattleEquipment,
	BattleMercenary,
	MercenariesBattleState,
	MercenariesBattleTeam,
} from '../../../models/mercenaries/mercenaries-battle-state';
import { CardsFacadeService } from '../../cards-facade.service';
import {
	getHeroRole,
	getMercCardLevel,
	getMercLevelFromExperience,
	normalizeMercenariesCardId,
} from '../mercenaries-utils';
import { MercenariesParser } from './_mercenaries-parser';

export class MercenariesHeroRevealedParser implements MercenariesParser {
	constructor(private readonly allCards: CardsFacadeService) {}

	public eventType = () => GameEvent.MERCENARIES_HERO_REVEALED;

	public applies = (battleState: MercenariesBattleState) => battleState != null;

	public parse(
		battleState: MercenariesBattleState,
		event: GameEvent,
		mainWindowState: MainWindowState,
	): MercenariesBattleState | PromiseLike<MercenariesBattleState> {
		const [cardId, controllerId, localPlayer, entityId] = event.parse();
		if (!localPlayer) {
			console.error('[merc-hero-revealed-parser] no local player present', event);
			return battleState;
		}
		const opponentPlayer = event.opponentPlayer;
		if (
			!!event.additionalData.creatorCardId ||
			(controllerId !== localPlayer.PlayerId && controllerId !== opponentPlayer.PlayerId)
		) {
			console.warn('[merc-hero-revealed-parser] probably invoking a merc while in combat', event, battleState);
			return battleState;
		}

		const normalizedCardId = normalizeMercenariesCardId(cardId);
		const refMerc = normalizedCardId
			? mainWindowState.mercenaries.referenceData.mercenaries.find(
					(merc) =>
						normalizeMercenariesCardId(this.allCards.getCardFromDbfId(merc.cardDbfId).id) ===
						normalizedCardId,
			  )
			: null;

		const refMercCard = normalizedCardId ? this.allCards.getCard(normalizedCardId) : null;
		const refMercEquipment = event.additionalData.mercenariesEquipmentId
			? this.allCards.getCardFromDbfId(event.additionalData.mercenariesEquipmentId)
			: null;
		const mercenary: BattleMercenary = BattleMercenary.create({
			entityId: entityId,
			cardId: refMercCard?.id,
			abilities: refMerc?.abilities.map((refAbility) => {
				const refCard = this.allCards.getCardFromDbfId(refAbility.cardDbfId);
				return BattleAbility.create({
					entityId: null,
					cardId: refCard.id,
					level: getMercCardLevel(refCard.id),
					cooldown: refCard.mercenaryAbilityCooldown ?? 0,
					cooldownLeft: refCard.mercenaryAbilityCooldown ?? 0,
					speed: refCard.cost,
					totalUsed: null,
				});
			}),
			inPlay: false,
			level: event.additionalData.mercenariesExperience
				? getMercLevelFromExperience(
						event.additionalData.mercenariesExperience,
						mainWindowState.mercenaries.referenceData,
				  )
				: null,
			role: refMercCard ? getHeroRole(refMercCard.mercenaryRole) : null,
			treasures: [],
			equipment: refMercEquipment
				? BattleEquipment.create({
						entityId: null,
						cardId: refMercEquipment.id,
						level: getMercCardLevel(refMercEquipment.id),
				  })
				: null,
		});

		const isPlayer = controllerId === localPlayer.PlayerId;
		const team = isPlayer ? battleState.playerTeam : battleState.opponentTeam;
		const newTeam = team.update({
			mercenaries: [...team.mercenaries, mercenary] as readonly BattleMercenary[],
		} as MercenariesBattleTeam);
		return battleState.update({
			playerTeam: isPlayer ? newTeam : battleState.playerTeam,
			opponentTeam: isPlayer ? battleState.opponentTeam : newTeam,
		} as MercenariesBattleState);
	}
}