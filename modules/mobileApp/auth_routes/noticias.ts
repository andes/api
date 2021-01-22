import * as moment from 'moment';
import * as express from 'express';
import * as Twitter from 'twitter';
import { TwitterConfig } from '../../../config.private';

const router = express.Router();

router.get('/noticias/:name', async (req, res) => {
    const feedName = req.params.name;
    if (feedName === 'puntosaludable') {
        const client = new Twitter(TwitterConfig);
        let params: any = {
            screen_name: 'PSaludableNqn',
            count: 200,
            tweet_mode: 'extended'
        };
        if (req.query.count) {
            params.count = parseInt(req.query.count, 10);
        }
        if (req.query.max_id) {
            params.max_id = req.query.max_id;
        }
        const tweets = await client.get('statuses/user_timeline', params);
        if (tweets) {
            const feeds = [];
            tweets.forEach((item) => {
                if (!item.retweeted_status) {
                    let text = item.full_text;
                    if (item.display_text_range) {
                        text = item.full_text.substring(item.display_text_range[0], item.display_text_range[1]);
                    }
                    const tw = {
                        id: item.id_str,
                        fecha: moment(item.created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'en'),
                        text,
                        hashtags: item.entities.hashtags ? item.entities.hashtags.map(i => i.text) : [],
                        urls: item.entities.urls ? item.entities.urls.map(i => i.expanded_url) : [],
                        images: item.entities.media ? item.entities.media.map(i => i.media_url_https) : [],
                    };
                    feeds.push(tw);

                }
            });
            res.json(feeds);
        } else {
            res.status(422).json({
                message: 'no_feed'
            });
        }
    }
});
export = router;
