import { enableProdMode, NgModuleRef, PlatformRef } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './background.module';

if (process.env.NODE_ENV === 'production') {
	enableProdMode();
}
enableProdMode();

// eslint-disable-next-line no-var
declare var window: any;

// this has to bee the unique tag name of the angular app
const ROOT_NODE = 'game-counters';

window['destroyPlatform'] = () => {
	platform?.destroy();
	platform = null;
};

window['removeScripts'] = () => {
	document.body.textContent = '';
};

window.addEventListener('beforeunload', () => {
	// console.log('on beforeunload');
	// tearDown();
	// document.body.textContent = '';
	// delete window.webpackJsonp;
	// console.log('emptied text content');
});

window.addEventListener('unload', () => {
	console.log('on unload');
	// syncSleep(5000);
	// console.log('on unload after sleep');
	tearDown();
	// document.body.textContent = '';
	// delete window.webpackJsonp;
	// console.log('emptied text content');
	// console.log('NG: beforeunload');
	// const scripts = document.body.getElementsByTagName('script');
	// console.log('how many scripts?', scripts.length);
	// for (let i = scripts.length - 1; i >= 0; i--) {
	// 	if (scripts[i].src.includes('vendor')) {
	// 		console.log('removing script', scripts[i]?.src, scripts.length, i);
	// 		document.body.removeChild(scripts[i]);
	// 		console.log('removed script');
	// 	}
	// }
	// console.log('NG: Root node was removed. Destroying app.');
	// platform.destroy();
	// platform = null;
	// // ref.injector.get(TestabilityRegistry).destroy();
	// console.log('NG: Trying to free memory');
	// delete window.webpackJsonp;
	// delete window.frameworkStabilizers;
	// delete window.getAngularTestability;
	// delete window.getAllAngularTestabilities;
	// delete window.getAllAngularRootElements;
	// delete window.ng;
	// console.log('NG: disposing mutation observer');
	// // observer.disconnect();
	// console.log('NG: Tear down complete');
	// // remove all the nodes from the body just to simulate a blank page
	// document.body.innerHTML = 'Blank page';
});

let platform: PlatformRef;
platformBrowserDynamic()
	.bootstrapModule(AppModule)
	.then((ref: NgModuleRef<AppModule>) => {
		platform = ref.injector.get(PlatformRef);
		console.log('NG: Bootstrapped. Watching for root node to be removed');
		return;
		// Watch the app's parent node for changes to its children. If anything
		// is removed check to see if the removed node is the application root
		// and if so destroy the platform and remove all the references on the window
		// that get left behind
		const observer = new MutationObserver(function (e: any) {
			let shouldDestroy = false;
			console.log('mutation', e);
			// return;
			if (e[0].removedNodes.length > 0) {
				e[0].removedNodes.forEach((node: { nodeName: string }) => {
					console.log('destroyed node', node.nodeName, ROOT_NODE, node.nodeName.toLowerCase() === ROOT_NODE);
					if (node.nodeName.toLowerCase() === ROOT_NODE) {
						shouldDestroy = true;
					}
				});
			}

			if (shouldDestroy) {
				tearDown(observer);
			}
		});
		// comment this to see the difference
		// observer.observe(document.getElementsByTagName('body')[0], { childList: true });
		// observer.observe(document.getElementsByTagName(ROOT_NODE)[0].parentElement, { childList: true });
		observer.observe(document, { childList: true, subtree: true });
	});

const tearDown = (observer?) => {
	console.log('NG: Root node was removed. Destroying app.');
	// // https://github.com/angular/angular/issues/17637
	// if (!!platform) {
	// 	const testabilityRegistry: TestabilityRegistry = platform.injector.get(TestabilityRegistry);
	// 	(<any>testabilityRegistry)._applications.clear();

	// 	platform?.destroy();
	// 	platform = null;
	// }

	// // // console.log('NG: Trying to free memory');
	// delete window.webpackJsonp;
	// delete window.frameworkStabilizers;
	// delete window.getAngularTestability;
	// delete window.getAllAngularTestabilities;
	// delete window.getAllAngularRootElements;
	// delete window.ng;

	// // console.log('NG: disposing mutation observer');
	// // observer?.disconnect();

	// console.log('NG: Tear down complete');

	// remove all the nodes from the body just to simulate a blank page
	document.body.textContent = '';
};

const syncSleep = (ms: number) => {
	const start = Date.now();
	let elapsed = 0;
	while (elapsed < ms) {
		elapsed = Date.now() - start;
	}
};
