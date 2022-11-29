import { OwCliContainer, PackOpkCommand, SignOpkCommand } from '@overwolf/ow-cli/bin';
import { readFile } from 'fs/promises';
import 'reflect-metadata';

const createOpk = async (): Promise<string> => {
	console.log('[create-opk] reading current version');
	const packageJsonBuff = await readFile('./package.json');
	const packageJson = JSON.parse(packageJsonBuff.toString('utf8'));
	const version = packageJson.version;

	console.log('[create-opk] creating opk');
	const packOpkCmd = OwCliContainer.resolve(PackOpkCommand);
	const outputFile = `./Firestone_${version}.opk`;
	await packOpkCmd.handler({
		folderPath: 'dist/apps/legacy',
		outputFile: outputFile,
	});
	return outputFile;
};

const signOpk = async (filePath: string): Promise<string> => {
	const signOpkCmd = OwCliContainer.resolve(SignOpkCommand);
	const outputPath = filePath.replace('.opk', '.signed.opk');
	signOpkCmd.handler({
		filePath: filePath,
		outputPath: outputPath,
	});
	return outputPath;
};

const pipeline = async () => {
	OwCliContainer.init();
	const opkFilePath = await createOpk();
	const signedOpkFilePath = await signOpk(opkFilePath);
};

pipeline();
