import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Events } from './events.service';
import { ListenObject, OverwolfService } from './overwolf.service';

@Injectable()
export class LogListenerService {
	public subject = new Subject();

	private logFile: string;
	private callback: (input: string) => void;

	private monitoring: boolean;
	private fileInitiallyPresent: boolean;
	private logsLocation: string;
	private existingLineHandler: (input: string) => void;

	constructor(private ow: OverwolfService) {}

	public configure(
		logFile: string,
		newLineHandler: (input: string) => void,
		existingLineHandler: (input: string) => void = null,
	): LogListenerService {
		this.logFile = logFile;
		this.callback = newLineHandler;
		console.log('[log-listener] [' + this.logFile + '] initializing', this.logFile);
		this.monitoring = false;
		this.fileInitiallyPresent = true;
		this.existingLineHandler = existingLineHandler;
		if (existingLineHandler) {
			console.log('[log-listener] [' + this.logFile + '] will read from start of file');
		}
		return this;
	}

	public subscribe(observer: any): LogListenerService {
		this.subject.subscribe(observer);
		return this;
	}

	public start() {
		this.configureLogListeners();
	}

	async configureLogListeners() {
		this.ow.addGameInfoUpdatedListener(async (res: any) => {
			if (!res?.gameInfo) {
				return;
			}

			this.logsLocation = res.gameInfo.executionPath.split('Hearthstone.exe')[0] + 'Logs\\' + this.logFile;
			if (this.ow.gameLaunched(res)) {
				this.registerLogMonitor();
			} else if (!(await this.ow.inGame())) {
				console.log('[log-listener] [' + this.logFile + '] Left the game, cleaning log file');
				await this.ow.writeFileContents(this.logsLocation, '');
				console.log('[log-listener] [' + this.logFile + '] Cleaned log file');
			}
		});
		const gameInfo = await this.ow.getRunningGameInfo();
		if (this.ow.gameRunning(gameInfo)) {
			console.log('[log-listener] [' + this.logFile + '] Game is running!', gameInfo.executionPath);
			this.logsLocation = gameInfo.executionPath.split('Hearthstone.exe')[0] + 'Logs\\' + this.logFile;
			this.registerLogMonitor();
		} else {
			console.log('[log-listener] [' + this.logFile + '] Game not launched, returning', gameInfo);
		}
	}

	registerLogMonitor() {
		if (this.monitoring) {
			return;
		}
		console.log('[log-listener] [' + this.logFile + '] registering hooks?');
		this.monitoring = true;

		console.log('[log-listener] [' + this.logFile + '] getting logs from', this.logsLocation);
		this.listenOnFile(this.logsLocation);
	}

	listenOnFile(logsLocation: string): void {
		this.subject.next(Events.START_LOG_FILE_DETECTION);
		this.listenOnFileCreation(logsLocation);
	}

	async listenOnFileCreation(logsLocation: string) {
		const fileExists = await this.ow.fileExists(logsLocation);
		if (!fileExists) {
			await this.ow.writeFileContents(logsLocation, '');
		}
		this.listenOnFileUpdate(logsLocation);
	}

	async listenOnFileUpdate(logsLocation: string) {
		const fileIdentifier = this.logFile;
		console.log('[log-listener] [' + this.logFile + '] preparing to listen on file update', logsLocation);

		try {
			// let hasFileBeenInitiallyRead = false;

			// const existingLines: string[] = [];

			const skipToEnd = true; // this.fileInitiallyPresent && !this.existingLineHandler;
			const options = {
				skipToEnd: skipToEnd,
			};
			this.ow.listenOnFile(fileIdentifier, logsLocation, options, (lineInfo) => this.handleLine(lineInfo));
			console.log('[log-listener] [' + this.logFile + '] listening on file update', logsLocation);

			// Load the existing file in memory
			const existingFileContents = await this.ow.readTextFile(logsLocation);
			const lines: readonly string[] = existingFileContents?.split('\n') ?? [];
			this.catchUpLines(lines);
			// hasFileBeenInitiallyRead = true;
		} catch (e) {
			console.error('Exception while listener on logs', fileIdentifier, e);
		}
	}

	private catchUpLines(lines: readonly string[]) {
		console.log('[log-listener] [' + this.logFile + '] catching up existing', lines?.length);
		if (!!lines?.length && !!this.existingLineHandler) {
			for (const line of lines) {
				this.existingLineHandler(line);
			}
			this.existingLineHandler('end_of_existing_data');
		}
	}

	private handleLine(lineInfo: ListenObject) {
		if (!lineInfo.success) {
			console.warn(
				'[log-listener] [' + this.logFile + '] received an error on file: ',
				// fileIdentifier,
				lineInfo.error,
			);
			return;
		}
		// if (lineInfo.state === 'truncated') {
		// 	console.log(
		// 		'[log-listener] [' +
		// 			logFile +
		// 			'] truncated log file - HS probably just overwrote the file. Restarting listening',
		// 	);
		// 	callback('truncated');
		// 	this.ow.listenOnFile(fileIdentifier, logsLocation, options, handler);
		// 	return;
		// }
		const info: {
			readonly index: number;
			readonly isNew: boolean;
			readonly position: number;
			readonly oef: boolean;
		} = lineInfo.info ? JSON.parse(lineInfo.info) : null;

		if (info && !info.isNew) {
		} else {
			this.callback(lineInfo.content);
		}
	}
}
