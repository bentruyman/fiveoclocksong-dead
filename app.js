require.paths.unshift('lib/express/lib');
require.paths.unshift('lib/node-couchdb/lib');
require('express');
require('express/plugins');

var dns = require('dns'),
	events = require('events'),
	sys = require('sys');

var http = require('express/http'),
	utils = require('express/utils');

var couchdb = require('./lib/node-couch/lib').CouchDB;
couchdb.debug = false;

App = {
	achievements: {},
	configuration: {},
	/**
	 * Contains various links to the CouchDB database resources used throughout
	 * the application
	 * @property database
	 */
	database: {
		/**
		 * The interface into the CouchDB database
		 * @property link
		 */
		link: null
	},
	/** 
	 * @property eventEmitter
	 */
	eventEmitter: null,
	/** 
	 * The global interval that determines what state the application should be in
	 * @property interval
	 */
	interval: null,
	/** 
	 * Holder for the machine name of the last person who voted
	 * @property lastVoter
	 */
	lastVoter: null,
	/**
	 * Messages to be sent to the user when they've hit their max votes for the day
	 * %vl% represents the max vote count
	 */
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
	 * @property pollActive - indicates if a poll is presently running
	 */
	pollActive: null,
	/**
	 * A cache of all song objects used in the current day's poll
	 * @property songs
	 */
	pollEnd: 0,
	pollStart: 0,
	songs: null,
	/**
	 * @property statusEmitter
	 */
	statusEmitter: {
		listeners: [],
		queue: {},
		addListener: function (sessionId, hollaback) {
			this.listeners.push({id: sessionId, callback: hollaback});
		},
		removeListener: function (hollaback, sessionId) {
			this.listeners.forEach(function (item, index) {
				if (item.id === sessionId) {
					App.statusEmitter.listeners.splice(index, 1);
				}
			});
		},
		removeAllListeners: function () {
			this.listeners = [];
		},
		emit: function (type, data, userName) {
			var self = this,
				response = {
					type: type,
					data: data
				};

			if (userName) {
				var found = false;

				self.listeners.forEach(function (item) {
					if (userName === item.id) {
						found = true;
						item.callback.call(App, response);
						self.removeListener(item.id);
					}
				});

				if (!found) {
					inspect('QUEUE\'d');
					if (typeof self.queue[userName] === 'undefined') {
						self.queue[userName] = [];
					}
					self.queue[userName].push(response);
				}
			} else {
				self.listeners.forEach(function (item) {
					item.callback.call(App, response);
				});
				self.removeAllListeners();
			}
			
		}
	},
	/**
	 * A cache of the total vote count for the current day's poll, used to
	 * trigger the response on the long poll request
	 * @property voteCount
	 */
	voteCount: 0,
	/** 
	 * A cache of today's voters, along with how many times they've voted
	 * @property voters
	 *
	 **/
	voters: [],
	boot: function () {
		var self = this,
			sc = self.configuration,
			uc = require('./config/base').configuration;

		/**
		 * Create the application event emitter
		 */
		self.eventEmitter = new events.EventEmitter();

		/**
		 * Parse the user's configuration into a more digestible for the
		 * application 
		 */
		sc.database = {
			name: uc.database.name,
			host: uc.database.host,
			port: uc.database.port
		};
		sc.privateKey = uc.privateKey;
		sc.songLimit = uc.songLimit;
		sc.server = {
			statusTimeout: uc.server.statusTimeout * 1000
		};
		sc.timers = {
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

		sc.voteLimit = uc.voteLimit;

		/**
		 * Establish a connection to the database
		 */
		self.database.link = couchdb.db(sc.database.name, 'http://' + sc.database.host + ':' + sc.database.port);

		self.setupAchievements();

		/**
		 * Run the Express application
		 */
		run();

		sys.puts('FOCS has booted.');

		/**
		 * Start the global interval
		 */
		this.interval = setInterval(function () {
			var now = Date.parse(new Date());

			self.setPollTimers(new Date());

			if (now >= self.pollStart) {
				self.startPoll();
			} else if (now >= self.pollEnd) {
				self.stopPoll();
			} else if (!self.pollActive) {
				self.startPoll();
			}
		}, self.configuration.timers.delay);
	},
	createTodaysPoll: function (/* I aint no */ hollaback /* girl */) {
		var self = this;

		/**
		 * Get all songs from database
		 */
		self.database.link.view('songs/by_title', {
			success: function (data) {
				
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
					 * However, we want to only select songs that haven't been used
					 * in the last x days (x is defined down in getLastPolls).
					 */
					self.getLastPolls(function(polls){
						
						for (var i = 0; i < self.configuration.songLimit; i++) {
							var song = songs.splice(Math.floor(Math.random() * songs.length), 1);
							
							if(polls){
								
								var pollIds = Array();
								polls.forEach(function(item,index){
									var songs = item.value.songs;
									if(songs){
										songs.forEach(function(s,i){
											pollIds.push(s.id);
										});
									}
								});

								while(pollIds.indexOf(song[0].id) != -1){
									song = songs.splice(Math.floor(Math.random() * songs.length), 1);
								}
																	
							}
							

							poll.songs.push({
								id: song[0].id,
								votes: 0,
								voters: []
							});
						}

						/**
						 * Save this carefully crafted poll object into the database
						 */
						self.database.link.saveDoc(poll, {
							success: function (data) {
								poll._id = data.id;
								poll._rev = data.rev;
								hollaback.call(this, poll);
							}
						});

					});
				}
			}
		});
	},
	getAchievements: function (/* I aint no */ hollaback /* girl */) {
		var self = this;

		// get achievements from DB
		self.database.link.view('achievements/by_name', {
			descending: true,
			success: function (data) {
				hollaback.call(this, data.rows);
			}
		});
	},
	getLastPolls: function (/* I aint no */ hollaback /* girl */) {
		/** 
		 * Get the last %limit% polls, so we don't repeat songs within a week.
		 **/
		var self = this;

		self.database.link.view('polls/by_date', {
			descending: true,
			limit: 7,
			success: function (data) {
				var polls = null;

				if (data.total_rows !== 0) {
					var polls = data.rows;
					hollaback.call(this, polls);
				} else {
					hollaback.call(this, false);
				}

			}
		});
	
	},
	getTodaysDate: function () {
		var todaysDate = new Date();
		return (todaysDate.getMonth() + 1) + '/' + todaysDate.getDate() + '/' + todaysDate.getFullYear();
	},
	getTodaysPoll: function (/* I aint no */ hollaback /* girl */) {
		var self = this;

		self.database.link.view('polls/by_date', {
			descending: true,
			limit: 1,
			success: function (data) {
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
			}
		});
	},
	setPollTimers: function (today) {
		var self = this;
		
		self.pollStart = Date.parse( (today.getMonth() + 1) + "/" + (today.getDate() + 1) + "/" + today.getFullYear() + " " + self.configuration.timers.start.hour + ":" + self.configuration.timers.start.minutes);
		self.pollEnd = Date.parse((today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear() + " " + self.configuration.timers.end.hour + ":" + self.configuration.timers.end.minutes);
	},
	setupAchievements: function () {
		var self = this;

		self.getAchievements(function (achievements) {
			self.achievements = {};

			achievements.forEach(function (achievement) {
				var cheev = achievement.value;
				cheev.handler = require('./config/achievements/' + achievement.value.name);
				self.achievements[cheev.name] = cheev;
			});

			for (var i in self.achievements) {
				self.achievements[i].handler.init(new AchievementHandle(self.achievements[i].name));
			}
		});
	},
	startPoll: function () {
		var self = this;

		self.setPollTimers(new Date());
		
		sys.puts('Starting poll...');

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

			self.pollActive = true;

			self.statusEmitter.emit('startPoll', true);
		});
	},
	stopPoll: function () {
		this.setPollTimers(new Date());

		sys.puts('Stopping poll...');

		this.pollActive = false;

		this.statusEmitter.emit('stopPoll', true);
	},
	updateSongCache: function () {
		var self = this;

		/**
		 * Now that we have our poll object, we have to get the song objects
		 * out of the database
		 */
		self.songs = [];
		self.poll.songs.forEach(function (item, index) {
			self.database.link.openDoc(item.id, {
				success: function (data) {
					self.songs[index] = {
						item: data,
						votes: item.votes
					};
				}
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
		var self = this;
		
		function vote () {
			/**
			 * TODO: This seems really unecessary. Refactor and try again, pal.
			 * I'm not your pal, guy.
			 * I'm not your guy, friend.
			 * I'm not your friend, buddy.
			 * I'm not your buddy, pal.
			 * ERROR: Too much recursion.
			 */
			self.poll.songs[options.index].votes++;
			self.songs[options.index].votes++;
			self.songs[options.index].voters = self.poll.songs[options.index].voters;
			self.updateVoteCountCache();

			var status = {
				votes: [],
				voters: []
			};

			self.songs.forEach(function (item) {
				status.votes.push(item.votes);
				status.voters.push(item.voters);
			});

			self.statusEmitter.emit('vote', status);

			var voted = false;

			self.poll.songs[options.index].voters.forEach(function (item) {
				if (item.name == options.session.name) {
					item.count++;
					voted = true;
				}
			});

			if (self.poll.songs[options.index].voters.length === 0 || voted === false) {
				self.poll.songs[options.index].voters.push({name: options.session.name, count: 1});
			}

			self.database.link.saveDoc(self.poll);

			// get the current user's doc
			var userName = options.session.name;
			self.database.link.openDoc(userName, {
				success: function (data) {
					// Let everyone know a vote occurred

					// parse out the current time for checking early bird achievement
					var cTime = Date.parse(new Date());
					
					self.eventEmitter.emit('vote', {
						song: self.songs[options.index].item,
						user: data,
						poll: self.poll,
						time: cTime
					});
				}
			});
		}

		if (options.session.name) {
			// check to see if this person has voted today
			if (App.voters[options.session.name]) {
				// they have! have they voted less than x times (defined in conf)?
				if (App.voters[options.session.name] >= this.configuration.voteLimit) {
					// yes, they have, they're done.  tell them so
					var amazingRando = App.maxMessages[Math.floor(Math.random() * App.maxMessages.length)];

					// replace token with the actual max vote limit count
					amazingRando = amazingRando.replace('%vl%',this.configuration.voteLimit);
					//this.statusEmitter.emit('maxVotes', amazingRando, options.session.name);
					
					// TODO: feels like there could be a better way to do this maxVotes cheevo check
					
					// get the current user's doc
					
					var userName = options.session.name;
					self.database.link.openDoc(userName, {
						success: function (data) {
							// Let everyone know a vote occurred
							self.eventEmitter.emit('maxVotes', {
								song: self.songs[options.index].item,
								user: data,
								poll: self.poll
							});
							
							App.statusEmitter.emit('maxVotes', amazingRando, options.session.name)
						}
					});
					
					
					return false;
				} else {
					// increment this person's vote
					App.voters[options.session.name]++;
					vote();
				}
				
			} else {
				// first time this person has voted today - add em to the index
				App.voters[options.session.name] = 1;
				vote();
			}
		}
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


		App.database.link.view('achievements/by_name', {
			success: function (data) {
				
				App.database.link.openDoc(self.session.name, {
					success: function (user) {
						data.rows.forEach(function(item,i){
							if(user.stats.achievements && user.stats.achievements[item.value.name]){
								if(user.stats.achievements[item.value.name].achieved !== true){
									item.value.icon = 'locked.png';
									item.value.desc = 'Achievement Locked';
								}
							}else{
								item.value.icon = 'locked.png';
								item.value.desc = 'Achievement Locked';
							}
						});
						
						self.render('vote.html.haml', {
							locals: {
								songs: App.songs,
								achievements: data.rows,
								user: user
							}
						});
						
					}
				});

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

	if (typeof App.statusEmitter.queue[self.session.name] !== 'undefined' && App.statusEmitter.queue[self.session.name].length > 0) {
		var response = App.statusEmitter.queue[self.session.name].shift();
		hollaback(response);
	} else {
		App.statusEmitter.addListener(self.session.name, hollaback);

		var timeout = setTimeout(function () {
			App.statusEmitter.removeListener('status', hollaback);
			self.respond(200, JSON.encode({
				type: 'ping',
				data: {
					message: App.pingMessages[Math.floor(Math.random() * App.pingMessages.length)]
				}
			}));
		}, App.configuration.server.statusTimeout);
	}
});

get('/*.css', function (file) {
	this.render(file + '.css.sass', { layout: false });
});

get('/achieve', function(){
	var self = this;
	
	var userName = self.session.name;
	App.database.link.openDoc(userName, {
		success: function (data) {
			
			App.eventEmitter.emit('front', {
				element: self.params.get.element,
				user: data
			});	

		}
	});
		
});

get('/rmi', function () {
	var method = this.params.get.method,
		key = this.params.get.key;
	if (method && key === App.configuration.privateKey) {
		App[method].call(App);
		this.respond(202);
	} else {
		this.respond(530);
	}
});

var AchievementHandle = function (name) {
	this.name = name;
};

AchievementHandle.prototype.addListener = function (eventType, handler) {
	App.eventEmitter.addListener(eventType, handler);
};

AchievementHandle.prototype.removeListener = function (eventType, handler) {
	App.eventEmitter.removeListener(eventType, handler);
};

AchievementHandle.prototype.achieve = function (user) {
	user = this.requiresStub(user);

	user.stats.achievements[this.name].achieved = true;

	App.database.link.saveDoc(user);

	App.statusEmitter.emit('achievement', App.achievements[this.name], user._id);

	return user;
};

AchievementHandle.prototype.isAchieved = function (user) {
	user = this.requiresStub(user);

	return user.stats.achievements[this.name].achieved;
};

AchievementHandle.prototype.getData = function (user, dataType) {
	user = this.requiresStub(user);

	return user.stats.achievements[this.name].data[dataType];
};

AchievementHandle.prototype.setData = function (user, dataType, value) {
	user = this.requiresStub(user);
	user.stats.achievements[this.name].data[dataType] = value;

	App.database.link.saveDoc(user);

	return user;
};

AchievementHandle.prototype.requiresStub = function (user) {
	if (typeof user.stats.achievements[this.name] === 'undefined') {
		user.stats.achievements[this.name] = {
			achieved: false,
			data: {}
		}
	}

	return user;
};

App.boot();

global.inspect = function(o) {
	var sys = require('sys');
	sys.puts(sys.inspect(o,false,null));
}