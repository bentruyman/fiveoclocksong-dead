var handle;

exports.init = function (providedHandle) {
	inspect('yeah, real mature added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {

	var songs = handle.getData(payload.user, 'songs');
	var tallies = [8,0,0,8,5];
	
	if (!handle.isAchieved(payload.user)){
		if (typeof songs === 'undefined') {
			songs = {};
			songs[payload.song._id] = 1;
			inspect(songs);
			handle.setData(payload.user, 'songs', songs);
		} else {
			
			var yrm = 0;
			
			payload.poll.songs.forEach(function(item,index){
				
				if(item.votes === tallies[index]){
					yrm++;
				}
			});
			
			
			if(yrm === 5){
				
				handle.setData(payload.user, 'songs', songs);
				handle.achieve(payload.user);
				
			}
			
		}
	}

}
