require.paths.unshift('lib');
require('express');
require('express/plugins');

var sys = require('sys'),
	events = require('events'),
	utils = require('express/utils'),
	http = require('express/http'),
	couchdb = require('couchdb'),
	client = couchdb.createClient(5984, 'localhost'),
	db = client.db('fiveoclocksong');

App = {
	/**
	 * A cache of the poll object used in the current day's poll
	 * @property poll
	 */
	poll: null,
	/**
	 * A cache of all song objects used in the current day's poll
	 * @property songs
	 */
	songs: null,
	/**
	 * A cache of the total vote count for the current day's poll
	 * @property voteCount
	 */
	voteCount: 0,
	SONG_LIMIT: 3,
	boot: function () {
		var self = this;

		// Determine if there's a poll already made for today
		self.getTodaysPoll(function (poll) {
			/**
			 * Save our poll to an application's property that can be used
			 * throughout out app
			 */
			self.poll = poll;

			self.updateSongCache();
			self.updateVoteCountCache();

			// Run the Express application
			run();
		});
	},
	getTodaysDate: function () {
		var todaysDate = new Date();
		return (todaysDate.getMonth() + 1) + '/' + todaysDate.getDate() + '/' + todaysDate.getFullYear();
	},
	getTodaysPoll: function (hollaback) {
		var self = this;

		db.view('polls', 'by_date', {limit: 1}, function (error, data) {
			var result = null,
				poll;

			if (data.total_rows !== 0) {
				poll = data.rows[0].value;
				/**
				 * Compare the date of the most recent poll to today's date to determine
				 * if it is in fact today's poll
				 */
				if (poll.date === self.getTodaysDate()) { // We all good here
					hollaback.call(this, poll);
				} else { // Shucks, we need to make a poll for today
					self.createTodaysPoll(function (poll) {
						hollaback.call(this, poll);
					});
				}
			} else { // Yay, we get to create our first poll
				self.createTodaysPoll(function (poll) {
					hollaback.call(this, poll);
				});
			}
		});
	},
	createTodaysPoll: function (hollaback) {
		var self = this;

		/**
		 * Get all songs from database
		 */
		db.view('songs', 'by_title', {}, function (error, data) {
			var poll = {
					date: self.getTodaysDate(),
					type: 'poll',
					songs: []
				},
				result,
				songs = data.rows;

			/**
			 * Check to make sure we at least have enough songs according to our
			 * SONG_LIMIT
			 */
			if (songs.length < self.SONG_LIMIT) {
				throw new Error('Not enough songs in the database to satisfy the SONG_LIMIT');
			} else {
				/**
				 * Clear out the songs cache.
				 */
				self.songs = [];
				/**
				 * Lovely, looks like we have enough songs. Now lets start
				 * plucking out random ones to use for today's poll
				 */
				for(var i = 0; i < self.SONG_LIMIT; i++) {
					var song = songs.splice(Math.floor(Math.random() * songs.length), 1);
					poll.songs.push({
						id: song[0].id,
						votes: 0
					});
				}
				/**
				 * Save this carefully crafted poll object into the database
				 */
				db.saveDoc(poll, function (error, data) {
					hollaback.call(this, data);
				});
			}
		});
	},
	updateSongCache: function () {
		var self = this;

		/**
		 * Now that we have our poll object, we have to get the song objects
		 * out of the database
		 */
		self.songs = [];
		self.poll.songs.forEach(function (item, index) {
			db.getDoc(item.id, function (error, data) {
				self.songs[index] = {
					item: data,
					votes: item.votes
				};
			});
		});
	},
	updateVoteCountCache: function () {
		var newVoteCount = 0;

		this.poll.songs.forEach(function (item) {
			newVoteCount += item.votes;
		});

		this.voteCount = newVoteCount;
	},
	vote: function (index) {
		/**
		 * TODO: This seems really unecessary. Refactor and try again, pal.
		 * I'm not your pal, guy.
		 * I'm not your guy, friend.
		 * I'm not your friend, buddy.
		 * I'm not your buddy, pal.
		 * ERROR: Too much recursion.
		 */
		this.poll.songs[index].votes++;
		this.songs[index].votes++;
		this.updateVoteCountCache();
		inspect(this.voteCount);
	}
};

configure(function () {
	use(Logger);
	use(MethodOverride);
	use(ContentLength);
	use(Cookie);
	use(Cache, { lifetime: (5).minutes, reapInterval: (1).minute });
	use(Session, { lifetime: (15).minutes, reapInterval: (1).minute });
	use(Static);
	set('root', __dirname);
});

get('/', function () {
	inspect(App.poll);
	inspect(App.songs);
	this.pass('/vote');
});

get('/vote', function () {
	var self = this;
	self.render('vote.html.haml', {
		locals: {
			title: 'Five o\'clock Song',
			songs: App.songs
		}
	});
});

post('/vote', function () {
	App.vote(this.param('index'));
	this.respond(200);
});

get('/songs', function () {
	var self = this,
		previousVoteCount = App.voteCount,
		timer = setInterval(function () {
			if (App.voteCount > previousVoteCount) {
				var votes = [];
				App.songs.forEach(function (item) {
					votes.push(item.votes);
				})
				self.contentType('json');
				self.respond(200, JSON.encode(votes)),
				clearInterval(timer);
			}
		}, 100);
});

get('/*.css', function(file){
	this.render(file + '.css.sass', { layout: false });
});

get('/error/view', function () {
	this.render('does.not.exist');
});

App.boot();

function inspect (o) {
	sys.puts(sys.inspect(o));
}