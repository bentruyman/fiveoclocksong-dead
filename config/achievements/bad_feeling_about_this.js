var handle;

exports.init = function (providedHandle) {
	inspect('bad feeling about this added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {
	
	var ids = ['cd401986786dab137e71c1daa1b31d18','ac49033dad50061d36fc16ed4e5ce7b0'];
	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		
		if (typeof songs === 'undefined') {

			songs = {};
			songs[payload.song._id] = 1;
			inspect(songs);
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
