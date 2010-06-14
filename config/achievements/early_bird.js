var handle;

exports.init = function (providedHandle) {
	inspect('early bird added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {

	var songs = handle.getData(payload.user, 'songs');
	var today = new Date();
	var early = Date.parse( (today.getMonth() + 1) + "/" + (today.getDate()) + "/" + today.getFullYear() + " 09:00");

	if (!handle.isAchieved(payload.user)){
		if (typeof songs === 'undefined') {
			songs = {};
			songs[payload.song._id] = 1;
			handle.setData(payload.user, 'songs', songs);
		} else {

			if (payload.time < early) {
				handle.achieve(payload.user);
			}
		}
	}

}
