var handle;

exports.init = function (providedHandle) {
	inspect('leet added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {

	var songs = handle.getData(payload.user, 'songs');
	var tallies = [3,1,3,3,7];
	
	if (!handle.isAchieved(payload.user)){
		if (typeof songs === 'undefined') {
			songs = {};
			songs[payload.song._id] = 1;
			inspect(songs);
			handle.setData(payload.user, 'songs', songs);
		} else {
			
			var leet = 0;
			
			payload.poll.songs.forEach(function(item,index){
				
				if(item.votes === tallies[index]){
					leet++;
				}
			});
			
			
			if(leet === 5){
				
				handle.setData(payload.user, 'songs', songs);
				handle.achieve(payload.user);
				
			}
			
		}
	}

}
