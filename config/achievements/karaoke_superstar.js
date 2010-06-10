var handle;

exports.init = function (providedHandle) {
	inspect('karaoke superstar added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {
	
	var ids = [
		'0251f83e1528d7fa43d32e0cdd409df9',
		'29f22dd88eed67ed53c5aaf28d1c4da2',
		'2bb5a4800807a5bb18d14b054a9c5db3',
		'3b33dee83c039d0e9562bf5c9d865f36',
		'45b8ed1e79ea7bbf03601feaf310b997'
	];
	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		
		if (typeof songs === 'undefined') {

			songs = {};
			songs[payload.song._id] = 1;
			handle.setData(payload.user, 'songs', songs);

		} 
		
		if(ids.indexOf(payload.song._id) !== -1){
			handle.setData(payload.user, 'songs', songs);
			handle.achieve(payload.user);
		}else{
			inspect('NOT YET!!!');
		}
		
		
	}

}
