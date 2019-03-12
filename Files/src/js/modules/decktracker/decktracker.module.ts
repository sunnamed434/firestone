import { NgModule }      from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpModule }    from '@angular/http';

import { DebugService } from '../../services/debug.service';
import { DeckTrackerComponent } from '../../components/decktracker/decktracker.component';
import { DeckTrackerTitleBarComponent } from '../../components/decktracker/decktracker-title-bar.component';
import { DeckTrackerDeckNameComponent } from '../../components/decktracker/decktracker-deck-name.component';
import { DeckTrackerDeckListComponent } from '../../components/decktracker/decktracker-deck-list.component';
import { DeckListByZoneComponent } from '../../components/decktracker/deck-list-by-zone.component';
import { DeckZoneComponent } from '../../components/decktracker/deck-zone.component';
import { DeckCardComponent } from '../../components/decktracker/deck-card.component';
import { SharedModule } from '../shared/shared.module';
import { PreferencesService } from '../../services/preferences.service';
import { GenericIndexedDbService } from '../../services/generic-indexed-db.service';
import { init } from '@sentry/browser';
import { Events } from '../../services/events.service';
import { GroupedDeckListComponent } from '../../components/decktracker/grouped-deck-list.component';
import { SelectModule } from 'ng-select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

init({
	dsn: "https://53b0813bb66246ae90c60442d05efefe@sentry.io/1338840",
	enabled: process.env.NODE_ENV === 'production',
	release: process.env.APP_VERSION
});

console.log('version is', process.env.APP_VERSION);

@NgModule({
	imports: [
		BrowserModule,
		HttpModule,
        BrowserAnimationsModule,
		SharedModule,
        SelectModule,
		FormsModule,
		ReactiveFormsModule,
	],
	declarations: [
		DeckTrackerComponent,
		DeckTrackerDeckListComponent,
		DeckListByZoneComponent,
		GroupedDeckListComponent,
		DeckCardComponent,
		DeckZoneComponent,
		DeckTrackerDeckNameComponent,
		DeckTrackerTitleBarComponent,
	],
	bootstrap: [
		DeckTrackerComponent,
	],
	providers: [
		DebugService,
		Events,
		GenericIndexedDbService,
		PreferencesService,
	],
})

export class DeckTrackerModule { }
