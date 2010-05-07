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
	 * Messages to be sent to the user when they've hit their max votes for the day
	 * %vl% represents the max vote count
	 * 
	 **/
	maxMessages: [
		'What, %vl% votes not enough for ya? Sorry, you\'re done for today.',
		'Ease up, there, sunshine. You\'ve had your say.',
		'%vl% votes per person, per day.  You are not a beautiful and unique snowflake.',
		'Sorry, you only get %vl% votes per day.  C\'mon back tomorrow!',
		'I get it, you like that song. Maybe you can vote on it again tomorrow.',
		'Stop clicking me there! I need an adult!',
		'One person, %vl% votes. No more, no less.',
		'Look me in the eye: do you think you deserve more than everyone else?',
		'FACT: You\'ve already voted as much as you can today.',
		'Hey.  What\'s up? Huh? Oh, yeah. You\'re out of votes. Come back tomorrow.',
		'OK, OK. Come back at 5 and we\'ll see if you gamed the system enough to play your favoritest song.',
		'Yeah, A.D.D. much? You\'re out of votes.',
		'Tomorrow\'s gonna be a great day.  You can vote more then!',
		'It\'s your future... I see... no more votes today. Outlook is good for tomorrow.',
		'Yes, yes, greatest song EVAR. You\'ve voted %vl% times already. I know.',
		'Honey, no. You\'ve voted enough.',
		'If it were your birthday today, you\'d get more votes. Too bad I can\'t remember birthdays.'
	],
	/** 
	 * A cache of today's voters, along with how many times they've voted
	 * @property voters
	 *
	 **/
	voters: [],
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
	 * @property pollActive - indicates if a poll is presently running
	 */
	pollActive: true,
	/**
	 * @property statusEmitter
	 */
	statusEmitter: {
		listeners: [],
		addListener: function (hollaback, sessionId) {
			this.listeners.push({id: sessionId, callback: hollaback});
		},
		removeListener: function (hollaback) {
			this.listeners.forEach(function (item, index) {
				if (item.callback === hollaback) {
					this.listeners.splice(index, 1);
				}
			});
		},
		removeAllListeners: function () {
			this.listeners = [];
		},
		emit: function (type, data, sessionId) {
			var response = {
				type: type,
				data: data
			};

			if(sessionId){
				
				this.listeners.forEach(function (item) {
					if(sessionId === item.id){
						item.callback.call(App, response);
					}
				});
				
			}else{

				this.listeners.forEach(function (item) {
					item.callback.call(App, response);
				});
				
			}

			this.removeAllListeners();
		}
	},
	/**
	 * Contains the application configuration settings as specified by the user
	 * in config/app.js
	 * @property userConfiguration
	 */
	userConfiguration: require('./config/base').configuration,
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
		
		self.configuration.voteLimit = uc.voteLimit;
		
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
			var poll = null;

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
				for (var i = 0; i < self.configuration.songLimit; i++) {
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

		this.pollActive = true;

		/**
		 * Start the timer to check for the "end of the day"
		 */
		var interval = setInterval(function () {
			date = new Date();
			hour = date.getHours();
			minutes = date.getMinutes();
			
			if (minutes.toString().length == 1) {
				minutes = '0' + minutes;
			}
			
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
		
		this.pollActive = false;

		this.statusEmitter.emit('stopPoll', true);

		/**
		 * Start the timer to check for the "beginning of the day"
		 */
		var interval = setInterval(function () {
			date = new Date();
			hour = date.getHours();
			minutes = date.getMinutes();

			if (minutes.toString().length == 1) {
				minutes = "0" + minutes;
			}

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
	vote: function (options) {
		/**
		 * TODO: This seems really unecessary. Refactor and try again, pal.
		 * I'm not your pal, guy.
		 * I'm not your guy, friend.
		 * I'm not your friend, buddy.
		 * I'm not your buddy, pal.
		 * ERROR: Too much recursion.
		 */
		
		this.poll.songs[options.index].votes++;

		if (options.session.name) {
			// check to see if this person has voted today
			
			if(App.voters[options.session.name]){
				// they have! have they voted less than x times (defined in conf)?
				if(App.voters[options.session.name] >= this.configuration.voteLimit){
					// yes, they have, they're done.  tell them so
					var amazingRando = App.maxMessages[Math.floor(Math.random() * App.maxMessages.length)]
					
					// replace token with the actual max vote limit count
					amazingRando = amazingRando.replace('%vl%',this.configuration.voteLimit);
					this.statusEmitter.emit('maxVotes', amazingRando, options.session.id);
					return false;
					
				}else{
					// increment this person's vote
					App.voters[options.session.name]++;
					
				}
				
			}else{
				// first time this person has voted today - add em to the index
				App.voters[options.session.name] = 1;
				
			}
			
			var voted = false;

			this.poll.songs[options.index].voters.forEach(function (item) {
				if (item.name == options.session.name) {
					item.count++;
					voted = true;
				}
			});

			if (this.poll.songs[options.index].voters.length === 0 || voted === false) {
				this.poll.songs[options.index].voters.push({name: options.session.name, count: 1});
			}
		}

		this.songs[options.index].votes++;
		this.songs[options.index].voters = this.poll.songs[options.index].voters;
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
	var self = this,
	    address = self.headers['x-real-ip'] || self.socket.remoteAddress;
	
	if(!self.session.name){
		
		dns.reverse(address, function (err, name) {
			if (address === '127.0.0.1') {
				name = 'kingofpain';
			} else if (err !== null) {
				name = 'Unknown';
			}

			// trim off the CMASS stuff
			var shortName = name.toString().split('.')[0];

			// slice off the dash and machine type (if it exists)
			shortName = shortName.split('-')[0];
			
			self.session.name = shortName;
			
		});
		
	}

	this.pass('/vote');
	
});

get('/vote', function () {
	var self = this;

	if (App.pollActive) {
		self.render('vote.html.haml', {
			locals: {
				songs: App.songs
			}
		});
	} else {
		// get winner's name and vote count
		 var wIndex = 0, wCount = 0;
		App.poll.songs.forEach(function (item, index) {
			if(wCount < item.votes){
				wCount = item.votes;
				wIndex = index;
			}
		});

		// get winner's name and vote count
		var wName = '', wCount = 0;
		App.poll.songs[wIndex].voters.forEach(function(item, index){
			if(wCount < item.count){
				wCount = item.count;
				wName = item.name;
			}
		});

		self.render('winner.html.haml', {
			locals: {
				songs: App.songs[wIndex],
				winnerName: wName,
				winnerCount: wCount
			}
		});
	}
});

post('/vote', function () {
	if (App.pollActive) {
		var self = this;
			
		// Vote!
		App.vote({
			index: self.param('index'),
			session: self.session
		});

		this.respond(200);
	} else {
		this.respond(417);
	}
	
});

get('/status', function () {
	var self = this;
	
	self.contentType('json');

	var hollaback = function (stream) {
		clearTimeout(timeout);
		self.respond(200, JSON.encode(stream));
	};

	App.statusEmitter.addListener(hollaback, self.session.id);

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

get('/*.css', function (file) {
	this.render(file + '.css.sass', { layout: false });
});

App.boot();

function inspect(o) {
	var sys = require('sys');
	sys.puts(sys.inspect(o));
}
