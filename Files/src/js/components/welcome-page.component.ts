import { Component, NgZone, ElementRef, Renderer2, ViewChild, ViewEncapsulation, HostListener, OnInit } from '@angular/core';

import * as Raven from 'raven-js';

declare var overwolf: any;

@Component({
	selector: 'welcome-page',
	styleUrls: [`../../css/component/welcome-page.component.scss`],
	encapsulation: ViewEncapsulation.None,
	template: `
		<div class="root">
			<div class="app-container">
				<div class="menu-bar">
					<i class="glyphicon glyphicon-remove" (click)="closeWindow()"></i>
				</div>
				<div class="content-container">
					<div class="content">
						<h1>
							<img class="logo" src="/IconStore.png" />
							<div class="title-text">
								<span class="title">HS Collection Companion</span>
								<span class="subtitle">Pack Opening & Collection Assistant</span>
							</div>
						</h1>
						<div class="main-text">
							<span>
								To begin, start opening packs in-game. <br />
								HS Collection Companion will automatically show you notifications for new cards and the amount of dust in case you open duplicates.
							</span>
						</div>
					</div>
					<div class="social-media">
						<!-- https://simpleicons.org/ -->
						<svg (click)="openReddit()" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path d="M2.204 14.049c-.06.276-.091.56-.091.847 0 3.443 4.402 6.249 9.814 6.249 5.41 0 9.812-2.804 9.812-6.249 0-.274-.029-.546-.082-.809l-.015-.032c-.021-.055-.029-.11-.029-.165-.302-1.175-1.117-2.241-2.296-3.103-.045-.016-.088-.039-.126-.07-.026-.02-.045-.042-.067-.064-1.792-1.234-4.356-2.008-7.196-2.008-2.815 0-5.354.759-7.146 1.971-.014.018-.029.033-.049.049-.039.033-.084.06-.13.075-1.206.862-2.042 1.937-2.354 3.123 0 .058-.014.114-.037.171l-.008.015zm9.773 5.441c-1.794 0-3.057-.389-3.863-1.197-.173-.174-.173-.457 0-.632.176-.165.46-.165.635 0 .63.629 1.685.943 3.228.943 1.542 0 2.591-.3 3.219-.929.165-.164.45-.164.629 0 .165.18.165.465 0 .645-.809.808-2.065 1.198-3.862 1.198l.014-.028zm-3.606-7.573c-.914 0-1.677.765-1.677 1.677 0 .91.763 1.65 1.677 1.65s1.651-.74 1.651-1.65c0-.912-.739-1.677-1.651-1.677zm7.233 0c-.914 0-1.678.765-1.678 1.677 0 .91.764 1.65 1.678 1.65s1.651-.74 1.651-1.65c0-.912-.739-1.677-1.651-1.677zm4.548-1.595c1.037.833 1.8 1.821 2.189 2.904.45-.336.719-.864.719-1.449 0-1.002-.815-1.816-1.818-1.816-.399 0-.778.129-1.09.363v-.002zM2.711 9.963c-1.003 0-1.817.816-1.817 1.818 0 .543.239 1.048.644 1.389.401-1.079 1.172-2.053 2.213-2.876-.302-.21-.663-.329-1.039-.329v-.002zm9.217 12.079c-5.906 0-10.709-3.205-10.709-7.142 0-.275.023-.544.068-.809C.494 13.598 0 12.729 0 11.777c0-1.496 1.227-2.713 2.725-2.713.674 0 1.303.246 1.797.682 1.856-1.191 4.357-1.941 7.112-1.992l1.812-5.524.404.095s.016 0 .016.002l4.223.993c.344-.798 1.138-1.36 2.065-1.36 1.229 0 2.231 1.004 2.231 2.234 0 1.232-1.003 2.234-2.231 2.234s-2.23-1.004-2.23-2.23l-3.851-.912-1.467 4.477c2.65.105 5.047.854 6.844 2.021.494-.464 1.144-.719 1.833-.719 1.498 0 2.718 1.213 2.718 2.711 0 .987-.54 1.886-1.378 2.365.029.255.059.494.059.749-.015 3.938-4.806 7.143-10.72 7.143l-.034.009zm8.179-19.187c-.74 0-1.34.599-1.34 1.338 0 .738.6 1.34 1.34 1.34.732 0 1.33-.6 1.33-1.334 0-.733-.598-1.332-1.347-1.332l.017-.012z"/>
						</svg>
						<svg (click)="openGitHub()" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
						</svg>
					</div>
					<div class="version-info">v{{version}}</div>
				</div>
			</div>
		</div>
	`,
})
// 7.1.1.17994
export class WelcomePageComponent implements OnInit {

	private version;

	constructor(private ngZone: NgZone) {

	}

	ngOnInit() {
		overwolf.extensions.getManifest('dikgmjhafcjcgdpoakplhfjcjhfpdfkjgihpcjfh', (result) => {
			console.log('retrieved manifest', result);
			this.ngZone.run(() => {
				this.version = result.meta.version;
			});
		})
	}



	@HostListener('mousedown', ['$event'])
	private dragMove(event: MouseEvent) {
		overwolf.windows.getCurrentWindow((result) => {
			if (result.status === "success"){
				overwolf.windows.dragMove(result.window.id);
			}
		});
	};

	private closeWindow() {
		overwolf.windows.getCurrentWindow((result) => {
			if (result.status === "success"){
				overwolf.windows.close(result.window.id);
			}
		});
	};

	private openReddit() {
		window.open('https://www.reddit.com/r/hscollectioncompanion/comments/7abytb/what_is_hs_collection_companion/');
	}

	private openGitHub() {
		window.open('https://github.com/Zero-to-Heroes/overwolf-collection-companion/');
	}
}
