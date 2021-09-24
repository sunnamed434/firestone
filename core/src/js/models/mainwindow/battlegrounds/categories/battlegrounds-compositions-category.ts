import { BattlegroundsCategory } from '../battlegrounds-category';

export class BattlegroundsCompositionsCategory extends BattlegroundsCategory {
	constructor() {
		super();
		// @ts-ignore
		this.id = 'bgs-compositions';
		// @ts-ignore
		this.name = 'Compositions';
	}

	public static create(base: BattlegroundsCompositionsCategory): BattlegroundsCompositionsCategory {
		return Object.assign(new BattlegroundsCompositionsCategory(), base);
	}
}
