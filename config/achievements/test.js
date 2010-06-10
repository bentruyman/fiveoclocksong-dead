var handle;

exports.init = function (providedHandle) {
	inspect('INITING!!');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {
	inspect('CHECKING!!');

	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		if (typeof songs === 'undefined') {
			inspect('FIRST TIMER!!!');
			songs = {};
			songs[payload.song._id] = 1;
			inspect(songs);
			handle.setData(payload.user, 'songs', songs);
		} else {
			inspect('NOT YET!!!');
			songs[payload.song._id]++;
			handle.setData(payload.user, 'songs', songs);

			if (songs[payload.song._id] === 5) {
				inspect('ACHIEVED!!!');
				handle.achieve(payload.user);
			}
		}
	}

}
