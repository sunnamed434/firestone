import { PatchInfo } from '../models/patches';
import { LocalizationFacadeService } from './localization-facade.service';

export const formatPatch = (input: PatchInfo, i18n: LocalizationFacadeService): string => {
	if (!input) {
		return '';
	}
	return i18n.translateString('global.patch', {
		version: input.version,
		number: input.number,
		date: input.date.split('-').reverse().join('-'),
	});
};
