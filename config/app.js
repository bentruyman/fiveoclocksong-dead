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
		name: 'fiveoclocksongs'
	},
	server: {
		/**
		 * How long (in seconds) the server should wait before it closes the
		 * status connection the server as the server may return a
		 * "504: Gateway Timeout"
		 */
		statusTimeout: 5
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
		end: '17:00',
		/**
		 * How long (in seconds) the delay should be when checking to see what
		 * the current time is
		 */
		delay: 5,
		/**
		 * UTC time zone offset
		 * EST: -5
		 * CST: -6
		 * MST: -7
		 * PST: -8
		 * etc...
		 */
		timeZoneOffset: -6
	},
	/**
	 * The number of songs to present to the user each day
	 */
	songLimit: 5
};