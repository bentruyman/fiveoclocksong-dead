exports.configuration = {
	/**
	 * Database configuration
	 */
	database: {
		/**
		 * The name of the host CouchDB is installed
		 */
		host: 'localhost',
		/**
		 * The port CouchDB is listening on 
		 */
		port: 5984,
		/**
		 * Name of the CouchDB database
		 */
		name: 'fiveoclocksong'
	},
	/**
	 * Time of Day configuration
	 */
	timers: {
		/**
		 * The time the poll should start
		 */
		start: '8:30',
		/**
		 * The time the poll should end
		 */
		end: '10:35',
		/**
		 * UTC time zone offset
		 * EST: -5
		 * CST: -6
		 * MST: -7
		 * PST: -8
		 * etc...
		 */
		timeZoneOffset: -6,
		/**
		 * How long the interval should be when checking to see what the current
		 * time is
		 */
		pollDelay: 5,
	},
	/**
	 * The number of songs to present to the user each day
	 */
	songLimit: 3
};