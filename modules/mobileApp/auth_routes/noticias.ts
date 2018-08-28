import * as moment from 'moment';
import * as express from 'express';
import * as Twitter from 'twitter';
import {
    TwitterConfig
} from '../../../config.private';

let router = express.Router();

router.get('/noticias/:name', async (req, res) => {
    let feedName = req.params.name;
    if (feedName === 'puntosaludable') {
        let client = new Twitter(TwitterConfig);
        let params = {
            screen_name: 'PSaludableNqn',
            count: 200,
            tweet_mode: 'extended'
        };
        let tweets = await client.get('statuses/user_timeline', params);
        if (!tweets) {
            res.status(422).json({
                message: 'no_feed'
            });
        }
        let feeds = [];
        tweets.forEach((item) => {
            if (!item.retweeted_status) {
                let text = item.full_text;
                if (item.display_text_range) {
                    text = item.full_text.substring(item.display_text_range[0], item.display_text_range[1]);
                }
                let tw = {
                    id: item.id_str,
                    fecha: moment(item.created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY'),
                    text: text,
                    hashtags: item.entities.hashtags ? item.entities.hashtags.map(i => i.text) : [],
                    urls: item.entities.urls ? item.entities.urls.map(i => i.expanded_url) : [],
                    images: item.entities.media ? item.entities.media.map(i => i.media_url_https) : [],
                };
                feeds.push(tw);

            }
        });
        res.json(feeds);
    }
});

export = router;
