var handle;

var achieved = Array();

exports.init = function (providedHandle) {
	inspect('vote happy added');
	handle = providedHandle;
	handle.addListener('maxVotes', check);
};

function check (payload) {
	
	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){

		if (typeof songs === 'undefined') {
			songs = {};
			songs[payload.song._id] = 1;
			handle.setData(payload.user, 'songs', songs);
		} else {
			
			handle.setData(payload.user, 'songs', songs);
			handle.achieve(payload.user);
						
		}
		
	}

}
