var handle;

exports.init = function (providedHandle) {
	inspect('easy as heck added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {

	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		if (typeof songs === 'undefined') {
			songs = {};
			songs[payload.song._id] = 1;
			handle.setData(payload.user, 'songs', songs);
		} else {
			songs[payload.song._id]++;
			handle.setData(payload.user, 'songs', songs);

			if (songs[payload.song._id] === 5) {
				handle.achieve(payload.user);
			}
		}
	}

}
