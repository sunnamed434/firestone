import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { OverwolfService } from './overwolf.service';

const SUBSCRIPTION_STATUS_ENDPOINT_GET = 'https://rpeze8ckdl.execute-api.us-west-2.amazonaws.com/Prod/subscriptions';

@Injectable()
export class AdService {
	constructor(private http: HttpClient, private ow: OverwolfService) {}

	public async shouldDisplayAds(): Promise<boolean> {
		return new Promise<boolean>(async resolve => {
			// Use OW's subscription mechanism
			const [activePlans, user] = await Promise.all([
				this.ow.getActiveSubscriptionPlans(),
				this.ow.getCurrentUser(),
			]);
			if (!user || !user.username) {
				resolve(true);
				return;
			}
			const username = user.username;
			if (!username) {
				console.log('user not logged in', user);
				resolve(true);
				return;
			}
			console.log(
				'contacting subscription API',
				`${SUBSCRIPTION_STATUS_ENDPOINT_GET}/${user.userId}/${username}`,
			);
			this.http.get(`${SUBSCRIPTION_STATUS_ENDPOINT_GET}/${user.userId}/${username}`).subscribe(
				res => {
					console.log('retrieved sub status for', username, res);
					resolve(false);
					return;
				},
				error => {
					console.log('no subscription, showign ads');
					resolve(true);
					return;
				},
			);
		});
	}
}
