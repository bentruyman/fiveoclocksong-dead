require.paths.unshift('lib/express/lib');
require.paths.unshift('lib/node-couchdb/lib');
require('express');
require('express/plugins');

var dns = require('dns'),
	events = require('events'),
	sys = require('sys'),
	http = require('express/http'),
	utils = require('express/utils'),
	couchdb = require('couchdb');

App = {
	configuration: {},
	/**
	 * Contains various links to the CouchDB database resources used throughout
	 * the application
	 * @property database
	 */
	database: {
		/**
		 * The CouchDB client
		 * @property client
		 */
		client: null,
		/**
		 * The interface into the CouchDB database
		 * @property link
		 */
		link: null
	},
	/**
	 * Random messages to be sent when a ping status is sent
	 * @property pingMessages
	 */
	pingMessages: [
		'Just pingin\' ya.', 
		'Are you still there? Go vote or sumthin',
		'Knock knock! Who\'s there? ME!',
		'Shouldn\'t you be working instead of reading your console?',
		'I hope you voted for an awesome song.',
		'Could you vote for a Rush song for me?',
		'Maturity is only a short break in adolescence.',
		'I’ve decided that the key to happiness is low expectations.',
		'I have lost friends, some by death... others through sheer inability to cross the street.',
		'A vote is like a rifle: its usefulness depends upon the character of the user.',
		'If you cannot convince them, confuse them.',
		'I always keep a supply of stimulant handy in case I see a snake--which I also keep handy.',
		'Death is only going to happen to you once; I don\'t want to miss it.',
		'We do not write because we want to; we write because we have to.',
		'It is more tolerable to be refused than deceived.',
		'Reading is no substitute for action.',
		'The best things carried to excess are wrong.',
		'He that is not with me is against me.',
		'There can never be a complete confidence in a power which is excessive.',
		'There ought to be one day-- just one-- when there is open season on senators.',
		'Age is foolish and forgetful when it underestimates youth.'
	],
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
	 * @property statusEmitter
	 */
	statusEmitter: {
		listeners: [],
		addListener: function (hollaback) {
			this.listeners.push(hollaback);
		},
		removeListener: function (hollaback) {
			this.listeners.forEach(function (item, index) {
				if (item === hollaback) {
					this.listeners.splice(index, 1);
				}
			});
		},
		removeAllListeners: function () {
			this.listeners = [];
		},
		emit: function (type, data) {
			var response = {
				type: type,
				data: data
			};

			this.listeners.forEach(function (item) {
				item.call(App, response);
			});

			this.removeAllListeners();
		}
	},
	/**
	 * Contains the application configuration settings as specified by the user
	 * in config/app.js
	 * @property userConfiguration
	 */
	userConfiguration: require('./config/app').configuration,
	/**
	 * A cache of the total vote count for the current day's poll, used to
	 * trigger the response on the long poll request
	 * @property voteCount
	 */
	voteCount: 0,
	/** 
	 * Holder for the machine name of the last person who voted
	 * @property lastVoter
	 */
	lastVoter: null,
	boot: function () {
		var self = this,
			uc = self.userConfiguration;

		/**
		 * Establish a connection to the database
		 */
		self.database.client = couchdb.createClient(uc.database.port, uc.database.host);
		self.database.link = self.database.client.db(uc.database.name);

		/**
		 * Parse the user's configuration into a more digestible for the
		 * application 
		 */
		self.configuration.songLimit = uc.songLimit;
		self.configuration.server = {
			statusTimeout: uc.server.statusTimeout * 1000
		};
		self.configuration.timers = {
			start: {
				hour: uc.timers.start.split(':')[0],
				minutes: uc.timers.start.split(':')[1]
			},
			end: {
				hour: uc.timers.end.split(':')[0],
				minutes: uc.timers.end.split(':')[1]
			},
			delay: uc.timers.delay * 1000
		};

		/**
		 * Determine if there's a poll already made for today
		 */
		self.getTodaysPoll(function (poll) {
			/**
			 * Save our poll to an application's property that can be used
			 * throughout out app
			 */
			self.poll = poll;

			self.updateSongCache();
			self.updateVoteCountCache();

			self.startPoll();

			/**
			 * Run the Express application
			 */
			run();

			sys.puts('FOCS has booted.');
		});
	},
	getTodaysDate: function () {
		var todaysDate = new Date();
		return (todaysDate.getMonth() + 1) + '/' + todaysDate.getDate() + '/' + todaysDate.getFullYear();
	},
	getTodaysPoll: function (/* I aint no */ hollaback /* girl */) {
		var self = this;

		self.database.link.view('polls', 'by_date', {limit: 1}, function (error, data) {
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
	createTodaysPoll: function (/* I aint no */ hollaback /* girl */) {
		var self = this;

		/**
		 * Get all songs from database
		 */
		self.database.link.view('songs', 'by_title', {}, function (error, data) {
			var poll = {
					date: self.getTodaysDate(),
					type: 'poll',
					songs: []
				},
				result,
				songs = data.rows;
				
			/**
			 * Check to make sure we at least have enough songs according to our
			 * song limit
			 */
			if (songs.length < self.configuration.songLimit) {
				throw new Error('Not enough songs in the database to satisfy the song limit');
			} else {
				/**
				 * Clear out the songs cache.
				 */
				self.songs = [];
				/**
				 * Lovely, looks like we have enough songs. Now lets start
				 * plucking out random ones to use for today's poll
				 */
				for(var i = 0; i < self.configuration.songLimit; i++) {
					var song = songs.splice(Math.floor(Math.random() * songs.length), 1);
					poll.songs.push({
						id: song[0].id,
						votes: 0,
						voters: []
					});
				}
				/**
				 * Save this carefully crafted poll object into the database
				 */
				self.database.link.saveDoc(poll, function (error, data) {
					poll._id = data.id;
					poll._rev = data.rev;
					hollaback.call(this, poll);
				});
			}
		});
	},
	startPoll: function () {
		var self = this,
			cts = self.configuration.timers.start,
			cte = self.configuration.timers.end,
			date, hour, minutes;

		sys.puts('Starting poll...');

		/**
		 * Start the timer to check for the "end of the day"
		 */
		var interval = setInterval(function () {
			date = new Date();
			hour = date.getHours();
			minutes = date.getMinutes();

			sys.puts('The time is: ' + hour + ':' + minutes);

			if ((hour >= cte.hour && minutes >= cte.minutes)) {
				self.stopPoll();
				clearInterval(interval);
			}
		}, self.configuration.timers.delay);
	},
	stopPoll: function () {
		var self = this,
			cts = self.configuration.timers.start,
			cte = self.configuration.timers.end,
			date, hour, minutes;

		sys.puts('Stopping poll...');

		/**
		 * Start the timer to check for the "beginning of the day"
		 */
		var interval = setInterval(function () {
			date = new Date();
			hour = date.getHours();
			minutes = date.getMinutes();

			sys.puts('The time is: ' + hour + ':' + minutes);

			if (hour >= cts.hour && minutes >= cts.minutes && hour < cte.hour && minutes < cte.minutes) {
				self.startPoll();
				clearInterval(interval);
			}
		}, self.configuration.timers.delay);
	},
	updateSongCache: function () {
		var self = this;

		/**
		 * Now that we have our poll object, we have to get the song objects
		 * out of the database
		 */
		self.songs = [];
		self.poll.songs.forEach(function (item, index) {
			self.database.link.getDoc(item.id, function (error, data) {
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

		if (this.lastVoter){
			var lv = this.lastVoter;
			var voted = false;
			
			this.poll.songs[index].voters.forEach(function(item){
				if (item.name == lv){
					item.count++;
					voted = true;
				}
			});

			if (this.poll.songs[index].voters.length == 0 || voted == false){
				this.poll.songs[index].voters.push({name: lv, count: 1});
			}
			
		}

		this.songs[index].votes++;
		this.songs[index].voters = this.poll.songs[index].voters;
		this.updateVoteCountCache();

		var status = {
			votes: [],
			voters: []
		};

		this.songs.forEach(function (item) {
			status.votes.push(item.votes);
			status.voters.push(item.voters);
		});

		this.statusEmitter.emit('vote', status);
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
	this.pass('/vote');
});

get('/vote', function () {
	var self = this;

	self.render('vote.html.haml', {
		locals: {
			title: 'fiveoclocksong',
			songs: App.songs
		}
	});
});

post('/vote', function () {
	App.vote(this.param('index'));

	var self = this,
		address = self.headers['x-real-ip'] || self.socket.remoteAddress;

	dns.reverse(address, function(err, name){
		if(address === '127.0.0.1'){
			name = 'kingofpain';
		} else if (err !== null) {
			name = 'Unknown';
		}

		// trim off the CMASS stuff
		var shortName = name.toString().split('.')[0];

		// tell the App who voted last
		App.lastVoter = shortName;
		
	});

	this.respond(200);
});

get('/status', function () {
	var self = this;

	self.contentType('json');

	var hollaback = function (stream) {
		clearTimeout(timeout);
		self.respond(200, JSON.encode(stream));
	};

	App.statusEmitter.addListener(hollaback);

	var timeout = setTimeout(function () {
		App.statusEmitter.removeListener('status', hollaback);
		self.respond(200, JSON.encode({
			type: 'ping',
			data: {
				message: App.pingMessages[Math.floor(Math.random() * App.pingMessages.length)]
			}
		}));
	}, App.configuration.server.statusTimeout);

});

get('/*.css', function(file){
	this.render(file + '.css.sass', { layout: false });
});

get('/error/view', function () {
	this.render('does.not.exist');
});

App.boot();

function inspect (o) {
  var sys = require('sys');
	sys.puts(sys.inspect(o));
}
