import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { SharedModule } from '../shared/shared.module';
import { init } from '@sentry/browser';
import { Events } from '../../services/events.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedDeckTrackerModule } from '../shared-decktracker/shared-dectracker.module';
import { DeckTrackerOverlayStandaloneComponent } from '../../components/decktracker/overlay/twitch/decktracker-overlay-standalone.component';
import { HttpClientModule } from '@angular/common/http';
import { DeckTrackerOverlayContainerComponent } from '../../components/decktracker/overlay/twitch/decktracker-overlay-container.component.ts';

init({
	dsn: "https://53b0813bb66246ae90c60442d05efefe@sentry.io/1338840",
	enabled: process.env.NODE_ENV === 'production',
	release: process.env.APP_VERSION
});

console.log('version is', process.env.APP_VERSION);

@NgModule({
	imports: [
		BrowserModule,
        HttpClientModule,
        BrowserAnimationsModule,
		SharedModule,
		FormsModule,
        ReactiveFormsModule,
        SharedDeckTrackerModule,
        DragDropModule,
	],
	declarations: [
        DeckTrackerOverlayStandaloneComponent,
        DeckTrackerOverlayContainerComponent,
	],
	bootstrap: [
		DeckTrackerOverlayContainerComponent,
	],
	providers: [
        Events,
	],
})

export class DeckTrackerTwitchModule { }
