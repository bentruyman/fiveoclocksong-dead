var handle;

exports.init = function (providedHandle) {
	inspect('halfsies added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {

	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		if (typeof songs === 'undefined') {
			songs = {};
			songs[payload.song._id] = 1;
			inspect(songs);
			handle.setData(payload.user, 'songs', songs);
		} else {
			
			var halfsies = 0;
			
			payload.poll.songs.forEach(function(item,index){

				item.voters.forEach(function(voter,i){

					if(voter.name === payload.user.name){

						if(voter.count === 10){
							
							halfsies++;
														
						}

					}

				});

			});
			
			
			if(halfsies === 2){
				
				handle.setData(payload.user, 'songs', songs);
				handle.achieve(payload.user);
				
			}
			
		}
	}

}
